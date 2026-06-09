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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      setError(t("settings.keyPairModal.nameRequired"));
      return;
    }
    if (form.scope === "course_shared" && !form.course_id) {
      setError(t("settings.keyPairModal.courseRequired"));
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
              {t("settings.keyPairModal.overline")}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t("settings.keyPairModal.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("settings.keyPairModal.subtitle")}
            </Typography>
          </Box>

          <Alert severity="info" variant="outlined">
            {t("settings.keyPairModal.infoBanner")}
          </Alert>

          <Alert severity="warning" variant="outlined">
            {t("settings.keyPairModal.warningBanner")}
          </Alert>

          <Alert severity="info" variant="outlined">
            {t("settings.keyPairModal.awsHint")}
          </Alert>

          <TextField
            label={t("settings.keyPairModal.fields.awsName")}
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
            placeholder={t("settings.keyPairModal.fields.awsNamePlaceholder")}
            fullWidth
          />

          <TextField
            label={t("settings.keyPairModal.fields.label")}
            value={form.label}
            onChange={(event) => handleChange("label", event.target.value)}
            placeholder={t("settings.keyPairModal.fields.labelPlaceholder")}
            fullWidth
          />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label={t("settings.keyPairModal.fields.region")}
              value={form.region}
              onChange={(event) => handleChange("region", event.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="key-pair-scope-label">{t("settings.keyPairModal.fields.scope")}</InputLabel>
              <Select
                labelId="key-pair-scope-label"
                value={form.scope}
                label={t("settings.keyPairModal.fields.scope")}
                onChange={(event) => handleChange("scope", event.target.value)}
              >
                <MenuItem value="personal">{t("settings.keyPairs.scopePersonal")}</MenuItem>
                {canCreateCourseShared && <MenuItem value="course_shared">{t("settings.keyPairs.scopeCourseShared")}</MenuItem>}
              </Select>
            </FormControl>
          </Stack>

          {form.scope === "course_shared" && (
            <FormControl fullWidth>
              <InputLabel id="key-pair-course-label">{t("settings.keyPairModal.fields.course")}</InputLabel>
              <Select
                labelId="key-pair-course-label"
                value={form.course_id}
                label={t("settings.keyPairModal.fields.course")}
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
            <InputLabel id="key-pair-connection-label">{t("settings.keyPairModal.fields.connection")}</InputLabel>
            <Select
              labelId="key-pair-connection-label"
              value={form.cloud_connection_id}
              label={t("settings.keyPairModal.fields.connection")}
              onChange={(event) => handleChange("cloud_connection_id", event.target.value)}
            >
              <MenuItem value="">
                <em>{t("settings.keyPairModal.noExplicitLink")}</em>
              </MenuItem>
              {visibleConnections.map((connection) => (
                <MenuItem key={connection.id} value={connection.id}>
                  {connection.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {t("settings.keyPairModal.connectionHelp")}
            </FormHelperText>
          </FormControl>

          {error && <FormHelperText error>{error}</FormHelperText>}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={() => closeModal()}>{t("settings.keyPairModal.cancel")}</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {t("settings.keyPairModal.save")}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
};

export default AddKeyPairModal;
