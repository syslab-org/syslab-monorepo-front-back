apps/frontend/src
├── App.css
├── App.jsx
├── app
│   ├── providers
│   │   ├── AuthContext.jsx
│   │   └── LoadingFlowContext.jsx
│   └── routes
│       └── DashboardRoutes.jsx
├── assets
│   ├── background.cbcde707.jpg
│   └── react.svg
├── config
│   └── networking.js
├── features
│   ├── admin
│   │   └── pages
│   │       ├── Dashboard.jsx
│   │       ├── PanelAdmin.jsx
│   │       └── ProfilePage.jsx
│   ├── auth
│   │   ├── components
│   │   │   ├── InviteUserForm.jsx
│   │   │   └── RegistrationForm.jsx
│   │   ├── forms
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
│   │   ├── components
│   │   │   └── WizardModalLayout.jsx
│   │   ├── context
│   │   │   ├── NetworkNodesContext.jsx
│   │   │   └── WizardContext.jsx
│   │   ├── core
│   │   │   ├── useDeployNetwork.js
│   │   │   ├── usePlanMeta.js
│   │   │   ├── usePlanPolling.js
│   │   │   ├── usePlanValidationSync.js
│   │   │   ├── useRestoreFlow.js
│   │   │   └── useSaveFlow.js
│   │   ├── domain
│   │   │   ├── canvasStateMachine.js
│   │   │   └── decideRouterMode.js
│   │   ├── forms
│   │   │   ├── InstanceNodeForm.jsx
│   │   │   ├── NewVLANForm.jsx
│   │   │   ├── RouteTableForm.jsx
│   │   │   ├── RouteTableFormFullScreen.jsx
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
│   │   │   ├── useNodeDragStart.js
│   │   │   ├── useNodeDragStop.js
│   │   │   ├── useRestrictMovement.js
│   │   │   └── useRestrictSubnetsInsideVPC.js
│   │   ├── index.js
│   │   ├── modals
│   │   │   ├── AddAmiModal.jsx
│   │   │   └── ConfirmDeployDialog.jsx
│   │   ├── nodes
│   │   │   ├── CustomResizerNode.jsx
│   │   │   ├── InstanceNode.jsx
│   │   │   ├── NodeChrome.jsx
│   │   │   ├── RouterNodeInstance.jsx
│   │   │   ├── SubNetworkNodeInstance.jsx
│   │   │   ├── VPCNodeInstance.jsx
│   │   │   ├── edges
│   │   │   │   └── ConnectionLine.jsx
│   │   │   └── styles
│   │   │       ├── InstanceNode.css
│   │   │       ├── RouterNode.css
│   │   │       ├── SubNetworkNode.css
│   │   │       └── VPCNode.css
│   │   ├── pages
│   │   │   ├── CreateVPCModal.jsx
│   │   │   ├── MainFlow.jsx
│   │   │   └── VPCList.jsx
│   │   ├── panels
│   │   │   ├── DeployConfirmationRoutes.jsx
│   │   │   ├── PacketToolbar.jsx
│   │   │   ├── RoutePreviewPanel.jsx
│   │   │   └── SidebarFlow.jsx
│   │   ├── services
│   │   │   └── deployNetworkToCloud.jsx
│   │   ├── store
│   │   │   ├── cidrBlocksIp.js
│   │   │   └── clickedNodeIdStore.js
│   │   ├── styles
│   │   │   ├── device-icons.css
│   │   │   └── packet-tracer.css
│   │   └── utils
│   │       ├── buildRoutingPreview.js
│   │       ├── cidr.js
│   │       ├── constants.js
│   │       ├── getNodeTitle.js
│   │       ├── iconHelper.js
│   │       ├── infraHash.js
│   │       ├── initials-elements.js
│   │       ├── networkUtils.js
│   │       └── topologyValidation.js
│   ├── plans
│   │   └── pages
│   │       ├── PlanDetailPage.jsx
│   │       └── PlanListPage.jsx
│   ├── settings
│   │   ├── components
│   │   ├── hooks
│   │   │   ├── useFormValidationsSettings.jsx
│   │   │   └── useUsersFetch.jsx
│   │   ├── index.js
│   │   └── pages
│   │       ├── GeneralSettings.jsx
│   │       ├── SettingsPage.jsx
│   │       └── UsersManagement.jsx
│   └── vpcs
│       └── pages
│           └── VPCList.jsx
├── index.css
├── infraestructure
│   ├── firebase
│   │   └── firebaseConfig.js
│   └── http
│       └── api.js
├── main.jsx
├── mocks
│   ├── Untitled-2024-03-23-1000.excalidraw
│   ├── Untitled-2024-03-23-1000.png
│   └── schema.text
├── shared
│   ├── constants
│   │   └── index.js
│   ├── hooks
│   │   └── useTaskPoller.js
│   └── ui
│       ├── layouts
│       │   ├── MainLayout.jsx
│       │   └── ModalLayout.jsx
│       ├── organisms
│       │   ├── LoadingFlow.jsx
│       │   └── ProtectedRoute.jsx
│       └── theme
│           └── dashboard
│               ├── elements
│               │   ├── AppBarStyle.jsx
│               │   └── DrawerStyle.jsx
│               └── listItems.jsx
├── styles
│   ├── palettle.js
│   ├── theme.js
│   └── typografy.js
└── theme
    ├── AppThemeProvider.jsx
    ├── createPacketTheme.js
    └── packetTracerTheme.js

59 directories, 116 files
