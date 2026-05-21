"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "./search-bar";
import Toggle from "./toggle";
import { useMediaQueries } from "../hooks/useMediaQueries";
import Navbar from "./navbar";
import { TiWeatherPartlySunny } from "react-icons/ti";
import { IoLogOutOutline, IoSettingsOutline, IoStar } from "react-icons/io5";
import { useFavorites } from "@/app/hooks/useFavorites";
import FavoritesPanel from "./favorites/favorites-panel";
import LanguageToggle from "./language-toggle";
import { useLanguage } from "@/app/context/language-provider";
import { useAuth } from "@/app/context/auth-provider";

const Header = () => {
  const router = useRouter();
  const device = useMediaQueries();
  const [showFavorites, setShowFavorites] = useState(false);
  const { favorites } = useFavorites();
  const { language } = useLanguage();
  const { role, logout } = useAuth();

  if (device < 4) {
    return <Navbar />;
  } else {
    return (
      <div className="header-container">
        <header className="dashboard-header">
          <div className="brand-container">
            <h1 className="logo">
              <span className="icon">
                <TiWeatherPartlySunny />
              </span>
              <span className="text">
                WeCliFor<span className="colored">App</span>
              </span>
            </h1>
            <p className="subtitle">
              {language === "vi"
                ? "Bảng điều khiển trợ lý thời tiết cá nhân"
                : "Personal weather assistant dashboard"}
            </p>
          </div>
          <div className="right-side">
            <div className="session-controls">
              <span className={`role-badge ${role ?? "guest"}`}>
                {role === "admin" ? "Admin" : "Guest"}
              </span>
              {role === "admin" && (
                <button
                  type="button"
                  className="session-action"
                  onClick={() => router.push("/admin")}
                >
                  <IoSettingsOutline />
                  Trung tâm điều khiển
                </button>
              )}
              <button
                type="button"
                className="session-action logout"
                onClick={() => {
                  void logout();
                }}
              >
                <IoLogOutOutline />
                {language === "vi" ? "Đăng xuất" : "Logout"}
              </button>
            </div>
            <div className="favorites-trigger-wrapper">
              <button
                type="button"
                className="favorites-trigger"
                onClick={() => setShowFavorites((prev) => !prev)}
                aria-label={
                  language === "vi"
                    ? "Mở danh sách yêu thích"
                    : "Open favorites list"
                }
              >
                <IoStar />
                {favorites.length > 0 && (
                  <span className="favorites-badge">{favorites.length}</span>
                )}
              </button>
              <FavoritesPanel
                isOpen={showFavorites}
                onClose={() => setShowFavorites(false)}
              />
            </div>
            <Toggle
              option1={{ name: "C", value: "metric" }}
              option2={{ name: "F", value: "imperial" }}
            />
            <LanguageToggle />
            <SearchBar />
          </div>
        </header>
      </div>
    );
  }
};

export default Header;
