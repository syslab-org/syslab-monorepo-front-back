import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SchoolIcon from "@mui/icons-material/School";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

const maxIssuesToShow = 2;

export default function LearningGuidePanel({
  guide,
  onOpenValidation,
  onOpenDeploy,
}) {
  if (!guide) return null;

  const { stats, progress, steps, nextStep, nextAction, issues } = guide;
  const canOpenValidation = nextStep?.id === "validate";
  const canOpenDeploy = nextStep?.id === "deploy";

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoStoriesIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Guia de aprendizaje
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Sigue los pasos para construir y entender la topologia antes de aplicar en AWS.
        </Typography>
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Progreso {progress.completed}/{progress.total}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress.percent}
          sx={{ mt: 0.5, borderRadius: 999 }}
        />
      </Box>

      <Stack direction="row" spacing={0.8} flexWrap="wrap">
        <Chip size="small" label={`VPCs: ${stats.vpcs}`} />
        <Chip size="small" label={`Subredes: ${stats.subnets}`} />
        <Chip size="small" label={`Routers: ${stats.routers}`} />
        <Chip size="small" label={`Peering: ${stats.peeringRouters || 0}`} variant="outlined" />
        <Chip size="small" label={`TGW: ${stats.tgwRouters || 0}`} variant="outlined" />
        <Chip size="small" label={`Instancias: ${stats.instances}`} />
      </Stack>

      <Divider />

      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Comparacion pedagogica
        </Typography>
        <Stack direction={{ xs: "column", xl: "row" }} spacing={1}>
          <Box
            sx={{
              flex: 1,
              p: 1.2,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "primary.light",
              backgroundColor: "rgba(25, 118, 210, 0.05)",
            }}
          >
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.8 }}>
              <SchoolIcon fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Vista laboratorio (VLAN)
              </Typography>
            </Stack>
            {guide.contrast.vlanLines.map((line) => (
              <Typography key={line} variant="caption" display="block">
                - {line}
              </Typography>
            ))}
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 1.2,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "success.light",
              backgroundColor: "rgba(46, 125, 50, 0.06)",
            }}
          >
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.8 }}>
              <CloudQueueIcon fontSize="small" color="success" />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Vista implementacion AWS
              </Typography>
            </Stack>
            {guide.contrast.awsLines.map((line) => (
              <Typography key={line} variant="caption" display="block">
                - {line}
              </Typography>
            ))}
          </Box>
        </Stack>

        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
          {guide.contrast.conceptMap.map((row) => (
            <Box
              key={row.concept}
              sx={{
                px: 1,
                py: 0.8,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700 }} display="block">
                {row.concept}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Lab: {row.vlanView}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                AWS: {row.awsView}
              </Typography>
            </Box>
          ))}
        </Box>
      </Stack>

      <Divider />

      <Stack spacing={1.2}>
        {steps.map((step) => (
          <Box
            key={step.id}
            sx={{
              p: 1,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: step.completed ? "success.light" : "divider",
              backgroundColor: step.completed
                ? "rgba(46, 125, 50, 0.08)"
                : nextStep?.id === step.id
                  ? "action.hover"
                  : "transparent",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {step.completed ? (
                <CheckCircleIcon fontSize="small" color="success" />
              ) : (
                <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
              )}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {step.title}
              </Typography>
              {step.optional && <Chip size="small" label="Opcional" variant="outlined" />}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 3.2 }}>
              {step.description}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Alert severity="info" variant="outlined">
        {nextAction}
      </Alert>

      {issues.errors.length > 0 && (
        <Alert severity="error" variant="outlined">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Bloqueos detectados
          </Typography>
          {issues.errors.slice(0, maxIssuesToShow).map((err) => (
            <Typography key={err} variant="caption" display="block">
              - {err}
            </Typography>
          ))}
          {issues.errors.length > maxIssuesToShow && (
            <Typography variant="caption" display="block">
              + {issues.errors.length - maxIssuesToShow} errores adicionales.
            </Typography>
          )}
        </Alert>
      )}

      {canOpenValidation && (
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={onOpenValidation}
        >
          Abrir validacion
        </Button>
      )}

      {canOpenDeploy && (
        <Button
          variant="outlined"
          color="success"
          startIcon={<PlayArrowIcon />}
          onClick={onOpenDeploy}
        >
          Abrir despliegue
        </Button>
      )}
    </Box>
  );
}
