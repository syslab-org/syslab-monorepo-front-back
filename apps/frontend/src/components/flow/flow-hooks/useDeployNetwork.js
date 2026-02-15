// apps/frontend/src/components/flow/flow-hooks/useDeployNetwork.js
import { useContext, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { DB_FIRESTORE_VPCS } from "../../../constants";
import { useNavigate } from "react-router-dom";
import { RouterPolicy } from "../../../config/networking";
import { useAuth } from "../../../contexts/AuthContext";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import { api } from "../../../lib/api";
import { decideRouterMode } from "../../../utils/decideRouterMode";
import useCidrBlockVPCStore from "../store/cidrBlocksIp";
import { buildRoutingPreview } from "../utils/buildRoutingPreview";
import { TYPE_ROUTER_NODE, TYPE_VPC_NODE } from "../utils/constants";
import {
  groupInstancesBySubnet,
  groupSubnetsByVpc,
  validateTopology,
} from "../utils/topologyValidation";

function s(v) {
  if (v === null || v === undefined) return "";
  const t = typeof v;
  if (t === "string") return v;
  if (t === "number" || t === "boolean") return String(v);
  return "";
}

function normalizeAz(region, az) {
  const OK =
    /^(af|ap|ca|eu|il|me|sa|us)-(central|north|south|southeast|east|west|northeast|south-2|east-2|west-2|gov-[a-z]+|\w+)-\d+[a-f]$/i;
  if (OK.test(az || "")) return az;

  let r = (region || "us-east-1").toLowerCase();
  r = r.replace(/([a-f])$/i, "");

  let out = (az || "").toLowerCase();
  out = out
    .replace("us-eas-", "us-east-")
    .replace(/-a1\b/, "-1a")
    .replace(/-b1\b/, "-1b")
    .replace(/-c1\b/, "-1c")
    .replace(/-d1\b/, "-1d")
    .replace(/-e1\b/, "-1e");

  if (OK.test(out)) return out;
  return `${r}a`;
}

const resolveSubnetName = (sn) => sn?.data?.subnetName || `subnet-${sn.id}`;

function buildLinksFromEdges(nodes, edges) {
  const idToType = new Map(nodes.map((n) => [n.id, n.type]));
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const routerToVpcs = new Map();

  // 1) Construimos el mapa router -> VPCs conectadas según edges del canvas
  edges.forEach((e) => {
    const sType = idToType.get(e.source);
    const tType = idToType.get(e.target);
    const isVpcRouter =
      (sType === TYPE_VPC_NODE && tType === TYPE_ROUTER_NODE) ||
      (sType === TYPE_ROUTER_NODE && tType === TYPE_VPC_NODE);
    if (!isVpcRouter) return;

    const routerId = sType === TYPE_ROUTER_NODE ? e.source : e.target;
    const vpcId = sType === TYPE_VPC_NODE ? e.source : e.target;
    if (!routerToVpcs.has(routerId)) routerToVpcs.set(routerId, new Set());
    routerToVpcs.get(routerId).add(vpcId);
  });

  const links = [];
  const routers = [];

  // 2) Por cada router, decidimos si va en modo peering o TGW
  for (const [routerId, vpcSet] of routerToVpcs.entries()) {
    const vpcs = Array.from(vpcSet);
    if (vpcs.length < 2) continue; // router que solo conecta 1 VPC no sirve

    const routerNode = idToNode.get(routerId);
    const routerData = routerNode?.data || {};
    const router = {
      id: routerId,
      name: routerData.name || routerNode.id,
      connectedVpcIds: vpcs,
      mode: routerData.mode || RouterPolicy.defaultMode,
      allowCrossVpcPing: !!routerData.allowCrossVpcPing,
    };

    const mode = decideRouterMode(router);

    // =======================
    //   MODO TGW (Transit GW)
    // =======================
    if (mode === "tgw") {
      // Registramos el router como TGW
      routers.push({ id: router.id, name: router.name, type: "tgw" });

      // Mapa VPC -> CIDR principal (10.10.0.0/16, etc.)
      const vpcCidrs = new Map(
        vpcs.map((vpcId) => {
          const vpcNode = idToNode.get(vpcId);
          const vpcData = vpcNode?.data || {};
          const block = vpcData.cidrBlock;
          const prefix = vpcData.prefixLength;
          const cidr = block && prefix ? `${block}/${prefix}` : block || "";
          return [vpcId, cidr];
        }),
      );

      // Para cada VPC conectada generamos:
      // - tgw-attach
      // - rutas automáticas hacia las otras VPC del mismo router
      vpcs.forEach((vpcId) => {
        const subnetsForVpc = groupSubnetsByVpc(nodes, vpcId);
        const subnetNames = subnetsForVpc.map(resolveSubnetName);

        // Rutas de salida de ESTA VPC hacia las demás VPC conectadas al mismo TGW
        const toRouterRoutes = vpcs
          .filter((otherId) => otherId !== vpcId)
          .map((otherId) => {
            const destCidr = vpcCidrs.get(otherId);
            if (!destCidr) return null;
            return {
              dest_cidr: destCidr,
              target: "tgw",
            };
          })
          .filter(Boolean);

        const linkPayload = {
          type: "tgw-attach",
          router_id: router.id,
          vpc_id: vpcId,
          subnet_names: subnetNames,
        };

        // Solo agregamos routes si hay algo que enrutar
        if (toRouterRoutes.length) {
          linkPayload.routes = {
            to_router: toRouterRoutes,
          };
        }

        links.push(linkPayload);
      });

      continue; // saltamos el bloque de peering
    }

    // ===================
    //   MODO PEERING
    // ===================
    for (let i = 0; i < vpcs.length; i++) {
      for (let j = i + 1; j < vpcs.length; j++) {
        links.push({
          type: "peering",
          via_router_id: router.id,
          vpc_a_id: vpcs[i],
          vpc_b_id: vpcs[j],
        });
      }
    }
  }

  return { links, routers };
}

const useDeployNetwork = ({
  nodes,
  edges,
  allowCrossVpcPingUI = null,
  firestoreVpcId,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transformedData, setTransformedData] = useState(null);
  const [planName, setPlanName] = useState("");
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const { setLoadingFlow } = useContext(LoadingFlowContext);
  const [simulateOnly, setSimulateOnly] = useState(true);
  const [validationState, setValidationState] = useState("idle");
  const [validationError, setValidationError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  // Ahora representa hash de infraestructura real (payload Terraform), no del canvas visual
  const [validatedCanvasHash, setValidatedCanvasHash] = useState(null);

  const { vlanName, vlanRegion, cidrBlockVPC, prefixLength } =
    useCidrBlockVPCStore((s) => [
      s.vlanName,
      s.vlanRegion,
      s.cidrBlockVPC,
      s.prefixLength,
    ]);

  // persist planId in the canvas Firestore doc
  const persistPlanIdToCanvas = async ({
    canvasId,
    planId,
    name,
    created,
    validationOk,
    canvasHash,
  }) => {
    if (!canvasId || !planId) return;
    try {
      const docRef = doc(db, DB_FIRESTORE_VPCS, canvasId);
      await setDoc(
        docRef,
        {
          planId,
          planName: name || "",
          planCreatedFromCanvas: !!created,
          planValidationOk:
            typeof validationOk === "boolean" ? validationOk : null,
          planUpdatedAt: new Date(),
          planCanvasHash: typeof canvasHash === "string" ? canvasHash : null,
        },
        { merge: true },
      );
    } catch (e) {
      console.warn("No se pudo persistir planId en Firestore:", e);
    }
  };

  const processJsonToCloud = async () => {
    const { errors, warnings } = validateTopology(nodes, edges);
    if (errors.length > 0) {
      setErrorMessage(
        "No se puede desplegar. Corrige estos errores:\n" +
          errors.map((e) => `• ${e}`).join("\n"),
      );
      return;
    }
    if (warnings.length) console.warn(warnings.join("\n"));

    const preview = buildRoutingPreview(nodes, edges);

    const vpcNodes = nodes.filter((n) => n.type === TYPE_VPC_NODE);
    if (!vpcNodes.length) {
      setErrorMessage("No hay VPC en el canvas.");
      return;
    }

    const vpcsPayload = vpcNodes.map((vpcNode) => {
      const name = vpcNode.data?.vpcName || vpcNode.data?.title || vpcNode.id;
      const region = vpcNode.data?.region || "us-east-1";
      const cidr =
        vpcNode.data?.cidrBlock && vpcNode.data?.prefixLength
          ? `${vpcNode.data.cidrBlock}/${vpcNode.data.prefixLength}`
          : null;

      const subnetsRaw = groupSubnetsByVpc(nodes, vpcNode.id).map((sn) => {
        const az = normalizeAz(region, sn.data?.availabilityZone);
        const isPublic = (sn.data?.subnetType || "").toLowerCase() === "public";

        const instances = groupInstancesBySubnet(nodes, sn.id).map((inst) => {
          const name = inst.data?.name || `vm-${sn.id}`;
          const instanceType = inst.data?.instanceType || "t2.micro";
          const keypair = s(inst.data?.sshAccess);
          const ami = s(inst.data?.ami);
          const ip = s(inst.data?.ipAddress);
          const associatePublic =
            typeof inst.data?.associate_public_ip === "boolean"
              ? inst.data.associate_public_ip
              : isPublic;

          return {
            id: inst.id,
            name,
            ami,
            instance_type: instanceType,
            ip_address: ip,
            ssh_access: keypair,
            associate_public_ip: !!associatePublic,
          };
        });

        const routeTableName = isPublic ? "public" : "private";

        return {
          name: resolveSubnetName(sn),
          cidr_block: sn.data?.cidrBlock,
          availability_zone: az,
          map_public_ip_on_launch: !!isPublic,
          subnet_type: sn.data?.subnetType,
          route_table: routeTableName,
          instances,
        };
      });

      const hasPublic = subnetsRaw.some(
        (s) => (s.subnet_type || "").toLowerCase() === "public",
      );
      const hasPrivate = subnetsRaw.some(
        (s) => (s.subnet_type || "").toLowerCase() === "private",
      );

      const pv = preview.vpcs.find((p) => p.id === vpcNode.id);
      const previewRoutes = (pv?.main_route_table || []).map((r) => {
        const t = String(r.target || "").toLowerCase();
        const isNat = t === "nat" || t === "nat-gw" || t === "natgateway";
        const isIgw = t === "igw" || t === "internet-gateway";
        return {
          dest_cidr: isNat ? "0.0.0.0/0" : r.dest_cidr,
          target: isNat ? "nat" : isIgw ? "igw" : r.target,
          via_router_id: r.via_router_id || null,
        };
      });

      const publicRoutes = [];
      const hasIgwInPreview = previewRoutes.some(
        (r) => String(r.target).toLowerCase() === "igw",
      );
      if (hasPublic || hasIgwInPreview) {
        publicRoutes.push({
          name: "igw-default",
          dest_cidr: "0.0.0.0/0",
          target: "igw",
        });
      }

      const privateRoutes = [];

      const routeTables = [];
      if (hasPublic || publicRoutes.length) {
        routeTables.push({ name: "public", routes: publicRoutes });
      }
      if (hasPrivate) {
        routeTables.push({ name: "private", routes: privateRoutes });
      }
      if (!routeTables.length) {
        routeTables.push({ name: "main", routes: [] });
        subnetsRaw.forEach((snb) => (snb.route_table = "main"));
      }

      const natEnabled = !!vpcNode.data?.enableNatGateway;

      return {
        id: vpcNode.id,
        name,
        region,
        cidr_block: cidr,
        internet_gateway: !!vpcNode.data?.internetGateway,
        nat_gateway: {
          enabled: natEnabled,
          public_subnet: natEnabled
            ? s(vpcNode.data?.natGatewayPublicSubnet)
            : "",
          elastic_ip: natEnabled ? s(vpcNode.data?.natGatewayElasticIp) : "",
        },
        route_tables: routeTables,
        subnets: subnetsRaw,
        allowed_ssh_cidr: s(vpcNode.data?.allowedSshCidr),
      };
    });

    const { links, routers } = buildLinksFromEdges(nodes, edges);

    const firstVpcCidr = vpcsPayload[0]?.cidr_block || "";
    const masterCidr =
      cidrBlockVPC && prefixLength
        ? `${cidrBlockVPC}/${prefixLength}`
        : firstVpcCidr;

    const vlanNameFinal =
      vlanName || vpcsPayload[0]?.name || `VLAN-${Date.now()}`;
    const vlanRegionFinal = vlanRegion || vpcsPayload[0]?.region || "us-east-1";

    const planDefaultName = vpcsPayload[0]?.name || `plan-${Date.now()}`;

    // Solo sugerimos nombre si aún no hay uno definido.
    // No volvemos a sincronizarlo con la VPC.
    if (!planName) {
      setPlanName(planDefaultName);
    }

    const anyLinks = links.length > 0;
    const someRouterForcesPing = nodes
      .filter((n) => n.type === TYPE_ROUTER_NODE)
      .some((n) => n.data?.allowCrossVpcPing === true);

    const autoAllowCrossVpcPing = someRouterForcesPing || anyLinks;
    const allowCrossVpcPing =
      allowCrossVpcPingUI !== null
        ? allowCrossVpcPingUI
        : autoAllowCrossVpcPing;

    const built = {
      name: planDefaultName,
      cloud: "aws",
      firestore_vpc_id: firestoreVpcId || null, // ✅ top-level (el backend lo lee directo)
      vpcId: firestoreVpcId || null, // ✅ alias opcional (por si algún lado lo usa)
      vlan: {
        id: firestoreVpcId || null, // ✅ para compatibilidad con payload antiguo
        name: vlanNameFinal,
        region: vlanRegionFinal,
        master_cidr: masterCidr,
      },
      vpcs: vpcsPayload,
      links,
      routers,
      allow_cross_vpc_ping: !!allowCrossVpcPing,
    };

    setTransformedData(built);
    console.log("processJsonToCloud - transformedData:", {
      cloud: "aws",
      ...built,
    });

    // Abrimos el modal inmediatamente (UX reactiva)
    setShowConfirmation(true);
    setValidationState("syncing");

    // 🔎 Intentar sincronizar con backend en segundo plano
    try {
      if (firestoreVpcId) {
        const syncRes = await api.syncPlanFromCanvas({
          name: built.name || "plan-" + Date.now(),
          ...built,
          simulate_only: true,
        });

        const planId = syncRes?.plan_id;

        if (planId) {
          await persistPlanIdToCanvas({
            canvasId: firestoreVpcId,
            planId,
            name: built.name,
            created: !!syncRes?.created,
            validationOk: null,
          });

          setValidationResult({
            plan_id: planId,
            created: !!syncRes?.created,
          });

          setValidationState("idle");
        }
      }
    } catch (e) {
      console.warn("No se pudo detectar plan existente antes de validar:", e);
      setValidationState("idle");
    }
  };

  const pollPlanUntilDone = async (
    planId,
    { intervalMs = 1200, timeoutMs = 60000 } = {},
  ) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const plan = await api.getPlan(planId);
      const st = String(plan?.status || "");
      if (st && st !== "RUNNING" && st !== "PENDING") return plan;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error("Timeout esperando resultado del plan");
  };

  const handleValidatePlan = async () => {
    setLoadingFlow(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setValidationError(null);

    try {
      if (!transformedData) {
        setLoadingFlow(false);
        setValidationState("error");
        setValidationError("No hay datos transformados para validar.");
        setErrorMessage("No hay datos transformados para validar.");
        return;
      }

      setValidationState("syncing");

      const syncRes = await api.syncPlanFromCanvas({
        name: planName || "plan-" + Date.now(),
        ...transformedData,
        simulate_only: true,
      });

      const planId = syncRes?.plan_id;
      if (!planId) throw new Error("sync-from-canvas no devolvió plan_id");
      await persistPlanIdToCanvas({
        canvasId: firestoreVpcId,
        planId,
        name: planName || "plan-" + Date.now(),
        created: !!syncRes?.created,
        validationOk: null, // aún no sabemos
      });

      setValidationResult({ plan_id: planId, created: !!syncRes?.created });
      setValidationState("planning");

      await api.deployPlan(planId, { simulateOnly: true });

      const finalPlan = await pollPlanUntilDone(planId);
      const finalStatus = String(finalPlan?.status || "");

      if (finalStatus === "SUCCESS") {
        setValidationState("success");
        setSuccessMessage("Validación OK (Terraform plan)");
        await persistPlanIdToCanvas({
          canvasId: firestoreVpcId,
          planId,
          name: planName || "plan-" + Date.now(),
          created: !!syncRes?.created,
          validationOk: true,
          canvasHash: null,
        });
      } else {
        const msg = finalPlan?.error || "Validación fallida";
        setValidationState("error");
        setValidationError(msg);
        setErrorMessage(msg);
        await persistPlanIdToCanvas({
          canvasId: firestoreVpcId,
          planId,
          name: planName || "plan-" + Date.now(),
          created: !!syncRes?.created,
          validationOk: false,
          canvasHash: null,
        });
      }

      setLoadingFlow(false);
    } catch (error) {
      const msg = error?.message || "Error desconocido";
      setLoadingFlow(false);
      setValidationState("error");
      setValidationError(msg);
      setErrorMessage(msg);
    }
  };

  const handleOpenPlanDetails = (planIdOverride) => {
    const planId = planIdOverride || validationResult?.plan_id;
    if (planId) navigate(`/admin/plans/${planId}`);
  };

  const handleApplyReal = async () => {
    const planId = validationResult?.plan_id;
    if (!planId) {
      setErrorMessage("Primero valida el plan.");
      return;
    }

    const txt = window.prompt("Para confirmar escribe: DEPLOY");
    if (txt !== "DEPLOY") {
      setErrorMessage("Deploy cancelado por el usuario.");
      return;
    }

    setLoadingFlow(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.deployPlan(planId, { simulateOnly: false, applyMode: true });
      setLoadingFlow(false);
      navigate(`/admin/plans/${planId}`);
    } catch (error) {
      setLoadingFlow(false);
      setErrorMessage(error?.message || "Error desconocido");
    }
  };

  // const handleConfirmDeploy = async () => {
  //   setShowConfirmation(false);
  //   setLoadingFlow(true);
  //   setSuccessMessage(null);
  //   setErrorMessage(null);

  //   try {
  //     if (!simulateOnly) {
  //       const txt = window.prompt("Para confirmar escribe: DEPLOY");
  //       if (txt !== "DEPLOY") {
  //         setLoadingFlow(false);
  //         setErrorMessage("Deploy cancelado por el usuario.");
  //         return;
  //       }
  //     }
  //     console.log("firestoreVpcId", firestoreVpcId);
  //     const res = await api.syncPlanFromCanvas({
  //       name: planName || "plan-" + Date.now(),
  //       ...transformedData,
  //       simulate_only: simulateOnly,
  //     });

  //     setLoadingFlow(false);
  //     setSuccessMessage(
  //       `${res.message || "Plan sincronizado."} plan_id=${res.plan_id || "?"}`,
  //     );
  //     navigate(`/admin/plans/${res.plan_id || "?"}`);
  //   } catch (error) {
  //     setLoadingFlow(false);
  //     setErrorMessage(
  //       `Fallo al crear el Plan: ${error?.message || "Error desconocido"}`,
  //     );
  //   }
  // };
  const handleConfirmDeploy = async () => {
    await handleValidatePlan();
  };

  const handleCancelDeploy = () => {
    setShowConfirmation(false);
    setTransformedData(null);
    // Nota: NO reseteamos validationState/validationResult aquí.
    // Eso permite reabrir el modal y seguir teniendo disponible el plan_id.
  };

  const handleCloseSnackbar = (_e, reason) => {
    if (reason === "clickaway") return;
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return {
    showConfirmation,
    transformedData,
    planName,
    setPlanName,
    simulateOnly,
    setSimulateOnly,
    successMessage,
    errorMessage,
    processJsonToCloud,
    handleCancelDeploy,
    handleConfirmDeploy,
    handleCloseSnackbar,
    validationState,
    validationError,
    validationResult,
    handleValidatePlan,
    handleApplyReal,
    handleOpenPlanDetails,
  };
};

export default useDeployNetwork;
