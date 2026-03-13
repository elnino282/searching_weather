"use client";

import { getDay } from "@/app/utils/utility-functions";
import React, { useRef } from "react";
import { TbDropletsFilled } from "react-icons/tb";
import { selectWeatherIcon } from "./weather-dashboard";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { DailyWeatherData, WeatherDataResponse } from "@/app/types/types";

const DailyCard = ({ weatherData }: { weatherData: WeatherDataResponse }) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: "left" | "right") => {
    const amount = direction === "left" ? -220 : 220;
    carouselRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="daily-forecast-container">
      <div className="section-header">
        <div>
          <p className="section-label">Forecast</p>
          <h3>8-Day Outlook</h3>
        </div>
      </div>

      <div className="button-container left">
        <button
          type="button"
          className="left-button"
          aria-label="Scroll daily forecast left"
          onClick={() => scrollCarousel("left")}
        >
          <FaChevronLeft />
        </button>
      </div>
      <div className="button-container right">
        <button
          type="button"
          className="right-button"
          aria-label="Scroll daily forecast right"
          onClick={() => scrollCarousel("right")}
        >
          <FaChevronRight />
        </button>
      </div>

      <div className="daily-forecast-mask" ref={carouselRef}>
        <ul className="daily-forecast-items-container">
          {weatherData?.daily.map(
            (day: DailyWeatherData, index: number) => {
              const date = getDay(day.dt);

              return (
                <li key={index}>
                  <p className="day">{index === 0 ? "Today" : date}</p>
                  <div className="weather-icon" id="weather-icon-daily">
                    {selectWeatherIcon(
                      day.weather[0].main,
                      day.dt,
                      weatherData?.current.sunset,
                      weatherData?.current.sunrise,
                      false
                    )}
                  </div>
                  <div className="temps">
                    <p className="temp">
                      {Math.round(day.temp.max)}
                      {"\u00B0"}
                    </p>
                    <p className="temp">
                      {Math.round(day.temp.min)}
                      {"\u00B0"}
                    </p>
                  </div>
                  <p className="precipitation">
                    <TbDropletsFilled /> {Math.round(day.pop * 100)}%
                  </p>
                </li>
              );
            }
          )}
        </ul>
      </div>
    </section>
  );
};

export default DailyCard;
