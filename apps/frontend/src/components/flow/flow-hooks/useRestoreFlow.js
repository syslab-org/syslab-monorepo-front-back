import { doc, getDoc } from "firebase/firestore";
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../../firebase/firebaseConfig";
import {
  FETCHING_ERROR,
  FIRESTORE_COLLECTION,
  FLOW_EXPIRED,
  LOADING_ERROR,
  NO_DOC_WARNING,
  SAVING_ERROR,
  UNKNOWN_EXPIRATION_FORMAT,
} from "../../../constants";
import { useContext } from "react";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import useCidrBlockVPCStore from "../store/cidrBlocksIp";

// Aux function to get firestore data
const fetchFlowFromFirebase = async (vpcid) => {
  try {
    const vpcDoc = doc(db, FIRESTORE_COLLECTION, vpcid);
    const vpcSnapshot = await getDoc(vpcDoc);

    if (!vpcSnapshot.exists()) {
      console.warn(`${NO_DOC_WARNING} ${vpcid}`);
      return null;
    }

    return vpcSnapshot.data();
  } catch (error) {
    console.error(FETCHING_ERROR, error);
    return null;
  }
};

// Aux function to save data in localStorage
const saveFlowToLocalStorage = (key, flow) => {
  try {
    localStorage.setItem(key, JSON.stringify(flow));
  } catch (error) {
    console.error(SAVING_ERROR, error);
  }
};

// Aux function to load data from localStorage
const loadFlowFromLocalStorage = (key) => {
  try {
    const flow = JSON.parse(localStorage.getItem(key));
    return flow;
  } catch (error) {
    console.error(LOADING_ERROR, error);
    return null;
  }
};

// Function to convert `expiration` in an object `Date`
const convertToDate = (expiration) => {
  if (!expiration) return null;

  if (expiration.seconds) {
    return new Date(expiration.seconds * 1000);
  } else if (typeof expiration === "string" || typeof expiration === "number") {
    return new Date(expiration);
  } else {
    console.error(UNKNOWN_EXPIRATION_FORMAT, expiration);
    return null;
  }
};

// ✅ Normaliza el documento de Firestore para soportar esquemas antiguos/nuevos
const normalizeFetchedDoc = (docData) => {
  if (!docData) return null;

  // algunas versiones guardan datos en `data`
  const data = docData.data || {};

  const cidrBlock =
    docData.cidrBlock ??
    data.cidrBlock ??
    data.cidr_block ??
    docData.cidr_block;

  const prefixLength =
    docData.prefixLength ??
    data.prefixLength ??
    data.prefix_length ??
    docData.prefix_length;

  // el canvas/flow puede venir como `flow`, `reactFlow`, o el doc completo/anidado
  let flow =
    docData.flow ?? docData.reactFlow ?? data.flow ?? data.reactFlow ?? null;

  // 🔁 esquemas antiguos: a veces `data` ES el flow (tiene nodes/edges/viewport)
  if (!flow) {
    const looksLikeFlow =
      (data &&
        (Array.isArray(data.nodes) ||
          Array.isArray(data.edges) ||
          data.viewport)) ||
      (docData &&
        (Array.isArray(docData.nodes) ||
          Array.isArray(docData.edges) ||
          docData.viewport));

    if (looksLikeFlow) {
      flow =
        data && (data.nodes || data.edges || data.viewport) ? data : docData;
    }
  }

  const planId =
    docData.planId ?? data.planId ?? docData.plan_id ?? data.plan_id ?? null;

  return { flow, cidrBlock, prefixLength, planId };
};

