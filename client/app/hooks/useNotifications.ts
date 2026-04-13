"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { deleteToken, getToken, onMessage, Messaging } from "firebase/messaging";
import { getFirebaseMessaging } from "@/app/lib/firebaseConfig";
import { useLocalStorage } from "./useLocalStorage";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const BACKEND_URI = process.env.NEXT_PUBLIC_BACKEND_URI ?? "http://localhost:4000/api";
const PUSH_ENABLED_STORAGE_KEY = "weather-app-push-enabled";

export type PermissionStatus = "default" | "granted" | "denied" | "unsupported";

interface NotificationMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export function useNotifications() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("default");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [latestMessage, setLatestMessage] = useState<NotificationMessage | null>(null);
  const [pushEnabled, setPushEnabled] = useLocalStorage<boolean>(
    PUSH_ENABLED_STORAGE_KEY,
    true
  );
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const messagingRef = useRef<Messaging | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" }
      );

      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return null;
    }
  }, []);

  const sendTokenToServer = useCallback(async (token: string) => {
    try {
      await fetch(`${BACKEND_URI}/alerts/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fcmToken: token, alerts: [] }),
      });
      console.log("FCM token sent to server successfully.");
    } catch (error) {
      console.error("Failed to send FCM token to server:", error);
    }
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
  const requestNotificationPermission = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissionStatus("unsupported");
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission as PermissionStatus);

      if (permission !== "granted") {
        console.log("Notification permission denied.");
        setPushEnabled(false);
        return null;
      }

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        return null;
      }
      messagingRef.current = messaging;

      const swRegistration = await registerServiceWorker();

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration ?? undefined,
      });

      if (!token) {
        console.log("No registration token available.");
        setPushEnabled(false);
        return null;
      }

      console.log("FCM Token obtained:", token);
      setFcmToken(token);
      setPushEnabled(true);
      await sendTokenToServer(token);
      return token;
    } catch (error) {
      console.error("Error getting notification permission / FCM token:", error);
      return null;
    }
  }, [registerServiceWorker, sendTokenToServer, setPushEnabled]);

  const disablePushNotifications = useCallback(async (): Promise<boolean> => {
    setIsTogglingPush(true);

    try {
      if (fcmToken) {
        await removeTokenFromServer(fcmToken);
      }

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
          title: payload.notification?.title ?? "Cảnh báo thời tiết",
          body: payload.notification?.body ?? "Bạn có một cảnh báo thời tiết mới.",
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
  }, [permissionStatus, pushEnabled]);

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
    latestMessage,
    requestNotificationPermission,
    disablePushNotifications,
    clearLatestMessage: () => setLatestMessage(null),
  };
}
