"use client";
import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { FavoriteLocation } from "@/app/types/types";

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<FavoriteLocation[]>(
    "weather-app-favorites",
    []
  );

  const addFavorite = useCallback(
    (city: string, country: string) => {
      setFavorites((prev) => {
        if (prev.some((f) => f.city.toLowerCase() === city.toLowerCase())) {
          return prev;
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            city,
            country,
            addedAt: Date.now(),
          },
        ];
      });
    },
    [setFavorites]
  );

  const removeFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    },
    [setFavorites]
  );

  const isFavorite = useCallback(
    (city: string) => {
      return favorites.some(
        (f) => f.city.toLowerCase() === city.toLowerCase()
      );
    },
    [favorites]
  );

  return { favorites, addFavorite, removeFavorite, isFavorite };
}
