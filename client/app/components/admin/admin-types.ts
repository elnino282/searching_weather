export interface AdminHealth {
  status: "UP" | "DEGRADED" | "DOWN";
  uptimeSeconds: number;
  database: {
    status: "UP" | "DOWN";
    latencyMs?: number;
    error?: string;
  };
  firebase: {
    status: "UP" | "DOWN" | "UNKNOWN";
  };
  openWeather: {
    usageToday: number;
    quotaLimit: number | null;
    quotaPercent: number | null;
    latencyAvgMs: number | null;
    latencyP95Ms: number | null;
    successCount: number;
    failureCount: number;
    lastError: string | null;
  };
}

export function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export function formatMs(value: number | null | undefined) {
  return typeof value === "number" ? `${value} ms` : "N/A";
}
