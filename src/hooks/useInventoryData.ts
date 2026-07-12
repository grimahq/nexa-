import { useMemo } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";

function useActiveStoreId() {
  const { profile } = useAuth();
  const { currentStoreId } = useRole();
  return currentStoreId || profile?.storeId;
}
import type {
  Item,
  Category,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
} from "@/types/inventory";
import type { ItemFilters, StockSummary } from "@/lib/demo-store";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

import { useFirebaseCollection, useFirebaseDoc } from "./useFirebaseData";
import { where, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import type { SaleTransaction } from "@/types/inventory";
import type { Expense, Refund } from "@/types/finance";
import type { Customer } from "@/types/crm";

export function useItems(filters?: ItemFilters): QueryResult<Item[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;
  
  // Firebase fetch
  const constraints = useMemo(() => {
    const c = [];
    if (activeStoreId) c.push(where("storeId", "==", activeStoreId));
    if (filters?.categoryId) c.push(where("categoryId", "==", filters.categoryId));
    if (filters?.supplierId) c.push(where("supplierId", "==", filters.supplierId));
    if (filters?.status) c.push(where("status", "==", filters.status));
    return c;
  }, [filters?.categoryId, filters?.supplierId, filters?.status, activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<Item>("items", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getItems(filters), isLoading: false, error: null };
    
    let list = firebaseData;
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }

    return { data: list, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, filters, firebaseData, loading]);
}

export function useItemById(id: string): QueryResult<Item | undefined> {
  const { isDemo, demoStore, version } = useDemo();
  const enabled = !isDemo && !!auth.currentUser;
  const { data: firebaseData, loading } = useFirebaseDoc<Item>("items", id, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getItemById(id), isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, id, firebaseData, loading]);
}

export function useCategories(): QueryResult<Category[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;
  
  const constraints = useMemo(() => {
    return activeStoreId ? [where("storeId", "==", activeStoreId)] : [];
  }, [activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<Category>("categories", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getCategories(), isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, firebaseData, loading]);
}

export function useSuppliers(): QueryResult<Supplier[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;
  
  const constraints = useMemo(() => {
    return activeStoreId ? [where("storeId", "==", activeStoreId)] : [];
  }, [activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<Supplier>("suppliers", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getSuppliers()], isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, firebaseData, loading]);
}

export function useLocations(): QueryResult<Location[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;
  
  const constraints = useMemo(() => {
    return activeStoreId ? [where("storeId", "==", activeStoreId)] : [];
  }, [activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<Location>("locations", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getLocations(), isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, firebaseData, loading]);
}

export function useMovements(limitVal?: number): QueryResult<StockMovement[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;

  const constraints = useMemo(() => {
    const c = [orderBy("createdAt", "desc")];
    if (activeStoreId) c.push(where("storeId", "==", activeStoreId));
    if (limitVal) c.push(firestoreLimit(limitVal));
    return c;
  }, [limitVal, activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<StockMovement>("movements", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) {
      const data = limitVal ? demoStore.getRecentMovements(limitVal) : demoStore.getMovements();
      return { data, isLoading: false, error: null };
    }
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, limitVal, firebaseData, loading]);
}

export function useStockSummary(): QueryResult<StockSummary> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;
  
  const constraints = useMemo(() => {
    return activeStoreId ? [where("storeId", "==", activeStoreId)] : [];
  }, [activeStoreId]);

  const { data: items, loading } = useFirebaseCollection<Item>("items", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getStockSummary(), isLoading: false, error: null };
    
    const summary: StockSummary = {
      total: items.length,
      inStock: items.filter((i) => i.currentStock > i.reorderPoint).length,
      lowStock: items.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderPoint).length,
      outOfStock: items.filter((i) => i.currentStock === 0).length,
    };

    return { data: summary, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, items, loading]);
}

export function usePurchaseOrders(): QueryResult<PurchaseOrder[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;

  const constraints = useMemo(() => {
    const c = [orderBy("createdAt", "desc")];
    if (activeStoreId) c.push(where("storeId", "==", activeStoreId));
    return c;
  }, [activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<PurchaseOrder>("purchaseOrders", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getPurchaseOrders()], isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, firebaseData, loading]);
}

export function useRequests(): QueryResult<InventoryRequest[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;

  const constraints = useMemo(() => {
    const c = [orderBy("createdAt", "desc")];
    if (activeStoreId) c.push(where("storeId", "==", activeStoreId));
    return c;
  }, [activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<InventoryRequest>("requests", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getRequests()], isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, firebaseData, loading]);
}

export function useSales(): QueryResult<SaleTransaction[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;

  const constraints = useMemo(() => {
    const c = [orderBy("createdAt", "desc")];
    if (activeStoreId) c.push(where("storeId", "==", activeStoreId));
    return c;
  }, [activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<SaleTransaction>("sales", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getSales()], isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, firebaseData, loading]);
}

export function useExpenses(): QueryResult<Expense[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;

  const constraints = useMemo(() => {
    const c = [orderBy("date", "desc")];
    if (activeStoreId) c.push(where("storeId", "==", activeStoreId));
    return c;
  }, [activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<Expense>("expenses", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getExpenses()], isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, firebaseData, loading]);
}

export function useCustomers(): QueryResult<Customer[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;

  const constraints = useMemo(() => {
    const c = [orderBy("name", "asc")];
    if (activeStoreId) c.push(where("storeId", "==", activeStoreId));
    return c;
  }, [activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<Customer>("customers", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getCustomers()], isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, firebaseData, loading]);
}

export function useRefunds(): QueryResult<Refund[]> {
  const { isDemo, demoStore, version } = useDemo();
  const activeStoreId = useActiveStoreId();
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;

  const constraints = useMemo(() => {
    const c = [orderBy("createdAt", "desc")];
    if (activeStoreId) c.push(where("storeId", "==", activeStoreId));
    return c;
  }, [activeStoreId]);

  const { data: firebaseData, loading } = useFirebaseCollection<Refund>("refunds", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getRefunds()], isLoading: false, error: null };
    return { data: firebaseData, isLoading: loading, error: null };
  }, [isDemo, demoStore, version, firebaseData, loading]);
}


