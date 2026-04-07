import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "@/app/providers/AuthContext";
import { api } from "@/infrastructure/http/api";
import { PageHeader } from "@/shared/ui/layouts/MainLayout";
import { USER_ROL_STUDENT, USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from "@/shared/constants";

const EMPTY_FORM = {
  id: null,
  name: "",
  provider: "aws",
  scope: "personal",
  course_id: "",
  default_region: "us-east-1",
  aws_access_key_id: "",
  aws_secret_access_key: "",
  is_active: true,
};

export default function CloudConnectionsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const canCreateCourseShared = user?.role === USER_ROL_TEACHER || user?.role === USER_ROL_SUPER_ADMIN;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [connections, availableCourses] = await Promise.all([
        api.listCloudConnections({ provider: "aws" }),
        api.listCourses(),
      ]);
      setItems(Array.isArray(connections) ? connections : []);
      setCourses(Array.isArray(availableCourses) ? availableCourses : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las conexiones cloud.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleCourses = useMemo(() => {
    if (user?.role === USER_ROL_SUPER_ADMIN) return courses;
    if (user?.role === USER_ROL_TEACHER) return courses;
    return [];
  }, [courses, user]);

  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const handleOpenEdit = (item) => {
    setForm({
      id: item.id,
      name: item.name || "",
      provider: item.provider || "aws",
      scope: item.scope || "personal",
      course_id: item.course?.id || "",
      default_region: item.default_region || "us-east-1",
      aws_access_key_id: "",
      aws_secret_access_key: "",
      is_active: item.is_active !== false,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        name: form.name,
        provider: "aws",
        scope: form.scope,
        course_id: form.scope === "course_shared" ? form.course_id || null : null,
        default_region: form.default_region,
        is_active: !!form.is_active,
      };

      if (!form.id || form.aws_access_key_id) {
        payload.aws_access_key_id = form.aws_access_key_id;
      }

      if (form.aws_secret_access_key) {
        payload.aws_secret_access_key = form.aws_secret_access_key;
      }

      if (form.id) {
        await api.updateCloudConnection(form.id, payload);
        setMessage("Conexión cloud actualizada.");
      } else {
        await api.createCloudConnection({
          ...payload,
          auth_type: "aws_static_keys",
          aws_secret_access_key: form.aws_secret_access_key,
        });
        setMessage("Conexión cloud creada.");
      }

      handleClose();
      await load();
    } catch (e) {
      setError(e?.message || "No se pudo guardar la conexión.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Eliminar la conexión "${item.name}"?`)) return;
    setError("");
    setMessage("");
    try {
      await api.deleteCloudConnection(item.id);
      setMessage("Conexión eliminada.");
      await load();
    } catch (e) {
      setError(e?.message || "No se pudo eliminar la conexión.");
    }
  };

  const handleTest = async (item) => {
    setError("");
    setMessage("");
    try {
      const result = await api.testCloudConnection(item.id);
      setMessage(result?.ok ? `Conexión válida: ${result?.message}` : `La prueba falló: ${result?.message}`);
      await load();
    } catch (e) {
      setError(e?.message || "No se pudo probar la conexión.");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Conexiones Cloud"
        subtitle="Registra credenciales AWS personales o compartidas por curso. El deploy real se ejecutará desde el backend usando esta conexión, no desde el computador del usuario."
        actions={<Button variant="contained" onClick={handleOpenCreate}>Nueva conexión</Button>}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Estado actual:
          {" "}
          <b>{loading ? "cargando" : `${items.length} conexión(es) visible(s)`}</b>
          . Los estudiantes solo pueden crear conexiones personales; docentes y administradores también pueden registrar conexiones compartidas de curso.
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Curso</TableCell>
              <TableCell>Región</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Última prueba</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {String(item.provider || "aws").toUpperCase()} · {item.is_active ? "Activa" : "Inactiva"}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>{item.scope === "course_shared" ? "Curso" : "Personal"}</TableCell>
                <TableCell>{item.course?.name || "—"}</TableCell>
                <TableCell>{item.default_region || "—"}</TableCell>
                <TableCell>{item.masked_access_key_id || "—"}</TableCell>
                <TableCell>{item.last_test_status || "Sin probar"}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {item.can_edit && <Button size="small" variant="outlined" onClick={() => handleTest(item)}>Probar</Button>}
                    {item.can_edit && <Button size="small" variant="outlined" onClick={() => handleOpenEdit(item)}>Editar</Button>}
                    {item.can_edit && <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(item)}>Eliminar</Button>}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!items.length && !loading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    No hay conexiones cloud visibles todavía.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? "Editar conexión cloud" : "Nueva conexión cloud"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="scope-label">Scope</InputLabel>
              <Select
                labelId="scope-label"
                value={form.scope}
                label="Scope"
                onChange={(e) => handleChange("scope", e.target.value)}
              >
                <MenuItem value="personal">Personal</MenuItem>
                {canCreateCourseShared && <MenuItem value="course_shared">Curso compartido</MenuItem>}
              </Select>
              <FormHelperText>
                {form.scope === "course_shared"
                  ? "Úsala para laboratorios del curso y revisiones compartidas."
                  : "Solo la usarás en tus propios laboratorios."}
              </FormHelperText>
            </FormControl>

            {form.scope === "course_shared" && (
              <FormControl fullWidth>
                <InputLabel id="course-label">Curso</InputLabel>
                <Select
                  labelId="course-label"
                  value={form.course_id}
                  label="Curso"
                  onChange={(e) => handleChange("course_id", e.target.value)}
                >
                  {visibleCourses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>{course.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Región por defecto"
              value={form.default_region}
              onChange={(e) => handleChange("default_region", e.target.value)}
              fullWidth
            />

            <TextField
              label="AWS Access Key ID"
              value={form.aws_access_key_id}
              onChange={(e) => handleChange("aws_access_key_id", e.target.value)}
              fullWidth
            />

            <TextField
              label={form.id ? "AWS Secret Access Key (solo si quieres reemplazarla)" : "AWS Secret Access Key"}
              value={form.aws_secret_access_key}
              onChange={(e) => handleChange("aws_secret_access_key", e.target.value)}
              type="password"
              fullWidth
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <Switch checked={!!form.is_active} onChange={(e) => handleChange("is_active", e.target.checked)} />
              <Typography variant="body2">Conexión activa</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
