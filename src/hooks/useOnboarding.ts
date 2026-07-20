import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "stackwise-onboarding-complete";

export interface TourStep {
  target?: string; // data-tour attribute value
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function useOnboarding(tourId: string) {
  const key = `${STORAGE_KEY}-${tourId}`;
  const [hasCompleted, setHasCompleted] = useState(() => localStorage.getItem(key) === "true");
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Sync state across instances/windows
  useEffect(() => {
    const sync = () => {
      setHasCompleted(localStorage.getItem(key) === "true");
    };
    window.addEventListener("onboarding-sync", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("onboarding-sync", sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);

  const startTour = useCallback((force = false) => {
    if (!hasCompleted || force) {
      setCurrentStep(0);
      setIsActive(true);
    }
  }, [hasCompleted]);

  const skipTour = useCallback(() => {
    localStorage.setItem(key, "true");
    setHasCompleted(true);
    setIsActive(false);
    window.dispatchEvent(new Event("onboarding-sync"));
  }, [key]);

  const completeTour = useCallback(() => {
    localStorage.setItem(key, "true");
    setHasCompleted(true);
    setIsActive(false);
    window.dispatchEvent(new Event("onboarding-sync"));
  }, [key]);

  const next = useCallback(() => setCurrentStep((s) => s + 1), []);
  const back = useCallback(() => setCurrentStep((s) => Math.max(0, s - 1)), []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(key);
    setHasCompleted(false);
    setIsActive(false);
    setCurrentStep(0);
    window.dispatchEvent(new Event("onboarding-sync"));
  }, [key]);

  return { hasCompleted, currentStep, isActive, startTour, skipTour, completeTour, next, back, resetTour };
}
