import { useEffect } from "react";
import { HelpTooltip } from "@/components/shared/HelpTooltip";
import { useDemo } from "@/hooks/useDemo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { Item, Category, Supplier, Location } from "@/types/inventory";
import { ItemStatus, SUPPORTED_UNITS } from "@/types/inventory";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string(),
  categoryId: z.string(),
  supplierId: z.string(),
  locationId: z.string(),
  unit: z.string(),
  unitType: z.enum(["count", "weight", "length", "volume"]),
  currentStock: z.coerce.number().min(0),
  reorderPoint: z.coerce.number().min(0),
  reorderQuantity: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  isEcommerceEnabled: z.boolean().optional(),
  affiliateCommission: z.coerce.number().min(0).optional(),
  measurements: z.string().optional(),
  color: z.string().optional(),
  design: z.string().optional(),
  emoji: z.string().optional(),
  images: z.array(z.string()).optional(),
  // Pharmacy
  pharmacy: z.object({
    expiryDate: z.string().optional(),
    batchNumber: z.string().optional(),
    requiresPrescription: z.boolean().optional(),
    dosageForm: z.string().optional(),
  }).optional(),
  // Manufacturing
  manufacturing: z.object({
    bomSummary: z.string().optional(),
    productionStage: z.string().optional(),
  }).optional(),
  // Electronics
  electronics: z.object({
    warrantyMonths: z.coerce.number().optional(),
    modelNumber: z.string().optional(),
  }).optional(),
  // Restaurant
  restaurant: z.object({
    preparationTime: z.coerce.number().optional(),
    isVegetarian: z.boolean().optional(),
    spiceLevel: z.enum(["none", "mild", "hot"]).optional(),
  }).optional(),
  status: z.nativeEnum(ItemStatus),
  // Agriculture
  agriculture: z.object({
    plantingDate: z.string().optional(),
    expectedHarvestDate: z.string().optional(),
    fieldId: z.string().optional(),
    cropVariety: z.string().optional(),
    soilCondition: z.string().optional(),
  }).optional(),
  // Textile
  textile: z.object({
    gsm: z.coerce.number().optional(),
    weaveType: z.string().optional(),
    fabricContent: z.string().optional(),
  }).optional(),
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
  const { onboarding } = useDemo();
  const isEdit = !!item;

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
      isEcommerceEnabled: false,
      affiliateCommission: 0,
      measurements: "",
      color: "",
      design: "",
      emoji: "",
      status: ItemStatus.Active,
      agriculture: {
        plantingDate: "",
        expectedHarvestDate: "",
        fieldId: "",
        cropVariety: "",
        soilCondition: "",
      },
      textile: {
        gsm: 0,
        weaveType: "",
        fabricContent: "",
      },
      pharmacy: {
        expiryDate: "",
        batchNumber: "",
        requiresPrescription: false,
        dosageForm: "",
      },
      manufacturing: {
        bomSummary: "",
        productionStage: "",
      },
      electronics: {
        warrantyMonths: 0,
        modelNumber: "",
      },
      restaurant: {
        preparationTime: 0,
        isVegetarian: false,
        spiceLevel: "none",
      },
    },
  });

  useEffect(() => {
    if (open && item) {
      reset({
        name: item.name,
        sku: item.sku,
        description: item.description,
        categoryId: item.categoryId ?? undefined,
        supplierId: item.supplierId ?? undefined,
        locationId: item.locationId ?? undefined,
        unit: item.unit,
        unitType: item.unitType ?? "count",
        currentStock: item.currentStock,
        reorderPoint: item.reorderPoint,
        reorderQuantity: item.reorderQuantity,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        isEcommerceEnabled: item.isEcommerceEnabled ?? false,
        affiliateCommission: item.affiliateCommission ?? 0,
        measurements: item.measurements ?? "",
        color: item.color ?? "",
        design: item.design ?? "",
        emoji: item.emoji ?? "",
        status: item.status,
        agriculture: item.agriculture ?? {
          plantingDate: "",
          expectedHarvestDate: "",
          fieldId: "",
          cropVariety: "",
          soilCondition: "",
        },
        textile: item.textile ?? {
          gsm: 0,
          weaveType: "",
          fabricContent: "",
        },
        pharmacy: item.pharmacy ?? {
          expiryDate: "",
          batchNumber: "",
          requiresPrescription: false,
          dosageForm: "",
        },
        manufacturing: item.manufacturing ?? {
          bomSummary: "",
          productionStage: "",
        },
        electronics: item.electronics ?? {
          warrantyMonths: 0,
          modelNumber: "",
        },
        restaurant: item.restaurant ?? {
          preparationTime: 0,
          isVegetarian: false,
          spiceLevel: "none",
        },
      });
    } else if (open) {
      reset();
    }
  }, [open, item, reset]);

  const onSubmit = (data: FormValues) => {
    const skuConflict = existingSkus.filter((s) => s === data.sku);
    const allowed = isEdit && item?.sku === data.sku ? 1 : 0;
    if (skuConflict.length > allowed) {
      setError("sku", { message: "SKU already exists" });
      return;
    }
    onSave({
      ...data,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
      locationId: data.locationId || null,
    });
  };

  const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";
  const labelCls = "text-sm font-medium";
  const errCls = "text-xs text-destructive";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetTitle>{isEdit ? "Edit Item" : "New Item"}</SheetTitle>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          {/* Basic Info */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Basic Info</legend>
            <div>
              <label className={labelCls}>Name *</label>
              <input {...register("name")} className={inputCls} />
              {errors.name && <p className={errCls}>{errors.name.message}</p>}
            </div>
            <div>
              <label className={`${labelCls} flex items-center gap-1`}>SKU * <HelpTooltip text="Unique identifier for this item. Must be different from all other items." /></label>
              <input {...register("sku")} className={inputCls} placeholder="STK-XXXX" />
              {errors.sku && <p className={errCls}>{errors.sku.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea {...register("description")} rows={2} className={`${inputCls} h-auto py-2`} />
            </div>
          </fieldset>

          {/* Classification */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Classification</legend>
            <div>
              <label className={labelCls}>Category</label>
              <Select value={watch("categoryId") ?? ""} onValueChange={(v) => setValue("categoryId", v || "")}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelCls}>Unit of Measure</label>
              <Select 
                value={watch("unit")} 
                onValueChange={(v) => {
                  setValue("unit", v);
                  const unitDef = SUPPORTED_UNITS.find(u => u.id === v);
                  if (unitDef) setValue("unitType", unitDef.type);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_UNITS.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label} ({u.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Measurements / Yardage</label>
                <input {...register("measurements")} className={inputCls} placeholder="e.g. 50 yards, 5kg bag" />
              </div>
              <div>
                <label className={labelCls}>Color / Variant</label>
                <input {...register("color")} className={inputCls} placeholder="Blue, Red, N/A" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Design Pattern</label>
                <input {...register("design")} className={inputCls} placeholder="Floral, Plain, etc." />
              </div>
              <div>
                <label className={labelCls}>Item Emoji</label>
                <input {...register("emoji")} className={inputCls} placeholder="🌽, 👕, 📦" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Additional Image URLs (Comma separated)</label>
              <textarea 
                rows={2}
                className={`${inputCls} h-auto py-2`} 
                placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
                defaultValue={item?.images?.join(", ") ?? ""}
                onBlur={(e) => {
                  const urls = e.target.value.split(",").map(u => u.trim()).filter(Boolean);
                  setValue("images", urls);
                }}
              />
            </div>
          </fieldset>

          {/* Business Type Specifics */}
          {onboarding?.businessType === "agriculture" && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Agricultural Details</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Planting Date</label>
                  <input type="date" {...register("agriculture.plantingDate")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Expected Harvest</label>
                  <input type="date" {...register("agriculture.expectedHarvestDate")} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Crop Variety</label>
                  <input {...register("agriculture.cropVariety")} className={inputCls} placeholder="e.g. Hybrid Maise" />
                </div>
                <div>
                  <label className={labelCls}>Field / Plot ID</label>
                  <input {...register("agriculture.fieldId")} className={inputCls} placeholder="Field B-12" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Soil Condition</label>
                <input {...register("agriculture.soilCondition")} className={inputCls} placeholder="Acidic, Sandy, etc." />
              </div>
            </fieldset>
          )}

          {onboarding?.businessType === "textile" && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Textile Details</legend>
              <div>
                <label className={labelCls}>GSM (Weight)</label>
                <input type="number" {...register("textile.gsm")} className={inputCls} placeholder="180, 300, etc." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Weave Type</label>
                  <input {...register("textile.weaveType")} className={inputCls} placeholder="Plain, Twill, Satin" />
                </div>
                <div>
                  <label className={labelCls}>Fabric Content</label>
                  <input {...register("textile.fabricContent")} className={inputCls} placeholder="100% Cotton" />
                </div>
              </div>
            </fieldset>
          )}

          {onboarding?.businessType === "pharmacy" && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pharmacy Details</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input type="date" {...register("pharmacy.expiryDate")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Batch Number</label>
                  <input {...register("pharmacy.batchNumber")} className={inputCls} placeholder="BATCH-123" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Dosage Form</label>
                  <input {...register("pharmacy.dosageForm")} className={inputCls} placeholder="Tablet, Syrup" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" {...register("pharmacy.requiresPrescription")} id="prescription" />
                  <label htmlFor="prescription" className="text-xs">Requires Prescription</label>
                </div>
              </div>
            </fieldset>
          )}

          {onboarding?.businessType === "manufacturing" && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Manufacturing Details</legend>
              <div>
                <label className={labelCls}>Production Stage</label>
                <input {...register("manufacturing.productionStage")} className={inputCls} placeholder="Raw, Semi-Finished, Finished" />
              </div>
              <div>
                <label className={labelCls}>BOM Summary</label>
                <textarea {...register("manufacturing.bomSummary")} rows={2} className={`${inputCls} h-auto py-2`} placeholder="List key materials..." />
              </div>
            </fieldset>
          )}

          {onboarding?.businessType === "electronics" && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Electronics Details</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Model Number</label>
                  <input {...register("electronics.modelNumber")} className={inputCls} placeholder="A1234" />
                </div>
                <div>
                  <label className={labelCls}>Warranty (Months)</label>
                  <input type="number" {...register("electronics.warrantyMonths")} className={inputCls} />
                </div>
              </div>
            </fieldset>
          )}

          {onboarding?.businessType === "restaurant" && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Restaurant Details</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Preparation Time (min)</label>
                  <input type="number" {...register("restaurant.preparationTime")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Spice Level</label>
                  <Select value={watch("restaurant.spiceLevel")} onValueChange={(v) => setValue("restaurant.spiceLevel", v as "none" | "mild" | "hot")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="hot">Hot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" {...register("restaurant.isVegetarian")} id="veg" />
                <label htmlFor="veg" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vegetarian / Vegan Option</label>
              </div>
            </fieldset>
          )}

          {/* Stock Settings */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stock Settings</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Current Stock</label>
                <input 
                  type="number" 
                  step={SUPPORTED_UNITS.find(u => u.id === watch("unit"))?.step || 1} 
                  {...register("currentStock")} 
                  className={inputCls} 
                />
              </div>
              <div>
                <label className={`${labelCls} flex items-center gap-1`}>Reorder Point <HelpTooltip text="Minimum quantity before a low-stock alert is triggered. Set based on your typical usage rate." /></label>
                <input type="number" {...register("reorderPoint")} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Reorder Quantity</label>
              <input type="number" {...register("reorderQuantity")} className={inputCls} />
            </div>
          </fieldset>

          {/* Pricing */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pricing</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cost Price</label>
                <input type="number" step="0.01" {...register("costPrice")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Selling Price</label>
                <input type="number" step="0.01" {...register("sellingPrice")} className={inputCls} />
              </div>
            </div>
          </fieldset>

          {/* E-commerce Settings */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">E-commerce & Affiliates</legend>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isEcommerceEnabled"
                {...register("isEcommerceEnabled")}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="isEcommerceEnabled" className="text-sm font-medium">Enable for Online Store / Link Sharing</label>
            </div>
            {watch("isEcommerceEnabled") && (
              <div>
                <label className={labelCls}>Affiliate Commission (₦)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₦</span>
                  <input type="number" {...register("affiliateCommission")} className={`${inputCls} pl-7`} />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground italic">Amount paid to partners per unit sold through their link.</p>
              </div>
            )}
          </fieldset>

          {/* Assignment */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assignment</legend>
            <div>
              <label className={labelCls}>Supplier</label>
              <Select value={watch("supplierId") ?? ""} onValueChange={(v) => setValue("supplierId", v || "")}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <Select value={watch("locationId") ?? ""} onValueChange={(v) => setValue("locationId", v || "")}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          {/* Status */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</legend>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as ItemStatus)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ItemStatus.Active}>Active</SelectItem>
                <SelectItem value={ItemStatus.Discontinued}>Discontinued</SelectItem>
                <SelectItem value={ItemStatus.Archived}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </fieldset>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
