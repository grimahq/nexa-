import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  UtensilsCrossed,
  Warehouse,
  Package,
  Sprout,
  Smartphone,
  Scissors,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Plus,
  Pill,
  Factory,
  Scan,
  ClipboardPen,
  Rocket,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BulkProductEntry, type PendingProduct } from "./BulkProductEntry";

const BUSINESS_TYPES = [
  { id: "retail", label: "Retail / POS", icon: Store, description: "Physical store selling to customers" },
  { id: "restaurant", label: "Restaurant / Food", icon: UtensilsCrossed, description: "Food service with menu items" },
  { id: "agriculture", label: "Agriculture", icon: Sprout, description: "Farm products, grains, and livestock" },
  { id: "social_commerce", label: "Online Vendor", icon: Smartphone, description: "Sell on WhatsApp and Facebook" },
  { id: "pharmacy", label: "Pharmacy / Health", icon: Pill, description: "Medicines, medical supplies & prescriptions" },
  { id: "manufacturing", label: "Manufacturing", icon: Factory, description: "Production lines and raw materials" },
  { id: "textile", label: "Textiles / Fashion", icon: Scissors, description: "Fabrics, yards, and materials" },
  { id: "wholesale", label: "Wholesale", icon: Warehouse, description: "Bulk sales to other businesses" },
  { id: "general", label: "General Inventory", icon: Package, description: "Flexible for any business" },
] as const;

