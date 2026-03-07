import { useContext } from 'react'
import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext'
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

const LoadingFlow = () => {

    const { loadingFlow, loadingMessage } = useContext(LoadingFlowContext)

    if (!loadingFlow) return null

    return (
        <Box
            sx={{
                position: "absolute",
                inset: 0,
                zIndex: (theme) => theme.zIndex.appBar - 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(15, 23, 42, 0.22)",
                backdropFilter: "blur(2px)",
            }}
        >
            <Stack spacing={1.2} alignItems="center" sx={{ color: "common.white" }}>
                <CircularProgress color="inherit" />
                <Typography variant="body2">{loadingMessage || "Procesando..."}</Typography>
            </Stack>
        </Box>
    )
}

export default LoadingFlow
