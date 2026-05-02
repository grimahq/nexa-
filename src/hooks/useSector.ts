import { useDemo } from "./useDemo";
import { getSectorConfig, SectorConfig } from "@/constants/sectors";
import { useMemo } from "react";

export function useSector() {
  const { onboarding } = useDemo();
  
  const config = useMemo(() => {
    return getSectorConfig(onboarding?.businessType);
  }, [onboarding?.businessType]);

  return {
    ...config,
    type: onboarding?.businessType || "general",
    t: (key: keyof SectorConfig["labels"]) => config.labels[key]
  };
}
