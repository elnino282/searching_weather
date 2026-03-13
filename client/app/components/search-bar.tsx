"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { IoMdSearch } from "react-icons/io";
import { formatLocationName } from "../utils/utility-functions";

const requestOptions: RequestInit = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    orderBy: "name",
  }),
  redirect: "follow",
};

interface City {
  name: string;
  country: string;
  population: number;
}

const citiesURL =
  "https://countriesnow.space/api/v0.1/countries/population/cities/filter";

const SearchBar = ({
  defaultValue,
  onSubmit,
}: {
  defaultValue?: string;
  onSubmit?: () => void;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState<string>(defaultValue ?? "");
  const [viewSuggestions, setViewSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<
    { name: string; country: string }[]
  >([]);
  const [cityList, setCityList] = useState<City[]>([]);
  const currentLocation = useRef<string>("");

  const handleSubmit = (search: string) => {
    if (search.length > 0 && checkIfCity(search) === true) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("location", search);
      router.push(`?${params.toString()}`, {
        scroll: false,
      });
      currentLocation.current = search;
      setViewSuggestions(false); // Hide suggestions after submitting
      onSubmit?.();
    }
  };

  const checkIfCity = (location: string) => {
    const cities = cityList.map((city) => city.name.toLowerCase());
    return cities.includes(location.toLowerCase());
  };

  const handleChange = (location: string) => {
    setSearch(location);
    const searchSuggestions = cityList.filter((city) => {
      return city.name.toLowerCase().includes(location.toLowerCase());
    });
    setSuggestions(searchSuggestions.slice(0, 20));
  };

  const handleSuggestionClick = (suggestionName: string) => {
    setSearch(suggestionName);
    handleSubmit(suggestionName);
  };

  // Close the suggestions when clicked outside
  const handleBlur = (e: React.FocusEvent) => {
    // Only close suggestions if the click is not within the suggestions list
    if (!e.relatedTarget || !e.relatedTarget.closest(".suggestions-list")) {
      setViewSuggestions(false);
    }
  };

  const handleFocus = () => {
    if (currentLocation.current === search) {
      setSearch("");
      handleChange("");
    }
    setViewSuggestions(true);
  };

  useEffect(() => {
    const fetchCities = async () => {
      const response = await fetch(citiesURL, requestOptions).then((response) =>
        response.json()
      );
      const cities = response.data.map(
        (cityInfo: {
          city: string;
          country: string;
          populationCounts: { value: string }[];
        }) => {
          return {
            name: formatLocationName(cityInfo.city),
            country: formatLocationName(cityInfo.country),
            population: Number.parseInt(cityInfo.populationCounts[0].value),
          };
        }
      );
      setCityList(
        cities.sort((a: City, b: City) => b.population - a.population)
      );
    };

    fetchCities();
  }, []);

  return (
    <div className="search-wrapper" onBlur={handleBlur} tabIndex={-1}>
      <form
        className="search-bar-container"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(search);
        }}
      >
        <input
          className="search-bar"
          type="search"
          value={search}
          name="search"
          placeholder="Search city..."
          aria-label="Search city"
          onChange={(e) => handleChange(e.target.value)}
          size={17}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit(search);
            }
          }}
          onFocus={() => handleFocus()}
        />
        <button
          type="submit"
          className="search-button"
          aria-label="Search weather by city"
          onClick={() => {
            handleSubmit(search);
          }}
        >
          <p>
            <IoMdSearch />
          </p>
        </button>
      </form>
      {viewSuggestions && (
        <ul className="suggestions-list" role="listbox">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="suggestion-container">
              <button
                type="button"
                className="suggestion"
                onMouseDown={() => handleSuggestionClick(suggestion.name)}
              >
                <p>
                  {suggestion.name}, {suggestion.country}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
