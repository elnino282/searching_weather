"use client";
import React, { useContext, useState } from "react";
import { IoAdd, IoTrash } from "react-icons/io5";
import { MdNotificationsActive, MdNotificationsOff } from "react-icons/md";
import { useAlertPreferences } from "@/app/hooks/useAlertPreferences";
import { useNotifications } from "@/app/hooks/useNotifications";
import { UnitContext } from "@/app/context/unit-provider";
import { AlertComparator, AlertMetric } from "@/app/types/types";
import { useLanguage } from "@/app/context/language-provider";

const AlertSettingsCard = ({ locationName }: { locationName: string }) => {
  const {
    permissionStatus,
    fcmToken,
    pushEnabled,
    isTogglingPush,
    requestNotificationPermission,
    disablePushNotifications,
  } = useNotifications();
  const { alerts, addAlert, removeAlert, toggleAlert } = useAlertPreferences(fcmToken);
  const { units } = useContext(UnitContext);
  const { language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [metric, setMetric] = useState<AlertMetric>("temp");
  const [comparator, setComparator] = useState<AlertComparator>("above");
  const [threshold, setThreshold] = useState<string>("");
  const [enablingPush, setEnablingPush] = useState(false);

  const copy =
    language === "vi"
      ? {
          sectionLabel: "Cài đặt",
          sectionTitle: "Cảnh báo thời tiết",
          pushEnabled: "Đã bật thông báo đẩy",
          pushDisabled: "Thông báo đẩy đang tắt",
          disableLoading: "Đang tắt...",
          disablePush: "Tắt thông báo đẩy",
          enableLoading: "Đang bật...",
          enablePush: "Bật thông báo đẩy",
          blocked: "Thông báo đã bị chặn. Hãy bật lại trong cài đặt trình duyệt.",
          unsupported: "Trình duyệt này không hỗ trợ thông báo đẩy",
          allLocations: "Mọi địa điểm",
          turnOffAlert: "Tắt cảnh báo",
          turnOnAlert: "Bật cảnh báo",
          deleteAlert: "Xóa cảnh báo",
          greaterThan: "Lớn hơn",
          lessThan: "Nhỏ hơn",
          threshold: "Ngưỡng",
          save: "Lưu",
          cancel: "Hủy",
          addAlert: "Thêm cảnh báo",
          temperature: "Nhiệt độ",
          windSpeed: "Tốc độ gió",
          rainChance: "Khả năng mưa",
          windLabel: "Gió",
          aboveLabel: "cao hơn",
          belowLabel: "thấp hơn",
        }
      : {
          sectionLabel: "Settings",
          sectionTitle: "Weather alerts",
          pushEnabled: "Push notifications are enabled",
          pushDisabled: "Push notifications are disabled",
          disableLoading: "Disabling...",
          disablePush: "Disable push notifications",
          enableLoading: "Enabling...",
          enablePush: "Enable push notifications",
          blocked: "Notifications are blocked. Please enable them in browser settings.",
          unsupported: "This browser does not support push notifications",
          allLocations: "All locations",
          turnOffAlert: "Disable alert",
          turnOnAlert: "Enable alert",
          deleteAlert: "Delete alert",
          greaterThan: "Greater than",
          lessThan: "Less than",
          threshold: "Threshold",
          save: "Save",
          cancel: "Cancel",
          addAlert: "Add alert",
          temperature: "Temperature",
          windSpeed: "Wind speed",
          rainChance: "Rain chance",
          windLabel: "Wind",
          aboveLabel: "above",
          belowLabel: "below",
        };

  const notificationsActive =
    permissionStatus === "granted" && pushEnabled && Boolean(fcmToken);

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

  const handleEnablePush = async () => {
    setEnablingPush(true);
    await requestNotificationPermission();
    setEnablingPush(false);
  };

  const handleDisablePush = async () => {
    await disablePushNotifications();
  };

  const metricLabel = (m: AlertMetric) => {
    switch (m) {
      case "temp":
        return `${copy.temperature} (${units === "metric" ? "\u00B0C" : "\u00B0F"})`;
      case "wind":
        return `${copy.windLabel} (${units === "metric" ? "km/h" : "mph"})`;
      case "precipitation":
        return `${copy.rainChance} (%)`;
      default:
        return m;
    }
  };

  const comparatorLabel = (value: AlertComparator) =>
    value === "above" ? copy.aboveLabel : copy.belowLabel;

  return (
    <section className="alert-settings-card">
      <div className="section-header">
        <div>
          <p className="section-label">{copy.sectionLabel}</p>
          <h3>
            <MdNotificationsActive /> {copy.sectionTitle}
          </h3>
        </div>
      </div>

      <div className="alert-push-status">
        {permissionStatus === "granted" ? (
          <>
            {notificationsActive ? (
              <div className="alert-push-badge alert-push-enabled">
                <MdNotificationsActive />
                <span>{copy.pushEnabled}</span>
              </div>
            ) : (
              <div className="alert-push-badge alert-push-denied">
                <MdNotificationsOff />
                <span>{copy.pushDisabled}</span>
              </div>
            )}

            {notificationsActive ? (
              <button
                type="button"
                className="alert-disable-push-btn"
                onClick={handleDisablePush}
                disabled={isTogglingPush}
              >
                <MdNotificationsOff />
                {isTogglingPush ? copy.disableLoading : copy.disablePush}
              </button>
            ) : (
              <button
                type="button"
                className="alert-enable-push-btn"
                onClick={handleEnablePush}
                disabled={enablingPush}
              >
                <MdNotificationsActive />
                {enablingPush ? copy.enableLoading : copy.enablePush}
              </button>
            )}
          </>
        ) : permissionStatus === "denied" ? (
          <div className="alert-push-badge alert-push-denied">
            <MdNotificationsOff />
            <span>{copy.blocked}</span>
          </div>
        ) : permissionStatus === "unsupported" ? (
          <div className="alert-push-badge alert-push-denied">
            <MdNotificationsOff />
            <span>{copy.unsupported}</span>
          </div>
        ) : (
          <button
            type="button"
            className="alert-enable-push-btn"
            onClick={handleEnablePush}
            disabled={enablingPush}
          >
            <MdNotificationsActive />
            {enablingPush ? copy.enableLoading : copy.enablePush}
          </button>
        )}
      </div>

      {alerts.length > 0 && (
        <ul className="alert-list">
          {alerts.map((alert) => (
            <li key={alert.id} className="alert-item">
              <div className="alert-item-info">
                <p>
                  {metricLabel(alert.metric)} {comparatorLabel(alert.comparator)}{" "}
                  {alert.threshold}
                </p>
                <span className="alert-item-location">
                  {alert.location === "*" ? copy.allLocations : alert.location}
                </span>
              </div>
              <div className="alert-item-actions">
                <button
                  type="button"
                  className={`alert-toggle ${alert.enabled ? "enabled" : ""}`}
                  onClick={() => toggleAlert(alert.id)}
                  aria-label={alert.enabled ? copy.turnOffAlert : copy.turnOnAlert}
                >
                  <span className="alert-toggle-knob" />
                </button>
                <button
                  type="button"
                  className="alert-delete"
                  onClick={() => removeAlert(alert.id)}
                  aria-label={copy.deleteAlert}
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
              <option value="temp">{copy.temperature}</option>
              <option value="wind">{copy.windSpeed}</option>
              <option value="precipitation">{copy.rainChance}</option>
            </select>
            <select
              value={comparator}
              onChange={(e) => setComparator(e.target.value as AlertComparator)}
              className="alert-select"
            >
              <option value="above">{copy.greaterThan}</option>
              <option value="below">{copy.lessThan}</option>
            </select>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={copy.threshold}
              className="alert-input"
            />
          </div>
          <div className="alert-form-actions">
            <button type="button" className="alert-save" onClick={handleSave}>
              {copy.save}
            </button>
            <button
              type="button"
              className="alert-cancel"
              onClick={() => setShowForm(false)}
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="alert-add-button"
          onClick={() => setShowForm(true)}
        >
          <IoAdd /> {copy.addAlert}
        </button>
      )}
    </section>
  );
};

export default AlertSettingsCard;
