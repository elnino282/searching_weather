const {
  db,
  isFirebaseAdminReady,
  firebaseInitMessage,
} = require("./firebase-admin");
const { fetchJsonWithMetrics } = require("./api-metrics");

const CONFIG_COLLECTION = "runtimeConfig";
const PUBLIC_CONFIG_DOC = "public";
const SECRETS_CONFIG_DOC = "secrets";
const CONFIG_CACHE_TTL_MS = 30 * 1000;
const OPENWEATHER_KEY_VALIDATE_TIMEOUT_MS = 7000;

const DEFAULT_PUBLIC_CONFIG = {
  features: {
    aqiEnabled: true,
  },
};
const KNOWN_FEATURE_FLAGS = new Set(["aqiEnabled"]);

let cachedPublicConfig = clone(DEFAULT_PUBLIC_CONFIG);
let cachedSecretsConfig = getEnvSecrets();
let cachedSecretSources = getEnvSecretSources();
let lastLoadedAt = 0;
let lastLoadError = null;
const publicConfigSubscribers = new Set();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getEnvSecrets() {
  return {
    openWeatherApiKey: process.env.OPEN_WEATHER_API_KEY || "",
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || "",
  };
}

function getEnvSecretSources() {
  const envSecrets = getEnvSecrets();
  return {
    openWeatherApiKey: envSecrets.openWeatherApiKey ? "env" : "none",
    googlePlacesApiKey: envSecrets.googlePlacesApiKey ? "env" : "none",
  };
}

function mergePublicConfig(base, override) {
  const source = override && typeof override === "object" ? override : {};
  return {
    ...base,
    ...source,
    features: {
      ...base.features,
      ...(source.features || {}),
    },
  };
}

function notifyPublicConfigSubscribers(publicConfig) {
  const snapshot = clone(publicConfig);
  for (const subscriber of publicConfigSubscribers) {
    try {
      subscriber(snapshot);
    } catch (error) {
      console.warn(`[RuntimeConfig] Public config subscriber failed: ${error.message}`);
    }
  }
}

function subscribePublicConfig(listener) {
  publicConfigSubscribers.add(listener);
  return () => {
    publicConfigSubscribers.delete(listener);
  };
}

function normalizeSecretsConfig(rawSecrets) {
  const envSecrets = getEnvSecrets();
  const envSources = getEnvSecretSources();
  const source = rawSecrets && typeof rawSecrets === "object" ? rawSecrets : {};
  const firestoreOpenWeatherKey =
    typeof source.openWeatherApiKey === "string" && source.openWeatherApiKey.trim()
      ? source.openWeatherApiKey.trim()
      : "";
  const firestoreGooglePlacesKey =
    typeof source.googlePlacesApiKey === "string" && source.googlePlacesApiKey.trim()
      ? source.googlePlacesApiKey.trim()
      : "";

  return {
    secrets: {
      openWeatherApiKey: firestoreOpenWeatherKey || envSecrets.openWeatherApiKey,
      googlePlacesApiKey: firestoreGooglePlacesKey || envSecrets.googlePlacesApiKey,
    },
    sources: {
      openWeatherApiKey: firestoreOpenWeatherKey ? "firestore" : envSources.openWeatherApiKey,
      googlePlacesApiKey: firestoreGooglePlacesKey ? "firestore" : envSources.googlePlacesApiKey,
    },
  };
}

