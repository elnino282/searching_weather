require("dotenv").config();
const express = require('express');
const app = express();
const cors = require('cors');
// const serverless = require('serverless-http')
const PORT = process.env.PORT || 4000;
const weatherKey = process.env.OPEN_WEATHER_API_KEY;
const googleKey = process.env.GOOGLE_PLACES_API_KEY;
let prevLocation, prevImageUrl;

// Firebase & Alerts
const alertsRouter = require("./routes/alerts");
const { startWeatherChecker } = require("./lib/weather-checker");

app.use(cors());
app.use(express.json());

// Alerts API routes
app.use("/api/alerts", alertsRouter);

// Weather data route (original)
app.use("/api", async (req, res) => {
  try {
    const { location, units = "metric" } = req.query;

    if (!location || typeof location !== "string") {
      return res.status(400).json({ error: "location query is required" });
    }

    if (location !== prevLocation) {
      prevLocation = location;
      prevImageUrl = await getPlaceDetails(location);
    }

    const weatherData = await fetchWeatherData(location, units);
    if (!weatherData) {
      return res.status(502).json({ error: "Failed to fetch weather data." });
    }

    return res.send({ data: { imageUrl: prevImageUrl ?? null, ...weatherData } });
  } catch (error) {
    console.error("Error handling /api weather request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});



const fetchWeatherData = async (cityName, units) => { 
  try {
    const cityUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&appid=${weatherKey}`;
    const cityInfo = await fetch(cityUrl).then((response) => response.json());

    if (!Array.isArray(cityInfo) || cityInfo.length === 0) {
      return null;
    }

    const { lon, lat } = cityInfo[0];

    const searchUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=${units}&appid=${weatherKey}`;
    const airPollutionUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&units=Metric&appid=${weatherKey}`;
    const airPollutionInfo = await fetch(airPollutionUrl).then((response) =>
      response.json()
    );
    const weatherData = await fetch(searchUrl).then((response) =>
      response.json()
    );

    return { ...weatherData, ...airPollutionInfo, ...cityInfo[0] };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}

const getPlaceDetails = async (location) => {
  if (!location || !googleKey) {
    return null;
  }

  try {
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(location)}&key=${googleKey}`;
    const placeDetailsResponse = await fetch(placeDetailsUrl).then((response) => response.json());

    const firstPhoto = placeDetailsResponse?.results?.[0]?.photos?.[0];
    if (!firstPhoto?.photo_reference) {
      return null;
    }

    const {
      photo_reference,
      height = 800,
      width = 1200,
    } = firstPhoto;

    return getPhotoUrl(photo_reference, height, width);
  } catch (error) {
    console.error("Error fetching place details:", error);
    return null;
  }
};

const getPhotoUrl = (photoReference, height, width) => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&maxheight=${height}&photoreference=${photoReference}&key=${googleKey}`;
};

app.listen(PORT, () => {
console.log(`Server is running on port ${PORT}`);

// Start weather checker cron job
startWeatherChecker();
})

//Make all of these into middleware functions later on

// module.exports.handler = serverless(app);
