import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  UtensilsCrossed,
  Warehouse,
  Package,
  Sprout,
  Scissors,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Plus,
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
  { id: "textile", label: "Textiles / Fashion", icon: Scissors, description: "Fabrics, yards, and materials" },
  { id: "wholesale", label: "Wholesale", icon: Warehouse, description: "Bulk sales to other businesses" },
  { id: "general", label: "General Inventory", icon: Package, description: "Flexible for any business" },
] as const;

const CATEGORY_MAP: Record<string, { id: string; label: string; emoji: string }[]> = {
  retail: [
    { id: "electronics", label: "Electronics", emoji: "📱" },
    { id: "fashion", label: "Fashion & Clothing", emoji: "👕" },
    { id: "groceries", label: "Groceries", emoji: "🛒" },
    { id: "beauty", label: "Beauty & Health", emoji: "💄" },
    { id: "home", label: "Home & Living", emoji: "🏠" },
    { id: "sports", label: "Sports & Fitness", emoji: "⚽" },
  ],
  restaurant: [
    { id: "proteins", label: "Proteins & Meat", emoji: "🥩" },
    { id: "grains", label: "Grains & Staples", emoji: "🍚" },
    { id: "vegetables", label: "Vegetables & Fruits", emoji: "🥬" },
    { id: "drinks", label: "Drinks & Beverages", emoji: "🥤" },
    { id: "spices", label: "Spices & Seasonings", emoji: "🌶️" },
    { id: "bakery", label: "Bakery & Pastry", emoji: "🍞" },
  ],
  agriculture: [
    { id: "grains_bulk", label: "Grains (Bags)", emoji: "🌾" },
    { id: "tubers", label: "Tubers & Starch", emoji: "🥔" },
    { id: "livestock", label: "Livestock & Poultry", emoji: "🐔" },
    { id: "seeds", label: "Seeds & Saplings", emoji: "🌱" },
    { id: "fertilizers", label: "Fertilizers & Chemicals", emoji: "🧪" },
    { id: "tools_agri", label: "Agricultural Tools", emoji: "🚜" },
  ],
  textile: [
    { id: "cotton", label: "Cotton & Linens", emoji: "🧵" },
    { id: "laces", label: "Laces & Embroidery", emoji: "👗" },
    { id: "silk", label: "Silk & Luxury", emoji: "✨" },
    { id: "sewing", label: "Sewing Essentials", emoji: "🪡" },
    { id: "traditional", label: "Traditional Attire", emoji: "🧥" },
    { id: "prints", label: "African Prints (Ankara)", emoji: "🎨" },
  ],
  wholesale: [
    { id: "fmcg", label: "FMCG", emoji: "📦" },
    { id: "building", label: "Building Materials", emoji: "🧱" },
    { id: "agro", label: "Agro & Farm", emoji: "🌾" },
    { id: "industrial", label: "Industrial Supplies", emoji: "⚙️" },
    { id: "textiles", label: "Textiles", emoji: "🧵" },
    { id: "chemicals", label: "Chemicals", emoji: "🧪" },
  ],
  general: [
    { id: "office", label: "Office Supplies", emoji: "📎" },
    { id: "tools", label: "Tools & Hardware", emoji: "🔧" },
    { id: "it", label: "IT & Equipment", emoji: "💻" },
    { id: "medical", label: "Medical Supplies", emoji: "🏥" },
    { id: "cleaning", label: "Cleaning Products", emoji: "🧹" },
    { id: "misc", label: "Miscellaneous", emoji: "📋" },
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

interface BusinessOnboardingProps {
  onComplete: (businessType: string, categories: string[], storeName: string, brandColor: string, initialItems?: PendingProduct[]) => void;
  onSkip: () => void;
}

export function BusinessOnboarding({ onComplete, onSkip }: BusinessOnboardingProps) {
  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [brandColor, setBrandColor] = useState("#0d9488");
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
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
      setStep(3);
      setSelectedCategories(new Set());
    } else if (step === 3 && selectedCategories.size > 0) {
      setStep(4);
    }
  };

  const handleFinish = () => {
    if (selectedBusiness) {
      onComplete(
        selectedBusiness, 
        Array.from(selectedCategories), 
        storeName.trim() || "My Store", 
        brandColor,
        pendingProducts.filter(p => p.name.trim() !== "")
      );
    }
  };

  const categories = selectedBusiness ? CATEGORY_MAP[selectedBusiness] ?? [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "w-full rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8 transition-all duration-300",
          step === 4 ? "max-w-2xl" : "max-w-lg"
        )}
      >
        {/* Progress — 5 steps now */}
        <div className="mb-6 flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full", step >= i ? "bg-primary" : "bg-muted")} />
          ))}
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

              <div className="grid grid-cols-2 gap-3">
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
                <Button onClick={handleNext} disabled={selectedCategories.size === 0} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
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
                categories={categories}
              />

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(3)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleFinish} className="gap-1.5">
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