async function refreshRuntimeConfig() {
  if (!isFirebaseAdminReady || !db) {
    cachedPublicConfig = clone(DEFAULT_PUBLIC_CONFIG);
    cachedSecretsConfig = getEnvSecrets();
    cachedSecretSources = getEnvSecretSources();
    lastLoadedAt = Date.now();
    lastLoadError = firebaseInitMessage || "Firebase Admin is not ready.";
    return getRuntimeConfigSnapshot();
  }

  try {
    const [publicSnap, secretsSnap] = await Promise.all([
      db.collection(CONFIG_COLLECTION).doc(PUBLIC_CONFIG_DOC).get(),
      db.collection(CONFIG_COLLECTION).doc(SECRETS_CONFIG_DOC).get(),
    ]);

    cachedPublicConfig = mergePublicConfig(
      clone(DEFAULT_PUBLIC_CONFIG),
      publicSnap.exists ? publicSnap.data() : null
    );
    const normalizedSecrets = normalizeSecretsConfig(
      secretsSnap.exists ? secretsSnap.data() : null
    );
    cachedSecretsConfig = normalizedSecrets.secrets;
    cachedSecretSources = normalizedSecrets.sources;
    lastLoadedAt = Date.now();
    lastLoadError = null;
  } catch (error) {
    cachedPublicConfig = clone(DEFAULT_PUBLIC_CONFIG);
    if (!cachedSecretsConfig.openWeatherApiKey && !cachedSecretsConfig.googlePlacesApiKey) {
      cachedSecretsConfig = getEnvSecrets();
      cachedSecretSources = getEnvSecretSources();
    }
    lastLoadedAt = Date.now();
    lastLoadError = error.message;
    console.warn(
      `[RuntimeConfig] Failed to read Firestore config. Using env/default fallback: ${error.message}`
    );
  }

  return getRuntimeConfigSnapshot();
}

async function ensureRuntimeConfigLoaded({ force = false } = {}) {
  const isFresh = Date.now() - lastLoadedAt < CONFIG_CACHE_TTL_MS;
  if (!force && lastLoadedAt > 0 && isFresh) {
    return getRuntimeConfigSnapshot();
  }

  return refreshRuntimeConfig();
}

function getRuntimeConfigSnapshot() {
  return {
    public: clone(cachedPublicConfig),
    secrets: {
      hasOpenWeatherApiKey: Boolean(cachedSecretsConfig.openWeatherApiKey),
      hasGooglePlacesApiKey: Boolean(cachedSecretsConfig.googlePlacesApiKey),
      openWeatherApiKeySource: cachedSecretSources.openWeatherApiKey,
    },
    status: {
      source: isFirebaseAdminReady && db && !lastLoadError ? "firestore" : "fallback",
      firebaseReady: Boolean(isFirebaseAdminReady && db),
      lastLoadedAt,
      lastLoadError,
    },
  };
}

async function getPublicConfig(options) {
  await ensureRuntimeConfigLoaded(options);
  return clone(cachedPublicConfig);
}

function validateFeaturePatch(featuresPatch) {
  if (!featuresPatch || typeof featuresPatch !== "object" || Array.isArray(featuresPatch)) {
    throw new Error("features must be an object.");
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(featuresPatch)) {
    if (!KNOWN_FEATURE_FLAGS.has(key)) {
      throw new Error(`Unknown feature flag: ${key}`);
    }

    if (typeof value !== "boolean") {
      throw new Error(`${key} must be a boolean.`);
    }

    sanitized[key] = value;
  }

  return sanitized;
}

