const express = require("express");
const request = require("supertest");

const auth = require("../../lib/auth");
const { createFirestoreMock } = require("../helpers/firestore-mock");

function createAdminCookieHeader() {
  const res = { cookie: jest.fn() };
  auth.signAdminSessionCookie(res);
  const [name, token] = res.cookie.mock.calls[0];
  return `${name}=${encodeURIComponent(token)}`;
}

function loadAdminApp(options = {}) {
  const {
    firebaseReady = true,
    seed = {},
    metricsSummary = { openWeather: { usageToday: 1 } },
    publicConfig = { features: { aqiEnabled: true } },
    updatedConfig = { features: { aqiEnabled: false } },
    openWeatherInfo = { source: "firestore", maskedKey: "ABCD...1234" },
    validateOpenWeatherKeyImpl = async () => true,
    updateOpenWeatherApiKeyImpl = async () => openWeatherInfo,
    messagingOverride,
  } = options;

  jest.resetModules();
  const firestore = createFirestoreMock(seed);
  const messaging =
    messagingOverride ||
    ({
      sendEachForMulticast: jest.fn(async () => ({ responses: [] })),
      sendEach: undefined,
      send: jest.fn(),
    });

  const checkFirestoreHealth = jest.fn(async () => ({ status: "UP", latencyMs: 5 }));
  const getFirebaseAdminHealth = jest.fn(() => ({ status: firebaseReady ? "UP" : "DOWN" }));
  const getMetricsSummary = jest.fn(() => metricsSummary);
  const getPublicConfig = jest.fn(async () => publicConfig);
  const updatePublicFeatures = jest.fn(async () => updatedConfig);
  const getOpenWeatherApiKeyInfo = jest.fn(async () => openWeatherInfo);
  const validateOpenWeatherKey = jest.fn(validateOpenWeatherKeyImpl);
  const updateOpenWeatherApiKey = jest.fn(updateOpenWeatherApiKeyImpl);
  const writeAuditLog = jest.fn(async () => true);

  jest.doMock("../../lib/firebase-admin", () => ({
    checkFirestoreHealth,
    db: firebaseReady ? firestore.db : null,
    getFirebaseAdminHealth,
    firebaseInitMessage: firebaseReady ? "ok" : "firebase disabled",
    isFirebaseAdminReady: firebaseReady,
    messaging: firebaseReady ? messaging : null,
  }));

  jest.doMock("../../lib/api-metrics", () => ({
    getMetricsSummary,
  }));

  jest.doMock("../../lib/runtime-config", () => ({
    getOpenWeatherApiKeyInfo,
    getPublicConfig,
    updateOpenWeatherApiKey,
    updatePublicFeatures,
    validateOpenWeatherKey,
  }));

  jest.doMock("../../lib/audit-log", () => ({
    writeAuditLog,
  }));

  const adminRouter = require("../../routes/admin");
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);

  return {
    app,
    firestore,
    messaging,
    mocks: {
      getMetricsSummary,
      getPublicConfig,
      updatePublicFeatures,
      getOpenWeatherApiKeyInfo,
      validateOpenWeatherKey,
      updateOpenWeatherApiKey,
      writeAuditLog,
      checkFirestoreHealth,
    },
  };
}

describe("admin routes", () => {
  test("rejects access without admin cookie", async () => {
    const { app } = loadAdminApp();
    const response = await request(app).get("/api/admin/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Admin authentication required." });
  });

  test("rejects tampered admin cookie", async () => {
    const { app } = loadAdminApp();
    const cookie = `${createAdminCookieHeader()}tampered`;
    const response = await request(app).get("/api/admin/me").set("Cookie", cookie);

    expect(response.status).toBe(401);
  });

  test("allows access with valid admin cookie", async () => {
    const { app } = loadAdminApp();
    const cookie = createAdminCookieHeader();
    const response = await request(app).get("/api/admin/me").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ role: "admin", ok: true });
  });

  test("health endpoint is protected and returns summary", async () => {
    const { app } = loadAdminApp();
    const cookie = createAdminCookieHeader();
    const response = await request(app).get("/api/admin/health").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: expect.any(String),
        openWeather: expect.any(Object),
      })
    );
  });

  test("updates feature flags and writes audit log", async () => {
    const { app, mocks } = loadAdminApp({
      updatedConfig: { features: { aqiEnabled: false } },
    });
    const cookie = createAdminCookieHeader();

    const response = await request(app)
      .patch("/api/admin/config/features")
      .set("Cookie", cookie)
      .send({ features: { aqiEnabled: false } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ features: { aqiEnabled: false } });
    expect(mocks.updatePublicFeatures).toHaveBeenCalledWith({ aqiEnabled: false });
    expect(mocks.writeAuditLog).toHaveBeenCalled();
  });

  test("validates OpenWeather key payload", async () => {
    const { app } = loadAdminApp();
    const cookie = createAdminCookieHeader();
    const response = await request(app)
      .post("/api/admin/openweather-key")
      .set("Cookie", cookie)
      .send({ key: "INVALID!!INVALID!!" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/invalid characters/i);
  });

  test("returns 503 when OpenWeather key update is requested without Firestore", async () => {
    const { app } = loadAdminApp({ firebaseReady: false });
    const cookie = createAdminCookieHeader();

    const response = await request(app)
      .post("/api/admin/openweather-key")
      .set("Cookie", cookie)
      .send({ key: "VALIDKEY12345678" });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe("Firestore runtime config is not available.");
  });

  test("broadcast returns success/failure summary and cleans invalid tokens", async () => {
    const messaging = {
      sendEachForMulticast: jest.fn(async () => ({
        responses: [
          { success: true, error: null },
          {
            success: false,
            error: { code: "messaging/registration-token-not-registered" },
          },
        ],
      })),
      sendEach: undefined,
      send: jest.fn(),
    };
    const { app, firestore } = loadAdminApp({
      messagingOverride: messaging,
      seed: {
        "subscriptions/doc-1": { fcmToken: "token-1" },
        "subscriptions/doc-2": { fcmToken: "token-2" },
      },
    });
    const cookie = createAdminCookieHeader();

    const response = await request(app)
      .post("/api/admin/broadcast")
      .set("Cookie", cookie)
      .send({ title: "Storm Alert", body: "Heavy rain soon", url: "/alerts" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      total: 2,
      success: 1,
      failure: 1,
      invalidRemoved: 1,
    });
    expect(firestore.getDoc("subscriptions", "doc-2")).toBeUndefined();
  });
});
