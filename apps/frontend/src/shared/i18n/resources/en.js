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
