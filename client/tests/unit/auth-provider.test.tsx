import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import AuthProvider, { useAuth } from "@/app/context/auth-provider";

const GUEST_SESSION_KEY = "weather-app-auth-guest";

function mockJsonResponse(payload: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => payload,
  } as Response;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

describe("auth-provider", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  test("falls back to guest session when server session is unavailable", async () => {
    sessionStorage.setItem(GUEST_SESSION_KEY, "true");
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.role).toBe("guest");
  });

  test("guest login updates state and persists session marker", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/auth/login")) {
        return mockJsonResponse({ role: "guest" });
      }
      return mockJsonResponse({ role: "guest" });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loginGuest();
    });

    expect(result.current.role).toBe("guest");
    expect(sessionStorage.getItem(GUEST_SESSION_KEY)).toBe("true");
  });

  test("admin login success transitions role to admin", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const target = String(url);
      if (target.includes("/auth/login")) {
        return mockJsonResponse({ role: "admin" });
      }
      return mockJsonResponse({ role: "guest" });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loginAdmin("correct-password");
    });

    expect(result.current.role).toBe("admin");
    expect(sessionStorage.getItem(GUEST_SESSION_KEY)).toBeNull();
  });

  test("admin login failure keeps non-admin state", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const target = String(url);
      if (target.includes("/auth/login")) {
        return mockJsonResponse({ error: "Invalid admin credentials." }, false, 401);
      }
      return mockJsonResponse({ role: "guest" });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.loginAdmin("wrong-password");
      })
    ).rejects.toThrow("Invalid admin credentials.");

    expect(result.current.role).not.toBe("admin");
  });

  test("logout clears local auth state", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const target = String(url);
      if (target.includes("/auth/login")) {
        return mockJsonResponse({ role: "admin" });
      }
      if (target.includes("/auth/logout")) {
        return mockJsonResponse({ role: "guest" });
      }
      return mockJsonResponse({ role: "guest" });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loginAdmin("correct-password");
    });
    expect(result.current.role).toBe("admin");

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.role).toBeNull();
    expect(sessionStorage.getItem(GUEST_SESSION_KEY)).toBeNull();
  });
});
