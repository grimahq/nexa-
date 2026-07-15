import { useMemo } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useFirebaseCollection } from "./useFirebaseData";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { where } from "firebase/firestore";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "requestor";
  status: "active" | "inactive" | "pending";
  joinedAt: string;
  storeId?: string;
  tempPassword?: string;
  branchId?: string | null;
  description?: string;
}

export function useUsers() {
  const { isDemo, demoStore, version } = useDemo();
  const { profile } = useAuth();
  const { currentStoreId } = useRole();
  
  const activeStoreId = currentStoreId || profile?.storeId;
  const enabled = !isDemo && !!auth.currentUser && !!activeStoreId;
  
  const constraints = useMemo(() => {
    if (activeStoreId) {
      return [where("storeId", "==", activeStoreId)];
    }
    return [];
  }, [activeStoreId]);

  const { data: firebaseData, loading, error } = useFirebaseCollection<AppUser>("users", constraints, { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) {
      return { 
        data: demoStore.getUsers() as unknown as AppUser[], 
        isLoading: false, 
        error: null 
      };
    }
    return { data: firebaseData, isLoading: loading, error };
  }, [isDemo, demoStore, firebaseData, loading, error, version]);
}
