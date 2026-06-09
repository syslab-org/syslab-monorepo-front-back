import { translate } from "@/shared/i18n";

export function getTourDefinition(tourId) {
  const tourRegistry = {
    "labs-overview": {
      id: "labs-overview",
      steps: [
        {
          id: "labs-header",
          target: "labs-page-header",
          title: translate("onboarding.tours.labsOverview.headerTitle"),
          description: translate("onboarding.tours.labsOverview.headerDescription"),
          placement: "bottom",
        },
        {
          id: "labs-create-guided",
          target: "labs-create-guided-button",
          title: translate("onboarding.tours.labsOverview.guidedTitle"),
          description: translate("onboarding.tours.labsOverview.guidedDescription"),
          placement: "bottom",
        },
        {
          id: "labs-create",
          target: "labs-create-lab-button",
          title: translate("onboarding.tours.labsOverview.createTitle"),
          description: translate("onboarding.tours.labsOverview.createDescription"),
          placement: "bottom",
        },
        {
          id: "labs-list",
          target: "labs-list-table",
          title: translate("onboarding.tours.labsOverview.listTitle"),
          description: translate("onboarding.tours.labsOverview.listDescription"),
          placement: "top",
        },
      ],
    },
    "canvas-overview": {
      id: "canvas-overview",
      steps: [
        {
          id: "canvas-tools-toggle",
          target: "canvas-tools-toggle",
          title: translate("onboarding.tours.canvasOverview.toolsTitle"),
          description: translate("onboarding.tours.canvasOverview.toolsDescription"),
          placement: "right",
        },
        {
          id: "canvas-drop-area",
          target: "canvas-drop-area",
          title: translate("onboarding.tours.canvasOverview.dropAreaTitle"),
          description: translate("onboarding.tours.canvasOverview.dropAreaDescription"),
          placement: "bottom",
        },
        {
          id: "canvas-guide-toggle",
          target: "canvas-guide-toggle",
          title: translate("onboarding.tours.canvasOverview.guideTitle"),
          description: translate("onboarding.tours.canvasOverview.guideDescription"),
          placement: "left",
        },
        {
          id: "canvas-state-summary",
          target: "canvas-state-summary",
          title: translate("onboarding.tours.canvasOverview.stateTitle"),
          description: translate("onboarding.tours.canvasOverview.stateDescription"),
          placement: "bottom",
        },
        {
          id: "canvas-save",
          target: "canvas-toolbar-save",
          title: translate("onboarding.tours.canvasOverview.saveTitle"),
          description: translate("onboarding.tours.canvasOverview.saveDescription"),
          placement: "bottom",
        },
        {
          id: "canvas-restore",
          target: "canvas-toolbar-restore",
          title: translate("onboarding.tours.canvasOverview.restoreTitle"),
          description: translate("onboarding.tours.canvasOverview.restoreDescription"),
          placement: "bottom",
        },
        {
          id: "canvas-restore-initial",
          target: "canvas-toolbar-restore-initial",
          title: translate("onboarding.tours.canvasOverview.resetTitle"),
          description: translate("onboarding.tours.canvasOverview.resetDescription"),
          placement: "bottom",
        },
        {
          id: "canvas-deploy",
          target: "canvas-toolbar-deploy",
          title: translate("onboarding.tours.canvasOverview.deployTitle"),
          description: translate("onboarding.tours.canvasOverview.deployDescription"),
          placement: "bottom",
        },
        {
          id: "canvas-routes",
          target: "canvas-toolbar-routes",
          title: translate("onboarding.tours.canvasOverview.routesTitle"),
          description: translate("onboarding.tours.canvasOverview.routesDescription"),
          placement: "bottom",
        },
      ],
    },
    "plans-list-overview": {
      id: "plans-list-overview",
      steps: [
        {
          id: "plans-list-header",
          target: "plans-list-header",
          title: translate("onboarding.tours.plansListOverview.headerTitle"),
          description: translate("onboarding.tours.plansListOverview.headerDescription"),
          placement: "bottom",
        },
        {
          id: "plans-list-filters",
          target: "plans-list-filters",
          title: translate("onboarding.tours.plansListOverview.filtersTitle"),
          description: translate("onboarding.tours.plansListOverview.filtersDescription"),
          placement: "bottom",
        },
        {
          id: "plans-list-table",
          target: "plans-list-table",
          title: translate("onboarding.tours.plansListOverview.tableTitle"),
          description: translate("onboarding.tours.plansListOverview.tableDescription"),
          placement: "top",
        },
      ],
    },
    "plan-detail-overview": {
      id: "plan-detail-overview",
      steps: [
        {
          id: "plan-detail-header",
          target: "plan-detail-header",
          title: translate("onboarding.tours.planDetailOverview.headerTitle"),
          description: translate("onboarding.tours.planDetailOverview.headerDescription"),
          placement: "bottom",
        },
        {
          id: "plan-detail-actions",
          target: "plan-detail-actions",
          title: translate("onboarding.tours.planDetailOverview.actionsTitle"),
          description: translate("onboarding.tours.planDetailOverview.actionsDescription"),
          placement: "left",
        },
        {
          id: "plan-detail-tabs",
          target: "plan-detail-tabs",
          title: translate("onboarding.tours.planDetailOverview.tabsTitle"),
          description: translate("onboarding.tours.planDetailOverview.tabsDescription"),
          placement: "bottom",
        },
        {
          id: "plan-detail-summary",
          target: "plan-detail-summary",
          title: translate("onboarding.tours.planDetailOverview.summaryTitle"),
          description: translate("onboarding.tours.planDetailOverview.summaryDescription"),
          placement: "top",
        },
      ],
    },
  };

  return tourRegistry[tourId] || null;
}
