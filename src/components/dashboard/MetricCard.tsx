import { TrendingUp, TrendingDown } from "lucide-react";

type AccentColor = "healthy" | "warning" | "danger" | "neutral" | "info" | "success" | "teal";

interface MetricCardProps {
  label: string;
  value: number | string;
  trend?: { direction: "up" | "down"; percentage: number } | null;
  accentColor?: AccentColor;
  icon?: React.ComponentType<{ className?: string }>;
}

const ACCENT_BAR: Record<AccentColor, string> = {
  healthy: "bg-emerald-500",
  success: "bg-emerald-500",
  teal: "bg-teal-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  neutral: "bg-blue-500",
  info: "bg-blue-500",
};

const ACCENT_BG: Record<AccentColor, string> = {
  healthy: "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30",
  success: "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30",
  teal: "bg-teal-50/50 border-teal-100 dark:bg-teal-950/20 dark:border-teal-900/30",
  warning: "bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30",
  danger: "bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30",
  neutral: "bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30",
  info: "bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30",
};

const ICON_COLOR: Record<AccentColor, string> = {
  healthy: "text-emerald-600 dark:text-emerald-400",
  success: "text-emerald-600 dark:text-emerald-400",
  teal: "text-teal-600 dark:text-teal-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
  neutral: "text-blue-600 dark:text-blue-400",
  info: "text-blue-600 dark:text-blue-400",
};

const ICON_BG: Record<AccentColor, string> = {
  healthy: "bg-emerald-500/10 dark:bg-emerald-500/20",
  success: "bg-emerald-500/10 dark:bg-emerald-500/20",
  teal: "bg-teal-500/10 dark:bg-teal-500/20",
  warning: "bg-amber-500/10 dark:bg-amber-500/20",
  danger: "bg-rose-500/10 dark:bg-rose-500/20",
  neutral: "bg-blue-500/10 dark:bg-blue-500/20",
  info: "bg-blue-500/10 dark:bg-blue-500/20",
};

export function MetricCard({ label, value, trend, accentColor = "neutral", icon: Icon }: MetricCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl border ${ACCENT_BG[accentColor]} px-5 py-4.5 shadow-xs transition-all duration-300 hover:shadow-sm hover:scale-[1.01] flex flex-col justify-between h-28`}>
      {/* Thick left solid bar matching screenshot exactly */}
      <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${ACCENT_BAR[accentColor]}`} />
      
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground/80">{label}</p>
        {Icon && (
          <div className={`p-1.5 rounded-lg ${ICON_BG[accentColor]}`}>
            <Icon className={`h-4 w-4 ${ICON_COLOR[accentColor]}`} />
          </div>
        )}
      </div>
      
      <div className="flex items-baseline justify-between mt-1">
        <span className="font-sans text-2xl font-bold leading-none text-foreground tracking-tight">
          {value}
        </span>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${trend.direction === "up" ? "text-emerald-600" : "text-rose-600"}`}>
            {trend.direction === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trend.percentage}%
          </span>
        )}
      </div>
    </div>
  );
}
