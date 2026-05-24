function defaultFetchJsonWithMetrics(url) {
  if (url.includes("/geo/1.0/direct")) {
    return Promise.resolve({
      response: { ok: true, status: 200 },
      data: [{ name: "Paris", lat: 48.8566, lon: 2.3522, country: "FR" }],
    });
  }

  if (url.includes("/data/3.0/onecall")) {
    return Promise.resolve({
      response: { ok: true, status: 200 },
      data: {
        current: { temp: 22, wind_speed: 4 },
        hourly: [{ pop: 0.2 }],
      },
    });
  }

  if (url.includes("/data/2.5/air_pollution")) {
    return Promise.resolve({
      response: { ok: true, status: 200 },
      data: { list: [{ main: { aqi: 2 } }] },
    });
  }

  if (url.includes("place/textsearch")) {
    return Promise.resolve({
      response: { ok: true, status: 200 },
      data: {
        results: [
          {
            photos: [
              {
                photo_reference: "photo-ref",
                width: 1000,
                height: 600,
              },
            ],
          },
        ],
      },
    });
  }

  return Promise.resolve({
    response: { ok: true, status: 200 },
    data: {},
  });
}

function loadWeatherService(options = {}) {
  const {
    openWeatherApiKey = "OPENWEATHER123456",
    googlePlacesApiKey = "GOOGLEPLACES123456",
    aqiEnabled = true,
    fetchImpl = defaultFetchJsonWithMetrics,
    isQuotaExceededErrorImpl = () => false,
  } = options;

  jest.resetModules();
  const fetchJsonWithMetrics = jest.fn(fetchImpl);
  const isQuotaExceededError = jest.fn(isQuotaExceededErrorImpl);

  jest.doMock("../../lib/runtime-config", () => ({
    getOpenWeatherApiKey: jest.fn(async () => openWeatherApiKey),
    getGooglePlacesApiKey: jest.fn(async () => googlePlacesApiKey),
    isAqiEnabled: jest.fn(async () => aqiEnabled),
  }));

  jest.doMock("../../lib/api-metrics", () => ({
    fetchJsonWithMetrics,
    isQuotaExceededError,
  }));

  const weatherService = require("../../lib/weather-service");
  return { weatherService, fetchJsonWithMetrics, isQuotaExceededError };
}

describe("weather-service", () => {
  test("throws configuration error when OpenWeather key is missing", async () => {
    const { weatherService } = loadWeatherService({
      openWeatherApiKey: "",
    });

    await expect(weatherService.fetchWeatherData("paris")).rejects.toEqual(
      expect.objectContaining({
        code: "OPENWEATHER_KEY_MISSING",
        statusCode: 503,
      })
    );
  });

  test("returns null for city not found and avoids onecall/aqi requests", async () => {
    const { weatherService, fetchJsonWithMetrics } = loadWeatherService({
      fetchImpl: async (url) => {
        if (url.includes("/geo/1.0/direct")) {
          return { response: { ok: true, status: 200 }, data: [] };
        }
        return defaultFetchJsonWithMetrics(url);
      },
    });

    const result = await weatherService.fetchWeatherData("missing-city");
    expect(result).toBeNull();
    expect(fetchJsonWithMetrics).toHaveBeenCalledTimes(1);
  });

  test("rethrows quota exceeded errors", async () => {
    const quotaError = new Error("quota");
    quotaError.code = "OPENWEATHER_DAILY_QUOTA_EXCEEDED";

    const { weatherService } = loadWeatherService({
      fetchImpl: async () => {
        throw quotaError;
      },
      isQuotaExceededErrorImpl: (error) => error === quotaError,
    });

    await expect(weatherService.fetchWeatherData("rome")).rejects.toBe(quotaError);
  });

  test("handles external API errors gracefully", async () => {
    const { weatherService } = loadWeatherService({
      fetchImpl: async () => {
        throw new Error("network timeout");
      },
    });

    const result = await weatherService.fetchWeatherData("london");
    expect(result).toBeNull();
  });

  test("keeps weather response when AQI request fails", async () => {
    const { weatherService } = loadWeatherService({
      fetchImpl: async (url) => {
        if (url.includes("/data/2.5/air_pollution")) {
          throw new Error("aqi unavailable");
        }
        return defaultFetchJsonWithMetrics(url);
      },
    });

    const result = await weatherService.fetchWeatherData("madrid");

    expect(result).toEqual(
      expect.objectContaining({
        name: "Paris",
        current: expect.any(Object),
      })
    );
  });

  test("returns weather even if Google place image is unavailable", async () => {
    const { weatherService } = loadWeatherService({
      googlePlacesApiKey: "",
    });

    const result = await weatherService.getWeatherForLocation("paris", "metric");
    expect(result).toEqual(
      expect.objectContaining({
        imageUrl: null,
        current: expect.any(Object),
      })
    );
  });
});
