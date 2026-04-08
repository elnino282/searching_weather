"use client";
import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  AlertPreference,
  TriggeredAlert,
  UnitsType,
  WeatherDataResponse,
} from "@/app/types/types";

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

export function useAlertPreferences() {
  const [alerts, setAlerts] = useLocalStorage<AlertPreference[]>(
    "weather-app-alerts",
    []
  );

  const addAlert = useCallback(
    (alert: Omit<AlertPreference, "id">) => {
      setAlerts((prev) => [
        ...prev,
        { ...alert, id: crypto.randomUUID() },
      ]);
    },
    [setAlerts]
  );

  const updateAlert = useCallback(
    (id: string, updates: Partial<AlertPreference>) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
    },
    [setAlerts]
  );

  const removeAlert = useCallback(
    (id: string) => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    },
    [setAlerts]
  );

  const toggleAlert = useCallback(
    (id: string) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
      );
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

  return { alerts, addAlert, updateAlert, removeAlert, toggleAlert, checkAlerts };
}
