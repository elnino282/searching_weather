"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface FeatureFlags {
  aqiEnabled: boolean;
}

interface PublicConfig {
  features: FeatureFlags;
}

interface FeatureFlagsContextType {
  features: FeatureFlags;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_FEATURES: FeatureFlags = {
  aqiEnabled: true,
};
const BACKEND_URI =
  process.env.NEXT_PUBLIC_BACKEND_URI ?? "http://localhost:4000/api";
const POLLING_INTERVAL_MS = 30 * 1000;

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
  features: DEFAULT_FEATURES,
  loading: true,
  refresh: async () => {},
});

export const useFeatureFlags = () => useContext(FeatureFlagsContext);

function normalizeConfig(config: Partial<PublicConfig> | null): PublicConfig {
  return {
    features: {
      ...DEFAULT_FEATURES,
      ...(config?.features || {}),
    },
  };
}

export default function FeatureFlagsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);
  const [sseFailed, setSseFailed] = useState(false);

  const applyConfig = useCallback((config: Partial<PublicConfig> | null) => {
    const normalized = normalizeConfig(config);
    setFeatures(normalized.features);
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch(`${BACKEND_URI}/config/public`, {
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to load feature config.");
    }

    const config = (await response.json()) as PublicConfig;
    applyConfig(config);
  }, [applyConfig]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialConfig = async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (error) {
        console.error("Failed to load public config:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialConfig();

    return () => {
      isMounted = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setSseFailed(true);
      return;
    }

    const eventSource = new EventSource(`${BACKEND_URI}/config/stream`, {
      withCredentials: true,
    });

    const handleConfig = (event: MessageEvent<string>) => {
      try {
        applyConfig(JSON.parse(event.data) as PublicConfig);
        setSseFailed(false);
      } catch (error) {
        console.error("Invalid feature config event:", error);
      }
    };

    eventSource.addEventListener("config", handleConfig);
    eventSource.onopen = () => setSseFailed(false);
    eventSource.onerror = () => setSseFailed(true);

    return () => {
      eventSource.removeEventListener("config", handleConfig);
      eventSource.close();
    };
  }, [applyConfig]);

  useEffect(() => {
    if (!sseFailed) return;

    const interval = window.setInterval(() => {
      refresh().catch((error) => {
        console.error("Feature config polling failed:", error);
      });
    }, POLLING_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [refresh, sseFailed]);

  const value = useMemo(
    () => ({
      features,
      loading,
      refresh,
    }),
    [features, loading, refresh]
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}
