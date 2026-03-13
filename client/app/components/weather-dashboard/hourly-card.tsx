"use client";
import React, { useMemo, useRef } from "react";
import LineGraph from "../line-graph";
import { formatTime } from "@/app/utils/utility-functions";
import { selectWeatherIcon } from "./weather-dashboard";
import { TbDropletsFilled } from "react-icons/tb";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { HourlyWeatherData, WeatherDataResponse } from "@/app/types/types";

const HourlyCard = ({
  weatherData,
  hourlySectionWidth,
  graphHeight,
}: {
  weatherData: WeatherDataResponse;
  hourlySectionWidth: number;
  graphHeight: number;
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const hourlyData = useMemo(() => {
    if (!weatherData) return [];
    return weatherData?.hourly.slice(1, 25);
  }, [weatherData]);

  const graphData = useMemo(() => {
    return hourlyData.map((hour: HourlyWeatherData) => Math.round(hour.temp));
  }, [hourlyData]);

  const scrollCarousel = (direction: "left" | "right") => {
    const amount = direction === "left" ? -hourlySectionWidth * 3 : hourlySectionWidth * 3;
    carouselRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="hourly-forecast-container">
      <div className="section-header">
        <div>
          <p className="section-label">Forecast</p>
          <h3>Next 24 Hours</h3>
        </div>
      </div>

      <div className="button-container left">
        <button
          type="button"
          className="left-button"
          aria-label="Scroll hourly forecast left"
          onClick={() => scrollCarousel("left")}
        >
          <FaChevronLeft />
        </button>
      </div>
      <div className="button-container right">
        <button
          type="button"
          className="right-button"
          aria-label="Scroll hourly forecast right"
          onClick={() => scrollCarousel("right")}
        >
          <FaChevronRight />
        </button>
      </div>

      <div className="hourly-forecast-mask" ref={carouselRef}>
        <div className="hourly-forecast-page">
          <div className="graph-container">
            <LineGraph
              data={graphData}
              graphWidth={graphData.length * hourlySectionWidth}
              graphHeight={graphHeight}
              padding={{ x: hourlySectionWidth / 2, y: 30 }}
              id="hourly-forecast-temp-graph"
            />
          </div>
          <ul className="hourly-forecast">
            {hourlyData.map(
              (hour: HourlyWeatherData, index: number) => {
                const newTime = formatTime(
                  hour.dt,
                  weatherData.timezone_offset,
                  false
                );

                return (
                  <li key={index} className="hourly-forecast-section">
                    <p className="hour">{newTime}</p>
                    <div className="weather-icon" id="weather-icon-hourly">
                      {selectWeatherIcon(
                        hour.weather[0].main,
                        hour.dt + weatherData?.timezone_offset + 18000,
                        weatherData?.current.sunset,
                        weatherData?.current.sunrise,
                        false
                      )}
                    </div>
                    <h4>
                      {Math.round(hour.temp)}
                      {"\u00B0"}
                    </h4>
                    <p className="precipitation">
                      <TbDropletsFilled /> {Math.round(hour.pop * 100)}%
                    </p>
                  </li>
                );
              }
            )}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default HourlyCard;
