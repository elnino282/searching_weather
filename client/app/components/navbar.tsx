"use client";
import React, { useState } from "react";
import { IoClose, IoMenu, IoStar } from "react-icons/io5";
import { ImLocation } from "react-icons/im";
import SearchBar from "./search-bar";
import Toggle from "./toggle";
import { TiWeatherPartlySunny } from "react-icons/ti";
import { useFavorites } from "@/app/hooks/useFavorites";
import { useRouter, useSearchParams } from "next/navigation";
import { formatStringToPath } from "@/app/utils/utility-functions";

const Navbar = () => {
  const [showing, setShowing] = useState<boolean>(false);
  const { favorites, removeFavorite } = useFavorites();
  const router = useRouter();
  const searchParams = useSearchParams();

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
            Weather<span className="colored">App</span>
          </span>
        </h1>
        <div className="right-side">
          <Toggle
            option1={{ name: "C", value: "metric" }}
            option2={{ name: "F", value: "imperial" }}
          />
          <button
            type="button"
            className="nav-menu-button"
            aria-controls="mobile-side-nav"
            aria-expanded={showing}
            aria-label="Open city search panel"
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
          {favorites.length > 0 && (
            <div className="mobile-favorites">
              <p className="mobile-favorites-title">
                <IoStar /> Favorites
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
                      aria-label={`Remove ${fav.city}`}
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
