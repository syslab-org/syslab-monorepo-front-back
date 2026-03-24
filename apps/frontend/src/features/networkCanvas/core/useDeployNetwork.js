// apps/frontend/src/components/flow/flow-hooks/useDeployNetwork.js
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RouterPolicy } from "@/features/networkCanvas/utils/networking";
import { useAuth } from "@/app/providers/AuthContext";
import { LoadingFlowContext } from "@/app/providers/LoadingFlowContext";
import { api } from "@/infrastructure/http/api";
import { useProviderCapabilities } from "@/features/networkCanvas/core/useProviderCapabilities";
import { decideRouterMode } from "@/features/networkCanvas/domain/decideRouterMode";
import { useCanvasLabStore } from "../store/canvasLabStore";
import { buildRoutingPreview } from "../utils/buildRoutingPreview";
import {
  TYPE_ROUTER_NODE,
  TYPE_SERVER_NODE,
  TYPE_VPC_NODE,
} from "@/features/networkCanvas/utils/constants";
import {
  groupInstancesBySubnet,
  groupSubnetsByVpc,
  validateTopology,
} from "@/features/networkCanvas/utils/topologyValidation";

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

function pickTgwAttachmentSubnetNames(subnets, region) {
  const byAz = new Map();

  subnets.forEach((sn) => {
    const name = resolveSubnetName(sn);
    const az = normalizeAz(region, sn?.data?.availabilityZone);
    const subnetType = String(sn?.data?.subnetType || "").toLowerCase();
    const typePriority =
      subnetType === "public" ? 0 : subnetType === "private" ? 1 : 2;

    const current = byAz.get(az);
    if (
      !current ||
      typePriority < current.typePriority ||
      (typePriority === current.typePriority &&
        name.localeCompare(current.name) < 0)
    ) {
      byAz.set(az, { name, az, typePriority });
    }
  });

  return Array.from(byAz.values())
    .sort((a, b) => a.az.localeCompare(b.az) || a.name.localeCompare(b.name))
    .map((entry) => entry.name);
}

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
    const routeTable = Array.isArray(routerData.routeTable)
      ? routerData.routeTable
      : [];
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

      // Para cada VPC conectada generamos:
      // - tgw-attach
      vpcs.forEach((vpcId) => {
        const subnetsForVpc = groupSubnetsByVpc(nodes, vpcId);
        const vpcRegion = idToNode.get(vpcId)?.data?.region || "us-east-1";
        const subnetNames = pickTgwAttachmentSubnetNames(
          subnetsForVpc,
          vpcRegion,
        );

        const linkPayload = {
          type: "tgw-attach",
          router_id: router.id,
          vpc_id: vpcId,
          subnet_names: subnetNames,
        };

        // Build routes from router.routeTable filtered by sourceVpcId
        const manualRoutes = routeTable
          .filter((rt) => rt.sourceVpcId === vpcId && rt.destCidr)
          .map((rt) => ({
            dest_cidr: rt.destCidr,
            target: "tgw",
          }));

        if (manualRoutes.length) {
          linkPayload.routes = {
            to_router: manualRoutes,
          };
        }

        links.push(linkPayload);
      });

      continue; // saltamos el bloque de peering
    }

    // ===================
    //   MODO PEERING
    // ===================
    const resolveDestVpcId = (routeRow) => {
      if (routeRow?.destVpcId && vpcs.includes(routeRow.destVpcId)) {
        return routeRow.destVpcId;
      }
      const dest = String(routeRow?.destCidr || "").trim();
      if (!dest) return null;
      for (const [vpcId, cidr] of vpcCidrs.entries()) {
        if (dest === String(cidr || "").trim()) return vpcId;
      }
      return null;
    };

    for (let i = 0; i < vpcs.length; i++) {
      for (let j = i + 1; j < vpcs.length; j++) {
        const vpcA = vpcs[i];
        const vpcB = vpcs[j];

        const hasAToB = routeTable.some(
          (rt) => rt.sourceVpcId === vpcA && resolveDestVpcId(rt) === vpcB,
        );
        const hasBToA = routeTable.some(
          (rt) => rt.sourceVpcId === vpcB && resolveDestVpcId(rt) === vpcA,
        );

        if (!(hasAToB && hasBToA)) continue;

        links.push({
          type: "peering",
          via_router_id: router.id,
          vpc_a_id: vpcA,
          vpc_b_id: vpcB,
        });
      }
    }
  }

  return { links, routers };
}

