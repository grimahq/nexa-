import type {
  Item,
  Category,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
  Notification,
} from "@/types/inventory";
import { getBaseForSector } from "./seed-base";
import { getItemsForSector } from "./seed-items";
import { generateMovements, generatePurchaseOrders, generateRequests } from "./seed-activity";
import { generateNotifications } from "./seed-notifications";

export interface NotificationPrefs {
  low_stock: boolean;
  zero_stock: boolean;
  po_reminder: boolean;
  po_overdue: boolean;
  request_update: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  low_stock: true,
  zero_stock: true,
  po_reminder: true,
  po_overdue: true,
  request_update: true,
};

export interface SeedData {
  categories: Category[];
  items: Item[];
  suppliers: Supplier[];
  locations: Location[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  requests: InventoryRequest[];
  notifications: Notification[];
  notificationPrefs: NotificationPrefs;
}

export function generateSeedData(sector: string = "general", selectedCategories?: string[]): SeedData {
  const base = getBaseForSector(sector);
  const allItems = getItemsForSector(sector);
  
  // If we have selected categories, we want to ensure we have exactly 2 products for each selected category
  // if they exist in the master list.
  let finalItems: Item[] = [];
  
  if (selectedCategories && selectedCategories.length > 0) {
    selectedCategories.forEach(catId => {
      const catItems = allItems.filter(i => i.categoryId === catId);
      // Take at most 2 items per selected category
      finalItems.push(...catItems.slice(0, 2));
    });
    
    // If we didn't find enough items or have too few, and this isn't a "blank" request, 
    // maybe we should add some from categories that weren't selected? 
    // Actually, following the prompt strictly: "For each category let's have 2 demo products"
    // I'll stick to the selected ones if they are provided.
  } else {
    finalItems = allItems;
  }

  return {
    categories: base.categories,
    items: finalItems,
    suppliers: base.suppliers,
    locations: base.locations,
    movements: generateMovements(),
    purchaseOrders: generatePurchaseOrders(),
    requests: generateRequests(),
    notifications: generateNotifications(),
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
  };
}
