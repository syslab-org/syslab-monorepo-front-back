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
  "plans-list-overview": {
    id: "plans-list-overview",
    steps: [
      {
        id: "plans-list-header",
        target: "plans-list-header",
        title: "Aquí revisas las ejecuciones",
        description:
          "Esta pantalla concentra los planes simulados y reales para que puedas seguir el historial operativo sin entrar aún al detalle.",
        placement: "bottom",
      },
      {
        id: "plans-list-filters",
        target: "plans-list-filters",
        title: "Filtra y busca planes",
        description:
          "Usa estos controles para encontrar un plan por nombre, estado, canvas o laboratorio asociado.",
        placement: "bottom",
      },
      {
        id: "plans-list-table",
        target: "plans-list-table",
        title: "Compara el estado de cada plan",
        description:
          "Aquí ves quién es el owner, el estado técnico, el lifecycle lógico y el acceso rápido al detalle o a otras acciones.",
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
        title: "Este es el estado general del plan",
        description:
          "Aquí puedes leer el resultado actual, el lifecycle operativo y volver al listado o al canvas asociado.",
        placement: "bottom",
      },
      {
        id: "plan-detail-actions",
        target: "plan-detail-actions",
        title: "Desde aquí ejecutas acciones",
        description:
          "Puedes alternar entre preview y apply real, desplegar cambios o destruir infraestructura cuando el plan lo permita.",
        placement: "left",
      },
      {
        id: "plan-detail-tabs",
        target: "plan-detail-tabs",
        title: "Explora la información del plan por secciones",
        description:
          "Estas pestañas separan resumen, outputs, pruebas, logs y payload para que la lectura técnica sea más ordenada.",
        placement: "bottom",
      },
      {
        id: "plan-detail-summary",
        target: "plan-detail-summary",
        title: "Resumen operativo y pedagógico",
        description:
          "En esta sección ves el estado, la próxima ejecución real, la reconciliación cloud y el historial reciente del plan.",
        placement: "top",
      },
    ],
  },
};

export function getTourDefinition(tourId) {
  return tourRegistry[tourId] || null;
}
