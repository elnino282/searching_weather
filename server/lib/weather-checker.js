const cron = require("node-cron");
const {
  db,
  messaging,
  isFirebaseAdminReady,
  firebaseInitMessage,
} = require("./firebase-admin");

const SUBSCRIPTIONS_COLLECTION = "subscriptions";
// Cooldown: don't re-notify the same device within this many milliseconds
const NOTIFICATION_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch weather data from OpenWeatherMap for a given city.
 */
async function fetchWeatherForCity(cityName, units = "metric") {
  const weatherKey = process.env.OPEN_WEATHER_API_KEY;
  if (!weatherKey) {
    console.error("[WeatherChecker] OPEN_WEATHER_API_KEY not set");
    return null;
  }

  try {
    // Step 1: Geocode city name
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&appid=${weatherKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      console.warn(`[WeatherChecker] City not found: ${cityName}`);
      return null;
    }

    const { lat, lon } = geoData[0];

    // Step 2: Fetch weather
    const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=${units}&appid=${weatherKey}`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    return {
      ...weatherData,
      name: geoData[0].name,
      country: geoData[0].country,
    };
  } catch (error) {
    console.error(`[WeatherChecker] Error fetching weather for ${cityName}:`, error.message);
    return null;
  }
}

/**
 * Convert temperature between metric and imperial.
 */
function convertTemp(value, from, to) {
  if (from === to) return value;
  if (from === "imperial") return (value - 32) * (5 / 9);
  return value * (9 / 5) + 32;
}

/**
 * Convert wind speed between metric (km/h) and imperial (mph).
 */
function convertWind(value, from, to) {
  if (from === to) return value;
  if (from === "imperial") return value * 1.60934;
  return value / 1.60934;
}

/**
 * Check a single alert against weather data.
 * Returns a notification payload if triggered, or null.
 */
function evaluateAlert(alert, weatherData) {
  if (!alert.enabled) return null;

  // Check location match
  if (
    alert.location !== "*" &&
    alert.location.toLowerCase() !== weatherData.name.toLowerCase()
  ) {
    return null;
  }

  const units = "metric"; // We always fetch in metric
  let currentValue;
  let threshold = alert.threshold;
  let metricLabel, unitLabel;

  switch (alert.metric) {
    case "temp":
      currentValue = weatherData.current.temp;
      threshold = convertTemp(alert.threshold, alert.units, units);
      metricLabel = "Temperature";
      unitLabel = "°C";
      break;
    case "wind":
      // API returns m/s for metric, convert to km/h
      currentValue = weatherData.current.wind_speed * 3.6;
      threshold =
        alert.units !== units
          ? convertWind(alert.threshold, alert.units, units)
          : alert.threshold;
      metricLabel = "Wind speed";
      unitLabel = "km/h";
      break;
    case "precipitation":
      currentValue = Math.round((weatherData.hourly?.[0]?.pop ?? 0) * 100);
      metricLabel = "Precipitation chance";
      unitLabel = "%";
      break;
    default:
      return null;
  }

  const isTriggered =
    alert.comparator === "above"
      ? currentValue > threshold
      : currentValue < threshold;

  if (!isTriggered) return null;

  return {
    title: `⚠️ Weather Alert: ${weatherData.name}`,
    body: `${metricLabel} is ${Math.round(currentValue)}${unitLabel} (${alert.comparator} ${Math.round(threshold)}${unitLabel})`,
    alertId: alert.id,
    location: weatherData.name,
  };
}

/**
 * Main cron job: iterate all subscriptions, check alerts, send notifications.
 */
async function checkAllSubscriptions() {
  if (!isFirebaseAdminReady || !db || !messaging) {
    console.warn(`[WeatherChecker] Skipping alert check: ${firebaseInitMessage}`);
    return;
  }

  console.log(`[WeatherChecker] Running alert check at ${new Date().toISOString()}`);

  try {
    const snapshot = await db.collection(SUBSCRIPTIONS_COLLECTION).get();

    if (snapshot.empty) {
      console.log("[WeatherChecker] No subscriptions found.");
      return;
    }

    // Collect all unique locations across all subscriptions
    const locationSet = new Set();
    const subscriptions = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      subscriptions.push(data);

      if (data.alerts && Array.isArray(data.alerts)) {
        for (const alert of data.alerts) {
          if (alert.enabled && alert.location) {
            if (alert.location === "*") {
              // For wildcard alerts, we'd need to know which cities to check.
              // Skip for now — they only trigger when the user views a city.
            } else {
              locationSet.add(alert.location.toLowerCase());
            }
          }
        }
      }
    });

    // Fetch weather for each unique location (deduplicated)
    const weatherCache = {};
    for (const location of locationSet) {
      weatherCache[location] = await fetchWeatherForCity(location, "metric");
    }

    // Evaluate alerts for each subscription
    for (const sub of subscriptions) {
      if (!sub.alerts || !Array.isArray(sub.alerts) || sub.alerts.length === 0) {
        continue;
      }

      // Check cooldown
      if (sub.lastNotifiedAt) {
        const lastNotified = sub.lastNotifiedAt.toDate
          ? sub.lastNotifiedAt.toDate()
          : new Date(sub.lastNotifiedAt);
        if (Date.now() - lastNotified.getTime() < NOTIFICATION_COOLDOWN_MS) {
          continue;
        }
      }

      const notifications = [];

      for (const alert of sub.alerts) {
        if (!alert.enabled) continue;
        if (alert.location === "*") continue; // Skip wildcard in cron

        const location = alert.location.toLowerCase();
        const weatherData = weatherCache[location];
        if (!weatherData) continue;

        const result = evaluateAlert(alert, weatherData);
        if (result) {
          notifications.push(result);
        }
      }

      // Send first triggered notification (avoid flooding)
      if (notifications.length > 0) {
        const notif = notifications[0];

        const message = {
          token: sub.fcmToken,
          notification: {
            title: notif.title,
            body: notif.body,
          },
          data: {
            alertId: notif.alertId || "",
            location: notif.location || "",
          },
          webpush: {
            fcmOptions: {
              link: "/",
            },
          },
        };

        try {
          await messaging.send(message);
          console.log(
            `[WeatherChecker] Notification sent to ${sub.fcmToken.substring(0, 20)}...: ${notif.body}`
          );

          // Update lastNotifiedAt to enforce cooldown
          await db
            .collection(SUBSCRIPTIONS_COLLECTION)
            .doc(sub.fcmToken)
            .update({ lastNotifiedAt: new Date() });
        } catch (sendError) {
          console.error(
            `[WeatherChecker] Failed to send to ${sub.fcmToken.substring(0, 20)}...:`,
            sendError.message
          );

          // If token is invalid, clean up the subscription
          if (
            sendError.code === "messaging/invalid-registration-token" ||
            sendError.code === "messaging/registration-token-not-registered"
          ) {
            console.log(`[WeatherChecker] Removing invalid token: ${sub.fcmToken.substring(0, 20)}...`);
            await db.collection(SUBSCRIPTIONS_COLLECTION).doc(sub.fcmToken).delete();
          }
        }
      }
    }

    console.log(`[WeatherChecker] Alert check completed.`);
  } catch (error) {
    console.error("[WeatherChecker] Error during alert check:", error);
  }
}

/**
 * Start the cron job.
 * Default: every 15 minutes. Configurable via ALERT_CHECK_INTERVAL_MINUTES env var.
 */
function startWeatherChecker() {
  if (!isFirebaseAdminReady || !db || !messaging) {
    console.warn(`[WeatherChecker] Disabled: ${firebaseInitMessage}`);
    return;
  }

  const intervalMinutes = parseInt(process.env.ALERT_CHECK_INTERVAL_MINUTES, 10) || 15;
  const cronExpression = `*/${intervalMinutes} * * * *`;

  console.log(
    `[WeatherChecker] Starting cron job — checking every ${intervalMinutes} minutes (${cronExpression})`
  );

  cron.schedule(cronExpression, () => {
    checkAllSubscriptions();
  });

  // Run once on startup (after a short delay to let server initialize)
  setTimeout(() => {
    checkAllSubscriptions();
  }, 5000);
}

module.exports = { startWeatherChecker, checkAllSubscriptions };
