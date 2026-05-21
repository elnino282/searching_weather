"use client";
import { useCallback, useEffect, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  AlertPreference,
  TriggeredAlert,
  UnitsType,
  WeatherDataResponse,
} from "@/app/types/types";
import { getAlertPreferencesSyncStorageKey } from "@/app/lib/alertSubscriptionStorage";

const BACKEND_URI = process.env.NEXT_PUBLIC_BACKEND_URI ?? "http://localhost:4000/api";
const ALERT_SYNC_DEBOUNCE_MS = 400;
const lastSyncedAlertsByToken = new Map<string, string>();

export interface AlertPreferencesControls {
  alerts: AlertPreference[];
  alertsHydrated: boolean;
  addAlert: (alert: Omit<AlertPreference, "id">) => void;
  updateAlert: (id: string, updates: Partial<AlertPreference>) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  checkAlerts: (
    weatherData: WeatherDataResponse,
    currentUnits: UnitsType
  ) => TriggeredAlert[];
}

function convertTemp(value: number, from: UnitsType, to: UnitsType): number {
  if (from === to) return value;
  if (from === "imperial") return (value - 32) * (5 / 9);
  return value * (9 / 5) + 32;
}

function convertWind(value: number, from: UnitsType, to: UnitsType): number {
  if (from === to) return value;
  if (from === "imperial") return value * 1.60934;
  return value / 1.60934;
}

async function syncAlertsToBackend(alerts: AlertPreference[], fcmToken: string | null) {
  if (!fcmToken) return;
  const response = await fetch(`${BACKEND_URI}/alerts/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fcmToken, alerts }),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync alerts: ${response.status}`);
  }
}

function getPersistedAlertsHash(fcmToken: string): string | null {
  const inMemoryHash = lastSyncedAlertsByToken.get(fcmToken);
  if (inMemoryHash) return inMemoryHash;

  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(getAlertPreferencesSyncStorageKey(fcmToken));
}

function persistAlertsHash(fcmToken: string, hash: string) {
  lastSyncedAlertsByToken.set(fcmToken, hash);

  if (typeof window === "undefined") return;
  window.localStorage.setItem(getAlertPreferencesSyncStorageKey(fcmToken), hash);
}

export function useAlertPreferences(
  fcmToken?: string | null
): AlertPreferencesControls {
  const [alerts, setAlerts, alertsHydrated, hasStoredAlerts] =
    useLocalStorage<AlertPreference[]>(
      "weather-app-alerts",
      []
    );
  const alertsHash = useMemo(() => JSON.stringify(alerts), [alerts]);

  useEffect(() => {
    if (!fcmToken || !alertsHydrated) return;
    if (!hasStoredAlerts && alerts.length === 0) return;
    if (getPersistedAlertsHash(fcmToken) === alertsHash) return;

    const timeoutId = window.setTimeout(() => {
      syncAlertsToBackend(alerts, fcmToken)
        .then(() => persistAlertsHash(fcmToken, alertsHash))
        .catch((error) => {
          console.error("Failed to sync alerts to backend:", error);
        });
    }, ALERT_SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [alerts, alertsHash, alertsHydrated, fcmToken, hasStoredAlerts]);

  const addAlert = useCallback(
    (alert: Omit<AlertPreference, "id">) => {
      setAlerts((prev) => {
        return [
          ...prev,
          { ...alert, id: crypto.randomUUID() },
        ];
      });
    },
    [setAlerts]
  );

  const updateAlert = useCallback(
    (id: string, updates: Partial<AlertPreference>) => {
      setAlerts((prev) => {
        return prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      });
    },
    [setAlerts]
  );

  const removeAlert = useCallback(
    (id: string) => {
      setAlerts((prev) => {
        return prev.filter((a) => a.id !== id);
      });
    },
    [setAlerts]
  );

  const toggleAlert = useCallback(
    (id: string) => {
      setAlerts((prev) => {
        return prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
      });
    },
    [setAlerts]
  );

  const checkAlerts = useCallback(
    (
      weatherData: WeatherDataResponse,
      currentUnits: UnitsType
    ): TriggeredAlert[] => {
      const triggered: TriggeredAlert[] = [];

      for (const alert of alerts) {
        if (!alert.enabled) continue;
        if (
          alert.location !== "*" &&
          alert.location.toLowerCase() !== weatherData.name.toLowerCase()
        )
          continue;

        let currentValue: number;
        let threshold = alert.threshold;

        switch (alert.metric) {
          case "temp":
            currentValue = weatherData.current.temp;
            threshold = convertTemp(alert.threshold, alert.units, currentUnits);
            break;
          case "wind":
            currentValue =
              currentUnits === "imperial"
                ? weatherData.current.wind_speed
                : weatherData.current.wind_speed * 3.6;
            threshold =
              alert.units !== currentUnits
                ? convertWind(alert.threshold, alert.units, currentUnits)
                : alert.threshold;
            break;
          case "precipitation":
            currentValue = Math.round(weatherData.hourly[0].pop * 100);
            break;
        }

        const isTriggered =
          alert.comparator === "above"
            ? currentValue > threshold
            : currentValue < threshold;

        if (isTriggered) {
          triggered.push({
            alert,
            currentValue: Math.round(currentValue),
            locationName: weatherData.name,
          });
        }
      }

      return triggered;
    },
    [alerts]
  );

  return {
    alerts,
    alertsHydrated,
    addAlert,
    updateAlert,
    removeAlert,
    toggleAlert,
    checkAlerts,
  };
}