function buildNeutralConnectivity(links, routers) {
  const hubs = (Array.isArray(routers) ? routers : [])
    .filter((router) => String(router?.type || "").toLowerCase() === "tgw")
    .map((router) => ({
      id: router.id,
      name: router.name || router.id,
      kind: "routing_hub",
      implementation: "tgw",
    }));

  const normalizedLinks = (Array.isArray(links) ? links : []).map((link) => {
    const type = String(link?.type || "").toLowerCase();
    if (type === "tgw-attach") {
      return {
        type: "hub_attachment",
        implementation: "tgw",
        hub_id: link.router_id || "",
        segment_id: link.vpc_id || "",
        attachment_zones: Array.isArray(link.subnet_names)
          ? link.subnet_names
          : [],
        routes: Array.isArray(link?.routes?.to_router)
          ? link.routes.to_router
          : [],
        provider_overrides: {
          aws: { ...link },
        },
      };
    }

    return {
      type: "direct_link",
      implementation: "peering",
      segment_a_id: link.vpc_a_id || "",
      segment_b_id: link.vpc_b_id || "",
      provider_overrides: {
        aws: { ...link },
      },
    };
  });

  return {
    mode: hubs.length > 0 ? "hub" : normalizedLinks.length > 0 ? "direct" : "isolated",
    hubs,
    links: normalizedLinks,
  };
}

function buildNeutralTopology({
  planName,
  canvasId,
  region,
  masterCidr,
  segments,
  connectivity,
}) {
  return {
    network: {
      id: canvasId || "",
      name: planName,
      region,
      cidr: masterCidr,
    },
    segments,
    connectivity,
  };
}

