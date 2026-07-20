import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  runTransaction,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, isFirebaseOffline } from "@/lib/firebase";
import { useDemo } from "./useDemo";
import type { Item, SaleTransaction } from "@/types/inventory";
import type { CreditTransaction } from "@/types/finance";

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
    let salesNotificationsEnabled = true;
    try {
      const saved = localStorage.getItem("nexa_smart_features");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.salesNotifications === false) {
          salesNotificationsEnabled = false;
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (isDemo && demoStore) {
      demoStore.addSale(sale);
      if (salesNotificationsEnabled) {
        demoStore.addNotification({
          id: `notif-sale-${sale.id}-${Date.now()}`,
          type: "po_reminder",
          title: "New POS Sale Logged",
          message: `Processed successful transaction of ₦${sale.totalNgn.toLocaleString()} to ${sale.customerName}.`,
          isRead: false,
          link: "/app/sales-history",
          createdAt: new Date().toISOString()
        });
      }
      bumpVersion();
      return;
    }

    // In non-demo, let's trigger the notification record if enabled
    if (salesNotificationsEnabled) {
      try {
        await addDoc(collection(db, "notifications"), {
          storeId: profile?.storeId || null,
          type: "po_reminder",
          title: "New POS Sale Logged",
          message: `Processed successful transaction of ₦${sale.totalNgn.toLocaleString()} to ${sale.customerName}.`,
          isRead: false,
          link: "/app/sales-history",
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Failed to add sales notification", e);
      }
    }

    const isOffline = typeof window !== "undefined" && (localStorage.getItem("nexa_force_offline") === "true" || isFirebaseOffline);

    if (isOffline) {
      try {
        const saleRef = doc(db, "sales", sale.id);
        const cleanSale = JSON.parse(JSON.stringify(sale));
        await setDoc(saleRef, {
          ...cleanSale,
          storeId: profile?.storeId,
          createdAt: serverTimestamp()
        });

        await Promise.all(
          sale.items.map(async (lineItem, index) => {
            const itemRef = doc(db, "items", lineItem.itemId);
            const reduction = lineItem.quantity * (lineItem.multiplier || 1);
            await updateDoc(itemRef, {
              currentStock: increment(-reduction),
              updatedAt: serverTimestamp()
            });

            const movementId = `mvt-${sale.id}-${lineItem.itemId}-${index}`;
            await setDoc(doc(db, "movements", movementId), {
              itemId: lineItem.itemId,
              type: "shipped",
              quantity: reduction,
              fromLocationId: null,
              toLocationId: null,
              reference: sale.id,
              notes: `Sold via ${sale.source === "social" ? "Storefront" : "POS"} (Offline)`,
              performedBy: profile?.name || "System",
              storeId: profile?.storeId || null,
              createdAt: serverTimestamp()
            });
          })
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "sales/offline-transaction");
      }
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

        // 3. Update stock for each item and log movement (WRITES)
        sale.items.forEach((lineItem, index) => {
          const itemSnap = itemSnaps[index];
          if (itemSnap.exists()) {
            const itemRef = itemSnap.ref;
            const itemData = itemSnap.data();
            const currentStock = itemData.currentStock || 0;
            const reduction = lineItem.quantity * (lineItem.multiplier || 1);
            
            transaction.update(itemRef, {
              currentStock: Math.max(0, currentStock - reduction),
              updatedAt: serverTimestamp()
            });

            const movementId = `mvt-${sale.id}-${lineItem.itemId}-${index}`;
            transaction.set(doc(db, "movements", movementId), {
              itemId: lineItem.itemId,
              type: "shipped",
              quantity: reduction,
              fromLocationId: itemData.locationId || null,
              toLocationId: null,
              reference: sale.id,
              notes: `Sold via ${sale.source === "social" ? "Storefront" : "POS"}`,
              performedBy: profile?.name || "System",
              storeId: profile?.storeId || null,
              createdAt: serverTimestamp()
            });
          }
        });
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      const isNetwork = errMsg.includes("unavailable") || 
                        errMsg.includes("could not reach") || 
                        errMsg.includes("offline") || 
                        errMsg.includes("network-request-failed") ||
                        errMsg.includes("failed to get document") ||
                        errMsg.includes("transaction failed");

      if (isNetwork) {
        console.warn("Transaction failed due to network; falling back to offline write mode.");
        try {
          const saleRef = doc(db, "sales", sale.id);
          const cleanSale = JSON.parse(JSON.stringify(sale));
          await setDoc(saleRef, {
            ...cleanSale,
            storeId: profile?.storeId,
            createdAt: serverTimestamp()
          });

          await Promise.all(
            sale.items.map(async (lineItem, index) => {
              const itemRef = doc(db, "items", lineItem.itemId);
              const reduction = lineItem.quantity * (lineItem.multiplier || 1);
              await updateDoc(itemRef, {
                currentStock: increment(-reduction),
                updatedAt: serverTimestamp()
              });

              const movementId = `mvt-${sale.id}-${lineItem.itemId}-${index}`;
              await setDoc(doc(db, "movements", movementId), {
                itemId: lineItem.itemId,
                type: "shipped",
                quantity: reduction,
                fromLocationId: null,
                toLocationId: null,
                reference: sale.id,
                notes: `Sold via ${sale.source === "social" ? "Storefront" : "POS"} (Offline Fallback)`,
                performedBy: profile?.name || "System",
                storeId: profile?.storeId || null,
                createdAt: serverTimestamp()
              });
            })
          );
          return;
        } catch (offlineErr) {
          handleFirestoreError(offlineErr, OperationType.WRITE, "sales/offline-transaction-fallback");
        }
      }
      handleFirestoreError(err, OperationType.WRITE, "sales/transaction");
    }
  };

  const addCreditTransaction = async (phone: string, name: string, txn: CreditTransaction) => {
    if (isDemo && demoStore) {
      demoStore.addCreditTransaction(phone, name, txn);
      bumpVersion();
      return;
    }

    try {
      const creditId = `credit-${phone.trim()}`;
      const creditRef = doc(db, "credits", creditId);
      
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(creditRef);
        let balanceNgn = 0;
        let transactions: CreditTransaction[] = [];
        
        if (snap.exists()) {
          const data = snap.data();
          balanceNgn = data.balanceNgn || 0;
          transactions = data.transactions || [];
        }
        
        const nextBalance = txn.type === "credit" ? balanceNgn + txn.amountNgn : balanceNgn - txn.amountNgn;
        transactions.push(txn);
        
        transaction.set(creditRef, {
          id: creditId,
          customerName: name,
          customerPhone: phone,
          balanceNgn: nextBalance,
          transactions,
          storeId: profile?.storeId,
          updatedAt: serverTimestamp()
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `credits/${phone}`);
    }
  };

  return { createItem, updateItem, addSale, addCreditTransaction };
}
