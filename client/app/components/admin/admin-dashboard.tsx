"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IoArrowBack, IoLogOutOutline, IoShieldCheckmark } from "react-icons/io5";
import { useAuth } from "@/app/context/auth-provider";
import { useFeatureFlags } from "@/app/context/feature-flags-provider";
import LanguageContextProvider, {
  useLanguage,
} from "@/app/context/language-provider";
import LanguageToggle from "../language-toggle";
import LoginPage from "../auth/login-page";
import AdminApiKeyCard from "./admin-api-key-card";
import AdminApiUsageCard from "./admin-api-usage-card";
import AdminAuditCard from "./admin-audit-card";
import AdminBroadcastCard from "./admin-broadcast-card";
import AdminFeatureFlagsCard from "./admin-feature-flags-card";
import AdminHealthCard from "./admin-health-card";
import { AdminHealth } from "./admin-types";

const BACKEND_URI =
  process.env.NEXT_PUBLIC_BACKEND_URI ?? "http://localhost:4000/api";
const HEALTH_REFRESH_INTERVAL_MS = 60 * 1000;

const AdminDashboardContent = () => {
  const router = useRouter();
  const { role, loading, logout, refreshMe } = useAuth();
  const { features, loading: flagsLoading, refresh: refreshFlags } = useFeatureFlags();
  const { language } = useLanguage();
  const [adminCheck, setAdminCheck] = useState<"idle" | "ok" | "failed">("idle");
  const [savingFlag, setSavingFlag] = useState(false);
  const [flagMessage, setFlagMessage] = useState("");
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState("");

  const copy =
    language === "vi"
      ? {
          checkingAdmin: "Đang kiểm tra quyền Admin...",
          loginTitle: "Cần quyền truy cập Admin",
          loginDescription:
            "Đăng nhập bằng mật khẩu Admin để mở trung tâm điều khiển.",
          healthLoadError: "Không thể tải dữ liệu health.",
          updateAqiError: "Không thể cập nhật cấu hình AQI.",
          aqiUpdated: "Đã cập nhật cấu hình AQI.",
          title: "Trung tâm điều khiển Admin",
          subtitle:
            "Theo dõi sức khỏe hệ thống, cờ tính năng, quota API và vận hành",
          adminVerified: "Đã xác minh Admin",
          sessionIssue: "Phiên đăng nhập có vấn đề",
          checkingSession: "Đang kiểm tra phiên",
          backToApp: "Về ứng dụng",
          logout: "Đăng xuất",
        }
      : {
          checkingAdmin: "Checking Admin permissions...",
          loginTitle: "Admin access required",
          loginDescription:
            "Sign in with the Admin password to open Control Center.",
          healthLoadError: "Unable to load health data.",
          updateAqiError: "Unable to update AQI feature flag.",
          aqiUpdated: "AQI configuration updated.",
          title: "Admin Control Center",
          subtitle:
            "System health, feature flags, API quota and operations",
          adminVerified: "Admin verified",
          sessionIssue: "Session issue",
          checkingSession: "Checking session",
          backToApp: "Back to app",
          logout: "Logout",
        };

  useEffect(() => {
    if (loading || role !== "admin") return;

    let isMounted = true;

    const verifyAdminRoute = async () => {
      try {
        const response = await fetch(`${BACKEND_URI}/admin/me`, {
          credentials: "include",
        });

        if (!isMounted) return;
        setAdminCheck(response.ok ? "ok" : "failed");

        if (!response.ok) {
          await refreshMe();
        }
      } catch {
        if (isMounted) {
          setAdminCheck("failed");
        }
      }
    };

    verifyAdminRoute();

    return () => {
      isMounted = false;
    };
  }, [loading, refreshMe, role]);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError("");

    try {
      const response = await fetch(`${BACKEND_URI}/admin/health`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || copy.healthLoadError);
      }

      setHealth(data as AdminHealth);
    } catch (error) {
      setHealthError(
        error instanceof Error
          ? error.message
          : copy.healthLoadError
      );
    } finally {
      setHealthLoading(false);
    }
  }, [copy.healthLoadError]);

  useEffect(() => {
    if (loading || role !== "admin") return;

    fetchHealth();
    const interval = window.setInterval(fetchHealth, HEALTH_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [fetchHealth, loading, role]);

  if (loading) {
    return (
      <main className="admin-screen">
        <section className="admin-panel admin-loading-shell">
          <p>{copy.checkingAdmin}</p>
        </section>
      </main>
    );
  }

  if (role !== "admin") {
    return (
      <LoginPage
        adminOnly
        title={copy.loginTitle}
        description={copy.loginDescription}
      />
    );
  }

  const toggleAqi = async () => {
    setSavingFlag(true);
    setFlagMessage("");

    try {
      const response = await fetch(`${BACKEND_URI}/admin/config/features`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: {
            aqiEnabled: !features.aqiEnabled,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || copy.updateAqiError);
      }

      await refreshFlags();
      setFlagMessage(copy.aqiUpdated);
    } catch (error) {
      setFlagMessage(
        error instanceof Error
          ? error.message
          : copy.updateAqiError
      );
    } finally {
      setSavingFlag(false);
    }
  };

  return (
    <main className="admin-screen">
      <section className="admin-panel admin-dashboard-shell">
        <header className="admin-dashboard-header">
          <div>
            <p className="section-label">WeCliForApp</p>
            <h1>
              <IoShieldCheckmark /> {copy.title}
            </h1>
            <p className="admin-subtitle">{copy.subtitle}</p>
          </div>
          <div className="admin-actions">
            <span className={`admin-route-status ${adminCheck}`}>
              {adminCheck === "ok"
                ? copy.adminVerified
                : adminCheck === "failed"
                  ? copy.sessionIssue
                  : copy.checkingSession}
            </span>
            <LanguageToggle />
            <button
              type="button"
              className="session-action"
              onClick={() => {
                router.push("/");
              }}
            >
              <IoArrowBack /> {copy.backToApp}
            </button>
            <button
              type="button"
              className="session-action logout"
              onClick={() => {
                void logout();
              }}
            >
              <IoLogOutOutline /> {copy.logout}
            </button>
          </div>
        </header>

        <div className="admin-dashboard-grid">
          <AdminHealthCard
            health={health}
            loading={healthLoading}
            error={healthError}
            onRefresh={fetchHealth}
          />
          <AdminApiUsageCard
            health={health}
            loading={healthLoading}
            onRetry={fetchHealth}
          />
          <AdminFeatureFlagsCard
            aqiEnabled={features.aqiEnabled}
            loading={flagsLoading}
            saving={savingFlag}
            message={flagMessage}
            onToggleAqi={toggleAqi}
          />
          <AdminBroadcastCard />
          <AdminApiKeyCard />
          <AdminAuditCard />
        </div>
      </section>
    </main>
  );
};

const AdminDashboard = () => (
  <LanguageContextProvider>
    <AdminDashboardContent />
  </LanguageContextProvider>
);

export default AdminDashboard;