const useDeployNetwork = ({
  nodes,
  edges,
  allowCrossVpcPingUI = null,
  labId,
  canvasId,
}) => {
  const resolvedCanvasId = canvasId || labId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transformedData, setTransformedData] = useState(null);
  const [planName, setPlanName] = useState("");
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [canvasLabName, setCanvasLabName] = useState("");
  const { setLoadingFlow } = useContext(LoadingFlowContext);
  const [simulateOnly, setSimulateOnly] = useState(true);
  // Máquina de estados explícita del plan
  const PLAN_STATES = {
    IDLE: "IDLE",
    SYNCING: "SYNCING",
    PLANNING: "PLANNING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
  };

  const [validationState, setValidationState] = useState(PLAN_STATES.IDLE);
  const [validationError, setValidationError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  // Ahora representa hash de infraestructura real (payload Terraform), no del canvas visual
  const [validatedCanvasHash, setValidatedCanvasHash] = useState(null);

  // =========================
  // Stable plan name (inmutable once first resolved)
  // =========================
  const planNameRef = useRef("");

  // Si el usuario escribe un nombre manual, lo fijamos una sola vez.
  useEffect(() => {
    if (!planNameRef.current && planName) {
      planNameRef.current = planName;
    }
  }, [planName]);

  const loadCanvasLabName = useCallback(async () => {
    if (!resolvedCanvasId) return "";
    try {
      const lab = await api.getLab(resolvedCanvasId);
      const name = String(lab?.name || "").trim();
      if (name) setCanvasLabName(name);
      return name;
    } catch (e) {
      console.warn("No se pudo cargar nombre del canvas:", e);
      return "";
    }
  }, [resolvedCanvasId]);

  // Hidrata nombre del plan desde el nombre real del laboratorio en backend.
  useEffect(() => {
    let cancelled = false;
    const loadCanvasName = async () => {
      const canvasName = await loadCanvasLabName();
      if (cancelled || !canvasName) return;
      planNameRef.current = canvasName;
      if (planName !== canvasName) setPlanName(canvasName);
    };
    loadCanvasName();
    return () => {
      cancelled = true;
    };
  }, [loadCanvasLabName, planName]);

  const ensurePlanName = () => {
    if (!planNameRef.current) {
      const fallback = transformedData?.name || `plan-${Date.now()}`;
      planNameRef.current = canvasLabName || planName || fallback;
      // Si aún no hay planName visible en UI, lo seteamos una sola vez.
      if (!planName) setPlanName(planNameRef.current);
    }
    return planNameRef.current;
  };

  const { vlanName, vlanRegion, cidrBlockVPC, prefixLength, targetProvider } =
    useCanvasLabStore((s) => [
      s.labName || s.vlanName,
      s.labRegion || s.vlanRegion,
      s.masterCidrBlock || s.cidrBlockVPC,
      s.prefixLength,
      s.targetProvider || "aws",
    ]);
  const { getCapability } = useProviderCapabilities();
  const providerCapability = getCapability(targetProvider);

  // persist plan metadata in the lab record
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
      const existing = await api.getLab(canvasId);
      const metadata = {
        ...(existing?.metadata || {}),
        planId,
        planName: name || "",
        planCreatedFromCanvas: !!created,
        planValidationOk:
          typeof validationOk === "boolean" ? validationOk : null,
        planUpdatedAt: new Date().toISOString(),
      };
      const payload = {
        metadata,
      };

      // Solo persistimos hash cuando viene explícitamente definido
      if (typeof canvasHash === "string") {
        payload.plan_canvas_hash = canvasHash;
      }

      await api.updateLab(canvasId, payload);
    } catch (e) {
      console.warn("No se pudo persistir planId en backend:", e);
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

    const latestCanvasName = await loadCanvasLabName();
    const canvasNameForPlan = latestCanvasName || canvasLabName;

    const vlanNameFinal =
      canvasNameForPlan || vlanName || vpcsPayload[0]?.name || `VLAN-${Date.now()}`;
    const vlanRegionFinal = vlanRegion || vpcsPayload[0]?.region || "us-east-1";

    // Use existing planName (laboratory name) if present.
    // Do NOT derive from first VPC anymore.
    const planDefaultName =
      canvasNameForPlan || planName || vlanNameFinal || `plan-${Date.now()}`;

    planNameRef.current = planDefaultName;

    if (planName !== planDefaultName) {
      setPlanName(planDefaultName);
    }

    const segments = vpcsPayload.map((vpc) => {
      const zones = (vpc.subnets || []).map((subnet) => {
        const workloads = (subnet.instances || []).map((instance) => ({
          id: instance.id,
          name: instance.name,
          kind: "workload",
          image: instance.ami || "",
          size: instance.instance_type || "t2.micro",
          private_ip: instance.ip_address || "",
          zone_id: subnet.name,
          access: {
            ssh_key: instance.ssh_access || "",
            public_ip: !!instance.associate_public_ip,
          },
          provider_overrides: {
            aws: { ...instance },
          },
        }));

        return {
          id: subnet.name,
          name: subnet.name,
          cidr: subnet.cidr_block,
          kind: subnet.subnet_type || (subnet.map_public_ip_on_launch ? "public" : "private"),
          availability_zone: subnet.availability_zone,
          map_public_ip_on_launch: !!subnet.map_public_ip_on_launch,
          route_table: subnet.route_table || "",
          workloads,
          provider_overrides: {
            aws: {
              subnet_type: subnet.subnet_type || "",
              route_table: subnet.route_table || "",
            },
          },
        };
      });

      const workloads = zones.flatMap((zone) => zone.workloads || []);
      const hasPublic = zones.some((zone) => zone.kind === "public");
      const hasPrivate = zones.some((zone) => zone.kind === "private");
      const exposure = hasPublic && hasPrivate ? "mixed" : hasPublic ? "public" : hasPrivate ? "private" : "internal";
      const internetAccess = vpc.internet_gateway ? "direct" : vpc.nat_gateway?.enabled ? "egress_only" : "isolated";

      return {
        id: vpc.id,
        name: vpc.name,
        region: vpc.region,
        cidr: vpc.cidr_block,
        exposure,
        internet_access: internetAccess,
        ingress: {
          ssh_cidr: vpc.allowed_ssh_cidr || "",
        },
        zones,
        workloads,
        provider_overrides: {
          aws: {
            resource_kind: "vpc",
            internet_gateway: !!vpc.internet_gateway,
            nat_gateway: { ...(vpc.nat_gateway || { enabled: false, public_subnet: "", elastic_ip: "" }) },
            route_tables: Array.isArray(vpc.route_tables) ? vpc.route_tables : [],
          },
        },
      };
    });

    const connectivity = buildNeutralConnectivity(links, routers);

    // Construimos el payload neutral que el backend traduce al provider.
    const built = {
      name: planDefaultName,
      target_provider: targetProvider || "aws",
      canvas_id: resolvedCanvasId || null,
      metadata: {
        name: planDefaultName,
        canvas_id: resolvedCanvasId || null,
        source_format: "neutral_topology",
        schema_version: "2026-03-neutral-v1",
        provider_status: providerCapability?.status || "unknown",
      },
      topology: buildNeutralTopology({
        planName: vlanNameFinal,
        canvasId: resolvedCanvasId || null,
        region: vlanRegionFinal,
        masterCidr,
        segments,
        connectivity,
      }),
    };

    setTransformedData(built);
    console.log("processJsonToCloud - transformedData:", {
      ...built,
    });

    // Abrimos el modal inmediatamente (UX reactiva)
    setShowConfirmation(true);

    // No sincronizamos ni creamos plan aquí.
    // El plan se crea / sincroniza únicamente cuando el usuario presiona "Validar".
    setValidationState(PLAN_STATES.IDLE);
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
        setValidationState(PLAN_STATES.ERROR);
        setValidationError("No hay datos transformados para validar.");
        setErrorMessage("No hay datos transformados para validar.");
        return;
      }

      if (providerCapability?.status !== "ready") {
        const providerLabel = String(targetProvider || "aws").toUpperCase();
        const message = `El provider ${providerLabel} todavía está en estado planned. La validación y el deploy siguen habilitados solo para providers ready.`;
        setLoadingFlow(false);
        setValidationState(PLAN_STATES.ERROR);
        setValidationError(message);
        setErrorMessage(message);
        return;
      }

      setValidationState(PLAN_STATES.SYNCING);
      const latestCanvasName = await loadCanvasLabName();
      if (latestCanvasName) {
        planNameRef.current = latestCanvasName;
        if (planName !== latestCanvasName) setPlanName(latestCanvasName);
      }
      const stableName = latestCanvasName || ensurePlanName();

      // sync_from_canvas SOLO crea/actualiza el Plan (no ejecuta Terraform)
      const syncRes = await api.syncPlanFromCanvas({
        ...transformedData,
        name: stableName,
      });

      const planId = syncRes?.plan_id;

      if (!planId) throw new Error("sync-from-canvas no devolvió plan_id");
      await persistPlanIdToCanvas({
        canvasId: resolvedCanvasId,
        planId,
        name: stableName,
        created: !!syncRes?.created,
        validationOk: null, // aún no sabemos
      });

      setValidationResult({ plan_id: planId, created: !!syncRes?.created });
      setValidationState(PLAN_STATES.PLANNING);

      await api.deployPlan(planId, { simulateOnly: true });

      const finalPlan = await pollPlanUntilDone(planId);
      const finalStatus = String(finalPlan?.status || "");

      if (finalStatus === "SUCCESS") {
        setValidationState(PLAN_STATES.SUCCESS);
        setSuccessMessage("Validación OK (Terraform plan)");
        await persistPlanIdToCanvas({
          canvasId: resolvedCanvasId,
          planId,
          name: stableName,
          created: !!syncRes?.created,
          validationOk: true,
        });
      } else {
        const msg = finalPlan?.error || "Validación fallida";
        setValidationState(PLAN_STATES.ERROR);
        setValidationError(msg);
        setErrorMessage(msg);
        await persistPlanIdToCanvas({
          canvasId: resolvedCanvasId,
          planId,
          name: stableName,
          created: !!syncRes?.created,
          validationOk: false,
        });
      }

      setLoadingFlow(false);
    } catch (error) {
      const code = error?.data?.code;
      const msg =
        code === "PLAN_ALREADY_APPLIED"
          ? "El plan ya está aplicado y no aceptó redeploy. Revisa el estado del plan."
          : error?.message || "Error desconocido";
      setLoadingFlow(false);
      setValidationState(PLAN_STATES.ERROR);
      setValidationError(msg);
      setErrorMessage(msg);
    }
  };

  const handleOpenPlanDetails = (planIdOverride) => {
    const planId = planIdOverride || validationResult?.plan_id;
    if (planId) navigate(`/admin/plans/${planId}`);
  };

  const handleApplyReal = async () => {
    if (validationState !== PLAN_STATES.SUCCESS) {
      setErrorMessage(
        "Primero valida la topologia en modo simulacion antes de desplegar en AWS.",
      );
      return;
    }

    const recheck = validateTopology(nodes, edges);
    if (recheck.errors.length > 0) {
      setErrorMessage(
        "El canvas tiene errores de topologia. Corrigelos y vuelve a validar antes del deploy real.",
      );
      return;
    }

    const planId = validationResult?.plan_id;
    if (!planId) {
      setErrorMessage("Primero valida el plan.");
      return;
    }

    if (!transformedData) {
      setErrorMessage("No hay datos transformados para aplicar.");
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
      const latestCanvasName = await loadCanvasLabName();
      if (latestCanvasName) {
        planNameRef.current = latestCanvasName;
        if (planName !== latestCanvasName) setPlanName(latestCanvasName);
      }
      const stableName = latestCanvasName || ensurePlanName();

      // 1) Re-sync antes de aplicar para garantizar que el backend tiene el payload más reciente.
      await api.syncPlanFromCanvas({
        ...transformedData,
        name: stableName,
      });

      // 2) Apply real (Terraform apply)
      await api.deployPlan(planId, { simulateOnly: false, applyMode: true });

      setLoadingFlow(false);
      navigate(`/admin/plans/${planId}`);
    } catch (error) {
      setLoadingFlow(false);
      const code = error?.data?.code;
      if (code === "PLAN_ALREADY_APPLIED") {
        setErrorMessage(
          "El backend rechazó el redeploy de este plan. Revisa el estado y vuelve a intentar.",
        );
        return;
      }
      setErrorMessage(error?.message || "Error desconocido");
    }
  };

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
    PLAN_STATES,
  };
};

export default useDeployNetwork;
