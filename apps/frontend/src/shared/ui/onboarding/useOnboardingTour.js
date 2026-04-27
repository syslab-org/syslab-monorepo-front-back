import { useContext } from "react";

import { OnboardingTourContext } from "@/app/providers/OnboardingTourContext";

export default function useOnboardingTour() {
  const context = useContext(OnboardingTourContext);

  if (!context) {
    throw new Error("useOnboardingTour must be used within an OnboardingTourProvider");
  }

  return context;
}