const useRestoreFlow = ({
  setNodes,
  setEdges,
  setViewport,
  flowKey,
  getId,
  setCanvasPlanId,
}) => {
  const { vpcid } = useParams();
  const { setCidrBlockVPC, setPrefixLength } = useCidrBlockVPCStore();
  const { setLoadingFlow } = useContext(LoadingFlowContext);

  const restoreFlow = useCallback(async () => {
    setLoadingFlow(true);

    try {
      let flow = loadFlowFromLocalStorage(flowKey);

      // Si no hay en local o no corresponde al vpc actual, traer de Firestore
      if (!flow || flow.id !== vpcid) {
        const fetchedDoc = await fetchFlowFromFirebase(vpcid);
        const normalized = normalizeFetchedDoc(fetchedDoc);

        if (!normalized) {
          console.warn("No document data available to restore");
          setLoadingFlow(false);
          return;
        }

        const {
          flow: fetchedFlow,
          cidrBlock,
          prefixLength,
          planId,
        } = normalized;

        // Actualiza CIDR/prefix aunque el flow esté en otro formato
        if (cidrBlock) setCidrBlockVPC(cidrBlock);
        if (prefixLength !== undefined && prefixLength !== null) {
          setPrefixLength(prefixLength || "");
        }
        if (typeof setCanvasPlanId === "function") {
          setCanvasPlanId(planId || null);
        }

        if (!fetchedFlow) {
          console.warn(
            "No flow data available to restore (missing field 'flow')",
          );
          setLoadingFlow(false);
          return;
        }

        flow = fetchedFlow;
        saveFlowToLocalStorage(flowKey, {
          ...flow,
          id: vpcid,
          cidrBlock: cidrBlock,
          prefixLength: prefixLength || "",
          planId: planId || null,
        });
      }

      if (!flow) {
        setLoadingFlow(false);
        return;
      }
      if (typeof setCanvasPlanId === "function") {
        setCanvasPlanId(flow.planId || null);
      }

      // ✅ Si no hay expiration, NO bloqueamos la restauración (evita canvas vacío por esquema viejo)
      // Si está expirado, limpiamos cache y caemos a Firestore.
      const { expiration, nodes = [], edges = [], viewport = {} } = flow;
      const expirationDate = expiration ? convertToDate(expiration) : null;
      const currentDate = new Date();

      const isExpired = expirationDate
        ? !(expirationDate > currentDate)
        : false;
      if (isExpired) {
        console.info(FLOW_EXPIRED);
        localStorage.removeItem(flowKey);

        // forza fallback a Firestore para este vpcid
        flow = null;
      }

      // si el cache expiró, volvemos a intentar desde Firestore
      if (!flow) {
        const fetchedDoc = await fetchFlowFromFirebase(vpcid);
        const normalized = normalizeFetchedDoc(fetchedDoc);

        if (!normalized) {
          console.warn("No document data available to restore");
          setLoadingFlow(false);
          return;
        }

        const {
          flow: fetchedFlow,
          cidrBlock,
          prefixLength,
          planId,
        } = normalized;

        if (cidrBlock) setCidrBlockVPC(cidrBlock);
        if (prefixLength !== undefined && prefixLength !== null) {
          setPrefixLength(prefixLength || "");
        }
        if (typeof setCanvasPlanId === "function") {
          setCanvasPlanId(planId || null);
        }

        if (!fetchedFlow) {
          console.warn(
            "No flow data available to restore (missing flow/reactFlow/nodes/edges)",
          );
          setLoadingFlow(false);
          return;
        }

        flow = fetchedFlow;
        saveFlowToLocalStorage(flowKey, {
          ...flow,
          id: vpcid,
          cidrBlock: cidrBlock,
          prefixLength: prefixLength || "",
          planId: planId || null,
        });
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

      setLoadingFlow(false);
    } catch (e) {
      console.error("RestoreFlow failed:", e);
      setLoadingFlow(false);
    }
  }, [
    setLoadingFlow,
    flowKey,
    vpcid,
    setNodes,
    setEdges,
    setViewport,
    getId,
    setCidrBlockVPC,
    setPrefixLength,
  ]);

  return restoreFlow;
};

export default useRestoreFlow;
