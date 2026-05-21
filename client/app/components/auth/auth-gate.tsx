"use client";

import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useAuth } from "@/app/context/auth-provider";
import { useLanguage } from "@/app/context/language-provider";
import WeatherApp from "../weather-app";
import LoginPage from "./login-page";

const AuthGate = ({
  location,
  units,
}: {
  location: string;
  units: string;
}) => {
  const { role, loading } = useAuth();
  const { language } = useLanguage();
  const copy =
    language === "vi"
      ? {
          checkingSession: "Đang kiểm tra phiên đăng nhập...",
        }
      : {
          checkingSession: "Checking sign-in session...",
        };

  if (loading) {
    return (
      <main className="auth-screen">
        <section className="auth-panel auth-loading-panel" aria-live="polite">
          <AiOutlineLoading3Quarters className="auth-loading-icon" />
          <p>{copy.checkingSession}</p>
        </section>
      </main>
    );
  }

  if (!role) {
    return <LoginPage />;
  }

  return <WeatherApp units={units} location={location} />;
};

export default AuthGate;
