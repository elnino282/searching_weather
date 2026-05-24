const { createFirestoreMock } = require("../helpers/firestore-mock");

const ENV_KEYS = [
  "OPEN_WEATHER_API_KEY",
  "GOOGLE_PLACES_API_KEY",
];

function loadRuntimeConfig(options = {}) {
  const {
    firebaseReady = true,
    firebaseInitMessage = "Firebase disabled in test",
    seed = {},
    fetchJsonWithMetricsImpl,
  } = options;

  jest.resetModules();
  const firestore = createFirestoreMock(seed);
  const fetchJsonWithMetrics = jest.fn(
    fetchJsonWithMetricsImpl ||
      (async () => ({
        response: { ok: true },
        data: [{ name: "London" }],
      }))
  );

  jest.doMock("../../lib/firebase-admin", () => ({
    db: firebaseReady ? firestore.db : null,
    isFirebaseAdminReady: firebaseReady,
    firebaseInitMessage,
  }));

  jest.doMock("../../lib/api-metrics", () => ({
    fetchJsonWithMetrics,
  }));

  const runtimeConfig = require("../../lib/runtime-config");
  return { runtimeConfig, firestore, fetchJsonWithMetrics };
}

describe("runtime-config", () => {
  const previousEnv = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previousEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }
  });

  test("loads config from Firestore when available", async () => {
    const { runtimeConfig } = loadRuntimeConfig({
      seed: {
        "runtimeConfig/public": { features: { aqiEnabled: false } },
        "runtimeConfig/secrets": {
          openWeatherApiKey: "ABCD1234ABCD1234",
          googlePlacesApiKey: "GOOG1234GOOG1234",
        },
      },
    });

    const snapshot = await runtimeConfig.refreshRuntimeConfig();

    expect(snapshot.public.features.aqiEnabled).toBe(false);
    expect(snapshot.secrets.hasOpenWeatherApiKey).toBe(true);
    expect(snapshot.status.source).toBe("firestore");
  });

  test("falls back to env when Firestore is not ready", async () => {
    process.env.OPEN_WEATHER_API_KEY = "ENV1234ENV1234";
    process.env.GOOGLE_PLACES_API_KEY = "GOOGLE_ENV_123456";

    const { runtimeConfig } = loadRuntimeConfig({
      firebaseReady: false,
      firebaseInitMessage: "disabled for test",
    });

    const snapshot = await runtimeConfig.refreshRuntimeConfig();

    expect(snapshot.status.source).toBe("fallback");
    expect(snapshot.secrets.hasOpenWeatherApiKey).toBe(true);
    expect(snapshot.secrets.openWeatherApiKeySource).toBe("env");
    expect(snapshot.status.lastLoadError).toBe("disabled for test");
  });

  test("uses safe defaults when config docs are missing", async () => {
    const { runtimeConfig } = loadRuntimeConfig({
      seed: {},
    });

    const config = await runtimeConfig.getPublicConfig({ force: true });
    const snapshot = runtimeConfig.getRuntimeConfigSnapshot();

    expect(config.features.aqiEnabled).toBe(true);
    expect(snapshot.secrets.hasOpenWeatherApiKey).toBe(false);
  });

  test("updates feature flags with validation and notifies subscribers", async () => {
    const { runtimeConfig, firestore } = loadRuntimeConfig({
      seed: {
        "runtimeConfig/public": { features: { aqiEnabled: true } },
      },
    });

    await runtimeConfig.refreshRuntimeConfig();
    const subscriber = jest.fn();
    const unsubscribe = runtimeConfig.subscribePublicConfig(subscriber);

    const updated = await runtimeConfig.updatePublicFeatures({
      aqiEnabled: false,
    });

    expect(updated.features.aqiEnabled).toBe(false);
    expect(firestore.getDoc("runtimeConfig", "public").features.aqiEnabled).toBe(false);
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        features: expect.objectContaining({ aqiEnabled: false }),
      })
    );

    unsubscribe();
  });

  test("rejects invalid feature patch and preserves current state", async () => {
    const { runtimeConfig, firestore } = loadRuntimeConfig({
      seed: {
        "runtimeConfig/public": { features: { aqiEnabled: true } },
      },
    });

    await runtimeConfig.refreshRuntimeConfig();
    await expect(
      runtimeConfig.updatePublicFeatures({ invalidFlag: true })
    ).rejects.toThrow("Unknown feature flag: invalidFlag");

    const publicConfig = await runtimeConfig.getPublicConfig({ force: true });
    expect(publicConfig.features.aqiEnabled).toBe(true);
    expect(firestore.calls.docSet).toBe(0);
  });

  test("hot-swaps OpenWeather key with masking and format validation", async () => {
    const { runtimeConfig, firestore } = loadRuntimeConfig({
      seed: {
        "runtimeConfig/secrets": {
          openWeatherApiKey: "OLD12345OLD12345",
        },
      },
    });

    await runtimeConfig.refreshRuntimeConfig();
    await expect(runtimeConfig.updateOpenWeatherApiKey("short")).rejects.toThrow(
      "key length is invalid."
    );

    const info = await runtimeConfig.updateOpenWeatherApiKey("NEWKEY1234567890");

    expect(info.source).toBe("firestore");
    expect(info.maskedKey).not.toContain("NEWKEY1234567890");
    expect(firestore.getDoc("runtimeConfig", "secrets").openWeatherApiKey).toBe(
      "NEWKEY1234567890"
    );
  });

  test("reuses cache while still fresh to avoid extra storage reads", async () => {
    const { runtimeConfig, firestore } = loadRuntimeConfig({
      seed: {
        "runtimeConfig/public": { features: { aqiEnabled: true } },
      },
    });

    await runtimeConfig.getPublicConfig({ force: true });
    const getCallsAfterFirstRead = firestore.calls.docGet;

    await runtimeConfig.getPublicConfig();
    await runtimeConfig.getOpenWeatherApiKeyInfo();

    expect(firestore.calls.docGet).toBe(getCallsAfterFirstRead);
  });

  test("validates OpenWeather key via external call without uncaught errors", async () => {
    const { runtimeConfig, fetchJsonWithMetrics } = loadRuntimeConfig({
      fetchJsonWithMetricsImpl: async () => ({
        response: { ok: true },
        data: [{ name: "London" }],
      }),
    });

    await expect(runtimeConfig.validateOpenWeatherKey("VALIDKEY12345678")).resolves.toBe(true);
    expect(fetchJsonWithMetrics).toHaveBeenCalledTimes(1);
  });
});
