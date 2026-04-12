"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getToken, onMessage, Messaging } from "firebase/messaging";
import { getFirebaseMessaging } from "@/app/lib/firebaseConfig";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const BACKEND_URI = process.env.NEXT_PUBLIC_BACKEND_URI ?? "http://localhost:4000/api";

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

  // Register Service Worker with Firebase config injected
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;

    try {
      // We need to pass Firebase config to the SW via query params or a global variable.
      // The simplest approach: register the SW, then communicate config via a message.
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" }
      );

      // Wait for the SW to activate
      await navigator.serviceWorker.ready;

      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return null;
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
        return null;
      }

      // Get messaging instance
      const messaging = await getFirebaseMessaging();
      if (!messaging) return null;
      messagingRef.current = messaging;

      // Register SW
      const swRegistration = await registerServiceWorker();

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration ?? undefined,
      });

      if (token) {
        console.log("FCM Token obtained:", token);
        setFcmToken(token);

        // Send token to backend
        await sendTokenToServer(token);

        return token;
      } else {
        console.log("No registration token available.");
        return null;
      }
    } catch (error) {
      console.error("Error getting notification permission / FCM token:", error);
      return null;
    }
  }, [registerServiceWorker]);

  // Send FCM token to backend
  const sendTokenToServer = async (token: string) => {
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
  };

  // Listen for foreground messages
  useEffect(() => {
    let isMounted = true;

    const setupForegroundListener = async () => {
      // Only set up listeners if permission is already granted
      if (typeof window === "undefined" || Notification.permission !== "granted") return;

      const messaging = await getFirebaseMessaging();
      if (!messaging || !isMounted) return;
      messagingRef.current = messaging;

      // Set up foreground message handler
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("[Foreground] Message received:", payload);

        const message: NotificationMessage = {
          title: payload.notification?.title ?? "Weather Alert",
          body: payload.notification?.body ?? "You have a new weather alert.",
          data: payload.data,
        };

        if (isMounted) {
          setLatestMessage(message);
        }

        // Also show browser notification for foreground (optional — user can see the banner)
        if (Notification.permission === "granted") {
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
  }, [permissionStatus]);

  // Auto-obtain token if permission was previously granted
  useEffect(() => {
    if (permissionStatus === "granted" && !fcmToken) {
      requestNotificationPermission();
    }
  }, [permissionStatus, fcmToken, requestNotificationPermission]);

  return {
    permissionStatus,
    fcmToken,
    latestMessage,
    requestNotificationPermission,
    clearLatestMessage: () => setLatestMessage(null),
  };
}
