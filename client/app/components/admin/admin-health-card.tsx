"use client";

import React from "react";
import { IoRefresh } from "react-icons/io5";
import { useLanguage } from "@/app/context/language-provider";
import { AdminHealth } from "./admin-types";

const AdminHealthCard = ({
  health,
  loading,
  error,
  onRefresh,
}: {
  health: AdminHealth | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) => {
  const { language } = useLanguage();
  const copy =
    language === "vi"
      ? {
          sectionLabel: "Sức khỏe hệ thống",
          title: "Hạ tầng",
          refreshLoading: "Đang tải",
          refresh: "Refresh",
          unknown: "UNKNOWN",
          notAvailable: "Không có dữ liệu",
          loadingState: "Đang tải trạng thái hệ thống...",
          passiveStatus: "Trạng thái thụ động",
          uptime: "Thời gian hoạt động",
          serverProcess: "Tiến trình server",
          databaseError: "Lỗi database",
          hour: "giờ",
          minute: "phút",
          second: "giây",
        }
      : {
          sectionLabel: "System Health",
          title: "Infrastructure",
          refreshLoading: "Loading",
          refresh: "Refresh",
          unknown: "UNKNOWN",
          notAvailable: "N/A",
          loadingState: "Loading system status...",
          passiveStatus: "Passive status",
          uptime: "Uptime",
          serverProcess: "Server process",
          databaseError: "Database Error",
          hour: "h",
          minute: "m",
          second: "s",
        };

  const formatMilliseconds = (value: number | null | undefined) =>
    typeof value === "number" ? `${value} ms` : copy.notAvailable;

  const formatUptimeLabel = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) return `${hours}${copy.hour} ${minutes}${copy.minute}`;
    if (minutes > 0) {
      return `${minutes}${copy.minute} ${remainingSeconds}${copy.second}`;
    }
    return `${remainingSeconds}${copy.second}`;
  };

  return (
    <section className="admin-card system-health-card">
      <div className="admin-card-header">
        <div>
          <p className="section-label">{copy.sectionLabel}</p>
          <h2>{copy.title}</h2>
        </div>
        <div className="admin-card-actions">
          <span className={`system-status-badge ${health?.status?.toLowerCase() || "unknown"}`}>
            {health?.status || copy.unknown}
          </span>
          <button
            type="button"
            className="session-action"
            onClick={onRefresh}
            disabled={loading}
          >
            <IoRefresh />
            {loading ? copy.refreshLoading : copy.refresh}
          </button>
        </div>
      </div>

      {error && <p className="health-error">{error}</p>}

      {!health && !error ? (
        <div className="admin-skeleton">{copy.loadingState}</div>
      ) : (
        <div className="health-grid compact">
          <div className="health-metric">
            <span>Firestore DB</span>
            <strong className={health?.database.status === "UP" ? "up" : "down"}>
              {health?.database.status || copy.unknown}
            </strong>
            <small>{formatMilliseconds(health?.database.latencyMs)}</small>
          </div>
          <div className="health-metric">
            <span>Firebase Admin</span>
            <strong className={health?.firebase.status === "UP" ? "up" : "down"}>
              {health?.firebase.status || copy.unknown}
            </strong>
            <small>{copy.passiveStatus}</small>
          </div>
          <div className="health-metric">
            <span>{copy.uptime}</span>
            <strong>
              {health ? formatUptimeLabel(health.uptimeSeconds) : copy.notAvailable}
            </strong>
            <small>{copy.serverProcess}</small>
          </div>
          {health?.database.error && (
            <div className="health-metric health-last-error">
              <span>{copy.databaseError}</span>
              <strong>{health.database.error}</strong>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminHealthCard;
