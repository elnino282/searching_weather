"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { deleteToken, getToken, onMessage, Messaging } from "firebase/messaging";
import { getFirebaseMessaging } from "@/app/lib/firebaseConfig";
import { useLocalStorage } from "./useLocalStorage";
import { useLanguage } from "../context/language-provider";
import {
  clearAlertPreferencesSyncStorage,
  LAST_SYNCED_FCM_TOKEN_STORAGE_KEY,
} from "@/app/lib/alertSubscriptionStorage";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const BACKEND_URI = process.env.NEXT_PUBLIC_BACKEND_URI ?? "http://localhost:4000/api";
const PUSH_ENABLED_STORAGE_KEY = "weather-app-push-enabled";
const FCM_SERVICE_WORKER_PATH = "/firebase-messaging-sw.js";
const FCM_SERVICE_WORKER_SCOPE = "/firebase-cloud-messaging-push-scope";
const TOKEN_REQUEST_TIMEOUT_MS = 12000;
const SW_ACTIVATION_TIMEOUT_MS = 10000;

export type PermissionStatus = "default" | "granted" | "denied" | "unsupported";

export interface NotificationMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationControls {
  permissionStatus: PermissionStatus;
  fcmToken: string | null;
  pushEnabled: boolean;
  isTogglingPush: boolean;
  isRequestingPermission: boolean;
  notificationError: string | null;
  requestNotificationPermission: (options?: {
    forceRegister?: boolean;
  }) => Promise<string | null>;
  disablePushNotifications: () => Promise<boolean>;
}

export interface UseNotificationsResult extends NotificationControls {
  latestMessage: NotificationMessage | null;
  clearLatestMessage: () => void;
}

type RegistrationInFlight = {
  token: string;
  promise: Promise<void>;
};

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      window.setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    }),
  ]);
}

async function waitForActiveServiceWorker(
  registration: ServiceWorkerRegistration
): Promise<ServiceWorkerRegistration> {
  if (registration.active) return registration;

  await withTimeout(
    new Promise<void>((resolve) => {
      const workers = [registration.installing, registration.waiting].filter(
        Boolean
      ) as ServiceWorker[];

      let resolved = false;
      const pollTimer = window.setInterval(() => {
        if (registration.active && !resolved) {
          resolved = true;
          cleanup();
          resolve();
        }
      }, 100);

      const cleanup = () => {
        window.clearInterval(pollTimer);
        for (const worker of workers) {
          worker.removeEventListener("statechange", handleStateChange);
        }
      };

      const handleStateChange = () => {
        if (resolved) return;
        if (registration.active) {
          resolved = true;
          cleanup();
          resolve();
        }
      };

      for (const worker of workers) {
        worker.addEventListener("statechange", handleStateChange);
      }
    }),
    SW_ACTIVATION_TIMEOUT_MS,
    "FCM service worker activation timed out."
  );

  return registration;
}

function formatNotificationError(error: unknown): string {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Failed to enable push notifications.";
  const lower = rawMessage.toLowerCase();

  if (lower.includes("push service not available")) {
    return "Push service is unavailable in this browser/profile. Use HTTPS (or localhost), disable private mode, and allow notifications.";
  }

  if (lower.includes("not supported")) {
    return "Push notifications are not supported in this browser.";
  }

  if (lower.includes("timed out")) {
    return "Timed out while requesting push token. Check network and try again.";
  }

  if (lower.includes("vapid")) {
    return "Invalid VAPID key configuration for web push.";
  }

  return rawMessage;
}

function getLastSyncedFcmToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_SYNCED_FCM_TOKEN_STORAGE_KEY);
}

function setLastSyncedFcmToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SYNCED_FCM_TOKEN_STORAGE_KEY, token);
}

function clearLastSyncedFcmToken(token?: string | null) {
  if (typeof window === "undefined") return;

  const lastSyncedToken = getLastSyncedFcmToken();
  if (!token || lastSyncedToken === token) {
    window.localStorage.removeItem(LAST_SYNCED_FCM_TOKEN_STORAGE_KEY);
  }
}

