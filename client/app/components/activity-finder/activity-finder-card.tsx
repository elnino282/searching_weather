"use client";
import React, { useMemo, useState } from "react";
import { FaRunning, FaBiking, FaHiking, FaCamera } from "react-icons/fa";
import { MdOutdoorGrill } from "react-icons/md";
import { IoMoonSharp } from "react-icons/io5";
import { findBestTimes } from "@/app/utils/activity-time-finder";
import { formatTime } from "@/app/utils/utility-functions";
import {
  OutdoorActivity,
  UnitsType,
  WeatherDataResponse,
} from "@/app/types/types";

const activities: {
  id: OutdoorActivity;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "running", label: "Running", icon: <FaRunning /> },
  { id: "cycling", label: "Cycling", icon: <FaBiking /> },
  { id: "hiking", label: "Hiking", icon: <FaHiking /> },
  { id: "photography", label: "Photo", icon: <FaCamera /> },
  { id: "picnic", label: "Picnic", icon: <MdOutdoorGrill /> },
  { id: "stargazing", label: "Stargazing", icon: <IoMoonSharp /> },
];

function getScoreColor(score: number): string {
  if (score >= 70) return "var(--score-excellent)";
  if (score >= 40) return "var(--score-good)";
  return "var(--score-poor)";
}

const ActivityFinderCard = ({
  weatherData,
  units,
}: {
  weatherData: WeatherDataResponse;
  units: UnitsType;
}) => {
  const [selectedActivity, setSelectedActivity] =
    useState<OutdoorActivity>("running");

  const result = useMemo(
    () =>
      findBestTimes(
        selectedActivity,
        weatherData.hourly,
        weatherData.current,
        weatherData.timezone_offset,
        units
      ),
    [selectedActivity, weatherData, units]
  );

  return (
    <section className="activity-finder-card">
      <div className="section-header">
        <div>
          <p className="section-label">Planner</p>
          <h3>Best Times for Activities</h3>
        </div>
      </div>

      <div className="activity-pills">
        {activities.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`activity-pill ${selectedActivity === a.id ? "selected" : ""}`}
            onClick={() => setSelectedActivity(a.id)}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      <p className="activity-verdict">{result.overallVerdict}</p>

      <div className="best-hours-grid">
        {result.bestHours.slice(0, 3).map((hour) => (
          <div key={hour.dt} className="hour-score-card">
            <p className="hour-time">
              {formatTime(hour.dt, weatherData.timezone_offset)}
            </p>
            <div
              className="hour-score"
              style={{ color: getScoreColor(hour.score) }}
            >
              {hour.score}
            </div>
            <div className="hour-reasons">
              {hour.reasons.slice(0, 2).map((r, i) => (
                <span key={i} className="reason-chip">
                  {r}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="heatmap-bar">
        {result.allHours.map((hour, i) => (
          <div
            key={i}
            className="heatmap-segment"
            style={{ backgroundColor: getScoreColor(hour.score) }}
            title={`${formatTime(hour.dt, weatherData.timezone_offset)}: ${hour.score}/100`}
          />
        ))}
      </div>
      <div className="heatmap-labels">
        <span>Now</span>
        <span>+12h</span>
        <span>+24h</span>
      </div>
    </section>
  );
};

export default ActivityFinderCard;