const CATEGORY_MAP: Record<string, { id: string; label: string; emoji: string; supportedUnits?: string[] }[]> = {
  retail: [
    { id: "electronics", label: "Electronics", emoji: "📱", supportedUnits: ["pcs", "pack", "box"] },
    { id: "fashion", label: "Fashion & Clothing", emoji: "👕", supportedUnits: ["pcs", "pack", "pair"] },
    { id: "groceries", label: "Groceries", emoji: "🛒", supportedUnits: ["pcs", "pack", "bottle", "bag", "kg", "g", "ltr", "ml"] },
    { id: "beauty", label: "Beauty & Health", emoji: "💄", supportedUnits: ["pcs", "pack", "bottle"] },
    { id: "home", label: "Home & Living", emoji: "🏠", supportedUnits: ["pcs", "pack"] },
    { id: "sports", label: "Sports & Fitness", emoji: "⚽", supportedUnits: ["pcs", "pack"] },
  ],
  restaurant: [
    { id: "proteins", label: "Proteins & Meat", emoji: "🥩", supportedUnits: ["kg", "g", "portion", "plate", "bowl"] },
    { id: "grains", label: "Grains & Staples", emoji: "🍚", supportedUnits: ["kg", "g", "bag", "bowl", "cup", "mudu", "paint"] },
    { id: "vegetables", label: "Vegetables & Fruits", emoji: "🥬", supportedUnits: ["pcs", "kg", "g", "portion", "plate", "bowl", "bundle"] },
    { id: "drinks", label: "Drinks & Beverages", emoji: "🥤", supportedUnits: ["ltr", "ml", "bottle", "cup"] },
    { id: "spices", label: "Spices & Seasonings", emoji: "🌶️", supportedUnits: ["g", "pack", "bottle", "cup"] },
    { id: "bakery", label: "Bakery & Pastry", emoji: "🍞", supportedUnits: ["pcs", "portion", "plate", "loaf", "pack"] },
  ],
  pharmacy: [
    { id: "pills", label: "Tablets & Capsules", emoji: "💊", supportedUnits: ["pcs", "pack", "strip", "box"] },
    { id: "syrups", label: "Syrups & Liquids", emoji: "🧪", supportedUnits: ["bottle", "ml"] },
    { id: "injections", label: "Injections & IVs", emoji: "💉", supportedUnits: ["pcs", "vial", "pack"] },
    { id: "first_aid", label: "First Aid & Creams", emoji: "🩹", supportedUnits: ["pcs", "pack", "roll"] },
    { id: "equipment", label: "Medical Equipment", emoji: "🩺", supportedUnits: ["pcs", "pack"] },
    { id: "disposables", label: "Disposables", emoji: "🧤", supportedUnits: ["pcs", "pack", "box"] },
  ],
  manufacturing: [
    { id: "raw_materials", label: "Raw Materials", emoji: "🧱", supportedUnits: ["kg", "g", "ltr", "ml", "bag", "drum"] },
    { id: "components", label: "Components & Parts", emoji: "⚙️", supportedUnits: ["pcs", "pack", "box"] },
    { id: "work_in_progress", label: "Work-in-Progress", emoji: "🏗️", supportedUnits: ["pcs"] },
    { id: "finished_goods", label: "Finished Products", emoji: "📦", supportedUnits: ["pcs", "pack", "box"] },
    { id: "packaging", label: "Packaging Supplies", emoji: "🏷️", supportedUnits: ["pcs", "roll", "pack"] },
    { id: "tools_mfg", label: "Factory Tools", emoji: "🛠️", supportedUnits: ["pcs", "pack"] },
  ],
  agriculture: [
    { id: "grains_bulk", label: "Grains (Bags)", emoji: "🌾", supportedUnits: ["bag", "kg", "mudu", "paint"] },
    { id: "tubers", label: "Tubers & Starch", emoji: "🥔", supportedUnits: ["pcs", "kg", "bundle"] },
    { id: "livestock", label: "Livestock & Poultry", emoji: "🐔", supportedUnits: ["pcs", "kg"] },
    { id: "seeds", label: "Seeds & Saplings", emoji: "🌱", supportedUnits: ["pcs", "kg", "g", "pack", "bag", "bundle"] },
    { id: "fertilizers", label: "Fertilizers & Chemicals", emoji: "🧪", supportedUnits: ["pcs", "kg", "g", "ltr", "ml", "bag", "bottle"] },
    { id: "tools_agri", label: "Agricultural Tools", emoji: "🚜", supportedUnits: ["pcs", "pack"] },
  ],
  social_commerce: [
    { id: "electronics_online", label: "Gadgets & Tech", emoji: "🎧", supportedUnits: ["pcs"] },
    { id: "fashion_online", label: "Fashion & Shoes", emoji: "👟", supportedUnits: ["pcs", "pair"] },
    { id: "cosmetics_online", label: "Beauty & Skin", emoji: "💄", supportedUnits: ["pcs", "bottle"] },
    { id: "household_online", label: "Home Essentials", emoji: "📦", supportedUnits: ["pcs"] },
    { id: "services_online", label: "Digital Services", emoji: "⚡", supportedUnits: ["pcs"] },
    { id: "custom_online", label: "Custom Crafts", emoji: "🎨", supportedUnits: ["pcs"] },
  ],
  textile: [
    { id: "cotton", label: "Cotton & Linens", emoji: "🧵", supportedUnits: ["yard", "m", "roll"] },
    { id: "laces", label: "Laces & Embroidery", emoji: "👗", supportedUnits: ["yard", "m"] },
    { id: "silk", label: "Silk & Luxury", emoji: "✨", supportedUnits: ["yard", "m"] },
    { id: "sewing", label: "Sewing Essentials", emoji: "🪡", supportedUnits: ["pcs", "pack", "roll"] },
    { id: "traditional", label: "Traditional Attire", emoji: "🧥", supportedUnits: ["pcs", "yard"] },
    { id: "prints", label: "African Prints (Ankara)", emoji: "🎨", supportedUnits: ["yard", "m", "pcs"] },
  ],
  wholesale: [
    { id: "fmcg", label: "FMCG", emoji: "📦", supportedUnits: ["carton", "box", "pack", "pcs"] },
    { id: "building", label: "Building Materials", emoji: "🧱", supportedUnits: ["pcs", "bag", "tonne", "m"] },
    { id: "agro", label: "Agro & Farm", emoji: "🌾", supportedUnits: ["bag", "kg", "pcs"] },
    { id: "industrial", label: "Industrial Supplies", emoji: "⚙️", supportedUnits: ["pcs", "pack", "box"] },
    { id: "textiles", label: "Textiles", emoji: "🧵", supportedUnits: ["roll", "yard", "pcs"] },
    { id: "chemicals", label: "Chemicals", emoji: "🧪", supportedUnits: ["drum", "ltr", "bottle", "kg"] },
  ],
  general: [
    { id: "office", label: "Office Supplies", emoji: "📎", supportedUnits: ["pcs", "pack", "box"] },
    { id: "tools", label: "Tools & Hardware", emoji: "🔧", supportedUnits: ["pcs", "pack", "box"] },
    { id: "it", label: "IT & Equipment", emoji: "💻", supportedUnits: ["pcs", "pack", "box"] },
    { id: "medical", label: "Medical Supplies", emoji: "🏥", supportedUnits: ["pcs", "pack", "box", "vial"] },
    { id: "cleaning", label: "Cleaning Products", emoji: "🧹", supportedUnits: ["pcs", "pack", "bottle", "ltr", "ml"] },
    { id: "misc", label: "Miscellaneous", emoji: "📋", supportedUnits: ["pcs"] },
  ],
};

const BRAND_COLORS = [
  { id: "teal", value: "#0d9488", label: "Teal" },
  { id: "blue", value: "#2563eb", label: "Blue" },
  { id: "indigo", value: "#4f46e5", label: "Indigo" },
  { id: "purple", value: "#7c3aed", label: "Purple" },
  { id: "orange", value: "#ea580c", label: "Orange" },
  { id: "pink", value: "#db2777", label: "Pink" },
];