export function useNotifications(): UseNotificationsResult {
  const { language } = useLanguage();
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("default");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [latestMessage, setLatestMessage] = useState<NotificationMessage | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [pushEnabled, setPushEnabled] = useLocalStorage<boolean>(
    PUSH_ENABLED_STORAGE_KEY,
    true
  );
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const messagingRef = useRef<Messaging | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastRegisteredTokenRef = useRef<string | null>(null);
  const registrationInFlightRef = useRef<RegistrationInFlight | null>(null);

  // Check initial permission state
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissionStatus("unsupported");
      return;
    }
    setPermissionStatus(Notification.permission as PermissionStatus);
  }, []);

  // Register Service Worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }

    try {
      const existingRegistration = await navigator.serviceWorker.getRegistration(
        FCM_SERVICE_WORKER_SCOPE
      );
      if (existingRegistration) {
        await waitForActiveServiceWorker(existingRegistration);
        return existingRegistration;
      }

      const registration = await navigator.serviceWorker.register(
        FCM_SERVICE_WORKER_PATH,
        { scope: FCM_SERVICE_WORKER_SCOPE }
      );
      await waitForActiveServiceWorker(registration);
      console.log(
        `[Notifications] FCM service worker ready at scope: ${registration.scope}`
      );
      return registration;
    } catch (error) {
      console.error("[Notifications] Service worker registration failed:", error);
      return null;
    }
  }, []);

  const registerTokenWithServer = useCallback(async (token: string, force = false) => {
    const lastSyncedToken = getLastSyncedFcmToken();
    if (!force && (lastSyncedToken === token || lastRegisteredTokenRef.current === token)) {
      console.log("[Notifications] Token already registered, skipping POST.");
      return;
    }

    if (registrationInFlightRef.current?.token === token) {
      return registrationInFlightRef.current.promise;
    }

    const shouldResetAlertSyncMarker = force || lastSyncedToken !== token;
    if (shouldResetAlertSyncMarker) {
      clearAlertPreferencesSyncStorage(token);
    }

    const promise = fetch(`${BACKEND_URI}/alerts/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fcmToken: token,
        userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Token registration failed: ${response.status}`);
        }

        setLastSyncedFcmToken(token);
        lastRegisteredTokenRef.current = token;

        console.log("[Notifications] FCM token registered with server.");
      })
      .catch((error) => {
        console.error("[Notifications] Failed to register FCM token with server:", error);
        setNotificationError(
          error instanceof Error ? error.message : "Failed to register token with server."
        );
      })
      .finally(() => {
        if (registrationInFlightRef.current?.token === token) {
          registrationInFlightRef.current = null;
        }
      });

    registrationInFlightRef.current = { token, promise };
    return promise;
  }, []);

  const removeTokenFromServer = useCallback(async (token: string) => {
    try {
      await fetch(`${BACKEND_URI}/alerts/subscribe`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fcmToken: token }),
      });
    } catch (error) {
      console.error("Failed to remove FCM token from server:", error);
    }
  }, []);

  // Request notification permission + obtain FCM token
  const requestNotificationPermission = useCallback(async (options?: {
    forceRegister?: boolean;
  }): Promise<string | null> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissionStatus("unsupported");
      setNotificationError("Push notifications are not supported in this browser.");
      return null;
    }

    try {
      setIsRequestingPermission(true);
      setNotificationError(null);
      console.log("[Notifications] Requesting notification permission.");

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      setPermissionStatus(permission as PermissionStatus);
      console.log(`[Notifications] Permission result: ${permission}`);

      if (permission !== "granted") {
        console.log("[Notifications] Notification permission denied.");
        setPushEnabled(false);
        setNotificationError(
          permission === "denied"
            ? "Notifications are blocked by the browser."
            : "Notification permission was not granted."
        );
        return null;
      }

      setPushEnabled(true);
      if (!VAPID_KEY || typeof VAPID_KEY !== "string") {
        setNotificationError("Missing Firebase Web Push VAPID key.");
        return null;
      }

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        setNotificationError("Firebase Messaging is not supported in this browser.");
        return null;
      }
      messagingRef.current = messaging;

      const swRegistration = await registerServiceWorker();
      let token: string | null = null;
      let primaryTokenError: unknown = null;

      if (swRegistration) {
        try {
          console.log("[Notifications] Requesting FCM token with messaging service worker.");
          token = await withTimeout(
            getToken(messaging, {
              vapidKey: VAPID_KEY,
              serviceWorkerRegistration: swRegistration,
            }),
            TOKEN_REQUEST_TIMEOUT_MS,
            "Timed out while requesting FCM token."
          );
        } catch (error) {
          primaryTokenError = error;
          console.warn(
            "[Notifications] Token request with messaging SW failed, trying default registration fallback.",
            error
          );
        }
      }

      if (!token) {
        try {
          console.log("[Notifications] Requesting FCM token with default service worker registration.");
          token = await withTimeout(
            getToken(messaging, {
              vapidKey: VAPID_KEY,
            }),
            TOKEN_REQUEST_TIMEOUT_MS,
            "Timed out while requesting FCM token."
          );
        } catch (fallbackError) {
          if (primaryTokenError) {
            console.error("[Notifications] Primary token error:", primaryTokenError);
          }
          throw fallbackError;
        }
      }

      if (!token) {
        console.log("[Notifications] No registration token available.");
        setPushEnabled(false);
        setNotificationError("No FCM registration token returned.");
        return null;
      }

      console.log("[Notifications] FCM token obtained.");
      setFcmToken(token);
      setPushEnabled(true);
      await registerTokenWithServer(token, options?.forceRegister === true);
      return token;
    } catch (error) {
      console.error("[Notifications] Failed to enable push notifications:", error);
      setNotificationError(formatNotificationError(error));
      return null;
    } finally {
      setIsRequestingPermission(false);
    }
  }, [registerServiceWorker, registerTokenWithServer, setPushEnabled]);

  const disablePushNotifications = useCallback(async (): Promise<boolean> => {
    setIsTogglingPush(true);

    try {
      if (fcmToken) {
        await removeTokenFromServer(fcmToken);
      }

      clearLastSyncedFcmToken(fcmToken);
      clearAlertPreferencesSyncStorage(fcmToken ?? undefined);
      lastRegisteredTokenRef.current = null;
      setNotificationError(null);

      const messaging = messagingRef.current ?? (await getFirebaseMessaging());
      if (messaging) {
        await deleteToken(messaging);
      }

      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setLatestMessage(null);
      setFcmToken(null);
      setPushEnabled(false);
      return true;
    } catch (error) {
      console.error("Failed to disable push notifications:", error);
      return false;
    } finally {
      setIsTogglingPush(false);
    }
  }, [fcmToken, removeTokenFromServer, setPushEnabled]);

  // Listen for foreground messages
  useEffect(() => {
    let isMounted = true;

    const setupForegroundListener = async () => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted" ||
        !pushEnabled
      ) {
        return;
      }

      const messaging = await getFirebaseMessaging();
      if (!messaging || !isMounted) {
        return;
      }
      messagingRef.current = messaging;

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("[Foreground] Message received:", payload);

        const message: NotificationMessage = {
          title:
            payload.notification?.title ??
            (language === "vi" ? "Cảnh báo thời tiết" : "Weather alert"),
          body:
            payload.notification?.body ??
            (language === "vi"
              ? "Bạn có một cảnh báo thời tiết mới."
              : "You have a new weather alert."),
          data: payload.data,
        };

        if (isMounted) {
          setLatestMessage(message);
        }

        if (Notification.permission === "granted" && pushEnabled) {
          new Notification(message.title, {
            body: message.body,
            icon: "/static/weather-icon.png",
          });
        }
      });

      unsubscribeRef.current = unsubscribe;
    };

    setupForegroundListener();

    return () => {
      isMounted = false;
      unsubscribeRef.current?.();
    };
  }, [language, permissionStatus, pushEnabled]);

  useEffect(() => {
    if (!pushEnabled) {
      setLatestMessage(null);
    }
  }, [pushEnabled]);

  // Auto-obtain token if permission was previously granted
  useEffect(() => {
    if (pushEnabled && permissionStatus === "granted" && !fcmToken) {
      requestNotificationPermission();
    }
  }, [pushEnabled, permissionStatus, fcmToken, requestNotificationPermission]);

  return {
    permissionStatus,
    fcmToken,
    pushEnabled,
    isTogglingPush,
    isRequestingPermission,
    notificationError,
    latestMessage,
    requestNotificationPermission,
    disablePushNotifications,
    clearLatestMessage: () => setLatestMessage(null),
  };
}
