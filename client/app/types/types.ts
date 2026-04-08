export type UnitsType = "metric" | "imperial";

export type WeatherType =
  | "clouds"
  | "mist"
  | "rain"
  | "snow"
  | "clear"
  | "drizzle"
  | "haze"
  | "thunderstorm";

export type PeriodType = "day" | "night";

export interface WeatherCondition {
  main: string;
  description: string;
}

export interface CurrentWeatherData {
  dt: number;
  sunset: number;
  sunrise: number;
  temp: number;
  feels_like: number;
  humidity: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather: WeatherCondition[];
}

export interface HourlyWeatherData {
  dt: number;
  temp: number;
  humidity: number;
  pop: number;
  weather: WeatherCondition[];
}

export interface DailyWeatherData {
  dt: number;
  humidity: number;
  pop: number;
  weather: WeatherCondition[];
  temp: {
    day: number;
    min: number;
    max: number;
  };
}

export interface AirQualityData {
  main: {
    aqi: number;
  };
  components: Record<string, number>;
}

export interface WeatherDataResponse {
  imageUrl: string;
  timezone_offset: number;
  name: string;
  country: string;
  current: CurrentWeatherData;
  hourly: HourlyWeatherData[];
  daily: DailyWeatherData[];
  list: AirQualityData[];
}

// Favorites
export interface FavoriteLocation {
  id: string;
  city: string;
  country: string;
  addedAt: number;
}

// Alerts
export type AlertMetric = "temp" | "wind" | "precipitation";
export type AlertComparator = "above" | "below";

export interface AlertPreference {
  id: string;
  metric: AlertMetric;
  comparator: AlertComparator;
  threshold: number;
  units: UnitsType;
  enabled: boolean;
  location: string;
}

export interface TriggeredAlert {
  alert: AlertPreference;
  currentValue: number;
  locationName: string;
}

// Recommendations
export type ActivityCategory =
  | "outdoor_exercise"
  | "indoor_activity"
  | "photography"
  | "beach"
  | "winter_sport"
  | "casual_walk"
  | "stay_home";

export interface DailyRecommendation {
  category: ActivityCategory;
  title: string;
  description: string;
  confidence: number;
}

// Activity Finder
export type OutdoorActivity =
  | "running"
  | "cycling"
  | "hiking"
  | "photography"
  | "picnic"
  | "stargazing";

export interface HourlyActivityScore {
  dt: number;
  score: number;
  reasons: string[];
}

export interface ActivityTimeFinder {
  activity: OutdoorActivity;
  bestHours: HourlyActivityScore[];
  allHours: HourlyActivityScore[];
  overallVerdict: string;
}
