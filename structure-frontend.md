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
├── components
│   ├── TaskDemo.jsx
│   ├── common
│   │   ├── LoadingFlow.jsx
│   │   └── ProtectedRoute.jsx
│   ├── layout
│   │   └── MainLayout.jsx
│   ├── pages
│   │   ├── SettingsPage.jsx
│   │   ├── TestComponent.jsx
│   │   ├── modals
│   │   │   └── AddAmiModal.jsx
│   │   ├── settings
│   │   │   ├── GeneralSettings.jsx
│   │   │   └── UsersManagement.jsx
│   │   └── validations
│   │       └── useFormValidationsSettings.jsx
│   └── theme
│       └── dashboard
│           ├── elements
│           │   ├── AppBarStyle.jsx
│           │   └── DrawerStyle.jsx
│           └── listItems.jsx
├── config
│   └── networking.js
├── constants.js
├── features
│   ├── ModalLayout.jsx
│   ├── admin
│   │   └── pages
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
│   ├── networkCanvas
│   │   ├── ConfirmDeployDialog.jsx
│   │   ├── MainFlow.jsx
│   │   ├── PacketToolbar.jsx
│   │   ├── SidebarFlow.jsx
│   │   ├── components
│   │   │   └── WizardModalLayout.jsx
│   │   ├── context
│   │   │   ├── NetworkNodesContext.jsx
│   │   │   └── WizardContext.jsx
│   │   ├── core
│   │   │   ├── usePlanMeta.js
│   │   │   ├── usePlanPolling.js
│   │   │   └── usePlanValidationSync.js
│   │   ├── domain
│   │   │   └── canvasStateMachine.js
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
│   │   │   ├── useDeployNetwork.js
│   │   │   ├── useFlowState.js
│   │   │   ├── useHandleDrop.js
│   │   │   ├── useNodeClick.js
│   │   │   ├── useNodeDrag.js
│   │   │   ├── useNodeDragStart.js
│   │   │   ├── useNodeDragStop.js
│   │   │   ├── useRestoreFlow.js
│   │   │   ├── useRestrictMovement.js
│   │   │   ├── useRestrictSubnetsInsideVPC.js
│   │   │   └── useSaveFlow.js
│   │   ├── index.js
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
│   │   │   └── VPCList.jsx
│   │   ├── panels
│   │   │   ├── DeployConfirmationRoutes.jsx
│   │   │   └── RoutePreviewPanel.jsx
│   │   ├── services
│   │   │   ├── deployNetworkToCloud.jsx
│   │   │   └── iconHelper.jsx
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
│   │       ├── infraHash.js
│   │       ├── initials-elements.js
│   │       ├── networkUtils.js
│   │       └── topologyValidation.js
│   ├── settings
│   │   ├── index.js
│   │   └── pages
│   └── vpcs
│       └── pages
│           └── VPCList.jsx
├── index.css
├── infraestructure
│   └── firebase
│       └── firebaseConfig.js
├── lib
│   ├── api.js
│   └── useTaskPoller.js
├── main.jsx
├── mocks
│   ├── Untitled-2024-03-23-1000.excalidraw
│   ├── Untitled-2024-03-23-1000.png
│   └── schema.text
├── pages
│   ├── Dashboard.jsx
│   └── Plans
│       ├── PlanDetailPage.jsx
│       └── PlanListPage.jsx
├── shared
│   └── constants
│       └── index.js
├── styles
│   ├── palettle.js
│   ├── theme.js
│   └── typografy.js
├── theme
│   ├── AppThemeProvider.jsx
│   ├── createPacketTheme.js
│   └── packetTracerTheme.js
└── utils
    ├── decideRouterMode.js
    └── hooks
        └── useUsersFetch.jsx

59 directories, 117 files