const ENTRY_METHODS = [
  {
    id: "camera",
    title: "Scan products with your camera",
    subtitle: "Best for supermarkets, pharmacies — ~5-15 sec/item",
    description: "Scan barcodes on packaged goods — we'll auto-fill name, category & image where recognised. You just confirm price & stock.",
    icon: Scan,
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20"
  },
  {
    id: "manual",
    title: "Add a few products manually",
    subtitle: "Best for boutiques, small shops — <20 items",
    description: "The bulk entry grid — type in your top products now, one row each.",
    icon: ClipboardPen,
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
  },
  {
    id: "skip",
    title: "Skip — build it as I sell",
    subtitle: "Best for busy supermarkets — start selling now",
    description: "Launch now with an empty catalog. Use Add-on-Sell at checkout — every new scan during a real sale adds the item automatically.",
    icon: Rocket,
    badgeColor: "bg-violet-500/10 text-violet-500 border-violet-500/20"
  },
  {
    id: "excel",
    title: "Import from a spreadsheet",
    subtitle: "Best if you have an existing product list",
    description: "Upload a CSV/Excel file — even messy ones. We'll match columns automatically.",
    icon: FileSpreadsheet,
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20"
  }
];

interface BusinessOnboardingProps {
  onComplete: (data: {
    businessType: string;
    categories: string[];
    storeName: string;
    brandColor: string;
    moniepointKey?: string;
    storeSlug?: string;
    initialItems?: PendingProduct[];
  }) => void;
  onSkip: () => void;
}

