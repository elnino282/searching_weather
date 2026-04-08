"use client";
import React, { useMemo } from "react";
import { IoSunny, IoRainy, IoSnow } from "react-icons/io5";
import { BsCloudsFill } from "react-icons/bs";
import { MdOutdoorGrill, MdSurfing } from "react-icons/md";
import { FaRunning, FaHome, FaCamera } from "react-icons/fa";
import { generateRecommendations } from "@/app/utils/recommendations";
import {
  ActivityCategory,
  UnitsType,
  WeatherDataResponse,
} from "@/app/types/types";

const categoryIcons: Record<ActivityCategory, React.ReactNode> = {
  outdoor_exercise: <FaRunning />,
  indoor_activity: <BsCloudsFill />,
  photography: <FaCamera />,
  beach: <MdSurfing />,
  winter_sport: <IoSnow />,
  casual_walk: <IoSunny />,
  stay_home: <FaHome />,
};

const RecommendationsCard = ({
  weatherData,
  units,
}: {
  weatherData: WeatherDataResponse;
  units: UnitsType;
}) => {
  const recommendations = useMemo(
    () => generateRecommendations(weatherData, units),
    [weatherData, units]
  );

  return (
    <section className="recommendations-card">
      <div className="section-header">
        <div>
          <p className="section-label">Insights</p>
          <h3>Today&apos;s Recommendations</h3>
        </div>
      </div>
      <div className="recommendation-grid">
        {recommendations.map((rec) => (
          <div key={rec.category} className="recommendation-item">
            <div className="recommendation-icon">
              {categoryIcons[rec.category]}
            </div>
            <h4 className="recommendation-title">{rec.title}</h4>
            <p className="recommendation-description">{rec.description}</p>
            <div
              className={`confidence-badge ${
                rec.confidence >= 75
                  ? "high"
                  : rec.confidence >= 50
                    ? "medium"
                    : "low"
              }`}
            >
              {rec.confidence}% match
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecommendationsCard;
