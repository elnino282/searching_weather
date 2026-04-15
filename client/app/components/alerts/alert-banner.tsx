"use client";
import React, { useState } from "react";
import { IoClose, IoWarning } from "react-icons/io5";
import { TriggeredAlert } from "@/app/types/types";
import { useLanguage } from "@/app/context/language-provider";

const metricUnits: Record<string, Record<string, string>> = {
  temp: { metric: "\u00B0C", imperial: "\u00B0F" },
  wind: { metric: "km/h", imperial: "mph" },
  precipitation: { metric: "%", imperial: "%" },
};

const AlertBanner = ({
  triggeredAlerts,
  currentUnits,
}: {
  triggeredAlerts: TriggeredAlert[];
  currentUnits: string;
}) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { language } = useLanguage();

  const metricLabels: Record<string, string> =
    language === "vi"
      ? {
          temp: "Nhiệt độ",
          wind: "Tốc độ gió",
          precipitation: "Khả năng mưa",
        }
      : {
          temp: "Temperature",
          wind: "Wind speed",
          precipitation: "Rain chance",
        };

  const comparatorLabels: Record<string, string> =
    language === "vi"
      ? { above: "cao hơn", below: "thấp hơn" }
      : { above: "above", below: "below" };

  const visible = triggeredAlerts.filter((t) => !dismissed.has(t.alert.id));

  if (visible.length === 0) return null;

  return (
    <div className="alert-banner-container">
      {visible.map((t) => (
        <div key={t.alert.id} className="alert-banner">
          <IoWarning className="alert-icon" />
          <p className="alert-message">
            {metricLabels[t.alert.metric]} {comparatorLabels[t.alert.comparator] ?? t.alert.comparator}{" "}
            {t.alert.threshold}
            {metricUnits[t.alert.metric]?.[t.alert.units] ?? ""}{" "}
            {language === "vi" ? "tại" : "at"} {t.locationName} (
            {language === "vi" ? "hiện tại" : "now"} {t.currentValue}
            {metricUnits[t.alert.metric]?.[currentUnits] ?? ""})
          </p>
          <button
            type="button"
            className="alert-dismiss"
            onClick={() =>
              setDismissed((prev) => new Set(prev).add(t.alert.id))
            }
            aria-label={language === "vi" ? "Đóng cảnh báo" : "Dismiss alert"}
          >
            <IoClose />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertBanner;
