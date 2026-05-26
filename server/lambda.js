const serverless = require("serverless-http");

const { createApp } = require("./index");
const { refreshRuntimeConfig } = require("./lib/runtime-config");
const { checkAllSubscriptions } = require("./lib/weather-checker");

const app = createApp();
const apiHandler = serverless(app);

async function alertsHandler() {
  await refreshRuntimeConfig();
  await checkAllSubscriptions();

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      checkedAt: new Date().toISOString(),
    }),
  };
}

module.exports = {
  apiHandler,
  alertsHandler,
};
