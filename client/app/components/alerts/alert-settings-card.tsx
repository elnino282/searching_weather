"use client";
import React, { useContext, useState } from "react";
import { IoAdd, IoTrash } from "react-icons/io5";
import { MdNotificationsActive, MdNotificationsOff } from "react-icons/md";
import { useAlertPreferences } from "@/app/hooks/useAlertPreferences";
import { useNotifications } from "@/app/hooks/useNotifications";
import { UnitContext } from "@/app/context/unit-provider";
import { AlertComparator, AlertMetric } from "@/app/types/types";

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
  const [showForm, setShowForm] = useState(false);
  const [metric, setMetric] = useState<AlertMetric>("temp");
  const [comparator, setComparator] = useState<AlertComparator>("above");
  const [threshold, setThreshold] = useState<string>("");
  const [enablingPush, setEnablingPush] = useState(false);

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
        return `Nhiệt độ (${units === "metric" ? "\u00B0C" : "\u00B0F"})`;
      case "wind":
        return `Gió (${units === "metric" ? "km/h" : "mph"})`;
      case "precipitation":
        return "Khả năng mưa (%)";
      default:
        return m;
    }
  };

  const comparatorLabel = (value: AlertComparator) =>
    value === "above" ? "cao hơn" : "thấp hơn";

  return (
    <section className="alert-settings-card">
      <div className="section-header">
        <div>
          <p className="section-label">Cài đặt</p>
          <h3>
            <MdNotificationsActive /> Cảnh báo thời tiết
          </h3>
        </div>
      </div>

      <div className="alert-push-status">
        {permissionStatus === "granted" ? (
          <>
            {notificationsActive ? (
              <div className="alert-push-badge alert-push-enabled">
                <MdNotificationsActive />
                <span>Đã bật thông báo đẩy</span>
              </div>
            ) : (
              <div className="alert-push-badge alert-push-denied">
                <MdNotificationsOff />
                <span>Thông báo đẩy đang tắt</span>
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
                {isTogglingPush ? "Đang tắt..." : "Tắt thông báo đẩy"}
              </button>
            ) : (
              <button
                type="button"
                className="alert-enable-push-btn"
                onClick={handleEnablePush}
                disabled={enablingPush}
              >
                <MdNotificationsActive />
                {enablingPush ? "Đang bật..." : "Bật thông báo đẩy"}
              </button>
            )}
          </>
        ) : permissionStatus === "denied" ? (
          <div className="alert-push-badge alert-push-denied">
            <MdNotificationsOff />
            <span>Thông báo đã bị chặn. Hãy bật lại trong cài đặt trình duyệt.</span>
          </div>
        ) : permissionStatus === "unsupported" ? (
          <div className="alert-push-badge alert-push-denied">
            <MdNotificationsOff />
            <span>Trình duyệt này không hỗ trợ thông báo đẩy</span>
          </div>
        ) : (
          <button
            type="button"
            className="alert-enable-push-btn"
            onClick={handleEnablePush}
            disabled={enablingPush}
          >
            <MdNotificationsActive />
            {enablingPush ? "Đang bật..." : "Bật thông báo đẩy"}
          </button>
        )}
      </div>

      {alerts.length > 0 && (
        <ul className="alert-list">
          {alerts.map((alert) => (
            <li key={alert.id} className="alert-item">
              <div className="alert-item-info">
                <p>
                  {metricLabel(alert.metric)} {comparatorLabel(alert.comparator)} {alert.threshold}
                </p>
                <span className="alert-item-location">
                  {alert.location === "*" ? "Mọi địa điểm" : alert.location}
                </span>
              </div>
              <div className="alert-item-actions">
                <button
                  type="button"
                  className={`alert-toggle ${alert.enabled ? "enabled" : ""}`}
                  onClick={() => toggleAlert(alert.id)}
                  aria-label={alert.enabled ? "Tắt cảnh báo" : "Bật cảnh báo"}
                >
                  <span className="alert-toggle-knob" />
                </button>
                <button
                  type="button"
                  className="alert-delete"
                  onClick={() => removeAlert(alert.id)}
                  aria-label="Xóa cảnh báo"
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
              <option value="temp">Nhiệt độ</option>
              <option value="wind">Tốc độ gió</option>
              <option value="precipitation">Khả năng mưa</option>
            </select>
            <select
              value={comparator}
              onChange={(e) => setComparator(e.target.value as AlertComparator)}
              className="alert-select"
            >
              <option value="above">Lớn hơn</option>
              <option value="below">Nhỏ hơn</option>
            </select>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="Ngưỡng"
              className="alert-input"
            />
          </div>
          <div className="alert-form-actions">
            <button type="button" className="alert-save" onClick={handleSave}>
              Lưu
            </button>
            <button
              type="button"
              className="alert-cancel"
              onClick={() => setShowForm(false)}
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="alert-add-button"
          onClick={() => setShowForm(true)}
        >
          <IoAdd /> Thêm cảnh báo
        </button>
      )}
    </section>
  );
};

export default AlertSettingsCard;
