"use client";
import React from "react";
import SearchBar from "./search-bar";
import Toggle from "./toggle";
import { useMediaQueries } from "../hooks/useMediaQueries";
import Navbar from "./navbar";
import { TiWeatherPartlySunny } from "react-icons/ti";

const Header = () => {
  const device = useMediaQueries();

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
