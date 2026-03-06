// frontend/src/components/flow/flow-hooks/useSaveFlow.js
import { doc, setDoc } from "firebase/firestore";
import { useCallback, useContext } from "react";
import {
  DB_FIRESTORE_VPCS,
  ERROR_SAVING_FLOW_FIREBASE,
} from "@/shared/constants";
import { LoadingFlowContext } from "@/app/providers/LoadingFlowContext";
import { db } from "../../../infrastructure/firebase/firebaseConfig";

/**
 * Sanea cualquier objeto para Firestore:
 * - Elimina claves con valor undefined en objetos.
 * - Reemplaza elementos undefined en arrays por null (Firestore no admite huecos).
 * - Mantiene Date (Firestore lo acepta).
 */
function sanitizeForFirestore(value) {
  if (value === undefined) return undefined; // en objetos, la clave se filtrará
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;

  if (Array.isArray(value)) {
    // Firestore no admite elementos undefined; usa null en su lugar
    return value.map((v) => (v === undefined ? null : sanitizeForFirestore(v)));
  }

  // Objeto: elimina claves undefined y sanea recursivamente
  const entries = Object.entries(value)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => [k, sanitizeForFirestore(v)]);
  return Object.fromEntries(entries);
}

const useSaveFlow = ({ reactFlowInstance, flowKey, vpcid }) => {
  const { setLoadingFlow } = useContext(LoadingFlowContext);

  return useCallback(async () => {
    if (!reactFlowInstance) return;

    setLoadingFlow(true);

    try {
      const vpcObject = reactFlowInstance.toObject();

      // Fecha de expiración (15 días)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 15);

      const flowWithExpiration = { ...vpcObject, expiration: expirationDate };
      const sanitizedFlow = sanitizeForFirestore(flowWithExpiration);

      // Guardar copia local (JSON.stringify ya omite undefined en objetos)
      localStorage.setItem(flowKey, JSON.stringify(sanitizedFlow));

      // Guardar en Firestore (crea o actualiza el doc)
      const docRef = doc(db, DB_FIRESTORE_VPCS, vpcid);
      await setDoc(docRef, { flow: sanitizedFlow }, { merge: true });
    } catch (error) {
      console.error(ERROR_SAVING_FLOW_FIREBASE, error);
    } finally {
      setLoadingFlow(false);
    }
  }, [reactFlowInstance, setLoadingFlow, flowKey, vpcid]);
};

export default useSaveFlow;
