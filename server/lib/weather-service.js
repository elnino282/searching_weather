const {
  getGooglePlacesApiKey,
  getOpenWeatherApiKey,
  isAqiEnabled,
} = require("./runtime-config");
const {
  fetchJsonWithMetrics,
  isQuotaExceededError,
} = require("./api-metrics");

const imageCache = new Map();

class WeatherServiceError extends Error {
  constructor(message, statusCode = 502, code = "WEATHER_SERVICE_ERROR") {
    super(message);
    this.name = "WeatherServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function buildOpenWeatherUrl(path, params) {
  const url = new URL(path);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function fetchOpenWeatherJson(url, endpoint) {
  return fetchJsonWithMetrics(url, undefined, {
    service: "openweather",
    endpoint,
  });
}

async function fetchWeatherData(cityName, units = "metric") {
  const weatherKey = await getOpenWeatherApiKey();
  if (!weatherKey) {
    throw new WeatherServiceError(
      "OpenWeather API key is not configured.",
      503,
      "OPENWEATHER_KEY_MISSING"
    );
  }

  try {
    const cityUrl = buildOpenWeatherUrl(
      "http://api.openweathermap.org/geo/1.0/direct",
      {
        q: cityName,
        appid: weatherKey,
      }
    );
    const { data: cityInfo } = await fetchOpenWeatherJson(cityUrl, "geo");

    if (!Array.isArray(cityInfo) || cityInfo.length === 0) {
      return null;
    }

    const { lon, lat } = cityInfo[0];
    const weatherUrl = buildOpenWeatherUrl(
      "https://api.openweathermap.org/data/3.0/onecall",
      {
        lat,
        lon,
        units,
        appid: weatherKey,
      }
    );
    const { data: weatherData } = await fetchOpenWeatherJson(
      weatherUrl,
      "onecall"
    );

    if (weatherData?.cod && Number(weatherData.cod) >= 400) {
      return { ...weatherData, ...cityInfo[0] };
    }

    let airPollutionInfo = {};
    if (await isAqiEnabled()) {
      const airPollutionUrl = buildOpenWeatherUrl(
        "http://api.openweathermap.org/data/2.5/air_pollution",
        {
          lat,
          lon,
          units: "Metric",
          appid: weatherKey,
        }
      );
      const { data } = await fetchOpenWeatherJson(airPollutionUrl, "air_pollution");
      airPollutionInfo = data || {};
    }

    return { ...weatherData, ...airPollutionInfo, ...cityInfo[0] };
  } catch (error) {
    if (isQuotaExceededError(error) || error instanceof WeatherServiceError) {
      throw error;
    }

    console.error("Error fetching weather data:", error.message);
    return null;
  }
}

async function fetchWeatherForCity(cityName, units = "metric") {
  const weatherKey = await getOpenWeatherApiKey();
  if (!weatherKey) {
    console.error("[WeatherService] OpenWeather API key is not configured.");
    return null;
  }

  try {
    const geoUrl = buildOpenWeatherUrl(
      "http://api.openweathermap.org/geo/1.0/direct",
      {
        q: cityName,
        appid: weatherKey,
      }
    );
    const { data: geoData } = await fetchOpenWeatherJson(geoUrl, "geo");

    if (!Array.isArray(geoData) || geoData.length === 0) {
      console.warn(`[WeatherService] City not found or API error for: ${cityName}`);
      return null;
    }

    const { lat, lon } = geoData[0];
    const weatherUrl = buildOpenWeatherUrl(
      "https://api.openweathermap.org/data/3.0/onecall",
      {
        lat,
        lon,
        units,
        appid: weatherKey,
      }
    );
    const { data: weatherData } = await fetchOpenWeatherJson(
      weatherUrl,
      "onecall"
    );

    return {
      ...weatherData,
      name: geoData[0].name,
      country: geoData[0].country,
    };
  } catch (error) {
    console.error(`[WeatherService] Error fetching weather for ${cityName}:`, error.message);
    return null;
  }
}

async function getPlaceDetails(location) {
  const googleKey = await getGooglePlacesApiKey();
  if (!location || !googleKey) {
    return null;
  }

  try {
    const placeDetailsUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/textsearch/json"
    );
    placeDetailsUrl.searchParams.set("query", location);
    placeDetailsUrl.searchParams.set("key", googleKey);

    const { data: placeDetailsResponse } = await fetchJsonWithMetrics(
      placeDetailsUrl.toString(),
      undefined,
      {
        service: "googlePlaces",
        endpoint: "textsearch",
      }
    );

    const firstPhoto = placeDetailsResponse?.results?.[0]?.photos?.[0];
    if (!firstPhoto?.photo_reference) {
      return null;
    }

    const { photo_reference, height = 800, width = 1200 } = firstPhoto;
    return getPhotoUrl(photo_reference, height, width, googleKey);
  } catch (error) {
    console.error("Error fetching place details:", error.message);
    return null;
  }
}

function getPhotoUrl(photoReference, height, width, googleKey) {
  const photoUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
  photoUrl.searchParams.set("maxwidth", width);
  photoUrl.searchParams.set("maxheight", height);
  photoUrl.searchParams.set("photoreference", photoReference);
  photoUrl.searchParams.set("key", googleKey);
  return photoUrl.toString();
}

async function getCachedImageUrl(location) {
  if (!location) return null;
  const normalizedLocation = location.toLowerCase();

  if (imageCache.has(normalizedLocation)) {
    return imageCache.get(normalizedLocation);
  }

  const imageUrl = await getPlaceDetails(location);
  imageCache.set(normalizedLocation, imageUrl ?? null);
  return imageUrl ?? null;
}

async function getWeatherForLocation(location, units = "metric") {
  const [imageUrl, weatherData] = await Promise.all([
    getCachedImageUrl(location),
    fetchWeatherData(location, units),
  ]);

  if (!weatherData) {
    return null;
  }

  return { imageUrl: imageUrl ?? null, ...weatherData };
}

module.exports = {
  WeatherServiceError,
  fetchWeatherData,
  fetchWeatherForCity,
  getPlaceDetails,
  getWeatherForLocation,
};
