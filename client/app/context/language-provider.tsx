"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { LanguageType } from "../types/types";

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (
    value: LanguageType | ((prev: LanguageType) => LanguageType)
  ) => void;
  toggleLanguage: () => void;
}

const defaultValue: LanguageContextType = {
  language: "vi",
  setLanguage: () => {},
  toggleLanguage: () => {},
};

export const LanguageContext = createContext<LanguageContextType>(defaultValue);

export const useLanguage = () => useContext(LanguageContext);

const LanguageContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useLocalStorage<LanguageType>(
    "weather-app-language",
    "vi"
  );

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "vi" ? "en" : "vi"));
  }, [setLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage }),
    [language, setLanguage, toggleLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export default LanguageContextProvider;
