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
  canvas: {
    feedback: {
      outdatedTitle: "Canvas desactualizado respecto al plan",
      outdatedDescription:
        "Este canvas cambió desde la última validación asociada al plan. Si sigues editando, el plan dejará de representar exactamente lo que estás viendo en pantalla.",
      viewPlan: "Ver plan",
      revalidate: "Revalidar",
      keepEditing: "Seguir editando",
    },
    createLab: {
      error: "No se pudo crear el laboratorio.",
      networkTitle: "Crear laboratorio de red",
      networkSubtitle:
        "Crea un laboratorio para modelar topologías de red y dejarlo listo para validación y despliegue. Define nombre, región y CIDR maestro.",
      guidedTitle: "Crear laboratorio",
      guidedSubtitle:
        "Crea un laboratorio educativo guiado: modela topologías de red paso a paso y déjalo listo para una ejecución real.",
      stepLabel: "Paso {{current}} de {{total}}",
      guidedEyebrow: "Laboratorio guiado",
    },
    form: {
      courseRequired: "Debes seleccionar un curso.",
      stepOneTitle: "Paso 1: Configura el laboratorio",
      stepOneDescription:
        "Define el nombre, la región y el rango padre (CIDR). Con esto podremos guiar el resto del flujo (segmentos, zonas, workloads y pruebas).",
      cidrTip:
        "Consejo: usa un rango /16 para que tengas espacio cómodo para subredes (/24) sin pelearte con el IP plan.",
      awsOnlyInfo:
        "En este MVP el deploy real está habilitado para AWS. Otros providers se muestran como referencia de roadmap, pero aún no están disponibles para ejecución.",
      cloudProvider: "Cloud provider",
      useAwsHint:
        "Para este MVP usa AWS si quieres desplegar infraestructura real.",
      labTemplate: "Plantilla de laboratorio",
      chooseTemplate: "Elige el caso de uso que quieres construir paso a paso.",
      useRecommendedCidr: "Usar CIDR recomendado ({{value}})",
      templateCanvasHint:
        "Al crear el laboratorio, esta plantilla cargará un canvas inicial coherente con el caso elegido.",
      customTemplateWarning:
        "Esta plantilla fue preparada sobre el CIDR sugerido {{value}}. Si cambias el rango maestro, luego revisa en el canvas los CIDR de segmentos, subredes e IPs fijas para ajustarlos manualmente si hace falta.",
      labName: "Nombre del laboratorio",
      labNameWizardPlaceholder: "Ej: Lab-Ruteo-1",
      labNamePlaceholder: "Ej: Laboratorio-Peering-1",
      labNameHelp:
        "Este nombre se verá en la lista y será la referencia principal del laboratorio.",
      notesPlaceholder:
        "Ej: Laboratorio para validar una VPC pública con bastion, pruebas SSH y evidencias para la defensa.",
      courseSelectionRequired:
        "Selecciona el curso al que se compartirá el laboratorio.",
      courseOptional: "Opcional para administradores.",
      cloudConnectionHelp:
        "Puedes fijar una conexión AWS específica o dejar que el backend resuelva la personal del owner y luego la compartida del curso.",
      accountLabel: "cuenta",
      executionPreviewResolved:
        "Ejecución prevista: {{name}}{{account}}. {{helper}}",
      awsOnlyExecution:
        "En este MVP solo AWS puede resolver una conexión ejecutable real.",
      executionSource: {
        explicit: "Se usará la conexión seleccionada explícitamente.",
        ownerPersonalAuto:
          "Auto resolverá primero la cuenta personal del owner.",
        courseSharedAuto:
          "Auto resolverá la cuenta compartida del curso.",
        unresolved: "No hay una conexión ejecutable resuelta todavía.",
      },
      masterCidr: "Rango maestro (CIDR)",
      masterCidrWizardPlaceholder: "Ej: 10.20.0.0/16",
      masterCidrPlaceholder: "10.30.0.0/20",
      masterCidrWizardHelp:
        "Este será el bloque padre. Si usas plantilla y lo cambias, revisa luego el direccionamiento precargado en el canvas.",
      masterCidrHelp:
        "Rango padre del que se derivarán los segmentos y zonas.",
      selectedRegion: "Región seleccionada: {{value}}",
      continue: "Continuar",
      providerStatus: {
        ready: "Listo para validación y deploy",
        planned: "Próximamente",
        unknown: "Disponibilidad no confirmada",
      },
    },
    vpcForm: {
      headerEyebrow: "segmento de red",
      headerTitle: "Segmento de Red",
      headerSubtitle:
        "Define el espacio de direcciones, la exposición a internet y el comportamiento de salida para este segmento. Traducción AWS: VPC.",
      networkFallback: "red",
      snackbar: {
        autoSelectNatSubnet: 'Se seleccionó automáticamente la zona pública "{{value}}" para el NAT.',
        noPublicSubnetsForNat:
          "No hay zonas públicas disponibles para alojar el NAT Gateway.",
        natWithoutPrivateZones:
          "La salida gestionada está activa, pero todavía no hay zonas privadas que aprovechen ese NAT.",
        selectNatPublicZoneBeforeSave:
          "Debes seleccionar una zona pública para el NAT antes de guardar.",
        createPublicZoneFirst:
          "Primero crea una zona pública para habilitar salida gestionada.",
      },
      fields: {
        segmentName: "Nombre del segmento",
        segmentCidr: "Bloque CIDR del segmento (dentro de {{parent}})",
        segmentCidrPlaceholder: "10.30.0.0/20",
        region: "Región",
        internetEdge: "Internet edge",
        enabled: "Habilitado",
        disabled: "Deshabilitado",
        publicZoneForEgress: "Zona pública para egress",
        selectPublicZone: "Selecciona una zona pública",
        publicZoneHelp:
          "Crea primero una zona pública dentro de este segmento para alojar la salida gestionada.",
        natEip: "Elastic IP Allocation ID (opcional, AWS)",
        natEipPlaceholder: "eipalloc-0123456789abcdef0",
        natEipHelpEnabled:
          "Si la dejas vacía, AWS asignará una Elastic IP nueva. Si ya tienes una reservada, ingresa su Allocation ID real (`eipalloc-...`), no la IP pública.",
        natEipHelpDisabled: "Solo aplica si habilitas salida gestionada.",
        allowedSsh: "Allowed SSH CIDR (opcional)",
        allowedSshPlaceholder: "203.0.113.5/32",
        allowedSshHelp:
          "Ej: 203.0.113.5/32. Esto crea una regla del Security Group para permitir SSH desde tu IP pública.",
      },
      info: {
        title: "Qué significa este segmento",
        cidr: "- El CIDR define el rango principal del segmento.",
        internetEdge:
          "- Internet edge habilita salida pública directa donde existan rutas adecuadas.",
        managedEgress:
          "- Managed egress da salida a zonas privadas, pero no acceso entrante desde Internet.",
        elasticIp:
          "- En AWS, si defines una Elastic IP para egress, debe ser un Allocation ID real (`eipalloc-...`), no una IP pública.",
        allowedSsh:
          "- Allowed SSH CIDR abre TCP/22 solo desde la IP o red que indiques.",
      },
      chips: {
        igwEnabled: "AWS: crea Internet Gateway",
        igwDisabled: "AWS: sin Internet Gateway",
        natEnabled: "AWS: crea NAT Gateway",
        natDisabled: "AWS: sin NAT Gateway",
        privateZones: "Zonas privadas: {{count}}",
        sshExposed: "Seguridad: SSH expuesto a CIDR",
        sshHidden: "Seguridad: sin SSH externo",
      },
      alerts: {
        noPublicZones:
          "No hay zonas públicas en esta VPC. Crea una para poder habilitar la salida gestionada.",
        topologyReady:
          "Ya tienes una topología apta para salida privada: una zona pública y una privada. Si quieres que las zonas privadas salgan a Internet sin volverse públicas, activa",
        natWithoutPrivateZones:
          "Managed egress está activo, pero esta VPC no tiene zonas privadas. El NAT se podrá crear, pero no estarás resolviendo el caso pedagógico principal de salida privada controlada.",
        demoCase:
          "Buen caso para demo: el NAT vivirá en una zona pública y podrá dar salida a las zonas privadas de esta VPC.",
      },
      tooltip: {
        enableNatBlocked:
          "Crea primero una zona pública para habilitar salida gestionada.",
        saveBlocked:
          "Selecciona una zona pública para la salida gestionada antes de guardar.",
      },
      switchLabel: "Habilitar salida gestionada",
      actions: {
        save: "Registrar configuración",
        delete: "Eliminar nodo",
        saveHint: "Debes seleccionar una zona pública para la salida gestionada.",
      },
    },
    instanceForm: {
      headerEyebrow: "nodo workload",
      headerTitle: "Instancia",
      headerSubtitle:
        "Configura el nombre, el direccionamiento y el perfil de ejecución de esta VM.",
      subnetFallback: "subred",
      sections: {
        identity: {
          eyebrow: "Identidad y red",
          title: "Nombre e IP privada",
          helper:
            "Primero define cómo se verá esta VM dentro del segmento y si quieres fijar una IP.",
        },
        runtime: {
          eyebrow: "Runtime",
          title: "Imagen y tamaño",
          helper:
            "Aquí decides con qué AMI se crea la instancia y qué tipo de máquina se reservará.",
        },
        ssh: {
          eyebrow: "Acceso SSH",
          title: "Key pair y compatibilidad",
          helper:
            "Aquí eliges la referencia a la key pair que AWS buscará al lanzar la instancia.",
        },
      },
      fields: {
        name: "Nombre de la instancia",
        privateIp: "IP privada (dentro de {{subnet}})",
        privateIpHelp: 'Déjala vacía o escribe "auto" para asignación automática.',
        privateIpPlaceholder: "10.10.0.10  •  o escribe: auto",
        ami: "AMI",
        useDefaultAmi: "Usar AMI por defecto",
        amiFallback:
          "No hay AMIs configuradas en el catálogo. Si la dejas vacía, el backend usará la AMI por defecto.",
        instanceType: "Tipo de instancia",
        sshAccess: "Acceso SSH (KeyPair)",
        sshAccessHelp:
          "Elige una key pair compatible o escribe el nombre manualmente.",
        sshAccessManualHelp:
          "Opcional. Puedes escribir manualmente el nombre de una key pair existente en AWS.",
        sshAccessPlaceholder: "p. ej., tesis-key",
      },
      quickTips: {
        title: "Pistas rápidas",
        privateIp:
          "La private IP debe pertenecer a la subred padre. Si usas auto, el provider asignará una IP disponible.",
        publicIp:
          "La IP pública no reemplaza la private IP: depende de la subred y de la política del deploy.",
      },
      scope: {
        courseShared: "Curso compartido",
        personal: "Personal",
        unknown: "desconocido",
      },
      snackbar: {
        scopeMismatch:
          "La key pair seleccionada es {{scope}}, pero este laboratorio desplegará con una conexión {{executionScope}}.",
        connectionMismatch:
          "La key pair seleccionada está vinculada a otra conexión cloud. Verifica que exista en la cuenta efectiva del deploy.",
      },
      compatibility: {
        scopeReason: "scope {{value}}",
        regionReason: "región {{value}}",
        otherConnection: "otra conexión",
        mismatch: "No coincide por {{reasons}}",
        match: "Compatible con este laboratorio",
        compatible: "Compatible",
        review: "Revisar",
        selectedCompatible: "Key pair compatible con este laboratorio",
      },
      catalogHint:
        "El catálogo prioriza las key pairs compatibles con la conexión y región efectivas, y aún te deja escribir un nombre manual.",
      executionRegion: "Región efectiva: {{value}}",
      hiddenOptions:
        "Ocultamos {{count}} opción(es) de key pair del catálogo porque no coinciden con la conexión cloud o la región efectivas de este laboratorio.",
      alerts: {
        arm64:
          "Los tipos t4g.* usan arquitectura ARM (Graviton). Asegúrate de elegir una AMI compatible con ARM64.",
        scopeMismatch: {
          before: "La key pair seleccionada es de tipo",
          middle:
            "pero este laboratorio está resolviendo una conexión cloud de tipo",
          after:
            "Puede que AWS no encuentre esa key pair en la cuenta efectiva del deploy.",
        },
        connectionMismatch:
          "La key pair seleccionada está vinculada a otra conexión cloud. Verifica que exista también en la cuenta que este laboratorio usará realmente para desplegar.",
      },
      systemValidation: {
        title: "Qué valida el sistema",
        deploy:
          "El deploy valida que esa key pair exista en la cuenta y región efectivas.",
        ssh:
          "El acceso SSH posterior sigue dependiendo de que tengas el archivo .pem fuera de la plataforma, en el equipo desde el que te conectarás.",
      },
      actions: {
        save: "Registrar configuración",
        delete: "Eliminar nodo",
      },
    },
    subnetForm: {
      headerEyebrow: "zona de red",
      headerTitle: "Segmento de Zona",
      headerSubtitle:
        "Define el comportamiento de tráfico y el direccionamiento dentro del segmento de red padre. Traducción AWS: subnet.",
      segmentFallback: "segmento",
      info: {
        title: "Qué significa esta zona",
        parentCidr: "- La zona debe vivir dentro del CIDR del segmento padre.",
        noOverlap:
          "- Las zonas no deben solaparse entre sí dentro del mismo segmento.",
        publicVsPrivate:
          "- Public zone permite mayor ingreso/salida por política de rutas. Private zone mantiene el tráfico interno por defecto.",
      },
      alerts: {
        privateZoneBefore:
          "Esta zona es privada. Si después necesitas salida a Internet sin exponerla públicamente, habilita",
        managedEgressLabel: "managed egress",
        privateZoneAfter: "desde el",
        parentSegmentLabel: "Network Segment",
      },
      fields: {
        name: "Nombre de la zona",
        cidr: "Bloque CIDR de la zona (dentro de {{parent}})",
        cidrPlaceholder: "10.10.0.0/24",
        availabilityZone: "Availability Zone",
        type: "Tipo de zona",
        autoAssignPublicIp:
          "Asignar IPv4 pública automáticamente (recomendado para zonas públicas)",
      },
      type: {
        public: "Pública",
        private: "Privada",
      },
      actions: {
        save: "Registrar configuración",
        delete: "Eliminar nodo",
      },
    },
    deployDialog: {
      exportError: "No se pudo exportar el plan. Revisa la consola.",
      title: "Confirmar infraestructura",
      primaryRedeploy: "Redeploy en AWS",
      primaryDeploy: "Deploy en AWS",
      revalidateRedeploy: "Revalidar redeploy",
      validateDeploy: "Validar deploy",
      validatingInfra: "Validando infraestructura...",
      validatedSuccess:
        "Infraestructura validada correctamente. Puedes desplegar o revisar el plan.",
      validationError:
        "Error durante la validación. Revisa los detalles antes de continuar.",
      canvasOutdated:
        "El canvas cambió desde la última validación. Debes validar nuevamente.",
      busyValidating: "Validando infraestructura. Espera un momento...",
      busyProcessing: "Procesando la operación. No cierres este modal todavía.",
      busyDescription:
        "Mientras corre esta acción, el modal queda bloqueado para evitar estados inconsistentes.",
      redeployWarning:
        "Esta validación se hizo sobre infraestructura ya activa. Si despliegas ahora, Terraform actualizará el stack existente en AWS y algunos cambios podrían reemplazar o eliminar recursos.",
      chips: {
        mainRedeploy: "Acción principal: REDEPLOY",
        mainDeploy: "Acción principal: DEPLOY",
        destroyAvailable: "Destroy disponible si el plan sigue activo",
        destroyUnavailable: "Destroy no aplica hasta crear recursos",
      },
      risk: {
        destructive:
          "Terraform detectó cambios potencialmente destructivos o con reemplazo de recursos.",
        caution:
          "Terraform detectó actualizaciones sobre recursos existentes.",
        safe: "Terraform detectó cambios aditivos sobre la infraestructura.",
        sensitiveResources: "Recursos sensibles detectados:",
      },
      summaryTitle: "Resumen",
      summary: {
        provider: "Provider: {{value}}",
        segments: "Segments: {{count}}",
        zones: "Zones: {{count}}",
        workloads: "Workloads: {{count}}",
        directLinks: "Direct links: {{count}}",
        hubs: "Hubs: {{count}}",
        attachments: "Hub attachments: {{count}}",
      },
      postDeployHint:
        "Después del deploy, valida conectividad en Plan Detail -> Pruebas con comandos de ping guiados entre segmentos.",
      neutralTitle: "Intención neutral del laboratorio",
      neutral: {
        baseNetwork:
          "La red base contiene {{segments}} segmento(s), {{zones}} zona(s) y {{workloads}} workload(s).",
        exposure:
          "Exposición del diseño: {{publicExposure}} segmento(s) públicos, {{privateExposure}} privados y {{mixedExposure}} mixtos.",
        hubs:
          "Conectividad modelada como {{hubs}} hub(s) central(es) con {{attachments}} attachment(s).",
        directLinks:
          "Conectividad modelada con {{directLinks}} enlace(s) directo(s) entre pares de segmentos.",
        sshWarning:
          "Acceso y salida: SSH externo declarado en {{vpcsWithSsh}} segmento(s), pero {{vpcsWithSshButNoPublicZones}} no tiene(n) zona pública para exponerlo. Además, {{isolatedExposure}} segmento(s) no declara(n) salida a internet.",
        sshReady:
          "Acceso y salida: SSH externo utilizable en {{vpcsWithEffectivePublicSsh}} segmento(s) y {{isolatedExposure}} segmento(s) sin salida a internet declarada.",
      },
      awsTitle: "Traducción AWS",
      aws: {
        created:
          "AWS creará {{segments}} VPC(s), {{zones}} subnet(s) y {{workloads}} instancia(s).",
        publicExposure:
          "Exposición pública efectiva: IGW en {{vpcsWithIgw}} VPC(s), {{publicSubnets}} subnet(s) pública(s) y SSH externo utilizable en {{vpcsWithEffectivePublicSsh}} VPC(s).",
        noPublicSubnets:
          "Internet edge declarado en {{vpcsWithIgw}} VPC(s), pero no hay subnet(s) pública(s) para exponer workloads ni usar SSH externo directamente.",
        privateEgress:
          "Salida privada: NAT Gateway en {{vpcsWithNat}} VPC(s) para {{privateSubnets}} subnet(s) potencialmente privadas.",
        centralRouting:
          "Enrutamiento central: {{hubRouters}} hub(s) y {{hubAttachments}} attachment(s).",
        directRouting:
          "Enrutamiento por enlaces directos: {{directLinks}} enlace(s) declarados.",
      },
      segment: {
        cidr: "CIDR: {{value}}",
        region: "Región: {{value}}",
        model: "Modelo: {{value}}",
        awsVpc: "AWS: VPC",
        igw: "IGW",
        nat: "NAT",
        natEip: "NAT EIP: {{value}}",
        natHelp:
          "Si defines una EIP para el NAT, debe ser un Allocation ID real de AWS (`eipalloc-...`), no una IP pública.",
      },
      exportJson: "Exportar JSON",
      viewPlan: "Ver plan",
      applyRedeploy: "Aplicar redeploy",
      deploy: "Desplegar",
    },
    learningGuide: {
      panel: {
        title: "Guía de modelado",
        subtitle:
          "Sigue los pasos para construir y entender la topología antes de validar o desplegar.",
        progress: "Progreso {{completed}}/{{total}}",
        stats: {
          segments: "Segmentos: {{count}}",
          zones: "Zonas: {{count}}",
          routers: "Nodos de conectividad: {{count}}",
          directLinks: "Direct links: {{count}}",
          hubRouting: "Hub routing: {{count}}",
          workloads: "Workloads: {{count}}",
        },
        selectedElement: "Elemento seleccionado",
        neutralReading: "Lectura neutral",
        awsReading: "Traducción AWS",
        conceptComparison: "Comparación conceptual",
        neutralView: "Vista neutral",
        awsView: "Vista implementación AWS",
        neutralLabel: "Neutral:",
        awsLabel: "AWS:",
        blockers: "Bloqueos detectados",
        moreErrors: "+ {{count}} errores adicionales.",
        openValidation: "Abrir validación",
        openDeploy: "Abrir despliegue",
      },
      steps: {
        segment: { title: "Crear segmento base", description: "Define el contenedor principal del laboratorio." },
        zones: { title: "Definir zonas", description: "Crea al menos una zona pública y una privada." },
        workload: { title: "Agregar workload", description: "Añade al menos una instancia para probar conectividad." },
        connectivity: {
          title: "Conectividad entre segmentos",
          description: "Conecta los segmentos con un nodo de conectividad y sus enlaces.",
          optional: "Opcional en laboratorio de un solo segmento.",
        },
        validate: { title: "Validar topología", description: "Ejecuta simulación (Terraform plan) antes del despliegue." },
        deploy: { title: "Desplegar en AWS", description: "Aplica infraestructura real cuando el laboratorio esté validado." },
      },
      nextAction: {
        completed: "Laboratorio completado. Puedes revisar outputs y logs.",
        running: "Hay una ejecución en curso. Espera el resultado antes de seguir.",
        fixTopology: "Corrige primero los errores de topología para continuar con la validación.",
        validate: "Ejecuta Validar para simular la topología y revisar el plan antes de aplicar.",
        deploy: "Cuando estés conforme con la simulación, ejecuta Desplegar para crear recursos en AWS.",
        nextStep: "Siguiente paso: {{title}}.",
      },
      contrast: {
        vlanLines: {
          subnets: "Estás modelando {{count}} zona(s) de red dentro de un laboratorio lógico.",
          needsRouter: "Tu práctica requiere enrutar entre múltiples segmentos de red.",
          singleDomain: "Tu práctica puede resolverse en un dominio principal.",
          routesReady: "Ya definiste rutas entre segmentos para analizar conectividad.",
          routesMissing: "Aún no definiste rutas explícitas entre segmentos.",
        },
        awsLines: {
          vpcs: "Esto se traduce a {{vpcs}} VPC(s) y {{subnets}} subnet(s) en AWS.",
          egress: "Conectividad de salida: IGW {{igw}} / NAT {{nat}}.",
          routers: "Routers en modo AWS: Peering {{peering}} / TGW {{tgw}}.",
          routesReady: "Las rutas definidas se transforman en route tables y enlaces entre VPCs.",
          routesMissing: "Sin rutas explícitas, AWS solo aplicará conectividad local por VPC.",
          oneWayPairs:
            "Detectamos {{count}} par(es) con ruta de solo ida; revisa retorno para pruebas bidireccionales.",
          noOneWayPairs: "No se detectan pares con rutas solo de ida.",
        },
      },
      concepts: {
        segmentation: {
          concept: "Segmentación",
          vlan: "Segmentos y zonas lógicas para práctica",
          aws: "VPC y subnets con CIDR reales",
        },
        gateway: {
          concept: "Gateway",
          vlan: "Nodo de conectividad del laboratorio",
          aws: "Route tables + IGW/NAT/TGW/Peering",
        },
        hosts: {
          concept: "Hosts",
          vlan: "Equipos/servicios en la topología",
          aws: "Instancias EC2 y sus interfaces",
        },
        validation: {
          concept: "Validación",
          vlan: "Comprobación de reglas de topología",
          aws: "Terraform plan antes de apply",
        },
      },
      focus: {
        element: "Elemento",
        segmentSubtitle: "Qué significa en el modelo neutral y cómo se traduce en AWS.",
        internetEdgeOn: "Internet edge activo",
        internetEdgeOff: "Sin internet edge",
        managedEgressOn: "Managed egress activo",
        managedEgressOff: "Sin managed egress",
        sshExposed: "SSH desde IP definida",
        sshHidden: "SSH no expuesto",
        segmentLabDomain:
          "Este segmento representa un dominio principal de red dentro del laboratorio.",
        publicZones:
          "Tienes {{count}} zona(s) pública(s): sirven para bastions o servicios con salida directa.",
        noPublicZones:
          "No hay zonas públicas; este segmento no está pensado para exposición directa.",
        privateZones:
          "Tienes {{count}} zona(s) privada(s): sirven para workloads internos.",
        noPrivateZones:
          "No hay zonas privadas; toda la práctica está concentrada en áreas públicas o no definidas.",
        segmentAwsVpc:
          "AWS creará 1 VPC real en {{region}} con el CIDR indicado.",
        igwCreated:
          "Se creará y adjuntará un Internet Gateway para permitir salida/entrada pública donde existan rutas y SGs.",
        igwMissing:
          "Sin Internet Gateway, la VPC no tendrá salida pública directa.",
        natCreated:
          "Se creará 1 NAT Gateway: tus redes privadas podrán salir a Internet, pero no recibir tráfico entrante.",
        natMissing:
          "Sin NAT Gateway, las subnets privadas tampoco tendrán salida pública a menos que exista otro camino.",
        natEipDefined:
          "Si asignas una Elastic IP al NAT, debe ser un Allocation ID existente de AWS (por ejemplo `eipalloc-...`), no la IP pública visible.",
        natEipLater:
          "Si luego habilitas NAT y quieres fijar su EIP, usa un Allocation ID real de AWS.",
        sshRule: "El Security Group abrirá TCP/22 desde {{value}}.",
        noSshRule:
          "No se abrirá SSH administrativo desde Internet salvo que lo habilites explícitamente.",
        segmentWhy:
          "Este segmento define el límite principal del laboratorio. A partir de aquí se decide segmentación, exposición y conectividad hacia otras redes.",
        routerHub: "Hub central de conectividad",
        routerDirect: "Conectividad directa entre pares",
        routerHubMode: "Modo hub routing",
        routerDirectMode: "Modo direct links",
        connectedSegments: "{{count}} segmento(s) conectados",
        declaredPolicies: "{{count}} policy(s) declaradas",
        missingReturns: "{{count}} retorno(s) faltante(s)",
        roundTripPolicies: "Policies ida/vuelta coherentes",
        routerHubLab:
          "En el laboratorio este nodo actúa como un hub: los segmentos envían tráfico al nodo para alcanzar otras redes.",
        routerDirectLab:
          "En el laboratorio este nodo representa enlaces directos por pares: cada segmento necesita policies explícitas hacia el otro.",
        policyRows:
          "Las filas de policy no son decorativas: determinan quién puede hablar con quién.",
        routerHubAws:
          "AWS implementará 1 Transit Gateway y {{count}} attachment(s) para los segmentos conectados.",
        routerPeeringAws:
          "AWS implementará conexiones VPC Peering entre los pares que realmente queden declarados por policies.",
        routerHubRoute:
          "Cada policy hacia TGW enviará tráfico al hub central; luego el hub lo reencamina hacia el segmento destino.",
        routerPeeringRoute:
          "En peering no existe tránsito implícito: A↔B y B↔C no conectan automáticamente A↔C.",
        routerWhy:
          "Aquí se define la diferencia entre una topología punto a punto y una topología centralizada. Ese cambio altera tanto la escalabilidad como la forma de razonar el tráfico.",
        zoneSubtitle: "Zona interna dentro de un segmento principal.",
        publicZone: "Pública",
        privateZone: "Privada",
        routeTable: "Tabla {{value}}",
        publicZoneLab:
          "En el laboratorio esta zona está pensada para bastions o workloads con salida directa.",
        privateZoneLab:
          "En el laboratorio esta zona está pensada para workloads internos o menos expuestos.",
        subnetAws:
          "AWS creará 1 aws_subnet con el CIDR indicado y la asociará a una route table.",
        subnetPublicRule:
          "Será pública solo si su route table apunta a un Internet Gateway.",
        subnetPrivateRule:
          "Será privada mientras no tenga ruta pública directa.",
        zoneWhy:
          "La subnet no define conectividad por sí sola; la combinación de route table y Security Group determina su comportamiento real.",
        workloadSubtitle: "Host desde donde se materializa la práctica.",
        segmentTitle: "Segmento de Red: {{label}}",
        routerTitle: "Política de Conectividad: {{label}}",
        zoneTitle: "Zona del Segmento: {{label}}",
        workloadTitle: "Workload: {{label}}",
        publicIp: "Con IP pública",
        privateOnly: "Solo IP privada",
        workloadLab:
          "En el laboratorio este nodo representa el equipo final sobre el que harás pruebas o desplegarás servicios.",
        workloadAws:
          "AWS creará 1 instancia EC2 con la AMI, tipo y key pair definidos.",
        workloadPublicAccess:
          "Podrás administrarla desde fuera si la ruta pública y el SG lo permiten.",
        workloadPrivateAccess:
          "Solo será alcanzable desde dentro de la red o mediante saltos intermedios.",
        workloadWhy:
          "Las pruebas de ping y acceso SSH terminan ocurriendo aquí. Si el workload está mal ubicado o mal protegido, el laboratorio no será verificable.",
        defaultSubtitle: "Explicación contextual del elemento seleccionado.",
        defaultLine:
          "Selecciona un elemento principal del canvas para ver una lectura pedagógica más precisa.",
      },
    },
    cidrGuide: {
      button: "¿Cómo calcular?",
      title: "Guía rápida de CIDR, subredes y direcciones IP",
      templateWarning:
        "Si cambias el CIDR maestro después de elegir una plantilla, el canvas precargado no recalcula automáticamente todas las IPs. En ese caso, revisa manualmente los CIDR de segmentos, subredes e IPs fijas antes de validar o desplegar.",
      understood: "Entendido",
      sections: {
        meaning: {
          title: "1. Qué significa un CIDR",
          bodyStart: "Un CIDR combina una dirección base y un prefijo. Por ejemplo,",
          bodyEnd:
            "significa que el laboratorio tiene un bloque amplio desde el cual luego derivaremos segmentos y subredes.",
        },
        rule: {
          title: "2. Regla práctica para este MVP",
          bodyStart: "Si partes con un",
          bodyMiddle: ", normalmente podrás dividirlo con tranquilidad en varias redes",
          bodyEnd:
            ". Esa combinación es cómoda para laboratorio porque deja margen para crecer sin tener que rehacer el direccionamiento.",
        },
        example: {
          title: "3. Ejemplo sencillo",
          masterStart: "Supón que tu rango maestro es",
          defineSegments: "Desde ahí puedes definir segmentos o VPCs como:",
          simpleVpc: "- `10.20.0.0/16` para una VPC simple",
          multiSegments: "- o separar varios segmentos en rangos distintos si el caso lo requiere",
          subnets: "Dentro de una VPC, puedes crear subredes como:",
          publicSubnet: "- `10.20.1.0/24` para una subred pública",
          privateSubnet: "- `10.20.2.0/24` para una subred privada",
          workloads: "Y luego asignar IPs a workloads, por ejemplo:",
          bastion: "- `10.20.1.10` para una bastion",
          privateApp: "- `10.20.2.10` para una app privada",
        },
        visualMap: {
          title: "3.1. Mapa visual del direccionamiento",
          body: "Piensa el laboratorio como una jerarquía: cada nivel contiene al siguiente.",
          masterLabel: "Laboratorio / rango maestro",
          segmentLabel: "Segmento / VPC",
          publicSubnetLabel: "Subred pública",
          publicWorkload: "Workload ejemplo: `10.20.1.10`",
          privateSubnetLabel: "Subred privada",
          privateWorkload: "Workload ejemplo: `10.20.2.10`",
        },
        howToThink: {
          title: "4. Cómo pensar el cálculo sin complicarte",
          step1: "1. Elige primero el rango maestro del laboratorio.",
          step2: "2. Decide cuántos segmentos o VPCs vas a necesitar.",
          step3: "3. Dentro de cada segmento, separa subredes públicas y privadas con bloques que no se solapen.",
          step4: "4. Reserva IPs fijas para workloads solo después de definir bien sus subredes.",
        },
        math: {
          title: "4.1. Cómo se calcula matemáticamente",
          bodyStart: "En IPv4 hay",
          bodyEnd: ". El prefijo indica cuántos bits están reservados para la red.",
          formula: "La fórmula base es:",
          note:
            "En laboratorio usamos esa regla práctica aunque algunos entornos reservan direcciones adicionales.",
          exampleA: "Ejemplo A: `10.20.0.0/16`",
          exampleAConclusion:
            "Eso explica por qué un `/16` sirve bien como rango maestro: deja mucho espacio para varias subredes internas.",
          exampleB: "Ejemplo B: `10.20.1.0/24`",
          exampleBConclusion:
            "Por eso una subred `/24` suele ser cómoda para laboratorio: puedes asignar varias IPs fijas sin quedarte corto.",
        },
        membership: {
          title: "4.2. Cómo saber si una IP pertenece a una subred",
          body:
            "En un `/24`, los primeros 3 octetos identifican la red y el último octeto cambia por host.",
          mentalRule: "Regla mental rápida:",
          exampleC: "Ejemplo C: `10.20.1.128/25`",
          exampleCBody: "Un `/25` divide el `/24` en dos bloques:",
          then: "Entonces:",
        },
        ipTypes: {
          title: "4.3. Private IP vs Public IP",
          privateStart: "Una",
          privateEnd:
            "identifica al workload dentro de su red interna. Esa IP se usa para ruteo entre subredes y segmentos.",
          publicStart: "Una",
          publicEnd:
            "sirve para acceso desde Internet cuando la topología, la subred y las reglas de seguridad lo permiten.",
          note:
            "No compiten entre sí: una VM puede tener private IP siempre, y public IP solo si el diseño lo requiere.",
          exampleD: "Ejemplo D: cómo leerlo en una VM pública",
          exampleDConclusion:
            "Si haces `ssh` desde tu computador, entrarás por la public IP. Pero dentro de la nube, otras máquinas alcanzarán esa VM por su private IP.",
          practicalRule: "Regla práctica para laboratorio",
        },
        goldenRule: {
          title: "5. Regla de oro",
          body:
            "Ningún segmento debe salirse del rango maestro, ninguna subred debe salirse de su segmento y ninguna IP fija debe salirse de su subred. Si mantienes esa jerarquía, el modelado suele ser estable y fácil de explicar en la demo.",
        },
      },
    },
    validation: {
      vlanNameMin: "El nombre de la VLAN debe tener al menos 3 caracteres",
      vlanNameMax: "El nombre de la VLAN debe tener como máximo 60 caracteres",
      vlanNameRequired: "El nombre de la VLAN es obligatorio",
      cidrRequired: "El bloque CIDR es obligatorio",
      cidrFormat: "El bloque CIDR debe tener formato 192.168.0.0/24",
      cidrInvalid: "El bloque CIDR es inválido",
      cidrPrefixRoom: "El CIDR debe dejar espacio para subredes (por ejemplo /16 a /24)",
      invalidCloudProvider: "Cloud provider inválido",
      cloudProviderRequired: "Cloud provider es obligatorio",
      regionRequired: "La región es obligatoria",
      descriptionMax: "La descripción debe tener como máximo 4000 caracteres",
      vpcNameRequired: "El nombre de la VPC es obligatorio",
      minThree: "Mínimo 3 caracteres",
      maxSixty: "Máximo 60",
      nameRequired: "El nombre es obligatorio",
      cidrShortRequired: "El CIDR es obligatorio",
      cidrExample: "El CIDR es inválido (ej.: 10.0.1.0/24)",
      mustBeWithinVlan: "Debe estar dentro del rango VLAN {{value}}",
      cidrOverlapVpc: "El CIDR se superpone con otra VPC en la VLAN",
      enableIgwForNat: "Habilita Internet Gateway para usar NAT Gateway",
      cidrInvalidExample: "CIDR inválido (ej: 203.0.113.5/32)",
      selectPublicSubnetNat: "Selecciona la subred pública para el NAT",
      subnetMustBeSelected: "Debes seleccionar una subred",
      elasticIpInvalid:
        "Elastic IP inválida. Usa un Allocation ID, por ejemplo: eipalloc-0123456789abcdef0",
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
