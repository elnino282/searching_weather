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

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Service Worker registered successfully:", reg);
            setRegistration(reg);
          })
          .catch((err) => {
            console.error("Service Worker registration failed:", err);
          });
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <PWAContext.Provider value={{ isOnline, registration }}>
      {children}
    </PWAContext.Provider>
  );
}
