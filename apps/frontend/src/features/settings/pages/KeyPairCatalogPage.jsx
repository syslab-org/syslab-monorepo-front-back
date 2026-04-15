import { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useAuth } from "@/app/providers/AuthContext";
import AddKeyPairModal from "@/features/settings/modals/AddKeyPairModal";
import { api } from "@/infrastructure/http/api";
import { PageHeader } from "@/shared/ui/layouts/MainLayout";
import { USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from "@/shared/constants";

const KeyPairList = ({ items, onDelete }) => (
  <List dense sx={{ mt: 1 }}>
    {items.length > 0 ? (
      items.map((entry) => (
        <ListItem
          key={entry.id}
          secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => onDelete(entry.id)}>
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
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontWeight: 700 }}>{entry.label || entry.name}</Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={entry.scope === "course_shared" ? "Curso" : "Personal"}
                />
                {entry.region && <Chip size="small" variant="outlined" label={entry.region} />}
              </Stack>
            }
            secondary={
              <Stack spacing={0.4} sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Nombre AWS: {entry.name}
                </Typography>
                {entry.cloud_connection?.name && (
                  <Typography variant="body2" color="text.secondary">
                    Conexión cloud: {entry.cloud_connection.name}
                  </Typography>
                )}
                {entry.course?.name && (
                  <Typography variant="body2" color="text.secondary">
                    Curso: {entry.course.name}
                  </Typography>
                )}
                {!entry.course?.name && entry.owner_user?.display_name && (
                  <Typography variant="body2" color="text.secondary">
                    Owner: {entry.owner_user.display_name}
                  </Typography>
                )}
              </Stack>
            }
            secondaryTypographyProps={{ component: "div" }}
          />
        </ListItem>
      ))
    ) : (
      <ListItem>
        <ListItemText primary="No hay key pairs registradas." />
      </ListItem>
    )}
  </List>
);

export default function KeyPairCatalogPage() {
  const [keyPairList, setKeyPairList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [cloudConnections, setCloudConnections] = useState([]);
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { setLoadingFlow } = useContext(LoadingFlowContext);
  const { user } = useAuth();

  const canCreateCourseShared = user?.role === USER_ROL_TEACHER || user?.role === USER_ROL_SUPER_ADMIN;

  const fetchKeyPairs = async () => {
    setLoadingFlow(true);
    setError("");
    try {
      const [keyPairs, availableCourses, visibleConnections] = await Promise.all([
        api.listKeyPairs({ provider: "aws" }),
        api.listCourses(),
        api.listCloudConnections({ provider: "aws" }),
      ]);
      setKeyPairList(Array.isArray(keyPairs) ? keyPairs : []);
      setCourses(Array.isArray(availableCourses) ? availableCourses : []);
      setCloudConnections(Array.isArray(visibleConnections) ? visibleConnections : []);
    } catch (loadError) {
      setError(loadError?.message || "No se pudieron cargar las key pairs.");
    } finally {
      setLoadingFlow(false);
    }
  };

  useEffect(() => {
    fetchKeyPairs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleCourses = useMemo(() => {
    if (user?.role === USER_ROL_SUPER_ADMIN || user?.role === USER_ROL_TEACHER) {
      return courses;
    }
    return [];
  }, [courses, user]);

  const handleClose = async (newKeyPairData) => {
    setOpen(false);
    if (!newKeyPairData) return;

    setLoadingFlow(true);
    setError("");
    try {
      await api.createKeyPair({
        ...newKeyPairData,
        provider: "aws",
      });
      setMessage("Key pair registrada.");
      await fetchKeyPairs();
    } catch (saveError) {
      setError(saveError?.message || "No se pudo registrar la key pair.");
    } finally {
      setLoadingFlow(false);
    }
  };

  const handleDelete = async (keyPairId) => {
    setLoadingFlow(true);
    setError("");
    try {
      await api.deleteKeyPair(keyPairId);
      setMessage("Key pair eliminada.");
      await fetchKeyPairs();
    } catch (deleteError) {
      setError(deleteError?.message || "No se pudo eliminar la key pair.");
    } finally {
      setLoadingFlow(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Catálogo de Key Pairs"
        subtitle="Registra key pairs personales o compartidas por curso para sugerirlas luego en el canvas y reducir errores de tipeo en ssh_access."
        actions={
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Button variant="outlined" onClick={() => setInfoOpen(true)}>
              Cómo crearla en AWS
            </Button>
            <Button variant="contained" onClick={() => setOpen(true)}>
              Nueva key pair
            </Button>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        Aquí registramos solo el <b>nombre de la key pair en AWS</b>. La plataforma no guarda el archivo privado
        <b> .pem</b> ni lo distribuye entre computadores.
      </Alert>

      <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
        Para hacer <b>deploy</b> basta con que la key pair exista en la cuenta y región correctas. Para entrar luego
        por <b>SSH</b>, el usuario debe tener el <b>.pem</b> correspondiente en el computador desde el que va a conectarse.
      </Alert>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Las key pairs son dependientes de la cuenta y la región AWS. Este catálogo no crea la key en AWS, pero sí ayuda a declararla con contexto y a reutilizarla correctamente desde el canvas.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Key pairs registradas</Typography>
          <Chip size="small" label={`${keyPairList.length}`} />
        </Stack>
        <KeyPairList items={keyPairList} onDelete={handleDelete} />
      </Paper>

      <AddKeyPairModal
        open={open}
        closeModal={handleClose}
        canCreateCourseShared={canCreateCourseShared}
        courses={visibleCourses}
        cloudConnections={cloudConnections}
      />

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Cómo crear una key pair en AWS
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.1}>
            <Typography variant="body2" color="text.secondary">
              1. Entra a la cuenta AWS y abre <b>EC2</b> en la región donde vas a desplegar.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              2. Ve a <b>Network &amp; Security → Key Pairs</b>.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              3. Elige <b>Create key pair</b> si quieres que AWS genere una nueva, o <b>Import key pair</b> si ya tienes una public key.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              4. Guarda el archivo <b>.pem</b> descargado en un lugar seguro; AWS no vuelve a mostrar la private key después.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              5. Registra aquí el <b>mismo nombre exacto</b> con el que quedó creada en AWS.
            </Typography>
            <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
              La plataforma usa el nombre de la key pair para el deploy. El archivo <b>.pem</b> sigue quedando fuera del sistema y lo necesitarás solo para conectarte por SSH.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
