"use client";
import React, { useCallback, useRef, useState } from "react";
import { IoShareSocialOutline } from "react-icons/io5";
import { HiDownload } from "react-icons/hi";
import { IoMdClose } from "react-icons/io";
import { WeatherDataResponse } from "@/app/types/types";
import {
  formatDate,
  formatTime,
  translateWeatherDescription,
} from "@/app/utils/utility-functions";
import { useLanguage } from "@/app/context/language-provider";
import { checkIfDay } from "./weather-dashboard";

/* ------------------------------------------------------------------ */
/*  Colour palettes keyed by weather type                              */
/* ------------------------------------------------------------------ */
const PALETTES: Record<string, { bg1: string; bg2: string; accent: string }> = {
  clear:        { bg1: "#1a3a6e", bg2: "#4588ff", accent: "#86e3ff" },
  clouds:       { bg1: "#3a4d6e", bg2: "#6b86b3", accent: "#b0ccf0" },
  rain:         { bg1: "#2a3d5e", bg2: "#475b82", accent: "#7ea6d4" },
  drizzle:      { bg1: "#2a3d5e", bg2: "#475b82", accent: "#7ea6d4" },
  thunderstorm: { bg1: "#161840", bg2: "#263d85", accent: "#8b7cdb" },
  snow:         { bg1: "#3a4f7a", bg2: "#8fa9dc", accent: "#d5e5ff" },
  mist:         { bg1: "#3a4a65", bg2: "#7a8fb0", accent: "#bac9e1" },
  haze:         { bg1: "#5a3f15", bg2: "#bd8b35", accent: "#f5dec0" },
  default:      { bg1: "#1a3a6e", bg2: "#4588ff", accent: "#86e3ff" },
};

const NIGHT_PALETTES: Record<string, { bg1: string; bg2: string; accent: string }> = {
  clear:        { bg1: "#050d23", bg2: "#0d1c43", accent: "#86e3ff" },
  clouds:       { bg1: "#101828", bg2: "#1d2a45", accent: "#8fb0d6" },
  rain:         { bg1: "#0c1528", bg2: "#182848", accent: "#6b99cc" },
  drizzle:      { bg1: "#0c1528", bg2: "#182848", accent: "#6b99cc" },
  thunderstorm: { bg1: "#080b1d", bg2: "#171434", accent: "#9b8ae6" },
  snow:         { bg1: "#101932", bg2: "#1a2a52", accent: "#c5d8f5" },
  mist:         { bg1: "#101827", bg2: "#202f49", accent: "#a0b5d0" },
  haze:         { bg1: "#21170a", bg2: "#38250d", accent: "#d4a84a" },
  default:      { bg1: "#050d23", bg2: "#0d1c43", accent: "#86e3ff" },
};

