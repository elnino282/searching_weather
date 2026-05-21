require("dotenv").config();
const express = require('express');
const app = express();
const cors = require('cors');
const fs = require("fs");
const path = require("path");
// const serverless = require('serverless-http')
const PORT = process.env.PORT || 4000;

// Firebase & Alerts
const alertsRouter = require("./routes/alerts");
const { startWeatherChecker } = require("./lib/weather-checker");
const { refreshRuntimeConfig } = require("./lib/runtime-config");
const { isQuotaExceededError } = require("./lib/api-metrics");
const {
  WeatherServiceError,
  getWeatherForLocation,
} = require("./lib/weather-service");

const allowedCorsOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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

function mountRouteIfExists(mountPath, routeModulePath) {
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

// Phase 1 prepares these route slots. Later phases can add the files safely.
mountRouteIfExists("/api/auth", "./routes/auth");
mountRouteIfExists("/api/admin", "./routes/admin");
mountRouteIfExists("/api/config", "./routes/config");

// Alerts API routes
app.use("/api/alerts", alertsRouter);

// Weather data route (original)
app.use("/api", async (req, res) => {
  try {
    const { location, units = "metric" } = req.query;

    if (!location || typeof location !== "string") {
      return res.status(400).json({ error: "location query is required" });
    }

    const weatherData = await getWeatherForLocation(location, units);
    if (!weatherData) {
      return res.status(502).json({ error: "Failed to fetch weather data." });
    }

    return res.send({ data: weatherData });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return res.status(429).json({
        error: "OpenWeather daily quota limit exceeded.",
        code: error.code,
        data: {
          cod: 429,
          message: "OpenWeather daily quota limit exceeded.",
        },
      });
    }

    if (error instanceof WeatherServiceError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error("Error handling /api weather request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Warm the runtime config cache; weather requests still fallback safely if this fails.
  refreshRuntimeConfig();

  // Start weather checker cron job
  startWeatherChecker();
})

//Make all of these into middleware functions later on

// module.exports.handler = serverless(app);
