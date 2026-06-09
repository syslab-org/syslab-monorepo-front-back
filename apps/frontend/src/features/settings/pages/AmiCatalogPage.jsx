import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { DeleteOutlineOutlined } from "@mui/icons-material";

import { LoadingFlowContext } from "@/app/providers/LoadingFlowContext";
import AddAmiModal from "@/features/settings/modals/AddAmiModal";
import { api } from "@/infrastructure/http/api";
import { PageHeader } from "@/shared/ui/layouts/MainLayout";

const AmiCatalogList = ({ items, onDelete, t }) => (
  <List dense sx={{ mt: 1 }}>
    {items.length > 0 ? (
      items.map((ami) => (
        <ListItem
          key={ami.id}
          secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => onDelete(ami.id)}>
              <DeleteOutlineOutlined />
            </IconButton>
          }
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            mb: 1,
            alignItems: "center",
          }}
        >
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 700 }}>{ami.label || ami.code}</Typography>
                {ami.region && <Chip size="small" variant="outlined" label={ami.region} />}
              </Stack>
            }
            secondary={
              <Typography variant="body2" color="text.secondary">
                {t("settings.amis.codePrefix", { value: ami.code })}
              </Typography>
            }
            secondaryTypographyProps={{ component: "div" }}
          />
        </ListItem>
      ))
    ) : (
      <ListItem>
        <ListItemText primary={t("settings.amis.empty")} />
      </ListItem>
    )}
  </List>
);

export default function AmiCatalogPage() {
  const { t } = useTranslation();
  const [amiList, setAmiList] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { setLoadingFlow } = useContext(LoadingFlowContext);

  const fetchAmis = async () => {
    setLoadingFlow(true);
    setError("");
    try {
      const amis = await api.listAmis({ provider: "aws" });
      setAmiList(Array.isArray(amis) ? amis : []);
    } catch (loadError) {
      setError(loadError?.message || t("settings.amis.loadError"));
    } finally {
      setLoadingFlow(false);
    }
  };

  useEffect(() => {
    fetchAmis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async (newAmiData) => {
    setOpen(false);
    if (!newAmiData) return;

    setLoadingFlow(true);
    setError("");
    try {
      await api.createAmi({
        code: newAmiData?.amiCode || "",
        label: newAmiData?.amiLabel || "",
        provider: "aws",
        region: newAmiData?.region || "",
        metadata: newAmiData,
      });
      setMessage(t("settings.amis.created"));
      await fetchAmis();
    } catch (saveError) {
      setError(saveError?.message || t("settings.amis.createError"));
    } finally {
      setLoadingFlow(false);
    }
  };

  const handleDelete = async (amiId) => {
    setLoadingFlow(true);
    setError("");
    try {
      await api.deleteAmi(amiId);
      setMessage(t("settings.amis.deleted"));
      await fetchAmis();
    } catch (deleteError) {
      setError(deleteError?.message || t("settings.amis.deleteError"));
    } finally {
      setLoadingFlow(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t("settings.amis.title")}
        subtitle={t("settings.amis.subtitle")}
        actions={
          <Button variant="contained" onClick={() => setOpen(true)}>
            {t("settings.amis.new")}
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {t("settings.amis.info")}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{t("settings.amis.registered")}</Typography>
          <Chip size="small" label={`${amiList.length}`} />
        </Stack>
        <AmiCatalogList items={amiList} onDelete={handleDelete} t={t} />
      </Paper>

      <AddAmiModal open={open} closeModal={handleClose} />
    </Box>
  );
}
