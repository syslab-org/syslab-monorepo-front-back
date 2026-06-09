const en = {
  common: {
    account: "Account",
    language: "Language",
    processing: "Processing...",
    english: "English",
    spanish: "Spanish",
  },
  actions: {
    back: "Back",
    closeSession: "Log out",
    finish: "Finish",
    next: "Next",
    skip: "Skip",
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
