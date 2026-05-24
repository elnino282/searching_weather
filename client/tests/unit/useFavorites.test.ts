import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useFavorites } from "@/app/hooks/useFavorites";

const FAVORITES_STORAGE_KEY = "weather-app-favorites";

describe("useFavorites", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test("hydrates favorites from localStorage", async () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([{ id: "1", city: "Bangkok", country: "TH", addedAt: 1 }])
    );

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.favorites).toHaveLength(1));
    expect(result.current.isFavorite("bangkok")).toBe(true);
  });

  test("falls back safely for malformed localStorage data", async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, "{ malformed");
    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.favorites).toEqual([]));
  });

  test("adds favorites, prevents duplicates, and removes favorites", async () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("fav-1");
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite("Paris", "FR");
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.isFavorite("PARIS")).toBe(true);

    act(() => {
      result.current.addFavorite("paris", "FR");
    });
    expect(result.current.favorites).toHaveLength(1);

    act(() => {
      result.current.removeFavorite("fav-1");
    });
    expect(result.current.favorites).toHaveLength(0);
  });
});
