"use client";
import React, { useState } from "react";
import {
  IoClose,
  IoLogOutOutline,
  IoMenu,
  IoSettingsOutline,
  IoStar,
} from "react-icons/io5";
import { ImLocation } from "react-icons/im";
import SearchBar from "./search-bar";
import Toggle from "./toggle";
import { TiWeatherPartlySunny } from "react-icons/ti";
import { useFavorites } from "@/app/hooks/useFavorites";
import { useRouter, useSearchParams } from "next/navigation";
import { formatStringToPath } from "@/app/utils/utility-functions";
import LanguageToggle from "./language-toggle";
import { useLanguage } from "@/app/context/language-provider";
import { useAuth } from "@/app/context/auth-provider";

const Navbar = () => {
  const [showing, setShowing] = useState<boolean>(false);
  const { favorites, removeFavorite } = useFavorites();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { role, logout } = useAuth();

  const handleNavigate = (city: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", formatStringToPath(city));
    router.push(`/?${params.toString()}`);
    setShowing(false);
  };

  return (
    <>
      <div id="navbar">
        <h1 className="logo">
          <span className="icon">
            <TiWeatherPartlySunny />
          </span>
          <span className="text">
            WeCliFor<span className="colored">App</span>
          </span>
        </h1>
        <div className="right-side">
          <Toggle
            option1={{ name: "C", value: "metric" }}
            option2={{ name: "F", value: "imperial" }}
          />
          <LanguageToggle />
          <button
            type="button"
            className="nav-menu-button"
            aria-controls="mobile-side-nav"
            aria-expanded={showing}
            aria-label={
              language === "vi"
                ? "Mở bảng tìm kiếm thành phố"
                : "Open city search panel"
            }
            onClick={() => setShowing((prev) => !prev)}
          >
            <IoMenu />
          </button>
        </div>
      </div>
      <div
        id="mobile-side-nav"
        className={`side-nav ${showing ? "showing" : ""}`}
        onClick={() => setShowing(false)}
      >
        <div
          className="side-nav-content"
          onClick={(event) => event.stopPropagation()}
        >
          <SearchBar onSubmit={() => setShowing(false)} />
          <div className="mobile-session-controls">
            <span className={`role-badge ${role ?? "guest"}`}>
              {role === "admin" ? "Admin" : "Guest"}
            </span>
            {role === "admin" && (
              <button
                type="button"
                className="session-action"
                onClick={() => {
                  router.push("/admin");
                  setShowing(false);
                }}
              >
                <IoSettingsOutline />
                Admin
              </button>
            )}
            <button
              type="button"
              className="session-action logout"
              onClick={() => {
                void logout();
                setShowing(false);
              }}
            >
              <IoLogOutOutline />
              {language === "vi" ? "Đăng xuất" : "Logout"}
            </button>
          </div>
          {favorites.length > 0 && (
            <div className="mobile-favorites">
              <p className="mobile-favorites-title">
                <IoStar /> {language === "vi" ? "Yêu thích" : "Favorites"}
              </p>
              <ul className="mobile-favorites-list">
                {favorites.map((fav) => (
                  <li key={fav.id} className="favorite-item">
                    <button
                      type="button"
                      className="favorite-navigate"
                      onClick={() => handleNavigate(fav.city)}
                    >
                      <ImLocation />
                      <span>
                        {fav.city}, {fav.country}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="favorite-remove"
                      onClick={() => removeFavorite(fav.id)}
                      aria-label={
                        language === "vi"
                          ? `Xóa ${fav.city} khỏi yêu thích`
                          : `Remove ${fav.city} from favorites`
                      }
                    >
                      <IoClose />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
