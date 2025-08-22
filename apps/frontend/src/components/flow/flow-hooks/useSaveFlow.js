import { doc, getDoc, setDoc } from "firebase/firestore";
import { useCallback, useContext } from "react";
import { db } from "../../../firebase/firebaseConfig";
import { DB_FIRESTORE_VPCS, ERROR_SAVING_FLOW_FIREBASE, FLOW_DATA_SAVED_FIREBASE } from "../../../constants";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";

const useSaveFlow = ({ reactFlowInstance, flowKey, vpcid }) => {
    const { setLoadingFlow } = useContext(LoadingFlowContext);
    // Usamos useCallback para memorizar la función y evitar que se recree en cada renderizado.
    return useCallback(async () => {
        // // console.log('Ejecutando useSaveFlow...');
        

        if (!reactFlowInstance) return; // Evitamos ejecutar si reactFlowInstance no está disponible.

        setLoadingFlow(true); // Mostramos loading mientras guardamos los datos.

        try {
            const vpcObject = reactFlowInstance.toObject();
            // // console.log(vpcObject);
            

            // Creación de la fecha de expiración
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 15);

            const flowWithExpiration = { ...vpcObject, expiration: expirationDate };

            // Guardamos en localStorage
            localStorage.setItem(flowKey, JSON.stringify(flowWithExpiration));

            // Guardamos en Firebase
            const docRef = doc(db, DB_FIRESTORE_VPCS, vpcid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                await setDoc(docRef, { flow: flowWithExpiration }, { merge: true });
            }

            // // console.log(FLOW_DATA_SAVED_FIREBASE);
        } catch (error) {
            console.error(ERROR_SAVING_FLOW_FIREBASE, error);
        } finally {
            setLoadingFlow(false); // Quitamos loading cuando termina la operación.
        }

    }, [reactFlowInstance, setLoadingFlow, flowKey, vpcid]); // Nos aseguramos de que solo cambie si estas dependencias cambian.
};

export default useSaveFlow;
