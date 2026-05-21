import React from "react";
import AuthGate from "./components/auth/auth-gate";
import AuthProvider from "./context/auth-provider";
import FeatureFlagsProvider from "./context/feature-flags-provider";
import WeatherContextProvider from "./context/weather-provider";
import PeriodContextProvider from "./context/period-provider";
import LanguageContextProvider from "./context/language-provider";

const WeatherPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ location: string; units: string }>;
}) => {
  const { location, units } = await searchParams;
  return (
    <div className="weather-app-container">
      <WeatherContextProvider>
        <PeriodContextProvider>
          <LanguageContextProvider>
            <FeatureFlagsProvider>
              <AuthProvider>
                <AuthGate units={units} location={location} />
              </AuthProvider>
            </FeatureFlagsProvider>
          </LanguageContextProvider>
        </PeriodContextProvider>
      </WeatherContextProvider>
    </div>
  );
};

export default WeatherPage;
