const en = {
  common: {
    account: "Account",
    language: "Language",
    processing: "Processing...",
    english: "English",
    spanish: "Spanish",
    all: "All",
    noCourse: "No course",
    optional: "Optional",
    auto: "Auto",
  },
  actions: {
    back: "Back",
    closeSession: "Log out",
    finish: "Finish",
    next: "Next",
    skip: "Skip",
    activate: "Activate",
    assignStudent: "Assign student",
    cancel: "Cancel",
    clearFilters: "Clear filters",
    close: "Close",
    copyLink: "Copy link",
    create: "Create",
    createInvitation: "Create invitation",
    createCourse: "Create course",
    delete: "Delete",
    deactivate: "Deactivate",
    duplicate: "Duplicate",
    edit: "Edit",
    open: "Open",
    remove: "Remove",
    save: "Save",
    saveChanges: "Save changes",
  },
  auth: {
    login: {
      title: "Sign in",
      emailLabel: "Email address",
      passwordLabel: "Password",
      rememberMe: "Remember me",
      submit: "Log in",
      forgotPassword: "Forgot password?",
      signUpPrompt: "Don't have an account? Sign up",
      defaultError: "Could not sign in.",
      googleError: "Could not sign in with Google.",
    },
    register: {
      title: "Create account",
      submit: "Sign up",
      signIn: "Sign in",
      emailPlaceholder: "Enter your email",
      passwordPlaceholder: "Set a password",
      expiredLink: "This link has expired",
      invalidInvitation: "Invalid invitation.",
      validateInvitationError: "Could not validate the invitation.",
      success: "Account activated successfully.",
      defaultError: "Could not complete registration.",
    },
    validation: {
      invalidEmail: "Invalid email format",
      emailRequired: "Email is required",
      passwordRequired: "Password is required.",
      passwordMin: "Password must be at least 8 characters long.",
      passwordLatin: "Password can only contain Latin letters.",
    },
  },
  layout: {
    cloudOrchestrator: "Cloud Orchestrator",
    openDrawer: "Open menu",
    themeToDark: "Enable dark mode",
    themeToLight: "Enable light mode",
    menu: {
      profile: "Profile",
      cloudConnections: "Cloud connections",
      keyPairs: "Key pairs",
      dashboard: "Dashboard",
      amis: "AMIs",
    },
  },
  navigation: {
    dashboard: "Dashboard",
    labs: "Labs",
    executions: "Executions",
    infrastructure: "Infrastructure",
    settings: "Settings",
    userManagement: "User management",
    courseManagement: "Course management",
  },
  admin: {
    dashboard: {
      title: "Dashboard",
      subtitle: "General summary of the lab and execution environment.",
      createLab: "Create lab",
      loading: "Loading dashboard...",
      loadingValue: "...",
      activityRecorded: "Recorded activity",
      noRecentExecutions: "No recent executions",
      cards: {
        labs: "Labs",
        executions: "Executions",
        lastActivity: "Last activity",
      },
    },
  },
  loading: {
    title: "SysLab in progress",
    description:
      "We are saving your change and syncing the view so you do not lose context.",
    messages: {
      login: "Signing in...",
      register: "Saving account...",
      logout: "Signing out...",
      deploy: "Running deployment...",
      destroy: "Destroying infrastructure...",
      test: "Testing connection...",
      delete: "Deleting data...",
      save: "Saving changes...",
      processing: "Processing...",
    },
  },
  labels: {
    active: "Active",
    adminPrimary: "Platform admin",
    course: "Course",
    deactivated: "Deactivated",
    pending: "Pending",
    role: "Role",
    state: "Status",
    student: "Student",
    teacher: "Teacher",
    user: "User",
    email: "Email",
    code: "Code",
    name: "Name",
    lastName: "Last name",
    search: "Search",
    mode: "Mode",
    owner: "Owner",
    visibility: "Visibility",
    updated: "Updated",
    actions: "Actions",
  },
  inviteUser: {
    editTitle: "Edit user",
    inviteTitle: "Invite user",
    editInfo: "Update role, status, name, and course from this panel.",
    inviteInfo:
      "The invitation creates pending access. The person will define their password from the registration link.",
    emailPlaceholder: "user@domain.com",
    firstNamePlaceholder: "First name",
    lastNamePlaceholder: "Last name",
    roleHelper: "Define the access type for this account.",
    roleRequired: "Role is required",
    statusHelper: "Pending leaves the account ready for approval or registration.",
    statusRequired: "Status is required",
    assignLater: "Assign later",
    courseHelper:
      "Optional. You can assign or move the student later from Course management.",
    firstNameTooLong: "First name is too long",
    lastNameTooLong: "Last name is too long",
  },
  settings: {
    users: {
      title: "User management",
      subtitle:
        "Invite users, enable access, and adjust role or course according to the academic flow of the lab.",
      inviteCreated: "Invitation created for {{email}}.",
      inviteLinkPrefix: "Link:",
      inviteNoCourseWarning:
        "This student was left without a course, so no teacher will see them until they are assigned from Course management.",
      infoBanner:
        "Use this view to approve access, reassign students to their courses, and update the role of each account.",
      searchLabel: "Search user",
      searchPlaceholder: "Email or name",
      noAdditionalName: "No additional name",
      noVisibleUsers: "There are no visible users for this account yet.",
      showing: "Showing {{filtered}} of {{total}} users.",
      usersGroup: "Users",
      managementGroup: "Management",
      copyInviteError: "Could not copy the invitation link.",
      createUserError: "Could not create the user.",
      updateUserError: "Could not update the user.",
      columns: {
        user: "User",
        email: "Email",
        role: "Role",
        status: "Status",
        course: "Course",
        actions: "Actions",
      },
      filters: {
        role: "Role",
        status: "Status",
        course: "Course",
      },
    },
    courses: {
      title: "Course management",
      subtitle:
        "Manage courses, responsible teachers, and student assignment according to the academic model of the lab.",
      editTitle: "Edit course",
      createTitle: "Create course",
      teacher: "Teacher",
      autoDestroyColumn: "Auto destroy",
      autoDestroyMinutes: "Auto destroy time (minutes)",
      autoDestroyMinutesHelp:
        "If you leave it empty on create, the system default will be used. Example: 120 = 2 hours.",
      noReassign: "Do not reassign",
      activeCourse: "Active course",
      loadError: "Could not load courses.",
      missingName: "You must provide a name for the course.",
      saveError: "Could not save the course.",
      selectCourseAndStudent: "Select a course and a student.",
      enrollError: "Could not assign the student to the course.",
      removeError: "Could not remove the student from the course.",
      students: "Students",
      inactive: "Inactive",
      rosterTitle: "Course roster",
      noVisibleTeacher: "No visible teacher",
      rosterHelp:
        "Here you can assign students without a course or move students from other courses into this roster.",
      availableStudent: "Available student to assign",
      noAvailableStudents:
        "There are no students without a course or from other courses available to move",
      noStudentsAssigned: "This course does not have assigned students yet.",
      noCourses: "There are no courses available to manage yet.",
      studentLabel: "Student",
      actionLabel: "Action",
    },
    cloudConnections: {
      title: "Cloud connections",
      subtitle:
        "Register personal AWS credentials or course-shared credentials. Real deploy runs from the backend using this connection, not from the user's computer.",
      new: "New connection",
      loadError: "Could not load cloud connections.",
      updated: "Cloud connection updated.",
      created: "Cloud connection created.",
      saveError: "Could not save the connection.",
      deleteConfirm: 'Delete connection "{{name}}"?',
      deleted: "Connection deleted.",
      deleteError: "Could not delete the connection.",
      testOk: "Valid connection: {{message}}",
      testFail: "Test failed: {{message}}",
      testError: "Could not test the connection.",
      statusPrefix: "Current status:",
      loading: "loading",
      visibleCount: "{{count}} visible connection(s)",
      statusHelp:
        "Students can only create personal connections; teachers and administrators can also register course-shared connections.",
      columns: {
        name: "Name",
        scope: "Scope",
        auth: "Auth",
        course: "Course",
        region: "Region",
        target: "Target",
        lastTest: "Last test",
        actions: "Actions",
      },
      active: "Active",
      inactive: "Inactive",
      scopeCourse: "Course",
      scopePersonal: "Personal",
      scopeCourseShared: "Course shared",
      authAssumeRole: "AssumeRole",
      authStaticKeys: "Static keys",
      emptyValue: "—",
      untested: "Untested",
      test: "Test",
      edit: "Edit",
      delete: "Delete",
      empty: "There are no visible cloud connections yet.",
      editTitle: "Edit cloud connection",
      createTitle: "New cloud connection",
      fields: {
        name: "Name",
        scope: "Scope",
        authType: "Authentication",
        course: "Course",
        defaultRegion: "Default region",
        accessKeyId: "AWS Access Key ID",
        secretAccessKey: "AWS Secret Access Key",
        secretAccessKeyReplace: "AWS Secret Access Key (only if you want to replace it)",
        roleArn: "AWS Role ARN",
        externalId: "External ID",
        externalIdReplace: "External ID (only if you want to replace it)",
        activeConnection: "Active connection",
      },
      scopeSharedHelp:
        "Use it for course labs and shared review flows.",
      scopePersonalHelp:
        "You will only use it in your own labs.",
      assumeRoleHelp:
        "Recommended for production: the platform assumes a role and uses temporary credentials.",
      staticKeysHelp:
        "Simpler for local testing, but less secure in the long term.",
      cancel: "Cancel",
      saving: "Saving...",
      save: "Save",
    },
    amis: {
      title: "AMI catalog",
      subtitle:
        "Manage the suggested images for canvas workloads. This catalog is available to teachers and administrators.",
      new: "New AMI",
      loadError: "Could not load the AMIs.",
      created: "AMI registered.",
      createError: "Could not register the AMI.",
      deleted: "AMI deleted.",
      deleteError: "Could not delete the AMI.",
      info:
        "AMIs help standardize images approved by the course or platform and reduce errors when configuring instances.",
      registered: "Registered AMIs",
      codePrefix: "Code: {{value}}",
      empty: "There are no AMIs registered.",
    },
    keyPairs: {
      title: "Key pair catalog",
      subtitle:
        "Register personal or course-shared key pairs so they can be suggested later in the canvas and reduce typing mistakes in ssh_access.",
      howToCreate: "How to create it in AWS",
      new: "New key pair",
      loadError: "Could not load the key pairs.",
      created: "Key pair registered.",
      createError: "Could not register the key pair.",
      deleted: "Key pair deleted.",
      deleteError: "Could not delete the key pair.",
      scopePersonal: "Personal",
      scopeCourseShared: "Course shared",
      awsNamePrefix: "AWS name:",
      connectionChip: "Connection: {{value}}",
      courseChip: "Course: {{value}}",
      ownerChip: "Owner: {{value}}",
      scopeCourseHelp:
        "Designed for labs that deploy over the course shared account.",
      scopePersonalHelp:
        "Designed for labs that deploy over the user's personal account.",
      empty: "There are no registered key pairs.",
      infoBanner:
        "Here we only register the key pair name in AWS. The platform does not store the private .pem file or distribute it across computers.",
      warningBanner:
        "For deploy, the key pair only needs to exist in the right account and region. To connect later through SSH, the user must have the matching .pem on the computer they will use.",
      info:
        "Key pairs depend on the AWS account and region. This catalog does not create the key in AWS, but it helps declare it with context and reuse it correctly from the canvas.",
      registered: "Registered key pairs",
      search: "Search",
      searchPlaceholder: "Name, connection, course, or owner",
      scope: "Scope",
      all: "All",
      region: "Region",
      allRegions: "All",
      legend: {
        personal: "Personal: individual account",
        courseShared: "Course shared: course account",
        connection: "Linked cloud connection",
      },
      awsGuide: {
        title: "How to create a key pair in AWS",
        step1:
          "1. Sign in to the AWS account and open EC2 in the region where you will deploy.",
        step2:
          "2. Go to Network & Security → Key Pairs.",
        step3:
          "3. Choose Create key pair if you want AWS to generate a new one, or Import key pair if you already have a public key.",
        step4:
          "4. Save the downloaded .pem file in a safe place; AWS will not show the private key again.",
        step5:
          "5. Register here the exact same name with which it was created in AWS.",
        alert:
          "The platform uses the key pair name for deploy. The .pem file remains outside the system and you will only need it to connect via SSH.",
        docs: "View AWS documentation",
      },
      close: "Close",
    },
    keyPairModal: {
      overline: "AWS Key Pairs",
      title: "Register key pair",
      subtitle:
        "We store the name AWS knows for the key pair so we can suggest it later in the canvas.",
      infoBanner:
        "This form does not upload or store the private .pem file. It only registers the name of the key pair that already exists in AWS.",
      warningBanner:
        "If you later want to connect through SSH, the .pem must be on the computer from which you will make the connection.",
      awsHint:
        "In AWS you can create it from EC2 → Key Pairs → Create key pair, or import it with Import key pair if you already have a public key.",
      nameRequired: "The key pair name is required.",
      courseRequired: "You must choose a course for a shared key pair.",
      fields: {
        awsName: "Name in AWS",
        awsNamePlaceholder: "e.g. tesis-key-new",
        label: "Visible label",
        labelPlaceholder: "e.g. Course bastion",
        region: "Region",
        scope: "Scope",
        course: "Course",
        connection: "Optional cloud connection",
      },
      noExplicitLink: "No explicit link",
      connectionHelp:
        "Linking it to a connection helps explain in which account or course it should exist.",
      cancel: "Cancel",
      save: "Save key pair",
    },
  },
  labs: {
    title: "Labs",
    subtitle:
      "Manage your labs and open the canvas to edit topologies, validate intent, and prepare deployments.",
    createGuided: "Create guided",
    createLab: "Create lab",
    searchPlaceholder: "By name or id…",
    guided: "Guided",
    advanced: "Advanced",
    execution: "Execution",
    ownership: "Ownership",
    openLab: "Open lab",
    labActions: "Lab actions",
    guidedChip: "Guided",
    noOwner: "No owner",
    coursePrefix: "Course: {{value}}",
    visibilityPrefix: "Visibility: {{value}}",
    unresolvedConnection: "No resolved connection",
    awsAccountPrefix: "AWS account: {{value}}",
    duplicateError: "Could not duplicate the lab.",
    deleteError: "Could not delete it. Check the console.",
    updateError: "Could not update the lab.",
    defaultLabName: "Lab",
    copySuffix: "copy",
    deleteTitle: "Delete lab",
    deleteConfirm: "Are you sure you want to delete {{name}}?",
    editTitle: "Edit lab",
    parentCidr: "Parent CIDR",
    cidrPlaceholder: "10.64.0.0/12",
    cidrHelp: "CIDR format. This is the parent range of the lab.",
    region: "Region",
    cloudConnection: "Cloud connection",
    autoSelectOwnerCourse: "Auto-select by owner/course",
    connectionScopeCourse: "course",
    connectionScopePersonal: "personal",
    notesLabel: "Description, notes, or observations",
    notesHelp:
      "Optional. Useful for documenting the lab objective or leaving operational notes.",
    tourLabel: "View labs tour",
    cidrErrors: {
      format: "Use CIDR format, e.g. 10.0.0.0/16",
      prefix: "Invalid prefix (expected /8 to /30)",
    },
    executionSourceLabels: {
      lab_explicit: "Pinned on the lab",
      owner_personal_auto: "Auto -> personal account",
      course_shared_auto: "Auto -> course account",
      environment: "Server credentials",
      unresolved: "Unresolved",
    },
  },
  plans: {
    status: {
      success: "SUCCESS",
      failure: "FAILURE",
      running: "RUNNING",
      pending: "PENDING",
      loading: "Loading…",
      notFound: "Plan not found.",
    },
    list: {
      title: "Infrastructure executions",
      subtitle:
        "List of executions, both simulated and real. Use Outputs to debug without going to the AWS console.",
      refresh: "Refresh",
      refreshing: "Refreshing…",
      searchPlaceholder: "By name or plan_id…",
      statusFilter: "Status",
      columns: {
        plan: "Plan",
        ownership: "Owned by",
        status: "Status",
        updated: "Updated",
        actions: "Actions",
      },
      empty: "There are no plans to display.",
      loadingError: "Error loading plans",
      destroyConfirm:
        "Destroy \"{{label}}\"? This will remove AWS resources associated with this plan.\n\nSuggestion: validate Outputs first.",
      destroyError: "Error destroying plan",
      ownerUnavailable: "Owner unavailable",
      noLab: "No lab",
      noCourse: "No course",
      lastAction: "Last action: {{value}}",
      visibility: "Visibility: {{value}}",
      canvasPrefix: "canvas: {{value}}",
      outputs: "Outputs",
      destroy: "Destroy",
      detail: "View details",
      actionMenu: "Actions",
      resultTooltip: "Terraform job result",
      lifecycleTooltip: "Current logical state of the plan",
      modeTooltip: "Simulated (plan) or real execution in AWS",
      destroyNote:
        "Note: the Destroy button is enabled only when the plan is destroyable, but the backend validates the rule again.",
      tourLabel: "View plans tour",
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
      back: "Back",
      goToCanvas: "Go to canvas",
      loading: "Loading plan…",
      runningConflict:
        "Plan is running. Wait for it to finish before launching another action.",
      cloudMismatchApply:
        "The current cloud connection no longer matches the one used in the last real APPLY. Review the current account before executing real infrastructure.",
      realExecutionForbidden:
        "Real APPLY and Destroy are only allowed for the owner, the platform admin, or the teacher when the effective connection is course_shared. You can keep using PLAN for review.",
      deployStarted: "Deploy {{mode}} started.{{task}} (updating status…)",
      deployFailed: "Failed to start deploy: {{error}}",
      finishedStatus: "Finished: {{status}}{{error}}",
      outputsLoadError: "Could not load outputs: {{error}}",
      logReadError: "Could not read the log: {{error}}",
      logsLoadError: "Could not load logs: {{error}}",
      noRealExecutionPermission:
        "You do not have permission to execute real infrastructure in this lab.",
      cloudMismatchDestroy:
        "The current cloud connection no longer matches the one used in the last real APPLY. Real destroy is blocked to avoid operating on the wrong account.",
      destroyConfirm:
        "This will destroy the AWS resources associated with THIS plan.\n\nContinue?",
      destroyQueued: "Destroy queued{{task}}. Check Logs to follow progress.",
      autoDestroyScheduled:
        "Automatic destroy scheduled for {{date}}. This view refreshes itself to detect when it starts.{{task}}",
      autoDestroyStarted:
        "Automatic destroy has started. The infrastructure is now being destroyed{{task}}.",
      destroyFailed: "Failed to start destroy: {{error}}",
      noDestroyPermission:
        "You do not have permission to destroy real infrastructure in this lab.",
      redeployApply: "Redeploy (APPLY)",
      redeployPlan: "Redeploy (PLAN)",
      deployApply: "Deploy (APPLY)",
      deployPlan: "Deploy (PLAN)",
      applyMode: "APPLY mode (real)",
      planMode: "PLAN mode (preview)",
      launching: "Launching…",
      destroying: "Destroying…",
      canvasUpdatedAlert:
        "Plan updated from canvas. There are pending changes; run Deploy to apply the new infrastructure.",
      cloudMismatchAlert:
        "The current cloud connection no longer matches the one used in the last real APPLY.",
      executionControl: "Execution control",
      updated: "Updated",
      currentTask: "Current task",
      canvasChanged:
        "The canvas changed: the deployed infrastructure, if it existed, no longer matches this plan.",
      activeAutoRefresh: "Automatic refresh active",
      taskLabel: "Task: {{value}}",
      lastActionLabel: "Last action: {{value}}",
      controlTitle: "Execution control",
      labNotes: "Lab notes",
      lifecycleHelper: {
        destroying: "Destroy is running: removing infrastructure in AWS.",
        deploying: "Deploy is running: applying changes in AWS.",
        activePreview:
          "Infrastructure is active in AWS. The latest plan was a preview over the existing stack; the next apply will update resources in the same deployment.",
        active: "Infrastructure is active in AWS.",
        destroyed: "Infrastructure was removed from AWS.",
        preview: "Simulated: it has never been applied in AWS.",
        recovery:
          "The real apply failed. There may be partial AWS resources: run Destroy before retrying.",
        notAppliedCanvas:
          "Changes detected from the canvas: ready to apply in AWS.",
        notApplied: "Real plan not applied yet.",
      },
      runningPhase: {
        applyTitle: "Applying changes in AWS",
        applyDescription:
          "Terraform is executing the real apply on the infrastructure. Resources may take a few minutes to complete and this view will update automatically.",
        applyNext:
          "If you want technical detail, open the Logs tab and follow the apply progress.",
        destroyTitle: "Removing infrastructure in AWS",
        destroyDescription:
          "Destroy is tearing down the current stack. During this phase we block new actions to avoid inconsistent states.",
        destroyNext:
          "When it finishes, review Outputs and Logs to confirm that no active resources remain.",
        planTitle: "Generating plan preview",
        planDescription:
          "Terraform is calculating the impact of the change before applying anything in AWS. As soon as it finishes, you will be able to review the risk summary.",
        planNext:
          "Wait until SUCCESS or FAILURE appears before launching another action.",
        genericTitle: "Processing request",
        genericDeployTitle: "Processing plan execution",
        genericDescription:
          "There is an operation in progress on this plan and the page is polling automatically to reflect the result as soon as it is available.",
        genericNext:
          "In the meantime, avoid closing the flow or launching parallel actions on the same plan.",
      },
      hero: {
        activeTitle: "Infrastructure active in AWS",
        activeDescription:
          "The stack is deployed and ready for further validation, update through redeploy, or destruction whenever you want to clean up the lab.",
        destroyedTitle: "Infrastructure removed",
        destroyedDescription:
          "The latest destroy finished successfully. This plan remains as operational history and you can launch a real deploy again whenever you need it.",
        previewTitle: "Plan ready for validation",
        previewDescription:
          "There is no real infrastructure in AWS yet. You can keep reviewing the preview or turn it into a real APPLY when you are satisfied.",
        recoveryTitle: "Recommended recovery",
        recoveryDescription:
          "The real apply failed and there may be partial resources. The next recommended action is to clean up the stack before retrying.",
        firstDeployTitle: "Ready for first deploy",
        firstDeployDescription:
          "The plan is prepared but has not yet been applied in AWS. You can run a preview or the first real APPLY depending on the case.",
        defaultTitle: "Operational plan state",
      },
      actionAvailability: {
        running:
          "There is an execution in progress. Wait for it to finish before launching another action.",
        applyForbidden:
          "This plan is visible for review. Real APPLY and Destroy are only allowed to the owner, the platform admin, or the teacher when the effective connection is course_shared.",
        activeInfra:
          "Active infrastructure: you can revalidate, redeploy over the same stack, or destroy it.",
        firstDeploy:
          "Plan ready for its first deploy. Destroy does not apply yet because there is no active infrastructure.",
        preview:
          "Plan in preview mode: you can keep validating or launch the first real deploy.",
        recoverable:
          "There are resources or recoverable state: destroy is available to clean the stack.",
      },
      tabs: {
        summary: "Summary",
        outputs: "Outputs",
        tests: "Tests",
        logs: "Logs",
        payload: "Payload",
      },
      summary: {
        sectionTitle: "Plan status",
        sectionSubtitle:
          "Quick reading of the latest result and the current operational state.",
        intro:
          "This detail helps you understand what happened (status), what exists today (lifecycle), and which actions are valid (deploy/destroy).",
        introCaption:
          "Status shows the latest execution; lifecycle shows what exists today in AWS.",
        lastExecution: "Latest execution",
        result: "Result:",
        date: "Date:",
        nextRealExecution: "Next real execution",
        executionResolvedNoIdentity:
          "The connection is resolved, but we still do not have visible STS identity. Use Test in Cloud Connections to register account and ARN.",
        cloudAccountReconciliation: "Cloud account reconciliation",
        cloudAccountNoInfo:
          "Not enough information to reconcile the cloud account.",
        lastApplyEvidence: "Evidence from the last real APPLY",
        noRealSnapshot:
          "There is no stored real execution snapshot for this plan yet. It will appear after the first real APPLY.",
        recentHistory: "Recent execution history",
        noHistory: "There are no recorded executions for this plan yet.",
        riskTitle: "Risk from the latest plan",
        loadLogsHint:
          "Load the logs tab to summarize what Terraform detected in the latest plan.",
        riskDestructive:
          "Changes with resource destruction or replacement were detected.",
        riskCaution: "Changes on existing resources were detected.",
        riskSafe: "Additive changes were detected.",
        riskNone: "No changes were detected in the latest plan.",
        advisoryTitle: "Cost, leftovers, and technical reading",
        advisoryCaption:
          "This block is calculated from the payload, loaded outputs, and the current state of the plan.",
        advisoryCost: "1. Potential cost",
        advisoryResidual: "2. What may remain after Destroy",
        advisoryPedagogy: "3. Pedagogical and technical reading",
        advisoriesText: {
          realApply:
            "This plan uses a real APPLY or was partially applied: it may generate AWS cost while active resources exist.",
          preview:
            "In PLAN/preview mode, no real resources are created, so this plan should not generate direct AWS cost.",
          destroyed:
            "The main stack appears destroyed. If you did not leave external or residual resources, this plan should no longer generate the main cost.",
          instances:
            "{{count}} declared EC2 instance(s): they generate compute cost and, usually, storage cost while they exist.",
          nat:
            "{{count}} NAT Gateway(s): AWS charges per provisioned hour and per processed traffic while they remain active.",
          publicIpv4:
            "{{count}} public IPv4 address(es) in use according to outputs: AWS charges for public IPv4 addresses in use.",
          tgw:
            "{{routers}} TGW router(s) and {{attachments}} attachment(s): Transit Gateway adds attachment/hour and processed traffic charges.",
          peering:
            "{{count}} peering link(s): creating the peering does not add a fixed charge, but peering traffic may incur charges depending on the transfer pattern.",
          vpcBase:
            "The VPC itself does not have an additional charge just for existing, but some associated components do.",
          providedEips:
            "{{count}} EIP(s) were manually provided to the NAT. Destroy does not release them for safety; they may continue generating public IPv4 cost while reserved in your account.",
          autoEip:
            "If the NAT used an auto-generated EIP from the stack, Destroy tries to remove both the NAT and that EIP. If you still see an Elastic IP, check whether it belongs to another resource or a previous deploy.",
          outputsHistorical:
            "The outputs stored on this page are historical for audit/debug. They are not live AWS resources and do not generate cost by themselves.",
          dhcpDefault:
            "AWS keeps a default DHCP option set per region. This project does not create a dedicated one, so seeing it in the console does not mean destroy left a residual from this stack.",
          failedApply:
            "If a real APPLY fails, partial infrastructure may remain. In that state you should run Destroy and review logs before applying again.",
          natPrivate:
            "Pedagogically, this lab separates egress and exposure: NAT allows outbound traffic from private subnets, but not inbound access from the Internet.",
          publicPrivateMix:
            "You have {{publicCount}} public subnet(s) and {{privateCount}} private subnet(s): this is a good case to observe a public bastion plus a private workload.",
          fixedEip:
            "Using your own EIP fixes the NAT's outbound identity, but it also leaves its lifecycle under operator responsibility.",
          peeringLearning:
            "Peering teaches point-to-point connectivity: you need explicit routes in both directions to obtain full communication.",
          tgwLearning:
            "Transit Gateway teaches a hub-and-spoke model: it simplifies multipoint topologies, but adds cost and an extra routing layer.",
          noInstances:
            "Without instances, this plan is useful to study topology and routing, but not to validate end-to-end connectivity inside the lab.",
        },
        requestedBy: "Requested by:",
        connection: "Connection:",
        identity: "Identity:",
        start: "Start:",
        end: "End:",
        provider: "Provider: {{value}}",
        source: "Source: {{value}}",
        region: "Region: {{value}}",
        scope: "Scope: {{value}}",
        effectiveConnection: "Effective connection:",
        plannedAwsAccount: "Expected AWS account:",
        knownArn: "Known ARN:",
        usedConnection: "Used connection:",
        awsAccount: "AWS account:",
        arn: "ARN:",
        stsUserId: "STS UserId:",
        capturedAt: "Captured:",
        auditIdentityError:
          "Could not resolve STS while capturing the audit: {{error}}",
        envCredentials: "Environment credentials",
      },
      outputs: {
        title: "Outputs",
        subtitle:
          "A summary designed to quickly understand what was created in AWS without getting lost in too many IDs.",
        infoAws: "AWS info",
        awsInfoIntro:
          "This view summarizes the translation from the canvas to real AWS resources. Codes such as `vpc-...`, `igw-...`, `tgw-...`, and `tgw-attach-...` are real IDs created by AWS.",
        loadOutputs: "Load outputs",
        loadingOutputs: "Loading…",
        notLoaded:
          "Outputs have not been loaded yet. Click Load outputs.",
        empty:
          "The backend responded correctly, but there are no stored outputs for this plan.",
        fullJsonTitle: "Full JSON",
        jsonCaption:
          "Use this only if you need to inspect all the raw outputs returned by the backend.",
        showJson: "View full JSON",
        hideJson: "Hide JSON",
        connectivitySummary: "Connectivity summary",
        connectivityCaption:
          "Look at these three cards first. If you need to debug something specific, then go down to the IDs by VPC or TGW.",
        model: "Model",
        modeLabels: {
          isolated: "Isolated",
          peering: "Peering",
          transitGateway: "Transit Gateway",
        },
        modeDescriptions: {
          isolated:
            "There is no active cross-segment connectivity; each VPC works in isolation.",
          peering:
            "VPCs communicate through direct pair links. Active peerings: {{count}}.",
          transitGateway:
            "The lab uses a central AWS hub to route traffic between segments. Active TGWs: {{count}}.",
        },
        expectedConnectivity: "Expected connectivity",
        awsTranslation: "AWS translation",
        connectedPairs: "{{count}} connected pair(s)",
        activePeerings: "Active peerings: {{count}}",
        activeTgw: "Active TGWs: {{count}}",
        attachments: "{{count}} TGW attachment(s)",
        declaredPeeringsTgw:
          "Declared: peerings {{peerings}}, TGW {{tgw}}.",
        vpcInfra: "Highlighted infrastructure by VPC",
        vpcInfraCaption:
          "Here you only see the most useful identifiers for each AWS segment.",
        instancesDetected: "Detected instances",
        privateIp: "Private: {{value}}",
        publicIp: "Public: {{value}}",
        transitGatewayInfra: "Transit Gateway infrastructure",
        transitGatewayCaption:
          "This block only appears if the lab uses a central AWS Transit Gateway hub.",
        logicalRouter: "Logical router: {{value}}",
        attachment: "Attachment",
        awsGuideConnectivity: {
          mode:
            "Declared mode: the connectivity model the canvas is requesting. It can be Isolated, Peering, or Transit Gateway.",
          expectedPairs:
            "Expected connected pairs: how many segment pairs should be able to communicate according to the payload and declared routes.",
          peerings:
            "Active peerings: number of VPC Peering connections actually created in AWS.",
          tgws:
            "Active TGWs: number of Transit Gateways actually created in AWS.",
          attachments:
            "TGW attachments: joins between a VPC and the Transit Gateway. Without an attachment, the VPC does not enter the hub.",
        },
        awsGuideVpc: {
          vpc: "VPC: the segment's main virtual network in AWS.",
          igw:
            "IGW: Internet Gateway. It enables Internet ingress/egress for public subnets with the proper routes.",
          nat:
            "NAT: NAT Gateway. It lets private subnets reach the Internet without becoming public.",
          natEip: "NAT EIP: Elastic IP associated with the NAT Gateway.",
        },
        awsGuideTgw: {
          logicalRouter:
            "Logical router: identifier of the canvas node. It links the design with AWS resources.",
          tgw: "TGW: AWS Transit Gateway. It acts as the central connectivity hub.",
          routeTable: "TGW RT: internal route table of the Transit Gateway.",
          attachment: "Attachment: physical/logical connection between a VPC and the TGW.",
        },
        backendStatus: "backend_status: {{value}}",
        appliedTrue: "APPLIED: true",
        appliedFalse: "APPLIED: false",
      },
      tests: {
        title: "Post-deploy test guide",
        subtitle:
          "Define connectivity checks between VPCs, guided validations for a VPC with NAT, or basic direct access checks to a public bastion.",
        loadOutputs: "Load outputs for tests",
        consoleGuide: "How to test in the console",
        introAlert:
          "Open the instruction modal to see the console step by step: how to SSH into a public bastion and then run the suggested commands, either between VPCs, inside a VPC with NAT, or in a single-VPC lab with direct public exposure.",
        needOutputs:
          "Load outputs to identify real instances/IPs and run guided checks.",
        empty:
          "This plan does not expose VPC pairs connected by peering/TGW, a single-VPC case with NAT, or a public bastion with direct access that we can guide from here.",
        modeLabels: {
          none: "No mode",
          mixed: "Mixed",
          peering: "Peering",
          transitGateway: "Transit Gateway",
        },
        routersInvolved: "Routers involved: {{value}}",
        insufficientRoundTrip:
          "There are not enough instance outputs to generate a round-trip check for this pair.",
        forwardCheckTitle: "Forward check ({{from}} -> {{to}})",
        returnCheckTitle: "Return check ({{from}} -> {{to}})",
        runInsidePublic: "Run inside {{name}} ({{value}})",
        runInsideInstance: "Run inside {{name}} ({{value}})",
        runInsidePublicVpc:
          "Run inside {{name}} ({{value}}) to validate private reachability inside the VPC",
        bastionToWorkloadTitle: "From {{bastion}} to {{workload}}",
        confirmSshTitle: "Confirm SSH access to {{name}}",
        confirmSshContext:
          "Use this to verify that the public instance is reachable. If AWS generated the key pair, your private key is usually a `.pem`; if you imported a public key, use the matching local private key.",
        publicSshContext:
          "Use this to validate that the public instance was exposed correctly and that your IP is allowed in Allowed SSH CIDR. AWS only receives the key pair name ({{keyPair}}); here you must use the real private key stored on your computer.",
        managedEgressTitle: "{{name}} · private egress with NAT",
        managedEgressNoPrivateTitle: "{{name}} · NAT without private zones",
        singleVpc: "Single VPC",
        managedEgress: "Managed egress",
        natZone: "NAT on public zone: {{subnet}} · NAT ID: {{natId}}",
        missingManagedOutputs:
          "Missing bastion or private workload outputs to generate the suggested command.",
        observeBastionAndPrivate:
          "What to watch: the public bastion should have a public IP and the private workload should not.",
        observeBastionPublic:
          "What to watch: the public bastion should have a public IP.",
        observePrivateReachability:
          "What to watch: the bastion should reach the private workload IP inside the same VPC.",
        observeNatBehavior:
          "What to watch: NAT gives egress to the private subnet, but it does not make the workload public.",
        observeNatNoPrivate:
          "What to watch: the NAT was created correctly, but in this design there are no private subnets taking advantage of it.",
        observeCostBenefit:
          "What to watch: this case is useful to teach cost/benefit. The segment still works, but NAT adds complexity here without providing private isolation.",
        publicAccessTitle: "{{name}} · direct public access",
        publicBastion: "Public bastion",
        bastionPublicIp: "Bastion: {{name}} · Public IP: {{value}}",
        observePublicSsh:
          "What to watch: the bastion should accept SSH only from the range defined in `Allowed SSH CIDR`.",
        observePublicExposure:
          "What to watch: this design exposes an instance directly to the Internet. It is useful for a quick validation, but offers less isolation than a pattern with a private workload.",
        expectedResult:
          "Expected result: each connected pair should answer ping in both directions. In a single-VPC case with NAT, the bastion should reach the private workload and that workload should remain without a public IP. In a case with a direct public bastion, the minimum validation is to confirm SSH access and understand that isolation is lower than in a pattern with a private subnet.",
      },
      logs: {
        title: "Plan logs",
        subtitle:
          "The log always corresponds to the latest execution, whether deploy or destroy.",
        streaming: "Live streaming",
        viewLog: "View plan log",
        empty:
          "Click View plan log to display the log from the latest execution.",
        currentLog: "This log corresponds to the latest plan execution.",
        updatedAt: "Latest log update:",
        autoScroll:
          "The viewer automatically scrolls to the end while execution is still active.",
        terraformSummary:
          "Terraform summary: {{add}} add, {{change}} change, {{destroy}} destroy, {{replace}} replace.",
        newLines: "Newly added log lines are highlighted.",
      },
      payload: {
        title: "Payload",
      },
      guide: {
        awsTitle: "Quick AWS infrastructure guide",
        close: "Close",
        consoleTitle: "How to test connectivity from the console",
        consoleIntro:
          "First connect through SSH to a public bastion. Then, from that instance, run the suggested commands in this same tab to validate cross-VPC connectivity or private reachability within a VPC with NAT.",
        step1: "1. Prerequisites",
        step1Text:
          "You need the aws CLI, access to the private key associated with the key pair used to deploy the instance, and your public IP must be allowed in Allowed SSH CIDR.",
        step2: "2. Bastions detected in this lab",
        step3: "3. If you already have the corresponding private key, connect through SSH",
        step3Text:
          "If AWS generated the key pair, you will usually use a .pem file. If you imported a public key from your computer, use the associated local private key even if it does not have a .pem extension.",
        step4: "4. If you do not have the private key, use EC2 Instance Connect",
        step4Text:
          "AWS does not allow downloading the private key of an existing key pair. In that case, you can inject a temporary public key and connect with an ephemeral key.",
        step5: "5. Run the checks from the bastion",
        instanceLabel: "Instance: {{name}} · instance_id: {{value}}",
        publicPrivateIp:
          "Public IP: {{publicIp}} · Private IP: {{privateIp}}",
        regionAzKeyPair: "Region/AZ: {{region}} / {{az}} · Key pair: {{keyPair}}",
        consoleExpected:
          "Expected result: each connected pair should answer ping both ways. In a lab with NAT, the bastion should reach the private workload and that workload should not have a public IP. If the lab only has a public zone, the useful validation is to confirm bastion SSH access and understand that NAT was deployed but is not providing egress to a private subnet. If something fails, review route tables, Security Groups, key pair, and Allowed SSH CIDR.",
        connectivityTitle: "Connectivity",
        vpcInfraTitle: "Infrastructure by VPC",
        tgwInfraTitle: "Transit Gateway infrastructure",
        practicalRule:
          "Practical rule: first look at the connectivity mode and expected pairs; then drill down to IDs only if you need to debug or verify a specific AWS resource.",
      },
      tourLabel: "View plan tour",
    },
  },
  canvas: {
    sidebar: {
      title: "Tool palette",
      subtitle: "Drag components onto the canvas",
      categories: {
        networking: "Networking",
        compute: "Compute",
        routing: "Routing",
      },
      items: {
        vpc: {
          label: "Network Segment",
          description:
            "Logical container that defines a main network segment. In AWS it translates to a VPC.",
        },
        subnetwork: {
          label: "Zone Segment",
          description:
            "CIDR zone inside a network segment where workloads live.",
        },
        instance: {
          label: "Workload",
          description:
            "Workload or virtual machine inside a zone.",
        },
        router: {
          label: "Connectivity Policy",
          description:
            "Logical node that defines how segments communicate with each other.",
        },
      },
    },
    workspace: {
      title: "Architecture canvas",
      emptyTitle: "Design your network lab",
      emptyDescription:
        "Model the topology in a neutral language, validate its AWS translation, and decide whether a deploy or redeploy makes sense.",
      emptyHint:
        "Use the floating Tools button to open the palette and start dragging components.",
      palette: {
        open: "Open modeling tools",
        hide: "Hide modeling tools",
      },
      guide: {
        open: "Open modeling guide",
        hide: "Hide modeling guide",
      },
    },
    feedback: {
      outdatedTitle: "Canvas out of date with respect to the plan",
      outdatedDescription:
        "This canvas changed since the last validation associated with the plan. If you keep editing, the plan will no longer represent exactly what you see on screen.",
      planRunningLock:
        "There is a plan running. Review the plan before editing the canvas.",
      viewPlan: "View plan",
      revalidate: "Revalidate",
      keepEditing: "Keep editing",
    },
    createLab: {
      error: "Could not create the lab.",
      networkTitle: "Create network lab",
      networkSubtitle:
        "Create a lab to model network topologies and leave it ready for validation and deployment. Define name, region, and the parent CIDR.",
      guidedTitle: "Create lab",
      guidedSubtitle:
        "Create a guided educational lab: model network topologies step by step and leave it ready for a real execution.",
      stepLabel: "Step {{current}} of {{total}}",
      guidedEyebrow: "Guided lab",
    },
    form: {
      courseRequired: "You must select a course.",
      stepOneTitle: "Step 1: Configure the lab",
      stepOneDescription:
        "Define the name, region, and parent range (CIDR). With that we can guide the rest of the flow (segments, zones, workloads, and tests).",
      cidrTip:
        "Tip: use a /16 range so you have comfortable space for subnets (/24) without fighting the IP plan.",
      awsOnlyInfo:
        "In this MVP, AWS has real validation and deployment. GCP can already be modeled in the canvas to demonstrate frontend extensibility, even though its runtime is still planned.",
      cloudProvider: "Cloud provider",
      useAwsHint:
        "For this MVP, use AWS if you want to deploy real infrastructure.",
      designRuntimeHint:
        "{{provider}} can already be designed in the canvas, but its real runtime is still planned.",
      labTemplate: "Lab template",
      chooseTemplate: "Choose the use case you want to build step by step.",
      useRecommendedCidr: "Use recommended CIDR ({{value}})",
      templateCanvasHint:
        "When you create the lab, this template will load an initial canvas coherent with the chosen case.",
      customTemplateWarning:
        "This template was prepared on the suggested CIDR {{value}}. If you change the parent range, later review segment CIDRs, subnets, and fixed IPs in the canvas to adjust them manually if needed.",
      labName: "Lab name",
      labNameWizardPlaceholder: "Ex: Lab-Routing-1",
      labNamePlaceholder: "Ex: Peering-Lab-1",
      labNameHelp:
        "This name will appear in the list and will be the main reference for the lab.",
      notesPlaceholder:
        "Ex: Lab to validate a public VPC with bastion, SSH tests, and evidence for the defense.",
      courseSelectionRequired:
        "Select the course to which the lab will be shared.",
      courseOptional: "Optional for administrators.",
      cloudConnectionHelp:
        "You can pin a specific AWS connection or let the backend resolve the owner's personal one and then the course shared one.",
      executionTarget: "Execution target",
      executionTargetPlannedTitle: "Planned execution binding for {{provider}}",
      executionTargetPlannedBody:
        "{{provider}} can already be designed in the canvas, but its real runtime is not yet bound from this form. When enabled, this step will link the effective provider target: {{target}}.",
      executionTargetPlannedPreview:
        "This lab will be ready for design in {{provider}}. The real execution binding will be connected later when its runtime becomes available.",
      accountLabel: "account",
      executionPreviewResolved:
        "Planned execution: {{name}}{{account}}. {{helper}}",
      awsOnlyExecution:
        "In this MVP, only AWS can resolve a real executable connection.",
      designOnlyExecution:
        "This provider is already enabled for topology design in the canvas, but its real execution path is not available yet.",
      executionSource: {
        explicit: "The explicitly selected connection will be used.",
        ownerPersonalAuto:
          "Auto will resolve the owner's personal account first.",
        courseSharedAuto:
          "Auto will resolve the course shared account.",
        unresolved: "There is no resolved executable connection yet.",
      },
      masterCidr: "Parent range (CIDR)",
      masterCidrWizardPlaceholder: "Ex: 10.20.0.0/16",
      masterCidrPlaceholder: "10.30.0.0/20",
      masterCidrWizardHelp:
        "This will be the parent block. If you use a template and change it, later review the preloaded addressing in the canvas.",
      masterCidrHelp:
        "Parent range from which segments and zones will be derived.",
      selectedRegion: "Selected region: {{value}}",
      continue: "Continue",
      providerFields: {
        gcpProjectProfile: "GCP project profile",
        gcpProjectProfileHelp:
          "Reference profile for the lab. Useful to show how a provider can expose predefined options from the catalog.",
        gcpProjectId: "GCP project ID",
        gcpProjectIdHelp:
          "Optional for now. It lets you make explicit which project you want to use once real GCP runtime is enabled.",
        gcpProjectIdPlaceholder: "e.g. tesis-network-lab",
        azureLandingZone: "Azure subscription context",
        azureLandingZoneHelp:
          "Reference context for the lab. Useful to demonstrate provider-specific selects defined through configuration.",
        azureSubscriptionAlias: "Azure subscription alias",
        azureSubscriptionAliasHelp:
          "Optional for now. You can use it to document which subscription or context you expect to bind once real runtime is enabled.",
        azureSubscriptionAliasPlaceholder: "e.g. tesis-azure-sandbox",
        options: {
          gcpSandbox: "Sandbox",
          gcpSharedLab: "Shared lab",
          gcpProductionLike: "Production-like",
          azureStudentSubscription: "Student subscription",
          azureSharedCourseSubscription: "Course shared subscription",
          azureNetworkSandbox: "Network sandbox",
        },
      },
      providerStatus: {
        ready: "Ready for validation and deploy",
        planned: "Coming soon",
        unknown: "Availability not confirmed",
      },
    },
    vpcForm: {
      headerEyebrow: "network segment",
      headerTitle: "Network Segment",
      headerSubtitle:
        "Define address space, internet exposure, and egress behavior for this segment. AWS translation: VPC.",
      headerSubtitleProvider:
        "Define address space, internet exposure, and egress behavior for this segment. {{provider}} reading: {{kind}}.",
      networkFallback: "network",
      snackbar: {
        autoSelectNatSubnet: 'The public zone "{{value}}" was selected automatically for the NAT.',
        noPublicSubnetsForNat: "There are no public zones available to place the NAT Gateway.",
        natWithoutPrivateZones:
          "Managed egress is enabled, but there are still no private zones that benefit from that NAT.",
        selectNatPublicZoneBeforeSave:
          "You must select a public zone for the NAT before saving.",
        createPublicZoneFirst:
          "Create a public zone first to enable managed egress.",
      },
      fields: {
        segmentName: "Segment name",
        segmentCidr: "Segment CIDR block (inside {{parent}})",
        segmentCidrPlaceholder: "10.30.0.0/20",
        region: "Region",
        internetEdge: "Internet edge",
        enabled: "Enabled",
        disabled: "Disabled",
        publicZoneForEgress: "Public zone for egress",
        selectPublicZone: "Select a public zone",
        publicZoneHelp:
          "Create a public zone inside this segment first to host managed egress.",
        natEip: "Elastic IP Allocation ID (optional, AWS)",
        natEipPlaceholder: "eipalloc-0123456789abcdef0",
        natEipHelpEnabled:
          "If you leave it empty, AWS will assign a new Elastic IP. If you already reserved one, enter its real Allocation ID (`eipalloc-...`), not the public IP.",
        natEipHelpDisabled: "Only applies if you enable managed egress.",
        allowedSsh: "Allowed SSH CIDR (optional)",
        allowedSshPlaceholder: "203.0.113.5/32",
        allowedSshHelp:
          "Ex: 203.0.113.5/32. This creates a Security Group rule to allow SSH from your public IP.",
      },
      info: {
        title: "What this segment means",
        cidr: "- The CIDR defines the main address range of the segment.",
        internetEdge:
          "- Internet edge enables direct public egress where proper routes exist.",
        managedEgress:
          "- Managed egress gives outbound access to private zones, but not inbound Internet access.",
        elasticIp:
          "- In AWS, if you define an Elastic IP for egress, it must be a real Allocation ID (`eipalloc-...`), not a public IP.",
        providerInternetModel:
          "- In this provider, public exposure and egress are better explained with its own primitives such as Cloud NAT, default routes, or external IPs per workload.",
        allowedSsh:
          "- Allowed SSH CIDR opens TCP/22 only from the IP or network you declare.",
      },
      chips: {
        igwEnabled: "AWS: creates Internet Gateway",
        igwDisabled: "AWS: no Internet Gateway",
        natEnabled: "AWS: creates NAT Gateway",
        natDisabled: "AWS: no NAT Gateway",
        privateZones: "Private zones: {{count}}",
        sshExposed: "Security: SSH exposed to CIDR",
        sshHidden: "Security: no external SSH",
      },
      alerts: {
        noPublicZones:
          "There are no public zones in this VPC. Create one to enable managed egress.",
        topologyReady:
          "You already have a topology that fits private egress: one public zone and one private zone. If you want private zones to reach the Internet without becoming public, enable",
        natWithoutPrivateZones:
          "Managed egress is active, but this VPC has no private zones. The NAT can be created, but you will not be solving the main teaching case of controlled private egress.",
        demoCase:
          "Good demo case: the NAT will live in a public zone and provide egress to the private zones of this VPC.",
      },
      gcpInternetHint:
        "In GCP we do not model an Internet Gateway per VPC. Public access is better explained with external VM IPs and Cloud NAT for private egress.",
      gcpSwitchLabel: "Enable Cloud NAT",
      gcpFields: {
        allowedSsh: "SSH source ranges (Firewall)",
        allowedSshPlaceholder: "203.0.113.5/32",
        allowedSshHelp:
          "In GCP this represents a conceptual firewall rule that allows SSH from that range.",
      },
      gcpChips: {
        internetModel: "GCP: public egress via external IP / default routes",
        natEnabled: "GCP: Cloud NAT enabled",
        natDisabled: "GCP: no Cloud NAT",
      },
      gcpAlerts: {
        demoCase:
          "Good demo case: Cloud NAT will provide egress for private workloads without making the whole subnet public.",
      },
      tooltip: {
        enableNatBlocked:
          "Create a public zone first to enable managed egress.",
        saveBlocked:
          "Select a public zone for managed egress before saving.",
      },
      switchLabel: "Enable managed egress",
      actions: {
        save: "Save configuration",
        delete: "Delete node",
        saveHint: "You must select a public zone for managed egress.",
      },
    },
    instanceForm: {
      headerEyebrow: "workload node",
      headerTitle: "Instance",
      headerSubtitle:
        "Configure naming, addressing, and runtime profile for this VM.",
      subnetFallback: "subnet",
      sections: {
        identity: {
          eyebrow: "Identity and network",
          title: "Name and private IP",
          helper:
            "First define how this VM will appear inside the segment and whether you want to pin an IP.",
        },
        runtime: {
          eyebrow: "Runtime",
          title: "Image and size",
          helper:
            "Here you decide which AMI creates the instance and what machine size will be reserved.",
          helperProvider:
            "Here you decide which {{imageLabel}} to use and which {{instanceTypeLabel}} {{provider}} will model for this workload.",
        },
        ssh: {
          eyebrow: "SSH access",
          title: "Key pair and compatibility",
          helper:
            "Here you choose the key pair reference AWS will look for when launching the instance.",
          titleProvider: "Administrative access",
          helperProvider:
            "Here you define the {{sshField}} value that {{provider}} will use to represent administrative access to the workload.",
        },
      },
      fields: {
        name: "Instance name",
        privateIp: "Private IP (inside {{subnet}})",
        privateIpHelp: 'Leave it empty or write "auto" for automatic assignment.',
        privateIpPlaceholder: "10.10.0.10  •  or write: auto",
        ami: "AMI",
        useDefaultAmi: "Use default AMI",
        amiFallback:
          "No AMIs are configured in the catalog. If you leave it empty, the backend will use the default AMI.",
        instanceType: "Instance type",
        sshAccess: "SSH access (key pair)",
        sshAccessHelp:
          "Choose a compatible key pair or type the name manually.",
        sshAccessManualHelp:
          "Optional. You can manually type the name of an existing key pair in AWS.",
        sshAccessPlaceholder: "e.g. tesis-key",
      },
      gcpFields: {
        imageFamily: "Image family",
        imageFamilyHelp:
          "Ex: debian-12, ubuntu-2204-lts, or cos-stable. In GCP the image is usually resolved through family + project.",
        imageProject: "Image project",
        imageProjectHelp:
          "Ex: debian-cloud or ubuntu-os-cloud.",
        sshUser: "SSH username",
        sshUserHelp:
          "Username that could later be propagated through metadata or OS Login, depending on the final provider strategy.",
        metadataHint:
          "In GCP, SSH access does not rely on an AWS-like key pair; it is usually modeled with metadata, OS Login, or keys managed outside the VM.",
      },
      quickTips: {
        title: "Quick tips",
        privateIp:
          "The private IP must belong to the parent subnet. If you use auto, the provider will assign an available IP.",
        publicIp:
          "A public IP does not replace the private IP: it depends on the subnet and the deploy policy.",
      },
      scope: {
        courseShared: "Course shared",
        personal: "Personal",
        unknown: "unknown",
      },
      snackbar: {
        scopeMismatch:
          "The selected key pair is {{scope}}, but this lab will deploy with a {{executionScope}} connection.",
        connectionMismatch:
          "The selected key pair is linked to another cloud connection. Verify that it exists in the effective deploy account.",
      },
      compatibility: {
        scopeReason: "scope {{value}}",
        regionReason: "region {{value}}",
        otherConnection: "another connection",
        mismatch: "Does not match because of {{reasons}}",
        match: "Compatible with this lab",
        compatible: "Compatible",
        review: "Review",
        selectedCompatible: "Key pair compatible with this lab",
      },
      catalogHint:
        "The catalog prioritizes key pairs compatible with the effective connection and region, and still lets you type a name manually.",
      executionRegion: "Effective region: {{value}}",
      hiddenOptions:
        "We hid {{count}} key pair option(s) from the catalog because they do not match the effective cloud connection or region of this lab.",
      alerts: {
        arm64:
          "Types t4g.* use ARM architecture (Graviton). Make sure you choose an ARM64-compatible AMI.",
        scopeMismatch: {
          before: "The selected key pair is of type",
          middle:
            "but this lab is resolving a cloud connection of type",
          after:
            "AWS might not find that key pair in the effective deploy account.",
        },
        connectionMismatch:
          "The selected key pair is linked to another cloud connection. Verify that it also exists in the account this lab will really use to deploy.",
      },
      systemValidation: {
        title: "What the system validates",
        deploy:
          "Deploy validates that the key pair exists in the effective account and region.",
        ssh:
          "Subsequent SSH access still depends on you having the .pem file outside the platform, on the machine from which you will connect.",
        deployProvider:
          "Payload validation checks that {{provider}} receives a coherent configuration for image, size, and administrative access.",
        sshProvider:
          "Later access will depend on the final provider strategy, for example metadata, OS Login, or keys managed outside the platform.",
      },
      actions: {
        save: "Save configuration",
        delete: "Delete node",
      },
    },
    subnetForm: {
      headerEyebrow: "network zone",
      headerTitle: "Zone Segment",
      headerSubtitle:
        "Define traffic behavior and addressing inside the parent network segment. AWS translation: subnet.",
      headerSubtitleProvider:
        "Define traffic behavior and addressing inside the parent network segment. {{provider}} reading: {{kind}}.",
      segmentFallback: "segment",
      info: {
        title: "What this zone means",
        parentCidr: "- The zone must live inside the CIDR of the parent segment.",
        noOverlap:
          "- Zones must not overlap each other inside the same segment.",
        publicVsPrivate:
          "- Public zone allows broader ingress/egress by route policy. Private zone keeps traffic internal by default.",
      },
      gcpInfo: {
        regional:
          "- In GCP a subnet is usually regional, so you do not need to pin an Availability Zone at this level.",
        externalIp:
          "- In GCP public exposure is usually decided per instance through external IPs, not through an AWS-style public subnet.",
      },
      alerts: {
        privateZoneBefore:
          "This zone is private. If you later need Internet egress without exposing it publicly, enable",
        managedEgressLabel: "managed egress",
        privateZoneAfter: "from the parent",
        parentSegmentLabel: "Network Segment",
      },
      fields: {
        name: "Zone name",
        cidr: "Zone CIDR block (inside {{parent}})",
        cidrPlaceholder: "10.10.0.0/24",
        availabilityZone: "Availability Zone",
        type: "Zone type",
        autoAssignPublicIp:
          "Auto-assign public IPv4 (recommended for public zones)",
      },
      gcpFields: {
        privateGoogleAccess: "Enable Private Google Access",
        flowLogs: "Enable Flow Logs",
      },
      type: {
        public: "Public",
        private: "Private",
      },
      actions: {
        save: "Save configuration",
        delete: "Delete node",
      },
    },
    routerForm: {
      headerEyebrow: "connectivity node",
      headerTitle: "Connectivity Policy",
      headerSubtitle:
        "Define the connectivity mode and traffic policies between connected network segments.",
      headerSubtitleProvider:
        "Define the connectivity mode and traffic policies between connected segments, with a {{provider}}-oriented reading.",
      identifier: "Identifier",
      connectedSegments: "Segments connected to this node:",
      cidrNa: "CIDR n/a",
      none: "(none)",
      noneOption: "— None —",
      connectivityModel: "Connectivity model",
      modeOptions: {
        peering: "Direct links (AWS: Peering)",
        tgw: "Hub routing (AWS: Transit Gateway)",
        providerPeering: "Direct links ({{provider}}: {{directLabel}})",
        providerHub: "Hub routing ({{provider}}: {{hubLabel}})",
      },
      gcpModeOptions: {
        peering: "Direct links (GCP: VPC Peering)",
        tgw: "Hub routing (GCP: Cloud Router / Hub-and-spoke)",
      },
      modeHelp:
        "This selector defines the neutral connectivity model. The AWS translation can be pairwise peering or a central Transit Gateway. Final connectivity depends on the policies you declare.",
      modeHelpProvider:
        "This selector defines the neutral connectivity model. In {{provider}} it may be read as {{directLabel}} or {{hubLabel}}. Final connectivity depends on the policies you declare.",
      academic: {
        noConnectivity: {
          title: "No connectivity between segments",
          message:
            "This node needs at least 2 connected segments to model traffic between them.",
        },
        pointToPoint: {
          title: "Point-to-point topology",
          message:
            "With 2 connected segments, this node will act as a simple intermediary. Communication only exists if you define explicit policies.",
        },
        multiPoint: {
          title: "Multipoint topology",
          message:
            "With more than 2 connected segments, this node centralizes connectivity. You should define clear policies to control which segment can communicate with which.",
        },
      },
      gcpChips: {
        direct: "GCP: VPC Peering",
        hub: "GCP: Cloud Router hub",
      },
      modeSummary: {
        tgw: {
          title: "Hub routing",
          detailLarge:
            "The topology will be implemented as a central hub with {{count}} attachment(s).",
          detailSmall:
            "With few segments, hub mode can be more complex than a direct link.",
          bulletAws:
            "AWS translation: 1 Transit Gateway + 1 attachment per connected segment.",
          bulletProvider:
            "{{provider}} reading: 1 {{hubLabel}} with 1 attachment per connected segment.",
          bulletTraffic:
            "Traffic passes through the central hub; there is no mesh of direct links between pairs.",
          bulletPing:
            "For bidirectional ping, define forward and return routes in the router table.",
        },
        peering: {
          title: "Direct links",
          detail:
            "With your current topology, the maximum is {{count}} direct link(s) between pairs.",
          bulletAws:
            "AWS translation: 1 peering connection per pair with routes declared in both directions.",
          bulletProvider:
            "{{provider}} reading: 1 {{directLabel}} per pair with routes declared in both directions.",
          bulletTransit:
            "It is not transitive: A↔B and B↔C do not automatically enable A↔C.",
          bulletManySegments:
            "With several segments, the number of pairs and route maintenance both increase.",
          bulletSmallLabs:
            "It is ideal for small, direct labs.",
        },
      },
      chips: {
        awsHub: "AWS: 1 central hub",
        awsDirect: "AWS: direct links by pair",
        providerHub: "{{provider}}: {{hubLabel}}",
        providerDirect: "{{provider}}: {{directLabel}}",
        readingHub: "Reading: traffic passes through the hub",
        readingDirect: "Reading: traffic goes directly between segments",
        scales: "Scales better with several segments",
        simple: "Simpler for small labs",
      },
      stats: {
        pairs: "Pairs with routes: {{count}}",
        bidirectional: "Bidirectional: {{count}}",
        oneWay: "One-way: {{count}}",
        effectiveHub: "Effective payload: active hub routing",
        effectiveDirect: "Effective payload: active direct links",
        isolated: "Effective payload: isolated",
      },
      alerts: {
        pendingReverse: {
          before: "In mode",
          after:
            "you need forward and return routes for each pair of segments so that link can materialize.",
        },
        noPolicies: {
          before:
            "There are segments visually connected to this node, but you have not defined policies. If you deploy like this, the payload will be",
          isolated: "isolated",
          after:
            "even though the edge toward the router remains visible on the canvas.",
        },
        notEffective:
          "The node already has policies, but they still do not generate effective connectivity. In peering, that usually means the return route from the other segment is missing.",
      },
      routingCopy: {
        tgw: {
          sectionTitle: "Policies toward the hub",
          intro:
            "Each row indicates which traffic leaves one segment and is sent to the hub to reach another connected network.",
          explainer:
            "Here you are not defining a direct link between pairs. You are defining which destinations should be sent to the central hub.",
          sourceLabel: "Segment sending to the hub",
          destVpcLabel: "Segment reached through the hub",
          destCidrLabel: "CIDR sent to the hub",
          oneWayLabel: "Return missing",
        },
        peering: {
          sectionTitle: "Policies between direct peers",
          intro:
            "Each row represents one direct destination between segments. In direct links, a pair only becomes operational when you declare both directions.",
          explainer:
            "Here you are modeling direct connectivity between two specific segments.",
          sourceLabel: "Source segment",
          destVpcLabel: "Direct destination segment",
          destCidrLabel: "Destination CIDR",
          oneWayLabel: "One-way only",
        },
      },
      table: {
        edgesMeaning:
          "Canvas edges only indicate which segments are connected to this policy node. The connectivity that will really translate to AWS comes from the routes/policies defined below.",
        edgesMeaningProvider:
          "Canvas edges only indicate which segments are connected to this policy node. Effective connectivity for {{provider}} comes from the routes/policies defined below.",
        title: "How to read this table",
        origin: "- Source: the segment from which traffic leaves.",
        destination: "- Destination: the network you want to reach.",
        peering:
          "- In direct links you model direct connectivity between segment pairs.",
        tgw:
          "- In hub routing you model which destinations should be sent to the central hub.",
      },
      validation: {
        selectSource: "Select the source segment",
        sourceNotConnected:
          "The source segment is not connected to this policy",
        destRequired: "Destination CIDR is required",
        destInvalid: "Destination CIDR is invalid",
        destNotConnected:
          "The destination segment is not connected to this policy",
        destWithinSegment:
          "Destination CIDR must be {{value}} or be contained within that segment",
        duplicateRoute:
          "Duplicate route (same source and destination CIDR)",
      },
      actions: {
        addRoute: "+ Route",
        save: "Save",
        deleteNode: "Delete node",
        deleteRoute: "Delete route",
      },
    },
    loading: {
      processing: "Processing...",
    },
    saveFlow: {
      saving: "Saving canvas...",
      savedRecently: "Saved just now",
      error: "Could not save the canvas",
    },
    deployRuntime: {
      cannotDeployWithErrors: "Cannot deploy. Fix these errors:",
      noVpcInCanvas: "There is no VPC on the canvas.",
      timeoutPlan: "Timed out waiting for the plan result",
      noDataToValidate: "There is no transformed data to validate.",
      providerUnavailable:
        "The current lab configuration is not available for validation and deploy.",
      syncWithoutPlanId: "sync-from-canvas did not return plan_id",
      validationOk: "Validation OK (Terraform plan)",
      validationFailed: "Validation failed",
      planAlreadyApplied:
        "The plan is already applied and did not accept redeploy. Review the plan state.",
      unknownError: "Unknown error",
      validateBeforeDeploy:
        "Validate the topology in simulation mode before deploying to AWS.",
      topologyErrorsBeforeDeploy:
        "The canvas has topology errors. Fix them and validate again before the real deploy.",
      validatePlanFirst: "Validate the plan first.",
      noDataToApply: "There is no transformed data to apply.",
      redeployWord: "REDEPLOY",
      deployWord: "DEPLOY",
      redeployPrompt:
        "You are about to apply changes over already active AWS infrastructure. To confirm, type: REDEPLOY",
      deployPrompt: "To confirm, type: DEPLOY",
      deployCancelled: "Deploy cancelled by the user.",
      executionForbidden:
        "Real deploy or destroy is only allowed for the owner, the platform admin, or the teacher when the lab effective connection is course_shared.",
      backendRejectedRedeploy:
        "The backend rejected redeploy for this plan. Review the state and try again.",
    },
    intentPlugin: {
      title: "Generate topology from prompt",
      subtitle: "Describe the infrastructure intent for {{provider}} and we will draw it on the canvas.",
      info:
        "This first version generates an editable draft. You can then adjust nodes, validate, and deploy with the normal flow.",
      providerActive: "Plugin active: {{provider}} · {{kind}} mode.",
      promptLabel: "Infrastructure prompt",
      promptPlaceholder:
        "Example: I want one VPC with one public subnet, one private subnet, NAT, and 2 instances for a web app.",
      regionLabel: "Region",
      maxWorkloadsLabel: "Max instances",
      cancel: "Cancel",
      submit: "Generate draft",
      generating: "Generating...",
      genericError: "Could not generate topology from the prompt.",
      invalidResponse: "The plugin returned an incomplete or invalid topology.",
      unavailable: "The intent plugin is not available in this environment.",
      persistWarning:
        "The topology was generated on the canvas, but I could not persist it to the lab yet.",
    },
    toolbar: {
      defaultTitle: "Logical Topology",
      chips: {
        validated: "VALIDATED",
        validating: "VALIDATING...",
        error: "ERROR",
        activeInfra: "ACTIVE INFRA",
        outdated: "OUTDATED",
      },
      canvasState: {
        planRunning: "Plan running",
        outdated: "Outdated canvas",
        validated: "Validated canvas",
        synced: "Synced canvas",
        noPlan: "No linked plan",
      },
      statusGuide: {
        validated:
          "The canvas has already passed validation and the current topology matches the last validated plan.",
        planSuccess:
          "The last plan execution finished successfully in the backend.",
        activeInfra:
          "There is active real AWS infrastructure associated with this lab.",
        outdated:
          "The canvas changed after the last validation and should be revalidated before deploy.",
        validating:
          "The system is generating or syncing a plan to reflect the current canvas state.",
        error:
          "There was a problem validating or syncing the plan and you need to review the associated message.",
        openTooltip: "See the meaning of the canvas states",
        title: "Canvas states",
        description:
          "This help summarizes what the chips in the lab header mean.",
        currentDetail: "Current internal state: {{value}}",
        currentState: "Current state",
      },
      saveChip: {
        saving: "Saving...",
        saved: "Saved",
        savedAt: "Saved {{value}}",
        error: "Save error",
      },
      palette: {
        label: "Tools",
        show: "Show modeling tools",
        hide: "Hide modeling tools",
      },
      guide: {
        label: "Guide",
        show: "Show modeling guide",
        hide: "Hide modeling guide",
      },
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      fitView: "Fit view",
      actions: {
        saveTooltip: "Save the current canvas state to the API",
        saving: "Saving…",
        save: "Save",
        restoreTooltip: "Restore the last saved version from the API",
        restore: "Restore",
        restoreInitialTooltip: "Reset canvas to the initial template state",
        restoreInitial: "Restore initial",
        generateTooltip: "Generate a base topology from an infrastructure prompt",
        generate: "Generate with AI",
        routesTooltip: "Generate and review the routing plan without applying changes",
        viewRoutes: "View routing",
      },
    },
    planAction: {
      running: {
        actionLabel: "Plan running",
        actionTooltip:
          "There is an execution in progress. Wait for it to finish before continuing.",
        helper:
          "There is an execution in progress. The canvas remains locked until it finishes.",
        workspaceTitle: "Execution in progress",
        workspaceDetail:
          "While Terraform is working, the canvas remains in read-only mode to avoid plan drift.",
        chip: "Main action: WAIT",
      },
      applied: {
        actionLabel: "Prepare redeploy",
        actionTooltip:
          "Open redeploy validation to review changes over already active infrastructure.",
        helper:
          "There is active infrastructure. From here you will prepare a redeploy over the same stack, focused on {{provider}}.",
        helperOutdated:
          "There is active infrastructure and the canvas changed. Revalidate to prepare a redeploy over the same stack, focused on {{provider}}.",
        workspaceTitle: "Active infrastructure for {{provider}}",
        workspaceTitleOutdated: "Outdated canvas compared to the active stack",
        workspaceDetail:
          "You can review the plan, validate changes, and then apply a redeploy over the existing infrastructure.",
        workspaceDetailOutdated:
          "The canvas no longer matches the last validation. Revalidate before trying to update the {{provider}} stack.",
        chipRedeploy: "Main action: REDEPLOY",
        chipDestroyAvailable: "Destroy available",
        chipDestroyUnavailable: "Destroy unavailable",
      },
      validated: {
        actionLabel: "Prepare deploy",
        actionTooltip:
          "Open the final validation before the first deploy or runtime review for {{provider}}.",
        helper:
          "The canvas is already validated and there is no active infrastructure. The next step is to review deploy for {{provider}}.",
        workspaceTitle: "Validated canvas ready for deploy",
        workspaceDetail:
          "The topology already passed validation. If you are satisfied with the plan, the next step is to continue with review or real infrastructure for {{provider}}.",
        chipDeploy: "Main action: DEPLOY",
        chipDestroyUnavailable: "Destroy does not apply yet",
      },
      outdated: {
        actionLabel: "Revalidate canvas",
        actionTooltip:
          "Regenerate the plan so it matches the current canvas state again.",
        helper:
          "The canvas changed since the last validation. Before deploying, revalidate to update the plan.",
        workspaceTitle: "Canvas modified since the last validation",
        workspaceDetail:
          "You have local changes pending validation. Revalidate so the plan once again represents exactly what you see.",
        chip: "Main action: REVALIDATE",
      },
      default: {
        actionLabel: "Validate canvas",
        actionTooltip:
          "Validate the current topology to see its {{provider}} reading before creating resources.",
        helper:
          "There is still no validated plan or active infrastructure. Start by validating the canvas.",
        workspaceTitle: "Canvas ready to validate",
        workspaceDetail:
          "Start by validating the topology to see its {{provider}} reading before creating real resources.",
        chip: "Main action: VALIDATE",
      },
    },
    deployDialog: {
      exportError: "Could not export the plan. Check the console.",
      title: "Confirm infrastructure",
      primaryRedeploy: "Redeploy on AWS",
      primaryDeploy: "Deploy on AWS",
      revalidateRedeploy: "Revalidate redeploy",
      validateDeploy: "Validate deploy",
      validatingInfra: "Validating infrastructure...",
      validatedSuccess:
        "Infrastructure validated successfully. You can deploy or review the plan.",
      validationError:
        "Validation error. Review the details before continuing.",
      canvasOutdated:
        "The canvas changed since the last validation. You must validate again.",
      busyValidating: "Validating infrastructure. Please wait a moment...",
      busyProcessing: "Processing the operation. Do not close this modal yet.",
      busyDescription:
        "While this action runs, the modal is locked to avoid inconsistent states.",
      redeployWarning:
        "This validation was performed over already active infrastructure. If you deploy now, Terraform will update the existing stack in AWS and some changes may replace or remove resources.",
      chips: {
        mainRedeploy: "Main action: REDEPLOY",
        mainDeploy: "Main action: DEPLOY",
        destroyAvailable: "Destroy available if the plan remains active",
        destroyUnavailable: "Destroy does not apply until resources are created",
      },
      risk: {
        destructive:
          "Terraform detected potentially destructive changes or resource replacements.",
        caution:
          "Terraform detected updates over existing resources.",
        safe: "Terraform detected additive changes over the infrastructure.",
        sensitiveResources: "Sensitive resources detected:",
      },
      summaryTitle: "Summary",
      providerSoonTitle: "{{provider}} will be available soon",
      providerSoonBody:
        "The {{action}} action for {{provider}} is not enabled yet at this stage of the project.",
      providerSoonHelp:
        "For now, you can use {{provider}} to model and present topology differences in the canvas. Real validation and deployment remain available in AWS first.",
      providerSoonActionValidate: "validation",
      providerSoonActionDeploy: "deploy",
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
        "After deploy, validate connectivity in Plan Detail -> Tests using guided ping commands between segments.",
      providerPreviewHint:
        "This view summarizes how the topology would be modeled in {{provider}}. Real validation and deployment remain available in AWS first.",
      neutralTitle: "Neutral lab intent",
      neutral: {
        baseNetwork:
          "The base network contains {{segments}} segment(s), {{zones}} zone(s), and {{workloads}} workload(s).",
        exposure:
          "Design exposure: {{publicExposure}} public segment(s), {{privateExposure}} private, and {{mixedExposure}} mixed.",
        hubs:
          "Connectivity is modeled as {{hubs}} central hub(s) with {{attachments}} attachment(s).",
        directLinks:
          "Connectivity is modeled with {{directLinks}} direct link(s) between segment pairs.",
        sshWarning:
          "Access and egress: external SSH declared on {{vpcsWithSsh}} segment(s), but {{vpcsWithSshButNoPublicZones}} do not have a public zone to expose it. In addition, {{isolatedExposure}} segment(s) do not declare Internet egress.",
        sshReady:
          "Access and egress: external SSH usable on {{vpcsWithEffectivePublicSsh}} segment(s) and {{isolatedExposure}} segment(s) without declared Internet egress.",
      },
      awsTitle: "AWS translation",
      gcpTitle: "GCP reading",
      providerPreviewTitle: "{{provider}} reading",
      providerPreviewBody:
        "The topology is already prepared to show a {{provider}}-oriented reading, even though real validation and deployment are not enabled yet.",
      aws: {
        created:
          "AWS will create {{segments}} VPC(s), {{zones}} subnet(s), and {{workloads}} instance(s).",
        publicExposure:
          "Effective public exposure: IGW on {{vpcsWithIgw}} VPC(s), {{publicSubnets}} public subnet(s), and usable external SSH on {{vpcsWithEffectivePublicSsh}} VPC(s).",
        noPublicSubnets:
          "Internet edge declared on {{vpcsWithIgw}} VPC(s), but there are no public subnets to expose workloads or use direct external SSH.",
        privateEgress:
          "Private egress: NAT Gateway on {{vpcsWithNat}} VPC(s) for {{privateSubnets}} potentially private subnet(s).",
        centralRouting:
          "Central routing: {{hubRouters}} hub(s) and {{hubAttachments}} attachment(s).",
        directRouting:
          "Routing through direct links: {{directLinks}} declared link(s).",
      },
      gcp: {
        created:
          "GCP would model {{segments}} VPC Network(s), {{zones}} regional subnet(s), and {{workloads}} VM(s).",
        externalAccess:
          "External access: {{workloadsWithExternalIp}} workload(s) with external IPs and SSH rules declared on {{segmentsWithSshRanges}} segment(s).",
        privateServices:
          "Private services: Private Google Access on {{subnetsWithPrivateGoogleAccess}} subnet(s) and Flow Logs on {{subnetsWithFlowLogs}} subnet(s).",
        centralRouting:
          "Central connectivity: {{hubLabel}} across {{hubRouters}} hub(s) with {{hubAttachments}} attachment(s).",
        directRouting:
          "Direct connectivity: {{directLabel}} across {{directLinks}} link(s) between segments.",
        privateEgress:
          "Managed egress: {{managedEgressLabel}} enabled on {{segmentsWithCloudNat}} segment(s).",
      },
      segment: {
        cidr: "CIDR: {{value}}",
        region: "Region: {{value}}",
        model: "Model: {{value}}",
        providerNetwork: "{{provider}}: {{kind}}",
        awsVpc: "AWS: VPC",
        igw: "IGW",
        nat: "NAT",
        natEip: "NAT EIP: {{value}}",
        cloudNat: "Cloud NAT",
        sshRanges: "SSH source ranges: {{count}}",
        sshRangesDetail: "Configured SSH ranges: {{value}}",
        privateGoogleAccess: "Private Google Access: {{count}}",
        flowLogs: "Flow Logs: {{count}}",
        externalIps: "External IPs: {{count}}",
        natHelp:
          "If you define an EIP for the NAT, it must be a real AWS Allocation ID (`eipalloc-...`), not a public IP.",
      },
      exportJson: "Export JSON",
      viewPlan: "View plan",
      applyRedeploy: "Apply redeploy",
      deploy: "Deploy",
    },
    learningGuide: {
      panel: {
        title: "Modeling guide",
        subtitle:
          "Follow the steps to build and understand the topology before validating or deploying.",
        progress: "Progress {{completed}}/{{total}}",
        stats: {
          segments: "Segments: {{count}}",
          zones: "Zones: {{count}}",
          routers: "Connectivity nodes: {{count}}",
          directLinks: "Direct links: {{count}}",
          hubRouting: "Hub routing: {{count}}",
          workloads: "Workloads: {{count}}",
        },
        selectedElement: "Selected element",
        neutralReading: "Neutral reading",
        awsReading: "AWS translation",
        providerReading: "{{provider}} reading",
        conceptComparison: "Concept comparison",
        neutralView: "Neutral view",
        awsView: "AWS implementation view",
        providerView: "{{provider}} implementation view",
        neutralLabel: "Neutral:",
        awsLabel: "AWS:",
        providerLabel: "{{provider}}:",
        blockers: "Detected blockers",
        moreErrors: "+ {{count}} additional errors.",
        openValidation: "Open validation",
        openDeploy: "Open deploy",
      },
      steps: {
        segment: { title: "Create base segment", description: "Define the main container of the lab." },
        zones: { title: "Define zones", description: "Create at least one public and one private zone." },
        workload: { title: "Add workload", description: "Add at least one instance to test connectivity." },
        connectivity: {
          title: "Connectivity between segments",
          description: "Connect the segments with a connectivity node and its links.",
          optional: "Optional in a single-segment lab.",
        },
        validate: { title: "Validate topology", description: "Run the simulation (Terraform plan) before deployment." },
        deploy: { title: "Review deploy", description: "Review the next deploy or runtime step for {{provider}} when the lab is validated." },
      },
      nextAction: {
        completed: "Lab completed. You can review outputs and logs.",
        running: "There is an execution in progress. Wait for the result before continuing.",
        fixTopology: "Fix topology errors first to continue with validation.",
        validate: "Run Validate to simulate the topology and review the plan before applying.",
        deploy: "When you are satisfied with the simulation, open Deploy to review the next runtime step for {{provider}}.",
        nextStep: "Next step: {{title}}.",
      },
      contrast: {
        vlanLines: {
          subnets: "You are modeling {{count}} network zone(s) inside a logical lab.",
          needsRouter: "Your lab requires routing between multiple network segments.",
          singleDomain: "Your lab can be solved within a main domain.",
          routesReady: "You already defined routes between segments to analyze connectivity.",
          routesMissing: "You still have not defined explicit routes between segments.",
        },
        awsLines: {
          vpcs: "This translates into {{vpcs}} VPC(s) and {{subnets}} subnet(s) in AWS.",
          egress: "Egress connectivity: IGW {{igw}} / NAT {{nat}}.",
          routers: "Routers in AWS mode: Peering {{peering}} / TGW {{tgw}}.",
          routesReady: "Defined routes are transformed into route tables and links between VPCs.",
          routesMissing: "Without explicit routes, AWS will only apply local connectivity per VPC.",
          oneWayPairs:
            "We detected {{count}} pair(s) with one-way routes; review the return path for bidirectional tests.",
          noOneWayPairs: "No pairs with one-way routes were detected.",
        },
        providerLines: {
          vpcs:
            "This translates into {{segments}} {{networkKind}} and {{zones}} {{subnetKind}} in {{provider}}.",
          egress:
            "Egress connectivity: {{internetEdgeLabel}} {{internetEdgeCount}} / {{managedEgressLabel}} {{managedEgressCount}}.",
          routers:
            "Provider connectivity: {{directLabel}} {{directCount}} / {{hubLabel}} {{hubCount}}.",
          routesReady:
            "Defined routes are materialized using {{provider}} networking primitives.",
          routesMissing:
            "Without explicit routes, {{provider}} will only maintain local connectivity per segment.",
          oneWayPairs:
            "We detected {{count}} pair(s) with one-way routes; review the return path for bidirectional tests.",
          noOneWayPairs: "No pairs with one-way routes were detected.",
        },
      },
      concepts: {
        segmentation: {
          concept: "Segmentation",
          vlan: "Logical segments and zones for practice",
          aws: "VPCs and subnets with real CIDRs",
        },
        gateway: {
          concept: "Gateway",
          vlan: "Connectivity node of the lab",
          aws: "Route tables + IGW/NAT/TGW/Peering",
        },
        hosts: {
          concept: "Hosts",
          vlan: "Machines/services in the topology",
          aws: "EC2 instances and their interfaces",
        },
        validation: {
          concept: "Validation",
          vlan: "Topology rule verification",
          aws: "Terraform plan before apply",
        },
      },
      focus: {
        element: "Element",
        segmentSubtitle: "What it means in the neutral model and how it translates to AWS.",
        segmentSubtitleProvider:
          "What it means in the neutral model and how it translates to {{provider}}.",
        internetEdgeOn: "Internet edge enabled",
        internetEdgeOff: "No Internet edge",
        managedEgressOn: "Managed egress enabled",
        managedEgressOff: "No managed egress",
        sshExposed: "SSH from a defined IP",
        sshHidden: "SSH not exposed",
        segmentLabDomain:
          "This segment represents a main network domain inside the lab.",
        publicZones:
          "You have {{count}} public zone(s): they are useful for bastions or services with direct egress.",
        noPublicZones:
          "There are no public zones; this segment is not designed for direct exposure.",
        privateZones:
          "You have {{count}} private zone(s): they are useful for internal workloads.",
        noPrivateZones:
          "There are no private zones; the whole practice is concentrated in public or undefined areas.",
        segmentAwsVpc:
          "AWS will create 1 real VPC in {{region}} with the indicated CIDR.",
        igwCreated:
          "An Internet Gateway will be created and attached to allow public ingress/egress where routes and security groups exist.",
        igwMissing:
          "Without an Internet Gateway, the VPC will not have direct public egress.",
        natCreated:
          "AWS will create 1 NAT Gateway: your private networks will be able to reach the Internet, but not receive inbound traffic.",
        natMissing:
          "Without a NAT Gateway, private subnets will not have public egress unless another path exists.",
        natEipDefined:
          "If you assign an Elastic IP to the NAT, it must be an existing AWS Allocation ID (for example `eipalloc-...`), not the visible public IP.",
        natEipLater:
          "If you enable NAT later and want to pin its EIP, use a real AWS Allocation ID.",
        sshRule: "The Security Group will open TCP/22 from {{value}}.",
        noSshRule:
          "Administrative SSH from the Internet will not be opened unless you enable it explicitly.",
        segmentProviderNetwork:
          "{{provider}} will create 1 real {{networkKind}} in {{region}} with the indicated CIDR.",
        providerManagedEgressOn:
          "{{managedEgressLabel}} will be enabled for managed segment egress.",
        providerManagedEgressOff:
          "Without {{managedEgressLabel}}, this segment will not have managed egress through that service.",
        providerFirewallRule:
          "{{provider}} will apply the administrative access policy from {{value}}.",
        providerNoFirewallRule:
          "No explicit administrative policy from the Internet will be configured unless you declare it.",
        segmentWhy:
          "This segment defines the main boundary of the lab. From here you decide segmentation, exposure, and connectivity toward other networks.",
        routerHub: "Central connectivity hub",
        routerDirect: "Direct connectivity between pairs",
        routerHubMode: "Hub routing mode",
        routerDirectMode: "Direct links mode",
        connectedSegments: "{{count}} connected segment(s)",
        declaredPolicies: "{{count}} declared polic(y/ies)",
        missingReturns: "{{count}} missing return(s)",
        roundTripPolicies: "Round-trip policies consistent",
        routerHubLab:
          "In the lab, this node acts as a hub: segments send traffic to the node to reach other networks.",
        routerDirectLab:
          "In the lab, this node represents direct pair links: each segment needs explicit policies toward the other.",
        policyRows:
          "Policy rows are not decorative: they determine who can talk to whom.",
        routerHubAws:
          "AWS will implement 1 Transit Gateway and {{count}} attachment(s) for the connected segments.",
        routerPeeringAws:
          "AWS will implement VPC Peering connections between the pairs that are actually declared by policies.",
        routerHubRoute:
          "Each policy toward the TGW sends traffic to the central hub; then the hub forwards it to the destination segment.",
        routerPeeringRoute:
          "In peering there is no implicit transit: A↔B and B↔C do not automatically connect A↔C.",
        routerHubProvider:
          "{{provider}} will model 1 {{hubLabel}} with {{count}} attachment(s) for the connected segments.",
        routerDirectProvider:
          "{{provider}} will model {{directLabel}} between the pairs actually declared by policies.",
        routerHubRouteProvider:
          "Each policy toward {{hubLabel}} will send traffic to the central hub before it is forwarded to the destination segment.",
        routerDirectRouteProvider:
          "With {{directLabel}}, there is no implicit transit between pairs that are not directly connected.",
        routerWhy:
          "Here the difference between a point-to-point topology and a centralized topology is defined. That changes both scalability and how you reason about traffic.",
        zoneSubtitle: "Internal zone inside a main segment.",
        publicZone: "Public",
        privateZone: "Private",
        routeTable: "Table {{value}}",
        publicZoneLab:
          "In the lab this zone is intended for bastions or workloads with direct egress.",
        privateZoneLab:
          "In the lab this zone is intended for internal or less exposed workloads.",
        subnetAws:
          "AWS will create 1 aws_subnet with the indicated CIDR and associate it with a route table.",
        subnetPublicRule:
          "It will be public only if its route table points to an Internet Gateway.",
        subnetPrivateRule:
          "It will be private while it has no direct public route.",
        subnetProvider:
          "{{provider}} will create 1 {{subnetKind}} with the indicated CIDR.",
        subnetProviderPublicRule:
          "Public exposure will depend on routes, external access, and provider policies.",
        subnetProviderPrivateRule:
          "It will remain oriented to internal access while you do not declare egress or external exposure.",
        zoneWhy:
          "The subnet does not define connectivity by itself; the combination of route table and Security Group determines its real behavior.",
        workloadSubtitle: "Host where the practice materializes.",
        segmentTitle: "Network Segment: {{label}}",
        routerTitle: "Connectivity Policy: {{label}}",
        zoneTitle: "Zone Segment: {{label}}",
        workloadTitle: "Workload: {{label}}",
        publicIp: "With public IP",
        privateOnly: "Private IP only",
        workloadLab:
          "In the lab this node represents the final machine on which you will run tests or deploy services.",
        workloadAws:
          "AWS will create 1 EC2 instance with the defined AMI, size, and key pair.",
        workloadPublicAccess:
          "You will be able to manage it from outside if the public route and security group allow it.",
        workloadPrivateAccess:
          "It will only be reachable from inside the network or through intermediate hops.",
        workloadProvider:
          "{{provider}} will create 1 compute workload with the defined image and size.",
        workloadProviderPublicAccess:
          "You will be able to manage it from outside if you declare external access and compatible rules.",
        workloadProviderPrivateAccess:
          "It will remain reachable only from the internal network or through intermediate hops.",
        workloadWhy:
          "Ping and SSH access tests end up happening here. If the workload is badly placed or badly protected, the lab will not be verifiable.",
        defaultSubtitle: "Contextual explanation of the selected element.",
        defaultLine:
          "Select a main canvas element to see a more precise pedagogical reading.",
      },
    },
    cidrGuide: {
      button: "How to calculate?",
      title: "Quick guide to CIDR, subnets, and IP addresses",
      templateWarning:
        "If you change the parent CIDR after choosing a template, the preloaded canvas does not automatically recalculate all IPs. In that case, manually review segment CIDRs, subnets, and fixed IPs before validating or deploying.",
      understood: "Understood",
      sections: {
        meaning: {
          title: "1. What a CIDR means",
          bodyStart: "A CIDR combines a base address and a prefix. For example,",
          bodyEnd:
            "means the lab has a wide block from which we will later derive segments and subnets.",
        },
        rule: {
          title: "2. Practical rule for this MVP",
          bodyStart: "If you start with a",
          bodyMiddle: ", you will usually be able to divide it comfortably into several",
          bodyEnd:
            ". That combination is convenient for a lab because it leaves room to grow without having to redo the addressing.",
        },
        example: {
          title: "3. Simple example",
          masterStart: "Suppose your parent range is",
          defineSegments: "From there you can define segments or VPCs such as:",
          simpleVpc: "- `10.20.0.0/16` for a simple VPC",
          multiSegments: "- or separate several segments into different ranges if the case requires it",
          subnets: "Inside a VPC, you can create subnets such as:",
          publicSubnet: "- `10.20.1.0/24` for a public subnet",
          privateSubnet: "- `10.20.2.0/24` for a private subnet",
          workloads: "And then assign IPs to workloads, for example:",
          bastion: "- `10.20.1.10` for a bastion",
          privateApp: "- `10.20.2.10` for a private app",
        },
        visualMap: {
          title: "3.1. Visual map of the addressing",
          body: "Think of the lab as a hierarchy: each level contains the next one.",
          masterLabel: "Lab / parent range",
          segmentLabel: "Segment / VPC",
          publicSubnetLabel: "Public subnet",
          publicWorkload: "Example workload: `10.20.1.10`",
          privateSubnetLabel: "Private subnet",
          privateWorkload: "Example workload: `10.20.2.10`",
        },
        howToThink: {
          title: "4. How to think about the calculation without overcomplicating it",
          step1: "1. First choose the parent range of the lab.",
          step2: "2. Decide how many segments or VPCs you will need.",
          step3: "3. Inside each segment, separate public and private subnets with non-overlapping blocks.",
          step4: "4. Reserve fixed IPs for workloads only after you clearly define their subnets.",
        },
        math: {
          title: "4.1. How it is calculated mathematically",
          bodyStart: "In IPv4 there are",
          bodyEnd: ". The prefix indicates how many bits are reserved for the network.",
          formula: "The base formula is:",
          note:
            "In labs we use that practical rule even though some environments reserve additional addresses.",
          exampleA: "Example A: `10.20.0.0/16`",
          exampleAConclusion:
            "That explains why a `/16` works well as a parent range: it leaves plenty of space for several internal subnets.",
          exampleB: "Example B: `10.20.1.0/24`",
          exampleBConclusion:
            "That is why a `/24` subnet is usually convenient for labs: you can assign several fixed IPs without running short.",
        },
        membership: {
          title: "4.2. How to know if an IP belongs to a subnet",
          body:
            "In a `/24`, the first 3 octets identify the network and the last octet changes per host.",
          mentalRule: "Quick mental rule:",
          exampleC: "Example C: `10.20.1.128/25`",
          exampleCBody: "A `/25` divides the `/24` into two blocks:",
          then: "Then:",
        },
        ipTypes: {
          title: "4.3. Private IP vs Public IP",
          privateStart: "A",
          privateEnd:
            "identifies the workload inside its internal network. That IP is used for routing between subnets and segments.",
          publicStart: "A",
          publicEnd:
            "is used for access from the Internet when the topology, subnet, and security rules allow it.",
          note:
            "They do not compete with each other: a VM can always have a private IP, and a public IP only if the design requires it.",
          exampleD: "Example D: how to read it on a public VM",
          exampleDConclusion:
            "If you SSH from your computer, you will enter through the public IP. But inside the cloud, other machines will reach that VM through its private IP.",
          practicalRule: "Practical rule for labs",
        },
        goldenRule: {
          title: "5. Golden rule",
          body:
            "No segment should go outside the parent range, no subnet should go outside its segment, and no fixed IP should go outside its subnet. If you keep that hierarchy, the modeling is usually stable and easy to explain in the demo.",
        },
      },
    },
    validation: {
      vlanNameMin: "VLAN name must be at least 3 characters",
      vlanNameMax: "VLAN name must be at most 60 characters",
      vlanNameRequired: "VLAN name is required",
      cidrRequired: "CIDR block is required",
      cidrFormat: "CIDR block must be in format 192.168.0.0/24",
      cidrInvalid: "CIDR block is invalid",
      cidrPrefixRoom: "CIDR should leave room for subnets (e.g. /16 to /24)",
      invalidCloudProvider: "Invalid cloud provider",
      cloudProviderRequired: "Cloud provider is required",
      requiredField: "This field is required",
      regionRequired: "Region is required",
      descriptionMax: "Description must have at most 4000 characters",
      vpcNameRequired: "VPC name is required",
      minThree: "Min 3 characters",
      maxSixty: "Max 60",
      nameRequired: "Name is required",
      cidrShortRequired: "CIDR is required",
      cidrExample: "CIDR is invalid (e.g.: 10.0.1.0/24)",
      mustBeWithinVlan: "Must be within VLAN range {{value}}",
      cidrOverlapVpc: "CIDR overlaps with another VPC in the VLAN",
      enableIgwForNat: "Enable Internet Gateway to use NAT Gateway",
      cidrInvalidExample: "Invalid CIDR (e.g.: 203.0.113.5/32)",
      selectPublicSubnetNat: "Select the public subnet for NAT",
      subnetMustBeSelected: "Subnet must be selected",
      elasticIpInvalid:
        "Invalid Elastic IP. Use an Allocation ID, for example: eipalloc-0123456789abcdef0",
    },
  },
  onboarding: {
    waitingTarget:
      "Waiting for the element to appear on screen so we can highlight it.",
    stepCounter: "Step {{current}} of {{total}}",
    tours: {
      labsOverview: {
        headerTitle: "Your labs live here",
        headerDescription:
          "On this screen you can review all available labs and open the canvas to keep working.",
        guidedTitle: "Create a guided lab",
        guidedDescription:
          "This option starts a more guided experience, useful for users who are learning the flow step by step.",
        createTitle: "Create a new lab",
        createDescription:
          "This button opens the manual creation flow so you can start a topology from scratch.",
        listTitle: "Explore and open labs",
        listDescription:
          "Here you can review the list, ownership state, and quick access to open or manage each lab.",
      },
      canvasOverview: {
        toolsTitle: "Open the tools",
        toolsDescription:
          "From here you can show the palette of components available to drag onto the canvas.",
        dropAreaTitle: "This is where you model the topology",
        dropAreaDescription:
          "This is the lab's main workspace. Drag nodes, connect them, and adjust their configuration.",
        guideTitle: "Open the contextual guide",
        guideDescription:
          "This access gives you pedagogical help and a quick reading of what you are building.",
        stateTitle: "Review canvas status",
        stateDescription:
          "This banner summarizes whether your canvas is validated, outdated, or waiting for actions before deployment.",
        saveTitle: "Save your progress",
        saveDescription:
          "Use this button to persist the current canvas state and come back later without losing context.",
        restoreTitle: "Recover the latest saved version",
        restoreDescription:
          "This button restores the canvas from the latest version persisted in the API.",
        resetTitle: "Return to the initial state",
        resetDescription:
          "Use it to go back to the template baseline whenever you want to restart modeling.",
        deployTitle: "Validate or deploy",
        deployDescription:
          "This is where you start topology validation and, when appropriate, the infrastructure deployment.",
        routesTitle: "Inspect routing",
        routesDescription:
          "This button lets you review the routing plan to understand connectivity without applying changes.",
      },
      plansListOverview: {
        headerTitle: "This is where you review executions",
        headerDescription:
          "This screen gathers simulated and real plans so you can follow operational history without opening the details yet.",
        filtersTitle: "Filter and search plans",
        filtersDescription:
          "Use these controls to find a plan by name, status, canvas, or associated lab.",
        tableTitle: "Compare each plan state",
        tableDescription:
          "Here you can see the owner, technical status, logical lifecycle, and quick access to details or other actions.",
      },
      planDetailOverview: {
        headerTitle: "This is the overall plan status",
        headerDescription:
          "Here you can read the current result, operational lifecycle, and go back to the list or the linked canvas.",
        actionsTitle: "Run actions from here",
        actionsDescription:
          "You can switch between preview and real apply, deploy changes, or destroy infrastructure when the plan allows it.",
        tabsTitle: "Explore plan information by section",
        tabsDescription:
          "These tabs separate summary, outputs, tests, logs, and payload so the technical reading stays organized.",
        summaryTitle: "Operational and pedagogical summary",
        summaryDescription:
          "In this section you can see the status, the next real execution, cloud reconciliation, and recent plan history.",
      },
    },
  },
};

export default en;
