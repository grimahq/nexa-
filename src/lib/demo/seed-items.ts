import type { Item } from "@/types/inventory";
import { ItemStatus } from "@/types/inventory";

const ts = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const item = (
  idx: number,
  name: string,
  catId: string,
  supId: string,
  locId: string,
  stock: number,
  reorder: number,
  cost: number,
  sell: number,
  unit = "pcs",
  unitType: "count" | "weight" | "length" | "volume" = "count",
  emoji?: string
): Item => ({
  id: `itm-${String(idx).padStart(3, "0")}`,
  sku: `STK-${String(1000 + idx)}`,
  barcode: idx % 3 === 0 ? null : `49${String(10000000 + idx * 137).slice(0, 8)}${idx % 10}`,
  name,
  description: `${name} — standard inventory item`,
  categoryId: catId,
  status: ItemStatus.Active,
  unit,
  unitType,
  currentStock: stock,
  reorderPoint: reorder,
  reorderQuantity: reorder * 2,
  costPrice: cost,
  sellingPrice: sell,
  locationId: locId,
  supplierId: supId,
  imageUrl: null,
  emoji,
  customFields: {},
  createdAt: ts(60),
  updatedAt: ts(Math.floor(Math.random() * 30)),
});

export const getItemsForSector = (sector: string): Item[] => {
  switch (sector) {
    case "agriculture":
      return [
        { ...item(1, "Golden Maize Seeds", "cat-ag-01", "sup-ag-01", "loc-ag-01", 1200, 200, 500, 850, "kg", "weight", "🌽"), agriculture: { cropVariety: "Hybrid Gold", plantingDate: ts(45), expectedHarvestDate: ts(-45), fieldId: "Field A-1" } },
        { ...item(2, "Nitrogen Fertilizer", "cat-ag-02", "sup-ag-01", "loc-ag-02", 50, 100, 12000, 18500, "bag", "weight", "🧪") },
        { ...item(3, "Fresh Tomatoes", "cat-ag-03", "sup-ag-02", "loc-ag-01", 300, 50, 150, 450, "kg", "weight", "🍅"), agriculture: { fieldId: "Greenhouse 4" } },
        item(4, "Cassava Cuttings", "cat-ag-01", "sup-ag-01", "loc-ag-01", 5000, 500, 10, 35, "bundle", "count", "🌱"),
      ];
    case "pharmacy":
      return [
        { ...item(1, "Amoxicillin 500mg", "cat-ph-01", "sup-ph-01", "loc-ph-01", 450, 50, 1200, 2500, "box", "count", "💊"), pharmacy: { expiryDate: ts(-365), batchNumber: "BN-2024-001", requiresPrescription: true, dosageForm: "Capsule" } },
        { ...item(2, "Paracetamol Syrup", "cat-ph-01", "sup-ph-01", "loc-ph-01", 15, 20, 450, 950, "vial", "volume", "🧪"), pharmacy: { expiryDate: ts(-30), batchNumber: "BN-XY-99", requiresPrescription: false, dosageForm: "Syrup" } },
        { ...item(3, "Vitamin C tablets", "cat-ph-02", "sup-ph-02", "loc-ph-01", 100, 30, 200, 600, "pack", "count", "🍊") },
      ];
    case "restaurant":
      return [
        { ...item(1, "Jollof Rice (Party)", "cat-rs-01", "sup-rs-01", "loc-rs-01", 50, 10, 1200, 3500, "plate", "count", "🥘"), restaurant: { preparationTime: 35, isVegetarian: false, spiceLevel: "mild" } },
        { ...item(2, "Vegetable Salad", "cat-rs-02", "sup-rs-02", "loc-rs-01", 5, 10, 800, 2200, "bowl", "count", "🥗"), restaurant: { preparationTime: 10, isVegetarian: true, spiceLevel: "none" } },
        { ...item(3, "Grilled Tilapia", "cat-rs-03", "sup-rs-02", "loc-rs-01", 12, 5, 2500, 6500, "pcs", "count", "🐟"), restaurant: { preparationTime: 45, isVegetarian: false, spiceLevel: "hot" } },
      ];
    default:
      return [
        item(1, "USB-C Charging Cable", "cat-01", "sup-01", "loc-01", 150, 30, 5, 15, "pcs", "count", "🔌"),
        item(2, "Wireless Mouse", "cat-01", "sup-01", "loc-01", 18, 20, 12, 25, "pcs", "count", "🖱️"),
      ];
  }
};

export const items: Item[] = getItemsForSector("general");
