import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useAlertPreferences } from "@/app/hooks/useAlertPreferences";

const ALERT_STORAGE_KEY = "weather-app-alerts";
const ALERT_SYNC_DEBOUNCE_MS = 400;

function createAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert-1",
    enabled: true,
    metric: "temp",
    comparator: "above",
    threshold: 30,
    location: "Bangkok",
    units: "metric",
    ...overrides,
  };
}

describe("useAlertPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })) as unknown as typeof fetch
    );
  });

  test("hydrates alerts from localStorage", async () => {
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify([createAlert()]));
    const { result } = renderHook(() => useAlertPreferences("token-1"));

    await waitFor(() => expect(result.current.alertsHydrated).toBe(true));
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].location).toBe("Bangkok");
  });

  test("falls back safely when localStorage payload is malformed", async () => {
    localStorage.setItem(ALERT_STORAGE_KEY, "{ invalid json");
    const { result } = renderHook(() => useAlertPreferences("token-1"));

    await waitFor(() => expect(result.current.alertsHydrated).toBe(true));
    expect(result.current.alerts).toEqual([]);
  });

  test("syncs updated preferences to backend when token exists", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("generated-id");

    const { result } = renderHook(() => useAlertPreferences("token-2"));
    await waitFor(() => expect(result.current.alertsHydrated).toBe(true));

    act(() => {
      result.current.addAlert(
        createAlert({
          id: undefined,
          location: "Paris",
        }) as never
      );
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {
      timeout: ALERT_SYNC_DEBOUNCE_MS + 1500,
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.fcmToken).toBe("token-2");
    expect(payload.alerts).toHaveLength(1);
    expect(payload.alerts[0].id).toBe("generated-id");
  });

  test("does not sync initial empty state before hydrate", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { result } = renderHook(() => useAlertPreferences("token-3"));
    await waitFor(() => expect(result.current.alertsHydrated).toBe(true));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ALERT_SYNC_DEBOUNCE_MS + 200));
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("toggle updates enabled flag and persists to localStorage", async () => {
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify([createAlert()]));
    const { result } = renderHook(() => useAlertPreferences());

    await waitFor(() => expect(result.current.alertsHydrated).toBe(true));
    act(() => {
      result.current.toggleAlert("alert-1");
    });

    expect(result.current.alerts[0].enabled).toBe(false);
    const stored = JSON.parse(localStorage.getItem(ALERT_STORAGE_KEY) || "[]");
    expect(stored[0].enabled).toBe(false);
  });
});
