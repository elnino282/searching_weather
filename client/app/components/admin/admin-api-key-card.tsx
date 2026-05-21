"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { IoKeyOutline, IoRefresh, IoSave } from "react-icons/io5";
import { useLanguage } from "@/app/context/language-provider";

const BACKEND_URI =
  process.env.NEXT_PUBLIC_BACKEND_URI ?? "http://localhost:4000/api";

interface OpenWeatherKeyInfo {
  maskedKey: string | null;
  source: "env" | "firestore" | "none" | string;
}

const AdminApiKeyCard = () => {
  const { language } = useLanguage();
  const [keyInfo, setKeyInfo] = useState<OpenWeatherKeyInfo | null>(null);
  const [newKey, setNewKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canSubmit = newKey.trim().length > 0 && confirmed && !saving;

  const copy =
    language === "vi"
      ? {
          sectionLabel: "Quản lý khóa API",
          title: "Cấu hình thay đổi nhanh",
          currentKey: "OpenWeather key hiện tại",
          notConfigured: "Chưa cấu hình",
          source: "Nguồn",
          loadingSource: "đang tải",
          unknownSource: "không rõ",
          newKeyLabel: "OpenWeather API key mới",
          newKeyPlaceholder: "Nhập key mới",
          validationHelp: "Key sẽ được validate trước khi lưu.",
          confirm:
            "Tôi xác nhận cập nhật OpenWeather API key đang được server sử dụng.",
          loadError: "Không thể tải thông tin API key.",
          updateError: "Không thể cập nhật API key.",
          updateSuccess: "API key đã được validate và lưu thành công.",
          refreshLoading: "Đang tải",
          refresh: "Refresh",
          saveLoading: "Đang validate...",
          updateKey: "Cập nhật key",
        }
      : {
          sectionLabel: "API Key Management",
          title: "Hot-Swap Config",
          currentKey: "Current OpenWeather key",
          notConfigured: "Not configured",
          source: "Source",
          loadingSource: "loading",
          unknownSource: "unknown",
          newKeyLabel: "New OpenWeather API key",
          newKeyPlaceholder: "Enter new key",
          validationHelp: "Key will be validated before saving.",
          confirm:
            "I confirm updating the OpenWeather API key currently used by the server.",
          loadError: "Unable to load key info.",
          updateError: "Unable to update OpenWeather key.",
          updateSuccess: "API key has been validated and saved.",
          refreshLoading: "Loading",
          refresh: "Refresh",
          saveLoading: "Validating...",
          updateKey: "Update key",
        };

  const loadKeyInfo = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URI}/admin/openweather-key`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || copy.loadError);
      }

      setKeyInfo(data as OpenWeatherKeyInfo);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.loadError
      );
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    loadKeyInfo();
  }, [loadKeyInfo]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${BACKEND_URI}/admin/openweather-key`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || copy.updateError);
      }

      setKeyInfo(data as OpenWeatherKeyInfo);
      setNewKey("");
      setConfirmed(false);
      setMessage(copy.updateSuccess);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : copy.updateError
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-card api-key-card">
      <div className="admin-card-header">
        <div>
          <p className="section-label">{copy.sectionLabel}</p>
          <h2>{copy.title}</h2>
        </div>
        <div className="placeholder-icon">
          <IoKeyOutline />
        </div>
      </div>

      <div className="api-key-current">
        <span>{copy.currentKey}</span>
        <strong>{keyInfo?.maskedKey || copy.notConfigured}</strong>
        <small>
          {copy.source}:{" "}
          {keyInfo?.source || (loading ? copy.loadingSource : copy.unknownSource)}
        </small>
      </div>

      <form className="api-key-form" onSubmit={handleSubmit}>
        <label>
          <span>{copy.newKeyLabel}</span>
          <input
            type="password"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            placeholder={copy.newKeyPlaceholder}
            autoComplete="off"
            disabled={saving}
          />
          <small>{copy.validationHelp}</small>
        </label>

        <label className="broadcast-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            disabled={saving}
          />
          <span className="broadcast-confirm-box" aria-hidden="true" />
          <span>{copy.confirm}</span>
        </label>

        {error && <p className="broadcast-error">{error}</p>}
        {message && <p className="api-key-success">{message}</p>}

        <div className="api-key-actions">
          <button
            type="button"
            className="session-action"
            onClick={loadKeyInfo}
            disabled={loading || saving}
          >
            <IoRefresh />
            {loading ? copy.refreshLoading : copy.refresh}
          </button>
          <button
            type="submit"
            className="broadcast-send-button"
            disabled={!canSubmit}
          >
            <IoSave />
            {saving ? copy.saveLoading : copy.updateKey}
          </button>
        </div>
      </form>
    </section>
  );
};

export default AdminApiKeyCard;
