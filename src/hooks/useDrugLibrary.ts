import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { DRUG_LIBRARY, fetchAndSeedDrugLibrary, type DrugLibraryItem } from "@/data/drugLibrary";

/**
 * Reusable hook that subscribes to the 'drugLibrary' collection in real-time
 * and provides prefix/fuzzy search for both onboarding and catalog product-add flows.
 */
export function useDrugLibrary(enabled: boolean = true) {
  const [drugLibrary, setDrugLibrary] = useState<DrugLibraryItem[]>(DRUG_LIBRARY);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Subscribe to real-time updates from drugLibrary collection
    const unsub = onSnapshot(
      collection(db, "drugLibrary"),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: DrugLibraryItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as DrugLibraryItem;
            items.push({
              ...data,
              id: docSnap.id,
              activeIngredient: data.activeIngredient || (data.genericName ? `${data.genericName} ${data.strength || ""}`.trim() : data.name),
              requiresPrescription: data.isPrescriptionOnly ?? data.requiresPrescription ?? false,
              emoji: data.emoji || "💊",
              verificationStatus: data.verificationStatus || "verified",
            });
          });
          setDrugLibrary(items);
          setIsLoading(false);
        } else {
          // Fallback to seed and fetch
          fetchAndSeedDrugLibrary().then((seeded) => {
            setDrugLibrary(seeded);
            setIsLoading(false);
          });
        }
      },
      (error) => {
        console.warn("Real-time drugLibrary subscription failed, using seed fallback:", error);
        fetchAndSeedDrugLibrary().then((seeded) => {
          setDrugLibrary(seeded);
          setIsLoading(false);
        });
      }
    );

    return () => unsub();
  }, [enabled]);

  /**
   * Search drugs with real-time prefix & fuzzy matching across name, generic name, active ingredient & category.
   */
  const searchDrugs = useCallback((query: string, maxResults: number = 10): DrugLibraryItem[] => {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();

    return drugLibrary
      .map((item) => {
        const nameLower = item.name.toLowerCase();
        const genericLower = (item.genericName || "").toLowerCase();
        const activeLower = (item.activeIngredient || "").toLowerCase();
        const categoryLower = (item.category || "").toLowerCase();

        let score = 0;

        // Exact match
        if (nameLower === q || genericLower === q) score += 100;
        // Prefix match
        else if (nameLower.startsWith(q) || genericLower.startsWith(q)) score += 80;
        // Substring match
        else if (nameLower.includes(q)) score += 60;
        else if (genericLower.includes(q) || activeLower.includes(q)) score += 40;
        else if (categoryLower.includes(q)) score += 20;

        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ item }) => item);
  }, [drugLibrary]);

  return {
    drugLibrary,
    isLoading,
    searchDrugs,
  };
}
