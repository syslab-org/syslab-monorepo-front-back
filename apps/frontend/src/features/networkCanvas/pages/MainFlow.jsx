// apps/frontend/src/components/flow/MainFlow.jsx
import { useCanvasInitialization } from "@/features/networkCanvas/core/useCanvasInitialization";
import { useCanvasRuntimeController } from "@/features/networkCanvas/core/useCanvasRuntimeController";
import { useRoutingPreview } from "@/features/networkCanvas/core/useRoutingPreview";
import PacketToolbar from "@/features/networkCanvas/panels/PacketToolbar";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { initialNodes } from '../utils/initials-elements';
// mui
import NodeConfigModal from "@/features/networkCanvas/modals/NodeConfigModal";
import {
  Backdrop,
  Box,
  CircularProgress,
  Grid,
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
import { connectionLineStyle, nodeTypes } from "@/features/networkCanvas/canvas/canvasConfig";
import { useWizard } from "@/features/networkCanvas/context/WizardContext";
import { useCanvasDirtyState } from "@/features/networkCanvas/core/useCanvasDirtyState";
import { useCanvasInteractionController } from "@/features/networkCanvas/core/useCanvasInteractionController";
import { useCanvasPlanState } from "@/features/networkCanvas/core/useCanvasPlanState";
import useRestoreFlow from '@/features/networkCanvas/core/useRestoreFlow';
import useSaveFlow from '@/features/networkCanvas/core/useSaveFlow';
import useNodeClick from '@/features/networkCanvas/hooks/useNodeClick';
import SidebarFlow from '@/features/networkCanvas/panels/SidebarFlow';
import useCidrBlockVPCStore from '@/features/networkCanvas/store/cidrBlocksIp';
import useClickedNodeIdStore from '@/features/networkCanvas/store/clickedNodeIdStore';
import CanvasFeedbackLayer from "@/features/networkCanvas/ui/CanvasFeedbackLayer";
import FlowWorkspace from "@/features/networkCanvas/layout/FlowWorkspace";

import { useLocation, useNavigate } from 'react-router-dom';
// Importar constantes
import { useNodeSelection } from "@/features/networkCanvas/domain/useNodeSelection";
import {
  flowKey,
  TYPE_SUBNETWORK_NODE
} from '@/features/networkCanvas/utils/constants';

import { LoadingFlowContext } from "@/app/providers/LoadingFlowContext.jsx";
import { NetworkProvider } from "@/features/networkCanvas/context/NetworkNodesContext";
import { useNetworkPlanController } from "@/features/networkCanvas/core/useNetworkPlanController";
import { usePlanMeta } from "@/features/networkCanvas/core/usePlanMeta";
import { usePlanPolling } from "@/features/networkCanvas/core/usePlanPolling";
import RoutePreviewPanel from "@/features/networkCanvas/panels/RoutePreviewPanel";
// import { buildRoutingPreview } from "@/features/networkCanvas/utils/buildRoutingPreview";
// import { db } from "@/infrastructure/firebase/firebaseConfig";
import { useTheme } from "@mui/material/styles";
// import { collection, getDocs } from "firebase/firestore";
import { useAmiList } from "@/features/networkCanvas/core/useAmiList";
import { useContext } from "react";





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

  const [target, setTarget] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const canvas = useCanvasRuntimeController({
    initialNodes,
    setCanvasUiError,
    reactFlowInstance,
    setTarget,
    TYPE_SUBNETWORK_NODE
  });

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    isValidConnection,
    onConnectStart,
    onConnect,
    onConnectEnd,
    onDrop,
    onNodeDrag,
    onNodeDragStop
  } = canvas;

  const isValidConnectionMemo = useCallback(
    (connection) => isValidConnection(connection, nodes),
    [isValidConnection, nodes]
  );




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
  const { setViewport } = useReactFlow();

  const {
    modalIsOpen,
    selectedNode,
    openNodeModal,
    closeNodeModal,
    setSelectedNode,
    setModalIsOpen
  } = useNodeSelection();

  const [allowCrossVpcPingUI, setAllowCrossVpcPingUI] = useState(null);
  // const [vpcData, setVPCData] = useState(null);

  const reactFlowWrapper = useRef(null);
  const dragRef = useRef(null);
  //const connectionCreated = useRef(true)




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



  const { onDragOver, onNodeDragStart, restoreInitialNodes } = useCanvasInteractionController({
    setNodes,
    initialNodes
  });
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
          <FlowWorkspace
            reactFlowWrapper={reactFlowWrapper}
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
            isValidConnection={isValidConnectionMemo}
            connectionLineStyle={connectionLineStyle}
            setNodes={setNodes}
            reactFlowInstance={reactFlowInstance}
            theme={theme}
            toolbarProps={{
              onSave: onSaveFlow,
              onRestore: onRestoreFlow,
              onRestoreInitial: restoreInitialNodes,
              onDeploy: guardBeforeEdit(processJsonToCloud),
              onZoomIn: handleZoomIn,
              onZoomOut: handleZoomOut,
              onFitView: handleFitView,
              title: "Architecture Studio",
              onPreviewRoutes: openRoutesPreview,
              planStatus: canvasPlanInfo,
              canvasState,
              validationState: validationStateForToolbar
            }}
            feedbackProps={{
              canvasUiError,
              setCanvasUiError,
              editGuardOpen,
              setEditGuardOpen,
              canvasPlanId,
              navigate,
              processJsonToCloud,
              setIgnoreDirtyGuard,
              editGuardRef,
              showConfirmation,
              restorationDone,
              handleCancelDeploy,
              validationState,
              canvasState,
              validationResult,
              transformedData,
              handleValidatePlan,
              handleApplyReal,
              handleOpenPlanDetails,
              loadingFlow,
              successMessage,
              errorMessage,
              handleCloseSnackbar
            }}
          />

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






      </Grid>
    </NetworkProvider>




  )
}

export default MainFlow