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
        { ...item(1, "Golden Maize Seeds", "seeds", "sup-ag-02", "loc-ag-01", 1200, 200, 500, 850, "kg", "weight", "🌽"), agriculture: { cropVariety: "Hybrid Gold", plantingDate: ts(45), expectedHarvestDate: ts(-45), fieldId: "Field A-1" }, unitConversions: [{ unitId: "g", multiplier: 0.001, priceNgn: 1.2 }] },
        { ...item(2, "Nitrogen Fertilizer", "fertilizers", "sup-ag-01", "loc-ag-02", 50, 100, 12000, 18500, "bag", "weight", "🧪"), unitConversions: [{ unitId: "kg", multiplier: 0.02, priceNgn: 450 }] },
        { ...item(3, "Fresh Tomatoes", "grains_bulk", "sup-ag-02", "loc-ag-01", 300, 50, 150, 450, "kg", "weight", "🍅"), agriculture: { fieldId: "Greenhouse 4" }, unitConversions: [{ unitId: "g", multiplier: 0.001, priceNgn: 0.6 }] },
        { ...item(4, "Cassava Cuttings", "seeds", "sup-ag-02", "loc-ag-01", 5000, 500, 10, 35, "bundle", "count", "🌱") },
        { ...item(5, "Yam Tubers", "tubers", "sup-ag-01", "loc-ag-01", 150, 20, 800, 1200, "kg", "weight", "🥔") },
        { ...item(6, "White Garri (50kg Bag)", "grains_bulk", "sup-ag-01", "loc-ag-02", 80, 10, 15000, 18500, "bag", "weight", "🥣"), unitConversions: [{ unitId: "kg", multiplier: 0.02, priceNgn: 450 }] },
        { ...item(7, "Day Old Chicks", "livestock", "sup-ag-02", "loc-ag-01", 500, 100, 450, 650, "pcs", "count", "🐣") },
        { ...item(8, "Poultry Feed (Broiler)", "fertilizers", "sup-ag-01", "loc-ag-02", 40, 10, 8500, 10500, "bag", "weight", "🌾"), unitConversions: [{ unitId: "kg", multiplier: 0.04, priceNgn: 480 }] },
        { ...item(9, "Hand Hoe", "tools_agri", "sup-ag-01", "loc-ag-01", 25, 5, 1200, 2500, "pcs", "count", "⛏️") },
        { ...item(10, "Knapsack Sprayer", "tools_agri", "sup-ag-01", "loc-ag-02", 10, 2, 15000, 22000, "pcs", "count", "🎒") },
      ];
    case "restaurant":
      return [
        { 
          ...item(1, "Jollof Rice (Party)", "grains", "sup-rs-01", "loc-rs-02", 50, 10, 1200, 3500, "plate", "count", "🥘"), 
          restaurant: { 
            preparationTime: 15, 
            isVegetarian: false, 
            spiceLevel: "mild",
            portionSizes: [
              { name: "Regular", price: 3500 },
              { name: "Large", price: 5000 }
            ],
            proteinAddons: [
              { name: "Chicken", price: 1500 },
              { name: "Beef", price: 1200 },
              { name: "Fish", price: 1800 }
            ],
            spiceLevels: ["Mild", "Medium", "Hot", "Extra Hot"],
            allowKitchenNotes: true
          } 
        },
        { 
          ...item(2, "Vegetable Salad", "vegetables", "sup-rs-02", "loc-rs-01", 15, 10, 800, 2200, "bowl", "count", "🥗"), 
          restaurant: { 
            preparationTime: 6, 
            isVegetarian: true, 
            spiceLevel: "none",
            portionSizes: [
              { name: "Regular Bowl", price: 2200 },
              { name: "Family Pack", price: 3900 }
            ],
            proteinAddons: [
              { name: "Boiled Egg", price: 300 },
              { name: "Sweetcorn Extra", price: 400 },
              { name: "Grilled Chicken Cubes", price: 1000 }
            ],
            allowKitchenNotes: true
          } 
        },
        { 
          ...item(3, "Grilled Tilapia", "proteins", "sup-rs-02", "loc-rs-02", 12, 5, 2500, 6500, "pcs", "count", "🐟"), 
          restaurant: { 
            preparationTime: 20, 
            isVegetarian: false, 
            spiceLevel: "hot",
            portionSizes: [
              { name: "Standard", price: 6500 }
            ],
            proteinAddons: [
              { name: "Extra Spiced Sauce", price: 200 }
            ],
            spiceLevels: ["Mild", "Moderately Hot", "Suya Pepper Fire"],
            allowKitchenNotes: true
          } 
        },
        { 
          ...item(4, "Beef Suya", "proteins", "sup-rs-01", "loc-rs-02", 100, 20, 500, 1500, "stick", "count", "🍢"), 
          restaurant: { 
            preparationTime: 10, 
            isVegetarian: false, 
            spiceLevel: "hot",
            portionSizes: [
              { name: "Standard Stick", price: 1500 }
            ],
            spiceLevels: ["Mild Spice", "Normal Hot", "Extra Pepper"],
            allowKitchenNotes: true
          } 
        },
        { 
          ...item(5, "Pounded Yam & Egusi", "grains", "sup-rs-01", "loc-rs-02", 30, 5, 1500, 4500, "plate", "count", "🥣"), 
          restaurant: { 
            preparationTime: 18, 
            isVegetarian: false, 
            spiceLevel: "mild",
            portionSizes: [
              { name: "Regular Plate", price: 4500 }
            ],
            spiceLevels: ["Mild", "Medium", "Spicy"],
            proteinAddons: [
              { name: "Goat Meat", price: 1500 },
              { name: "Assorted Tripe (Shaki)", price: 1200 },
              { name: "Fish", price: 1500 }
            ],
            allowKitchenNotes: true
          } 
        },
        { 
          ...item(6, "Smoothie Deluxe", "drinks", "sup-rs-01", "loc-rs-01", 40, 10, 800, 1800, "cup", "count", "🥤"), 
          restaurant: { 
            preparationTime: 5, 
            isVegetarian: true, 
            spiceLevel: "none",
            portionSizes: [
              { name: "Small Cup", price: 1800 },
              { name: "Grande Cup", price: 2800 }
            ],
            proteinAddons: [
              { name: "Extra Mango Chunks", price: 400 },
              { name: "Chia Seeds", price: 200 },
              { name: "Organic Honey", price: 150 }
            ],
            allowKitchenNotes: true
          } 
        },
        { 
          ...item(7, "Ice Cream scoops", "bakery", "sup-rs-02", "loc-rs-01", 24, 6, 400, 1200, "cup", "count", "🍦"), 
          restaurant: { 
            preparationTime: 2, 
            isVegetarian: true, 
            spiceLevel: "none",
            portionSizes: [
              { name: "1 Scoop", price: 1200 },
              { name: "2 Scoops", price: 1800 },
              { name: "3 Scoops", price: 2400 }
            ],
            spiceLevels: ["Vanilla Flavour", "Chocolate Flavour", "Strawberry Flavour"],
            allowKitchenNotes: true
          } 
        },
        { 
          ...item(8, "Bottle Water (75cl)", "drinks", "sup-rs-02", "loc-rs-01", 120, 24, 80, 250, "bottle", "count", "💧"), 
          restaurant: { 
            preparationTime: 1, 
            isVegetarian: true, 
            spiceLevel: "none" 
          } 
        },
        { 
          ...item(9, "Jollof Combo Pack", "grains", "sup-rs-01", "loc-rs-01", 50, 5, 2500, 6000, "pack", "count", "🍱"), 
          restaurant: { 
            preparationTime: 15, 
            isVegetarian: false, 
            spiceLevel: "mild",
            isCombo: true,
            comboSlots: [
              { name: "Choose your protein", categoryId: "proteins" },
              { name: "Choose your drink", categoryId: "drinks" }
            ],
            portionSizes: [
              { name: "Master Combo", price: 6000 }
            ],
            proteinAddons: [
              { name: "With Chicken", price: 0 },
              { name: "With Beef", price: 0 },
              { name: "With Fish (+₦300)", price: 300 }
            ],
            spiceLevels: ["Mild Jollof", "Medium Jollof", "Hot Jollof"],
            allowKitchenNotes: true
          } 
        },
        { ...item(10, "Cake Slice (Vanilla)", "bakery", "sup-rs-02", "loc-rs-01", 15, 5, 600, 1800, "slice", "count", "🍰") },
      ];
    case "retail":
      return [
        { ...item(1, "iPhone 15 Pro", "electronics", "sup-rt-01", "loc-rt-01", 15, 2, 850000, 1250000, "pcs", "count", "📱") },
        { ...item(2, "MacBook Air M2", "electronics", "sup-rt-01", "loc-rt-01", 8, 1, 1100000, 1450000, "pcs", "count", "💻") },
        { ...item(3, "Bubu Gown", "fashion", "sup-rt-01", "loc-rt-01", 45, 5, 8000, 15000, "pcs", "count", "👗") },
        { ...item(4, "Leather Wallet", "fashion", "sup-rt-01", "loc-rt-01", 20, 4, 3000, 7500, "pcs", "count", "👛") },
        { ...item(5, "Golden Morn (1kg)", "groceries", "sup-rt-01", "loc-rt-01", 60, 10, 2200, 3100, "pcs", "count", "🥣") },
        { ...item(6, "Peak Milk (Refill)", "groceries", "sup-rt-01", "loc-rt-01", 100, 10, 1800, 2500, "pcs", "count", "🥛") },
        { ...item(7, "Foundation Liquid", "beauty", "sup-rt-01", "loc-rt-01", 24, 3, 4500, 8500, "pcs", "count", "💄") },
        { ...item(8, "Perfume (Oil Based)", "beauty", "sup-rt-01", "loc-rt-01", 30, 5, 2500, 5500, "pcs", "count", "✨") },
        { ...item(9, "Rice Cooker", "home", "sup-rt-01", "loc-rt-01", 10, 2, 12000, 18500, "pcs", "count", "🍚") },
        { ...item(10, "Football (Size 5)", "sports", "sup-rt-01", "loc-rt-01", 12, 3, 4500, 8500, "pcs", "count", "⚽") },
      ];
    case "textile":
      return [
        { ...item(1, "Polished Cotton (5 Yards)", "cotton", "sup-tx-01", "loc-tx-01", 20, 4, 12000, 18500, "bundle", "count", "🧵") },
        { ...item(2, "Linen Fabric", "cotton", "sup-tx-01", "loc-tx-01", 15, 3, 2500, 4500, "yard", "length", "👕") },
        { ...item(3, "French Lace", "laces", "sup-tx-01", "loc-tx-01", 10, 2, 25000, 45000, "bundle", "count", "👗") },
        { ...item(4, "Cord Lace", "laces", "sup-tx-01", "loc-tx-01", 8, 2, 18000, 32000, "bundle", "count", "✨") },
        { ...item(5, "Raw Silk", "silk", "sup-tx-01", "loc-tx-01", 5, 2, 8000, 15000, "yard", "length", "👘") },
        { ...item(6, "Silk Scarf", "silk", "sup-tx-01", "loc-tx-01", 30, 5, 1500, 3500, "pcs", "count", "🧣") },
        { ...item(7, "Sewing Machine Oil", "sewing", "sup-tx-01", "loc-tx-01", 24, 6, 500, 1200, "bottle", "count", "🛢️") },
        { ...item(8, "Universal Needles (Box)", "sewing", "sup-tx-01", "loc-tx-01", 50, 10, 800, 1800, "box", "count", "🪡") },
        { ...item(9, "Agbada Set", "traditional", "sup-tx-01", "loc-tx-01", 12, 3, 35000, 65000, "pcs", "count", "🧥") },
        { ...item(10, "Vibrant Ankara Print", "prints", "sup-tx-01", "loc-tx-01", 100, 10, 4500, 8500, "bundle", "count", "🎨") },
      ];
    case "wholesale":
      return [
        { ...item(1, "Pasta (Carton of 20)", "fmcg", "sup-ws-01", "loc-ws-01", 200, 20, 8500, 11500, "carton", "count", "📦") },
        { ...item(2, "Noodles (Carton of 40)", "fmcg", "sup-ws-01", "loc-ws-01", 500, 50, 6500, 9000, "carton", "count", "🍜") },
        { ...item(3, "Cement (50kg Bag)", "building", "sup-ws-01", "loc-ws-01", 1000, 100, 4500, 5800, "bag", "weight", "🧱") },
        { ...item(4, "Paint (20L Drum)", "building", "sup-ws-01", "loc-ws-01", 50, 10, 18500, 26000, "drum", "volume", "🎨") },
        { ...item(5, "Maize Grain (Bulk)", "agro", "sup-ws-01", "loc-ws-01", 500, 50, 12000, 18000, "bag", "weight", "🌾") },
        { ...item(6, "Compound Fertilizer (Bulk)", "agro", "sup-ws-01", "loc-ws-01", 300, 30, 22000, 28500, "bag", "weight", "🧪") },
        { ...item(7, "Bearing (6204)", "industrial", "sup-ws-01", "loc-ws-01", 100, 10, 1500, 3500, "pcs", "count", "⚙️") },
        { ...item(8, "V-Belt (B-45)", "industrial", "sup-ws-01", "loc-ws-01", 60, 10, 2200, 4800, "pcs", "count", "🔧") },
        { ...item(9, "Bulk Cotton Rolls", "textiles", "sup-ws-01", "loc-ws-01", 40, 5, 45000, 65000, "roll", "count", "🧵") },
        { ...item(10, "Industrial Cleaning Acid", "chemicals", "sup-ws-01", "loc-ws-01", 24, 4, 12000, 19500, "keg", "volume", "🧪") },
      ];
    case "general":
    default:
      return [
        { ...item(1, "A4 Paper Bundle", "office", "sup-01", "loc-01", 150, 30, 2200, 3500, "ream", "count", "📄") },
        { ...item(2, "Sharpie Markers (Pack)", "office", "sup-01", "loc-01", 45, 10, 1200, 2800, "pack", "count", "🖍️") },
        { ...item(3, "Power Drill", "tools", "sup-01", "loc-01", 12, 3, 25000, 42000, "pcs", "count", "🔨") },
        { ...item(4, "Screwdriver Set", "tools", "sup-01", "loc-01", 20, 5, 3500, 8500, "set", "count", "🪛") },
        { ...item(5, "Dell Latitute Laptop", "it", "sup-01", "loc-01", 15, 2, 450000, 650000, "pcs", "count", "💻") },
        { ...item(6, "USB-C Hub", "it", "sup-01", "loc-01", 30, 5, 12000, 21500, "pcs", "count", "🔌") },
        { ...item(7, "Digital Thermometer", "medical", "sup-01", "loc-01", 40, 10, 1500, 3500, "pcs", "count", "🏥") },
        { ...item(8, "Latex Gloves (Box)", "medical", "sup-01", "loc-01", 100, 20, 2200, 4800, "box", "count", "🧤") },
        { ...item(9, "Floor Cleaner (5L)", "cleaning", "sup-01", "loc-01", 60, 10, 1800, 3500, "keg", "volume", "🧹") },
        { ...item(10, "Hand Sanitizer (500ml)", "cleaning", "sup-01", "loc-01", 120, 24, 800, 1500, "bottle", "volume", "🧴") },
      ];
  }
};

export const items: Item[] = getItemsForSector("general");
