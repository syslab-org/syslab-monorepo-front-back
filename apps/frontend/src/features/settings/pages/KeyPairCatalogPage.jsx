import { useContext, useEffect, useMemo, useState } from "react";
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
  IconButton,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CloudOutlined,
  DeleteOutlineOutlined,
  KeyOutlined,
  PersonOutlineRounded,
  SchoolOutlined,
} from "@mui/icons-material";

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
            borderRadius: 3,
            mb: 1.2,
            alignItems: "flex-start",
            px: 2,
            py: 1.6,
            background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.96) 100%)",
          }}
        >
          <ListItemText
            primary={
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <KeyOutlined sx={{ fontSize: 18, color: "primary.main" }} />
                    <Typography sx={{ fontWeight: 800 }}>{entry.label || entry.name}</Typography>
                  </Stack>
                  <Chip
                    size="small"
                    color={entry.scope === "course_shared" ? "secondary" : "primary"}
                    variant={entry.scope === "course_shared" ? "filled" : "outlined"}
                    label={entry.scope === "course_shared" ? "Curso compartido" : "Personal"}
                  />
                  {entry.region && <Chip size="small" variant="outlined" label={entry.region} />}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  Nombre AWS: <b>{entry.name}</b>
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {entry.cloud_connection?.name && (
                    <Chip
                      size="small"
                      icon={<CloudOutlined />}
                      label={`Conexión: ${entry.cloud_connection.name}`}
                      variant="outlined"
                    />
                  )}
                  {entry.course?.name && (
                    <Chip
                      size="small"
                      icon={<SchoolOutlined />}
                      label={`Curso: ${entry.course.name}`}
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                  {!entry.course?.name && entry.owner_user?.display_name && (
                    <Chip
                      size="small"
                      icon={<PersonOutlineRounded />}
                      label={`Owner: ${entry.owner_user.display_name}`}
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Stack>
            }
            secondary={
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  {entry.scope === "course_shared"
                    ? "Pensada para laboratorios que despliegan sobre la cuenta compartida del curso."
                    : "Pensada para laboratorios que despliegan sobre la cuenta personal del usuario."}
                </Typography>
              </Box>
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

const KeyPairLegend = () => (
  <Stack
    direction={{ xs: "column", md: "row" }}
    spacing={1}
    useFlexGap
    sx={{ mt: 1.5, mb: 0.25 }}
  >
    <Chip size="small" color="primary" variant="outlined" label="Personal: cuenta individual" />
    <Chip size="small" color="secondary" variant="filled" label="Curso compartido: cuenta del curso" />
    <Chip size="small" variant="outlined" icon={<CloudOutlined />} label="Conexión cloud vinculada" />
  </Stack>
);

export default function KeyPairCatalogPage() {
  const [keyPairList, setKeyPairList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [cloudConnections, setCloudConnections] = useState([]);
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
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

  const regionOptions = useMemo(() => {
    const regions = Array.from(
      new Set(
        keyPairList
          .map((entry) => String(entry?.region || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
    return regions;
  }, [keyPairList]);

  const filteredKeyPairs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return keyPairList.filter((entry) => {
      const matchesScope = scopeFilter === "all" || entry.scope === scopeFilter;
      const matchesRegion = regionFilter === "all" || entry.region === regionFilter;
      const haystack = [
        entry.label,
        entry.name,
        entry.region,
        entry.cloud_connection?.name,
        entry.course?.name,
        entry.owner_user?.display_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      return matchesScope && matchesRegion && matchesSearch;
    });
  }, [keyPairList, searchTerm, scopeFilter, regionFilter]);

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
        <KeyPairLegend />
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Key pairs registradas</Typography>
          <Chip size="small" label={`${filteredKeyPairs.length}/${keyPairList.length}`} />
        </Stack>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.25}
          useFlexGap
          sx={{ mb: 1.5 }}
        >
          <TextField
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            label="Buscar"
            placeholder="Nombre, conexión, curso u owner"
            fullWidth
          />
          <FormControl sx={{ minWidth: { xs: "100%", md: 180 } }}>
            <InputLabel id="keypair-scope-filter-label">Scope</InputLabel>
            <Select
              labelId="keypair-scope-filter-label"
              label="Scope"
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="personal">Personal</MenuItem>
              <MenuItem value="course_shared">Curso compartido</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: "100%", md: 180 } }}>
            <InputLabel id="keypair-region-filter-label">Región</InputLabel>
            <Select
              labelId="keypair-region-filter-label"
              label="Región"
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
            >
              <MenuItem value="all">Todas</MenuItem>
              {regionOptions.map((region) => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <KeyPairList items={filteredKeyPairs} onDelete={handleDelete} />
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
          <Button
            component="a"
            href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html"
            target="_blank"
            rel="noreferrer"
          >
            Ver documentación AWS
          </Button>
          <Button onClick={() => setInfoOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
