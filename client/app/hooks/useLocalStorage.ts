"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const LOCAL_STORAGE_EVENT = "weather-app-local-storage";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const initialValueRef = useRef(initialValue);
  const pendingWriteRef = useRef<T | null>(null);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch {
      console.error(`Error reading localStorage key "${key}"`);
    }
  }, [key]);

  useEffect(() => {
    if (pendingWriteRef.current === null) return;

    const nextValue = pendingWriteRef.current;
    pendingWriteRef.current = null;

    try {
      window.localStorage.setItem(key, JSON.stringify(nextValue));
      window.dispatchEvent(
        new CustomEvent(LOCAL_STORAGE_EVENT, {
          detail: { key, value: nextValue },
        })
      );
    } catch {
      console.error(`Error writing localStorage key "${key}"`);
    }
  }, [key, storedValue]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return;

      if (event.newValue === null) {
        setStoredValue(initialValueRef.current);
        return;
      }

      try {
        setStoredValue(JSON.parse(event.newValue));
      } catch {
        console.error(`Error parsing localStorage key "${key}"`);
      }
    };

    const handleLocalStorageEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string; value: T }>;
      if (customEvent.detail?.key !== key) return;
      setStoredValue(customEvent.detail.value);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(LOCAL_STORAGE_EVENT, handleLocalStorageEvent as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        LOCAL_STORAGE_EVENT,
        handleLocalStorageEvent as EventListener
      );
    };
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        pendingWriteRef.current = nextValue;
        return nextValue;
      });
    },
    []
  );

  return [storedValue, setValue];
}
