"use client";

import React, { FormEvent, useState } from "react";
import { IoCloudyNight, IoLockClosed, IoLogIn, IoPerson } from "react-icons/io5";
import { useAuth } from "@/app/context/auth-provider";
import { useLanguage } from "@/app/context/language-provider";
import LanguageToggle from "../language-toggle";

const LoginPage = ({
  adminOnly = false,
  title,
  description,
}: {
  adminOnly?: boolean;
  title?: string;
  description?: string;
}) => {
  const { loginGuest, loginAdmin } = useAuth();
  const { language } = useLanguage();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<"guest" | "admin" | "">("");
  const [loadingMode, setLoadingMode] = useState<"guest" | "admin" | null>(null);

  const copy =
    language === "vi"
      ? {
          defaultTitle: "Đăng nhập hệ thống",
          defaultDescription:
            "Tiếp tục với tư cách khách để xem thời tiết, hoặc đăng nhập Admin để vào khu vực quản trị.",
          guestError: "Không thể đăng nhập khách. Vui lòng thử lại.",
          adminError:
            "Mật khẩu Admin không hợp lệ hoặc hệ thống chưa cấu hình.",
          guestLoading: "Đang vào...",
          guestButton: "Tiếp tục với tư cách khách",
          adminTitle: "Đăng nhập Admin",
          passwordLabel: "Mật khẩu Admin",
          passwordPlaceholder: "Nhập mật khẩu",
          adminLoading: "Đang kiểm tra...",
          adminButton: "Đăng nhập Admin",
        }
      : {
          defaultTitle: "Sign in",
          defaultDescription:
            "Continue as a guest to view weather, or sign in as Admin to access the management area.",
          guestError: "Unable to sign in as guest. Please try again.",
          adminError:
            "The Admin password is invalid or the system is not configured.",
          guestLoading: "Entering...",
          guestButton: "Continue as guest",
          adminTitle: "Admin sign-in",
          passwordLabel: "Admin password",
          passwordPlaceholder: "Enter password",
          adminLoading: "Checking...",
          adminButton: "Sign in as Admin",
        };

  const displayTitle = title ?? copy.defaultTitle;
  const displayDescription = description ?? copy.defaultDescription;
  const errorMessage =
    error === "guest"
      ? copy.guestError
      : error === "admin"
        ? copy.adminError
        : "";

  const handleGuestLogin = async () => {
    setError("");
    setLoadingMode("guest");

    try {
      await loginGuest();
    } catch {
      setError("guest");
    } finally {
      setLoadingMode(null);
    }
  };

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoadingMode("admin");

    try {
      await loginAdmin(password);
      setPassword("");
    } catch {
      setError("admin");
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="auth-brand-icon">
            <IoCloudyNight />
          </span>
          <div>
            <p className="section-label">WeCliForApp</p>
            <h1 id="auth-title">{displayTitle}</h1>
          </div>
          <LanguageToggle />
        </div>

        <div className="auth-intro">
          <p>{displayDescription}</p>
        </div>

        {!adminOnly && (
          <button
            type="button"
            className="auth-guest-button"
            onClick={handleGuestLogin}
            disabled={loadingMode !== null}
          >
            <IoPerson />
            {loadingMode === "guest"
              ? copy.guestLoading
              : copy.guestButton}
          </button>
        )}

        <form
          className={`auth-admin-form ${adminOnly ? "admin-only" : ""}`}
          onSubmit={handleAdminLogin}
        >
          <div className="auth-form-header">
            <IoLockClosed />
            <h2>{copy.adminTitle}</h2>
          </div>
          <label className="auth-password-label" htmlFor="admin-password">
            {copy.passwordLabel}
          </label>
          <div className="auth-password-field">
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={copy.passwordPlaceholder}
              autoComplete="current-password"
              disabled={loadingMode !== null}
            />
          </div>
          {errorMessage && <p className="auth-error">{errorMessage}</p>}
          <button
            type="submit"
            className="auth-admin-button"
            disabled={loadingMode !== null || password.trim().length === 0}
          >
            <IoLogIn />
            {loadingMode === "admin" ? copy.adminLoading : copy.adminButton}
          </button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
