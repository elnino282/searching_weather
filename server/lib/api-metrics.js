class QuotaExceededError extends Error {
  constructor(service, endpoint, limit, used) {
    super(`${service} daily quota exceeded for ${endpoint}`);
    this.name = "QuotaExceededError";
    this.code = "OPENWEATHER_DAILY_QUOTA_EXCEEDED";
    this.statusCode = 429;
    this.service = service;
    this.endpoint = endpoint;
    this.limit = limit;
    this.used = used;
  }
}

const metricsState = {};
const MAX_LATENCY_SAMPLES = 100;

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOpenWeatherQuotaLimit() {
  const limit = Number.parseInt(process.env.OPENWEATHER_DAILY_QUOTA_LIMIT, 10);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

function ensureServiceMetrics(service) {
  if (!metricsState[service]) {
    metricsState[service] = {
      totalCalls: 0,
      success: 0,
      failure: 0,
      quotaRejected: 0,
      byStatusCode: {},
      byEndpoint: {},
      latencyMs: {
        count: 0,
        total: 0,
        min: null,
        max: null,
        recent: [],
      },
      dailyUsage: {},
      lastError: null,
    };
  }

  return metricsState[service];
}

function ensureEndpointMetrics(serviceMetrics, endpoint) {
  if (!serviceMetrics.byEndpoint[endpoint]) {
    serviceMetrics.byEndpoint[endpoint] = {
      totalCalls: 0,
      success: 0,
      failure: 0,
      byStatusCode: {},
      latencyMs: {
        count: 0,
        total: 0,
        min: null,
        max: null,
        recent: [],
      },
      lastError: null,
    };
  }

  return serviceMetrics.byEndpoint[endpoint];
}

function addLatency(target, latencyMs) {
  target.latencyMs.count += 1;
  target.latencyMs.total += latencyMs;
  target.latencyMs.min =
    target.latencyMs.min === null
      ? latencyMs
      : Math.min(target.latencyMs.min, latencyMs);
  target.latencyMs.max =
    target.latencyMs.max === null
      ? latencyMs
      : Math.max(target.latencyMs.max, latencyMs);
  target.latencyMs.recent.push(latencyMs);

  if (target.latencyMs.recent.length > MAX_LATENCY_SAMPLES) {
    target.latencyMs.recent.shift();
  }
}

function incrementStatus(target, statusCode) {
  const key = String(statusCode || "UNKNOWN");
  target.byStatusCode[key] = (target.byStatusCode[key] || 0) + 1;
}

function recordDailyUsage(serviceMetrics, endpoint, count = 1) {
  const dateKey = getLocalDateKey();
  if (!serviceMetrics.dailyUsage[dateKey]) {
    serviceMetrics.dailyUsage[dateKey] = {
      total: 0,
      byEndpoint: {},
    };
  }

  serviceMetrics.dailyUsage[dateKey].total += count;
  serviceMetrics.dailyUsage[dateKey].byEndpoint[endpoint] =
    (serviceMetrics.dailyUsage[dateKey].byEndpoint[endpoint] || 0) + count;
}

function getDailyUsageTotal(service, dateKey = getLocalDateKey()) {
  return metricsState[service]?.dailyUsage?.[dateKey]?.total || 0;
}

function recordCall({
  service,
  endpoint,
  statusCode,
  latencyMs,
  success,
  errorMessage = null,
  countDailyUsage = true,
}) {
  const serviceMetrics = ensureServiceMetrics(service);
  const endpointMetrics = ensureEndpointMetrics(serviceMetrics, endpoint);

  serviceMetrics.totalCalls += 1;
  endpointMetrics.totalCalls += 1;

  if (success) {
    serviceMetrics.success += 1;
    endpointMetrics.success += 1;
  } else {
    serviceMetrics.failure += 1;
    endpointMetrics.failure += 1;
    serviceMetrics.lastError = errorMessage;
    endpointMetrics.lastError = errorMessage;
  }

  incrementStatus(serviceMetrics, statusCode);
  incrementStatus(endpointMetrics, statusCode);
  addLatency(serviceMetrics, latencyMs);
  addLatency(endpointMetrics, latencyMs);

  if (countDailyUsage) {
    recordDailyUsage(serviceMetrics, endpoint);
  }
}

function recordQuotaRejection(service, endpoint) {
  const serviceMetrics = ensureServiceMetrics(service);
  const endpointMetrics = ensureEndpointMetrics(serviceMetrics, endpoint);
  const statusCode = 429;

  serviceMetrics.totalCalls += 1;
  endpointMetrics.totalCalls += 1;
  serviceMetrics.quotaRejected += 1;
  serviceMetrics.failure += 1;
  endpointMetrics.failure += 1;
  serviceMetrics.lastError = "Daily quota guard rejected the request.";
  endpointMetrics.lastError = serviceMetrics.lastError;
  incrementStatus(serviceMetrics, statusCode);
  incrementStatus(endpointMetrics, statusCode);
}

function assertOpenWeatherQuota(endpoint) {
  const limit = getOpenWeatherQuotaLimit();
  if (!limit) return;

  const used = getDailyUsageTotal("openweather");
  if (used >= limit) {
    recordQuotaRejection("openweather", endpoint);
    throw new QuotaExceededError("openweather", endpoint, limit, used);
  }
}

async function fetchWithMetrics(url, options = {}, context = {}) {
  const service = context.service || "unknown";
  const endpoint = context.endpoint || "unknown";
  const countDailyUsage = context.countDailyUsage !== false;

  if (service === "openweather" && countDailyUsage) {
    assertOpenWeatherQuota(endpoint);
  }

  const start = Date.now();

  try {
    const response = await fetch(url, options);
    const latencyMs = Date.now() - start;

    recordCall({
      service,
      endpoint,
      statusCode: response.status,
      latencyMs,
      success: response.ok,
      errorMessage: response.ok
        ? null
        : `${service}/${endpoint} returned HTTP ${response.status}`,
      countDailyUsage,
    });

    return response;
  } catch (error) {
    const latencyMs = Date.now() - start;

    recordCall({
      service,
      endpoint,
      statusCode: "NETWORK_ERROR",
      latencyMs,
      success: false,
      errorMessage: error.message,
      countDailyUsage: false,
    });

    throw error;
  }
}

async function fetchJsonWithMetrics(url, options = {}, context = {}) {
  const response = await fetchWithMetrics(url, options, context);
  const data = await response.json();

  return { response, data };
}

function summarizeLatency(latency) {
  const sorted = [...latency.recent].sort((a, b) => a - b);
  const p95Index = sorted.length > 0 ? Math.ceil(sorted.length * 0.95) - 1 : -1;

  return {
    count: latency.count,
    avg: latency.count > 0 ? Math.round(latency.total / latency.count) : null,
    min: latency.min,
    max: latency.max,
    p95: p95Index >= 0 ? sorted[p95Index] : null,
  };
}

function getMetricsSnapshot() {
  const snapshot = {};

  for (const [service, metrics] of Object.entries(metricsState)) {
    snapshot[service] = {
      totalCalls: metrics.totalCalls,
      success: metrics.success,
      failure: metrics.failure,
      quotaRejected: metrics.quotaRejected,
      byStatusCode: { ...metrics.byStatusCode },
      dailyUsage: JSON.parse(JSON.stringify(metrics.dailyUsage)),
      latencyMs: summarizeLatency(metrics.latencyMs),
      lastError: metrics.lastError,
      byEndpoint: {},
    };

    for (const [endpoint, endpointMetrics] of Object.entries(metrics.byEndpoint)) {
      snapshot[service].byEndpoint[endpoint] = {
        totalCalls: endpointMetrics.totalCalls,
        success: endpointMetrics.success,
        failure: endpointMetrics.failure,
        byStatusCode: { ...endpointMetrics.byStatusCode },
        latencyMs: summarizeLatency(endpointMetrics.latencyMs),
        lastError: endpointMetrics.lastError,
      };
    }
  }

  snapshot.openweatherQuota = {
    date: getLocalDateKey(),
    limit: getOpenWeatherQuotaLimit(),
    used: getDailyUsageTotal("openweather"),
  };

  return snapshot;
}

function getMetricsSummary() {
  const openWeatherMetrics = ensureServiceMetrics("openweather");
  const latency = summarizeLatency(openWeatherMetrics.latencyMs);
  const quotaLimit = getOpenWeatherQuotaLimit();
  const usageToday = getDailyUsageTotal("openweather");

  return {
    openWeather: {
      usageToday,
      quotaLimit,
      quotaPercent:
        quotaLimit && quotaLimit > 0
          ? Math.min(100, Math.round((usageToday / quotaLimit) * 100))
          : null,
      latencyAvgMs: latency.avg,
      latencyP95Ms: latency.p95,
      successCount: openWeatherMetrics.success,
      failureCount: openWeatherMetrics.failure,
      quotaRejected: openWeatherMetrics.quotaRejected,
      lastError: openWeatherMetrics.lastError,
      byStatusCode: { ...openWeatherMetrics.byStatusCode },
      sampleCount: latency.count,
    },
  };
}

function isQuotaExceededError(error) {
  return error instanceof QuotaExceededError || error?.code === "OPENWEATHER_DAILY_QUOTA_EXCEEDED";
}

module.exports = {
  QuotaExceededError,
  fetchWithMetrics,
  fetchJsonWithMetrics,
  getMetricsSnapshot,
  getMetricsSummary,
  getLocalDateKey,
  getOpenWeatherQuotaLimit,
  isQuotaExceededError,
};
