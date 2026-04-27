import { useCallback, useContext } from "react";
import { useParams } from "react-router-dom";

import { LoadingFlowContext } from "@/app/providers/LoadingFlowContext";
import { api } from "@/infrastructure/http/api";
import {
  FLOW_EXPIRED,
  LOADING_ERROR,
  SAVING_ERROR,
  UNKNOWN_EXPIRATION_FORMAT,
} from "@/shared/constants";
import { useCanvasLabStore } from "../store/canvasLabStore";

const saveFlowToLocalStorage = (key, flow) => {
  try {
    localStorage.setItem(key, JSON.stringify(flow));
  } catch (error) {
    console.error(SAVING_ERROR, error);
  }
};

const loadFlowFromLocalStorage = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (error) {
    console.error(LOADING_ERROR, error);
    return null;
  }
};

const convertToDate = (expiration) => {
  if (!expiration) return null;
  if (expiration.seconds) return new Date(expiration.seconds * 1000);
  if (typeof expiration === "string" || typeof expiration === "number") return new Date(expiration);
  console.error(UNKNOWN_EXPIRATION_FORMAT, expiration);
  return null;
};

const normalizeFetchedLab = (labData) => {
  if (!labData) return null;
  return {
    flow: labData.flow || null,
    cidrBlock: labData.cidr_block || labData.metadata?.cidrBlock || null,
    prefixLength: labData.prefix_length ?? labData.metadata?.prefixLength ?? null,
    planId: labData.metadata?.planId || null,
    labName: labData.name || null,
    labRegion: labData.region || null,
    targetProvider: labData.target_provider || 'aws',
    resolvedExecutionTarget: labData.resolved_execution_target || null,
    planCanvasHash: labData.plan_canvas_hash || null,
  };
};

const useRestoreFlow = ({
  setNodes,
  setEdges,
  setViewport,
  flowKey,
  getId,
  setCanvasPlanId,
  labId,
}) => {
  const { vpcid } = useParams();
  const resolvedLabId = labId || vpcid;
  const {
    setMasterCidrBlock,
    setPrefixLength,
    setLabName,
    setLabRegion,
    setTargetProvider,
    setResolvedExecutionTarget,
  } = useCanvasLabStore();
  const { setLoadingFlow } = useContext(LoadingFlowContext);

  const restoreFlow = useCallback(async () => {
    setLoadingFlow(true);

    try {
      let flow = null;
      const fetchedLab = await api.getLab(resolvedLabId);
      const normalized = normalizeFetchedLab(fetchedLab);

      if (!normalized) {
        setLoadingFlow(false);
        return;
      }

      const { flow: fetchedFlow, cidrBlock, prefixLength, planId, labName, labRegion, targetProvider, resolvedExecutionTarget } = normalized;
      if (cidrBlock) setMasterCidrBlock(cidrBlock);
      if (prefixLength !== undefined && prefixLength !== null) setPrefixLength(prefixLength || "");
      if (labName) setLabName(labName);
      if (labRegion) setLabRegion(labRegion);
      if (targetProvider) setTargetProvider(targetProvider);
      setResolvedExecutionTarget(resolvedExecutionTarget || null);
      if (typeof setCanvasPlanId === "function") setCanvasPlanId(planId || null);

      flow = fetchedFlow || loadFlowFromLocalStorage(flowKey);
      if (!flow) {
        setLoadingFlow(false);
        return;
      }

      saveFlowToLocalStorage(flowKey, {
        ...flow,
        id: resolvedLabId,
        cidrBlock,
        prefixLength: prefixLength || "",
        planId: planId || null,
      });

      const { expiration, nodes = [], edges = [], viewport = {} } = flow;
      const expirationDate = expiration ? convertToDate(expiration) : null;
      const currentDate = new Date();
      const isExpired = expirationDate ? !(expirationDate > currentDate) : false;
      if (isExpired) {
        console.info(FLOW_EXPIRED);
        localStorage.removeItem(flowKey);
      }

      const { x = 0, y = 0, zoom = 1 } = viewport;
      setNodes(nodes);
      setEdges(edges);
      setViewport({ x, y, zoom });

      const maxId = Math.max(
        0,
        ...nodes.map((n) => parseInt(String(n.id).replace("dndnode_", ""), 10)),
      );
      getId.setId(maxId + 1);
    } catch (error) {
      console.error("Error restoring flow:", error);
    } finally {
      setLoadingFlow(false);
    }
  }, [flowKey, getId, resolvedLabId, setCanvasPlanId, setEdges, setLabName, setLabRegion, setLoadingFlow, setMasterCidrBlock, setNodes, setPrefixLength, setResolvedExecutionTarget, setTargetProvider, setViewport]);

  return restoreFlow;
};

export default useRestoreFlow;
