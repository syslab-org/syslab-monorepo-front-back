const es = {
  common: {
    account: "Cuenta",
    language: "Idioma",
    processing: "Procesando...",
    english: "English",
    spanish: "Español",
  },
  actions: {
    back: "Atrás",
    closeSession: "Cerrar sesión",
    finish: "Finalizar",
    next: "Siguiente",
    skip: "Omitir",
  },
  auth: {
    login: {
      title: "Iniciar sesión",
      emailLabel: "Correo electrónico",
      passwordLabel: "Contraseña",
      rememberMe: "Recordarme",
      submit: "Ingresar",
      forgotPassword: "¿Olvidaste tu contraseña?",
      signUpPrompt: "¿No tienes una cuenta? Regístrate",
      defaultError: "No se pudo iniciar sesión.",
      googleError: "No se pudo iniciar sesión con Google.",
    },
    register: {
      title: "Crear cuenta",
      submit: "Registrarse",
      signIn: "Iniciar sesión",
      emailPlaceholder: "Ingresa tu correo",
      passwordPlaceholder: "Define una contraseña",
      expiredLink: "El enlace ha caducado",
      invalidInvitation: "Invitación inválida.",
      validateInvitationError: "No se pudo validar la invitación.",
      success: "Cuenta activada correctamente.",
      defaultError: "No se pudo completar el registro.",
    },
    validation: {
      invalidEmail: "Formato de correo inválido",
      emailRequired: "El correo es obligatorio",
      passwordRequired: "Debes ingresar una contraseña.",
      passwordMin: "La contraseña debe tener al menos 8 caracteres.",
      passwordLatin: "La contraseña solo puede contener letras latinas.",
    },
  },
  layout: {
    cloudOrchestrator: "Orquestador Cloud",
    openDrawer: "Abrir menú",
    themeToDark: "Activar modo oscuro",
    themeToLight: "Activar modo claro",
    menu: {
      profile: "Perfil",
      cloudConnections: "Conexiones cloud",
      keyPairs: "Key pairs",
      dashboard: "Dashboard",
      amis: "AMIs",
    },
  },
  navigation: {
    dashboard: "Dashboard",
    labs: "Laboratorios",
    executions: "Ejecuciones",
    infrastructure: "Infraestructura",
    settings: "Configuración",
    userManagement: "Gestión de usuarios",
    courseManagement: "Gestión de cursos",
  },
  loading: {
    title: "SysLab en progreso",
    description:
      "Estamos guardando el cambio y sincronizando la vista para que no pierdas contexto.",
    messages: {
      login: "Iniciando sesión...",
      register: "Guardando cuenta...",
      logout: "Cerrando sesión...",
      deploy: "Ejecutando despliegue...",
      destroy: "Destruyendo infraestructura...",
      test: "Probando conexión...",
      delete: "Eliminando datos...",
      save: "Guardando cambios...",
      processing: "Procesando...",
    },
  },
  onboarding: {
    waitingTarget:
      "Estamos esperando que el elemento aparezca en pantalla para destacarlo.",
    stepCounter: "Paso {{current}} de {{total}}",
    tours: {
      labsOverview: {
        headerTitle: "Tus laboratorios viven aquí",
        headerDescription:
          "En esta pantalla puedes revisar todos los laboratorios disponibles y entrar al canvas para seguir trabajando.",
        guidedTitle: "Crea un laboratorio guiado",
        guidedDescription:
          "Esta opción inicia una experiencia más acompañada, útil para usuarios que están aprendiendo el flujo paso a paso.",
        createTitle: "Crea un laboratorio nuevo",
        createDescription:
          "Este botón abre el flujo de creación manual para empezar una topología desde cero.",
        listTitle: "Explora y abre laboratorios",
        listDescription:
          "Aquí verás la lista, el estado de pertenencia y el acceso rápido para abrir o administrar cada laboratorio.",
      },
      canvasOverview: {
        toolsTitle: "Abre las herramientas",
        toolsDescription:
          "Desde aquí muestras la paleta con los componentes que puedes arrastrar al canvas.",
        dropAreaTitle: "Aquí modelas la topología",
        dropAreaDescription:
          "Este es el espacio principal del laboratorio. Arrastra nodos, conéctalos y ajusta su configuración.",
        guideTitle: "Abre la guía contextual",
        guideDescription:
          "Este acceso te muestra ayuda pedagógica y una lectura rápida de lo que estás construyendo.",
        stateTitle: "Revisa el estado del canvas",
        stateDescription:
          "Esta franja resume si tu canvas está validado, desactualizado o pendiente de acciones antes de desplegar.",
        saveTitle: "Guarda tu progreso",
        saveDescription:
          "Usa este botón para persistir el estado actual del canvas y retomarlo después sin perder contexto.",
        restoreTitle: "Recupera la última versión guardada",
        restoreDescription:
          "Este botón restaura el canvas desde la última versión persistida en la API.",
        resetTitle: "Vuelve al estado inicial",
        resetDescription:
          "Úsalo para regresar al estado base de la plantilla cuando quieras reiniciar el modelado.",
        deployTitle: "Valida o despliega",
        deployDescription:
          "Aquí inicias la validación de la topología y, cuando corresponda, el despliegue de infraestructura.",
        routesTitle: "Inspecciona el ruteo",
        routesDescription:
          "Este botón te permite revisar el plan de ruteo para entender la conectividad sin aplicar cambios.",
      },
      plansListOverview: {
        headerTitle: "Aquí revisas las ejecuciones",
        headerDescription:
          "Esta pantalla concentra los planes simulados y reales para que puedas seguir el historial operativo sin entrar aún al detalle.",
        filtersTitle: "Filtra y busca planes",
        filtersDescription:
          "Usa estos controles para encontrar un plan por nombre, estado, canvas o laboratorio asociado.",
        tableTitle: "Compara el estado de cada plan",
        tableDescription:
          "Aquí ves quién es el owner, el estado técnico, el lifecycle lógico y el acceso rápido al detalle o a otras acciones.",
      },
      planDetailOverview: {
        headerTitle: "Este es el estado general del plan",
        headerDescription:
          "Aquí puedes leer el resultado actual, el lifecycle operativo y volver al listado o al canvas asociado.",
        actionsTitle: "Desde aquí ejecutas acciones",
        actionsDescription:
          "Puedes alternar entre preview y apply real, desplegar cambios o destruir infraestructura cuando el plan lo permita.",
        tabsTitle: "Explora la información del plan por secciones",
        tabsDescription:
          "Estas pestañas separan resumen, outputs, pruebas, logs y payload para que la lectura técnica sea más ordenada.",
        summaryTitle: "Resumen operativo y pedagógico",
        summaryDescription:
          "En esta sección ves el estado, la próxima ejecución real, la reconciliación cloud y el historial reciente del plan.",
      },
    },
  },
};

export default es;
