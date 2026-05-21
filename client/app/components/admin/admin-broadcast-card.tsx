"use client";

import React, { FormEvent, useState } from "react";
import { IoMegaphoneOutline, IoSend } from "react-icons/io5";
import { useLanguage } from "@/app/context/language-provider";

const BACKEND_URI =
  process.env.NEXT_PUBLIC_BACKEND_URI ?? "http://localhost:4000/api";
const TITLE_MAX_LENGTH = 120;
const BODY_MAX_LENGTH = 500;
const URL_MAX_LENGTH = 300;

interface BroadcastResult {
  total: number;
  success: number;
  failure: number;
  invalidRemoved: number;
}

function isRelativeAppPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("://");
}

function normalizeAppUrl(value: string) {
  if (!value) return "";
  if (isRelativeAppPath(value)) return value;

  const candidate =
    value.startsWith("/") && value.slice(1).includes("://") ? value.slice(1) : value;

  try {
    const parsedUrl = new URL(candidate);
    if (typeof window !== "undefined" && parsedUrl.origin === window.location.origin) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || "/";
    }
  } catch {
    return value;
  }

  return value;
}

const AdminBroadcastCard = () => {
  const { language } = useLanguage();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const copy =
    language === "vi"
      ? {
          sectionLabel: "Thông báo hàng loạt",
          title: "Vận hành thông báo đẩy",
          titleLabel: "Tiêu đề",
          titlePlaceholder: "Cảnh báo thời tiết",
          messageLabel: "Nội dung",
          messagePlaceholder: "Nhập nội dung thông báo đẩy...",
          urlLabel: "URL mở",
          urlHelp: "Chỉ dùng đường dẫn trong app, ví dụ / hoặc /admin.",
          previewLabel: "Xem trước",
          previewTitle: "Tiêu đề thông báo",
          previewBody: "Nội dung thông báo xem trước",
          clickOpens: "Bấm để mở:",
          confirm:
            "Tôi xác nhận gửi thông báo này đến tất cả thiết bị đã đăng ký.",
          sendError: "Không thể gửi broadcast.",
          total: "Tổng",
          success: "Thành công",
          failure: "Thất bại",
          invalidRemoved: "Đã xóa invalid",
          sending: "Đang gửi...",
          send: "Gửi thông báo",
        }
      : {
          sectionLabel: "Broadcast Notifications",
          title: "Push Operations",
          titleLabel: "Title",
          titlePlaceholder: "Weather alert",
          messageLabel: "Message",
          messagePlaceholder: "Enter the push notification message...",
          urlLabel: "Open URL",
          urlHelp: "Relative app path only, for example / or /admin.",
          previewLabel: "Preview",
          previewTitle: "Notification title",
          previewBody: "Notification body preview",
          clickOpens: "Click opens:",
          confirm:
            "I confirm sending this notification to all registered devices.",
          sendError: "Unable to send broadcast.",
          total: "Total",
          success: "Success",
          failure: "Failure",
          invalidRemoved: "Invalid removed",
          sending: "Sending...",
          send: "Send broadcast",
        };

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const trimmedUrl = url.trim();
  const normalizedUrl = normalizeAppUrl(trimmedUrl);
  const isUrlValid =
    trimmedUrl.length === 0 || isRelativeAppPath(normalizedUrl);
  const urlInvalidMessage =
    language === "vi"
      ? "URL mở phải là đường dẫn trong app, ví dụ / hoặc /admin."
      : "Open URL must be a relative app path, for example / or /admin.";
  const disabledReason =
    language === "vi"
      ? "Nhập tiêu đề, nội dung, URL hợp lệ, và xác nhận trước khi gửi."
      : "Enter a title, message, valid URL, and confirm before sending.";
  const canSend =
    trimmedTitle.length > 0 &&
    trimmedBody.length > 0 &&
    trimmedTitle.length <= TITLE_MAX_LENGTH &&
    trimmedBody.length <= BODY_MAX_LENGTH &&
    trimmedUrl.length <= URL_MAX_LENGTH &&
    isUrlValid &&
    confirmed &&
    !sending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!canSend) return;

    setSending(true);

    try {
      const response = await fetch(`${BACKEND_URI}/admin/broadcast`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          body: trimmedBody,
          url: normalizedUrl || "/",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || copy.sendError);
      }

      setResult(data as BroadcastResult);
      setConfirmed(false);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : copy.sendError
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="admin-card broadcast-card">
      <div className="admin-card-header">
        <div>
          <p className="section-label">{copy.sectionLabel}</p>
          <h2>{copy.title}</h2>
        </div>
        <div className="placeholder-icon">
          <IoMegaphoneOutline />
        </div>
      </div>

      <form className="broadcast-form" onSubmit={handleSubmit}>
        <label>
          <span>{copy.titleLabel}</span>
          <input
            type="text"
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={copy.titlePlaceholder}
            disabled={sending}
          />
          <small>
            {trimmedTitle.length}/{TITLE_MAX_LENGTH}
          </small>
        </label>

        <label>
          <span>{copy.messageLabel}</span>
          <textarea
            value={body}
            maxLength={BODY_MAX_LENGTH}
            onChange={(event) => setBody(event.target.value)}
            placeholder={copy.messagePlaceholder}
            disabled={sending}
            rows={4}
          />
          <small>
            {trimmedBody.length}/{BODY_MAX_LENGTH}
          </small>
        </label>

        <label>
          <span>{copy.urlLabel}</span>
          <input
            type="text"
            value={url}
            maxLength={URL_MAX_LENGTH}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="/"
            aria-invalid={!isUrlValid}
            disabled={sending}
          />
          <small>{copy.urlHelp}</small>
          {!isUrlValid && (
            <small className="broadcast-field-error">{urlInvalidMessage}</small>
          )}
        </label>

        <div className="broadcast-preview">
          <p className="section-label">{copy.previewLabel}</p>
          <strong>{trimmedTitle || copy.previewTitle}</strong>
          <p>{trimmedBody || copy.previewBody}</p>
          <small>
            {copy.clickOpens} {normalizedUrl || "/"}
          </small>
        </div>

        <label className="broadcast-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            disabled={sending}
          />
          <span className="broadcast-confirm-box" aria-hidden="true" />
          <span>{copy.confirm}</span>
        </label>

        {error && <p className="broadcast-error">{error}</p>}
        {!canSend && !sending && (
          <p className="broadcast-disabled-reason">{disabledReason}</p>
        )}

        {result && (
          <div className="broadcast-result">
            <span>
              {copy.total}: {result.total}
            </span>
            <span>
              {copy.success}: {result.success}
            </span>
            <span>
              {copy.failure}: {result.failure}
            </span>
            <span>
              {copy.invalidRemoved}: {result.invalidRemoved}
            </span>
          </div>
        )}

        <button type="submit" className="broadcast-send-button" disabled={!canSend}>
          <IoSend />
          {sending ? copy.sending : copy.send}
        </button>
      </form>
    </section>
  );
};

export default AdminBroadcastCard;
