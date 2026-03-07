import { createContext, useCallback, useMemo, useState } from "react"

export const LoadingFlowContext = createContext()

// eslint-disable-next-line react/prop-types
export const LoadingFlowProvider = ({ children }) => {
    const [loadingCount, setLoadingCount] = useState(0)
    const [loadingMessage, setLoadingMessage] = useState("Procesando...")

    const setLoadingFlow = useCallback((value) => {
        setLoadingCount((prev) => {
            if (value) return prev + 1
            return Math.max(0, prev - 1)
        })
    }, [])

    const showLoading = useCallback((message) => {
        if (message) setLoadingMessage(message)
        setLoadingCount((prev) => prev + 1)
    }, [])

    const hideLoading = useCallback(() => {
        setLoadingCount((prev) => Math.max(0, prev - 1))
    }, [])

    const resetLoading = useCallback(() => {
        setLoadingCount(0)
    }, [])

    const loadingFlow = loadingCount > 0

    const value = useMemo(
        () => ({
            loadingFlow,
            loadingCount,
            loadingMessage,
            setLoadingFlow,
            setLoadingMessage,
            showLoading,
            hideLoading,
            resetLoading,
        }),
        [loadingFlow, loadingCount, loadingMessage, setLoadingFlow, showLoading, hideLoading, resetLoading],
    )

    return (
        <LoadingFlowContext.Provider value={value}>
            {children}
        </LoadingFlowContext.Provider>
    )
}
