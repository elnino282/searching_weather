"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const LOCAL_STORAGE_EVENT = "weather-app-local-storage";

type LocalStorageState<T> = {
  value: T;
  hydrated: boolean;
  hasStoredValue: boolean;
};

type PendingWrite<T> = {
  value: T;
};

type UseLocalStorageReturn<T> = [
  T,
  (value: T | ((prev: T) => T)) => void,
  boolean,
  boolean,
];

function readLocalStorageState<T>(
  key: string,
  initialValue: T
): LocalStorageState<T> {
  if (typeof window === "undefined") {
    return {
      value: initialValue,
      hydrated: false,
      hasStoredValue: false,
    };
  }

  try {
    const item = window.localStorage.getItem(key);
    if (item !== null) {
      return {
        value: JSON.parse(item) as T,
        hydrated: true,
        hasStoredValue: true,
      };
    }
  } catch {
    console.error(`Error reading localStorage key "${key}"`);
  }

  return {
    value: initialValue,
    hydrated: true,
    hasStoredValue: false,
  };
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  const [state, setState] = useState<LocalStorageState<T>>(() =>
    readLocalStorageState(key, initialValue)
  );
  const initialValueRef = useRef(initialValue);
  const pendingWriteRef = useRef<PendingWrite<T> | null>(null);
  const storedValue = state.value;

  useEffect(() => {
    setState(readLocalStorageState(key, initialValueRef.current));
  }, [key]);

  useEffect(() => {
    if (pendingWriteRef.current === null) return;

    const nextValue = pendingWriteRef.current.value;
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
        setState({
          value: initialValueRef.current,
          hydrated: true,
          hasStoredValue: false,
        });
        return;
      }

      try {
        setState({
          value: JSON.parse(event.newValue) as T,
          hydrated: true,
          hasStoredValue: true,
        });
      } catch {
        console.error(`Error parsing localStorage key "${key}"`);
      }
    };

    const handleLocalStorageEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string; value: T }>;
      if (customEvent.detail?.key !== key) return;
      setState({
        value: customEvent.detail.value,
        hydrated: true,
        hasStoredValue: true,
      });
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
      setState((prev) => {
        const nextValue = value instanceof Function ? value(prev.value) : value;
        pendingWriteRef.current = { value: nextValue };
        return {
          value: nextValue,
          hydrated: true,
          hasStoredValue: true,
        };
      });
    },
    []
  );

  return [storedValue, setValue, state.hydrated, state.hasStoredValue];
}
