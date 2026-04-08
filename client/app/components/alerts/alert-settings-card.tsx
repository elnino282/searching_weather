"use client";
import React, { useContext, useState } from "react";
import { IoAdd, IoClose, IoTrash } from "react-icons/io5";
import { MdNotificationsActive } from "react-icons/md";
import { useAlertPreferences } from "@/app/hooks/useAlertPreferences";
import { UnitContext } from "@/app/context/unit-provider";
import { AlertComparator, AlertMetric } from "@/app/types/types";

const AlertSettingsCard = ({ locationName }: { locationName: string }) => {
  const { alerts, addAlert, removeAlert, toggleAlert } =
    useAlertPreferences();
  const { units } = useContext(UnitContext);
  const [showForm, setShowForm] = useState(false);
  const [metric, setMetric] = useState<AlertMetric>("temp");
  const [comparator, setComparator] = useState<AlertComparator>("above");
  const [threshold, setThreshold] = useState<string>("");

  const handleSave = () => {
    const value = parseFloat(threshold);
    if (isNaN(value)) return;
    addAlert({
      metric,
      comparator,
      threshold: value,
      units,
      enabled: true,
      location: locationName,
    });
    setThreshold("");
    setShowForm(false);
  };

  const metricLabel = (m: string) => {
    switch (m) {
      case "temp":
        return `Temperature (${units === "metric" ? "\u00B0C" : "\u00B0F"})`;
      case "wind":
        return `Wind (${units === "metric" ? "km/h" : "mph"})`;
      case "precipitation":
        return "Precipitation (%)";
      default:
        return m;
    }
  };

  return (
    <section className="alert-settings-card">
      <div className="section-header">
        <div>
          <p className="section-label">Settings</p>
          <h3>
            <MdNotificationsActive /> Weather Alerts
          </h3>
        </div>
      </div>

      {alerts.length > 0 && (
        <ul className="alert-list">
          {alerts.map((alert) => (
            <li key={alert.id} className="alert-item">
              <div className="alert-item-info">
                <p>
                  {metricLabel(alert.metric)} {alert.comparator}{" "}
                  {alert.threshold}
                </p>
                <span className="alert-item-location">
                  {alert.location === "*" ? "All locations" : alert.location}
                </span>
              </div>
              <div className="alert-item-actions">
                <button
                  type="button"
                  className={`alert-toggle ${alert.enabled ? "enabled" : ""}`}
                  onClick={() => toggleAlert(alert.id)}
                  aria-label={alert.enabled ? "Disable alert" : "Enable alert"}
                >
                  <span className="alert-toggle-knob" />
                </button>
                <button
                  type="button"
                  className="alert-delete"
                  onClick={() => removeAlert(alert.id)}
                  aria-label="Delete alert"
                >
                  <IoTrash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <div className="alert-form">
          <div className="alert-form-row">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as AlertMetric)}
              className="alert-select"
            >
              <option value="temp">Temperature</option>
              <option value="wind">Wind Speed</option>
              <option value="precipitation">Precipitation</option>
            </select>
            <select
              value={comparator}
              onChange={(e) =>
                setComparator(e.target.value as AlertComparator)
              }
              className="alert-select"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="Value"
              className="alert-input"
            />
          </div>
          <div className="alert-form-actions">
            <button type="button" className="alert-save" onClick={handleSave}>
              Save
            </button>
            <button
              type="button"
              className="alert-cancel"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="alert-add-button"
          onClick={() => setShowForm(true)}
        >
          <IoAdd /> Add Alert
        </button>
      )}
    </section>
  );
};

export default AlertSettingsCard;
