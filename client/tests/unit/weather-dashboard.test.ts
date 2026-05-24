import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import WeatherDashboard, {
  checkIfDay,
} from "@/app/components/weather-dashboard/weather-dashboard";

vi.mock("@/app/hooks/useAlertPreferences", () => ({
  useAlertPreferences: () => ({
    alerts: [],
    alertsHydrated: true,
    addAlert: vi.fn(),
    updateAlert: vi.fn(),
    removeAlert: vi.fn(),
    toggleAlert: vi.fn(),
    checkAlerts: vi.fn(() => []),
  }),
}));

vi.mock("@/app/context/language-provider", () => ({
  useLanguage: () => ({ language: "en" }),
}));

vi.mock("@/app/context/feature-flags-provider", () => ({
  useFeatureFlags: () => ({ features: { aqiEnabled: true } }),
}));

vi.mock("@/app/components/alerts/alert-banner", () => ({
  default: () => React.createElement("div", { "data-testid": "alert-banner" }),
}));

vi.mock("@/app/components/alerts/alert-settings-card", () => ({
  default: () => React.createElement("div", { "data-testid": "alert-settings" }),
}));

vi.mock("@/app/components/recommendations/recommendations-card", () => ({
  default: () => React.createElement("div", { "data-testid": "recommendations" }),
}));

vi.mock("@/app/components/activity-finder/activity-finder-card", () => ({
  default: () => React.createElement("div", { "data-testid": "activity-finder" }),
}));

vi.mock("@/app/components/weather-dashboard/hourly-card", () => ({
  default: () => React.createElement("div", { "data-testid": "hourly-card" }),
}));

vi.mock("@/app/components/weather-dashboard/daily-card", () => ({
  default: () => React.createElement("div", { "data-testid": "daily-card" }),
}));

vi.mock("@/app/components/weather-dashboard/current-card", () => ({
  default: ({
    weatherData,
    units,
  }: {
    weatherData: { name: string };
    units: { tempUnit: string };
  }) =>
    React.createElement(
      "div",
      { "data-testid": "current-card" },
      `${weatherData.name}|${units.tempUnit}`
    ),
}));

const notificationControls = {
  permissionStatus: "default" as const,
  fcmToken: null,
  pushEnabled: false,
  isTogglingPush: false,
  isRequestingPermission: false,
  notificationError: null,
  requestNotificationPermission: vi.fn(async () => null),
  disablePushNotifications: vi.fn(async () => true),
};

const mockWeatherPayload = {
  name: "Bangkok",
  current: {
    temp: 32,
    wind_speed: 3,
    sunrise: 100,
    sunset: 200,
    weather: [{ main: "Clear" }],
  },
  hourly: [{ pop: 0.1 }],
  daily: [],
};

function renderDashboard(units: string) {
  render(
    React.createElement(WeatherDashboard, {
      location: "bangkok",
      units,
      defaultLocation: "Bangkok",
      notificationControls,
    })
  );
}

describe("WeatherDashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("shows loading state while fetch is pending", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})) as unknown as typeof fetch);
    renderDashboard("metric");
    expect(document.querySelector("#loading-icon")).not.toBeNull();
  });

  test("renders weather content on successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ data: mockWeatherPayload }),
      })) as unknown as typeof fetch
    );

    renderDashboard("metric");
    await waitFor(() => expect(screen.getByTestId("current-card")).toBeInTheDocument());
    expect(screen.getByTestId("current-card")).toHaveTextContent("Bangkok");
    expect(screen.getByTestId("current-card")).toHaveTextContent("°C");
  });

  test("shows fallback UI when weather API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("backend unavailable");
      }) as unknown as typeof fetch
    );

    renderDashboard("metric");
    await waitFor(() => expect(screen.getByText("No results found")).toBeInTheDocument());
  });

  test("shows quota-specific fallback message when API returns cod 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ data: { cod: 429 } }),
      })) as unknown as typeof fetch
    );

    renderDashboard("metric");
    await waitFor(() => expect(screen.getByText("API Limit Exceeded")).toBeInTheDocument());
  });

  test("maps imperial units correctly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ data: mockWeatherPayload }),
      })) as unknown as typeof fetch
    );

    renderDashboard("imperial");
    await waitFor(() => expect(screen.getByTestId("current-card")).toBeInTheDocument());
    expect(screen.getByTestId("current-card")).toHaveTextContent("°F");
  });

  test("falls back to metric display for invalid unit string", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ data: mockWeatherPayload }),
      })) as unknown as typeof fetch
    );

    renderDashboard("invalid-unit");
    await waitFor(() => expect(screen.getByTestId("current-card")).toBeInTheDocument());
    expect(screen.getByTestId("current-card")).toHaveTextContent("°C");
  });
});

describe("checkIfDay", () => {
  test("returns true when timestamp is between sunrise and sunset", () => {
    expect(checkIfDay(150, 200, 100)).toBe(true);
  });

  test("returns false when timestamp is outside sunrise/sunset range", () => {
    expect(checkIfDay(250, 200, 100)).toBe(false);
  });
});
