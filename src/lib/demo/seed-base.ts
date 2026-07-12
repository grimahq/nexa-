import type { Category, Supplier, Location } from "@/types/inventory";

const ts = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

export const getBaseForSector = (sector: string) => {
  switch (sector) {
    case "retail":
      return {
        categories: [
          { id: "electronics", name: "Electronics", description: "Mobile, Laptops, Gadgets", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "fashion", name: "Fashion & Clothing", description: "Apparel and accessories", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "groceries", name: "Groceries", description: "Daily essentials and food", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "ltr", "ml", "pack", "box", "bag", "bottle", "cup", "mudu", "paint"] },
          { id: "beauty", name: "Beauty & Health", description: "Skincare and wellness", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "ltr", "ml", "pack", "box", "bottle", "vial"] },
          { id: "home", name: "Home & Living", description: "Furniture and decor", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "box", "m", "cm", "in", "ft", "yard"] },
          { id: "sports", name: "Sports & Fitness", description: "Gym and outdoor gear", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag"] },
        ],
        suppliers: [
          { id: "sup-rt-01", name: "Mega Retail Hub", contactName: "John Doe", email: "sales@megaretail.com", phone: "08011223344", address: "Trade Fair Complex", leadTimeDays: 4, rating: 4.2, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-rt-01", name: "Retail Storefront", type: "warehouse", parentId: null, description: "Main display area", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "textile":
      return {
        categories: [
          { id: "cotton", name: "Cotton & Linens", description: "Breathable fabrics", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["m", "cm", "in", "ft", "yard", "pcs", "bundle"] },
          { id: "laces", name: "Laces & Embroidery", description: "Decorative textiles", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["m", "cm", "in", "ft", "yard", "pcs", "bundle"] },
          { id: "silk", name: "Silk & Luxury", description: "Premium materials", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["m", "cm", "in", "ft", "yard", "pcs", "bundle"] },
          { id: "sewing", name: "Sewing Essentials", description: "Threads and needles", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag", "bundle"] },
          { id: "traditional", name: "Traditional Attire", description: "Cultural clothing", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag", "bundle"] },
          { id: "prints", name: "African Prints (Ankara)", description: "Vibrant patterns", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["m", "cm", "in", "ft", "yard", "pcs", "bundle"] },
        ],
        suppliers: [
          { id: "sup-tx-01", name: "Yaba Textile Markets", contactName: "Ibrahim", email: "yaba@textiles.ng", phone: "08055443322", address: "Yaba, Lagos", leadTimeDays: 2, rating: 4.8, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-tx-01", name: "Fabric Warehouse", type: "warehouse", parentId: null, description: "Storage for rolls", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "wholesale":
      return {
        categories: [
          { id: "fmcg", name: "FMCG", description: "Fast moving consumer goods", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag", "bottle", "vial"] },
          { id: "building", name: "Building Materials", description: "Construction supplies", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "m", "cm", "in", "ft", "yard", "bag", "bundle"] },
          { id: "agro", name: "Agro & Farm", description: "Wholesale agricultural products", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "ltr", "ml", "bag", "bundle", "bottle", "mudu", "paint"] },
          { id: "industrial", name: "Industrial Supplies", description: "Machinery and parts", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag"] },
          { id: "textiles", name: "Textiles", description: "Bulk fabric sales", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "m", "yard", "bundle"] },
          { id: "chemicals", name: "Chemicals", description: "Laboratory and industrial chems", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["kg", "g", "ltr", "ml", "bottle", "vial"] },
        ],
        suppliers: [
          { id: "sup-ws-01", name: "Global Logistics Ltd", contactName: "Mr. Wong", email: "global@logistics.com", phone: "09000112233", address: "Apapa Wharf", leadTimeDays: 14, rating: 4.5, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-ws-01", name: "Central Depot", type: "warehouse", parentId: null, description: "Bulk storage", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "general":
    default:
      return {
        categories: [
          { id: "office", name: "Office Supplies", description: "Daily office needs", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "tools", name: "Tools & Hardware", description: "Maintenance equipment", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "it", name: "IT & Equipment", description: "Computers and networking", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "medical", name: "Medical Supplies", description: "Clinical inventory", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "vial"] },
          { id: "cleaning", name: "Cleaning Products", description: "Janitorial supplies", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "bottle", "ltr", "ml"] },
          { id: "misc", name: "Miscellaneous", description: "Uncategorized items", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs"] },
        ],
        suppliers: [
          { id: "sup-01", name: "Acme Supply Co", contactName: "John Carter", email: "john@acmesupply.com", phone: "555-0101", address: "123 Industrial Ave", leadTimeDays: 5, rating: 4.5, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-01", name: "Main Warehouse", type: "warehouse", parentId: null, description: "Primary storage", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "agriculture":
      return {
        categories: [
          { id: "grains_bulk", name: "Grains (Bags)", description: "Primary field produce", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["bag", "kg", "mudu", "paint"] },
          { id: "tubers", name: "Tubers & Starch", description: "Root crops and tubers", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "bundle"] },
          { id: "livestock", name: "Livestock & Poultry", description: "Animal products", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg"] },
          { id: "seeds", name: "Seeds & Saplings", description: "Planting materials", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "pack", "bag", "bundle"] },
          { id: "fertilizers", name: "Fertilizers & Chemicals", description: "Growth enhancers", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "ltr", "ml", "bag", "bottle"] },
          { id: "tools_agri", name: "Agricultural Tools", description: "Farm machinery", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack"] },
        ],
        suppliers: [
          { id: "sup-ag-01", name: "Green Agro Solutions", contactName: "Musa Aliyu", email: "sales@greenagro.com", phone: "08012345678", address: "Kaduna Farm Road", leadTimeDays: 7, rating: 4.5, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
          { id: "sup-ag-02", name: "Local Seed Bank", contactName: "Sarah Bitrus", email: "info@seeds.ng", phone: "08087654321", address: "Jos North", leadTimeDays: 3, rating: 4.8, isActive: true, createdAt: ts(100), updatedAt: ts(5) },
        ],
        locations: [
          { id: "loc-ag-01", name: "Main Field", type: "warehouse", parentId: null, description: "Primary planting zone", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
          { id: "loc-ag-02", name: "Cold Storage", type: "warehouse", parentId: null, description: "Stored produce", address: "", isActive: true, createdAt: ts(100), updatedAt: ts(10) },
        ]
      };
    case "restaurant":
      return {
        categories: [
          { id: "proteins", name: "Proteins & Meat", description: "Beef, Chicken, Fish", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["kg", "g", "portion", "plate", "bowl"] },
          { id: "grains", name: "Grains & Staples", description: "Rice, Beans, Flour", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["kg", "g", "bag", "bowl", "cup", "mudu", "paint"] },
          { id: "vegetables", name: "Vegetables & Fruits", description: "Fresh produce", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "portion", "plate", "bowl", "bundle"] },
          { id: "drinks", name: "Drinks & Beverages", description: "Juice, Water, Soda", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["ltr", "ml", "bottle", "cup"] },
          { id: "spices", name: "Spices & Seasonings", description: "Flavor enhancers", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["g", "pack", "bottle", "cup"] },
          { id: "bakery", name: "Bakery & Pastry", description: "Breads and cakes", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "portion", "plate", "loaf", "pack"] },
        ],
        suppliers: [
          { id: "sup-rs-01", name: "Fresh Market Direct", contactName: "Baba Jide", email: "orders@freshmarket.ng", phone: "0706543210", address: "Oyingbo Market", leadTimeDays: 1, rating: 4.7, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
          { id: "sup-rs-02", name: "Foodie Wholesalers", contactName: "Ngozi", email: "info@foodie.ng", phone: "08099887766", address: "Victoria Island", leadTimeDays: 2, rating: 4.3, isActive: true, createdAt: ts(100), updatedAt: ts(5) },
        ],
        locations: [
          { id: "loc-rs-01", name: "Kitchen Pantry", type: "warehouse", parentId: null, description: "Raw ingredients", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
          { id: "loc-rs-02", name: "Ready Server", type: "warehouse", parentId: null, description: "Prepared food station", address: "", isActive: true, createdAt: ts(100), updatedAt: ts(10) },
        ]
      };
  }
};

// Keep existing exports for compatibility during transition
export const categories: Category[] = getBaseForSector("general").categories;
export const suppliers: Supplier[] = getBaseForSector("general").suppliers;
export const locations: Location[] = getBaseForSector("general").locations;
