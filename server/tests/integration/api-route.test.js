const express = require("express");
const request = require("supertest");

const { createApp } = require("../../index");

class FakeWeatherServiceError extends Error {
  constructor(message, statusCode = 502, code = "WEATHER_SERVICE_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function createTestApp(overrides = {}) {
  const getWeatherForLocation = jest.fn();
  const isQuotaExceededError = jest.fn(() => false);

  const app = createApp({
    alertsRouterInstance: express.Router(),
    mountRouteIfExistsFn: () => false,
    weatherService: {
      WeatherServiceError: FakeWeatherServiceError,
      getWeatherForLocation,
      ...(overrides.weatherService || {}),
    },
    metrics: {
      isQuotaExceededError,
      ...(overrides.metrics || {}),
    },
  });

  return { app, getWeatherForLocation, isQuotaExceededError };
}

describe("GET /api weather route", () => {
  test("returns 400 when location is missing", async () => {
    const { app, getWeatherForLocation } = createTestApp();
    const response = await request(app).get("/api");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "location query is required" });
    expect(getWeatherForLocation).not.toHaveBeenCalled();
  });

  test("returns 400 when location is empty after trim", async () => {
    const { app, getWeatherForLocation } = createTestApp();
    const response = await request(app).get("/api?location=%20%20");

    expect(response.status).toBe(400);
    expect(getWeatherForLocation).not.toHaveBeenCalled();
  });

  test("uses metric units by default and preserves response shape", async () => {
    const { app, getWeatherForLocation } = createTestApp();
    const data = { name: "Toronto", current: { temp: 18 } };
    getWeatherForLocation.mockResolvedValue(data);

    const response = await request(app).get("/api?location=toronto");

    expect(response.status).toBe(200);
    expect(getWeatherForLocation).toHaveBeenCalledWith("toronto", "metric");
    expect(response.body).toEqual({ data });
  });

  test("passes imperial units through to weather service", async () => {
    const { app, getWeatherForLocation } = createTestApp();
    getWeatherForLocation.mockResolvedValue({ name: "Boston", current: { temp: 70 } });

    const response = await request(app).get("/api?location=boston&units=imperial");

    expect(response.status).toBe(200);
    expect(getWeatherForLocation).toHaveBeenCalledWith("boston", "imperial");
  });

  test("falls back to metric units for invalid units", async () => {
    const { app, getWeatherForLocation } = createTestApp();
    getWeatherForLocation.mockResolvedValue({ name: "Paris", current: { temp: 22 } });

    const response = await request(app).get("/api?location=paris&units=kelvin");

    expect(response.status).toBe(200);
    expect(getWeatherForLocation).toHaveBeenCalledWith("paris", "metric");
  });

  test("returns 502 when city is not found or service has no weather", async () => {
    const { app, getWeatherForLocation } = createTestApp();
    getWeatherForLocation.mockResolvedValue(null);

    const response = await request(app).get("/api?location=unknown-city");

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: "Failed to fetch weather data." });
  });

  test("returns 429 for quota exceeded error", async () => {
    const quotaError = new Error("quota");
    quotaError.code = "OPENWEATHER_DAILY_QUOTA_EXCEEDED";

    const { app, getWeatherForLocation } = createTestApp({
      metrics: {
        isQuotaExceededError: jest.fn((error) => error === quotaError),
      },
    });

    getWeatherForLocation.mockRejectedValue(quotaError);
    const response = await request(app).get("/api?location=london");

    expect(response.status).toBe(429);
    expect(response.body.error).toBe("OpenWeather daily quota limit exceeded.");
  });

  test("returns WeatherServiceError status and code safely", async () => {
    const { app, getWeatherForLocation } = createTestApp();
    getWeatherForLocation.mockRejectedValue(
      new FakeWeatherServiceError(
        "OpenWeather API key is not configured.",
        503,
        "OPENWEATHER_KEY_MISSING"
      )
    );

    const response = await request(app).get("/api?location=tokyo");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: "OpenWeather API key is not configured.",
      code: "OPENWEATHER_KEY_MISSING",
    });
    expect(JSON.stringify(response.body)).not.toContain("OPEN_WEATHER_API_KEY");
  });

  test("handles unexpected errors without leaking secrets", async () => {
    process.env.OPEN_WEATHER_API_KEY = "TOP_SECRET_KEY";
    const { app, getWeatherForLocation } = createTestApp();
    getWeatherForLocation.mockRejectedValue(new Error("network exploded"));

    const response = await request(app).get("/api?location=seoul");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(response.body)).not.toContain("TOP_SECRET_KEY");
  });
});
