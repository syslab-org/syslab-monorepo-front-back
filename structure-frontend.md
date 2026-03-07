apps/frontend/src
├── App.css
├── App.jsx
├── app
│   ├── providers
│   │   ├── AuthContext.jsx
│   │   └── LoadingFlowContext.jsx
│   └── routes
│       └── DashboardRoutes.jsx
├── features
│   ├── admin
│   │   └── pages
│   │       ├── Dashboard.jsx
│   │       ├── PanelAdmin.jsx
│   │       └── ProfilePage.jsx
│   ├── auth
│   │   ├── components
│   │   │   └── InviteUserForm.jsx
│   │   ├── hooks
│   │   │   ├── useInviteUserFormValidation.jsx
│   │   │   └── useRegistrationUserFormValidation.jsx
│   │   ├── index.js
│   │   ├── pages
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegistrationPage.jsx
│   │   └── services
│   │       └── authService.js
│   ├── devtools
│   │   ├── index.js
│   │   └── pages
│   │       └── TaskDemo.jsx
│   ├── networkCanvas
│   │   ├── canvas
│   │   │   ├── ReactFlowCanvas.jsx
│   │   │   └── canvasConfig.js
│   │   ├── components
│   │   │   └── WizardModalLayout.jsx
│   │   ├── context
│   │   │   ├── NetworkNodesContext.jsx
│   │   │   └── WizardContext.jsx
│   │   ├── core
│   │   │   ├── useAmiList.js
│   │   │   ├── useCanvasController.js
│   │   │   ├── useCanvasDirtyState.js
│   │   │   ├── useCanvasInitialization.js
│   │   │   ├── useCanvasInteractionController.js
│   │   │   ├── useCanvasPlanState.js
│   │   │   ├── useCanvasRuntimeController.js
│   │   │   ├── useDeployNetwork.js
│   │   │   ├── useNetworkPlanController.js
│   │   │   ├── usePlanMeta.js
│   │   │   ├── usePlanPolling.js
│   │   │   ├── usePlanValidationSync.js
│   │   │   ├── useRestoreFlow.js
│   │   │   ├── useRoutingPreview.js
│   │   │   ├── useSaveFlow.js
│   │   │   └── useVpcRouterSync.js
│   │   ├── domain
│   │   │   ├── canvasStateMachine.js
│   │   │   ├── decideRouterMode.js
│   │   │   ├── useNodeActions.js
│   │   │   └── useNodeSelection.js
│   │   ├── forms
│   │   │   ├── InstanceNodeForm.jsx
│   │   │   ├── NewVLANForm.jsx
│   │   │   ├── RouterNodeForm.jsx
│   │   │   ├── SubNetworkNodeForm.jsx
│   │   │   ├── VPCNodeForm.jsx
│   │   │   ├── options
│   │   │   │   └── instanceTypes.js
│   │   │   └── validations
│   │   │       ├── cidrUtils.js
│   │   │       └── useFormValidations.jsx
│   │   ├── hooks
│   │   │   ├── useFlowState.js
│   │   │   ├── useHandleDrop.js
│   │   │   ├── useNodeClick.js
│   │   │   ├── useNodeDrag.js
│   │   │   ├── useRestrictMovement.js
│   │   │   └── useRestrictSubnetsInsideVPC.js
│   │   ├── index.js
│   │   ├── layout
│   │   │   └── FlowWorkspace.jsx
│   │   ├── modals
│   │   │   ├── ConfirmDeployDialog.jsx
│   │   │   └── NodeConfigModal.jsx
│   │   ├── nodes
│   │   │   ├── InstanceNode.jsx
│   │   │   ├── NodeChrome.jsx
│   │   │   ├── RouterNodeInstance.jsx
│   │   │   ├── SubNetworkNodeInstance.jsx
│   │   │   └── VPCNodeInstance.jsx
│   │   ├── pages
│   │   │   ├── CreateVPCModal.jsx
│   │   │   ├── MainFlow.jsx
│   │   │   └── VPCList.jsx
│   │   ├── panels
│   │   │   ├── PacketToolbar.jsx
│   │   │   ├── RoutePreviewPanel.jsx
│   │   │   └── SidebarFlow.jsx
│   │   ├── store
│   │   │   ├── cidrBlocksIp.js
│   │   │   └── clickedNodeIdStore.js
│   │   ├── styles
│   │   │   └── packet-tracer.css
│   │   ├── ui
│   │   │   └── CanvasFeedbackLayer.jsx
│   │   └── utils
│   │       ├── buildRoutingPreview.js
│   │       ├── constants.js
│   │       ├── getNodeTitle.js
│   │       ├── iconHelper.js
│   │       ├── infraHash.js
│   │       ├── initials-elements.js
│   │       ├── networking.js
│   │       └── topologyValidation.js
│   ├── plans
│   │   └── pages
│   │       ├── PlanDetailPage.jsx
│   │       └── PlanListPage.jsx
│   └── settings
│       ├── hooks
│       │   ├── useFormValidationsSettings.jsx
│       │   └── useUsersFetch.jsx
│       ├── index.js
│       ├── modals
│       │   └── AddAmiModal.jsx
│       └── pages
│           ├── GeneralSettings.jsx
│           ├── SettingsPage.jsx
│           └── UsersManagement.jsx
├── infrastructure
│   ├── firebase
│   │   └── firebaseConfig.js
│   └── http
│       └── api.js
├── main.jsx
└── shared
    ├── constants
    │   └── index.js
    └── ui
        ├── layouts
        │   ├── MainLayout.jsx
        │   └── ModalLayout.jsx
        ├── organisms
        │   ├── LoadingFlow.jsx
        │   └── ProtectedRoute.jsx
        └── theme
            ├── AppThemeProvider.jsx
            ├── createPacketTheme.js
            └── dashboard
                ├── elements
                │   ├── AppBarStyle.jsx
                │   └── DrawerStyle.jsx
                └── listItems.jsx

50 directories, 105 files
