import { useMemo } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useFirebaseCollection } from "./useFirebaseData";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { where } from "firebase/firestore";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "requestor";
  status: "active" | "inactive" | "pending";
  joinedAt: string;
  storeId?: string;
}

export function useUsers() {
  const { isDemo, demoStore, version } = useDemo();
  const { profile } = useAuth();
  const enabled = !isDemo && !!auth.currentUser && !!profile?.storeId;
  
  const constraints = useMemo(() => {
    if (profile?.storeId) {
      return [where("storeId", "==", profile.storeId)];
    }
    return [];
  }, [profile?.storeId]);

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
