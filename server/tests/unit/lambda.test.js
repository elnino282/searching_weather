function loadLambdaModule() {
  jest.resetModules();

  const mockApiHandler = jest.fn(async () => ({ statusCode: 204 }));

  jest.doMock("serverless-http", () => jest.fn(() => mockApiHandler));
  jest.doMock("../../index", () => ({
    createApp: jest.fn(() => ({ name: "express-app" })),
  }));
  jest.doMock("../../lib/runtime-config", () => ({
    refreshRuntimeConfig: jest.fn(async () => ({ ok: true })),
  }));
  jest.doMock("../../lib/weather-checker", () => ({
    checkAllSubscriptions: jest.fn(async () => undefined),
  }));

  const serverless = require("serverless-http");
  const { createApp } = require("../../index");
  const { refreshRuntimeConfig } = require("../../lib/runtime-config");
  const { checkAllSubscriptions } = require("../../lib/weather-checker");
  const lambda = require("../../lambda");

  return {
    ...lambda,
    checkAllSubscriptions,
    createApp,
    serverless,
    refreshRuntimeConfig,
  };
}

describe("lambda handlers", () => {
  test("wraps the Express app for API Gateway", async () => {
    const { apiHandler, createApp, serverless } = loadLambdaModule();
    const response = await apiHandler({ rawPath: "/api/config/public" }, {});

    expect(createApp).toHaveBeenCalledTimes(1);
    expect(serverless).toHaveBeenCalledWith({ name: "express-app" });
    expect(response).toEqual({ statusCode: 204 });
  });

  test("refreshes config before checking alert subscriptions", async () => {
    const { alertsHandler, checkAllSubscriptions, refreshRuntimeConfig } =
      loadLambdaModule();
    const response = await alertsHandler();

    expect(refreshRuntimeConfig).toHaveBeenCalledTimes(1);
    expect(checkAllSubscriptions).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      ok: true,
      checkedAt: expect.any(String),
    });
  });
});
