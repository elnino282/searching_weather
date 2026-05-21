"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface PWAContextType {
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
}

const PWAContext = createContext<PWAContextType>({
  isOnline: true,
  registration: null,
});

export const usePWA = () => useContext(PWAContext);

export default function PWAProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Set initial status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration("/").then((reg) => {
          reg?.unregister();
        });
      }

      if ("caches" in window) {
        window.caches.keys().then((cacheNames) => {
          cacheNames
            .filter((cacheName) => cacheName.startsWith("weclifor-"))
            .forEach((cacheName) => window.caches.delete(cacheName));
        });
      }
    }

    const registerServiceWorker = () => {
      if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
        return;
      }

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully:", reg);
          setRegistration(reg);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return (
    <PWAContext.Provider value={{ isOnline, registration }}>
      {children}
    </PWAContext.Provider>
  );
}
