// apps/frontend/src/components/flow/MainFlow.jsx
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PacketToolbar from "./PacketToolbar";
import { initialNodes } from './utils/initials-elements';
// mui
import {
  Alert,
  Box,
  Button,
  Card,
  Grid,
  Modal,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
// import Modal from 'react-modal';
import '@xyflow/react/dist/style.css';
import '../../App.css';
import './styles/packet-tracer.css';
//Custom compoonents and hooks
import SidebarFlow from './SidebarFlow';
import { useFlowState } from './flow-hooks/useFlowState';
import useNodeClick from './flow-hooks/useNodeClick';
import useNodeDrag from './flow-hooks/useNodeDrag';
import useRestoreFlow from './flow-hooks/useRestoreFlow';
import useSaveFlow from './flow-hooks/useSaveFlow';
import InstanceNodeForm from './forms/InstanceNodeForm';
import RouterNodeForm from './forms/RouterNodeForm';
import SubNetworkNodeForm from './forms/SubNetworkNodeForm';
import VPCNodeForm from './forms/VPCNodeForm';
import InstanceNode from "./node-types/InstanceNode";
import RouterNodeInstance from "./node-types/RouterNodeInstance";
import SubNetworkNodeInstance from './node-types/SubNetworkNodeInstance';
import VPCNodeInstance from "./node-types/VPCNodeInstance";
import useCidrBlockVPCStore from './store/cidrBlocksIp';
import useClickedNodeIdStore from './store/clickedNodeIdStore';
import { useLocation } from 'react-router-dom';
import { useWizard } from "../../contexts/WizardContext";

// Importar constantes
import {
  DB_AMI_LIST,
  flowKey,
  TYPE_COMPUTER_NODE,
  TYPE_DEFAULT_NODE,
  TYPE_PRINTER_NODE,
  TYPE_ROUTER_NODE,
  TYPE_SERVER_NODE,
  TYPE_SUBNETWORK_NODE,
  TYPE_VPC_NODE
} from './utils/constants';

import { useTheme } from "@mui/material/styles";
import { collection, getDocs } from "firebase/firestore";
import { useContext } from "react";
import { LoadingFlowContext } from "../../contexts/LoadingFlowContext";
import { NetworkProvider } from "../../contexts/NetworkNodesContext";
import { db } from "../../firebase/firebaseConfig";
import ConfirmDeployDialog from "./ConfirmDeployDialog";
import useDeployNetwork from "./flow-hooks/useDeployNetwork";
import useHandleDrop from "./flow-hooks/useHandleDrop";
import useRestrictMovement from "./flow-hooks/useRestrictMovement";
import { useRestrictSubnetsInsideVPC } from "./flow-hooks/useRestrictSubnetsInsideVPC";
import RoutePreviewPanel from "./panels/RoutePreviewPanel";
import { buildRoutingPreview } from "./utils/buildRoutingPreview";


const nodeTypes = {
  vpc: VPCNodeInstance,
  subnetwork: SubNetworkNodeInstance,
  router: RouterNodeInstance,
  computer: InstanceNode,
  printer: InstanceNode,
  server: InstanceNode
}


const restrictedNodes = [TYPE_DEFAULT_NODE, TYPE_COMPUTER_NODE, TYPE_PRINTER_NODE, TYPE_SERVER_NODE]


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





const styleModal = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 880,           // << sube a 880px
  maxWidth: '95vw',
  maxHeight: '85vh',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};




const connectionLineStyle = { strokeWidth: 2, stroke: '#1a2438' };

