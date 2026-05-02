import type { Category, Supplier, Location } from "@/types/inventory";

const ts = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

export const getBaseForSector = (sector: string) => {
  switch (sector) {
    case "agriculture":
      return {
        categories: [
          { id: "cat-ag-01", name: "Crops", description: "Primary field produce", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
          { id: "cat-ag-02", name: "Supplies", description: "Fertilizers and tools", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
          { id: "cat-ag-03", name: "Livestock", description: "Animal products", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
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
    case "pharmacy":
      return {
        categories: [
          { id: "cat-ph-01", name: "Antibiotics", description: "Prescription meds", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
          { id: "cat-ph-02", name: "OTC", description: "Over the counter", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
          { id: "cat-ph-03", name: "First Aid", description: "Bandages and kits", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
        ],
        suppliers: [
          { id: "sup-ph-01", name: "PharmaDist Lagos", contactName: "Dr. Ade", email: "orders@pharmadist.ng", phone: "01-4433221", address: "Lagos Island", leadTimeDays: 2, rating: 4.9, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
          { id: "sup-ph-02", name: "Global Meds Corp", contactName: "Chidi O.", email: "sales@globalmeds.com", phone: "0901223344", address: "Abuja Business District", leadTimeDays: 5, rating: 4.6, isActive: true, createdAt: ts(100), updatedAt: ts(5) },
        ],
        locations: [
          { id: "loc-ph-01", name: "Front Counter", type: "warehouse", parentId: null, description: "Active display", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
          { id: "loc-ph-02", name: "Controlled Safe", type: "warehouse", parentId: null, description: "Restricted meds", address: "", isActive: true, createdAt: ts(100), updatedAt: ts(10) },
        ]
      };
    case "restaurant":
      return {
        categories: [
          { id: "cat-rs-01", name: "Main Course", description: "Primary menu items", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
          { id: "cat-rs-02", name: "Sides", description: "Supporting dishes", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
          { id: "cat-rs-03", name: "Beverages", description: "Drinks and water", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
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
    default:
      return {
        categories: [
          { id: "cat-01", name: "Electronics", description: "Electronic components", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
          { id: "cat-02", name: "Office Supplies", description: "Office essentials", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
        ],
        suppliers: [
          { id: "sup-01", name: "Acme Supply Co", contactName: "John Carter", email: "john@acmesupply.com", phone: "555-0101", address: "123 Industrial Ave", leadTimeDays: 5, rating: 4.5, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-01", name: "Main Warehouse", type: "warehouse", parentId: null, description: "Primary storage", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
  }
};

// Keep existing exports for compatibility during transition
export const categories: Category[] = getBaseForSector("general").categories;
export const suppliers: Supplier[] = getBaseForSector("general").suppliers;
export const locations: Location[] = getBaseForSector("general").locations;
