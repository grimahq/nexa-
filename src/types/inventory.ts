export enum BusinessType {
  Retail = "retail",
  Restaurant = "restaurant",
  Agriculture = "agriculture",
  Pharmacy = "pharmacy",
  Manufacturing = "manufacturing",
  Electronics = "electronics",
  SocialCommerce = "social_commerce",
  General = "general",
}

export enum ItemStatus {
  Active = "active",
  Discontinued = "discontinued",
  Draft = "draft",
  Archived = "archived",
}

export enum MovementType {
  Received = "received",
  Shipped = "shipped",
  Adjusted = "adjusted",
  Transferred = "transferred",
}

export enum OrderStatus {
  Draft = "draft",
  Submitted = "submitted",
  Partial = "partial",
  Received = "received",
  Cancelled = "cancelled",
}

export enum RequestStatus {
  Pending = "pending",
  Approved = "approved",
  Declined = "declined",
  Fulfilled = "fulfilled",
}

export enum Role {
  Admin = "admin",
  Manager = "manager",
  Staff = "staff",
}

export const SUPPORTED_UNITS = [
  { id: "pcs", label: "Pieces", type: "count" as const, step: 1 },
  { id: "kg", label: "Kilograms", type: "weight" as const, step: 0.1 },
  { id: "g", label: "Grams", type: "weight" as const, step: 1 },
  { id: "lb", label: "Pounds", type: "weight" as const, step: 0.1 },
  { id: "oz", label: "Ounces", type: "weight" as const, step: 0.1 },
  { id: "ltr", label: "Liters", type: "volume" as const, step: 0.1 },
  { id: "ml", label: "Milliliters", type: "volume" as const, step: 1 },
  { id: "gal", label: "Gallons", type: "volume" as const, step: 0.1 },
  { id: "fl_oz", label: "Fluid Ounces", type: "volume" as const, step: 0.1 },
  { id: "m", label: "Meters", type: "length" as const, step: 0.1 },
  { id: "cm", label: "Centimeters", type: "length" as const, step: 1 },
  { id: "in", label: "Inches", type: "length" as const, step: 0.1 },
  { id: "ft", label: "Feet", type: "length" as const, step: 0.1 },
  { id: "pack", label: "Packs", type: "count" as const, step: 1 },
  { id: "box", label: "Boxes", type: "count" as const, step: 1 },
  { id: "bag", label: "Bags", type: "count" as const, step: 1 },
  { id: "bottle", label: "Bottles", type: "count" as const, step: 1 },
  { id: "vial", label: "Vials", type: "count" as const, step: 1 },
  { id: "plate", label: "Plates", type: "count" as const, step: 1 },
  { id: "portion", label: "Portions", type: "count" as const, step: 1 },
  { id: "bowl", label: "Bowls", type: "count" as const, step: 1 },
  { id: "bundle", label: "Bundles", type: "count" as const, step: 1 },
  { id: "yard", label: "Yards", type: "length" as const, step: 0.1 },
  { id: "mudu", label: "Mudu", type: "volume" as const, step: 0.1 },
  { id: "paint", label: "Paint Buckets", type: "volume" as const, step: 0.1 },
  { id: "cup", label: "Cups", type: "volume" as const, step: 0.1 },
];

export interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  supportedUnits?: string[];
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  rating: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  type: "warehouse" | "shelf" | "bin";
  parentId: string | null;
  description: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitConversion {
  unitId: string;
  multiplier: number;
  priceNgn?: number;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  fieldType: "text" | "number" | "boolean" | "select";
  options: string[];
  required: boolean;
  createdAt: string;
}

export interface Item {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string;
  categoryId: string | null;
  status: ItemStatus;
  unit: string;
  unitType: "count" | "weight" | "length" | "volume";
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  costPrice: number;
  sellingPrice: number;
  locationId: string | null;
  supplierId: string | null;
  imageUrl: string | null;
  emoji?: string;
  tags?: string[];
  isEcommerceEnabled?: boolean;
  affiliateCommission?: number;
  unitConversions?: UnitConversion[];
  customFields: Record<string, unknown>;
  needsReview?: boolean;
  reviewReason?: string;
  color?: string;
  sizes?: string;
  storeId?: string;
  pricingTiers?: {
    retail?: number;
    wholesale?: number;
    distributor?: number;
    tierEnabled?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  
  // Sector specific fields
  agriculture?: {
    cropVariety?: string;
    plantingDate?: string;
    expectedHarvestDate?: string;
    fieldId?: string;
  };
  pharmacy?: {
    expiryDate?: string;
    batchNumber?: string;
    requiresPrescription?: boolean;
    dosageForm?: string;
  };
  restaurant?: {
    preparationTime?: number;
    isVegetarian?: boolean;
    spiceLevel?: "none" | "mild" | "medium" | "hot";
    portionSizes?: { name: string; price: number }[];
    proteinAddons?: { name: string; price: number }[];
    spiceLevels?: string[];
    allowKitchenNotes?: boolean;
    isCombo?: boolean;
    comboSlots?: { name: string; categoryId: string }[];
  };
  textile?: {
    gsm?: number;
    weaveType?: string;
    fabricContent?: string;
  };
  electronics?: {
    compatibility?: string;
    brandFocus?: string;
    material?: string;
    warrantyPeriod?: string;
    accessoryType?: string;
  };
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  reference: string;
  notes: string;
  performedBy: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: OrderStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  expectedDelivery: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestItem {
  id: string;
  requestId: string;
  itemId: string;
  quantity: number;
  notes: string;
}

export interface InventoryRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: RequestStatus;
  priority: "low" | "normal" | "urgent";
  items: RequestItem[];
  requestedBy: string;
  approvedBy: string | null;
  reason: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: "low_stock" | "zero_stock" | "po_update" | "request_update" | "expiry_warning";
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  stores?: string[];
}

export interface SaleItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unit: string;
  multiplier: number;
  unitPriceNgn: number;
  imageUrl?: string;
  customFields?: {
    color?: string;
    size?: string;
    [key: string]: unknown;
  };
}

export interface SaleTransaction {
  id: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: SaleItem[];
  totalNgn: number;
  source?: "pos" | "social" | "demo";
  createdBy?: string;
  storeId?: string;
  createdAt: string;
  previousDebtPaidNgn?: number;
  isDebtSettlement?: boolean;
}
