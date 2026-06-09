const es = {
  common: {
    account: "Cuenta",
    language: "Idioma",
    processing: "Procesando...",
    english: "English",
    spanish: "Español",
    all: "Todos",
    noCourse: "Sin curso",
    optional: "Opcional",
    auto: "Auto",
  },
  actions: {
    back: "Atrás",
    closeSession: "Cerrar sesión",
    finish: "Finalizar",
    next: "Siguiente",
    skip: "Omitir",
    activate: "Activar",
    assignStudent: "Asignar alumno",
    cancel: "Cancelar",
    clearFilters: "Limpiar filtros",
    close: "Cerrar",
    copyLink: "Copiar enlace",
    create: "Crear",
    createInvitation: "Crear invitación",
    createCourse: "Crear curso",
    delete: "Eliminar",
    deactivate: "Desactivar",
    duplicate: "Duplicar",
    edit: "Editar",
    open: "Abrir",
    remove: "Remover",
    save: "Guardar",
    saveChanges: "Guardar cambios",
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
  labels: {
    active: "Activo",
    adminPrimary: "Admin principal",
    course: "Curso",
    deactivated: "Desactivado",
    pending: "Pendiente",
    role: "Rol",
    state: "Estado",
    student: "Alumno",
    teacher: "Profesor",
    user: "Usuario",
    email: "Correo",
    code: "Código",
    name: "Nombre",
    lastName: "Apellido",
    search: "Buscar",
    mode: "Modo",
    owner: "Owner",
    visibility: "Visibilidad",
    updated: "Actualizado",
    actions: "Acciones",
  },
  inviteUser: {
    editTitle: "Editar usuario",
    inviteTitle: "Invitar usuario",
    editInfo: "Actualiza rol, estado, nombre y curso desde este panel.",
    inviteInfo:
      "La invitación crea el acceso pendiente. La persona definirá su contraseña desde el enlace de registro.",
    emailPlaceholder: "usuario@dominio.com",
    firstNamePlaceholder: "Nombre",
    lastNamePlaceholder: "Apellido",
    roleHelper: "Define el tipo de acceso para esta cuenta.",
    roleRequired: "El rol es obligatorio",
    statusHelper: "Pendiente deja la cuenta lista para aprobación o registro.",
    statusRequired: "El estado es obligatorio",
    assignLater: "Asignar más tarde",
    courseHelper:
      "Opcional. Puedes asignarlo o moverlo después desde Gestión de cursos.",
    firstNameTooLong: "El nombre es demasiado largo",
    lastNameTooLong: "El apellido es demasiado largo",
  },
  settings: {
    users: {
      title: "Gestión de Usuarios",
      subtitle:
        "Invita usuarios, activa accesos y ajusta rol o curso según el flujo académico del laboratorio.",
      inviteCreated: "Invitación creada para {{email}}.",
      inviteLinkPrefix: "Enlace:",
      inviteNoCourseWarning:
        "Este alumno quedó sin curso, así que ningún profesor lo verá hasta asignarlo desde Gestión de cursos.",
      infoBanner:
        "Usa esta vista para aprobar accesos, reasignar alumnos a sus cursos y actualizar el rol de cada cuenta.",
      searchLabel: "Buscar usuario",
      searchPlaceholder: "Correo o nombre",
      noAdditionalName: "Sin nombre adicional",
      noVisibleUsers: "Todavía no hay usuarios visibles para esta cuenta.",
      showing: "Mostrando {{filtered}} de {{total}} usuarios.",
      usersGroup: "Usuarios",
      managementGroup: "Gestión",
      copyInviteError: "No se pudo copiar el enlace de invitación.",
      createUserError: "No se pudo crear el usuario.",
      updateUserError: "No se pudo actualizar el usuario.",
      columns: {
        user: "Usuario",
        email: "Correo",
        role: "Rol",
        status: "Estado",
        course: "Curso",
        actions: "Acciones",
      },
      filters: {
        role: "Rol",
        status: "Estado",
        course: "Curso",
      },
    },
    courses: {
      title: "Gestión de Cursos",
      subtitle:
        "Administra cursos, profesores responsables y asignación de alumnos según el modelo académico del laboratorio.",
      editTitle: "Editar curso",
      createTitle: "Crear curso",
      teacher: "Profesor",
      noReassign: "Sin reasignar",
      activeCourse: "Curso activo",
      loadError: "No se pudieron cargar los cursos.",
      missingName: "Debes indicar un nombre para el curso.",
      saveError: "No se pudo guardar el curso.",
      selectCourseAndStudent: "Selecciona un curso y un alumno.",
      enrollError: "No se pudo asignar el alumno al curso.",
      removeError: "No se pudo remover el alumno del curso.",
      students: "Alumnos",
      inactive: "Inactivo",
      rosterTitle: "Roster del curso",
      noVisibleTeacher: "Sin profesor visible",
      rosterHelp:
        "Aquí puedes asignar alumnos sin curso o mover alumnos desde otros cursos hacia este roster.",
      availableStudent: "Alumno disponible para asignar",
      noAvailableStudents:
        "No hay alumnos sin curso ni alumnos de otros cursos para mover",
      noStudentsAssigned: "Este curso todavía no tiene alumnos asignados.",
      noCourses: "Aún no hay cursos disponibles para gestionar.",
      studentLabel: "Alumno",
      actionLabel: "Acción",
    },
  },
  labs: {
    title: "Laboratorios",
    subtitle:
      "Gestiona tus laboratorios y abre el canvas para editar topologías, validar intención y preparar despliegues.",
    createGuided: "Crear guiado",
    createLab: "Crear laboratorio",
    searchPlaceholder: "Por nombre o id…",
    guided: "Guiados",
    advanced: "Avanzados",
    execution: "Ejecución",
    ownership: "Pertenencia",
    openLab: "Abrir laboratorio",
    labActions: "Acciones del laboratorio",
    guidedChip: "Guiado",
    noOwner: "Sin owner",
    coursePrefix: "Curso: {{value}}",
    visibilityPrefix: "Visibilidad: {{value}}",
    unresolvedConnection: "Sin conexión resuelta",
    awsAccountPrefix: "Cuenta AWS: {{value}}",
    duplicateError: "No se pudo duplicar el laboratorio.",
    deleteError: "No se pudo eliminar. Revisa consola.",
    updateError: "No se pudo actualizar el laboratorio.",
    defaultLabName: "Laboratorio",
    copySuffix: "copia",
    deleteTitle: "Eliminar laboratorio",
    deleteConfirm: "¿Seguro que quieres eliminar {{name}}?",
    editTitle: "Editar laboratorio",
    parentCidr: "CIDR padre",
    cidrPlaceholder: "10.64.0.0/12",
    cidrHelp: "Formato CIDR. Este es el rango padre del laboratorio.",
    region: "Región",
    cloudConnection: "Conexión cloud",
    autoSelectOwnerCourse: "Auto-seleccionar por owner/curso",
    connectionScopeCourse: "curso",
    connectionScopePersonal: "personal",
    notesLabel: "Descripción, observaciones o notas",
    notesHelp:
      "Opcional. Sirve para documentar el objetivo del laboratorio o dejar notas operativas.",
    tourLabel: "Ver tour de laboratorios",
    cidrErrors: {
      format: "Usa formato CIDR, ej: 10.0.0.0/16",
      prefix: "Prefijo inválido (esperado /8 a /30)",
    },
    executionSourceLabels: {
      lab_explicit: "Fijada en el lab",
      owner_personal_auto: "Auto -> cuenta personal",
      course_shared_auto: "Auto -> cuenta del curso",
      environment: "Credenciales del servidor",
      unresolved: "Sin resolver",
    },
  },
  plans: {
    status: {
      success: "SUCCESS",
      failure: "FAILURE",
      running: "RUNNING",
      pending: "PENDING",
      loading: "Cargando…",
      notFound: "Plan no encontrado.",
    },
    list: {
      title: "Ejecuciones de infraestructura",
      subtitle:
        "Lista de ejecuciones, tanto simuladas como reales. Usa Outputs para depurar sin ir a la consola de AWS.",
      refresh: "Refrescar",
      refreshing: "Actualizando…",
      searchPlaceholder: "Por nombre o plan_id…",
      statusFilter: "Estado",
      columns: {
        plan: "Plan",
        ownership: "Pertenece a",
        status: "Estado",
        updated: "Actualizado",
        actions: "Acciones",
      },
      empty: "No hay planes para mostrar.",
      loadingError: "Error cargando planes",
      destroyConfirm:
        "¿Destruir \"{{label}}\"? Esto eliminará recursos en AWS asociados a este plan.\n\nSugerencia: valida primero los Outputs.",
      destroyError: "Error al destruir el plan",
      ownerUnavailable: "Owner no disponible",
      noLab: "Sin laboratorio",
      noCourse: "Sin curso",
      lastAction: "Última acción: {{value}}",
      visibility: "Visibilidad: {{value}}",
      canvasPrefix: "canvas: {{value}}",
      outputs: "Outputs",
      destroy: "Destroy",
      detail: "Ver detalle",
      actionMenu: "Acciones",
      resultTooltip: "Resultado del job de Terraform",
      lifecycleTooltip: "Estado lógico actual del plan",
      modeTooltip: "Simulada (plan) o ejecución real en AWS",
      destroyNote:
        "Nota: el botón Destroy se habilita solo cuando el plan es destruible, pero el backend vuelve a validar la regla.",
      tourLabel: "Ver tour de planes",
      mode: {
        preview: "PREVIEW",
        real: "REAL",
        simulated: "SIMULATED",
      },
      lifecycle: {
        preview: "PREVIEW",
        destroyed: "DESTROYED",
        active: "ACTIVE",
        created: "CREATED",
      },
    },
    detail: {
      back: "Volver",
      goToCanvas: "Ir al canvas",
      loading: "Cargando plan…",
      runningConflict:
        "Plan en ejecución. Espera a que termine antes de lanzar otra acción.",
      cloudMismatchApply:
        "La conexión cloud actual ya no coincide con la usada en el último APPLY real. Revisa la cuenta actual antes de ejecutar infraestructura real.",
      realExecutionForbidden:
        "El APPLY real y el Destroy solo están permitidos al owner, al platform admin o al docente cuando la conexión efectiva del laboratorio es course_shared. Puedes seguir usando PLAN para revisión.",
      deployStarted: "Deploy {{mode}} iniciado.{{task}} (actualizando estado…)",
      deployFailed: "Fallo al iniciar deploy: {{error}}",
      finishedStatus: "Terminó: {{status}}{{error}}",
      outputsLoadError: "No pude cargar outputs: {{error}}",
      logReadError: "No se pudo leer el log: {{error}}",
      logsLoadError: "No pude cargar logs: {{error}}",
      noRealExecutionPermission:
        "No tienes permiso para ejecutar infraestructura real en este laboratorio.",
      cloudMismatchDestroy:
        "La conexión cloud actual ya no coincide con la usada en el último APPLY real. Destroy real se bloquea para evitar operar en una cuenta equivocada.",
      destroyConfirm:
        "Esto destruirá los recursos en AWS asociados a ESTE plan.\n\n¿Continuar?",
      destroyQueued: "Destroy encolado{{task}}. Revisa Logs para ver el progreso.",
      destroyFailed: "Fallo al iniciar destroy: {{error}}",
      noDestroyPermission:
        "No tienes permiso para destruir infraestructura real en este laboratorio.",
      redeployApply: "Redeploy (APPLY)",
      redeployPlan: "Redeploy (PLAN)",
      deployApply: "Deploy (APPLY)",
      deployPlan: "Deploy (PLAN)",
      applyMode: "Modo APPLY (real)",
      planMode: "Modo PLAN (preview)",
      launching: "Lanzando…",
      destroying: "Destruyendo…",
      canvasUpdatedAlert:
        "Plan actualizado desde canvas. Hay cambios pendientes; ejecuta Deploy para aplicar la nueva infraestructura.",
      cloudMismatchAlert:
        "La conexión cloud actual ya no coincide con la usada en el último APPLY real.",
      executionControl: "Control de ejecución",
      updated: "Actualizado",
      currentTask: "Task actual",
      canvasChanged:
        "El canvas cambió: la infraestructura desplegada (si existía) ya no coincide con este plan.",
      activeAutoRefresh: "Actualización automática activa",
      taskLabel: "Task: {{value}}",
      lastActionLabel: "Última acción: {{value}}",
      controlTitle: "Control de ejecución",
      labNotes: "Notas del laboratorio",
      lifecycleHelper: {
        destroying: "Destroy en ejecución: eliminando infraestructura en AWS.",
        deploying: "Deploy en ejecución: aplicando cambios en AWS.",
        activePreview:
          "Infraestructura activa en AWS. El último plan fue una previsualización sobre el stack existente; el próximo apply actualizará recursos en el mismo despliegue.",
        active: "Infraestructura activa en AWS.",
        destroyed: "Infraestructura eliminada en AWS.",
        preview: "Simulado: nunca se aplicó en AWS.",
        recovery:
          "El apply real falló. Puede haber recursos parciales en AWS: ejecuta Destroy antes de reintentar.",
        notAppliedCanvas:
          "Cambios detectados desde el canvas: listo para aplicar en AWS.",
        notApplied: "Plan real aún no aplicado.",
      },
      runningPhase: {
        applyTitle: "Aplicando cambios en AWS",
        applyDescription:
          "Terraform está ejecutando el apply real sobre la infraestructura. Los recursos pueden tardar unos minutos en completarse y esta vista se actualizará automáticamente.",
        applyNext:
          "Si quieres detalle técnico, abre la pestaña Logs y sigue el progreso del apply.",
        destroyTitle: "Eliminando infraestructura en AWS",
        destroyDescription:
          "El destroy está desmontando el stack actual. Durante esta fase bloqueamos nuevas acciones para evitar estados inconsistentes.",
        destroyNext:
          "Cuando termine, revisa Outputs y Logs para confirmar que no quedaron recursos activos.",
        planTitle: "Generando previsualización del plan",
        planDescription:
          "Terraform está calculando el impacto del cambio antes de aplicar nada en AWS. En cuanto termine, podrás revisar el resumen de riesgo.",
        planNext:
          "Espera a que aparezca SUCCESS o FAILURE antes de lanzar otra acción.",
        genericTitle: "Procesando solicitud",
        genericDeployTitle: "Procesando ejecución del plan",
        genericDescription:
          "Hay una operación en curso sobre este plan y la página está haciendo polling automático para reflejar el resultado en cuanto esté disponible.",
        genericNext:
          "Mientras tanto, evita cerrar el flujo o lanzar acciones paralelas sobre el mismo plan.",
      },
      hero: {
        activeTitle: "Infraestructura activa en AWS",
        activeDescription:
          "El stack está desplegado y listo para seguir validando, actualizarse con un redeploy o destruirse cuando quieras limpiar el laboratorio.",
        destroyedTitle: "Infraestructura eliminada",
        destroyedDescription:
          "El último destroy terminó correctamente. Este plan queda como historial operativo y puedes volver a lanzar un deploy real cuando lo necesites.",
        previewTitle: "Plan listo para validación",
        previewDescription:
          "Todavía no hay infraestructura real en AWS. Puedes seguir revisando el preview o convertirlo en un APPLY real cuando estés conforme.",
        recoveryTitle: "Recuperación recomendada",
        recoveryDescription:
          "El apply real falló y podría haber recursos parciales. La siguiente acción recomendada es limpiar el stack antes de reintentar.",
        firstDeployTitle: "Listo para primer deploy",
        firstDeployDescription:
          "El plan está preparado pero aún no ha sido aplicado en AWS. Puedes lanzar un preview o el primer APPLY real según el caso.",
        defaultTitle: "Estado operativo del plan",
      },
      actionAvailability: {
        running:
          "Hay una ejecución en curso. Espera a que termine para lanzar otra acción.",
        applyForbidden:
          "Este plan es visible para revisión. El APPLY real y el Destroy solo están permitidos al owner, al platform admin o al docente cuando la conexión efectiva es course_shared.",
        activeInfra:
          "Infraestructura activa: puedes revalidar, redeployar sobre el mismo stack o destruirlo.",
        firstDeploy:
          "Plan listo para su primer deploy. Destroy no aplica todavía porque no hay infraestructura activa.",
        preview:
          "Plan en modo preview: puedes seguir validando o lanzar el primer deploy real.",
        recoverable:
          "Hay recursos o estado recuperable: destroy está disponible para limpiar el stack.",
      },
      tabs: {
        summary: "Resumen",
        outputs: "Outputs",
        tests: "Pruebas",
        logs: "Logs",
        payload: "Payload",
      },
      summary: {
        sectionTitle: "Estado del plan",
        sectionSubtitle:
          "Lectura rápida del resultado reciente y del estado operativo actual.",
        intro:
          "Este detalle sirve para entender qué pasó (status), qué existe hoy (lifecycle) y qué acciones son válidas (deploy/destroy).",
        introCaption:
          "El estado indica la última ejecución; el lifecycle indica qué existe hoy en AWS.",
        lastExecution: "Última ejecución",
        result: "Resultado:",
        date: "Fecha:",
        nextRealExecution: "Próxima ejecución real",
        executionResolvedNoIdentity:
          "La conexión está resuelta, pero aún no tenemos identidad STS visible. Usa “Probar” en Cloud Connections para registrar cuenta y ARN.",
        cloudAccountReconciliation: "Reconciliación de cuenta cloud",
        cloudAccountNoInfo:
          "Sin información suficiente para reconciliar la cuenta cloud.",
        lastApplyEvidence: "Evidencia del último APPLY real",
        noRealSnapshot:
          "Aún no hay snapshot de ejecución real guardado para este plan. Aparecerá después del primer APPLY real.",
        recentHistory: "Historial reciente de ejecuciones",
        noHistory: "Aún no hay ejecuciones registradas para este plan.",
        riskTitle: "Riesgo del último plan",
        loadLogsHint:
          "Carga la pestaña de logs para resumir qué detectó Terraform en el último plan.",
        riskDestructive:
          "Se detectaron cambios con destrucción o reemplazo de recursos.",
        riskCaution: "Se detectaron cambios sobre recursos existentes.",
        riskSafe: "Se detectaron cambios aditivos.",
        riskNone: "No se detectaron cambios en el último plan.",
        advisoryTitle: "Costo, residuos y lectura técnica",
        advisoryCaption:
          "Este bloque se calcula desde el payload, los outputs cargados y el estado actual del plan.",
        advisoryCost: "1. Costo potencial",
        advisoryResidual: "2. Qué puede quedar tras Destroy",
        advisoryPedagogy: "3. Lectura pedagógica y técnica",
        advisoriesText: {
          realApply:
            "Este plan usa APPLY real o quedó parcialmente aplicado: puede generar costo monetario en AWS mientras existan recursos activos.",
          preview:
            "En modo PLAN/preview no se crean recursos reales, por lo que este plan no debería generar costo directo en AWS.",
          destroyed:
            "El stack principal figura destruido. Si no dejaste recursos externos o residuales, este plan ya no debería seguir generando costo principal.",
          instances:
            "{{count}} instancia(s) EC2 declarada(s): generan costo de compute y, normalmente, de almacenamiento mientras existan.",
          nat:
            "{{count}} NAT Gateway(s): AWS cobra por hora aprovisionada y por tráfico procesado mientras estén activos.",
          publicIpv4:
            "{{count}} IPv4 pública(s) en uso según outputs: AWS cobra las IPv4 públicas en uso.",
          tgw:
            "{{routers}} TGW router(s) y {{attachments}} attachment(s): Transit Gateway agrega cobro por attachment/hora y por tráfico procesado.",
          peering:
            "{{count}} peering link(s): crear el peering no agrega cargo fijo, pero el tráfico por peering puede generar cobros según el patrón de transferencia.",
          vpcBase:
            "La VPC en sí no tiene cargo adicional por existir, pero algunos componentes asociados sí lo tienen.",
          providedEips:
            "{{count}} EIP(s) fue/fueron aportada(s) manualmente al NAT. Destroy no las libera por seguridad; pueden seguir generando cobro por IPv4 pública mientras permanezcan reservadas en tu cuenta.",
          autoEip:
            "Si el NAT usó una EIP autogenerada por el stack, Destroy intenta eliminar tanto el NAT como esa EIP. Si aún ves una Elastic IP, revisa si pertenece a otro recurso o a un deploy previo.",
          outputsHistorical:
            "Los outputs guardados en esta página son históricos para auditoría/debug. No son recursos vivos en AWS y no generan costo por sí mismos.",
          dhcpDefault:
            "AWS mantiene un DHCP option set por defecto por región. Este proyecto no crea uno dedicado, así que verlo en consola no implica que el destroy haya dejado un residuo de este stack.",
          failedApply:
            "Si un APPLY real falla, puede quedar infraestructura parcial. En ese estado debes ejecutar Destroy y revisar logs antes de volver a aplicar.",
          natPrivate:
            "Pedagógicamente, este laboratorio separa salida y exposición: NAT permite salida desde subnets privadas, pero no acceso entrante desde Internet.",
          publicPrivateMix:
            "Tienes {{publicCount}} subnet(s) pública(s) y {{privateCount}} privada(s): es un buen caso para observar bastion pública + workload privada.",
          fixedEip:
            "Usar una EIP propia fija la identidad de salida del NAT, pero también deja su ciclo de vida bajo responsabilidad del operador.",
          peeringLearning:
            "El peering enseña conectividad punto a punto: necesitas rutas explícitas de ida y vuelta para obtener comunicación completa.",
          tgwLearning:
            "Transit Gateway enseña un modelo hub-and-spoke: simplifica topologías multipunto, pero añade costo y una capa adicional de routing.",
          noInstances:
            "Sin instancias, este plan sirve para estudiar topología y rutas, pero no para validar conectividad extremo a extremo dentro del laboratorio.",
        },
        requestedBy: "Solicitado por:",
        connection: "Conexión:",
        identity: "Identidad:",
        start: "Inicio:",
        end: "Fin:",
        provider: "Provider: {{value}}",
        source: "Source: {{value}}",
        region: "Region: {{value}}",
        scope: "Scope: {{value}}",
        effectiveConnection: "Conexión efectiva:",
        plannedAwsAccount: "Cuenta AWS prevista:",
        knownArn: "ARN conocido:",
        usedConnection: "Conexión usada:",
        awsAccount: "Cuenta AWS:",
        arn: "ARN:",
        stsUserId: "UserId STS:",
        capturedAt: "Capturado:",
        auditIdentityError:
          "No se pudo resolver STS al capturar la auditoría: {{error}}",
        envCredentials: "Credenciales del entorno",
      },
      outputs: {
        title: "Outputs",
        subtitle:
          "Resumen pensado para entender rápido qué quedó creado en AWS sin perderte en demasiados IDs.",
        infoAws: "Info AWS",
        awsInfoIntro:
          "Esta vista resume la traducción del canvas a recursos reales en AWS. Los códigos como `vpc-...`, `igw-...`, `tgw-...` y `tgw-attach-...` son IDs reales creados por AWS.",
        loadOutputs: "Cargar outputs",
        loadingOutputs: "Cargando…",
        notLoaded:
          "Aún no se han cargado outputs. Haz clic en “Cargar outputs”.",
        empty:
          "El backend respondió correctamente, pero no hay outputs guardados para este plan.",
        fullJsonTitle: "JSON completo",
        jsonCaption:
          "Solo si necesitas inspeccionar todos los outputs crudos del backend.",
        showJson: "Ver JSON completo",
        hideJson: "Ocultar JSON",
        connectivitySummary: "Resumen de conectividad",
        connectivityCaption:
          "Primero mira estas tres tarjetas. Si necesitas depurar algo puntual, baja luego a los IDs por VPC o TGW.",
        model: "Modelo",
        modeLabels: {
          isolated: "Aislado",
          peering: "Peering",
          transitGateway: "Transit Gateway",
        },
        modeDescriptions: {
          isolated:
            "No hay conectividad cruzada activa entre segmentos; cada VPC funciona de forma aislada.",
          peering:
            "Las VPC se comunican por enlaces directos entre pares. Peerings activos: {{count}}.",
          transitGateway:
            "El laboratorio usa un hub central en AWS para enrutar tráfico entre segmentos. TGW activos: {{count}}.",
        },
        expectedConnectivity: "Conectividad esperada",
        awsTranslation: "Traducción AWS",
        connectedPairs: "{{count}} par(es) conectados",
        activePeerings: "Peerings activos: {{count}}",
        activeTgw: "TGW activos: {{count}}",
        attachments: "{{count}} attachment(s) TGW",
        declaredPeeringsTgw:
          "Declarados: peerings {{peerings}}, TGW {{tgw}}.",
        vpcInfra: "Infraestructura destacada por VPC",
        vpcInfraCaption:
          "Aquí ves solo los identificadores más útiles de cada segmento en AWS.",
        instancesDetected: "Instancias detectadas",
        privateIp: "Privada: {{value}}",
        publicIp: "Pública: {{value}}",
        transitGatewayInfra: "Infraestructura Transit Gateway",
        transitGatewayCaption:
          "Este bloque solo aparece si el laboratorio usa un hub central de AWS Transit Gateway.",
        logicalRouter: "Router lógico: {{value}}",
        attachment: "Attachment",
        awsGuideConnectivity: {
          mode:
            "Modo declarado: el modelo de conectividad que el canvas está pidiendo. Puede ser Aislado, Peering o Transit Gateway.",
          expectedPairs:
            "Pares conectados esperados: cuántos pares de segmentos deberían poder comunicarse según el payload y las rutas definidas.",
          peerings:
            "Peerings activos: cantidad de conexiones VPC Peering realmente creadas en AWS.",
          tgws:
            "TGW activos: cantidad de Transit Gateways realmente creados en AWS.",
          attachments:
            "Attachments TGW: uniones entre una VPC y el Transit Gateway. Sin attachment, la VPC no entra al hub.",
        },
        awsGuideVpc: {
          vpc: "VPC: red virtual principal del segmento en AWS.",
          igw:
            "IGW: Internet Gateway. Permite salida/entrada a internet para subredes públicas con rutas adecuadas.",
          nat:
            "NAT: NAT Gateway. Permite que subredes privadas salgan a internet sin volverse públicas.",
          natEip: "NAT EIP: Elastic IP asociada al NAT Gateway.",
        },
        awsGuideTgw: {
          logicalRouter:
            "Router lógico: identificador del nodo del canvas. Sirve para relacionar el diseño con los recursos AWS.",
          tgw: "TGW: Transit Gateway de AWS. Actúa como hub central de conectividad.",
          routeTable: "TGW RT: tabla de rutas interna del Transit Gateway.",
          attachment: "Attachment: conexión física/lógica entre una VPC y el TGW.",
        },
        backendStatus: "backend_status: {{value}}",
        appliedTrue: "APPLIED: true",
        appliedFalse: "APPLIED: false",
      },
      tests: {
        title: "Guía de pruebas post-deploy",
        subtitle:
          "Define pruebas de conectividad entre VPCs, validaciones guiadas para una VPC con NAT o comprobaciones básicas de acceso directo a una bastion pública.",
        loadOutputs: "Cargar outputs para pruebas",
        consoleGuide: "Cómo probar en consola",
        introAlert:
          "Abre el modal de instrucciones para ver el paso a paso por consola: cómo entrar por SSH a una bastion pública y luego cómo ejecutar los comandos sugeridos, ya sea entre VPCs, dentro de una VPC con NAT o en un laboratorio single-VPC con exposición pública directa.",
        needOutputs:
          "Carga outputs para identificar instancias/IPs reales y ejecutar pruebas guiadas.",
        empty:
          "Este plan no expone pares de VPC conectados por peering/TGW, un caso single-VPC con NAT ni una bastion pública con salida directa que podamos guiar desde aquí.",
        modeLabels: {
          none: "Sin modo",
          mixed: "Mixto",
          peering: "Peering",
          transitGateway: "Transit Gateway",
        },
        routersInvolved: "Routers implicados: {{value}}",
        insufficientRoundTrip:
          "No hay suficientes outputs de instancias para generar prueba ida/vuelta en este par.",
        forwardCheckTitle: "Prueba ida ({{from}} -> {{to}})",
        returnCheckTitle: "Prueba retorno ({{from}} -> {{to}})",
        runInsidePublic: "Ejecutar dentro de {{name}} ({{value}})",
        runInsideInstance: "Ejecutar dentro de {{name}} ({{value}})",
        runInsidePublicVpc:
          "Ejecutar dentro de {{name}} ({{value}}) para validar alcance privado dentro de la VPC",
        bastionToWorkloadTitle: "Desde {{bastion}} hacia {{workload}}",
        confirmSshTitle: "Confirmar acceso SSH a {{name}}",
        confirmSshContext:
          "Úsalo para verificar que la instancia pública quedó accesible. Si la key pair fue generada por AWS, tu clave privada suele ser un `.pem`; si importaste una public key, usa la clave privada local correspondiente.",
        publicSshContext:
          "Úsalo para validar que la instancia pública quedó expuesta correctamente y que tu IP está permitida en Allowed SSH CIDR. AWS solo recibe el nombre de la key pair ({{keyPair}}); aquí debes usar la clave privada real que tengas en tu computador.",
        managedEgressTitle: "{{name}} · salida privada con NAT",
        managedEgressNoPrivateTitle: "{{name}} · NAT sin zonas privadas",
        singleVpc: "Single VPC",
        managedEgress: "Managed egress",
        natZone: "NAT en zona pública: {{subnet}} · NAT ID: {{natId}}",
        missingManagedOutputs:
          "Faltan outputs de bastion o workload privada para generar el comando sugerido.",
        observeBastionAndPrivate:
          "Qué observar: la bastion pública debería tener IP pública y la workload privada no.",
        observeBastionPublic:
          "Qué observar: la bastion pública debería tener IP pública.",
        observePrivateReachability:
          "Qué observar: la bastion debe alcanzar la IP privada de la workload dentro de la misma VPC.",
        observeNatBehavior:
          "Qué observar: el NAT da salida a la subnet privada, pero no vuelve pública a la workload.",
        observeNatNoPrivate:
          "Qué observar: el NAT fue creado correctamente, pero en este diseño no hay subnets privadas que lo aprovechen.",
        observeCostBenefit:
          "Qué observar: este caso sirve para enseñar costo/beneficio. El segmento sigue funcionando, pero el NAT aquí agrega complejidad sin aportar aislamiento privado.",
        publicAccessTitle: "{{name}} · acceso público directo",
        publicBastion: "Public bastion",
        bastionPublicIp: "Bastion: {{name}} · IP pública: {{value}}",
        observePublicSsh:
          "Qué observar: la bastion debería aceptar SSH solo desde el rango definido en `Allowed SSH CIDR`.",
        observePublicExposure:
          "Qué observar: este diseño expone una instancia directamente a Internet. Es útil para una prueba rápida, pero ofrece menos aislamiento que un patrón con workload privada.",
        expectedResult:
          "Resultado esperado: cada par conectado debe responder ping en ida y retorno; en un caso single-VPC con NAT, la bastion debe alcanzar la workload privada y esta última debe permanecer sin IP pública. En un caso con bastion pública directa, la validación mínima es confirmar acceso SSH y entender que el aislamiento es menor que en un patrón con subnet privada.",
      },
      logs: {
        title: "Logs del plan",
        subtitle:
          "El log corresponde siempre a la última ejecución, sea deploy o destroy.",
        streaming: "Streaming activo",
        viewLog: "Ver log del plan",
        empty:
          "Haz clic en “Ver log del plan” para mostrar el log de la última ejecución.",
        currentLog: "Este log corresponde a la última ejecución del plan.",
        updatedAt: "Última actualización del log:",
        autoScroll:
          "El visor baja automáticamente al final mientras la ejecución sigue activa.",
        terraformSummary:
          "Resumen Terraform: {{add}} add, {{change}} change, {{destroy}} destroy, {{replace}} replace.",
        newLines: "Se resaltan las líneas nuevas recién agregadas al log.",
      },
      payload: {
        title: "Payload",
      },
      guide: {
        awsTitle: "Guía rápida de infraestructura AWS",
        close: "Cerrar",
        consoleTitle: "Cómo probar conectividad desde consola",
        consoleIntro:
          "Primero entra por SSH a una bastion pública. Después, desde esa instancia, ejecuta los comandos sugeridos en esta misma pestaña para validar conectividad cruzada entre VPCs o alcance privado dentro de una VPC con NAT.",
        step1: "1. Requisitos previos",
        step1Text:
          "Necesitas aws CLI, acceso a la clave privada asociada a la key pair con la que desplegaste la instancia y que tu IP pública esté permitida en Allowed SSH CIDR.",
        step2: "2. Bastions detectadas en este laboratorio",
        step3: "3. Si ya tienes la clave privada correspondiente, conéctate por SSH",
        step3Text:
          "Si AWS generó la key pair, normalmente usarás un archivo .pem. Si importaste una public key desde tu computador, usa la clave privada local asociada, aunque no tenga extensión .pem.",
        step4: "4. Si no tienes la llave privada, usa EC2 Instance Connect",
        step4Text:
          "AWS no permite descargar la private key de una key pair existente. En ese caso, puedes inyectar una clave pública temporal y entrar con una llave efímera.",
        step5: "5. Ejecuta las comprobaciones desde la bastion",
        instanceLabel: "Instancia: {{name}} · instance_id: {{value}}",
        publicPrivateIp:
          "IP pública: {{publicIp}} · IP privada: {{privateIp}}",
        regionAzKeyPair: "Región/AZ: {{region}} / {{az}} · Key pair: {{keyPair}}",
        consoleExpected:
          "Resultado esperado: cada par conectado debería responder ping en ida y retorno. En un laboratorio con NAT, la bastion debe alcanzar la workload privada y esta no debería tener IP pública. Si el laboratorio solo tiene zona pública, la comprobación útil es confirmar acceso a la bastion y entender que el NAT quedó desplegado pero no está aportando salida a una subnet privada. Si algo falla, revisa route tables, Security Groups, key pair y Allowed SSH CIDR.",
        connectivityTitle: "Conectividad",
        vpcInfraTitle: "Infraestructura por VPC",
        tgwInfraTitle: "Infraestructura Transit Gateway",
        practicalRule:
          "Regla práctica: primero mira el modo de conectividad y los pares esperados; después baja a IDs solo si necesitas depurar o verificar un recurso puntual en AWS.",
      },
      tourLabel: "Ver tour del plan",
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
