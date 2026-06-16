import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";


export default function GenerateIntentDialog({
  open,
  onClose,
  onSubmit,
  onApplyPreview,
  onBackFromPreview,
  preview = null,
  hasExistingTopology = false,
  isSubmitting = false,
  error = "",
  defaultRegion = "us-east-1",
  targetProvider = "aws",
  manifest = null,
}) {
  const { t } = useTranslation();
  const providerKey = String(targetProvider || manifest?.defaults?.target_provider || "aws").toLowerCase();
  const providerKindKey = String(manifest?.provider?.kind || "deterministic").toLowerCase();
  const configuredRegion = manifest?.defaults?.region || defaultRegion || "us-east-1";
  const configuredMaxWorkloads = Math.max(1, Number(manifest?.constraints?.max_workloads) || 6);
  const initialMaxWorkloads = Math.min(3, configuredMaxWorkloads);
  const [prompt, setPrompt] = useState("");
  const [region, setRegion] = useState(configuredRegion);
  const [maxWorkloads, setMaxWorkloads] = useState(initialMaxWorkloads);

  useEffect(() => {
    if (!open) return;
    setPrompt("");
    setRegion(configuredRegion);
    setMaxWorkloads(initialMaxWorkloads);
  }, [configuredRegion, initialMaxWorkloads, open]);

  const submitGeneration = () => {
    if (!prompt.trim()) return;
    onSubmit?.({
      prompt: prompt.trim(),
      region: region.trim() || configuredRegion,
      maxWorkloads,
    });
  };

  const providerLabel = t(`canvas.intentPlugin.providerLabels.${providerKey}`, {
    defaultValue: String(targetProvider || "aws").toUpperCase(),
  });
  const providerKindLabel = t(`canvas.intentPlugin.providerKinds.${providerKindKey}`, {
    defaultValue: providerKindKey,
  });
  const promptSuggestions = [
    {
      label: t("canvas.intentPlugin.suggestions.webAppLabel"),
      value: t("canvas.intentPlugin.suggestions.webAppPrompt"),
    },
    {
      label: t("canvas.intentPlugin.suggestions.publicPrivateLabel"),
      value: t("canvas.intentPlugin.suggestions.publicPrivatePrompt"),
    },
    {
      label: t("canvas.intentPlugin.suggestions.privateLabLabel"),
      value: t("canvas.intentPlugin.suggestions.privateLabPrompt"),
    },
  ];
  const previewSummary = preview?.summary || null;
  const previewProviderLabel = t(`canvas.intentPlugin.providerLabels.${String(previewSummary?.provider || providerKey).toLowerCase()}`, {
    defaultValue: providerLabel,
  });

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <AutoAwesomeIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t("canvas.intentPlugin.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("canvas.intentPlugin.subtitle", { provider: providerLabel })}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {!previewSummary ? (
          <Stack spacing={2}>
            <Alert severity="info">{t("canvas.intentPlugin.info")}</Alert>
            {manifest?.provider?.kind ? (
              <Alert severity="success">
                {t("canvas.intentPlugin.providerActive", {
                  provider: providerLabel,
                  kind: providerKindLabel,
                })}
              </Alert>
            ) : null}
            {hasExistingTopology ? (
              <Alert severity="warning">
                {t("canvas.intentPlugin.replaceWarning")}
              </Alert>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              autoFocus
              multiline
              minRows={5}
              maxRows={10}
              label={t("canvas.intentPlugin.promptLabel")}
              placeholder={t("canvas.intentPlugin.promptPlaceholder")}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={isSubmitting}
              fullWidth
            />

            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
                {t("canvas.intentPlugin.suggestionsTitle")}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {promptSuggestions.map((suggestion) => (
                  <Chip
                    key={suggestion.label}
                    label={suggestion.label}
                    variant="outlined"
                    onClick={() => setPrompt(suggestion.value)}
                    disabled={isSubmitting}
                    clickable
                  />
                ))}
              </Stack>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={t("canvas.intentPlugin.regionLabel")}
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                disabled={isSubmitting}
                fullWidth
              />
              <TextField
                label={t("canvas.intentPlugin.maxWorkloadsLabel")}
                type="number"
                value={maxWorkloads}
                onChange={(event) => {
                  const nextValue = Number(event.target.value) || 1;
                  setMaxWorkloads(Math.max(1, Math.min(nextValue, configuredMaxWorkloads)));
                }}
                inputProps={{ min: 1, max: configuredMaxWorkloads }}
                disabled={isSubmitting}
                sx={{ minWidth: { sm: 180 } }}
              />
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Alert severity="info">{t("canvas.intentPlugin.previewInfo")}</Alert>
            {hasExistingTopology ? (
              <Alert severity="warning">
                {t("canvas.intentPlugin.previewReplaceWarning")}
              </Alert>
            ) : null}

            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                bgcolor: "background.default",
              }}
            >
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {t("canvas.intentPlugin.previewTitle")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("canvas.intentPlugin.previewSubtitle")}
                  </Typography>
                </Box>
                <Divider />
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.provider")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewProviderLabel}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.region")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewSummary.region || "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.network")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewSummary.networkName || "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.cidr")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewSummary.cidr || "—"}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.segments")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewSummary.segments}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.publicSubnets")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewSummary.publicSubnets}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.privateSubnets")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewSummary.privateSubnets}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.workloads")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewSummary.workloads}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.natGateways")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewSummary.natGateways}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">{t("canvas.intentPlugin.previewFields.internetGateways")}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{previewSummary.internetGateways}</Typography>
                  </Grid>
                </Grid>
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {!previewSummary ? (
          <>
            <Button onClick={onClose} disabled={isSubmitting}>
              {t("canvas.intentPlugin.cancel")}
            </Button>
            <Button
              onClick={submitGeneration}
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              disabled={isSubmitting || !prompt.trim()}
            >
              {isSubmitting ? t("canvas.intentPlugin.generating") : t("canvas.intentPlugin.submit")}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onBackFromPreview} disabled={isSubmitting}>
              {t("canvas.intentPlugin.previewBack")}
            </Button>
            <Button
              onClick={onApplyPreview}
              variant="contained"
              color={hasExistingTopology ? "warning" : "primary"}
              disabled={isSubmitting}
            >
              {hasExistingTopology
                ? t("canvas.intentPlugin.previewApplyReplace")
                : t("canvas.intentPlugin.previewApply")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
