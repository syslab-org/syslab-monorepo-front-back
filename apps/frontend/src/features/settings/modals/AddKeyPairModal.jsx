/* eslint-disable react/prop-types */
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 520,
  maxWidth: "92vw",
  bgcolor: "background.paper",
  border: "1px solid rgba(15,23,42,0.12)",
  borderRadius: 3,
  boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
  p: 4,
};

const EMPTY_FORM = {
  name: "",
  label: "",
  region: "us-east-1",
  scope: "personal",
  course_id: "",
  cloud_connection_id: "",
};

const AddKeyPairModal = ({
  open,
  closeModal,
  canCreateCourseShared = false,
  courses = [],
  cloudConnections = [],
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setError("");
    }
  }, [open]);

  const visibleConnections = useMemo(
    () =>
      (Array.isArray(cloudConnections) ? cloudConnections : []).filter((connection) =>
        form.scope === "course_shared"
          ? connection.scope === "course_shared"
          : connection.scope === "personal"
      ),
    [cloudConnections, form.scope]
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "scope" ? { course_id: "", cloud_connection_id: "" } : {}),
    }));
  };

  const handleSubmit = () => {
    const name = String(form.name || "").trim();
    if (!name) {
      setError("El nombre del key pair es obligatorio.");
      return;
    }
    if (form.scope === "course_shared" && !form.course_id) {
      setError("Debes elegir un curso para un key pair compartido.");
      return;
    }
    setError("");
    closeModal({
      name,
      label: String(form.label || "").trim(),
      region: String(form.region || "").trim(),
      scope: form.scope,
      course_id: form.scope === "course_shared" ? form.course_id || null : null,
      cloud_connection_id: form.cloud_connection_id || null,
    });
  };

  return (
    <Modal open={open} onClose={() => closeModal()}>
      <Box sx={style}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.1, opacity: 0.7 }}>
              AWS Key Pairs
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Registrar key pair
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Guardamos el nombre con el que AWS conoce la key pair para poder sugerirla luego en el canvas.
            </Typography>
          </Box>

          <Alert severity="info" variant="outlined">
            Este formulario <b>no sube ni almacena</b> el archivo privado <b>.pem</b>. Solo registra el nombre de la
            key pair que ya existe en AWS.
          </Alert>

          <Alert severity="warning" variant="outlined">
            Si luego quieres entrar por SSH, el <b>.pem</b> debe estar en el computador desde el que harás la conexión.
          </Alert>

          <Alert severity="info" variant="outlined">
            En AWS puedes crearla desde <b>EC2 → Key Pairs → Create key pair</b>, o importarla con <b>Import key pair</b> si ya tienes una public key.
          </Alert>

          <TextField
            label="Nombre en AWS"
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
            placeholder="p. ej., tesis-key-new"
            fullWidth
          />

          <TextField
            label="Etiqueta visible"
            value={form.label}
            onChange={(event) => handleChange("label", event.target.value)}
            placeholder="p. ej., Bastion del curso"
            fullWidth
          />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Región"
              value={form.region}
              onChange={(event) => handleChange("region", event.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="key-pair-scope-label">Scope</InputLabel>
              <Select
                labelId="key-pair-scope-label"
                value={form.scope}
                label="Scope"
                onChange={(event) => handleChange("scope", event.target.value)}
              >
                <MenuItem value="personal">Personal</MenuItem>
                {canCreateCourseShared && <MenuItem value="course_shared">Curso compartido</MenuItem>}
              </Select>
            </FormControl>
          </Stack>

          {form.scope === "course_shared" && (
            <FormControl fullWidth>
              <InputLabel id="key-pair-course-label">Curso</InputLabel>
              <Select
                labelId="key-pair-course-label"
                value={form.course_id}
                label="Curso"
                onChange={(event) => handleChange("course_id", event.target.value)}
              >
                {(Array.isArray(courses) ? courses : []).map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth>
            <InputLabel id="key-pair-connection-label">Conexión cloud opcional</InputLabel>
            <Select
              labelId="key-pair-connection-label"
              value={form.cloud_connection_id}
              label="Conexión cloud opcional"
              onChange={(event) => handleChange("cloud_connection_id", event.target.value)}
            >
              <MenuItem value="">
                <em>Sin vínculo explícito</em>
              </MenuItem>
              {visibleConnections.map((connection) => (
                <MenuItem key={connection.id} value={connection.id}>
                  {connection.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Vincularla a una conexión ayuda a entender en qué cuenta o curso debería existir.
            </FormHelperText>
          </FormControl>

          {error && <FormHelperText error>{error}</FormHelperText>}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={() => closeModal()}>Cancelar</Button>
            <Button variant="contained" onClick={handleSubmit}>
              Guardar key pair
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
};

export default AddKeyPairModal;
