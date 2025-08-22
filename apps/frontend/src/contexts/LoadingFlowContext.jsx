import { useState } from "react"
import { createContext } from "react"

export const LoadingFlowContext = createContext()

// eslint-disable-next-line react/prop-types
export const LoadingFlowProvider = ({ children }) => {
    const [loadingFlow, setLoadingFlow] = useState(false)

    return (
        <LoadingFlowContext.Provider value={{ loadingFlow, setLoadingFlow }}>
            {children}
        </LoadingFlowContext.Provider>
    )
}

