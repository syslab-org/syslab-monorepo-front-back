import { Box } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import TourPopover from "@/shared/ui/onboarding/TourPopover";
import useOnboardingTour from "@/shared/ui/onboarding/useOnboardingTour";

const HIGHLIGHT_PADDING = 10;
const POPOVER_GAP = 18;
const POPOVER_ESTIMATED_HEIGHT = 220;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function getTargetElement(step) {
  if (!step?.target || typeof document === "undefined") return null;
  return document.querySelector(`[data-tour="${step.target}"]`);
}

function toHighlightRect(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();

  return {
    top: Math.max(8, rect.top - HIGHLIGHT_PADDING),
    left: Math.max(8, rect.left - HIGHLIGHT_PADDING),
    width: rect.width + HIGHLIGHT_PADDING * 2,
    height: rect.height + HIGHLIGHT_PADDING * 2,
  };
}

function getPopoverPosition(rect, placement = "bottom") {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const maxWidth = Math.min(360, viewportWidth - 32);
  const centerLeft = rect ? rect.left + rect.width / 2 - maxWidth / 2 : (viewportWidth - maxWidth) / 2;

  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const hasRoomBottom = rect.top + rect.height + POPOVER_GAP + POPOVER_ESTIMATED_HEIGHT <= viewportHeight - 16;
  const hasRoomTop = rect.top - POPOVER_GAP - POPOVER_ESTIMATED_HEIGHT >= 16;
  const hasRoomRight = rect.left + rect.width + POPOVER_GAP + maxWidth <= viewportWidth - 16;
  const hasRoomLeft = rect.left - POPOVER_GAP - maxWidth >= 16;

  let resolvedPlacement = placement;
  if (placement === "bottom" && !hasRoomBottom && hasRoomTop) {
    resolvedPlacement = "top";
  } else if (placement === "top" && !hasRoomTop && hasRoomBottom) {
    resolvedPlacement = "bottom";
  } else if (placement === "right" && !hasRoomRight) {
    resolvedPlacement = hasRoomLeft ? "left" : hasRoomTop ? "top" : "bottom";
  } else if (placement === "left" && !hasRoomLeft) {
    resolvedPlacement = hasRoomRight ? "right" : hasRoomTop ? "top" : "bottom";
  }

  if (
    (resolvedPlacement === "top" || resolvedPlacement === "bottom") &&
    !hasRoomTop &&
    !hasRoomBottom
  ) {
    return {
      top: 16,
      left: clamp(centerLeft, 16, viewportWidth - maxWidth - 16),
      transform: "none",
    };
  }

  if (
    (resolvedPlacement === "left" || resolvedPlacement === "right") &&
    !hasRoomLeft &&
    !hasRoomRight
  ) {
    return {
      top: clamp(rect.top + 24, 16, viewportHeight - POPOVER_ESTIMATED_HEIGHT - 16),
      left: clamp(centerLeft, 16, viewportWidth - maxWidth - 16),
      transform: "none",
    };
  }

  if (resolvedPlacement === "top") {
    return {
      top: rect.top - POPOVER_GAP,
      left: clamp(centerLeft, 16, viewportWidth - maxWidth - 16),
      transform: "translateY(-100%)",
    };
  }

  if (resolvedPlacement === "left") {
    return {
      top: clamp(rect.top + rect.height / 2, 96, viewportHeight - 96),
      left: clamp(rect.left - POPOVER_GAP, maxWidth + 16, viewportWidth - 16),
      transform: "translate(-100%, -50%)",
    };
  }

  if (resolvedPlacement === "right") {
    return {
      top: clamp(rect.top + rect.height / 2, 96, viewportHeight - 96),
      left: clamp(rect.left + rect.width + POPOVER_GAP, 16, viewportWidth - maxWidth - 16),
      transform: "translateY(-50%)",
    };
  }

  return {
    top: rect.top + rect.height + POPOVER_GAP,
    left: clamp(centerLeft, 16, viewportWidth - maxWidth - 16),
    transform: "none",
  };
}

export default function TourOverlay() {
  const {
    active,
    activeStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    previousStep,
    dismissTour,
  } = useOnboardingTour();
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    if (!active || !activeStep || typeof window === "undefined") {
      setTargetRect(null);
      return undefined;
    }

    const element = getTargetElement(activeStep);
    element?.scrollIntoView?.({ behavior: "auto", block: "center", inline: "center" });

    let frameId = 0;

    const updateRect = () => {
      setTargetRect(toHighlightRect(getTargetElement(activeStep)));
    };

    const requestUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateRect);
    };

    updateRect();

    window.addEventListener("resize", requestUpdate);
    window.addEventListener("scroll", requestUpdate, true);

    const observer = new MutationObserver(requestUpdate);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
    });

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("scroll", requestUpdate, true);
    };
  }, [active, activeStep]);

  const popoverPosition = useMemo(
    () => getPopoverPosition(targetRect, activeStep?.placement),
    [targetRect, activeStep?.placement],
  );

  if (!active || !activeStep || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      {targetRect ? (
        <>
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: targetRect.top,
              zIndex: (theme) => theme.zIndex.tooltip + 1,
              backgroundColor: "rgba(15, 23, 42, 0.54)",
              backdropFilter: "blur(2px)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "fixed",
              top: targetRect.top,
              left: 0,
              width: targetRect.left,
              height: targetRect.height,
              zIndex: (theme) => theme.zIndex.tooltip + 1,
              backgroundColor: "rgba(15, 23, 42, 0.54)",
              backdropFilter: "blur(2px)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "fixed",
              top: targetRect.top,
              left: targetRect.left + targetRect.width,
              right: 0,
              height: targetRect.height,
              zIndex: (theme) => theme.zIndex.tooltip + 1,
              backgroundColor: "rgba(15, 23, 42, 0.54)",
              backdropFilter: "blur(2px)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "fixed",
              top: targetRect.top + targetRect.height,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: (theme) => theme.zIndex.tooltip + 1,
              backgroundColor: "rgba(15, 23, 42, 0.54)",
              backdropFilter: "blur(2px)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: (theme) => theme.zIndex.tooltip + 1,
            backgroundColor: "rgba(15, 23, 42, 0.54)",
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
          }}
        />
      )}

      {targetRect && (
        <Box
          sx={{
            position: "fixed",
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            zIndex: (theme) => theme.zIndex.tooltip + 2,
            borderRadius: 3,
            border: "2px solid rgba(255,255,255,0.9)",
            boxShadow: "0 0 0 6px rgba(59,130,246,0.22)",
            pointerEvents: "none",
          }}
        />
      )}

      <TourPopover
        step={activeStep}
        stepIndex={currentStepIndex}
        totalSteps={totalSteps}
        positionStyle={popoverPosition}
        onBack={previousStep}
        onNext={nextStep}
        onSkip={dismissTour}
        canGoBack={currentStepIndex > 0}
        isLastStep={currentStepIndex === totalSteps - 1}
        targetFound={Boolean(targetRect)}
      />
    </>,
    document.body,
  );
}
