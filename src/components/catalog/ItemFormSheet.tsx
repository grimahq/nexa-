import { useEffect, useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/shared/HelpTooltip";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Upload, X, ChevronDown, ChevronRight, Package, Image as ImageIcon, Trash2, 
  Sparkles, Check, Mic, Camera, Barcode, Plus, BookOpen, Layers, Info, RotateCcw,
  Tag, Flame, Utensils, Smartphone, Pill
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateProductDescription } from "@/lib/gemini";
import type { Item, Category, Supplier, Location, UnitConversion } from "@/types/inventory";
import { ItemStatus, SUPPORTED_UNITS } from "@/types/inventory";
import { DRUG_LIBRARY } from "@/data/drugLibrary";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  locationId: z.string().optional(),
  unit: z.string(),
  unitType: z.enum(["count", "weight", "length", "volume"]),
  currentStock: z.coerce.number().min(0),
  reorderPoint: z.coerce.number().min(0),
  reorderQuantity: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  imageUrl: z.string().optional().nullable(),
  isEcommerceEnabled: z.boolean().optional(),
  affiliateCommission: z.coerce.number().min(0).optional(),
  measurements: z.string().optional(),
  color: z.string().optional(),
  unitConversions: z.array(z.object({
    unitId: z.string(),
    multiplier: z.coerce.number().min(0.000001),
    priceNgn: z.coerce.number().optional(),
  })).optional(),
  status: z.nativeEnum(ItemStatus),
});

type FormValues = z.infer<typeof schema>;

interface ItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  existingSkus: string[];
  onSave: (data: Partial<Item>) => void;
  loading?: boolean;
}

