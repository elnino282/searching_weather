import {
  DailyRecommendation,
  LanguageType,
  UnitsType,
  WeatherDataResponse,
} from "@/app/types/types";

type TempCategory = "cold" | "cool" | "warm" | "hot";

function getTempCategory(tempC: number): TempCategory {
  if (tempC < 5) return "cold";
  if (tempC < 15) return "cool";
  if (tempC < 25) return "warm";
  return "hot";
}

function toMetricTemp(temp: number, units: UnitsType): number {
  return units === "imperial" ? (temp - 32) * (5 / 9) : temp;
}

function toMetricWind(speed: number, units: UnitsType): number {
  if (units === "imperial") return speed * 1.60934;
  return speed * 3.6; // m/s -> km/h
}

export function generateRecommendations(
  weatherData: WeatherDataResponse,
  units: UnitsType,
  language: LanguageType = "vi"
): DailyRecommendation[] {
  const tempC = toMetricTemp(weatherData.current.temp, units);
  const tempCategory = getTempCategory(tempC);
  const windKmh = toMetricWind(weatherData.current.wind_speed, units);
  const avgPop =
    weatherData.hourly.slice(0, 6).reduce((sum, h) => sum + h.pop, 0) / 6;
  const condition = weatherData.current.weather[0].main.toLowerCase();
  const isRainy = ["rain", "drizzle", "thunderstorm"].includes(condition);
  const isSnowy = condition === "snow";
  const isClear = condition === "clear";
  const isWindy = windKmh > 30;

  const recommendations: DailyRecommendation[] = [];

  // Outdoor exercise
  if (!isRainy && !isSnowy && !isWindy && tempC >= 5 && tempC <= 30) {
    const score =
      100 -
      Math.abs(tempC - 18) * 2 -
      avgPop * 20 -
      (windKmh > 20 ? 15 : 0);
    recommendations.push({
      category: "outdoor_exercise",
      title:
        language === "vi" ? "Vận động ngoài trời" : "Outdoor exercise",
      description:
        language === "vi"
          ? tempCategory === "warm"
            ? "Điều kiện rất đẹp để chạy bộ hoặc đạp xe."
            : "Mặc thêm áo và tận hưởng hoạt động ngoài trời."
          : tempCategory === "warm"
            ? "Great conditions for running or cycling."
            : "Layer up and enjoy time outdoors.",
      confidence: Math.max(20, Math.min(95, Math.round(score))),
    });
  }

  // Casual walk
  if (!isRainy && !isSnowy && tempC >= 0 && windKmh < 35) {
    const score =
      90 -
      Math.abs(tempC - 20) * 1.5 -
      avgPop * 15 -
      (windKmh > 20 ? 10 : 0);
    recommendations.push({
      category: "casual_walk",
      title: language === "vi" ? "Đi dạo nhẹ" : "Casual walk",
      description:
        language === "vi"
          ? isClear
            ? "Thời tiết lý tưởng để đi dạo quanh khu vực."
            : "Điều kiện khá ổn cho một buổi đi bộ thư giãn."
          : isClear
            ? "The weather is ideal for a walk nearby."
            : "Conditions are decent for a relaxed walk.",
      confidence: Math.max(20, Math.min(95, Math.round(score))),
    });
  }

  // Photography
  if (!isRainy) {
    const score =
      75 +
      (isClear ? 10 : 0) +
      (condition === "clouds" ? 15 : 0) -
      avgPop * 20;
    recommendations.push({
      category: "photography",
      title: language === "vi" ? "Nhiếp ảnh" : "Photography",
      description:
        language === "vi"
          ? condition === "clouds"
            ? "Trời nhiều mây cho ánh sáng mềm và đều."
            : isClear
              ? "Trời quang, ánh sáng tự nhiên rất tốt."
              : "Điều kiện khí quyển thú vị cho ảnh giàu cảm xúc."
          : condition === "clouds"
            ? "Cloud cover gives soft and balanced light."
            : isClear
              ? "Clear sky and strong natural light."
              : "Atmosphere looks interesting for expressive shots.",
      confidence: Math.max(20, Math.min(95, Math.round(score))),
    });
  }

  // Beach
  if (isClear && tempCategory === "hot" && !isWindy && avgPop < 0.2) {
    recommendations.push({
      category: "beach",
      title: language === "vi" ? "Đi biển" : "Beach time",
      description:
        language === "vi"
          ? "Trời nóng và quang đãng, rất hợp để đi biển!"
          : "Hot and sunny weather is perfect for the beach.",
      confidence: Math.min(95, Math.round(85 + (tempC - 25) * 2)),
    });
  }

  // Winter sport
  if (isSnowy || (tempC < 2 && avgPop > 0.3)) {
    recommendations.push({
      category: "winter_sport",
      title: language === "vi" ? "Thể thao mùa đông" : "Winter sports",
      description:
        language === "vi"
          ? isSnowy
            ? "Tuyết mới rơi, phù hợp cho các hoạt động mùa đông."
            : "Trời lạnh và ẩm, phù hợp nếu khu vực có tuyết."
          : isSnowy
            ? "Fresh snowfall makes winter activities a great option."
            : "Cold and wet conditions can suit winter activities if snow is nearby.",
      confidence: isSnowy ? 90 : 60,
    });
  }

  // Indoor activity
  if (isRainy || isWindy || tempC < -5 || tempC > 38) {
    const score =
      80 +
      (isRainy ? 10 : 0) +
      (isWindy ? 5 : 0) +
      (tempC < -5 || tempC > 38 ? 10 : 0);
    recommendations.push({
      category: "indoor_activity",
      title: language === "vi" ? "Hoạt động trong nhà" : "Indoor activity",
      description:
        language === "vi"
          ? isRainy
            ? "Ngoài trời có mưa, phù hợp đi bảo tàng, quán cà phê hoặc xem phim."
            : "Thời tiết khắc nghiệt, ưu tiên hoạt động trong nhà."
          : isRainy
            ? "Rain outside makes indoor plans like museums or cafes a better fit."
            : "Conditions are harsh, so indoor activities are safer.",
      confidence: Math.min(95, Math.round(score)),
    });
  }

  // Stay home
  if (
    condition === "thunderstorm" ||
    (isRainy && isWindy) ||
    tempC < -15 ||
    tempC > 42
  ) {
    recommendations.push({
      category: "stay_home",
      title: language === "vi" ? "Ở nhà" : "Stay home",
      description:
        language === "vi"
          ? condition === "thunderstorm"
            ? "Có dông, nên ở trong nhà để an toàn."
            : "Điều kiện thời tiết cực đoan, nên ở nhà cho thoải mái."
          : condition === "thunderstorm"
            ? "Thunderstorms are active, so staying indoors is safest."
            : "Extreme weather makes staying home the best option.",
      confidence: 90,
    });
  }

  // Always provide at least 2 recommendations
  if (recommendations.length < 2) {
    if (!recommendations.some((r) => r.category === "casual_walk")) {
      recommendations.push({
        category: "casual_walk",
        title: language === "vi" ? "Đi dạo nhẹ" : "Casual walk",
        description:
          language === "vi"
            ? "Điều kiện hiện tại vẫn phù hợp cho một vòng đi bộ ngắn."
            : "Current conditions can still support a short walk.",
        confidence: 40,
      });
    }
    if (!recommendations.some((r) => r.category === "indoor_activity")) {
      recommendations.push({
        category: "indoor_activity",
        title: language === "vi" ? "Hoạt động trong nhà" : "Indoor activity",
        description:
          language === "vi"
            ? "Lựa chọn an toàn và linh hoạt cho hôm nay."
            : "A safe and flexible choice for today.",
        confidence: 50,
      });
    }
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}
