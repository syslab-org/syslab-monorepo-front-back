import { createContext, useCallback, useMemo, useState } from "react";

import TourOverlay from "@/shared/ui/onboarding/TourOverlay";
import { getTourDefinition } from "@/shared/ui/onboarding/tourRegistry";
import { isTourCompleted, markTourCompleted } from "@/shared/ui/onboarding/tourStorage";

export const OnboardingTourContext = createContext(null);

export function OnboardingTourProvider({ children }) {
  const [activeTourId, setActiveTourId] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const activeTour = activeTourId ? getTourDefinition(activeTourId) : null;
  const totalSteps = activeTour?.steps?.length || 0;
  const activeStep = activeTour?.steps?.[currentStepIndex] || null;
  const active = Boolean(activeTour && activeStep);

  const goToStep = useCallback(async (tourId, nextIndex) => {
    const tour = getTourDefinition(tourId);
    const step = tour?.steps?.[nextIndex];

    if (!tour || !step) return false;

    if (typeof step.beforeStep === "function") {
      await step.beforeStep();
    }

    setActiveTourId(tourId);
    setCurrentStepIndex(nextIndex);
    return true;
  }, []);

  const startTour = useCallback(
    async (tourId, options = {}) => {
      const { force = false } = options;
      const tour = getTourDefinition(tourId);

      if (!tour) return false;
      if (!force && isTourCompleted(tourId)) return false;

      return goToStep(tourId, 0);
    },
    [goToStep],
  );

  const startTourIfNeeded = useCallback(
    async (tourId) => startTour(tourId, { force: false }),
    [startTour],
  );

  const closeTour = useCallback(
    (tourId) => {
      if (tourId) {
        markTourCompleted(tourId);
      }
      setActiveTourId(null);
      setCurrentStepIndex(0);
    },
    [],
  );

  const dismissTour = useCallback(() => {
    closeTour(activeTourId);
  }, [activeTourId, closeTour]);

  const nextStep = useCallback(async () => {
    if (!activeTourId || !activeTour) return false;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= activeTour.steps.length) {
      closeTour(activeTourId);
      return true;
    }

    return goToStep(activeTourId, nextIndex);
  }, [activeTourId, activeTour, closeTour, currentStepIndex, goToStep]);

  const previousStep = useCallback(async () => {
    if (!activeTourId) return false;
    const previousIndex = currentStepIndex - 1;
    if (previousIndex < 0) return false;
    return goToStep(activeTourId, previousIndex);
  }, [activeTourId, currentStepIndex, goToStep]);

  const restartTour = useCallback(
    async (tourId) => startTour(tourId, { force: true }),
    [startTour],
  );

  const value = useMemo(
    () => ({
      active,
      activeTourId,
      activeStep,
      currentStepIndex,
      totalSteps,
      startTour,
      startTourIfNeeded,
      restartTour,
      nextStep,
      previousStep,
      dismissTour,
    }),
    [
      active,
      activeStep,
      activeTourId,
      currentStepIndex,
      dismissTour,
      nextStep,
      previousStep,
      restartTour,
      startTour,
      startTourIfNeeded,
      totalSteps,
    ],
  );

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
      <TourOverlay />
    </OnboardingTourContext.Provider>
  );
}
