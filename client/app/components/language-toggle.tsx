"use client";
import React from "react";
import { useLanguage } from "@/app/context/language-provider";

const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();
  const toggleClass = language === "en" ? "metric" : "imperial";
  const selectedLabel = language.toUpperCase();

  return (
    <button
      type="button"
      className={`toggle-container language-toggle ${toggleClass}`}
      onClick={toggleLanguage}
      aria-label={
        language === "vi"
          ? "Chuyển ngôn ngữ giao diện sang tiếng Anh"
          : "Switch interface language to Vietnamese"
      }
    >
      <span className="toggle-option option-left">EN</span>
      <span className="toggle-option option-right">VI</span>
      <span className={`toggle-button ${toggleClass}`}>
        <span className="toggle-icon">{selectedLabel}</span>
      </span>
    </button>
  );
};

export default LanguageToggle;