export function BusinessOnboarding({ onComplete, onSkip }: BusinessOnboardingProps) {
  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [moniepointKey, setMoniepointKey] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [brandColor, setBrandColor] = useState("#0d9488");
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);

  useEffect(() => {
    const intended = sessionStorage.getItem("nexa_intended_business");
    if (intended) {
      setSelectedBusiness(intended);
      sessionStorage.removeItem("nexa_intended_business");
    }
  }, []);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [entryMethod, setEntryMethod] = useState<"camera" | "manual" | "skip" | "excel">("manual");
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([
    { id: "1", name: "", price: "", stock: "", unit: "pcs" },
  ]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = () => {
    if (step === 0 && storeName.trim()) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2 && selectedBusiness) {
      if (selectedBusiness === "social_commerce") {
        setStoreSlug(storeName.toLowerCase().replace(/[^a-z0-9]/g, "-"));
        setStep(25); // Step 2.5: Online Store Config
      } else {
        setStep(3);
        setSelectedCategories(new Set());
      }
    } else if (step === 25) {
      setStep(3);
      setSelectedCategories(new Set());
    } else if (step === 3 && selectedCategories.size > 0) {
      setStep(3.5);
    } else if (step === 3.5) {
      if (entryMethod === "manual") {
        setStep(4);
      } else {
        if (entryMethod === "camera") {
          sessionStorage.setItem("nexa_open_scanner_after_onboarding", "true");
        } else if (entryMethod === "excel") {
          sessionStorage.setItem("nexa_open_import_after_onboarding", "true");
        }
        handleFinish();
      }
    }
  };

  const allCategories = selectedBusiness ? CATEGORY_MAP[selectedBusiness] ?? [] : [];
  const activeCategories = allCategories.filter(c => selectedCategories.has(c.id));
  const bulkEntryCategories = activeCategories.length > 0 ? activeCategories : allCategories;

  const handleFinish = () => {
    if (selectedBusiness) {
      onComplete({
        businessType: selectedBusiness, 
        categories: Array.from(selectedCategories), 
        storeName: storeName.trim() || "My Store", 
        brandColor,
        moniepointKey,
        storeSlug,
        initialItems: pendingProducts
          .filter(p => p.name.trim() !== "")
          .map(p => ({
            ...p,
            categoryId: p.categoryId || bulkEntryCategories[0]?.id || "misc"
          }))
      });
    }
  };

  const categories = allCategories;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "w-full rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8 transition-all duration-300 my-auto",
          (step === 4 || step === 3.5) ? "max-w-2xl" : "max-w-lg"
        )}
      >
        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {[0, 1, 2, 25, 3, 3.5, 4].map((i) => {
            if (i === 25 && selectedBusiness !== "social_commerce") return null;
            let active = false;
            if (i === 25) {
              active = step > 2;
            } else if (i === 3.5) {
              active = step >= 3.5;
            } else {
              active = step >= i;
            }
            return <div key={i} className={cn("h-1.5 flex-1 rounded-full", active ? "bg-primary" : "bg-muted")} />;
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Store Name */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">What's your store name?</h2>
                <p className="mt-1 text-sm text-muted-foreground">This will appear on receipts and invoices.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-name" className="text-sm font-medium">Store / Business Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="store-name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Adebayo Electronics"
                    className="pl-10 h-12 text-base"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground">
                  Skip setup
                </button>
                <Button onClick={handleNext} disabled={!storeName.trim()} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Branding */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Choose your brand color</h2>
                <p className="mt-1 text-sm text-muted-foreground">This color will be used throughout your Nexa OS interface.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setBrandColor(c.value)}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                      brandColor === c.value
                        ? "border-[color:var(--c)] bg-[color:var(--c)]/5 shadow-sm"
                        : "border-border hover:border-[color:var(--c)]/40"
                    )}
                    style={{ "--c": c.value } as React.CSSProperties}
                  >
                    <div className="h-8 w-8 rounded-full border border-black/5 shadow-sm" style={{ backgroundColor: c.value }} />
                    <span className="text-xs font-medium">{c.label}</span>
                    {brandColor === c.value && (
                      <div className="absolute top-1.5 right-1.5 rounded-full bg-[color:var(--c)] p-0.5">
                        <Check className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(0)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Business Type */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">What type of business do you run?</h2>
                <p className="mt-1 text-sm text-muted-foreground">This helps us set up the right categories for you.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setSelectedBusiness(bt.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
                      selectedBusiness === bt.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <bt.icon className={cn("h-7 w-7", selectedBusiness === bt.id ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">{bt.label}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{bt.description}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={!selectedBusiness} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 25: Online Store Config (Social Commerce only) */}
          {step === 25 && (
            <motion.div
              key="step-25"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Set up your storefront</h2>
                <p className="mt-1 text-sm text-muted-foreground">Configure how your customers will find and pay you.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Unique Store Link</Label>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">nexa.store/</span>
                    <Input 
                      value={storeSlug}
                      onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))}
                      className="h-9 px-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-sm font-medium">Moniepoint API Key (Optional)</Label>
                   <Input 
                      type="password"
                      value={moniepointKey}
                      onChange={e => setMoniepointKey(e.target.value)}
                      placeholder="sk_live_..."
                      className="h-10"
                   />
                   <p className="text-[11px] text-muted-foreground italic">You can add this later in settings to enable automated payments.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={!storeSlug} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Categories */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Select your product categories</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick the ones that match your inventory.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all",
                      selectedCategories.has(cat.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-sm font-medium">{cat.label}</span>
                    {selectedCategories.has(cat.id) && <Check className="ml-auto h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={selectedCategories.size === 0} className="gap-1.5" style={{ backgroundColor: brandColor, color: "#fff" }}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3.5: Inventory Entry Method Selection */}
          {step === 3.5 && (
            <motion.div
              key="step-3.5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">How would you like to add your inventory?</h2>
                <p className="mt-1 text-sm text-muted-foreground">add more later — this just gets you started.</p>
              </div>

              <div className="flex flex-col gap-3 max-h-[385px] overflow-y-auto pr-1">
                {ENTRY_METHODS.map((m) => {
                  const isSelected = entryMethod === m.id;
                  const IconComponent = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEntryMethod(m.id as "camera" | "manual" | "skip" | "excel")}
                      className={cn(
                        "w-full text-left flex gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer select-none",
                        isSelected
                          ? "shadow-sm border-primary bg-primary/5 dark:bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-accent/10"
                      )}
                      style={
                        isSelected ? { 
                          borderColor: brandColor, 
                          backgroundColor: `${brandColor}0a` 
                        } : {}
                      }
                    >
                      {/* Left container */}
                      <div 
                        className={cn(
                          "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border",
                          isSelected 
                            ? "border-primary/20 text-primary" 
                            : "border-border text-muted-foreground bg-muted/30"
                        )}
                        style={
                          isSelected ? { 
                            color: brandColor,
                            borderColor: `${brandColor}20`,
                            backgroundColor: `${brandColor}0f`
                          } : {}
                        }
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>

                      {/* Right content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                          <span className="font-semibold text-sm text-foreground leading-none">
                            {m.title}
                          </span>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium inline-block w-max", m.badgeColor)}>
                            {m.subtitle}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(3)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} className="gap-1.5" style={{ backgroundColor: brandColor, color: "#fff" }}>
                  {entryMethod === "manual" ? "Next" : "Launch OS"} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Bulk Products */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground">Add your first products</h2>
                <p className="mt-1 text-sm text-muted-foreground">Quickly add items to get your inventory started.</p>
              </div>

              <BulkProductEntry 
                products={pendingProducts} 
                setProducts={setPendingProducts} 
                categories={bulkEntryCategories}
              />

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(3.5)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleFinish} className="gap-1.5" style={{ backgroundColor: brandColor, color: "#fff" }}>
                  Setup Complete <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
