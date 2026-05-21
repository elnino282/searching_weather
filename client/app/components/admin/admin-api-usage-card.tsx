"use client";

import React from "react";
import { useLanguage } from "@/app/context/language-provider";
import { AdminHealth } from "./admin-types";

const AdminApiUsageCard = ({
  health,
  loading,
  onRetry,
}: {
  health: AdminHealth | null;
  loading: boolean;
  onRetry: () => void;
}) => {
  const { language } = useLanguage();
  const quotaPercent = health?.openWeather.quotaPercent;
  const copy =
    language === "vi"
      ? {
          sectionLabel: "OpenWeather API",
          title: "Giới hạn và độ trễ",
          loadingMetrics: "Đang tải metric API...",
          noMetrics: "Chưa có dữ liệu metric.",
          retry: "Thử lại",
          quotaAria: "Mức sử dụng quota OpenWeather",
          usageToday: "Lượt dùng hôm nay",
          limit: "Giới hạn",
          notSet: "chưa đặt",
          quotaPercent: "Phần trăm đã sử dụng",
          notAvailable: "Không có dữ liệu",
          dailyGuard: "Giới hạn ngày",
          latency: "Độ trễ trung bình / p95",
          passiveSamples: "Mẫu thụ động",
          successFailure: "Thành công / Thất bại",
          calls: "Lượt gọi OpenWeather",
          lastError: "Lỗi gần nhất",
          none: "Không có",
        }
      : {
          sectionLabel: "OpenWeather API",
          title: "Quota & Latency",
          loadingMetrics: "Loading API metrics...",
          noMetrics: "No metric data yet.",
          retry: "Retry",
          quotaAria: "OpenWeather quota usage",
          usageToday: "Usage today",
          limit: "Limit",
          notSet: "not set",
          quotaPercent: "Quota percent",
          notAvailable: "N/A",
          dailyGuard: "Daily guard",
          latency: "Latency avg / p95",
          passiveSamples: "Passive samples",
          successFailure: "Success / Failure",
          calls: "OpenWeather calls",
          lastError: "Last Error",
          none: "None",
        };

  const formatMilliseconds = (value: number | null | undefined) =>
    typeof value === "number" ? `${value} ms` : copy.notAvailable;

  return (
    <section className="admin-card api-usage-card">
      <div className="admin-card-header">
        <div>
          <p className="section-label">{copy.sectionLabel}</p>
          <h2>{copy.title}</h2>
        </div>
      </div>

      {!health ? (
        <div className="admin-empty-state">
          <p>{loading ? copy.loadingMetrics : copy.noMetrics}</p>
          {!loading && (
            <button type="button" className="session-action" onClick={onRetry}>
              {copy.retry}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="quota-bar" aria-label={copy.quotaAria}>
            <span
              style={{
                width: `${typeof quotaPercent === "number" ? quotaPercent : 0}%`,
              }}
            />
          </div>
          <div className="health-grid compact">
            <div className="health-metric">
              <span>{copy.usageToday}</span>
              <strong>{health.openWeather.usageToday}</strong>
              <small>
                {copy.limit}: {health.openWeather.quotaLimit ?? copy.notSet}
              </small>
            </div>
            <div className="health-metric">
              <span>{copy.quotaPercent}</span>
              <strong>
                {typeof quotaPercent === "number"
                  ? `${quotaPercent}%`
                  : copy.notAvailable}
              </strong>
              <small>{copy.dailyGuard}</small>
            </div>
            <div className="health-metric">
              <span>{copy.latency}</span>
              <strong>
                {formatMilliseconds(health.openWeather.latencyAvgMs)} /{" "}
                {formatMilliseconds(health.openWeather.latencyP95Ms)}
              </strong>
              <small>{copy.passiveSamples}</small>
            </div>
            <div className="health-metric">
              <span>{copy.successFailure}</span>
              <strong>
                {health.openWeather.successCount} / {health.openWeather.failureCount}
              </strong>
              <small>{copy.calls}</small>
            </div>
            <div className="health-metric health-last-error">
              <span>{copy.lastError}</span>
              <strong>{health.openWeather.lastError || copy.none}</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default AdminApiUsageCard;