async function updatePublicFeatures(featuresPatch) {
  const sanitizedFeatures = validateFeaturePatch(featuresPatch);
  if (Object.keys(sanitizedFeatures).length === 0) {
    return getPublicConfig();
  }

  if (!isFirebaseAdminReady || !db) {
    const error = new Error("Firestore runtime config is not available.");
    error.statusCode = 503;
    throw error;
  }

  const currentPublicConfig = await getPublicConfig({ force: true });
  const nextPublicConfig = mergePublicConfig(currentPublicConfig, {
    features: {
      ...currentPublicConfig.features,
      ...sanitizedFeatures,
    },
  });

  await db.collection(CONFIG_COLLECTION).doc(PUBLIC_CONFIG_DOC).set(
    {
      features: nextPublicConfig.features,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  cachedPublicConfig = nextPublicConfig;
  lastLoadedAt = Date.now();
  lastLoadError = null;
  notifyPublicConfigSubscribers(cachedPublicConfig);

  return clone(cachedPublicConfig);
}

async function isAqiEnabled(options) {
  const publicConfig = await getPublicConfig(options);
  return publicConfig.features?.aqiEnabled !== false;
}

async function getOpenWeatherApiKey(options) {
  await ensureRuntimeConfigLoaded(options);
  return cachedSecretsConfig.openWeatherApiKey;
}

function maskSecret(value) {
  if (!value) return null;
  if (value.length <= 8) return `${value.slice(0, 2)}***${value.slice(-2)}`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function maskOpenWeatherApiKey(options) {
  await ensureRuntimeConfigLoaded(options);
  return maskSecret(cachedSecretsConfig.openWeatherApiKey);
}

async function getOpenWeatherApiKeyInfo(options) {
  await ensureRuntimeConfigLoaded(options);
  return {
    maskedKey: maskSecret(cachedSecretsConfig.openWeatherApiKey),
    source: cachedSecretSources.openWeatherApiKey,
  };
}

function validateOpenWeatherKeyFormat(newKey) {
  if (typeof newKey !== "string") {
    return "key must be a string.";
  }

  const trimmedKey = newKey.trim();
  if (!trimmedKey) {
    return "key is required.";
  }

  if (trimmedKey.length < 16 || trimmedKey.length > 128) {
    return "key length is invalid.";
  }

  if (!/^[A-Za-z0-9_-]+$/.test(trimmedKey)) {
    return "key contains invalid characters.";
  }

  return null;
}

async function validateOpenWeatherKey(newKey) {
  const trimmedKey = typeof newKey === "string" ? newKey.trim() : "";
  const formatError = validateOpenWeatherKeyFormat(trimmedKey);
  if (formatError) {
    const error = new Error(formatError);
    error.statusCode = 400;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENWEATHER_KEY_VALIDATE_TIMEOUT_MS);

  try {
    const validateUrl = new URL("http://api.openweathermap.org/geo/1.0/direct");
    validateUrl.searchParams.set("q", "London");
    validateUrl.searchParams.set("limit", "1");
    validateUrl.searchParams.set("appid", trimmedKey);

    const { response, data } = await fetchJsonWithMetrics(
      validateUrl.toString(),
      { signal: controller.signal },
      {
        service: "openweather",
        endpoint: "validate_key",
        countDailyUsage: false,
      }
    );

    if (!response.ok || !Array.isArray(data)) {
      const error = new Error("OpenWeather rejected the provided key.");
      error.statusCode = 400;
      throw error;
    }

    return true;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("OpenWeather key validation timed out.");
      timeoutError.statusCode = 400;
      throw timeoutError;
    }

    if (error.statusCode) {
      throw error;
    }

    const validationError = new Error("Unable to validate OpenWeather key.");
    validationError.statusCode = 400;
    throw validationError;
  } finally {
    clearTimeout(timeout);
  }
}

async function updateOpenWeatherApiKey(newKey) {
  const trimmedKey = typeof newKey === "string" ? newKey.trim() : "";
  const formatError = validateOpenWeatherKeyFormat(trimmedKey);
  if (formatError) {
    const error = new Error(formatError);
    error.statusCode = 400;
    throw error;
  }

  if (!isFirebaseAdminReady || !db) {
    const error = new Error("Firestore runtime config is not available.");
    error.statusCode = 503;
    throw error;
  }

  await db.collection(CONFIG_COLLECTION).doc(SECRETS_CONFIG_DOC).set(
    {
      openWeatherApiKey: trimmedKey,
      openWeatherUpdatedAt: new Date(),
    },
    { merge: true }
  );

  cachedSecretsConfig = {
    ...cachedSecretsConfig,
    openWeatherApiKey: trimmedKey,
  };
  cachedSecretSources = {
    ...cachedSecretSources,
    openWeatherApiKey: "firestore",
  };
  lastLoadedAt = Date.now();
  lastLoadError = null;

  return getOpenWeatherApiKeyInfo();
}

async function getGooglePlacesApiKey(options) {
  await ensureRuntimeConfigLoaded(options);
  return cachedSecretsConfig.googlePlacesApiKey;
}

module.exports = {
  DEFAULT_PUBLIC_CONFIG,
  refreshRuntimeConfig,
  ensureRuntimeConfigLoaded,
  getRuntimeConfigSnapshot,
  getPublicConfig,
  updatePublicFeatures,
  subscribePublicConfig,
  isAqiEnabled,
  getOpenWeatherApiKey,
  getOpenWeatherApiKeyInfo,
  maskOpenWeatherApiKey,
  updateOpenWeatherApiKey,
  validateOpenWeatherKey,
  getGooglePlacesApiKey,
};
