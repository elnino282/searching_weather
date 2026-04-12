/* eslint-disable no-undef */
// Firebase Messaging Service Worker
// This runs in the background to receive push notifications when the app tab
// is inactive or the browser is minimised.
//
// IMPORTANT: Service Workers cannot access environment variables.
// If your Firebase config changes, update the values below manually.

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyAI7prNRIBGdiLmczyfhA0sfvbZmzrk9uQ",
  authDomain: "weclifor.firebaseapp.com",
  projectId: "weclifor",
  storageBucket: "weclifor.firebasestorage.app",
  messagingSenderId: "2753044031",
  appId: "1:2753044031:web:dfdad44f1495b4108da28a",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message received:", payload);

  const notificationTitle =
    payload.notification?.title ?? "Weather Alert";
  const notificationOptions = {
    body: payload.notification?.body ?? "You have a new weather alert.",
    icon: "/static/weather-icon.png",
    badge: "/static/weather-icon.png",
    tag: payload.data?.alertId ?? "weather-alert",
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open / focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
