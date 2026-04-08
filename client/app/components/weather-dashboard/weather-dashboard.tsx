"use client";
import React, { useEffect, useMemo, useState } from "react";
import { formatStringToPath } from "../../utils/utility-functions";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FaCloudMoonRain } from "react-icons/fa";
import { IoMdCloudyNight } from "react-icons/io";
import { IoMoonSharp, IoRainy, IoSunny } from "react-icons/io5";
import { BsCloudFog2Fill, BsCloudsFill } from "react-icons/bs";
import {
  WiDayHaze,
  WiDayThunderstorm,
  WiFog,
  WiNightAltSnowWind,
  WiNightAltThunderstorm,
  WiNightFog,
} from "react-icons/wi";
import { GiSnowflake2 } from "react-icons/gi";
import CurrentCard from "./current-card";
import HourlyCard from "./hourly-card";
import DailyCard from "./daily-card";
import { WeatherDataResponse, UnitsType } from "@/app/types/types";
import AlertBanner from "../alerts/alert-banner";
import AlertSettingsCard from "../alerts/alert-settings-card";
import RecommendationsCard from "../recommendations/recommendations-card";
import ActivityFinderCard from "../activity-finder/activity-finder-card";
import { useAlertPreferences } from "@/app/hooks/useAlertPreferences";

export const checkIfDay = (
  dt: number,
  sunset: number,
  sunrise: number
): boolean => {
  return dt > sunrise && dt < sunset;
};

export const selectWeatherIcon = (
  weatherType: string,
  dt: number,
  sunset: number,
  sunrise: number,
  showNightIcons: boolean = true
): React.ReactNode => {
  weatherType = weatherType.toLowerCase();

  if (weatherType === "clear") {
    return checkIfDay(dt, sunset, sunrise) ? (
      <IoSunny />
    ) : showNightIcons ? (
      <IoMoonSharp />
    ) : (
      <IoSunny />
    );
  }

  if (weatherType === "clouds") {
    return checkIfDay(dt, sunset, sunrise) ? (
      <BsCloudsFill />
    ) : showNightIcons ? (
      <IoMdCloudyNight />
    ) : (
      <BsCloudsFill />
    );
  }

  if (weatherType === "rain" || weatherType === "drizzle") {
    return checkIfDay(dt, sunset, sunrise) ? (
      <IoRainy />
    ) : showNightIcons ? (
      <FaCloudMoonRain />
    ) : (
      <IoRainy />
    );
  }

  if (weatherType === "thunderstorm") {
    return checkIfDay(dt, sunset, sunrise) ? (
      <WiDayThunderstorm />
    ) : showNightIcons ? (
      <WiNightAltThunderstorm />
    ) : (
      <WiDayThunderstorm />
    );
  }

  if (weatherType === "mist") {
    return checkIfDay(dt, sunset, sunrise) ? (
      <WiFog />
    ) : showNightIcons ? (
      <WiNightFog />
    ) : (
      <WiFog />
    );
  }

  if (weatherType === "snow") {
    return checkIfDay(dt, sunset, sunrise) ? (
      <GiSnowflake2 />
    ) : showNightIcons ? (
      <WiNightAltSnowWind />
    ) : (
      <GiSnowflake2 />
    );
  }

  if (weatherType === "haze" || weatherType === "smoke") {
    return checkIfDay(dt, sunset, sunrise) ? (
      <WiDayHaze />
    ) : showNightIcons ? (
      <BsCloudFog2Fill />
    ) : (
      <WiDayHaze />
    );
  }

  return <BsCloudsFill />;
};

const WeatherDashboard = ({
  location,
  units,
  defaultLocation,
  hourlySectionWidth = 100,
  graphHeight = 150,
}: {
  location: string;
  units: string;
  defaultLocation: string;
  hourlySectionWidth?: number;
  graphHeight?: number;
}) => {
  const [weatherData, setWeatherData] = useState<WeatherDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { checkAlerts } = useAlertPreferences();

  const triggeredAlerts = useMemo(() => {
    if (!weatherData) return [];
    return checkAlerts(weatherData, (units as UnitsType) ?? "metric");
  }, [weatherData, units, checkAlerts]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URI}/?location=${formatStringToPath(
            location ?? defaultLocation
          )}&units=${units}`
        ).then((result) => result.json());

        const { data } = response;
        setWeatherData(data as WeatherDataResponse);
      } catch (error) {
        console.error(error);
        setWeatherData(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [defaultLocation, location, units]);

  const measuringUnits = useMemo(() => {
    if (units === "imperial") {
      return {
        speedUnit: "mph",
        tempUnit: "\u00B0F",
        distanceMultiplier: 0.6213, // Converts kilometers to miles.
        speedMultiplier: 1, // Imperial already returns mph.
        distanceUnit: "miles",
      };
    }

    return {
      speedUnit: "km/h",
      distanceUnit: "km",
      tempUnit: "\u00B0C",
      distanceMultiplier: 1,
      speedMultiplier: 3.6, // Metric returns m/s, convert to km/h.
    };
  }, [units]);

  return (
    <section
      className="weather-dashboard"
      style={{ "--hourly-section-width": `${hourlySectionWidth}px` }}
    >
      {!loading ? (
        weatherData ? (
          <div className="weather-data-container">
            <AlertBanner triggeredAlerts={triggeredAlerts} currentUnits={units} />
            <CurrentCard weatherData={weatherData} units={measuringUnits} />
            <HourlyCard
              weatherData={weatherData}
              hourlySectionWidth={hourlySectionWidth}
              graphHeight={graphHeight}
            />
            <DailyCard weatherData={weatherData} />
            <RecommendationsCard weatherData={weatherData} units={(units as UnitsType) ?? "metric"} />
            <ActivityFinderCard weatherData={weatherData} units={(units as UnitsType) ?? "metric"} />
            <AlertSettingsCard locationName={weatherData.name} />
          </div>
        ) : (
          <div className="no-results-container">
            <h2>No results found</h2>
            <p>Try another city name.</p>
          </div>
        )
      ) : (
        <div className="loading-container" aria-live="polite">
          <h2 className="loading-icon-container">
            <AiOutlineLoading3Quarters id="loading-icon" />
          </h2>
        </div>
      )}
    </section>
  );
};

export default WeatherDashboard;