// eslint-disable-next-line react-refresh/only-export-components
function MainFlow() {
  const { vpcid } = useParams()
  const theme = useTheme();
  const dotColor = theme.palette.mode === 'light'
    ? 'rgba(90,98,117,0.15)'
    : 'rgba(200,210,230,0.12)';

  const initialEdges = [];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [restorationDone, setRestorationDone] = useState(false);
  const [showRoutePreview, setShowRoutePreview] = useState(false);

  const { loadingFlow } = useContext(LoadingFlowContext);
  useRestrictSubnetsInsideVPC()
  const reactFlow = useReactFlow();

  const rf = useReactFlow();
  const handleZoomIn = () => rf.zoomIn();
  const handleZoomOut = () => rf.zoomOut();
  const handleFitView = () => rf.fitView({ padding: .2 });

  // eslint-disable-next-line no-unused-vars
  const [target, setTarget] = useState(null);
  const [amiList, setAmiList] = useState([]);
  const [routesPreviewOpen, setRoutesPreviewOpen] = useState(false);
  const [routesPreviewData, setRoutesPreviewData] = useState(null);

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

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const { onDrop } = useHandleDrop(reactFlowInstance, setNodes);
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


  const onNodeClick = useNodeClick(setSelectedNode, setModalIsOpen);


  const closeModal = () => {
    setModalIsOpen(false)
    setSelectedNode(null)
  }

  const saveNodeData = (data) => {
    console.log("saveNodeData - data recibido:", data);

    // 🧩 Normaliza nombres si el nodo es una VPC
    let normalized = { ...data };
    if (selectedNode?.type === TYPE_VPC_NODE) {
      normalized = {
        ...data,
        // Nombres posibles
        vpcName: data.vpcName || data.name || data.title,
        // CIDR (acepta camelCase o snake_case)
        cidrBlock: data.cidrBlock || data.cidr_block,
        prefixLength: data.prefixLength ?? data.prefix_length,
        // Booleans correctos
        internetGateway: data.internetGateway ?? data.internet_gateway,
        enableNatGateway:
          data.enableNatGateway ??
          (data.nat_gateway && data.nat_gateway.enabled),
        // Mantén objetos si vienen anidados
        nat_gateway: data.nat_gateway,
        allowedSshCidr: data.allowedSshCidr || data.allowed_ssh_cidr,
        // Genera el título visible
        title: data.vpcName || data.name || "VPC",
      };

      // Si vino CIDR completo (ej: 10.0.0.0/16), sepáralo
      if (typeof normalized.cidrBlock === "string" && normalized.cidrBlock.includes("/")) {
        const [base, pref] = normalized.cidrBlock.split("/");
        normalized.cidrBlock = base.trim();
        normalized.prefixLength = Number(pref);
      }
    }

    // 🔹 Mezcla en el nodo correspondiente
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== selectedNode.id) return node;

        return {
          ...node,
          data: {
            ...node.data,
            ...normalized,
          },
        };
      })
    );

    // 🔸 Guarda y cierra modal
    onSaveFlow();
    closeModal();
  };

  const deleteNodeInstance = () => {

    setNodes((nds) => {
      const nodeToDelete = nds.find((node) => node.id === clickedNodeId);
      // console.log("nodeToDelete: ", nodeToDelete.type);

      if (!nodeToDelete) {
        // console.log("Node not found");
        return nds;
      }

      // ---- Borrado recursivo desde nodo tipo VPC ----
      if (nodeToDelete.type === TYPE_VPC_NODE) {

        //1. Encontrar todo los nodos subnets de la VPC
        const subnetworksToDelete = nds.filter((node) => node.parentNode === nodeToDelete.id && node.type === TYPE_SUBNETWORK_NODE);

        //2. Encuentra todas las Instancias e hijos de las subnets
        const subnetIds = subnetworksToDelete.map((subnet) => subnet.id);
        const instancesToDelete = nds.filter((node) => subnetIds.includes(node.parentNode));


        //3. Filtrar fuera: la VPC, sus Subnets y todas las Instancias hijas
        return nds.filter((n) =>
          n.id !== nodeToDelete.id && // Quita la VPC
          !subnetIds.includes(n.id) && // Quita las subnets hijas
          !instancesToDelete.some((inst) => inst.id === n.id) // Quita instancias hijas de las subnets
        )
      }


      // ---- Borrado recursivo desde nodo tipo Subnet ----
      if (nodeToDelete.type === TYPE_SUBNETWORK_NODE) {
        // 1. Encuentra todas las Instancias dentro de la Subnet
        const instancesToDelete = nds.filter((n) => n.parentNode === nodeToDelete.id);
        // 2. Filtra fuera la Subnet y sus hijos
        return nds.filter(
          (n) =>
            n.id !== nodeToDelete.id &&
            !instancesToDelete.some((inst) => inst.id === n.id)
        );
      }

      return nds.filter((node) => node.id !== clickedNodeId);

    })


    // setNodes((nds) => nds.filter((node) => node.id !== clickedNodeId))
    // // console.log(`Node with ID: ${clickedNodeId} has been deleted`);
    closeModal()

  }



  const onNodeDragStart = useCallback((_, node) => {
    setNodes(nds => nds.map(n => ({ ...n, selected: n.id === node.id })));
  }, [setNodes]);

  const onNodeDrag = useNodeDrag({ nodes, setTarget, TYPE_SUBNETWORK_NODE });
  //const onNodeDragStop = useNodeDragStop({ nodes, setNodes, reactFlow, TYPE_SUBNETWORK_NODE, TYPE_VPC_NODE });
  const onSaveFlow = useSaveFlow({ reactFlowInstance, flowKey, vpcid });
  const onRestoreFlow = useRestoreFlow({ setNodes, setEdges, setViewport, flowKey, getId });

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
    handleCloseSnackbar
  } = useDeployNetwork({ nodes, edges, allowCrossVpcPingUI })

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



  const fetchAmiList = async () => {
    try {
      const amiListCollection = collection(db, DB_AMI_LIST)
      const amiListSnapshot = await getDocs(amiListCollection)
      const amiListResponse = amiListSnapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }))
      // console.log("amiListResponse: ", amiListResponse);

      setAmiList(amiListResponse)
    } catch (error) {
      console.error('Error fetching AMI list:', error);
    }
  }

  useEffect(() => {
    const handleFlowRestore = async () => {
      fetchAmiList()
      await onRestoreFlow();
      setRestorationDone(true);
    }
    handleFlowRestore();
  }, [onRestoreFlow]);

  // helper para comparar arrays simples sin ordenar
  const shallowArrEq = (a = [], b = []) =>
    a.length === b.length && a.every(x => b.includes(x));

  useEffect(() => {
    // 1) Mapa VPC -> routers conectados (derivado SOLO de edges)
    const idToType = new Map(nodes.map(n => [n.id, n.type])); // solo lectura
    const vpcToRouters = new Map();

    edges.forEach(e => {
      const sType = idToType.get(e.source);
      const tType = idToType.get(e.target);
      const isVpcRouter =
        (sType === TYPE_VPC_NODE && tType === TYPE_ROUTER_NODE) ||
        (sType === TYPE_ROUTER_NODE && tType === TYPE_VPC_NODE);

      if (!isVpcRouter) return;

      const vpcId = (sType === TYPE_VPC_NODE) ? e.source : e.target;
      const routerId = (sType === TYPE_ROUTER_NODE) ? e.source : e.target;

      if (!vpcToRouters.has(vpcId)) vpcToRouters.set(vpcId, new Set());
      vpcToRouters.get(vpcId).add(routerId);
    });

    // 2) Detectar cambios reales
    const updates = [];
    for (const n of nodes) {
      if (n.type !== TYPE_VPC_NODE) continue;
      const newList = Array.from(vpcToRouters.get(n.id) || []);
      const prevList = Array.isArray(n.data?.connectedRouters) ? n.data.connectedRouters : [];
      if (!shallowArrEq(newList, prevList)) {
        updates.push({ id: n.id, newList });
      }
    }

    // 3) Si no hay cambios, no setear (evita re-render en bucle)
    if (updates.length === 0) return;

    setNodes(curr =>
      curr.map(n => {
        const u = updates.find(x => x.id === n.id);
        return u
          ? { ...n, data: { ...n.data, connectedRouters: u.newList } }
          : n;
      })
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges]);



  // Función para restaurar los nodos a su estado inicial
  const restoreInitialNodes = () => {
    setNodes(initialNodes);
  };

  if (loadingFlow) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">🔄 Restaurando red... espera un momento</Typography>
      </Box>
    );
  }


  return (
    <NetworkProvider>
      <Grid container >
        <Grid item xs={12} sm={2} md={2}>

          <Card
            sx={{
              height: { sm: "60vh" },
              my: { xs: 1, sm: 0 },
              borderRadius: { xs: 2, sm: "16px 0 0 16px" },
            }}
          >
            <SidebarFlow />

          </Card>
        </Grid>

        <Grid item xs={12} sm={10} md={10}>
          <Card sx={{
            width: "100%",
            height: "100vh",
            borderRadius: { xs: 2, sm: "0 16px 16px 0" },
          }}
            ref={reactFlowWrapper} >
            {isWizardEntry && (
              <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">
                  LABORATORIO GUIADO
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                  Paso 2: Construye tu topología
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Arrastra una VPC al lienzo, luego crea una subnet y una instancia. Después pasamos a ruteo y pruebas.
                </Typography>
              </Box>
            )}
            <PacketToolbar
              onSave={onSaveFlow}
              onRestore={onRestoreFlow}
              onRestoreInitial={restoreInitialNodes}
              onDeploy={processJsonToCloud}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFitView={handleFitView}
              title="Logical"
              onPreviewRoutes={() => {
                const preview = buildRoutingPreview(nodes, edges);
                setRoutesPreviewData(preview);
                setRoutesPreviewOpen(true);
                // si quieres ver en consola también:
                // console.log('ROUTES PREVIEW', preview);
              }}

            />



            <ReactFlow
              nodes={nodes}
              edges={edges.map(e => ({ ...e, style: connectionLineStyle, animated: true }))}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onConnect={(params) => onConnect(params, setEdges, () => reactFlowInstance?.getEdges?.() || [])}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onNodeDragStart={onNodeDragStart}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
              onDragOver={onDragOver}
              backgroundVariant="dots"
              snapToGrid
              snapGrid={[24, 24]}              // alineación limpia
              selectionOnDrag={false}          // evita seleccionar “marco azul” al arrastrar
              elevateNodesOnSelect
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              fitViewOptions={{
                padding: 0.2,
              }}
              isValidConnection={(connection) => isValidConnection(connection, nodes)}
              className="overview"
              nodeTypes={nodeTypes}
              nodeOrigin={[0, 0]}
              style={{
                backgroundColor: "#D3D2E5",
              }}
              connectionLineStyle={connectionLineStyle}
              onPaneClick={() => setNodes(nds => nds.map(n => ({ ...n, selected: false })))}

            >

              <Controls />
              <Background variant="dots" gap={24} size={1.2} color={dotColor} />
              <Panel position="top-right">
                <Button variant="contained" size="small" onClick={() => setShowRoutePreview(true)}>
                  Preview de rutas
                </Button>
              </Panel>

            </ReactFlow>


            <ConfirmDeployDialog
              open={showConfirmation}
              onClose={handleCancelDeploy}
              onConfirm={(overrideValue) => {
                setAllowCrossVpcPingUI(overrideValue);     // <-- guarda el valor elegido (true, false o null)
                handleConfirmDeploy();                     // <-- lanza el deploy
              }}
              planName={planName}
              setPlanName={setPlanName}
              simulateOnly={simulateOnly}
              setSimulateOnly={setSimulateOnly}
              transformedData={transformedData}
              allowCrossVpcPingUI={allowCrossVpcPingUI}
              setAllowCrossVpcPingUI={setAllowCrossVpcPingUI}
            />

          </Card>
        </Grid>
        <RoutePreviewPanel
          open={showRoutePreview}
          onClose={() => setShowRoutePreview(false)}
          nodes={nodes}
          edges={edges}
        />

        <Modal
          open={modalIsOpen}
          onClose={closeModal}
          aria-labelledby="parent-modal-title"
          aria-describedby="parent-modal-description"
        >
          <Box sx={{ ...styleModal, width: selectedNode && selectedNode.type === TYPE_ROUTER_NODE ? 800 : 400 }}>

            {/* If selected node is restricted, show warning */}
            {selectedNode && restrictedNodes.includes(selectedNode.type) && (() => {
              // Subnet padre de la instancia seleccionada
              const parentSubnet = nodes.find(n => n.id === selectedNode.parentId);
              const parentSubnetCidr = parentSubnet?.data?.cidrBlock || "";

              // IPs ya usadas en la misma Subnet (excluye la instancia actual)
              const siblingIpsInSameSubnet = nodes
                .filter(n =>
                  restrictedNodes.includes(n.type) &&
                  n.parentId === parentSubnet?.id &&
                  n.id !== selectedNode.id
                )
                .map(n => n.data?.ipAddress)
                .filter(Boolean);

              return (
                <InstanceNodeForm
                  nodeData={selectedNode.data}
                  onSave={saveNodeData}
                  deleteNode={deleteNodeInstance}
                  parentSubnetCidr={parentSubnetCidr}                // <-- clave
                  siblingIpsInSameSubnet={siblingIpsInSameSubnet}    // <-- clave
                  amiList={amiList}
                />
              );
            })()}


            {/* If node type is Subnetwork, show SubNetworkNodeForm */}
            {selectedNode && selectedNode.type === TYPE_SUBNETWORK_NODE && (() => {
              //VPC-hija padre de la Subnet seleccionada
              const parentVpcNode = nodes.find(n => n.id === selectedNode.parentId);

              const parentVpcData = parentVpcNode?.data || {};
              const hasParentCidr =
                typeof parentVpcData.cidrBlock === 'string' &&
                String(parentVpcData.prefixLength || '') !== '' &&
                /^\d+$/.test(String(parentVpcData.prefixLength))

              const parentVpcCidr = hasParentCidr
                ? `${parentVpcData.cidrBlock}/${parentVpcData.prefixLength}`
                : ""; // sin padre válido, no mostramos "undefined/.."

              // CIDRs de subredes hermanas (misma VPC) excluyendo la actual
              const siblingSubnetCidrsInSameVpc = nodes
                .filter(n => n.type === TYPE_SUBNETWORK_NODE && n.parentId === parentVpcNode?.id && n.id !== selectedNode.id)
                .map(n => n.data?.cidrBlock)
                .filter(Boolean);

              return (
                <SubNetworkNodeForm
                  nodeData={selectedNode.data}
                  onSave={saveNodeData}
                  deleteNode={deleteNodeInstance}
                  parentVpcCidr={parentVpcCidr}                               // <-- clave
                  siblingSubnetCidrsInSameVpc={siblingSubnetCidrsInSameVpc}   // <-- clave
                />
              )
            })()}


            {/* If node type is Router, show RouterNodeForm */}
            {selectedNode && selectedNode.type === TYPE_ROUTER_NODE && (() => {
              const idToNode = new Map(nodes.map(n => [n.id, n]));
              const idToType = new Map(nodes.map(n => [n.id, n.type]));

              const connectedVpcsSet = new Set();
              edges.forEach(e => {
                const touchesRouter = e.source === selectedNode.id || e.target === selectedNode.id;
                if (!touchesRouter) return;
                const otherId = e.source === selectedNode.id ? e.target : e.source;
                const other = idToNode.get(otherId);
                if (other?.type === TYPE_VPC_NODE) {
                  const base = other.data?.cidrBlock;
                  const pref = other.data?.prefixLength;
                  const cidr = base && pref ? `${base}/${pref}` : null;
                  connectedVpcsSet.add(JSON.stringify({
                    id: other.id,
                    name: other.data?.vpcName || other.data?.title || other.id,
                    cidr
                  }));
                }
              });
              const connectedVpcs = Array.from(connectedVpcsSet).map(JSON.parse);

              const allVpcCidrs = nodes
                .filter(n => n.type === TYPE_VPC_NODE)
                .map(n => {
                  const base = n.data?.cidrBlock;
                  const pref = n.data?.prefixLength;
                  return {
                    id: n.id,
                    name: n.data?.vpcName || n.data?.title || n.id,
                    cidr: base && pref ? `${base}/${pref}` : null
                  };
                });

              const vlanRegion = "us-east-1";

              return (
                <RouterNodeForm
                  node={selectedNode}
                  nodeData={selectedNode.data}
                  onSave={saveNodeData}
                  deleteNode={deleteNodeInstance}
                  connectedVpcs={connectedVpcs}
                  allVpcCidrs={allVpcCidrs}
                  vlanRegion={vlanRegion}
                />);
            })()}


            {/* If node type is VPC, show VPCNodeForm */}
            {selectedNode && selectedNode.type === TYPE_VPC_NODE && (() => {
              const vlanCidr = (cidrBlockVPC && prefixLength)
                ? `${cidrBlockVPC}/${prefixLength}`
                : "";

              const siblingVpcCidrs = nodes
                .filter(n => n.type === TYPE_VPC_NODE && n.id !== selectedNode.id)
                .map(n => {
                  const base = n.data?.cidrBlock;
                  const pref = n.data?.prefixLength;
                  return base && pref ? `${base}/${pref}` : null;
                })
                .filter(Boolean);

              // 👇 NUEVO: nombres de subnets públicas dentro de esta VPC
              const publicSubnetNames = nodes
                .filter(n =>
                  n.type === TYPE_SUBNETWORK_NODE &&
                  n.parentId === selectedNode.id &&
                  String(n.data?.subnetType || "").toLowerCase() === "public"
                )
                .map(n => n.data?.subnetName)
                .filter(Boolean);

              return (
                <VPCNodeForm
                  nodeData={selectedNode.data}
                  onSave={saveNodeData}
                  deleteNode={deleteNodeInstance}
                  vlanCidr={vlanCidr}
                  siblingVpcCidrs={siblingVpcCidrs}
                  publicSubnetNames={publicSubnetNames}
                />
              );
            })()}


          </Box>
        </Modal>


        <Modal
          open={routesPreviewOpen}
          onClose={() => setRoutesPreviewOpen(false)}
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
              <Button variant="contained" onClick={() => setRoutesPreviewOpen(false)}>
                Cerrar
              </Button>
            </Stack>
          </Box>
        </Modal>



        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity="success"
            variant="filled"
            sx={{ width: '100%' }}
          >
            {successMessage}
          </Alert>
        </Snackbar>
        <Snackbar
          open={!!errorMessage}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity="error"
          >
            {errorMessage}
          </Alert>
        </Snackbar>

      </Grid>
    </NetworkProvider>




  )
}

export default MainFlow
