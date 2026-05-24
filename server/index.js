require("dotenv").config();

const cors = require("cors");
const express = require("express");
const fs = require("fs");
const path = require("path");

const alertsRouter = require("./routes/alerts");
const { isQuotaExceededError } = require("./lib/api-metrics");
const { WeatherServiceError, getWeatherForLocation } = require("./lib/weather-service");
const { refreshRuntimeConfig } = require("./lib/runtime-config");
const { startWeatherChecker } = require("./lib/weather-checker");

const DEFAULT_PORT = Number.parseInt(process.env.PORT, 10) || 4000;

function createAllowedCorsOrigins() {
  return (process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function logUnexpectedWeatherApiError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.NODE_ENV === "production") {
    console.error(`[WeatherAPI] Unexpected error: ${message}`);
    return;
  }
  console.error("Error handling /api weather request:", error);
}

function mountRouteIfExists(app, mountPath, routeModulePath) {
  const absoluteRoutePath = path.resolve(__dirname, routeModulePath);
  const routeFilePath = `${absoluteRoutePath}.js`;
  const routeIndexPath = path.join(absoluteRoutePath, "index.js");

  if (!fs.existsSync(routeFilePath) && !fs.existsSync(routeIndexPath)) {
    return false;
  }

  const router = require(routeModulePath);
  app.use(mountPath, router);
  return true;
}

function createApp(deps = {}) {
  const {
    alertsRouterInstance = alertsRouter,
    weatherService = {
      WeatherServiceError,
      getWeatherForLocation,
    },
    metrics = {
      isQuotaExceededError,
    },
    mountRouteIfExistsFn = mountRouteIfExists,
  } = deps;

  const app = express();
  const allowedCorsOrigins = createAllowedCorsOrigins();

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedCorsOrigins.length === 0 || allowedCorsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
    })
  );

  app.use(express.json());

  // These route slots can be safely mounted once route files are present.
  mountRouteIfExistsFn(app, "/api/auth", "./routes/auth");
  mountRouteIfExistsFn(app, "/api/admin", "./routes/admin");
  mountRouteIfExistsFn(app, "/api/config", "./routes/config");

  app.use("/api/alerts", alertsRouterInstance);

  app.use("/api", async (req, res) => {
    try {
      const location =
        typeof req.query.location === "string" ? req.query.location.trim() : "";
      const requestedUnits =
        typeof req.query.units === "string" ? req.query.units : "metric";
      const units = requestedUnits === "imperial" ? "imperial" : "metric";

      if (!location) {
        return res.status(400).json({ error: "location query is required" });
      }

      const weatherData = await weatherService.getWeatherForLocation(location, units);
      if (!weatherData) {
        return res.status(502).json({ error: "Failed to fetch weather data." });
      }

      return res.status(200).send({ data: weatherData });
    } catch (error) {
      if (metrics.isQuotaExceededError(error)) {
        return res.status(429).json({
          error: "OpenWeather daily quota limit exceeded.",
          code: error.code,
          data: {
            cod: 429,
            message: "OpenWeather daily quota limit exceeded.",
          },
        });
      }

      if (error instanceof weatherService.WeatherServiceError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      logUnexpectedWeatherApiError(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return app;
}

function startServer(options = {}) {
  const {
    app = createApp(),
    port = DEFAULT_PORT,
    refreshRuntimeConfigFn = refreshRuntimeConfig,
    startWeatherCheckerFn = startWeatherChecker,
  } = options;

  return app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    refreshRuntimeConfigFn();
    startWeatherCheckerFn();
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  createAllowedCorsOrigins,
  mountRouteIfExists,
  startServer,
};
