describe("api-metrics", () => {
  const originalFetch = global.fetch;
  const originalLimit = process.env.OPENWEATHER_DAILY_QUOTA_LIMIT;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalLimit === undefined) {
      delete process.env.OPENWEATHER_DAILY_QUOTA_LIMIT;
    } else {
      process.env.OPENWEATHER_DAILY_QUOTA_LIMIT = originalLimit;
    }
    jest.resetModules();
  });

  test("records successful external calls and latency summary", async () => {
    process.env.OPENWEATHER_DAILY_QUOTA_LIMIT = "10";
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }));

    const metrics = require("../../lib/api-metrics");
    await metrics.fetchJsonWithMetrics("https://example.com", {}, {
      service: "openweather",
      endpoint: "geo",
    });

    const summary = metrics.getMetricsSummary();
    expect(summary.openWeather.usageToday).toBe(1);
    expect(summary.openWeather.successCount).toBe(1);
    expect(summary.openWeather.latencyAvgMs).toEqual(expect.any(Number));
  });

  test("enforces OpenWeather quota and throws deterministic 429 error", async () => {
    process.env.OPENWEATHER_DAILY_QUOTA_LIMIT = "1";
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }));

    const metrics = require("../../lib/api-metrics");
    await metrics.fetchJsonWithMetrics("https://example.com", {}, {
      service: "openweather",
      endpoint: "geo",
    });

    await expect(
      metrics.fetchJsonWithMetrics("https://example.com", {}, {
        service: "openweather",
        endpoint: "onecall",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "OPENWEATHER_DAILY_QUOTA_EXCEEDED",
        statusCode: 429,
      })
    );

    const summary = metrics.getMetricsSummary();
    expect(summary.openWeather.quotaRejected).toBe(1);
  });
});
