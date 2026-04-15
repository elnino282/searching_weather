import { LanguageType } from "../types/types";

export const formatDate = (
  seconds: number,
  language: LanguageType = "vi"
): string => {
  const date: Date = new Date(seconds * 1000);
  const year = date.getFullYear();
  const dateOfMonth = date.getDate();

  if (language === "en") {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${dateOfMonth}, ${year}`;
  }

  const days = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const months = [
    "tháng 1",
    "tháng 2",
    "tháng 3",
    "tháng 4",
    "tháng 5",
    "tháng 6",
    "tháng 7",
    "tháng 8",
    "tháng 9",
    "tháng 10",
    "tháng 11",
    "tháng 12",
  ];

  return `${days[date.getDay()]}, ${dateOfMonth} ${months[date.getMonth()]}, ${year}`;
};

export const getDay = (
  seconds: number,
  language: LanguageType = "vi"
): string => {
  const date: Date = new Date(seconds * 1000);
  const days =
    language === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
  return days[date.getDay()];
};

export const formatCamelCase = (text: string) => {
  return text?.replace(/(^\w{1})|(\s+\w{1})/g, (letter) =>
    letter.toUpperCase()
  );
};

export const translateWeatherDescription = (
  description: string,
  language: LanguageType = "vi"
): string => {
  const normalized = description?.toLowerCase() ?? "";
  if (language === "en") {
    return formatCamelCase(description);
  }

  if (normalized.includes("thunderstorm")) return "Dông";
  if (normalized.includes("drizzle")) return "Mưa phùn";
  if (normalized.includes("rain")) return "Mưa";
  if (normalized.includes("snow")) return "Tuyết";
  if (normalized.includes("clear")) return "Trời quang";
  if (normalized.includes("cloud")) return "Nhiều mây";
  if (normalized.includes("mist") || normalized.includes("fog")) return "Sương mù";
  if (normalized.includes("haze") || normalized.includes("smoke")) return "Sương mờ";
  if (normalized.includes("dust") || normalized.includes("sand")) return "Bụi";

  return formatCamelCase(description);
};

const removeAccents = (input: string): string => {
  // Normalize the string to decomposed Unicode, then remove non-ASCII characters such as accents and diacritics
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const formatLocationName = (city: string): string => {
  city = formatCamelCase(city.toLowerCase());
  const match = city.search(/[\(\)\[\]\{\},]/); //Searches city name for any special characters or brackets/parentheses/braces/single/double quotes, and slices off anything after the match

  if (match !== -1) {
    return city.slice(0, match);
  }

  return removeAccents(city);
};

export const removeAfterHyphen = (text: string): string => {
  const match = text.search(/[_]/);

  if (match !== -1) {
    return text.slice(0, match);
  } else {
    return text;
  }
};

export const getCurrentTime = (timeZone: number): string => {
  const now = new Date().getTime() / 1000;
  return formatTime(now, timeZone, true);
};

export const formatTime = (
  seconds: number,
  timeZone: number,
  showMinutes: boolean = true
): string => {
  const date: Date = new Date((seconds + timeZone + 18000) * 1000);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes: string = date.getMinutes().toString().padStart(2, "0");
  return showMinutes ? `${hours}:${minutes}` : `${hours}h`;
};

export const formatTimeDuration = (
  seconds: number,
  language: LanguageType = "vi"
): string => {
  const hours: number = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (language === "en") {
    const hourLabel = hours === 1 ? "hour" : "hours";
    const minuteLabel = minutes === 1 ? "minute" : "minutes";
    return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
  }

  return `${hours} giờ ${minutes} phút`;
};

export const formatStringToPath = (input: string): string => {
  return input
    .replace(/\s+/g, "-") // Replace all white spaces with hyphens
    .toLowerCase(); // Convert all letters to lowercase
};

export const findClass = (
  target: HTMLElement | null,
  className: string
): HTMLElement | null => {
  let object;
  if (target !== null) {
    if (target.className.includes(className)) {
      object = target;
    } else {
      object = findClass(target.parentElement, className);
    }
  } else {
    return null;
  }
  return object;
};
