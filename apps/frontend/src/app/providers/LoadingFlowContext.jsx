import { createContext, useCallback, useEffect, useMemo, useState } from "react"
import { LOADING_FLOW_EVENT } from "@/app/providers/loadingFlowEvents"

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

    useEffect(() => {
        if (typeof window === "undefined") return undefined

        const handleLoadingEvent = (event) => {
            const type = event?.detail?.type
            const message = event?.detail?.message

            if (type === "start") {
                if (message) setLoadingMessage(message)
                setLoadingCount((prev) => prev + 1)
                return
            }

            if (type === "end") {
                setLoadingCount((prev) => Math.max(0, prev - 1))
            }
        }

        window.addEventListener(LOADING_FLOW_EVENT, handleLoadingEvent)
        return () => window.removeEventListener(LOADING_FLOW_EVENT, handleLoadingEvent)
    }, [])

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
