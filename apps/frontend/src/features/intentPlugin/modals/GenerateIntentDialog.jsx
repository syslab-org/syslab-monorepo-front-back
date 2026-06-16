import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

  const handleSubmit = () => {
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
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          {t("canvas.intentPlugin.cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<AutoAwesomeIcon />}
          disabled={isSubmitting || !prompt.trim()}
        >
          {isSubmitting ? t("canvas.intentPlugin.generating") : t("canvas.intentPlugin.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
