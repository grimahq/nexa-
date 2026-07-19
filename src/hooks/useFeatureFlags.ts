import { useMemo } from "react";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { resolveFeatureFlagsSync } from "@/utils/subscriptionUtils";
import type { FeatureFlags } from "@/types/subscription";

export interface ResolvedFeatureFlags extends FeatureFlags {
  planName: string;
  planId: string;
  status: string;
}

export function useFeatureFlags(): { flags: ResolvedFeatureFlags } {
  const { settings, plans } = useSystemSettings();
  const flags = useMemo(() => resolveFeatureFlagsSync(settings, plans), [settings, plans]);
  return useMemo(() => ({ flags }), [flags]);
}
