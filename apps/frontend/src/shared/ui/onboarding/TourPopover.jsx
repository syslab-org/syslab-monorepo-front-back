import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export default function TourPopover({
  step,
  stepIndex,
  totalSteps,
  positionStyle,
  onBack,
  onNext,
  onSkip,
  canGoBack,
  isLastStep,
  targetFound,
}) {
  return (
    <Paper
      elevation={14}
      sx={{
        ...positionStyle,
        position: "fixed",
        zIndex: (theme) => theme.zIndex.tooltip + 3,
        width: "min(360px, calc(100vw - 32px))",
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid rgba(148, 163, 184, 0.28)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
        boxShadow: "0 24px 70px rgba(15,23,42,0.28)",
      }}
    >
      <Box
        sx={{
          height: 5,
          background: "linear-gradient(90deg, #0ea5e9 0%, #22c55e 100%)",
        }}
      />

      <Stack spacing={1.5} sx={{ p: 2 }}>
        <Typography variant="overline" sx={{ letterSpacing: "0.12em", color: "text.secondary" }}>
          Paso {stepIndex + 1} de {totalSteps}
        </Typography>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
            {step.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {step.description}
          </Typography>
        </Box>

        {!targetFound && (
          <Typography variant="caption" color="warning.main">
            Estamos esperando que el elemento aparezca en pantalla para destacarlo.
          </Typography>
        )}

        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
          <Button color="inherit" onClick={onSkip}>
            Omitir
          </Button>

          <Stack direction="row" spacing={1}>
            <Button variant="text" onClick={onBack} disabled={!canGoBack}>
              Atrás
            </Button>
            <Button variant="contained" onClick={onNext}>
              {isLastStep ? "Finalizar" : "Siguiente"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
