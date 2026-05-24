const { createFirestoreMock } = require("../helpers/firestore-mock");

function loadWeatherChecker(options = {}) {
  const {
    firebaseReady = true,
    seed = {},
    weatherByCity = {},
    sendImpl = async () => "ok",
  } = options;

  jest.resetModules();
  const firestore = createFirestoreMock(seed);
  const send = jest.fn(sendImpl);
  const fetchWeatherForCity = jest.fn(async (city) => weatherByCity[city] || null);

  jest.doMock("../../lib/firebase-admin", () => ({
    db: firebaseReady ? firestore.db : null,
    messaging: firebaseReady ? { send } : null,
    isFirebaseAdminReady: firebaseReady,
    firebaseInitMessage: firebaseReady ? "ready" : "firebase disabled",
  }));

  jest.doMock("../../lib/weather-service", () => ({
    fetchWeatherForCity,
  }));

  const weatherChecker = require("../../lib/weather-checker");
  return { weatherChecker, firestore, send, fetchWeatherForCity };
}

describe("weather-checker", () => {
  test("sends notification when temperature alert is triggered", async () => {
    const { weatherChecker, send, firestore } = loadWeatherChecker({
      seed: {
        "subscriptions/token-1": {
          fcmToken: "token-1",
          alerts: [
            {
              id: "alert-1",
              enabled: true,
              metric: "temp",
              comparator: "above",
              threshold: 30,
              units: "metric",
              location: "bangkok",
            },
          ],
        },
      },
      weatherByCity: {
        bangkok: {
          name: "bangkok",
          current: { temp: 35, wind_speed: 5 },
          hourly: [{ pop: 0.2 }],
        },
      },
    });

    await weatherChecker.checkAllSubscriptions();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        token: "token-1",
        notification: expect.objectContaining({
          title: expect.stringContaining("bangkok"),
        }),
      })
    );
    expect(firestore.calls.docUpdate).toBeGreaterThan(0);
  });

  test("does not notify when cooldown window has not elapsed", async () => {
    const now = Date.now();
    const { weatherChecker, send } = loadWeatherChecker({
      seed: {
        "subscriptions/token-2": {
          fcmToken: "token-2",
          lastNotifiedAt: new Date(now - 10 * 60 * 1000),
          alerts: [
            {
              id: "alert-2",
              enabled: true,
              metric: "temp",
              comparator: "above",
              threshold: 25,
              units: "metric",
              location: "hanoi",
            },
          ],
        },
      },
      weatherByCity: {
        hanoi: {
          name: "hanoi",
          current: { temp: 34, wind_speed: 4 },
          hourly: [{ pop: 0.1 }],
        },
      },
    });

    await weatherChecker.checkAllSubscriptions();
    expect(send).not.toHaveBeenCalled();
  });

  test("applies wind unit conversion correctly for alert evaluation", async () => {
    const { weatherChecker, send } = loadWeatherChecker({
      seed: {
        "subscriptions/token-3": {
          fcmToken: "token-3",
          alerts: [
            {
              id: "alert-3",
              enabled: true,
              metric: "wind",
              comparator: "above",
              threshold: 20,
              units: "imperial",
              location: "rome",
            },
          ],
        },
      },
      weatherByCity: {
        rome: {
          name: "rome",
          current: { temp: 21, wind_speed: 10 },
          hourly: [{ pop: 0 }],
        },
      },
    });

    await weatherChecker.checkAllSubscriptions();
    expect(send).toHaveBeenCalledTimes(1);
  });

  test("cleans up invalid tokens and continues job on send failure", async () => {
    const invalidTokenError = new Error("invalid token");
    invalidTokenError.code = "messaging/registration-token-not-registered";

    const { weatherChecker, send, firestore } = loadWeatherChecker({
      seed: {
        "subscriptions/token-4": {
          fcmToken: "token-4",
          alerts: [
            {
              id: "alert-4",
              enabled: true,
              metric: "temp",
              comparator: "above",
              threshold: 20,
              units: "metric",
              location: "madrid",
            },
          ],
        },
      },
      weatherByCity: {
        madrid: {
          name: "madrid",
          current: { temp: 30, wind_speed: 2 },
          hourly: [{ pop: 0 }],
        },
      },
      sendImpl: async () => {
        throw invalidTokenError;
      },
    });

    await weatherChecker.checkAllSubscriptions();

    expect(send).toHaveBeenCalledTimes(1);
    expect(firestore.getDoc("subscriptions", "token-4")).toBeUndefined();
  });
});
