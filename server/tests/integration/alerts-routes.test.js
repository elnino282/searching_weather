const express = require("express");
const request = require("supertest");

const { createFirestoreMock } = require("../helpers/firestore-mock");

function loadAlertsApp(options = {}) {
  const { firebaseReady = true, seed = {} } = options;
  jest.resetModules();

  const firestore = createFirestoreMock(seed);
  jest.doMock("../../lib/firebase-admin", () => ({
    db: firebaseReady ? firestore.db : null,
    isFirebaseAdminReady: firebaseReady,
    firebaseInitMessage: firebaseReady ? "ready" : "firebase disabled",
  }));

  const alertsRouter = require("../../routes/alerts");
  const app = express();
  app.use(express.json());
  app.use("/api/alerts", alertsRouter);

  return { app, firestore };
}

describe("alerts routes", () => {
  test("rejects subscribe payload without fcmToken", async () => {
    const { app } = loadAlertsApp();
    const response = await request(app).post("/api/alerts/subscribe").send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "fcmToken is required" });
  });

  test("registers new subscription token", async () => {
    const { app, firestore } = loadAlertsApp();
    const response = await request(app)
      .post("/api/alerts/subscribe")
      .send({ fcmToken: "token-1" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(firestore.getDoc("subscriptions", "token-1")).toEqual(
      expect.objectContaining({
        fcmToken: "token-1",
      })
    );
  });

  test("is idempotent for duplicate subscribe payload", async () => {
    const { app, firestore } = loadAlertsApp({
      seed: {
        "subscriptions/token-1": {
          fcmToken: "token-1",
          alerts: [
            {
              id: "a1",
              enabled: true,
              metric: "temp",
              comparator: "above",
              threshold: 30,
              location: "rome",
              units: "metric",
            },
          ],
        },
      },
    });

    const response = await request(app)
      .post("/api/alerts/subscribe")
      .send({
        fcmToken: "token-1",
        alerts: [
          {
            id: "a1",
            enabled: true,
            metric: "temp",
            comparator: "above",
            threshold: 30,
            location: "rome",
            units: "metric",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, skipped: true });
    expect(firestore.calls.docUpdate).toBe(0);
  });

  test("rejects non-array alerts payload", async () => {
    const { app } = loadAlertsApp();
    const response = await request(app)
      .post("/api/alerts/subscribe")
      .send({ fcmToken: "token-1", alerts: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "alerts must be an array" });
  });

  test("rejects invalid alert threshold type", async () => {
    const { app } = loadAlertsApp();
    const response = await request(app)
      .post("/api/alerts/subscribe")
      .send({
        fcmToken: "token-1",
        alerts: [
          {
            id: "a-invalid",
            enabled: true,
            metric: "temp",
            comparator: "above",
            threshold: "30",
            location: "rome",
            units: "metric",
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/threshold/i);
  });

  test("updates alert preferences without losing token", async () => {
    const { app, firestore } = loadAlertsApp({
      seed: {
        "subscriptions/token-2": {
          fcmToken: "token-2",
          alerts: [],
        },
      },
    });

    const response = await request(app)
      .post("/api/alerts/subscribe")
      .send({
        fcmToken: "token-2",
        alerts: [
          {
            id: "a2",
            enabled: true,
            metric: "wind",
            comparator: "above",
            threshold: 35,
            location: "rome",
            units: "metric",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(firestore.getDoc("subscriptions", "token-2")).toEqual(
      expect.objectContaining({
        fcmToken: "token-2",
        alerts: [
          {
            id: "a2",
            enabled: true,
            metric: "wind",
            comparator: "above",
            threshold: 35,
            location: "rome",
            units: "metric",
          },
        ],
      })
    );
  });

  test("returns 404 when subscription does not exist", async () => {
    const { app } = loadAlertsApp();
    const response = await request(app).get("/api/alerts/subscribe/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Subscription not found" });
  });

  test("deletes subscription by token", async () => {
    const { app, firestore } = loadAlertsApp({
      seed: {
        "subscriptions/token-3": {
          fcmToken: "token-3",
        },
      },
    });

    const response = await request(app)
      .delete("/api/alerts/subscribe")
      .send({ fcmToken: "token-3" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(firestore.getDoc("subscriptions", "token-3")).toBeUndefined();
  });

  test("returns 503 when firebase alerts are unavailable", async () => {
    const { app } = loadAlertsApp({ firebaseReady: false });
    const response = await request(app)
      .post("/api/alerts/subscribe")
      .send({ fcmToken: "token-4" });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe("Firebase alerts are not configured on this server.");
  });
});
