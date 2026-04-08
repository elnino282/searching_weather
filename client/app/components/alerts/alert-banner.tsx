"use client";
import React, { useState } from "react";
import { IoClose, IoWarning } from "react-icons/io5";
import { TriggeredAlert } from "@/app/types/types";

const metricLabels: Record<string, string> = {
  temp: "Temperature",
  wind: "Wind speed",
  precipitation: "Precipitation chance",
};

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

  const visible = triggeredAlerts.filter((t) => !dismissed.has(t.alert.id));

  if (visible.length === 0) return null;

  return (
    <div className="alert-banner-container">
      {visible.map((t) => (
        <div key={t.alert.id} className="alert-banner">
          <IoWarning className="alert-icon" />
          <p className="alert-message">
            {metricLabels[t.alert.metric]} is {t.alert.comparator}{" "}
            {t.alert.threshold}
            {metricUnits[t.alert.metric]?.[t.alert.units] ?? ""} in{" "}
            {t.locationName} (currently {t.currentValue}
            {metricUnits[t.alert.metric]?.[currentUnits] ?? ""})
          </p>
          <button
            type="button"
            className="alert-dismiss"
            onClick={() =>
              setDismissed((prev) => new Set(prev).add(t.alert.id))
            }
            aria-label="Dismiss alert"
          >
            <IoClose />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertBanner;
