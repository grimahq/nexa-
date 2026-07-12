import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  runTransaction,
  serverTimestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { useDemo } from "./useDemo";
import type { Item, SaleTransaction } from "@/types/inventory";

import { useAuth } from "@/contexts/AuthContext";

export function useInventoryMutation() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { profile } = useAuth();

  const createItem = async (item: Item) => {
    if (isDemo && demoStore) {
      demoStore.createItem(item);
      bumpVersion();
      return;
    }
    try {
      const { id, ...data } = item;
      await setDoc(doc(db, "items", id), {
        ...data,
        storeId: profile?.storeId,
        updatedAt: serverTimestamp(),
        createdAt: item.createdAt || serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "items");
    }
  };

  const updateItem = async (id: string, updates: Partial<Item>) => {
    if (isDemo && demoStore) {
      demoStore.updateItem(id, updates);
      bumpVersion();
      return;
    }
    try {
      await updateDoc(doc(db, "items", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `items/${id}`);
    }
  };

  const addSale = async (sale: SaleTransaction) => {
    if (isDemo && demoStore) {
      demoStore.addSale(sale);
      bumpVersion();
      return;
    }
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Pre-fetch all item stocks (READS)
        const itemSnaps = await Promise.all(
          sale.items.map(lineItem => transaction.get(doc(db, "items", lineItem.itemId)))
        );

        // 2. Create sale record (WRITE)
        const saleRef = doc(db, "sales", sale.id);
        const cleanSale = JSON.parse(JSON.stringify(sale));
        transaction.set(saleRef, {
          ...cleanSale,
          storeId: profile?.storeId,
          createdAt: serverTimestamp()
        });

        // 3. Update stock for each item (WRITES)
        sale.items.forEach((lineItem, index) => {
          const itemSnap = itemSnaps[index];
          if (itemSnap.exists()) {
            const itemRef = itemSnap.ref;
            const currentStock = itemSnap.data().currentStock || 0;
            const reduction = lineItem.quantity * (lineItem.multiplier || 1);
            transaction.update(itemRef, {
              currentStock: Math.max(0, currentStock - reduction),
              updatedAt: serverTimestamp()
            });
          }
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "sales/transaction");
    }
  };

  return { createItem, updateItem, addSale };
}
