import { useReactFlow } from "@xyflow/react"
import { createContext, useContext } from "react"

const NetworkContext = createContext()

export const NetworkProvider = ({ children }) => {
    const reactFlowInstance = useReactFlow()
    

    return (
        <NetworkContext.Provider value={{ 
            nodes:reactFlowInstance.getNodes(),
            edges: reactFlowInstance.getEdges()
        }}>
            {children}
        </NetworkContext.Provider>
    )
}

export const useNetwork = () => useContext(NetworkContext)