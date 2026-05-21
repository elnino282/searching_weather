"use client";

import React from "react";
import { useLanguage } from "@/app/context/language-provider";

const AdminFeatureFlagsCard = ({
  aqiEnabled,
  loading,
  saving,
  message,
  onToggleAqi,
}: {
  aqiEnabled: boolean;
  loading: boolean;
  saving: boolean;
  message: string;
  onToggleAqi: () => void;
}) => {
  const { language } = useLanguage();
  const copy =
    language === "vi"
      ? {
          sectionLabel: "Cờ tính năng",
          title: "Công tắc lúc chạy",
          description:
            "Bật tắt AQI mà không cần deploy. Khi tắt, backend bỏ qua OpenWeather air_pollution và client ẩn thẻ AQI.",
          enabled: "Đang bật",
          disabled: "Đang tắt",
          toggleAqi: "Bật tắt AQI",
        }
      : {
          sectionLabel: "Feature Flags",
          title: "Runtime Toggles",
          description:
            "Toggle AQI without a deploy. When disabled, the backend skips OpenWeather air_pollution and clients hide the AQI card.",
          enabled: "Enabled",
          disabled: "Disabled",
          toggleAqi: "Toggle AQI",
        };

  return (
    <section className="admin-card feature-flag-card">
      <div className="admin-card-header">
        <div>
          <p className="section-label">{copy.sectionLabel}</p>
          <h2>{copy.title}</h2>
        </div>
      </div>
      <p className="admin-card-copy">{copy.description}</p>
      <div className="feature-flag-row">
        <div>
          <strong>aqiEnabled</strong>
          <p className="feature-flag-state">
            {aqiEnabled ? copy.enabled : copy.disabled}
          </p>
        </div>
        <button
          type="button"
          className={`feature-toggle ${aqiEnabled ? "enabled" : ""}`}
          onClick={onToggleAqi}
          disabled={loading || saving}
          aria-pressed={aqiEnabled}
          aria-label={copy.toggleAqi}
        >
          <span className="feature-toggle-knob" />
        </button>
      </div>
      {message && <p className="feature-flag-message">{message}</p>}
    </section>
  );
};

export default AdminFeatureFlagsCard;
