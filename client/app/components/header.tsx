"use client";
import React, { useState } from "react";
import SearchBar from "./search-bar";
import Toggle from "./toggle";
import { useMediaQueries } from "../hooks/useMediaQueries";
import Navbar from "./navbar";
import { TiWeatherPartlySunny } from "react-icons/ti";
import { IoStar } from "react-icons/io5";
import { useFavorites } from "@/app/hooks/useFavorites";
import FavoritesPanel from "./favorites/favorites-panel";

const Header = () => {
  const device = useMediaQueries();
  const [showFavorites, setShowFavorites] = useState(false);
  const { favorites } = useFavorites();

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
                Weather<span className="colored">App</span>
              </span>
            </h1>
            <p className="subtitle">Live climate dashboard</p>
          </div>
          <div className="right-side">
            <div className="favorites-trigger-wrapper">
              <button
                type="button"
                className="favorites-trigger"
                onClick={() => setShowFavorites((prev) => !prev)}
                aria-label="Toggle favorites"
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
            <SearchBar />
          </div>
        </header>
      </div>
    );
  }
};

export default Header;
