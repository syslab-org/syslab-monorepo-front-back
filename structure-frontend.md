apps/frontend/src
├── App.css
├── App.jsx
├── assets
│   ├── background.cbcde707.jpg
│   └── react.svg
├── components
│   ├── TaskDemo.jsx
│   ├── common
│   │   ├── DashboardRoutes.jsx
│   │   ├── LoadingFlow.jsx
│   │   └── ProtectedRoute.jsx
│   ├── flow
│   │   ├── ConfirmDeployDialog.jsx
│   │   ├── MainFlow.jsx
│   │   ├── PacketToolbar.jsx
│   │   ├── SidebarFlow.jsx
│   │   ├── components
│   │   │   └── WizardModalLayout.jsx
│   │   ├── flow-hooks
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
│   │   ├── helper
│   │   │   ├── deployNetworkToCloud.jsx
│   │   │   └── iconHelper.jsx
│   │   ├── node-types
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
│   ├── layout
│   │   └── MainLayout.jsx
│   ├── pages
│   │   ├── PanelAdmin.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── TestComponent.jsx
│   │   ├── authentication
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegistrationPage.jsx
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
├── contexts
│   ├── AuthContext.jsx
│   ├── LoadingFlowContext.jsx
│   ├── NetworkNodesContext.jsx
│   └── WizardContext.jsx
├── features
│   ├── Authentications
│   │   ├── InviteUserForm.jsx
│   │   └── RegistrationForm.jsx
│   └── ModalLayout.jsx
├── firebase
│   └── firebaseConfig.js
├── index.css
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
├── services
│   └── authServices.js
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
        ├── useInviteUserFormValidation.jsx
        ├── useRegistrationUserFormValidation.jsx
        └── useUsersFetch.jsx

42 directories, 108 files
