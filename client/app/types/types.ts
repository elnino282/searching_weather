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
