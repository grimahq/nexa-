import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CATEGORY_PRESETS,
  DISTRIBUTOR_PRESETS,
  type CategoryPreset,
} from "@/utils/categorySuggestions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Sparkles,
  Wine,
  Pill,
  ShoppingBag,
  Smartphone,
  Scissors,
  Sprout,
  Building2,
  CheckCircle2,
  Truck,
  Layers,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/app/super-admin/categories")({
  component: SuperAdminCategoriesPage,
});

function SuperAdminCategoriesPage() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("beverages");
  const [searchQuery, setSearchQuery] = useState("");

  const activePreset = CATEGORY_PRESETS.find((p) => p.id === selectedPresetId) || CATEGORY_PRESETS[0];

  const categoryDistributors = DISTRIBUTOR_PRESETS.filter(
    (d) => d.category === activePreset.id || activePreset.name.toLowerCase().includes(d.category)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-500" />
            Global Categories & Industry Presets
          </h2>
          <p className="text-xs text-muted-foreground">
            System-wide auto-categorization rules, supported measurement units (cl, ltr, kg, pcs), and default distributor connections.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 font-mono text-xs w-fit">
          {CATEGORY_PRESETS.length} Active Industry Presets
        </Badge>
      </div>

      {/* Categories Horizontal Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
        {CATEGORY_PRESETS.map((cat) => {
          const isSelected = cat.id === activePreset.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedPresetId(cat.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                isSelected
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30"
                  : "bg-card text-card-foreground hover:bg-muted/50 border-border"
              }`}
            >
              <div className="text-2xl">{cat.emoji}</div>
              <div>
                <h4 className="font-bold text-xs line-clamp-1">{cat.name}</h4>
                <p className={`text-[10px] ${isSelected ? "text-emerald-100" : "text-muted-foreground"}`}>
                  {cat.supportedUnits.length} units
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Category Detail Deck */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Category Details & Units */}
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-3xl">{activePreset.emoji}</span>
              <Badge variant="secondary" className="font-bold text-xs uppercase">
                Default: {activePreset.defaultUnit}
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold">{activePreset.name}</CardTitle>
            <CardDescription className="text-xs">{activePreset.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <h4 className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                Supported Units (Volume, Weight & Count):
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {activePreset.supportedUnits.map((unit) => (
                  <Badge key={unit} variant="outline" className="bg-muted/40 font-mono text-[11px] px-2 py-0.5">
                    {unit}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                AI Keyword Triggers:
              </h4>
              <div className="flex flex-wrap gap-1">
                {activePreset.keywords.map((kw, idx) => (
                  <span key={`${kw}-${idx}`} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-md font-mono">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Built-in Products & Distributors */}
        <div className="md:col-span-2 space-y-6">
          {/* Pre-packaged Products */}
          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-500" />
                Built-In Product Library Templates ({activePreset.builtInProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[220px] overflow-y-auto">
                {activePreset.builtInProducts.map((prod, idx) => (
                  <div key={idx} className="p-3 px-4 flex items-center justify-between text-xs hover:bg-muted/30">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{prod.emoji || "📦"}</span>
                      <div>
                        <h5 className="font-bold text-foreground">{prod.name}</h5>
                        <p className="text-[10px] text-muted-foreground">{prod.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {prod.defaultUnit}
                      </Badge>
                      {prod.estimatedPrice && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                          ~₦{prod.estimatedPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Regional Verified Distributors */}
          <Card className="shadow-sm">
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Verified Distributors for {activePreset.name}
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Official manufacturer depots automatically offered during product setup
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {categoryDistributors.length} Registered Depots
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryDistributors.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No official depot presets registered for this category yet.</p>
              ) : (
                categoryDistributors.map((dist) => (
                  <div key={dist.id} className="p-3 rounded-xl border bg-card/60 flex items-center justify-between text-xs gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-foreground">{dist.name}</h5>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-1 py-0">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Verified
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Contact: {dist.contactPerson} ({dist.contactPhone}) • {dist.state} Hub
                      </p>
                      <div className="flex gap-1 flex-wrap pt-0.5">
                        {dist.brands.map((b) => (
                          <span key={b} className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-medium">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-muted-foreground block">Lead Time: {dist.deliveryLeadDays} day(s)</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Min: ₦{dist.minOrderValueNgn.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
