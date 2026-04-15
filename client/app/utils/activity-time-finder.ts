import {
  ActivityTimeFinder,
  CurrentWeatherData,
  HourlyActivityScore,
  HourlyWeatherData,
  LanguageType,
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

function isGoldenHour(dt: number, sunrise: number, sunset: number): boolean {
  const hourAfterSunrise = dt >= sunrise && dt <= sunrise + 3600;
  const hourBeforeSunset = dt >= sunset - 3600 && dt <= sunset;
  return hourAfterSunrise || hourBeforeSunset;
}

function scoreHour(
  hour: HourlyWeatherData,
  profile: ActivityProfile,
  current: CurrentWeatherData,
  units: UnitsType,
  language: LanguageType
): { score: number; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];
  const tempC = toMetricTemp(hour.temp, units);
  // HourlyWeatherData doesn't have wind_speed, so we estimate from current.
  const estWindKmh = toKmh(current.wind_speed, units);
  const pop = hour.pop * 100;
  const condition = hour.weather[0]?.main?.toLowerCase() || "clear";
  const isDaytime = checkIfDay(hour.dt, current.sunset, current.sunrise);
  const goldenHour = isGoldenHour(hour.dt, current.sunrise, current.sunset);

  // Temperature scoring
  if (tempC < profile.idealTempMinC) {
    const diff = profile.idealTempMinC - tempC;
    score -= diff * 3;
    if (diff > 5) reasons.push(language === "vi" ? "Quá lạnh" : "Too cold");
  } else if (tempC > profile.idealTempMaxC) {
    const diff = tempC - profile.idealTempMaxC;
    score -= diff * 3;
    if (diff > 5) reasons.push(language === "vi" ? "Quá nóng" : "Too hot");
  } else {
    reasons.push(
      language === "vi" ? "Nhiệt độ phù hợp" : "Comfortable temperature"
    );
  }

  // Precipitation scoring
  if (pop > profile.maxPop) {
    score -= (pop - profile.maxPop) * 0.8;
    reasons.push(
      language === "vi"
        ? `${Math.round(pop)}% khả năng mưa`
        : `${Math.round(pop)}% chance of rain`
    );
  }

  // Wind scoring (estimated)
  if (estWindKmh > profile.maxWindKmh) {
    score -= (estWindKmh - profile.maxWindKmh) * 1.5;
    reasons.push(language === "vi" ? "Gió mạnh" : "Strong wind");
  }

  // Weather condition scoring
  if (profile.clearOnly && !["clear", "clouds"].includes(condition)) {
    score -= 30;
    reasons.push(
      language === "vi" ? "Thời tiết không thuận lợi" : "Unfavorable weather"
    );
  }

  if (["thunderstorm", "snow"].includes(condition)) {
    score -= 40;
    reasons.push(language === "vi" ? "Thời tiết xấu" : "Severe weather");
  }

  // Time preference scoring
  if (profile.preferDaylight && !isDaytime) {
    score -= 25;
    reasons.push(language === "vi" ? "Đã tối" : "After dark");
  }

  if (profile.preferGoldenHour && goldenHour) {
    score += 15;
    reasons.push(language === "vi" ? "Giờ vàng" : "Golden hour");
  }

  if (profile.preferNight) {
    if (isDaytime) {
      score -= 30;
      reasons.push(language === "vi" ? "Quá sáng" : "Too bright");
    } else {
      score += 10;
      reasons.push(language === "vi" ? "Trời tối" : "Night sky");
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

export function findBestTimes(
  activity: OutdoorActivity,
  hourlyData: HourlyWeatherData[],
  currentData: CurrentWeatherData,
  timezoneOffset: number,
  units: UnitsType,
  language: LanguageType = "vi"
): ActivityTimeFinder {
  const profile = activityProfiles[activity];
  const hours = hourlyData.slice(0, 24);

  const allHours: HourlyActivityScore[] = hours.map((hour) => {
    const { score, reasons } = scoreHour(
      hour,
      profile,
      currentData,
      units,
      language
    );
    return { dt: hour.dt, score, reasons };
  });

  const bestHours = [...allHours].sort((a, b) => b.score - a.score).slice(0, 5);

  const bestScore = bestHours[0]?.score ?? 0;
  let overallVerdict: string;
  if (bestScore >= 80) {
    overallVerdict =
      language === "vi"
        ? "Điều kiện hôm nay rất tốt, nên đi ngay!"
        : "Conditions are excellent today. Great time to go.";
  } else if (bestScore >= 60) {
    overallVerdict =
      language === "vi"
        ? "Điều kiện khá ổn, có vài khung giờ phù hợp."
        : "Conditions are fairly good with several suitable time slots.";
  } else if (bestScore >= 40) {
    overallVerdict =
      language === "vi"
        ? "Điều kiện trung bình, nên cân nhắc kỹ."
        : "Conditions are average, so plan carefully.";
  } else {
    overallVerdict =
      language === "vi"
        ? "Điều kiện hôm nay kém, nên dời lịch."
        : "Conditions are poor today. Consider postponing.";
  }

  return { activity, bestHours, allHours, overallVerdict };
}
