// apps/frontend/src/components/flow/MainFlow.jsx
import PacketToolbar from "@/features/networkCanvas/panels/PacketToolbar";
import { useReactFlow } from "@xyflow/react";
import { useCanvasController } from "@/features/networkCanvas/core/useCanvasController";
import { useRoutingPreview } from "@/features/networkCanvas/core/useRoutingPreview";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { initialNodes } from '../utils/initials-elements';
import { useCanvasInitialization } from "@/features/networkCanvas/core/useCanvasInitialization";
// mui
import NodeConfigModal from "@/features/networkCanvas/modals/NodeConfigModal";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Modal,
  Snackbar,
  Stack,
  Typography
} from "@mui/material";
// import Modal from 'react-modal';
import ReactFlowCanvas from "@/features/networkCanvas/canvas/ReactFlowCanvas";
import { useNodeActions } from "@/features/networkCanvas/domain/useNodeActions";
import '@xyflow/react/dist/style.css';
import '../../../App.css';
import '../styles/packet-tracer.css';
//Custom compoonents and hooks
import { useWizard } from "@/features/networkCanvas/context/WizardContext";
import { useCanvasPlanState } from "@/features/networkCanvas/core/useCanvasPlanState";
import useRestoreFlow from '@/features/networkCanvas/core/useRestoreFlow';
import useSaveFlow from '@/features/networkCanvas/core/useSaveFlow';
import { useFlowState } from '@/features/networkCanvas/hooks/useFlowState';
import useNodeClick from '@/features/networkCanvas/hooks/useNodeClick';
import useNodeDrag from '@/features/networkCanvas/hooks/useNodeDrag';
import { useVpcRouterSync } from "@/features/networkCanvas/core/useVpcRouterSync";
import InstanceNode from "@/features/networkCanvas/nodes/InstanceNode";
import RouterNodeInstance from "@/features/networkCanvas/nodes/RouterNodeInstance";
import SubNetworkNodeInstance from '@/features/networkCanvas/nodes/SubNetworkNodeInstance';
import VPCNodeInstance from "@/features/networkCanvas/nodes/VPCNodeInstance";
import SidebarFlow from '@/features/networkCanvas/panels/SidebarFlow';
import useCidrBlockVPCStore from '@/features/networkCanvas/store/cidrBlocksIp';
import useClickedNodeIdStore from '@/features/networkCanvas/store/clickedNodeIdStore';
import { computeInfraHash } from "@/features/networkCanvas/utils/infraHash";
import { useCanvasDirtyState } from "@/features/networkCanvas/core/useCanvasDirtyState";
import CanvasFeedbackLayer from "@/features/networkCanvas/ui/CanvasFeedbackLayer";

import { useLocation, useNavigate } from 'react-router-dom';
// Importar constantes
import {
  flowKey,
  TYPE_ROUTER_NODE,
  TYPE_SUBNETWORK_NODE,
  TYPE_VPC_NODE
} from '@/features/networkCanvas/utils/constants';
import { useNodeSelection } from "@/features/networkCanvas/domain/useNodeSelection";

import { LoadingFlowContext } from "@/app/providers/LoadingFlowContext.jsx";
import { NetworkProvider } from "@/features/networkCanvas/context/NetworkNodesContext";
import { useNetworkPlanController } from "@/features/networkCanvas/core/useNetworkPlanController";
import { usePlanMeta } from "@/features/networkCanvas/core/usePlanMeta";
import { usePlanPolling } from "@/features/networkCanvas/core/usePlanPolling";
import useHandleDrop from "@/features/networkCanvas/hooks/useHandleDrop";
import useRestrictMovement from "@/features/networkCanvas/hooks/useRestrictMovement";
import { useRestrictSubnetsInsideVPC } from "@/features/networkCanvas/hooks/useRestrictSubnetsInsideVPC";
import ConfirmDeployDialog from "@/features/networkCanvas/modals/ConfirmDeployDialog";
import RoutePreviewPanel from "@/features/networkCanvas/panels/RoutePreviewPanel";
// import { buildRoutingPreview } from "@/features/networkCanvas/utils/buildRoutingPreview";
// import { db } from "@/infrastructure/firebase/firebaseConfig";
import { useTheme } from "@mui/material/styles";
// import { collection, getDocs } from "firebase/firestore";
import { useContext } from "react";
import { useAmiList } from "@/features/networkCanvas/core/useAmiList";

const nodeTypes = {
  vpc: VPCNodeInstance,
  subnetwork: SubNetworkNodeInstance,
  router: RouterNodeInstance,
  computer: InstanceNode,
  printer: InstanceNode,
  server: InstanceNode
}




