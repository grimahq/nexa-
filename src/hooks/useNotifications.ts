import { useMemo, useCallback } from "react";
import { useDemo } from "@/hooks/useDemo";
import type { Notification } from "@/types/inventory";
import { useFirebaseCollection } from "./useFirebaseData";
import { auth } from "@/lib/firebase";
import { orderBy } from "firebase/firestore";
import { useUpdateNotification, useDeleteNotification } from "./useInventoryMutations";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useNotifications(): QueryResult<Notification[]> {
  const { isDemo, demoStore, version } = useDemo();
  const enabled = !isDemo && !!auth.currentUser;
  const { data: firebaseData, loading, error } = useFirebaseCollection<Notification>("notifications", [orderBy("createdAt", "desc")], { enabled });

  return useMemo(() => {
    if (isDemo && demoStore) {
      return { data: demoStore.getNotifications(), isLoading: false, error: null };
    }
    return { data: firebaseData, isLoading: loading, error };
  }, [isDemo, demoStore, version, firebaseData, loading, error]);
}

export function useUnreadCount(): number {
  const { isDemo, demoStore, version } = useDemo();
  const { data: notifications } = useNotifications();

  return useMemo(() => {
    if (isDemo && demoStore) return demoStore.getUnreadCount();
    return notifications.filter(n => !n.read).length;
  }, [isDemo, demoStore, version, notifications]);
}

export function useMarkAsRead() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { mutate } = useUpdateNotification();

  return useCallback(
    (id: string) => {
      if (isDemo) {
        demoStore?.markAsRead(id);
        bumpVersion();
      } else {
        mutate({ id, updates: { read: true } });
      }
    },
    [isDemo, demoStore, bumpVersion, mutate],
  );
}

export function useMarkAllAsRead() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { data: notifications } = useNotifications();
  const { mutate } = useUpdateNotification();

  return useCallback(() => {
    if (isDemo) {
      demoStore?.markAllAsRead();
      bumpVersion();
    } else {
      notifications.filter(n => !n.read).forEach(n => {
        mutate({ id: n.id, updates: { read: true } });
      });
    }
  }, [isDemo, demoStore, bumpVersion, notifications, mutate]);
}

export function useDismissNotification() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { mutate } = useDeleteNotification();

  return useCallback(
    (id: string) => {
      if (isDemo) {
        demoStore?.dismissNotification(id);
        bumpVersion();
      } else {
        mutate(id);
      }
    },
    [isDemo, demoStore, bumpVersion, mutate],
  );
}
