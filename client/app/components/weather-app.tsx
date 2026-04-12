"use client";
import React, { useContext } from "react";
import UnitContextProvider from "../context/unit-provider";
import Header from "./header";
import WeatherDashboard from "./weather-dashboard/weather-dashboard";
import { WeatherContext } from "../context/weather-provider";
import { PeriodContext } from "../context/period-provider";
import { useNotifications } from "@/app/hooks/useNotifications";

const WeatherApp = ({
  location,
  units,
}: {
  location: string;
  units: string;
}) => {
  const { weather } = useContext(WeatherContext);
  const { period } = useContext(PeriodContext);
  const { latestMessage, clearLatestMessage } = useNotifications();

  return (
    <main className={`weather-app ${period}`} id={weather}>
      <UnitContextProvider>
        <div className="app-shell">
          {/* Foreground push notification toast */}
          {latestMessage && (
            <div className="fcm-toast" role="alert">
              <div className="fcm-toast-content">
                <strong>{latestMessage.title}</strong>
                <p>{latestMessage.body}</p>
              </div>
              <button
                type="button"
                className="fcm-toast-close"
                onClick={clearLatestMessage}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
          <Header />
          <WeatherDashboard
            location={location ?? "toronto"}
            units={units ?? "metric"}
            defaultLocation="Toronto"
          />
        </div>
      </UnitContextProvider>
    </main>
  );
};

export default WeatherApp;