const makeRandomId = (length) => {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// eslint-disable-next-line no-unused-vars
let id = makeRandomId(10);

const getId = {
  nextId: () => makeRandomId(100),
  setId: (newId) => { id = newId; }
};









const connectionLineStyle = {
  strokeWidth: 2.5,
  stroke: "#2c3e50",
  strokeDasharray: "6 4",
};

const useBodyClass = (className, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className, enabled]);
};


// eslint-disable-next-line react-refresh/only-export-components
function MainFlow() {
  const params = useParams();
  const { vpcid } = params;

  useEffect(() => {
    console.log("ROUTE PARAMS", params);
  }, [params]);
  const navigate = useNavigate();
  const theme = useTheme();
  // Full-bleed layout for the Flow canvas (removes global content max-width/padding)
  useBodyClass("flow-fullbleed", true);
  const dotColor = theme.palette.mode === 'light'
    ? 'rgba(90,98,117,0.15)'
    : 'rgba(200,210,230,0.12)';

  const [restorationDone, setRestorationDone] = useState(false);
  const [canvasPlanId, setCanvasPlanId] = useState(null);
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [canvasPlanInfo, setCanvasPlanInfo] = useState(null);
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);
  const [canvasUiError, setCanvasUiError] = useState(null);
  const [validatedPlanHash, setValidatedPlanHash] = useState(null);
  const [hasValidatedInSession, setHasValidatedInSession] = useState(false);

  const { loadingFlow } = useContext(LoadingFlowContext);

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    handleZoomIn,
    handleZoomOut,
    handleFitView
  } = useCanvasController(initialNodes);

  useRestrictSubnetsInsideVPC();

  useVpcRouterSync({
    nodes,
    edges,
    setNodes
  });

  const reactFlow = useReactFlow();

  // eslint-disable-next-line no-unused-vars
  const [target, setTarget] = useState(null);
  const amiList = useAmiList();

  const {
    isCanvasDirty,
    setIsCanvasDirty,
    editGuardOpen,
    setEditGuardOpen,
    guardBeforeEdit,
    ignoreDirtyGuard,
    setIgnoreDirtyGuard,
    editGuardRef
  } = useCanvasDirtyState({
    nodes,
    edges,
    canvasPlanId,
    validatedPlanHash,
    restorationDone,
    hasValidatedInSession,
    isCanvasLocked,
    setCanvasUiError
  });

  // eslint-disable-next-line no-unused-vars
  const [clickedNodeId, setClickedNodeId] = useClickedNodeIdStore(state => [state.clickedNodeId, state.setClickedNodeId])

  const [cidrBlockVPC, prefixLength, setCidrBlockVPC, setPrefixLength] = useCidrBlockVPCStore(state => [
    state.cidrBlockVPC,
    state.prefixLength,
    state.setCidrBlockVPC,
    state.setPrefixLength
  ]);


  // eslint-disable-next-line no-unused-vars
  const [nodeName, setNodeName] = useState("Node - 1")
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const { setViewport } = useReactFlow();

  const {
    modalIsOpen,
    selectedNode,
    openNodeModal,
    closeNodeModal,
    setSelectedNode,
    setModalIsOpen
  } = useNodeSelection();

  const { onDrop } = useHandleDrop(reactFlowInstance, setNodes, setCanvasUiError);
  const { onNodeDragStop } = useRestrictMovement(reactFlowInstance, setNodes);
  const [allowCrossVpcPingUI, setAllowCrossVpcPingUI] = useState(null);
  // const [vpcData, setVPCData] = useState(null);

  const reactFlowWrapper = useRef(null);
  const dragRef = useRef(null);
  //const connectionCreated = useRef(true)

  const { isValidConnection, onConnectStart, onConnect, onConnectEnd } = useFlowState()

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);


  const isPlanRunning = (st) => {
    const s = String(st || '').toUpperCase();
    return s === 'RUNNING' || s === 'PENDING' || s === 'STARTED';
  };

  // Load plan metadata (planId + planCanvasHash) from Firestore and keep it actualizado en 
  // el estado del canvas. Esto es clave para la lógica de "dirty" y validación.

  usePlanMeta({
    vpcid,
    setCanvasPlanId,
    setValidatedPlanHash
  });


  const onNodeClickBase = useNodeClick(openNodeModal, setModalIsOpen);
  const onNodeClick = onNodeClickBase;

  // Hook para mantener el canvas sincronizado con el estado del plan en backend
  usePlanPolling({
    canvasPlanId,
    setCanvasPlanInfo,
    setIsCanvasLocked,
    isPlanRunning
  });


  const closeModal = closeNodeModal;



  const onNodeDragStart = useCallback((_, node) => {
    setNodes(nds => nds.map(n => ({ ...n, selected: n.id === node.id })));
  }, [setNodes]);

  const onNodeDrag = useNodeDrag({ nodes, setTarget, TYPE_SUBNETWORK_NODE });
  //const onNodeDragStop = useNodeDragStop({ nodes, setNodes, reactFlow, TYPE_SUBNETWORK_NODE, TYPE_VPC_NODE });
  const onSaveFlow = useSaveFlow({ reactFlowInstance, flowKey, vpcid });
  const onRestoreFlow = useRestoreFlow({ setNodes, setEdges, setViewport, flowKey, getId, setCanvasPlanId });
  const { saveNodeData, deleteNodeInstance } = useNodeActions({
    nodes,
    setNodes,
    selectedNode,
    clickedNodeId,
    closeModal,
    onSaveFlow
  });

  const {
    showConfirmation,
    transformedData,
    planName,
    setPlanName,
    simulateOnly,
    setSimulateOnly,
    processJsonToCloud,
    handleCancelDeploy,
    handleConfirmDeploy,
    successMessage,
    errorMessage,
    handleCloseSnackbar,
    validationState,
    validationError,
    validationResult,
    handleValidatePlan,
    handleApplyReal,
    handleOpenPlanDetails,
    planValidationOk,
    planCanvasHash,
  } = useNetworkPlanController({
    nodes,
    edges,
    allowCrossVpcPingUI,
    firestoreVpcId: vpcid
  });

  const {
    routesPreviewOpen,
    routesPreviewData,
    openRoutesPreview,
    closeRoutesPreview
  } = useRoutingPreview(nodes, edges);

  const { canvasState, validationStateForToolbar } = useCanvasPlanState({
    canvasPlanId,
    validatedPlanHash,
    isCanvasDirty,
    validationState,
    validationResult,
    nodes,
    edges,
    vpcid,
    setCanvasPlanId,
    setValidatedPlanHash,
    setIsCanvasDirty,
    setHasValidatedInSession,
    isCanvasLocked
  });

  const location = useLocation();
  const isWizardEntry = new URLSearchParams(location.search).get("wizard") === "1";

  const { active, start, setStep } = useWizard();

  useEffect(() => {
    if (!isWizardEntry) return;
    //Si vengo de laboratorio guiado, iniciar el wizard y avanzo al paso del canvas
    if (!active) start();
    setStep("flow-canvas");
  }, [isWizardEntry, active, start, setStep]);

  useEffect(() => {


    return () => {
      // console.log("nodes useffect", nodes);
      // console.log("cidrBlockVPC: ", cidrBlockVPC);


    }
  }, [nodes])

  useEffect(() => {
    if (restorationDone) {
      // console.log("✅ CIDR restaurado:", cidrBlockVPC, prefixLength);
    }
  }, [restorationDone, cidrBlockVPC, prefixLength]);


  // Hook para inicializar el canvas restaurando el flow guardado en backend (si existe)
  useCanvasInitialization({
    onRestoreFlow,
    setRestorationDone
  });

  // Función para restaurar los nodos a su estado inicial



  // Función para restaurar los nodos a su estado inicial
  const restoreInitialNodes = () => {
    setNodes(initialNodes);
  };
  return (
    <NetworkProvider>
      <Backdrop
        open={!!loadingFlow}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="h6">🔄 Procesando…</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Validando/ejecutando plan o restaurando red. No cierres la pestaña.
          </Typography>
        </Stack>
      </Backdrop>
      <Grid
        container
        sx={{
          height: "calc(100vh - 64px)",
          px: 1,
          pb: 1,
          boxSizing: "border-box",
        }}
      >


        <Grid item xs={12}>
          <Box
            ref={reactFlowWrapper}
            sx={{
              height: "100%",
              display: "flex",
              borderRadius: 1,
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              backgroundColor: "background.paper",
            }}
          >
            {/* Sidebar */}
            <Box
              sx={{
                width: { xs: 220, md: 260 },
                borderRight: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <SidebarFlow />
            </Box>

            {/* Main Canvas Area */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              {isWizardEntry && (
                <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography variant="overline" color="text.secondary">
                    LABORATORIO GUIADO
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.5 }}>
                    Paso 2: Diseña tu arquitectura
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Arrastra una VPC al lienzo, luego crea una subnet y una instancia. Después pasamos a ruteo y pruebas.
                  </Typography>
                </Box>
              )}
              <Box
                sx={{
                  flexShrink: 0,
                  position: "sticky",
                  top: 0,
                  zIndex: 50,
                  backgroundColor: (t) => t.palette.background.paper,
                }}
              >
                <PacketToolbar
                  onSave={onSaveFlow}
                  onRestore={onRestoreFlow}
                  onRestoreInitial={restoreInitialNodes}
                  onDeploy={guardBeforeEdit(processJsonToCloud)}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onFitView={handleFitView}
                  title="Architecture Studio"
                  onPreviewRoutes={openRoutesPreview}
                  planStatus={canvasPlanInfo}
                  canvasState={canvasState}
                  validationState={validationStateForToolbar}
                />
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  position: "relative",
                  backgroundColor: (t) =>
                    t.palette.mode === "light" ? "#f4f6fa" : "#0f172a",
                }}
              >
                {nodes.length === 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      zIndex: 10,
                    }}
                  >
                    <Box
                      sx={{
                        background:
                          theme.palette.mode === "light"
                            ? "#ffffffdd"
                            : "#0f172add",
                        border: "1px dashed",
                        borderColor: "divider",
                        borderRadius: 2,
                        px: 4,
                        py: 3,
                        textAlign: "center",
                        backdropFilter: "blur(6px)",
                        maxWidth: 420,
                      }}
                    >
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        Comienza creando tu red
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        1. Arrastra una VPC desde la izquierda.
                        2. Dentro de la VPC crea una Subnet.
                        3. Luego agrega instancias.
                      </Typography>
                    </Box>
                  </Box>
                )}
                <ReactFlowCanvas
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  onConnect={guardBeforeEdit((params) =>
                    onConnect(params, setEdges, () => reactFlowInstance?.getEdges?.() || [])
                  )}
                  onInit={setReactFlowInstance}
                  onDrop={guardBeforeEdit(onDrop)}
                  onNodeDragStart={onNodeDragStart}
                  onNodeDrag={onNodeDrag}
                  onNodeDragStop={onNodeDragStop}
                  onDragOver={onDragOver}
                  onConnectStart={onConnectStart}
                  onConnectEnd={onConnectEnd}
                  isValidConnection={(connection) => isValidConnection(connection, nodes)}
                  connectionLineStyle={connectionLineStyle}
                  setNodes={setNodes}
                  reactFlowInstance={reactFlowInstance}
                  theme={theme}
                />
              </Box>
              <CanvasFeedbackLayer
                canvasUiError={canvasUiError}
                setCanvasUiError={setCanvasUiError}
                editGuardOpen={editGuardOpen}
                setEditGuardOpen={setEditGuardOpen}
                canvasPlanId={canvasPlanId}
                navigate={navigate}
                processJsonToCloud={processJsonToCloud}
                setIgnoreDirtyGuard={setIgnoreDirtyGuard}
                editGuardRef={editGuardRef}
                showConfirmation={showConfirmation}
                restorationDone={restorationDone}
                handleCancelDeploy={handleCancelDeploy}
                validationState={validationState}
                canvasState={canvasState}
                validationResult={validationResult}
                transformedData={transformedData}
                handleValidatePlan={handleValidatePlan}
                handleApplyReal={handleApplyReal}
                handleOpenPlanDetails={handleOpenPlanDetails}
                loadingFlow={loadingFlow}
                successMessage={successMessage}
                errorMessage={errorMessage}
                handleCloseSnackbar={handleCloseSnackbar}
              />

            </Box>
          </Box>

        </Grid>
        <RoutePreviewPanel
          open={routesPreviewOpen}
          onClose={closeRoutesPreview}
          nodes={nodes}
          edges={edges}
        />

        <NodeConfigModal
          modalIsOpen={modalIsOpen}
          closeModal={closeModal}
          selectedNode={selectedNode}
          nodes={nodes}
          edges={edges}
          amiList={amiList}
          saveNodeData={saveNodeData}
          deleteNodeInstance={deleteNodeInstance}
          cidrBlockVPC={cidrBlockVPC}
          prefixLength={prefixLength}
        />


        <Modal
          open={routesPreviewOpen}
          onClose={closeRoutesPreview}
          aria-labelledby="routes-preview-title"
          aria-describedby="routes-preview-description"
        >
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60%',
            height: '70%',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            overflow: 'hidden',
          }}>
            <Typography id="routes-preview-title" variant="h6" component="h2">
              Routing Preview
            </Typography>
            <Typography id="routes-preview-description" sx={{ mt: 1 }}>
              Tablas de enrutamiento construidas por VPC (intra = local, inter = vía router conectado).
            </Typography>

            <Box sx={{
              maxHeight: '75%',
              overflowY: 'auto',
              mt: 2,
              border: '1px solid #ccc',
              padding: 2,
              height: '100%'
            }}>
              <pre>{JSON.stringify(routesPreviewData, null, 2)}</pre>
            </Box>

            <Stack mt={3} direction="row" spacing={2} flexWrap="wrap">
              <Button variant="contained" onClick={closeRoutesPreview}>
                Cerrar
              </Button>
            </Stack>
          </Box>
        </Modal>




      </Grid>
    </NetworkProvider>




  )
}

export default MainFlow