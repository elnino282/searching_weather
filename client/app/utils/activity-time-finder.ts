import {
  ActivityTimeFinder,
  CurrentWeatherData,
  HourlyActivityScore,
  HourlyWeatherData,
  OutdoorActivity,
  UnitsType,
} from "@/app/types/types";
import { checkIfDay } from "@/app/components/weather-dashboard/weather-dashboard";

interface ActivityProfile {
  idealTempMinC: number;
  idealTempMaxC: number;
  maxPop: number;
  maxWindKmh: number;
  preferDaylight: boolean;
  preferGoldenHour: boolean;
  preferNight: boolean;
  clearOnly: boolean;
}

const activityProfiles: Record<OutdoorActivity, ActivityProfile> = {
  running: {
    idealTempMinC: 8,
    idealTempMaxC: 20,
    maxPop: 30,
    maxWindKmh: 25,
    preferDaylight: true,
    preferGoldenHour: false,
    preferNight: false,
    clearOnly: false,
  },
  cycling: {
    idealTempMinC: 10,
    idealTempMaxC: 25,
    maxPop: 20,
    maxWindKmh: 20,
    preferDaylight: true,
    preferGoldenHour: false,
    preferNight: false,
    clearOnly: false,
  },
  hiking: {
    idealTempMinC: 5,
    idealTempMaxC: 25,
    maxPop: 40,
    maxWindKmh: 30,
    preferDaylight: true,
    preferGoldenHour: false,
    preferNight: false,
    clearOnly: false,
  },
  photography: {
    idealTempMinC: -10,
    idealTempMaxC: 40,
    maxPop: 30,
    maxWindKmh: 50,
    preferDaylight: false,
    preferGoldenHour: true,
    preferNight: false,
    clearOnly: false,
  },
  picnic: {
    idealTempMinC: 18,
    idealTempMaxC: 30,
    maxPop: 10,
    maxWindKmh: 15,
    preferDaylight: true,
    preferGoldenHour: false,
    preferNight: false,
    clearOnly: true,
  },
  stargazing: {
    idealTempMinC: -10,
    idealTempMaxC: 35,
    maxPop: 20,
    maxWindKmh: 20,
    preferDaylight: false,
    preferGoldenHour: false,
    preferNight: true,
    clearOnly: true,
  },
};

function toMetricTemp(temp: number, units: UnitsType): number {
  return units === "imperial" ? (temp - 32) * (5 / 9) : temp;
}

function toKmh(speed: number, units: UnitsType): number {
  return units === "imperial" ? speed * 1.60934 : speed * 3.6;
}

function isGoldenHour(
  dt: number,
  sunrise: number,
  sunset: number
): boolean {
  const hourAfterSunrise = dt >= sunrise && dt <= sunrise + 3600;
  const hourBeforeSunset = dt >= sunset - 3600 && dt <= sunset;
  return hourAfterSunrise || hourBeforeSunset;
}

function scoreHour(
  hour: HourlyWeatherData,
  profile: ActivityProfile,
  current: CurrentWeatherData,
  units: UnitsType
): { score: number; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];
  const tempC = toMetricTemp(hour.temp, units);
  const windKmh = toKmh(
    units === "imperial" ? hour.humidity : hour.temp, // wind_speed not in hourly, use pop/temp as proxy
    units
  );
  // HourlyWeatherData doesn't have wind_speed, so we estimate from current
  const estWindKmh = toKmh(current.wind_speed, units);
  const pop = hour.pop * 100;
  const condition = hour.weather[0]?.main?.toLowerCase() || "clear";
  const isDaytime = checkIfDay(hour.dt, current.sunset, current.sunrise);
  const goldenHour = isGoldenHour(hour.dt, current.sunrise, current.sunset);

  // Temperature scoring
  if (tempC < profile.idealTempMinC) {
    const diff = profile.idealTempMinC - tempC;
    score -= diff * 3;
    if (diff > 5) reasons.push("Too cold");
  } else if (tempC > profile.idealTempMaxC) {
    const diff = tempC - profile.idealTempMaxC;
    score -= diff * 3;
    if (diff > 5) reasons.push("Too hot");
  } else {
    reasons.push("Good temperature");
  }

  // Precipitation scoring
  if (pop > profile.maxPop) {
    score -= (pop - profile.maxPop) * 0.8;
    reasons.push(`${Math.round(pop)}% rain chance`);
  }

  // Wind scoring (estimated)
  if (estWindKmh > profile.maxWindKmh) {
    score -= (estWindKmh - profile.maxWindKmh) * 1.5;
    reasons.push("Windy");
  }

  // Weather condition scoring
  if (profile.clearOnly && !["clear", "clouds"].includes(condition)) {
    score -= 30;
    reasons.push("Poor weather");
  }

  if (["thunderstorm", "snow"].includes(condition)) {
    score -= 40;
    reasons.push("Severe weather");
  }

  // Time preference scoring
  if (profile.preferDaylight && !isDaytime) {
    score -= 25;
    reasons.push("After dark");
  }

  if (profile.preferGoldenHour && goldenHour) {
    score += 15;
    reasons.push("Golden hour");
  }

  if (profile.preferNight) {
    if (isDaytime) {
      score -= 30;
      reasons.push("Too bright");
    } else {
      score += 10;
      reasons.push("Dark skies");
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

export function findBestTimes(
  activity: OutdoorActivity,
  hourlyData: HourlyWeatherData[],
  currentData: CurrentWeatherData,
  timezoneOffset: number,
  units: UnitsType
): ActivityTimeFinder {
  const profile = activityProfiles[activity];
  const hours = hourlyData.slice(0, 24);

  const allHours: HourlyActivityScore[] = hours.map((hour) => {
    const { score, reasons } = scoreHour(hour, profile, currentData, units);
    return { dt: hour.dt, score, reasons };
  });

  const bestHours = [...allHours]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const bestScore = bestHours[0]?.score ?? 0;
  let overallVerdict: string;
  if (bestScore >= 80) {
    overallVerdict = "Excellent conditions today — great time to go!";
  } else if (bestScore >= 60) {
    overallVerdict = "Decent conditions — a few good windows available.";
  } else if (bestScore >= 40) {
    overallVerdict = "Marginal conditions — proceed with caution.";
  } else {
    overallVerdict = "Poor conditions today — consider postponing.";
  }

  return { activity, bestHours, allHours, overallVerdict };
}
