"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useContext, useEffect } from "react";
import { UnitContext, UnitContextType } from "../context/unit-provider";
import { UnitsType } from "../types/types";

const Toggle = ({
  option1,
  option2,
  setOptionOneAsDefault = true,
}: {
  option1: { name: string; value: string };
  option2: { name: string; value: string };
  setOptionOneAsDefault?: boolean;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { units, setUnits } = useContext<UnitContextType>(UnitContext);
  const fallbackOption = setOptionOneAsDefault ? option1 : option2;
  const selectedOption =
    units === option1.value ? option1 : units === option2.value ? option2 : fallbackOption;

  // Toggle the option based on current units value
  const toggleOption = () => {
    const newOption = units === option1.value ? option2 : option1;
    const params = new URLSearchParams(searchParams.toString());

    setUnits(newOption.value as UnitsType); // Update the units in the context provider
    params.set("units", newOption.value);

    router.push(`?${params.toString().toLowerCase()}`, {
      scroll: false,
    });
  };

  // Sync toggle state with query param on first render and external navigation
  useEffect(() => {
    const queryUnits = searchParams.get("units");
    if (
      (queryUnits === option1.value || queryUnits === option2.value) &&
      queryUnits !== units
    ) {
      setUnits(queryUnits as UnitsType);
    }
  }, [option1.value, option2.value, searchParams, setUnits, units]);

  return (
    <button
      type="button"
      className={`toggle-container ${units}`}
      onClick={toggleOption}
      aria-label={`Switch temperature unit. Current unit ${selectedOption.name}.`}
    >
      <span className="toggle-option option-left">{option1.name}</span>
      <span className="toggle-option option-right">{option2.name}</span>
      <span className={`toggle-button ${units}`}>
        <span className="toggle-icon">{selectedOption.name}</span>
      </span>
    </button>
  );
};

export default Toggle;
