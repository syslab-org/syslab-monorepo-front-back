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
import { useTranslation } from 'react-i18next';

const maxIssuesToShow = 2;

export default function LearningGuidePanel({
  guide,
  onOpenValidation,
  onOpenDeploy,
}) {
  const { t } = useTranslation();
  if (!guide) return null;

  const { stats, progress, steps, nextStep, nextAction, issues, focused, providerLabel } = guide;
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
            {t('canvas.learningGuide.panel.title')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {t('canvas.learningGuide.panel.subtitle')}
        </Typography>
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary">
          {t('canvas.learningGuide.panel.progress', { completed: progress.completed, total: progress.total })}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress.percent}
          sx={{ mt: 0.5, borderRadius: 999 }}
        />
      </Box>

      <Stack direction="row" spacing={0.8} flexWrap="wrap">
        <Chip size="small" label={t('canvas.learningGuide.panel.stats.segments', { count: stats.vpcs })} />
        <Chip size="small" label={t('canvas.learningGuide.panel.stats.zones', { count: stats.subnets })} />
        <Chip size="small" label={t('canvas.learningGuide.panel.stats.routers', { count: stats.routers })} />
        <Chip size="small" label={t('canvas.learningGuide.panel.stats.directLinks', { count: stats.peeringRouters || 0 })} variant="outlined" />
        <Chip size="small" label={t('canvas.learningGuide.panel.stats.hubRouting', { count: stats.tgwRouters || 0 })} variant="outlined" />
        <Chip size="small" label={t('canvas.learningGuide.panel.stats.workloads', { count: stats.instances })} />
      </Stack>

      {focused && (
        <>
          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('canvas.learningGuide.panel.selectedElement')}
            </Typography>

            <Box
              sx={{
                p: 1.2,
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.default",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {focused.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                {focused.subtitle}
              </Typography>

              {focused.badges?.length > 0 && (
                <Stack direction="row" spacing={0.8} flexWrap="wrap" sx={{ mt: 1 }}>
                  {focused.badges.map((badge) => (
                    <Chip
                      key={badge.label}
                      size="small"
                      label={badge.label}
                      color={
                        ["default", "primary", "secondary", "success", "info", "warning", "error"].includes(badge.tone)
                          ? badge.tone
                          : "default"
                      }
                      variant={badge.tone === "default" ? "outlined" : "filled"}
                    />
                  ))}
                </Stack>
              )}

              <Stack spacing={1} sx={{ mt: 1.2 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700 }} display="block">
                    {t('canvas.learningGuide.panel.neutralReading')}
                  </Typography>
                  {focused.labLines.map((line) => (
                    <Typography key={line} variant="caption" display="block" color="text.secondary">
                      - {line}
                    </Typography>
                  ))}
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700 }} display="block">
                    {t('canvas.learningGuide.panel.providerReading', { provider: providerLabel || "AWS" })}
                  </Typography>
                  {focused.providerLines.map((line) => (
                    <Typography key={line} variant="caption" display="block" color="text.secondary">
                      - {line}
                    </Typography>
                  ))}
                </Box>

                {focused.whyItMatters && (
                  <Alert severity="info" variant="outlined" sx={{ py: 0 }}>
                    <Typography variant="caption">{focused.whyItMatters}</Typography>
                  </Alert>
                )}
              </Stack>
            </Box>
          </Stack>
        </>
      )}

      <Divider />

      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('canvas.learningGuide.panel.conceptComparison')}
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
                {t('canvas.learningGuide.panel.neutralView')}
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
                {t('canvas.learningGuide.panel.providerView', { provider: providerLabel || "AWS" })}
              </Typography>
            </Stack>
            {guide.contrast.providerLines.map((line) => (
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
                {t('canvas.learningGuide.panel.neutralLabel')} {row.vlanView}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                {t('canvas.learningGuide.panel.providerLabel', { provider: providerLabel || "AWS" })} {row.providerView}
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
              {step.optional && <Chip size="small" label={t('common.optional')} variant="outlined" />}
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
            {t('canvas.learningGuide.panel.blockers')}
          </Typography>
          {issues.errors.slice(0, maxIssuesToShow).map((err) => (
            <Typography key={err} variant="caption" display="block">
              - {err}
            </Typography>
          ))}
          {issues.errors.length > maxIssuesToShow && (
            <Typography variant="caption" display="block">
              {t('canvas.learningGuide.panel.moreErrors', { count: issues.errors.length - maxIssuesToShow })}
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
          {t('canvas.learningGuide.panel.openValidation')}
        </Button>
      )}

      {canOpenDeploy && (
        <Button
          variant="outlined"
          color="success"
          startIcon={<PlayArrowIcon />}
          onClick={onOpenDeploy}
        >
          {t('canvas.learningGuide.panel.openDeploy')}
        </Button>
      )}
    </Box>
  );
}
