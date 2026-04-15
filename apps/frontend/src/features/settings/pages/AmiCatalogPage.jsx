import { useContext, useEffect, useState } from "react";
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

const AmiCatalogList = ({ items, onDelete }) => (
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
                Código: {ami.code}
              </Typography>
            }
            secondaryTypographyProps={{ component: "div" }}
          />
        </ListItem>
      ))
    ) : (
      <ListItem>
        <ListItemText primary="No hay AMIs registradas." />
      </ListItem>
    )}
  </List>
);

export default function AmiCatalogPage() {
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
      setError(loadError?.message || "No se pudieron cargar las AMIs.");
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
      setMessage("AMI registrada.");
      await fetchAmis();
    } catch (saveError) {
      setError(saveError?.message || "No se pudo registrar la AMI.");
    } finally {
      setLoadingFlow(false);
    }
  };

  const handleDelete = async (amiId) => {
    setLoadingFlow(true);
    setError("");
    try {
      await api.deleteAmi(amiId);
      setMessage("AMI eliminada.");
      await fetchAmis();
    } catch (deleteError) {
      setError(deleteError?.message || "No se pudo eliminar la AMI.");
    } finally {
      setLoadingFlow(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Catálogo de AMIs"
        subtitle="Administra las imágenes sugeridas para workloads del canvas. Este catálogo queda disponible para docentes y administradores."
        actions={
          <Button variant="contained" onClick={() => setOpen(true)}>
            Nueva AMI
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Las AMIs ayudan a estandarizar imágenes aprobadas por curso o por plataforma y reducen errores al configurar instancias.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>AMIs registradas</Typography>
          <Chip size="small" label={`${amiList.length}`} />
        </Stack>
        <AmiCatalogList items={amiList} onDelete={handleDelete} />
      </Paper>

      <AddAmiModal open={open} closeModal={handleClose} />
    </Box>
  );
}