export function ItemFormSheet({
  open,
  onOpenChange,
  item,
  categories,
  suppliers,
  locations,
  existingSkus,
  onSave,
  loading,
}: ItemFormSheetProps) {
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  const onboarding = isDemo ? demoOnboarding : liveSettings;
  const isRestaurant = onboarding?.businessType === "restaurant";

  const isPhoneAccessoriesSeller = onboarding?.businessType === "electronics" && (
    onboarding?.electronicsMainType === "accessories" ||
    !onboarding?.categories?.includes("devices")
  );

  // Electronics fields states (for phone accessories)
  const [compatibility, setCompatibility] = useState("");
  const [brandFocus, setBrandFocus] = useState("");
  const [material, setMaterial] = useState("");
  const [warrantyPeriod, setWarrantyPeriod] = useState("");
  const [accessoryType, setAccessoryType] = useState("");

  const filteredCategories = useMemo(() => {
    if (isPhoneAccessoriesSeller) {
      const accessoriesIds = ["accessories", "cases", "chargers", "audio", "protection", "powerbanks"];
      const matched = categories.filter(c => accessoriesIds.includes(c.id));
      return matched.length > 0 ? matched : categories;
    }
    return categories;
  }, [categories, isPhoneAccessoriesSeller]);

  // Restaurant fields states
  const isPharmacy = onboarding?.businessType === "pharmacy";

  // Pharmacy field states
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [dosageForm, setDosageForm] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  const [prepTime, setPrepTime] = useState("15 mins");
  const [portionSizes, setPortionSizes] = useState<{ name: string; price: number }[]>([
    { name: "Regular", price: 3500 },
    { name: "Large", price: 5000 },
  ]);
  const [proteinAddons, setProteinAddons] = useState<{ name: string; price: number }[]>([
    { name: "Chicken", price: 1500 },
    { name: "Beef", price: 1200 },
    { name: "Fish", price: 1800 },
  ]);
  const [spiceLevels, setSpiceLevels] = useState<string[]>(["Mild", "Medium", "Hot", "Extra hot"]);
  const [allowKitchenNotes, setAllowKitchenNotes] = useState(true);

  const isEdit = !!item;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Magic 4-step wizard states
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [productType, setProductType] = useState<"simple" | "variants" | "bulk" | "both">("simple");

  // Options states
  const [availColours, setAvailColours] = useState<string[]>(["Red", "Navy", "Gold"]);
  const [availSizes, setAvailSizes] = useState<string[]>(["38", "39", "40", "41"]);
  const [newColourInput, setNewColourInput] = useState("");
  const [newSizeInput, setNewSizeInput] = useState("");
  const [samePriceForVariants, setSamePriceForVariants] = useState(true);
  const [fineTunedVariants, setFineTunedVariants] = useState<Record<string, { price: number; stock: number }>>({});
  const [showFineTune, setShowFineTune] = useState(false);

  // Simulation states for Step 4 (Lab)
  const [voiceSimState, setVoiceSimState] = useState<"idle" | "listening" | "done">("idle");
  const [barcodeSimState, setBarcodeSimState] = useState<"idle" | "scanning" | "done">("idle");
  const [photoSimState, setPhotoSimState] = useState<"idle" | "snapping" | "done">("idle");
  const [localUnitSimState, setLocalUnitSimState] = useState<"idle" | "translating" | "done">("idle");
  const [hasVoiceTriggered, setHasVoiceTriggered] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});

  const { register, handleSubmit, reset, setValue, watch, formState: { errors }, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      supplierId: "",
      locationId: "",
      unit: "pcs",
      unitType: "count",
      currentStock: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      imageUrl: "",
      isEcommerceEnabled: false,
      affiliateCommission: 0,
      measurements: "",
      color: "",
      unitConversions: [],
      status: ItemStatus.Active,
    },
  });

  const name = watch("name");
  const sku = watch("sku");

  const matchedDrugs = useMemo(() => {
    if (!isPharmacy || !name || name.trim().length < 2 || isEdit) return [];
    const q = name.toLowerCase();
    return DRUG_LIBRARY.filter(drug => 
      drug.name.toLowerCase().includes(q) || 
      drug.activeIngredient.toLowerCase().includes(q) ||
      drug.category.toLowerCase().includes(q)
    );
  }, [name, isPharmacy, isEdit]);
  const price = watch("sellingPrice");
  const unit = watch("unit");
  const imageUrl = watch("imageUrl");

  const selectedCategoryId = watch("categoryId");
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const allowedUnits = useMemo(() => {
    if (selectedCategory && selectedCategory.supportedUnits && selectedCategory.supportedUnits.length > 0) {
      return SUPPORTED_UNITS.filter(u => selectedCategory.supportedUnits!.includes(u.id));
    }
    return SUPPORTED_UNITS;
  }, [selectedCategory]);

  useEffect(() => {
    const currentUnit = watch("unit");
    if (allowedUnits.length > 0 && !allowedUnits.some(u => u.id === currentUnit)) {
      setValue("unit", allowedUnits[0].id);
      setValue("unitType", allowedUnits[0].type || "count");
    }
  }, [allowedUnits, setValue, watch]);

  useEffect(() => {
    if (open && item) {
      reset({
        name: item.name,
        sku: item.sku,
        description: item.description,
        categoryId: item.categoryId ?? "",
        supplierId: item.supplierId ?? "",
        locationId: item.locationId ?? "",
        unit: item.unit,
        unitType: item.unitType ?? "count",
        currentStock: item.currentStock,
        reorderPoint: item.reorderPoint,
        reorderQuantity: item.reorderQuantity,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        imageUrl: item.imageUrl ?? "",
        isEcommerceEnabled: item.isEcommerceEnabled ?? false,
        affiliateCommission: item.affiliateCommission ?? 0,
        measurements: item.measurements ?? "",
        color: item.color ?? "",
        unitConversions: item.unitConversions ?? [],
        status: item.status,
      });

      if (item.restaurant) {
        setPrepTime(`${item.restaurant.preparationTime || 15} mins`);
        setPortionSizes(item.restaurant.portionSizes || []);
        setProteinAddons(item.restaurant.proteinAddons || []);
        setSpiceLevels(item.restaurant.spiceLevels || ["Mild", "Medium", "Hot", "Extra hot"]);
        setAllowKitchenNotes(item.restaurant.allowKitchenNotes ?? true);
      } else {
        setPrepTime("15 mins");
        setPortionSizes([{ name: "Regular", price: 3500 }, { name: "Large", price: 5000 }]);
        setProteinAddons([{ name: "Chicken", price: 1500 }, { name: "Beef", price: 1200 }, { name: "Fish", price: 1800 }]);
        setSpiceLevels(["Mild", "Medium", "Hot", "Extra hot"]);
        setAllowKitchenNotes(true);
      }

      if (item.electronics) {
        setCompatibility(item.electronics.compatibility || "");
        setBrandFocus(item.electronics.brandFocus || "");
        setMaterial(item.electronics.material || "");
        setWarrantyPeriod(item.electronics.warrantyPeriod || "");
        setAccessoryType(item.electronics.accessoryType || "");
      } else {
        setCompatibility("");
        setBrandFocus("");
        setMaterial("");
        setWarrantyPeriod("");
        setAccessoryType("");
      }

      if (item.pharmacy) {
        setExpiryDate(item.pharmacy.expiryDate || "");
        setBatchNumber(item.pharmacy.batchNumber || "");
        setRequiresPrescription(item.pharmacy.requiresPrescription ?? false);
        setDosageForm(item.pharmacy.dosageForm || "");
      } else {
        setExpiryDate("");
        setBatchNumber("");
        setRequiresPrescription(false);
        setDosageForm("");
      }
      
      // Determine template based on item structure
      if (item.unitConversions && item.unitConversions.length > 0 && item.color) {
        setProductType("both");
        setAvailColours(item.color.split(",").map(c => c.trim()));
        if (item.sizes) {
          setAvailSizes(item.sizes.split(",").map(s => s.trim()));
        }
      } else if (item.unitConversions && item.unitConversions.length > 0) {
        setProductType("bulk");
      } else if (item.color) {
        setProductType("variants");
        setAvailColours(item.color.split(",").map(c => c.trim()));
        if (item.sizes) {
          setAvailSizes(item.sizes.split(",").map(s => s.trim()));
        }
      } else {
        setProductType("simple");
      }
      setCurrentStep(1);
    } else if (open) {
      reset({
        name: "",
        sku: "",
        description: "",
        categoryId: "",
        supplierId: "",
        locationId: "",
        unit: "pcs",
        unitType: "count",
        currentStock: 0,
        reorderPoint: 0,
        reorderQuantity: 0,
        costPrice: 0,
        sellingPrice: 0,
        imageUrl: "",
        isEcommerceEnabled: false,
        affiliateCommission: 0,
        measurements: "",
        color: "",
        unitConversions: [],
        status: ItemStatus.Active,
      });
      setPrepTime("15 mins");
      setPortionSizes([{ name: "Regular", price: 3500 }, { name: "Large", price: 5000 }]);
      setProteinAddons([{ name: "Chicken", price: 1500 }, { name: "Beef", price: 1200 }, { name: "Fish", price: 1800 }]);
      setSpiceLevels(["Mild", "Medium", "Hot", "Extra hot"]);
      setAllowKitchenNotes(true);
      setCompatibility("");
      setBrandFocus("");
      setMaterial("");
      setWarrantyPeriod("");
      setAccessoryType("");
      setExpiryDate("");
      setBatchNumber("");
      setRequiresPrescription(false);
      setDosageForm("");
      setShowNameSuggestions(false);
      setCurrentStep(1);
      setProductType("simple");
      setShowAdvanced(false);

      if (isPhoneAccessoriesSeller) {
        setAvailColours(["Black", "Clear", "Sierra Blue", "Space Gray"]);
        setAvailSizes(["iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 15", "iPhone 14 Pro"]);
      } else {
        setAvailColours(["Red", "Navy", "Gold"]);
        setAvailSizes(["38", "39", "40", "41"]);
      }
    }
  }, [open, item, reset, isPhoneAccessoriesSeller, isPharmacy]);

  // Generate Suggested SKU from Name
  useEffect(() => {
    if (name && !sku && !isEdit) {
      const suggestedStr = generateSuggestedSku(name);
      setValue("sku", suggestedStr);
    }
  }, [name, sku, isEdit, setValue]);

  const generateSuggestedSku = (pName: string) => {
    const clean = pName.trim().toUpperCase();
    const parts = clean.split(/\s+/);
    let code = "";
    if (parts.length >= 2) {
      code = parts.slice(0, 3).map(p => p[0]).join("");
    } else {
      code = clean.substring(0, 3);
    }
    code = code.replace(/[^A-Z0-9]/g, "");
    if (!code) code = "PRD";
    return `${code}-001`;
  };

  const handleApplySuggestedSku = () => {
    if (name) {
      setValue("sku", generateSuggestedSku(name));
      toast.success("SKU code applied successfully.");
    } else {
      toast.error("Please enter a product name first.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("imageUrl", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Preset generators for multi-units
  const handleApplyUnitPreset = (type: "foodstuff" | "textile" | "cosmetics") => {
    const basePrice = Number(watch("sellingPrice")) || 0;
    if (type === "foodstuff") {
      setValue("unit", "mudu");
      setValue("unitConversions", [
        { unitId: "bag", multiplier: 50, priceNgn: basePrice * 42 }
      ]);
      toast.success("Applied Foodstuff presets (Mudu base unit and 50x Bag conversion multiplier).");
    } else if (type === "textile") {
      setValue("unit", "yard");
      setValue("unitConversions", [
        { unitId: "roll", multiplier: 50, priceNgn: basePrice * 45 }
      ]);
      toast.success("Applied Fabric presets (Yard base unit and 50x Roll conversionmultiplier).");
    } else if (type === "cosmetics") {
      setValue("unit", "pcs");
      setValue("unitConversions", [
        { unitId: "carton", multiplier: 12, priceNgn: basePrice * 10 }
      ]);
      toast.success("Applied Cosmetics presets (Pcs base unit with 12x Carton conversion multiplier).");
    }
  };

  const onSubmit = (data: FormValues) => {
    if (isRestaurant) {
      const activePortions = portionSizes.filter(p => p.name.trim() !== "");
      const activeProteins = proteinAddons.filter(p => p.name.trim() !== "");
      const prepTimeNum = parseInt(prepTime) || 15;

      const restaurantData = {
        preparationTime: prepTimeNum,
        portionSizes: activePortions.length > 0 ? activePortions : [{ name: "Regular", price: data.sellingPrice || 3500 }],
        proteinAddons: activeProteins,
        spiceLevels: spiceLevels.filter(s => s.trim() !== ""),
        allowKitchenNotes: allowKitchenNotes,
        isVegetarian: data.name.toLowerCase().includes("salad") || data.name.toLowerCase().includes("vegan") || data.name.toLowerCase().includes("veg"),
      };

      const finalPrice = activePortions[0]?.price ?? data.sellingPrice ?? 3500;
      const finalSku = data.sku || `MENU-${data.name.toUpperCase().replace(/[^A-Z0-9]/g, "-") || Date.now()}`;

      onSave({
        ...data,
        sku: finalSku,
        sellingPrice: finalPrice,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
        locationId: data.locationId || null,
        description: data.description || "",
        restaurant: restaurantData,
      });
      return;
    }

    const skuConflict = existingSkus.filter((s) => s === data.sku);
    const allowed = isEdit && item?.sku === data.sku ? 1 : 0;
    if (skuConflict.length > allowed) {
      setError("sku", { message: "SKU already exists" });
      setCurrentStep(1); // Jump back to where SKU input sits
      return;
    }

    // Apply variants option configuration if variant template is active
    let finalColorsStr = data.color || "";
    let finalSizesStr = "";
    if (productType === "variants" || productType === "both") {
      finalColorsStr = availColours.join(", ");
      finalSizesStr = availSizes.join(", ");
    }

    const electronicsData = isPhoneAccessoriesSeller ? {
      compatibility: compatibility.trim(),
      brandFocus: brandFocus.trim(),
      material: material.trim(),
      warrantyPeriod: warrantyPeriod.trim(),
      accessoryType: accessoryType.trim(),
    } : undefined;

    const pharmacyData = isPharmacy ? {
      expiryDate: expiryDate || undefined,
      batchNumber: batchNumber.trim() || undefined,
      requiresPrescription: requiresPrescription,
      dosageForm: dosageForm || undefined,
    } : undefined;

    onSave({
      ...data,
      color: finalColorsStr,
      sizes: finalSizesStr,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
      locationId: data.locationId || null,
      description: data.description || "",
      electronics: electronicsData,
      pharmacy: pharmacyData,
    });
  };

  // Option combinations list
  const getVariantCount = () => {
    return availColours.length * (productType === "variants" ? availSizes.length : 1);
  };

  const simulatedTotalStockVal = () => {
    const baseVal = (watch("sellingPrice") || 0) * (watch("currentStock") || 0);
    return baseVal;
  };

  // Step 4 Simulation triggers
  const triggerVoiceSimulation = () => {
    setVoiceSimState("listening");
    toast.info("Microphone listening... Speak standard product title and price.");
    
    setTimeout(() => {
      setValue("name", "Ankara Fabric Red Wax");
      setValue("sku", "ANKARA-RED-WAX");
      setValue("sellingPrice", 4500);
      setValue("unit", "yard");
      setProductType("both");
      setVoiceSimState("done");
      setHighlightedFields({ name: true, sku: true, price: true, unit: true });
      setCurrentStep(3);
      toast.success("Voice parsed successfully: 'Ankara Fabric Red Wax, ₦4,500'!");
      setTimeout(() => setHighlightedFields({}), 4500);
    }, 1800);
  };

  const triggerBarcodeSimulation = () => {
    setBarcodeSimState("scanning");
    toast.message("Simulating barcode scanner laser pass...");

    setTimeout(() => {
      setValue("name", "Peak Milk Can 400g");
      setValue("sellingPrice", 2200);
      setValue("sku", "PEAK-400-CAN");
      setValue("unit", "pcs");
      setProductType("simple");
      setBarcodeSimState("done");
      setHighlightedFields({ name: true, sku: true, price: true, unit: true });
      setCurrentStep(3);
      toast.success("Scanned Barcode: '6151100021319' prefilled details!");
      setTimeout(() => setHighlightedFields({}), 4500);
    }, 1500);
  };

  const triggerPhotoSimulation = () => {
    setPhotoSimState("snapping");
    toast.info("Opening back camera viewfinder simulation...");

    setTimeout(() => {
      setValue("imageUrl", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=60");
      setValue("name", "Quick Snap Red Shoe");
      setValue("sku", "SNAP-RED-SHOE");
      setValue("sellingPrice", 18000);
      setProductType("variants");
      setPhotoSimState("done");
      setHighlightedFields({ name: true, sku: true, price: true, image: true });
      setCurrentStep(3);
      toast.success("Captured! Prefilled default info for instant billing.");
      setTimeout(() => setHighlightedFields({}), 4500);
    }, 1800);
  };

  const triggerLocalUnitsSimulation = () => {
    setLocalUnitSimState("translating");
    toast.info("Calibrating West African local scale size mappings...");

    setTimeout(() => {
      setValue("name", "Oloyin Beans Mudu");
      setValue("sku", "BEANS-OLOYIN-MUDU");
      setValue("sellingPrice", 1600);
      setValue("unit", "mudu");
      setProductType("bulk");
      setValue("unitConversions", [
        { unitId: "bag", multiplier: 40, priceNgn: 58000 }
      ]);
      setLocalUnitSimState("done");
      setHighlightedFields({ name: true, sku: true, price: true, unit: true, unitConversions: true });
      setCurrentStep(3);
      toast.success("Applied Local Units preset (Oloyin Beans, 1 Mudu = ₦1,600, with 40x Bag conversion)!");
      setTimeout(() => setHighlightedFields({}), 4500);
    }, 1500);
  };

  const labelCls = "text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 mb-1.5 block";
  const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 transition-all";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[490px] overflow-y-auto px-6 py-0 flex flex-col">
        {isRestaurant ? (
          <div className="flex flex-col h-full pt-6 space-y-4 pb-8 scrollbar-none">
            <div>
              <SheetTitle className="text-xl font-bold font-sans">
                {isEdit ? "Edit menu item" : "New menu item"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-1">Configure your dish, custom sizes, proteins, and spice options.</p>
            </div>

            {/* BASICS */}
            <div className="p-4 bg-muted/20 border rounded-xl space-y-3 shadow-none">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs uppercase tracking-wider"><Tag className="w-3.5 h-3.5" /> Basics</div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Item name *</label>
                  <input {...register("name")} className={inputCls} placeholder="Jollof rice" />
                  {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Product Picture</label>
                  <div className="flex items-center gap-4 mt-1 bg-background/50 p-2.5 rounded-lg border">
                    {imageUrl ? (
                      <div className="relative h-14 w-14 rounded-lg overflow-hidden border bg-muted shrink-0">
                        <img src={imageUrl} alt="Product preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setValue("imageUrl", "")}
                          className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-14 w-14 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-amber-500 hover:text-amber-600 transition-colors bg-muted/10 group shrink-0"
                      >
                        <ImageIcon className="w-4 h-4 group-hover:scale-105 transition-transform" />
                        <span className="text-[8px] font-bold mt-0.5 uppercase">Add</span>
                      </button>
                    )}
                    <div className="flex-1 text-[10px] text-muted-foreground leading-normal">
                      <p className="font-semibold text-foreground/80 text-[11px]">Upload dish photo</p>
                      <p className="text-[9px]">Optional picture for menus.</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-amber-600 font-bold underline mt-0.5 inline-block text-[9px]"
                      >
                        Browse file
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea {...register("description")} className="w-full h-14 rounded-md border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Smoky party jollof rice..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Category</label>
                    <Select value={watch("categoryId") || ""} onValueChange={(val) => setValue("categoryId", val)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Mains" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={labelCls}>Prep time</label>
                    <input type="text" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className={inputCls} placeholder="15 mins" />
                  </div>
                </div>
              </div>
            </div>

            {/* PORTIONS */}
            <div className="p-4 bg-muted/20 border border-[#FFA254]/30 rounded-xl space-y-2 shadow-none">
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase text-foreground/90 flex gap-1.5 items-center"><Layers className="w-3.5 h-3.5 text-[#FFA254]" /> Portion Sizes</span><span className="bg-[#fff3e0] text-[#FFA254] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider scale-95 origin-right">required</span></div>
              <p className="text-[10px] text-muted-foreground leading-none">Customer must pick one portion</p>
              <div className="space-y-1.5 pt-1">
                {portionSizes.map((sz, index) => (
                  <div key={index} className="flex gap-2 items-center bg-background/50 p-1.5 rounded-lg border border-border/80">
                    <div className="h-8 w-8 rounded bg-muted/80 text-[10px] font-bold text-muted-foreground flex items-center justify-center shrink-0 border">{sz.name.slice(0, 2).toUpperCase() || "SZ"}</div>
                    <span className="text-xs text-muted-foreground font-mono font-bold">+₦</span>
                    <input type="text" value={sz.name} onChange={(e) => { const updated = [...portionSizes]; updated[index].name = e.target.value; setPortionSizes(updated); }} placeholder="e.g. Regular" className="h-7 rounded border bg-background px-2 text-xs font-bold flex-1 max-w-[120px]" />
                    <input type="number" value={sz.price} onChange={(e) => { const updated = [...portionSizes]; updated[index].price = parseFloat(e.target.value) || 0; setPortionSizes(updated); }} placeholder="3500" className="h-7 rounded border bg-background px-2 text-xs font-semibold w-16 text-right font-mono" />
                    <button type="button" onClick={() => setPortionSizes(portionSizes.filter((_, idx) => idx !== index))} className="text-muted-foreground hover:text-rose-500 p-1"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setPortionSizes([...portionSizes, { name: "", price: 0 }])} className="text-[#FFA254] hover:text-[#FFA254]/80 text-[11px] font-bold flex items-center gap-1 pl-1">+ Add size</button>
              </div>
            </div>

            {/* PROTEINS */}
            <div className="p-4 bg-muted/20 border rounded-xl space-y-2 shadow-none">
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase text-foreground/90 flex gap-1.5 items-center"><Utensils className="w-3.5 h-3.5 text-[#139a70]" /> Protein Add-ons</span><span className="bg-[#e8f5e9] text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider scale-95 origin-right">optional</span></div>
              <p className="text-[10px] text-muted-foreground leading-none">Customer can select more than one</p>
              <div className="space-y-1.5 pt-1">
                {proteinAddons.map((add, index) => (
                  <div key={index} className="flex gap-2 items-center bg-background/50 p-1.5 rounded-lg border border-border/80">
                    <div className="h-8 w-8 rounded bg-muted/80 text-[10px] flex items-center justify-center shrink-0 border">🍗</div>
                    <span className="text-xs text-muted-foreground font-mono font-bold">+₦</span>
                    <input type="text" value={add.name} onChange={(e) => { const updated = [...proteinAddons]; updated[index].name = add.name = e.target.value; setProteinAddons(updated); }} placeholder="e.g. Chicken" className="h-7 rounded border bg-background px-2 text-xs font-bold flex-1 max-w-[120px]" />
                    <input type="number" value={add.price} onChange={(e) => { const updated = [...proteinAddons]; updated[index].price = parseFloat(e.target.value) || 0; setProteinAddons(updated); }} placeholder="1500" className="h-7 rounded border bg-background px-2 text-xs font-semibold w-16 text-right font-mono" />
                    <button type="button" onClick={() => setProteinAddons(proteinAddons.filter((_, idx) => idx !== index))} className="text-muted-foreground hover:text-rose-500 p-1"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setProteinAddons([...proteinAddons, { name: "", price: 0 }])} className="text-[#FFA254] hover:text-[#FFA254]/80 text-[11px] font-bold flex items-center gap-1 pl-1">+ Add protein option</button>
              </div>
            </div>

            {/* SPICE LEVEL */}
            <div className="p-4 bg-muted/20 border rounded-xl space-y-2 shadow-none">
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase text-foreground/90 flex gap-1.5 items-center"><Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Spice Options</span><span className="bg-[#e8f5e9] text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase scale-95 origin-right">free</span></div>
              <div className="flex flex-wrap items-center gap-1 bg-background/50 p-2 rounded-lg border">
                {spiceLevels.map((lvl, index) => (
                  <span key={index} className="bg-[#139a70] text-white px-2.5 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1">{lvl}<button type="button" onClick={() => setSpiceLevels(spiceLevels.filter(s => s !== lvl))} className="text-white/80 hover:text-white">×</button></span>
                ))}
                <span className="inline-flex gap-1 items-center">
                  <input id="inline-spice-input" type="text" placeholder="New..." className="h-5 w-12 border rounded bg-background px-1 text-[9px] focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const val = e.currentTarget.value.trim(); if (val && !spiceLevels.includes(val)) { setSpiceLevels([...spiceLevels, val]); e.currentTarget.value = ""; } } }} />
                  <button type="button" onClick={() => { const input = document.getElementById("inline-spice-input") as HTMLInputElement; if (input && input.value.trim()) { setSpiceLevels([...spiceLevels, input.value.trim()]); input.value = ""; } }} className="text-[#FFA254] font-bold text-xs h-5 w-5 flex items-center justify-center rounded hover:bg-muted">+</button>
                </span>
              </div>
            </div>

            {/* KITCHEN NOTES */}
            <div className="p-3 bg-muted/20 border rounded-xl flex items-center justify-between shadow-none">
              <div className="space-y-0.5">
                <span className="text-xs font-bold uppercase text-foreground/90 flex gap-1.5 items-center"><BookOpen className="w-3.5 h-3.5 text-[#FFA254]" /> Kitchen notes field</span>
                <p className="text-[10px] text-muted-foreground leading-none">Allow custom free-text notes on checkouts</p>
              </div>
              <button type="button" onClick={() => setAllowKitchenNotes(!allowKitchenNotes)} className={cn("relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none", allowKitchenNotes ? "bg-[#139a70]" : "bg-zinc-700")}><span className={cn("pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", allowKitchenNotes ? "translate-x-5" : "translate-x-0")} /></button>
            </div>

            {/* ACTIONS */}
            <div className="pt-3 border-t flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-10 text-xs font-bold rounded-xl">Cancel</Button>
              <Button type="button" onClick={() => handleSubmit(onSubmit)()} className="flex-1 h-10 text-xs font-bold rounded-xl bg-[#139a70] text-white hover:bg-[#0f805c]">{loading ? "Saving..." : isEdit ? "Save changes" : "Save menu item"}</Button>
            </div>
          </div>
        ) : (
          <>
        {/* Sticky Header with Step Progress bar */}
        <div className="sticky top-0 z-20 bg-background pt-6 pb-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <SheetTitle className="text-xl font-bold font-sans">
              {isEdit ? "Update Stock Data" : "Add New Product"}
            </SheetTitle>
            <div className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full uppercase">
              {productType} template
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {isEdit ? "Refine details using smart step pathways." : "Create product records cleanly with adaptive templates."}
          </p>

          {/* Elegant Progress Indicator */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <button 
              onClick={() => setCurrentStep(1)}
              className={cn(
                "h-2 rounded-full transition-all text-left relative group",
                currentStep >= 1 ? "bg-primary" : "bg-muted"
              )}
            >
              <span className="absolute -top-5 left-0 text-[9px] font-bold tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 text-white rounded px-1">
                Step 1: Template
              </span>
            </button>
            <button 
              onClick={() => { if (name && sku) setCurrentStep(2); }}
              disabled={!name || !sku}
              className={cn(
                "h-2 rounded-full transition-all text-left relative group disabled:opacity-50",
                currentStep >= 2 ? "bg-primary" : "bg-muted"
              )}
            >
              <span className="absolute -top-5 left-0 text-[9px] font-bold tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 text-white rounded px-1">
                Step 2: Config
              </span>
            </button>
            <button 
              onClick={() => { if (name && sku) setCurrentStep(3); }}
              disabled={!name || !sku}
              className={cn(
                "h-2 rounded-full transition-all text-left relative group disabled:opacity-50",
                currentStep >= 3 ? "bg-primary" : "bg-muted"
              )}
            >
              <span className="absolute -top-5 left-0 text-[9px] font-bold tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 text-white rounded px-1">
                Step 3: Review
              </span>
            </button>
            <button 
              onClick={() => setCurrentStep(4)}
              className={cn(
                "h-2 rounded-full transition-all text-left relative group border border-dashed border-primary/40",
                currentStep === 4 ? "bg-indigo-600" : "bg-slate-150-100/50"
              )}
            >
              <span className="absolute -top-5 right-0 text-[9px] font-bold tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 text-white rounded px-1">
                Step 4: Smart Lab
              </span>
            </button>
          </div>
          <div className="flex justify-between items-center mt-2.5">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              {currentStep === 1 && "Step 1 of 3 — What & Name"}
              {currentStep === 2 && "Step 2 of 3 — Pricing & Configuration"}
              {currentStep === 3 && "Step 3 of 3 — Confirm & Save"}
              {currentStep === 4 && "⚡ Smart Lab Predictions"}
            </span>
            <span className="text-[10px] font-mono font-bold text-primary">
              Step {currentStep} of 4
            </span>
          </div>
        </div>

        {/* Dynamic Multi-Step Wrapper */}
        <div className="flex-1 mt-6">
          {/* STEP 1: What type is this product? */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-[#007E85] mb-2 block">What are you adding?</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setProductType("simple")}
                    className={cn(
                      "cursor-pointer p-4 rounded-xl border-2 text-left transition-all hover:shadow-md flex flex-col gap-1.5",
                      productType === "simple" ? "border-primary bg-primary/[0.03] shadow-sm" : "border-border hover:border-gray-300"
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center font-bold text-lg">📦</div>
                    <div className="font-bold text-sm text-slate-800">Simple item</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">One price, one stock count</div>
                  </div>

                  <div 
                    onClick={() => setProductType("variants")}
                    className={cn(
                      "cursor-pointer p-4 rounded-xl border-2 text-left transition-all hover:shadow-md flex flex-col gap-1.5",
                      productType === "variants" ? "border-primary bg-primary/[0.03] shadow-sm" : "border-border hover:border-gray-300"
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-pink-100/70 text-pink-600 flex items-center justify-center font-bold text-lg">
                      {isPhoneAccessoriesSeller ? "📱" : "👕"}
                    </div>
                    <div className="font-bold text-sm text-slate-800">
                      {isPhoneAccessoriesSeller ? "Has model / color variants" : "Has options"}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      {isPhoneAccessoriesSeller ? "Compatible models (iPhone 15, S24) or color styles" : "Different colours / sizes"}
                    </div>
                  </div>

                  <div 
                    onClick={() => setProductType("bulk")}
                    className={cn(
                      "cursor-pointer p-4 rounded-xl border-2 text-left transition-all hover:shadow-md flex flex-col gap-1.5",
                      productType === "bulk" ? "border-primary bg-primary/[0.03] shadow-sm" : "border-border hover:border-gray-300"
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-amber-100/70 text-amber-600 flex items-center justify-center font-bold text-lg">🌾</div>
                    <div className="font-bold text-sm text-slate-800">Sold in bulk units</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">Bag, mudu, carton, yard...</div>
                  </div>

                  <div 
                    onClick={() => setProductType("both")}
                    className={cn(
                      "cursor-pointer p-4 rounded-xl border-2 text-left transition-all hover:shadow-md flex flex-col gap-1.5",
                      productType === "both" ? "border-primary bg-primary/[0.03] shadow-sm" : "border-border hover:border-gray-300"
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-purple-100/70 text-purple-600 flex items-center justify-center font-bold text-lg">🧵</div>
                    <div className="font-bold text-sm text-slate-800">Both options &amp; bulk</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">e.g. fabric: colour + yard/roll</div>
                  </div>
                </div>
              </div>

              {/* Product Info Fields */}
              <div className="space-y-4 pt-2 border-t">
                <div className="relative">
                  <label className={labelCls}>Product Name *</label>
                  <input 
                    {...register("name")} 
                    className={inputCls} 
                    placeholder={isPharmacy ? "e.g. Paracetamol, Amoxil, Coartem..." : "e.g. Ankara Wax Fabric or Peak Milk"} 
                    onFocus={() => setShowNameSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowNameSuggestions(false), 200);
                    }}
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}

                  {/* Clinical Drug Library Autocomplete Dropdown */}
                  {isPharmacy && showNameSuggestions && matchedDrugs.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-teal-100 rounded-lg shadow-lg divide-y divide-slate-100 dark:divide-slate-800 scrollbar-none">
                      <div className="p-1.5 bg-teal-50/50 dark:bg-teal-950/20 text-[9px] font-extrabold text-teal-800 dark:text-teal-300 flex items-center justify-between">
                        <span>💡 INBUILT NAFDAC/WHO DRUG SUGGESTIONS</span>
                        <span>{matchedDrugs.length} matched</span>
                      </div>
                      {matchedDrugs.map((drug) => (
                        <button
                          key={drug.id}
                          type="button"
                          className="w-full text-left p-2.5 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all flex items-center justify-between"
                          onMouseDown={() => {
                            setValue("name", drug.name);
                            setValue("description", drug.description);
                            if (drug.imageUrl) {
                              setValue("imageUrl", drug.imageUrl);
                            }
                            
                            // Try to find matching category by name
                            const matchCat = categories.find(c => 
                              c.name.toLowerCase().includes(drug.category.toLowerCase()) || 
                              drug.category.toLowerCase().includes(c.name.toLowerCase())
                            );
                            if (matchCat) {
                              setValue("categoryId", matchCat.id);
                            }
                            
                            setDosageForm(drug.dosageForm);
                            setRequiresPrescription(drug.requiresPrescription);
                            
                            setShowNameSuggestions(false);
                            toast.success(`Loaded clinical details for ${drug.name}!`);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{drug.emoji}</span>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{drug.name}</p>
                              <p className="text-[9px] text-muted-foreground">{drug.activeIngredient} · {drug.manufacturer}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                              drug.requiresPrescription 
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" 
                                : "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
                            )}>
                              {drug.requiresPrescription ? "POM (Rx)" : "OTC"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>SKU Code *</label>
                    <div className="relative">
                      <input 
                        {...register("sku")} 
                        className={cn(inputCls, "pr-12 font-mono font-semibold text-xs")} 
                        placeholder="SKU-990" 
                      />
                      {name && sku !== generateSuggestedSku(name) && (
                        <button
                          type="button"
                          onClick={handleApplySuggestedSku}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-sky-100 text-sky-800 hover:bg-sky-200 font-bold px-1.5 py-0.5 rounded"
                          title="Generate brand code automatically"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                    {errors.sku && <p className="text-xs text-rose-500 mt-1">{errors.sku.message}</p>}
                  </div>

                  <div>
                    <label className={labelCls}>Category</label>
                    <Select value={watch("categoryId") || "none"} onValueChange={(v) => setValue("categoryId", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">General / Uncategorized</SelectItem>
                        {filteredCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Optional description with generator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls}>Short Description</label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] gap-1 text-[#007E85] font-bold hover:bg-[#007E85]/5"
                      onClick={async () => {
                        if (!name) {
                          toast.error("Enter a product name first!");
                          return;
                        }
                        setIsGenerating(true);
                        try {
                          const catId = watch("categoryId");
                          const catName = categories.find(c => c.id === catId)?.name || "General";
                          const desc = await generateProductDescription(name, catName);
                          setValue("description", desc);
                          toast.success("AI synthesized description successfully!");
                        } catch (err) {
                          toast.error("Failed to generate description");
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      disabled={isGenerating}
                    >
                      <Sparkles className="h-3 w-3" />
                      Magic Write
                    </Button>
                  </div>
                  <textarea 
                    {...register("description")} 
                    rows={2} 
                    className="w-full rounded-md border border-input text-xs p-2 outline-none focus:ring-1 focus:ring-primary h-14 resize-none" 
                    placeholder="Describe main characteristics..." 
                  />
                </div>

                {/* Product Picture Field */}
                <div>
                  <label className={labelCls}>Product Picture</label>
                  <div className="flex items-center gap-4 mt-1 bg-background/50 p-3 rounded-lg border">
                    {imageUrl ? (
                      <div className="relative h-16 w-16 rounded-lg overflow-hidden border bg-muted shrink-0">
                        <img src={imageUrl} alt="Product preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setValue("imageUrl", "")}
                          className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-16 w-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-[#007E85]/50 hover:text-[#007E85] transition-colors bg-muted/10 group shrink-0"
                      >
                        <ImageIcon className="w-5 h-5 group-hover:scale-105 transition-transform" />
                        <span className="text-[8px] font-bold mt-1 uppercase">Add</span>
                      </button>
                    )}
                    <div className="flex-1 text-[11px] text-muted-foreground leading-normal">
                      <p className="font-semibold text-foreground/80 text-xs">Upload product photo</p>
                      <p className="text-[10px]">Optional. Supports PNG, JPG, or WEBP.</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#007E85] font-bold underline mt-0.5 inline-block text-[10px]"
                      >
                        Browse file
                      </button>
                    </div>
                  </div>
                </div>

                {isPhoneAccessoriesSeller && (
                  <div className="p-4 bg-teal-50/35 border border-teal-200/60 rounded-xl space-y-3.5 shadow-none">
                    <div className="flex items-center gap-1.5 text-teal-700 font-extrabold text-xs uppercase tracking-wider">
                      <Smartphone className="w-3.5 h-3.5" /> 🔌 Phone Accessories Profile
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight -mt-1.5">
                      Specify compatibility, materials, and warranty to streamline catalog filtering and matching.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className={labelCls}>Accessory Type</label>
                        <Select value={accessoryType} onValueChange={setAccessoryType}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="case">Case / Cover</SelectItem>
                            <SelectItem value="charger">Charger / Adapter</SelectItem>
                            <SelectItem value="cable">Charging Cable</SelectItem>
                            <SelectItem value="audio">Earphones / Audio</SelectItem>
                            <SelectItem value="protector">Screen Protector</SelectItem>
                            <SelectItem value="powerbank">Power Bank</SelectItem>
                            <SelectItem value="mount">Mount / Holder</SelectItem>
                            <SelectItem value="other">Other Accessory</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className={labelCls}>Compatible Devices</label>
                        <input 
                          type="text" 
                          value={compatibility} 
                          onChange={(e) => setCompatibility(e.target.value)} 
                          className={inputCls} 
                          placeholder="e.g. iPhone 15 Pro, S24" 
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Brand / Focus</label>
                        <input 
                          type="text" 
                          value={brandFocus} 
                          onChange={(e) => setBrandFocus(e.target.value)} 
                          className={inputCls} 
                          placeholder="e.g. Oraimo, Apple, Anker" 
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Material / Style</label>
                        <input 
                          type="text" 
                          value={material} 
                          onChange={(e) => setMaterial(e.target.value)} 
                          className={inputCls} 
                          placeholder="e.g. Silicon, Tempered Glass" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Warranty Period</label>
                      <Select value={warrantyPeriod} onValueChange={setWarrantyPeriod}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="No warranty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No warranty</SelectItem>
                          <SelectItem value="1_month">1 Month Warranty</SelectItem>
                          <SelectItem value="3_months">3 Months Warranty</SelectItem>
                          <SelectItem value="6_months">6 Months Warranty</SelectItem>
                          <SelectItem value="1_year">1 Year Warranty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 1 Actions */}
              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  className="w-full h-10 font-bold" 
                  disabled={!name || !sku}
                  onClick={() => setCurrentStep(2)}
                >
                  Configure Pricing &amp; Stock →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Configure Pricing & Option layouts */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* === TEMPLATE SIMPLE === */}
              {productType === "simple" && (
                <div className="space-y-5">
                  <div className="p-4 bg-blue-50/40 rounded-xl border relative">
                    <span className="absolute top-2 right-2 text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">Simple</span>
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">Pricing details</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Selling Price *</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-extrabold">₦</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            {...register("sellingPrice")} 
                            className={`${inputCls} pl-6 font-mono font-bold`} 
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Cost price (optional)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold font-mono">₦</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            {...register("costPrice")} 
                            className={`${inputCls} pl-6 text-muted-foreground font-mono`} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/40 rounded-xl border space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Inventory &amp; Reorder Controls</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Base Unit:</span>
                        <select 
                          value={watch("unit")} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setValue("unit", val);
                            const matchedType = SUPPORTED_UNITS.find(u => u.id === val)?.type || "count";
                            setValue("unitType", matchedType);
                          }}
                          className="h-6 rounded border bg-transparent text-[11px] px-1.5 font-bold text-primary focus:outline-none"
                        >
                          {allowedUnits.map(u => (
                            <option key={u.id} value={u.id}>{u.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelCls}>
                          Stock <span className="text-primary font-mono text-[10px]">({watch("unit")})</span>
                        </label>
                        <input 
                          type="number" 
                          {...register("currentStock")} 
                          className={`${inputCls} font-mono`} 
                        />
                      </div>

                      <div>
                        <label className={labelCls}>
                          Alert Pt <span className="text-primary font-mono text-[10px]">({watch("unit")})</span>
                        </label>
                        <input 
                          type="number" 
                          {...register("reorderPoint")} 
                          className={`${inputCls} font-mono`} 
                        />
                      </div>

                      <div>
                        <label className={labelCls}>
                          Reorder Qty <span className="text-primary font-mono text-[10px]">({watch("unit")})</span>
                        </label>
                        <input 
                          type="number" 
                          {...register("reorderQuantity")} 
                          className={`${inputCls} font-mono`} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TEMPLATE BULK === */}
              {productType === "bulk" && (
                <div className="space-y-5">
                  <div className="p-4 bg-amber-50/40 border border-amber-200/60 rounded-xl space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest">Base Multiplier Configuration</h4>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">Bulk</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelCls}>Smallest Unit</label>
                        <div className="flex gap-1.5">
                          <input 
                            {...register("unit")} 
                            className={`${inputCls} flex-1`} 
                            placeholder="mudu, yard..." 
                          />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                setValue("unit", e.target.value);
                              }
                            }}
                            value={watch("unit") || ""}
                            className="h-9 rounded-md border border-input bg-muted px-2 text-xs font-semibold max-w-[110px]"
                          >
                            <option value="">-- Preset --</option>
                            <option value="pcs">Pcs</option>
                            <option value="mudu">Mudu</option>
                            <option value="kongo">Kongo</option>
                            <option value="derica">Derica</option>
                            <option value="paint bucket">Paint Bucket</option>
                            <option value="paint rubber">Paint Rubber</option>
                            <option value="bag">Bag</option>
                            <option value="carton">Carton</option>
                            <option value="yard">Yard</option>
                            <option value="roll">Roll</option>
                            <option value="cup">Cup</option>
                            <option value="crate">Crate</option>
                            <option value="kg">Kg</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Sale Price</label>
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">₦</span>
                          <input 
                            type="number" 
                            {...register("sellingPrice")} 
                            className={`${inputCls} pl-4 font-mono font-bold text-xs`} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Cost Price (₦)</label>
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">₦</span>
                          <input 
                            type="number" 
                            {...register("costPrice")} 
                            className={`${inputCls} pl-4 font-mono text-xs`} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Common local nigerian preset tags */}
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block mb-1">Local Nigerian Preset Templates:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyUnitPreset("foodstuff")}
                          className="bg-amber-100/60 hover:bg-amber-200/60 text-amber-800 text-[10px] uppercase font-extrabold px-2 py-1 rounded"
                        >
                          🌾 Foodstuff (Mudu / Bag)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyUnitPreset("textile")}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] uppercase font-extrabold px-2 py-1 rounded"
                        >
                          🧵 Textile (Yard / Roll)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyUnitPreset("cosmetics")}
                          className="bg-pink-100 hover:bg-pink-200 text-pink-800 text-[10px] uppercase font-extrabold px-2 py-1 rounded"
                        >
                          💄 Cosmetics (Pcs / Carton)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Multiple units row with custom conversions */}
                  <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Unit Conversions</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          const current = watch("unitConversions") || [];
                          setValue("unitConversions", [
                            ...current,
                            { unitId: "bag", multiplier: 10, priceNgn: (watch("sellingPrice") || 0) * 10 }
                          ]);
                        }}
                      >
                        + Add Unit Level
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(watch("unitConversions") || []).map((conv, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-border shadow-sm flex flex-col gap-2 relative">
                          <button
                            type="button"
                            className="absolute top-1 right-1 text-slate-400 hover:text-red-500"
                            onClick={() => {
                              const current = watch("unitConversions") || [];
                              setValue("unitConversions", current.filter((_, i) => i !== idx));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </button>

                          <div className="grid grid-cols-2 gap-2 mt-2">
                             <div>
                              <span className="text-[10px] text-slate-500 font-bold block mb-1">Unit Name</span>
                              <div className="flex gap-1.5">
                                <input 
                                  {...register(`unitConversions.${idx}.unitId` as const)}
                                  className="h-8 border rounded px-2 flex-1 text-xs font-semibold"
                                  placeholder="e.g. mudu, carton"
                                />
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setValue(`unitConversions.${idx}.unitId`, e.target.value);
                                    }
                                  }}
                                  value={watch(`unitConversions.${idx}.unitId`) || ""}
                                  className="h-8 rounded border border-input bg-muted px-1 text-[10px] font-semibold max-w-[90px]"
                                >
                                  <option value="">-- Preset --</option>
                                  <option value="pcs">Pcs</option>
                                  <option value="mudu">Mudu</option>
                                  <option value="kongo">Kongo</option>
                                  <option value="derica">Derica</option>
                                  <option value="paint bucket">Paint Bucket</option>
                                  <option value="paint rubber">Paint Rubber</option>
                                  <option value="bag">Bag</option>
                                  <option value="carton">Carton</option>
                                  <option value="yard">Yard</option>
                                  <option value="roll">Roll</option>
                                  <option value="cup">Cup</option>
                                  <option value="crate">Crate</option>
                                  <option value="kg">Kg</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block mb-1">Contains (= how many {watch("unit") || "pcs"})</span>
                              <input 
                                type="number"
                                {...register(`unitConversions.${idx}.multiplier` as const)}
                                className="h-8 border rounded px-2 w-full text-xs font-mono font-bold"
                                placeholder="50"
                              />
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block mb-1">Bulk Selling Price (₦)</span>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">₦</span>
                              <input 
                                type="number"
                                {...register(`unitConversions.${idx}.priceNgn` as const)}
                                className="h-8 border rounded pl-6 pr-2 w-full text-xs font-mono font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {(watch("unitConversions") || []).length === 0 && (
                        <p className="text-center text-[11px] text-slate-500 italic py-3">
                          No wholesale unit sizes configured yet. Pack metrics can be calculated transparently.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stock parameters */}
                  <div className="p-4 bg-slate-50 rounded-xl border">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2.5">Stock &amp; Reorder Controls</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelCls}>Stock ({watch("unit") || "units"})</label>
                        <input 
                          type="number" 
                          {...register("currentStock")} 
                          className={`${inputCls} font-mono`} 
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Alert ({watch("unit") || "units"})</label>
                        <input 
                          type="number" 
                          {...register("reorderPoint")} 
                          className={`${inputCls} font-mono`} 
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Reorder Qty ({watch("unit") || "units"})</label>
                        <input 
                          type="number" 
                          {...register("reorderQuantity")} 
                          className={`${inputCls} font-mono`} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TEMPLATE VARIANTS === */}
              {productType === "variants" && (
                <div className="space-y-5">
                  <div className="p-4 bg-pink-50/30 border border-pink-100/70 rounded-xl space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-[#007E85]">Options Matrix</span>
                      <span className="text-[10px] bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full font-bold uppercase font-mono">Variants</span>
                    </div>

                    {/* Colours Chips list with manual action */}
                    <div className="space-y-1.5">
                      <span className={labelCls}>Colours Available</span>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {availColours.map((color, idx) => (
                          <span key={idx} className="bg-white border rounded-full pl-3 pr-2 py-1 text-xs font-semibold text-slate-700 inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.toLowerCase() }} />
                            {color}
                            <button 
                              type="button" 
                              className="text-slate-400 hover:text-red-500 ml-1"
                              onClick={() => setAvailColours(availColours.filter(c => c !== color))}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          value={newColourInput} 
                          onChange={e => setNewColourInput(e.target.value)}
                          className="h-8 border rounded-md px-2.5 text-xs flex-1"
                          placeholder="e.g. Black"
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => {
                            if (newColourInput.trim()) {
                              setAvailColours([...availColours, newColourInput.trim()]);
                              setNewColourInput("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>

                      {isPhoneAccessoriesSeller && (
                        <div className="pt-1.5 flex flex-wrap gap-1 items-center">
                          <span className="text-[9px] text-muted-foreground font-extrabold mr-1">Palettes:</span>
                          {[
                            { label: "Basic", list: ["Black", "Clear", "White"] },
                            { label: "Titanium", list: ["Natural Titanium", "Blue Titanium", "Black Titanium", "White Titanium"] },
                            { label: "Sleek", list: ["Sierra Blue", "Space Gray", "Deep Purple", "Pink"] }
                          ].map(pal => (
                            <button
                              key={pal.label}
                              type="button"
                              onClick={() => {
                                const newCols = [...availColours];
                                pal.list.forEach(c => {
                                  if (!newCols.includes(c)) newCols.push(c);
                                });
                                setAvailColours(newCols);
                                toast.success(`Added ${pal.label} colors.`);
                              }}
                              className="text-[9px] bg-teal-50 border border-teal-200/50 hover:bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded-md transition-all active:scale-95"
                            >
                              + {pal.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sizes chips */}
                    <div className="space-y-1.5 pt-2 border-t border-dashed">
                      <span className={labelCls}>
                        {isPhoneAccessoriesSeller ? "Compatible Models" : "Sizes Available"}
                      </span>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {availSizes.map((sz, idx) => (
                          <span key={idx} className="bg-white border rounded-full px-3 py-1 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5">
                            {sz}
                            <button 
                              type="button" 
                              className="text-slate-400 hover:text-red-500"
                              onClick={() => setAvailSizes(availSizes.filter(s => s !== sz))}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          value={newSizeInput} 
                          onChange={e => setNewSizeInput(e.target.value)}
                          className="h-8 border rounded-md px-2.5 text-xs flex-1"
                          placeholder={isPhoneAccessoriesSeller ? "e.g. iPhone 15 Pro Max" : "e.g. 42 or XL"}
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => {
                            if (newSizeInput.trim()) {
                              setAvailSizes([...availSizes, newSizeInput.trim()]);
                              setNewSizeInput("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>

                      {isPhoneAccessoriesSeller && (
                        <div className="pt-1.5 flex flex-wrap gap-1 items-center">
                          <span className="text-[9px] text-muted-foreground font-extrabold mr-1">Models:</span>
                          {[
                            { label: "iPhone 15", list: ["iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max"] },
                            { label: "iPhone 14", list: ["iPhone 14", "iPhone 14 Pro", "iPhone 14 Pro Max"] },
                            { label: "iPhone 13", list: ["iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max"] },
                            { label: "Galaxy S24", list: ["Galaxy S24", "Galaxy S24 Plus", "Galaxy S24 Ultra"] }
                          ].map(pal => (
                            <button
                              key={pal.label}
                              type="button"
                              onClick={() => {
                                const newSzs = [...availSizes];
                                pal.list.forEach(s => {
                                  if (!newSzs.includes(s)) newSzs.push(s);
                                });
                                setAvailSizes(newSzs);
                                toast.success(`Added ${pal.label} series compatible models.`);
                              }}
                              className="text-[9px] bg-teal-50 border border-teal-200/50 hover:bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded-md transition-all active:scale-95"
                            >
                              + {pal.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Toggle Same price for all variants */}
                  <div className="p-4 bg-slate-50 border rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[12px] font-bold text-slate-800">Same price for all variants?</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {isPhoneAccessoriesSeller 
                            ? "Most accessories dealers sell the same design across different phone models at one price."
                            : "Most boutiques sell the same item style at one price."}
                        </p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={samePriceForVariants}
                        onChange={e => setSamePriceForVariants(e.target.checked)}
                        className="h-4 w-4 text-primary rounded"
                      />
                    </div>

                    {samePriceForVariants ? (
                      <div className="space-y-4 pt-2 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Selling Price * (₦)</label>
                            <input 
                              type="number"
                              {...register("sellingPrice")} 
                              className={`${inputCls} font-mono font-bold`} 
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Cost price (₦)</label>
                            <input 
                              type="number"
                              {...register("costPrice")} 
                              className={`${inputCls} font-mono`} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className={labelCls}>Stock per Variant</label>
                            <input 
                              type="number"
                              {...register("currentStock")} 
                              className={`${inputCls} font-mono`} 
                              placeholder="e.g. 5"
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Alert point</label>
                            <input 
                              type="number"
                              {...register("reorderPoint")} 
                              className={`${inputCls} font-mono`} 
                              placeholder="e.g. 2"
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Reorder Qty</label>
                            <input 
                              type="number"
                              {...register("reorderQuantity")} 
                              className={`${inputCls} font-mono`} 
                              placeholder="e.g. 10"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowFineTune(!showFineTune)}
                          className="flex items-center justify-between w-full text-xs font-bold text-[#007E85] pb-2"
                        >
                          📊 Fine-tune individual variants {showFineTune ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        
                        {showFineTune && (
                          <div className="max-h-[180px] overflow-y-auto space-y-2 mt-2 pr-1 border rounded p-2 bg-white">
                            {availColours.flatMap(c => availSizes.map(s => `${c} - ${s}`)).map((vName, vIdx) => (
                              <div key={vIdx} className="flex items-center justify-between gap-2 p-1.5 border-b last:border-b-0 text-xs">
                                <span className="font-semibold text-slate-700 shrink-0 w-24 truncate">{vName}</span>
                                <div className="flex gap-2">
                                  <input 
                                    type="number"
                                    placeholder="Price ₦"
                                    className="h-7 w-20 border rounded px-1.5 text-[11px] font-mono text-right"
                                    onChange={e => {
                                      setFineTunedVariants({
                                        ...fineTunedVariants,
                                        [vName]: { 
                                          price: Number(e.target.value) || 0, 
                                          stock: fineTunedVariants[vName]?.stock || 0 
                                        }
                                      });
                                    }}
                                  />
                                  <input 
                                    type="number"
                                    placeholder="Qty"
                                    className="h-7 w-14 border rounded px-1.5 text-[11px] font-mono text-center"
                                    onChange={e => {
                                      setFineTunedVariants({
                                        ...fineTunedVariants,
                                        [vName]: { 
                                          price: fineTunedVariants[vName]?.price || 0, 
                                          stock: Number(e.target.value) || 0 
                                        }
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-3 mt-3 border-t">
                          <div>
                            <label className={labelCls}>Alert Threshold (All variants)</label>
                            <input 
                              type="number"
                              {...register("reorderPoint")} 
                              className={`${inputCls} font-mono`} 
                              placeholder="e.g. 2"
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Reorder Qty (All variants)</label>
                            <input 
                              type="number"
                              {...register("reorderQuantity")} 
                              className={`${inputCls} font-mono`} 
                              placeholder="e.g. 10"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Live Counter Summary */}
                    <div className="bg-sky-50 p-3 rounded-lg border border-sky-100 text-[11px] text-sky-800 flex items-center gap-2">
                      <div className="bg-sky-500 text-white rounded-full h-4 w-4 flex items-center justify-center font-bold">✓</div>
                      <span>
                        <strong>{getVariantCount()} variants</strong> will be created: {availColours.length} colours × {availSizes.length} {isPhoneAccessoriesSeller ? "models" : "sizes"}.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* === TEMPLATE BOTH === */}
              {productType === "both" && (
                <div className="space-y-5">
                  <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-xl space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-[#007E85]">Options + Bulk Combo</span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold uppercase">Both</span>
                    </div>

                    {/* Colors chips */}
                    <div>
                      <label className={labelCls}>Colours Available</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {availColours.map((color, idx) => (
                          <span key={idx} className="bg-white border rounded-full px-3 py-1 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5">
                            {color}
                            <button 
                              type="button" 
                              className="text-slate-400 hover:text-red-500"
                              onClick={() => setAvailColours(availColours.filter(c => c !== color))}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          value={newColourInput} 
                          onChange={e => setNewColourInput(e.target.value)}
                          className="h-8 border rounded px-2.5 text-xs flex-1"
                          placeholder="e.g. Royal Blue"
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => {
                            if (newColourInput.trim()) {
                              setAvailColours([...availColours, newColourInput.trim()]);
                              setNewColourInput("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Smallest unit base */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed">
                      <div>
                        <label className={labelCls}>Smallest Unit</label>
                        <input {...register("unit")} className={inputCls} placeholder="yard" />
                      </div>
                      <div>
                        <label className={labelCls}>Sale Price (₦)</label>
                        <input type="number" {...register("sellingPrice")} className={`${inputCls} font-mono font-bold`} />
                      </div>
                      <div>
                        <label className={labelCls}>Cost price (₦)</label>
                        <input type="number" {...register("costPrice")} className={`${inputCls} font-mono`} />
                      </div>
                    </div>
                  </div>

                  {/* Stock parameters for Both */}
                  <div className="p-4 bg-slate-50 border rounded-xl space-y-2.5">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest">Stock &amp; Reorder Controls</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelCls}>Stock ({watch("unit") || "units"})</label>
                        <input 
                          type="number" 
                          {...register("currentStock")} 
                          className={`${inputCls} font-mono`} 
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Alert ({watch("unit") || "units"})</label>
                        <input 
                          type="number" 
                          {...register("reorderPoint")} 
                          className={`${inputCls} font-mono`} 
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Reorder Qty ({watch("unit") || "units"})</label>
                        <input 
                          type="number" 
                          {...register("reorderQuantity")} 
                          className={`${inputCls} font-mono`} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bulk conversion rows */}
                  <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-800">Selling Units (Calculated Multipliers)</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          const current = watch("unitConversions") || [];
                          setValue("unitConversions", [
                            ...current,
                            { unitId: "roll", multiplier: 50, priceNgn: (watch("sellingPrice") || 0) * 45 }
                          ]);
                        }}
                      >
                        + Add Unit
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {(watch("unitConversions") || []).map((conv, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border flex items-center justify-between gap-3 relative pr-8">
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                            onClick={() => {
                              const current = watch("unitConversions") || [];
                              setValue("unitConversions", current.filter((_, i) => i !== idx));
                            }}
                          >
                            ×
                          </button>
                          <div className="text-xs">
                            <span className="font-bold text-slate-800 uppercase block">{watch(`unitConversions.${idx}.unitId`)}</span>
                            <span className="text-[10px] text-slate-500">
                              = {watch(`unitConversions.${idx}.multiplier`)} {watch("unit") || "yards"}
                            </span>
                          </div>
                          <div className="w-28 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">₦</span>
                            <input 
                              type="number"
                              {...register(`unitConversions.${idx}.priceNgn` as const)}
                              className="h-7 border rounded text-right pr-2 pl-5 font-mono text-[11px] w-full font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pharmacy Clinical Specifications */}
              {isPharmacy && (
                <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-100 dark:border-teal-900/60 space-y-4 shadow-none">
                  <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
                    <Pill className="w-3.5 h-3.5" />
                    Pharmacy Clinical Specifications
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Expiry Date *</label>
                      <input 
                        type="date" 
                        value={expiryDate} 
                        onChange={e => setExpiryDate(e.target.value)} 
                        className={inputCls} 
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Batch Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. BNT-2026X" 
                        value={batchNumber} 
                        onChange={e => setBatchNumber(e.target.value)} 
                        className={inputCls} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Dosage Form</label>
                      <select 
                        value={dosageForm} 
                        onChange={e => setDosageForm(e.target.value)} 
                        className={inputCls}
                      >
                        <option value="">Select form...</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Liquid/Suspension">Liquid / Suspension</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Inhaler">Inhaler</option>
                        <option value="Injection Pen">Injection Pen</option>
                        <option value="Cream/Ointment">Cream / Ointment</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg border border-teal-100 dark:border-teal-900/40 bg-teal-50/10 mt-5">
                      <div className="mr-2">
                        <span className="text-[10px] font-bold text-teal-900 dark:text-teal-300">Requires Rx?</span>
                        <p className="text-[8px] text-muted-foreground leading-tight">Prescription needed.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={requiresPrescription} 
                        onChange={e => setRequiresPrescription(e.target.checked)} 
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 buttons */}
              <div className="flex gap-2 pt-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 h-10 font-bold"
                  onClick={() => setCurrentStep(1)}
                >
                  ← Back to Name
                </Button>
                <Button 
                  type="button" 
                  className="flex-1 h-10 font-bold"
                  onClick={() => setCurrentStep(3)}
                >
                  Confirm &amp; Review →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm & Review Summary */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="p-5 bg-[#007E85]/5 border border-[#007E85]/10 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-[#007E85] font-bold text-sm">
                  <span className="text-lg">✓</span>
                  <span>Review Product Details</span>
                </div>
                <div className="space-y-3 pt-2 text-xs">
                  <div className={cn(
                    "flex justify-between border-b pb-2 transition-all duration-1000 rounded px-1.5 py-1",
                    highlightedFields.name && "bg-emerald-100/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500 scale-[1.02] shadow-sm animate-pulse"
                  )}>
                    <span className="text-slate-500 font-bold uppercase">Product name</span>
                    <span className="font-bold text-slate-900">{watch("name") || "(untitled)"}</span>
                  </div>

                  <div className={cn(
                    "flex justify-between border-b pb-2 transition-all duration-1000 rounded px-1.5 py-1",
                    highlightedFields.sku && "bg-emerald-100/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500 scale-[1.02] shadow-sm animate-pulse"
                  )}>
                    <span className="text-slate-500 font-bold uppercase">SKU code</span>
                    <span className="font-mono font-bold text-slate-800">{watch("sku") || "(none)"}</span>
                  </div>

                  <div className={cn(
                    "flex justify-between border-b pb-2 transition-all duration-1000 rounded px-1.5 py-1",
                    highlightedFields.price && "bg-emerald-100/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500 scale-[1.02] shadow-sm animate-pulse"
                  )}>
                    <span className="text-slate-500 font-bold uppercase">Selling Price</span>
                    <span className="font-mono font-extrabold text-[#007E85]">₦{(watch("sellingPrice") || 0).toLocaleString()}</span>
                  </div>

                  {watch("imageUrl") && (
                    <div className={cn(
                      "flex items-center justify-between border-b pb-2 transition-all duration-1000 rounded px-1.5 py-1",
                      highlightedFields.image && "bg-emerald-100/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500 scale-[1.02] shadow-sm animate-pulse"
                    )}>
                      <span className="text-slate-500 font-bold uppercase">Captured Photo</span>
                      <img src={watch("imageUrl") || ""} alt="Captured preview" className="w-10 h-10 object-cover rounded-md border" />
                    </div>
                  )}

                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500 font-bold uppercase">Category</span>
                    <span className="font-semibold text-slate-900">
                      {categories.find(c => c.id === watch("categoryId"))?.name || "General / Uncategorized"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500 font-bold uppercase">Flow template</span>
                    <span className="font-extrabold text-[#007E85] uppercase tracking-wider">{productType}</span>
                  </div>

                  <div className={cn(
                    "flex justify-between border-b pb-2 transition-all duration-1000 rounded px-1.5 py-1",
                    highlightedFields.unit && "bg-emerald-100/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500 scale-[1.02] shadow-sm animate-pulse"
                  )}>
                    <span className="text-slate-500 font-bold uppercase">Base Unit</span>
                    <span className="font-bold text-slate-900 uppercase">{watch("unit") || "pcs"}</span>
                  </div>

                  <div className={cn(
                    "flex justify-between border-b pb-2 transition-all duration-1000 rounded px-1.5 py-1",
                    highlightedFields.unitConversions && "bg-emerald-100/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500 scale-[1.02] shadow-sm animate-pulse"
                  )}>
                    <span className="text-slate-500 font-bold uppercase">Configuration</span>
                    <span className="font-semibold text-slate-900">
                      {productType === "simple" && "1 Price · 1 Stock ledger"}
                      {productType === "variants" && `${getVariantCount()} variants (${availColours.length} Cols × ${availSizes.length} ${isPhoneAccessoriesSeller ? "Models" : "Sizes"})`}
                      {productType === "bulk" && `Bulk units enabled with conversion metrics`}
                      {productType === "both" && `${availColours.length} Colours with wholesale multipliers`}
                    </span>
                  </div>

                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500 font-bold uppercase">Base Stock value</span>
                    <span className="font-extrabold text-[#007E85] font-mono text-sm">
                      ₦{simulatedTotalStockVal().toLocaleString()}
                    </span>
                  </div>

                  {isPharmacy && (
                    <div className="border-t pt-2 mt-2 space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-teal-600 dark:text-teal-400 font-bold uppercase">Expiry Date</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{expiryDate || "Not Set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-teal-600 dark:text-teal-400 font-bold uppercase">Batch Number</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{batchNumber || "Not Set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-teal-600 dark:text-teal-400 font-bold uppercase">Dosage Form</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{dosageForm || "Not Set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-teal-600 dark:text-teal-400 font-bold uppercase">Prescription Req. (POM)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{requiresPrescription ? "Yes (Requires Prescription)" : "No (Over-The-Counter)"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced toggle inside step 3 panel */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-xs font-extrabold text-slate-700 uppercase tracking-wider"
                >
                  ⚙️ Advanced fields (Supplier, Location) {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4 pt-1 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className={labelCls}>Supplier Partner</span>
                        <Select value={watch("supplierId") || "none"} onValueChange={(v) => setValue("supplierId", v === "none" ? "" : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="General" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">General / Unassigned</SelectItem>
                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <span className={labelCls}>Location Point</span>
                        <Select value={watch("locationId") || "none"} onValueChange={(v) => setValue("locationId", v === "none" ? "" : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Main Store" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Main Warehouse / Shelf</SelectItem>
                            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer font-bold uppercase tracking-wide text-xs">
                        <input 
                          type="checkbox" 
                          {...register("isEcommerceEnabled")}
                          className="h-4 w-4 text-primary rounded"
                        />
                        <span>Enable for client Catalog</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 h-11 font-bold"
                  onClick={() => setCurrentStep(2)}
                >
                  ← Back to inputs
                </Button>
                <Button 
                  type="button" 
                  disabled={loading}
                  onClick={() => handleSubmit(onSubmit)()}
                  className="flex-1 h-11 font-extrabold shadow-md bg-[#007E85] text-white hover:bg-[#007E85]/90"
                >
                  {loading ? "Processing..." : "Save Product"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Smart Tech Suggestions UI Lab (Additional ideas worth considering!) */}
          {currentStep === 4 && (
            <div className="space-y-5 pb-8">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 flex gap-2.5">
                <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">i</div>
                <div>
                  <h4 className="font-extrabold text-xs text-indigo-900 uppercase">NexaOS Innovation Preview Lab</h4>
                  <p className="text-[11px] text-indigo-700 leading-normal mt-0.5">
                    Experiment with these next-gen smart features in-context below to see how they elevate speed in busy retail venues!
                  </p>
                </div>
              </div>

              {/* 1. Voice Input simulator */}
              <div className="p-4 bg-white rounded-xl border shadow-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                    <Mic className="h-4 w-4 text-indigo-600" />
                    <span>Voice Input (Name &amp; Price)</span>
                  </div>
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">Nigerian AI Core</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Older traders type slowly. Let cashiers say <strong>\"Ankara fabric, four thousand five hundred naira\"</strong> to pre-parse everything.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerVoiceSimulation}
                  className="w-full text-xs h-8 bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                  disabled={voiceSimState === "listening"}
                >
                  {voiceSimState === "listening" ? "🎙️ Recording: 'Ankara fabric 4,500'..." : "🎤 Click to Speak 'Ankara fabric, 4,500'"}
                </Button>
              </div>

              {/* 2. Scan to Create */}
              <div className="p-4 bg-white rounded-xl border shadow-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                    <Barcode className="h-4 w-4 text-emerald-600" />
                    <span>Scan-to-Create (Barcode Lookup)</span>
                  </div>
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">Shared Database</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Supermarkets or pharmacies can snap a pack barcode (e.g. Peak Milk) to prefill name &amp; standard category from Nexa's cloud ledger.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs h-8 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 font-bold"
                  disabled={barcodeSimState === "scanning"}
                  onClick={triggerBarcodeSimulation}
                >
                  {barcodeSimState === "scanning" ? "🔍 Scanning UPC Code..." : "📷 Simulate Laser scan 'Peak Milk' Barcode"}
                </Button>
              </div>

              {/* 3. Photo-First entry */}
              <div className="p-4 bg-white rounded-xl border shadow-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                    <Camera className="h-4 w-4 text-amber-600" />
                    <span>Photo-First \"Snap &amp; Sell\" mode</span>
                  </div>
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">Boutiques</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Snap first, fill details later. Perfect when you're busy with buyers. Photo + general price triggers an instant sellable catalog draft.
                </p>
                <Button
                  type="button"
                  className="w-full text-xs h-8 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800 font-bold"
                  disabled={photoSimState === "snapping"}
                  onClick={triggerPhotoSimulation}
                >
                  {photoSimState === "snapping" ? "📸 Taking instant photo snap..." : "🤳 Test camera Snap &amp; fill (₦18,000 Red Shoe)"}
                </Button>
              </div>

              {/* 4. Local Language unit translations */}
              <div className="p-4 bg-white rounded-xl border shadow-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                    <BookOpen className="h-4 w-4 text-[#007E85]" />
                    <span>Local Unit Multipliers (Mudu, Kongo)</span>
                  </div>
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">Foodstuff / Retail</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We allow entering custom local scale sizes like <strong>mudu, derica, or paint buckets</strong> natively as-is because NexaOS only needs the ratio (e.g. 5) rather than the English meanings.
                </p>
                <div className="bg-slate-50 border p-2.5 rounded-lg text-[11px] space-y-1 text-slate-500">
                  <div className="flex justify-between"><span className="font-bold text-slate-700">1 mudu</span><span>= 5 base cups</span></div>
                  <div className="flex justify-between"><span className="font-bold text-slate-700">1 paint bucket</span><span>= 4 mudu</span></div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs h-8 bg-[#007E85]/5 hover:bg-[#007E85]/10 border-[#007E85]/20 text-[#007E85] font-bold"
                  disabled={localUnitSimState === "translating"}
                  onClick={triggerLocalUnitsSimulation}
                >
                  {localUnitSimState === "translating" ? "⚖️ Calibrating local 'mudu' factors..." : "🌾 Test Local Units & prefill (Oloyin Beans mudu)"}
                </Button>
              </div>

              <div className="pt-3">
                <Button 
                  type="button" 
                  className="w-full h-10 font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border" 
                  onClick={() => setCurrentStep(1)}
                >
                  ← Go back to Create Product
                </Button>
              </div>
            </div>
          )}
        </div>
        </>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
      </SheetContent>
    </Sheet>
  );
}
