import { useDemo } from "./useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { getSectorConfig, SectorConfig } from "@/constants/sectors";
import { useMemo } from "react";

export function useSector() {
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  
  const activeSettings = isDemo ? demoOnboarding : liveSettings;
  
  const config = useMemo(() => {
    return getSectorConfig(activeSettings?.businessType);
  }, [activeSettings?.businessType]);

  return {
    ...config,
    type: activeSettings?.businessType || "general",
    t: (key: keyof SectorConfig["labels"]) => config.labels[key]
  };
}
