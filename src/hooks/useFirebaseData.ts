import { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, type QueryConstraint } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";
import type { 
  Item, 
  Category, 
  Supplier, 
  Location, 
  StockMovement, 
  PurchaseOrder, 
  InventoryRequest,
  SaleTransaction
} from "@/types/inventory";

export interface FirebaseOptions {
  enabled?: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function serializeConstraints(constraints: any[]): string {
  return constraints.map((c: any) => {
    if (!c || typeof c !== 'object') return String(c);
    
    // Attempt standard firestore constraint extraction
    const field = c._field?.toString?.() || c._field?._path?.segments?.join('.') || '';
    const op = c._op || '';
    let valStr = '';
    if (c._value !== undefined) {
      valStr = typeof c._value === 'object' ? JSON.stringify(c._value) : String(c._value);
    }
    const dir = c._direction || '';
    const lim = c._limit !== undefined ? String(c._limit) : '';
    const type = c.type || '';
    
    // In case Firestore changes internal implementation details, also grab all primitive key-value pairs
    const primitiveKeys: string[] = [];
    for (const key in c) {
      if (Object.prototype.hasOwnProperty.call(c, key)) {
        const val = c[key];
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          primitiveKeys.push(`${key}:${val}`);
        }
      }
    }
    
    return `${type}:${field}:${op}:${valStr}:${dir}:${lim}:{${primitiveKeys.sort().join(',')}}`;
  }).join('|');
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function useFirebaseCollection<T>(
  collectionName: string, 
  queryConstraints: QueryConstraint[] = [],
  options: FirebaseOptions = { enabled: true }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(options.enabled ?? true);
  const [error, setError] = useState<Error | null>(null);

  const constraintsKey = serializeConstraints(queryConstraints);

  useEffect(() => {
    if (options.enabled === false) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Timeout to prevent hanging if Firestore is offline or unreachable
    const timer = setTimeout(() => {
      console.warn(`Firestore query for collection "${collectionName}" timed out after 1500ms. Falling back gracefully.`);
      setLoading(false);
    }, 1500);

    const q = query(collection(db, collectionName), ...queryConstraints);
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        clearTimeout(timer);
        const items = snapshot.docs.map(d => {
          const data = d.data();
          // Recursively convert Timestamps to ISO strings
          const convert = (val: unknown): unknown => {
            if (!val || typeof val !== 'object') return val;
            if ("toDate" in val && typeof (val as { toDate: () => { toISOString: () => string } }).toDate === "function") {
              return (val as { toDate: () => { toISOString: () => string } }).toDate().toISOString();
            }
            if (Array.isArray(val)) return val.map(convert);
            const res: Record<string, unknown> = {};
            const obj = val as Record<string, unknown>;
            for (const k in obj) res[k] = convert(obj[k]);
            return res;
          };
          return { id: d.id, ...convert(data) as object } as T;
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        clearTimeout(timer);
        // If it's a permission error and we just signed out, ignore it
        if (err.message.includes("permissions") && !auth.currentUser) {
          return;
        }
        setError(err);
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, collectionName);
      }
    );
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, constraintsKey, options.enabled]);

  return { data, loading, error };
}

export function useFirebaseDoc<T>(
  collectionName: string, 
  docId: string,
  options: FirebaseOptions = { enabled: true }
) {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(options.enabled ?? true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId || options.enabled === false) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(() => {
      console.warn(`Firestore get for doc "${collectionName}/${docId}" timed out after 1500ms. Falling back.`);
      setLoading(false);
    }, 1500);

    const unsub = onSnapshot(doc(db, collectionName, docId), 
      (s) => {
        clearTimeout(timer);
        if (!s.exists()) {
          setData(undefined);
        } else {
          const data = s.data();
          const convert = (val: unknown): unknown => {
            if (!val || typeof val !== 'object') return val;
            if ("toDate" in val && typeof (val as { toDate: () => { toISOString: () => string } }).toDate === "function") {
              return (val as { toDate: () => { toISOString: () => string } }).toDate().toISOString();
            }
            if (Array.isArray(val)) return val.map(convert);
            const res: Record<string, unknown> = {};
            const obj = val as Record<string, unknown>;
            for (const k in obj) res[k] = convert(obj[k]);
            return res;
          };
          setData({ id: s.id, ...convert(data) as object } as T);
        }
        setLoading(false);
      },
      (err) => {
        clearTimeout(timer);
        if (err.message.includes("permissions") && !auth.currentUser) {
          return;
        }
        setError(err);
        setLoading(false);
        handleFirestoreError(err, OperationType.GET, `${collectionName}/${docId}`);
      }
    );
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [collectionName, docId, options.enabled]);

  return { data, loading, error };
}
