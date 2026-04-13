import {
  DailyRecommendation,
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
  units: UnitsType
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
      title: "Vận động ngoài trời",
      description:
        tempCategory === "warm"
          ? "Điều kiện rất đẹp để chạy bộ hoặc đạp xe."
          : "Mặc thêm áo và tận hưởng hoạt động ngoài trời.",
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
      title: "Đi dạo nhẹ",
      description: isClear
        ? "Thời tiết lý tưởng để đi dạo quanh khu vực."
        : "Điều kiện khá ổn cho một buổi đi bộ thư giãn.",
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
      title: "Nhiếp ảnh",
      description:
        condition === "clouds"
          ? "Trời nhiều mây cho ánh sáng mềm và đều."
          : isClear
            ? "Trời quang, ánh sáng tự nhiên rất tốt."
            : "Điều kiện khí quyển thú vị cho ảnh giàu cảm xúc.",
      confidence: Math.max(20, Math.min(95, Math.round(score))),
    });
  }

  // Beach
  if (isClear && tempCategory === "hot" && !isWindy && avgPop < 0.2) {
    recommendations.push({
      category: "beach",
      title: "Đi biển",
      description: "Trời nóng và quang đãng, rất hợp để đi biển!",
      confidence: Math.min(95, Math.round(85 + (tempC - 25) * 2)),
    });
  }

  // Winter sport
  if (isSnowy || (tempC < 2 && avgPop > 0.3)) {
    recommendations.push({
      category: "winter_sport",
      title: "Thể thao mùa đông",
      description: isSnowy
        ? "Tuyết mới rơi, phù hợp cho các hoạt động mùa đông."
        : "Trời lạnh và ẩm, phù hợp nếu khu vực có tuyết.",
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
      title: "Hoạt động trong nhà",
      description: isRainy
        ? "Ngoài trời có mưa, phù hợp đi bảo tàng, quán cà phê hoặc xem phim."
        : "Thời tiết khắc nghiệt, ưu tiên hoạt động trong nhà.",
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
      title: "Ở nhà",
      description:
        condition === "thunderstorm"
          ? "Có dông, nên ở trong nhà để an toàn."
          : "Điều kiện thời tiết cực đoan, nên ở nhà cho thoải mái.",
      confidence: 90,
    });
  }

  // Always provide at least 2 recommendations
  if (recommendations.length < 2) {
    if (!recommendations.some((r) => r.category === "casual_walk")) {
      recommendations.push({
        category: "casual_walk",
        title: "Đi dạo nhẹ",
        description: "Điều kiện hiện tại vẫn phù hợp cho một vòng đi bộ ngắn.",
        confidence: 40,
      });
    }
    if (!recommendations.some((r) => r.category === "indoor_activity")) {
      recommendations.push({
        category: "indoor_activity",
        title: "Hoạt động trong nhà",
        description: "Lựa chọn an toàn và linh hoạt cho hôm nay.",
        confidence: 50,
      });
    }
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}
