"use client";
import React, { useState } from "react";
import { IoMenu } from "react-icons/io5";
import SearchBar from "./search-bar";
import Toggle from "./toggle";
import { TiWeatherPartlySunny } from "react-icons/ti";

const Navbar = () => {
  const [showing, setShowing] = useState<boolean>(false);

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
        </div>
      </div>
    </>
  );
};

export default Navbar;