/* ------------------------------------------------------------------ */
/*  Canvas-drawn weather icon                                          */
/* ------------------------------------------------------------------ */
function drawWeatherIcon(
  ctx: CanvasRenderingContext2D,
  weatherType: string,
  isDay: boolean,
  cx: number,
  cy: number,
  size: number,
  accent: string
) {
  ctx.save();
  ctx.lineWidth = size * 0.06;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const r = size * 0.35;

  if (weatherType === "clear" && isDay) {
    // Sun
    ctx.fillStyle = "#FFD93D";
    ctx.strokeStyle = "#FFD93D";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Rays
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const inner = r + size * 0.08;
      const outer = r + size * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }
  } else if (weatherType === "clear" && !isDay) {
    // Moon crescent
    ctx.fillStyle = "#F0E68C";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ctx.createLinearGradient(cx, cy - r, cx + r, cy + r);
    (ctx.fillStyle as CanvasGradient).addColorStop(0, NIGHT_PALETTES[weatherType]?.bg2 ?? "#0d1c43");
    (ctx.fillStyle as CanvasGradient).addColorStop(1, NIGHT_PALETTES[weatherType]?.bg1 ?? "#050d23");
    ctx.beginPath();
    ctx.arc(cx + r * 0.4, cy - r * 0.15, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (weatherType === "clouds") {
    drawCloud(ctx, cx, cy, r, "rgba(255,255,255,0.85)");
  } else if (weatherType === "rain" || weatherType === "drizzle") {
    drawCloud(ctx, cx, cy - size * 0.12, r * 0.9, "rgba(255,255,255,0.75)");
    // Rain drops
    ctx.strokeStyle = accent;
    ctx.lineWidth = size * 0.04;
    for (let i = -1; i <= 1; i++) {
      const dx = cx + i * size * 0.18;
      const dy = cy + size * 0.18;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx - size * 0.05, dy + size * 0.18);
      ctx.stroke();
    }
  } else if (weatherType === "thunderstorm") {
    drawCloud(ctx, cx, cy - size * 0.15, r * 0.9, "rgba(255,255,255,0.65)");
    // Lightning bolt
    ctx.fillStyle = "#FFD93D";
    ctx.beginPath();
    const bx = cx - size * 0.05;
    const by = cy + size * 0.05;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + size * 0.12, by);
    ctx.lineTo(bx + size * 0.04, by + size * 0.15);
    ctx.lineTo(bx + size * 0.18, by + size * 0.15);
    ctx.lineTo(bx - size * 0.02, by + size * 0.38);
    ctx.lineTo(bx + size * 0.06, by + size * 0.2);
    ctx.lineTo(bx - size * 0.06, by + size * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (weatherType === "snow") {
    drawCloud(ctx, cx, cy - size * 0.12, r * 0.85, "rgba(255,255,255,0.8)");
    // Snowflakes (asterisks)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = size * 0.03;
    for (let i = -1; i <= 1; i++) {
      const sx = cx + i * size * 0.18;
      const sy = cy + size * 0.24;
      for (let a = 0; a < 3; a++) {
        const angle = (a * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(angle) * size * 0.06, sy + Math.sin(angle) * size * 0.06);
        ctx.lineTo(sx - Math.cos(angle) * size * 0.06, sy - Math.sin(angle) * size * 0.06);
        ctx.stroke();
      }
    }
  } else if (weatherType === "mist" || weatherType === "haze") {
    // Horizontal fog lines
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = size * 0.055;
    for (let i = -1; i <= 1; i++) {
      const ly = cy + i * size * 0.16;
      const lw = size * (0.55 - Math.abs(i) * 0.1);
      ctx.beginPath();
      ctx.moveTo(cx - lw, ly);
      ctx.lineTo(cx + lw, ly);
      ctx.stroke();
    }
  } else {
    drawCloud(ctx, cx, cy, r, "rgba(255,255,255,0.7)");
  }

  ctx.restore();
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  ctx.arc(cx - r * 0.55, cy + r * 0.15, r * 0.45, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.55, cy + r * 0.15, r * 0.45, 0, Math.PI * 2);
  ctx.arc(cx - r * 0.25, cy + r * 0.35, r * 0.38, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.25, cy + r * 0.35, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

/* ------------------------------------------------------------------ */
/*  Canvas rendering helper                                            */
/* ------------------------------------------------------------------ */
function drawSnapshotCard(
  canvas: HTMLCanvasElement,
  data: WeatherDataResponse,
  units: {
    speedUnit: string;
    tempUnit: string;
    distanceUnit: string;
    distanceMultiplier: number;
    speedMultiplier: number;
  },
  language: "vi" | "en"
) {
  const W = 1080;
  const H = 1920;
  const dpr = 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const weatherType = data.current.weather[0]?.main?.toLowerCase() ?? "default";
  const isDay = checkIfDay(data.current.dt, data.current.sunset, data.current.sunrise);
  const palettes = isDay ? PALETTES : NIGHT_PALETTES;
  const palette = palettes[weatherType] ?? palettes["default"];

  /* ---- Background gradient ---- */
  const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
  grad.addColorStop(0, palette.bg1);
  grad.addColorStop(1, palette.bg2);
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, W, H, 0);
  ctx.fill();

  /* ---- Decorative circles ---- */
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.12, 280, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.1, H * 0.75, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  /* ---- Glass card ---- */
  const cardX = 60;
  const cardY = 220;
  const cardW = W - 120;
  const cardH = H - 440;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 40);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  /* ---- App label ---- */
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 28px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    language === "vi" ? "THỜI TIẾT HIỆN TẠI" : "CURRENT WEATHER",
    W / 2,
    160
  );

  /* ---- Weather icon (canvas-drawn) ---- */
  drawWeatherIcon(ctx, weatherType, isDay, W / 2, cardY + 180, 200, palette.accent);

  /* ---- Temperature ---- */
  const temp = Math.round(data.current.temp);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 180px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${temp}${units.tempUnit}`, W / 2, cardY + 450);

  /* ---- Description ---- */
  const desc = translateWeatherDescription(
    data.current.weather[0]?.description ?? "",
    language
  );
  ctx.fillStyle = palette.accent;
  ctx.font = "500 48px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(desc, W / 2, cardY + 530);

  /* ---- Feels like ---- */
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "400 36px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(
    `${language === "vi" ? "Cảm giác như" : "Feels like"} ${Math.round(data.current.feels_like)}${units.tempUnit}`,
    W / 2,
    cardY + 590
  );

  /* ---- Location ---- */
  const cityLabel = `${data.name}, ${data.country}`;
  ctx.fillStyle = "#ffffff";
  // Auto-fit: shrink font if location text is too wide
  let locFontSize = 46;
  const maxLocWidth = cardW - 120;
  ctx.font = `600 ${locFontSize}px 'Segoe UI', system-ui, sans-serif`;
  while (ctx.measureText(cityLabel).width > maxLocWidth && locFontSize > 24) {
    locFontSize -= 2;
    ctx.font = `600 ${locFontSize}px 'Segoe UI', system-ui, sans-serif`;
  }
  // Draw location pin marker
  const markerR = locFontSize * 0.22;
  const markerX = W / 2 - ctx.measureText(cityLabel).width / 2 - markerR * 2.5;
  const markerY = cardY + 690;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(markerX, markerY - markerR * 0.5, markerR, Math.PI, 0);
  ctx.lineTo(markerX, markerY + markerR * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.bg1;
  ctx.beginPath();
  ctx.arc(markerX, markerY - markerR * 0.5, markerR * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // City name
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${locFontSize}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(cityLabel, W / 2 + markerR, cardY + 700);

  /* ---- Date ---- */
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "400 34px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(formatDate(data.current.dt, language), W / 2, cardY + 765);

  /* ---- Divider ---- */
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 60, cardY + 820);
  ctx.lineTo(cardX + cardW - 60, cardY + 820);
  ctx.stroke();

  /* ---- Metric grid (2×2) ---- */
  const metrics = [
    {
      label: language === "vi" ? "Độ ẩm" : "Humidity",
      value: `${data.current.humidity}%`,
      icon: "◈",
      iconColor: "#60BFFF",
    },
    {
      label: language === "vi" ? "Tầm nhìn" : "Visibility",
      value: `${Math.round((data.current.visibility / 1000) * units.distanceMultiplier)} ${units.distanceUnit}`,
      icon: "◉",
      iconColor: "#A0D8FF",
    },
    {
      label: language === "vi" ? "Tốc độ gió" : "Wind",
      value: `${Math.round(data.current.wind_speed * units.speedMultiplier)} ${units.speedUnit}`,
      icon: "≋",
      iconColor: "#86E3FF",
    },
    {
      label: language === "vi" ? "Mặt trời mọc / lặn" : "Sunrise / Sunset",
      value: `${formatTime(data.current.sunrise, data.timezone_offset)} — ${formatTime(data.current.sunset, data.timezone_offset)}`,
      icon: "☼",
      iconColor: "#FFD93D",
    },
  ];

  const cols = 2;
  const metricW = (cardW - 180) / cols;
  const metricH = 160;
  const startX = cardX + 90;
  const startY = cardY + 870;

  metrics.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const mx = startX + col * metricW;
    const my = startY + row * (metricH + 30);

    /* Metric tile background */
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, mx, my, metricW - 30, metricH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    /* Icon + Label */
    ctx.font = "bold 36px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = m.iconColor;
    ctx.fillText(m.icon, mx + (metricW - 30) / 2, my + 50);

    ctx.font = "500 30px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(m.value, mx + (metricW - 30) / 2, my + 100);

    ctx.font = "400 24px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(m.label, mx + (metricW - 30) / 2, my + 140);
  });

  /* ---- Footer branding ---- */
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "400 28px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("weaclifor", W / 2, H - 80);
}

/* Rounded rect helper */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
interface ShareSnapshotButtonProps {
  weatherData: WeatherDataResponse;
  units: {
    speedUnit: string;
    tempUnit: string;
    distanceUnit: string;
    distanceMultiplier: number;
    speedMultiplier: number;
  };
}

const ShareSnapshotButton: React.FC<ShareSnapshotButtonProps> = ({
  weatherData,
  units,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { language } = useLanguage();

  const generateCard = useCallback(() => {
    if (!canvasRef.current) return;
    setIsGenerating(true);
    requestAnimationFrame(() => {
      drawSnapshotCard(canvasRef.current!, weatherData, units, language);
      setIsGenerating(false);
    });
  }, [weatherData, units, language]);

  const handleOpen = useCallback(() => {
    setShowPreview(true);
    // Wait for canvas to mount, then draw
    setTimeout(() => generateCard(), 50);
  }, [generateCard]);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `weather-${weatherData.name.toLowerCase()}-${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [weatherData.name]);

  const handleShare = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      const file = new File(
        [blob],
        `weather-${weatherData.name.toLowerCase()}.png`,
        { type: "image/png" }
      );

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${language === "vi" ? "Thời tiết tại" : "Weather in"} ${weatherData.name}`,
          files: [file],
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        alert(
          language === "vi"
            ? "Đã sao chép ảnh vào clipboard!"
            : "Image copied to clipboard!"
        );
      }
    } catch {
      // User cancelled share dialog — ignore
    }
  }, [weatherData.name, language]);

  return (
    <>
      <button
        type="button"
        className="share-snapshot-trigger"
        onClick={handleOpen}
        aria-label={language === "vi" ? "Chia sẻ thẻ thời tiết" : "Share weather card"}
        title={language === "vi" ? "Chia sẻ thẻ thời tiết" : "Share weather card"}
        id="share-snapshot-btn"
      >
        <IoShareSocialOutline />
      </button>

      {showPreview && (
        <div
          className="share-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreview(false);
          }}
        >
          <div className="share-modal">
            <div className="share-modal-header">
              <h3>
                {language === "vi"
                  ? "Chia sẻ thẻ thời tiết"
                  : "Share Weather Card"}
              </h3>
              <button
                type="button"
                className="share-modal-close"
                onClick={() => setShowPreview(false)}
                aria-label={language === "vi" ? "Đóng" : "Close"}
              >
                <IoMdClose />
              </button>
            </div>

            <div className="share-canvas-wrapper">
              <canvas
                ref={canvasRef}
                className="share-canvas"
                aria-label={
                  language === "vi"
                    ? "Ảnh thẻ thời tiết"
                    : "Weather snapshot card"
                }
              />
              {isGenerating && (
                <div className="share-canvas-loading">
                  {language === "vi" ? "Đang tạo..." : "Generating..."}
                </div>
              )}
            </div>

            <div className="share-actions">
              <button
                type="button"
                className="share-action-btn share-download-btn"
                onClick={handleDownload}
                id="share-download-btn"
              >
                <HiDownload />
                {language === "vi" ? "Tải xuống" : "Download"}
              </button>
              <button
                type="button"
                className="share-action-btn share-share-btn"
                onClick={handleShare}
                id="share-share-btn"
              >
                <IoShareSocialOutline />
                {language === "vi" ? "Chia sẻ" : "Share"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareSnapshotButton;
