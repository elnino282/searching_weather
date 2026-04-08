"use client";
import React from "react";
import { IoClose, IoStar } from "react-icons/io5";
import { ImLocation } from "react-icons/im";
import { useRouter, useSearchParams } from "next/navigation";
import { useFavorites } from "@/app/hooks/useFavorites";
import { formatStringToPath } from "@/app/utils/utility-functions";

const FavoritesPanel = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { favorites, removeFavorite } = useFavorites();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleNavigate = (city: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", formatStringToPath(city));
    router.push(`/?${params.toString()}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="favorites-panel">
      <div className="favorites-panel-header">
        <h4>
          <IoStar /> Favorites
        </h4>
        <button
          type="button"
          className="favorites-close-button"
          onClick={onClose}
          aria-label="Close favorites"
        >
          <IoClose />
        </button>
      </div>
      {favorites.length === 0 ? (
        <p className="favorites-empty">
          No favorite locations yet. Click the star icon next to a city name to
          save it.
        </p>
      ) : (
        <ul className="favorites-list">
          {favorites.map((fav) => (
            <li key={fav.id} className="favorite-item">
              <button
                type="button"
                className="favorite-navigate"
                onClick={() => handleNavigate(fav.city)}
              >
                <ImLocation />
                <span>
                  {fav.city}, {fav.country}
                </span>
              </button>
              <button
                type="button"
                className="favorite-remove"
                onClick={() => removeFavorite(fav.id)}
                aria-label={`Remove ${fav.city}`}
              >
                <IoClose />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FavoritesPanel;
