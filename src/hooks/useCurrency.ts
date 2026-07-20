import { useMemo } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

export interface CurrencyDetails {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyDetails[] = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira (₦)" },
  { code: "USD", symbol: "$", name: "US Dollar ($)" },
  { code: "EUR", symbol: "€", name: "Euro (€)" },
  { code: "GBP", symbol: "£", name: "British Pound (£)" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi (₵)" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling (KSh)" },
  { code: "ZAR", symbol: "R", name: "South African Rand (R)" },
];

export function useCurrency() {
  const { isDemo, onboarding } = useDemo();
  const { settings } = useSystemSettings();

  const currencyCode = useMemo(() => {
    if (isDemo) {
      return onboarding.currency || "NGN";
    }
    return settings.currency || "NGN";
  }, [isDemo, onboarding.currency, settings.currency]);

  const currency = useMemo(() => {
    return CURRENCIES.find((c) => c.code === currencyCode) || { code: "NGN", symbol: "₦", name: "Nigerian Naira (₦)" };
  }, [currencyCode]);

  const formatCurrency = useMemo(() => {
    return (v: number, fractionDigits = 0) => {
      try {
        return new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: currency.code,
          maximumFractionDigits: fractionDigits,
        }).format(v);
      } catch (e) {
        // Fallback formatting if browser/runtime lacks support
        return `${currency.symbol}${v.toLocaleString()}`;
      }
    };
  }, [currency]);

  return {
    currencyCode: currency.code,
    currencySymbol: currency.symbol,
    formatCurrency,
  };
}
