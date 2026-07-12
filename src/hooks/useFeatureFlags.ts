import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { resolveFeatureFlagsSync } from "@/utils/subscriptionUtils";
import type { FeatureFlags } from "@/types/subscription";

export interface ResolvedFeatureFlags extends FeatureFlags {
  planName: string;
  planId: string;
  status: string;
}

export function useFeatureFlags(): ResolvedFeatureFlags {
  const { settings } = useSystemSettings();
  return resolveFeatureFlagsSync(settings);
}
