"use client";
import React from "react";
import { IoStar, IoStarOutline } from "react-icons/io5";
import { useFavorites } from "@/app/hooks/useFavorites";

const FavoriteButton = ({
  city,
  country,
}: {
  city: string;
  country: string;
}) => {
  const { addFavorite, removeFavorite, isFavorite, favorites } = useFavorites();
  const favorited = isFavorite(city);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorited) {
      const fav = favorites.find(
        (f) => f.city.toLowerCase() === city.toLowerCase()
      );
      if (fav) removeFavorite(fav.id);
    } else {
      addFavorite(city, country);
    }
  };

  return (
    <button
      type="button"
      className="favorite-button"
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      onClick={handleClick}
    >
      {favorited ? <IoStar /> : <IoStarOutline />}
    </button>
  );
};

export default FavoriteButton;
