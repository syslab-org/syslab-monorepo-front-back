import { useContext } from 'react'
import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext'
import { Box, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';

const LoadingFlow = () => {

    const { loadingFlow, loadingMessage } = useContext(LoadingFlowContext)

    if (!loadingFlow) return null

    return (
        <Box
            sx={{
                position: "fixed",
                inset: 0,
                zIndex: (theme) => theme.zIndex.modal + 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "radial-gradient(circle at top, rgba(37, 99, 235, 0.18), transparent 38%), rgba(15, 23, 42, 0.34)",
                backdropFilter: "blur(6px)",
                px: 2,
            }}
        >
            <Box
                sx={{
                    width: "min(92vw, 360px)",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.18)",
                    background:
                        "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.88) 100%)",
                    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.34)",
                }}
            >
                <Box
                    sx={{
                        height: 4,
                        background: "linear-gradient(90deg, #22c55e 0%, #38bdf8 45%, #2563eb 100%)",
                    }}
                />
                <Stack
                    spacing={1.5}
                    sx={{
                        px: 3,
                        py: 2.5,
                        color: "common.white",
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: "50%",
                                display: "grid",
                                placeItems: "center",
                                background: "rgba(59, 130, 246, 0.12)",
                                border: "1px solid rgba(96, 165, 250, 0.28)",
                                boxShadow: "0 0 0 8px rgba(59, 130, 246, 0.08)",
                                flexShrink: 0,
                            }}
                        >
                            <CircularProgress color="inherit" size={24} thickness={4.6} />
                        </Box>

                        <Stack spacing={0.25} minWidth={0}>
                            <Typography variant="overline" sx={{ letterSpacing: "0.14em", opacity: 0.72 }}>
                                SysLab en progreso
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
                                {loadingMessage || "Procesando..."}
                            </Typography>
                        </Stack>
                    </Stack>

                    <LinearProgress
                        color="inherit"
                        sx={{
                            height: 7,
                            borderRadius: 999,
                            overflow: "hidden",
                            backgroundColor: "rgba(255,255,255,0.12)",
                            "& .MuiLinearProgress-bar": {
                                borderRadius: 999,
                                background: "linear-gradient(90deg, #22c55e 0%, #38bdf8 50%, #60a5fa 100%)",
                            },
                        }}
                    />

                    <Typography variant="caption" sx={{ opacity: 0.78 }}>
                        Estamos guardando el cambio y sincronizando la vista para que no pierdas contexto.
                    </Typography>
                </Stack>
            </Box>
        </Box>
    )
}

export default LoadingFlow
