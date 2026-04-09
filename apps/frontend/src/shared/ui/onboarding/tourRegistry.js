export const tourRegistry = {
  "labs-overview": {
    id: "labs-overview",
    steps: [
      {
        id: "labs-header",
        target: "labs-page-header",
        title: "Tus laboratorios viven aquí",
        description:
          "En esta pantalla puedes revisar todos los laboratorios disponibles y entrar al canvas para seguir trabajando.",
        placement: "bottom",
      },
      {
        id: "labs-create-guided",
        target: "labs-create-guided-button",
        title: "Crea un laboratorio guiado",
        description:
          "Esta opción inicia una experiencia más acompañada, útil para usuarios que están aprendiendo el flujo paso a paso.",
        placement: "bottom",
      },
      {
        id: "labs-create",
        target: "labs-create-lab-button",
        title: "Crea un laboratorio nuevo",
        description:
          "Este botón abre el flujo de creación manual para empezar una topología desde cero.",
        placement: "bottom",
      },
      {
        id: "labs-list",
        target: "labs-list-table",
        title: "Explora y abre laboratorios",
        description:
          "Aquí verás la lista, el estado de pertenencia y el acceso rápido para abrir o administrar cada laboratorio.",
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
        title: "Abre las herramientas",
        description:
          "Desde aquí muestras la paleta con los componentes que puedes arrastrar al canvas.",
        placement: "right",
      },
      {
        id: "canvas-drop-area",
        target: "canvas-drop-area",
        title: "Aquí modelas la topología",
        description:
          "Este es el espacio principal del laboratorio. Arrastra nodos, conéctalos y ajusta su configuración.",
        placement: "bottom",
      },
      {
        id: "canvas-guide-toggle",
        target: "canvas-guide-toggle",
        title: "Abre la guía contextual",
        description:
          "Este acceso te muestra ayuda pedagógica y una lectura rápida de lo que estás construyendo.",
        placement: "left",
      },
      {
        id: "canvas-state-summary",
        target: "canvas-state-summary",
        title: "Revisa el estado del canvas",
        description:
          "Esta franja resume si tu canvas está validado, desactualizado o pendiente de acciones antes de desplegar.",
        placement: "bottom",
      },
      {
        id: "canvas-save",
        target: "canvas-toolbar-save",
        title: "Guarda tu progreso",
        description:
          "Usa este botón para persistir el estado actual del canvas y retomarlo después sin perder contexto.",
        placement: "bottom",
      },
      {
        id: "canvas-restore",
        target: "canvas-toolbar-restore",
        title: "Recupera la última versión guardada",
        description:
          "Este botón restaura el canvas desde la última versión persistida en la API.",
        placement: "bottom",
      },
      {
        id: "canvas-restore-initial",
        target: "canvas-toolbar-restore-initial",
        title: "Vuelve al estado inicial",
        description:
          "Úsalo para regresar al estado base de la plantilla cuando quieras reiniciar el modelado.",
        placement: "bottom",
      },
      {
        id: "canvas-deploy",
        target: "canvas-toolbar-deploy",
        title: "Valida o despliega",
        description:
          "Aquí inicias la validación de la topología y, cuando corresponda, el despliegue de infraestructura.",
        placement: "bottom",
      },
      {
        id: "canvas-routes",
        target: "canvas-toolbar-routes",
        title: "Inspecciona el ruteo",
        description:
          "Este botón te permite revisar el plan de ruteo para entender la conectividad sin aplicar cambios.",
        placement: "bottom",
      },
    ],
  },
};

export function getTourDefinition(tourId) {
  return tourRegistry[tourId] || null;
}
