import { doc, getDoc } from "firebase/firestore"
import { useCallback } from "react"
import { useParams } from "react-router-dom"
import { db } from "../../../firebase/firebaseConfig"
import { FETCHING_ERROR, FIRESTORE_COLLECTION, FLOW_EXPIRED, LOADING_ERROR, NO_DOC_WARNING, SAVING_ERROR, UNKNOWN_EXPIRATION_FORMAT } from "../../../constants"
import { useContext } from "react"
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext"
import useCidrBlockVPCStore from '../store/cidrBlocksIp'



//Aux function to get firestore data

const fetchFlowFromFirebase = async (vpcid) => {
    try {
        // console.log("fetchFlowFromFirebase: ", vpcid);

        const vpcDoc = doc(db, FIRESTORE_COLLECTION, vpcid)
        const vpcSnapshot = await getDoc(vpcDoc)

        if (!vpcSnapshot.exists()) {
            console.warn(`${NO_DOC_WARNING} ${vpcid}`);
            return null
        }
        // console.log("vpcSnapshot", vpcSnapshot);

        return vpcSnapshot.data()


    } catch (error) {
        console.error(FETCHING_ERROR, error);
        return null
    }
}


//Aux function to save data in localStorage
const saveFlowToLocalStorage = (key, flow) => {
    try {
        localStorage.setItem(key, JSON.stringify(flow))
    } catch (error) {
        console.error(SAVING_ERROR, error);
    }
}

//Aux function to load data from localStorage
const loadFlowFromLocalStorage = (key) => {
    try {
        const flow = JSON.parse(localStorage.getItem(key))
        // console.log("loadFlowFromLocalStorage: ", flow);

        return flow
    } catch (error) {
        console.error(LOADING_ERROR, error);
        return null
    }
}

//Function to convert `expiration`in an object `Date``
const convertToDate = (expiration) => {

    if (expiration.seconds) {
        // Si expiration es un objeto con seconds y nanoseconds (tipo Timestamp)
        return new Date(expiration.seconds * 1000)
    } else if (typeof expiration === "string" || typeof expiration === "number") {
        // Si expiration es un string o un número
        return new Date(expiration);
    } else {
        console.error(UNKNOWN_EXPIRATION_FORMAT, expiration);
        return;
    }
}

const useRestoreFlow = ({ setNodes, setEdges, setViewport, flowKey, getId }) => {
    // console.log("ONRESTORE");



    const { vpcid } = useParams()
    // console.log("VPCID: ", vpcid);

    const { setCidrBlockVPC, setPrefixLength } = useCidrBlockVPCStore();

    const { setLoadingFlow } = useContext(LoadingFlowContext)

    const restoreFlow = useCallback(async () => {

        setLoadingFlow(true)

        let flow = loadFlowFromLocalStorage(flowKey)
        // console.log("let flow = loadFlowFromLocalStorage(flowKey): ", flow);

        if (!flow || flow.id !== vpcid) {
            // console.log("aqui 2");
            const fetchedFlow = await fetchFlowFromFirebase(vpcid)
            // console.log("fetchedFlow: ", fetchedFlow);


            if (fetchedFlow && fetchedFlow.flow) {
                // console.log("SAVING.......");
                // console.log(fetchedFlow.flow);

                flow = fetchedFlow.flow
                setCidrBlockVPC(fetchedFlow.cidrBlock)
                setPrefixLength(fetchedFlow.prefixLength || '');
                saveFlowToLocalStorage(flowKey, { ...flow, id: vpcid, cidrBlock: fetchedFlow.cidrBlock, prefixLength: fetchedFlow.prefixLength || '' })
            } else {
                console.warn("No flow data available to restore");
                setCidrBlockVPC(fetchedFlow.cidrBlock)
                setPrefixLength(fetchedFlow.prefixLength || '');
                setLoadingFlow(false)
                return
            }
        }

        if (flow) {
            // console.log("flowRestore", flow);
            setCidrBlockVPC(flow.cidrBlock)
            setPrefixLength(flow.prefixLength || '')
            const { expiration, nodes = [], edges = [], viewport = {} } = flow
            const currentDate = new Date()

            const expirationDate = convertToDate(expiration)
            if (!expirationDate) {
                setLoadingFlow(false)
                return

            }

            if (expirationDate > currentDate) {
                const { x = 0, y = 0, zoom = 1 } = viewport
                setNodes(nodes)
                setEdges(edges)
                setViewport({ x, y, zoom })

                const maxId = Math.max(0, ...nodes.map(n => parseInt(n.id.replace("dndnode_", ""), 10)))
                getId.setId(maxId + 1)
                setLoadingFlow(false)
            } else {
                console.info(FLOW_EXPIRED)
                localStorage.removeItem(flowKey)
                setLoadingFlow(false)
            }
        }

    }, [setLoadingFlow, flowKey, vpcid, setNodes, setEdges, setViewport, getId])

    return restoreFlow

}

export default useRestoreFlow