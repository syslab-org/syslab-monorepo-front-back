import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  auth_type: "aws_static_keys",
  course_id: "",
  default_region: "us-east-1",
  aws_access_key_id: "",
  aws_secret_access_key: "",
  aws_role_arn: "",
  aws_external_id: "",
  is_active: true,
};

export default function CloudConnectionsPage() {
  const { t } = useTranslation();
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
      setError(e?.message || t("settings.cloudConnections.loadError"));
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
      auth_type: item.auth_type || "aws_static_keys",
      course_id: item.course?.id || "",
      default_region: item.default_region || "us-east-1",
      aws_access_key_id: "",
      aws_secret_access_key: "",
      aws_role_arn: item.aws_role_arn || "",
      aws_external_id: "",
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
        auth_type: form.auth_type,
        course_id: form.scope === "course_shared" ? form.course_id || null : null,
        default_region: form.default_region,
        is_active: !!form.is_active,
      };

      if (form.auth_type === "aws_static_keys") {
        if (!form.id || form.aws_access_key_id) {
          payload.aws_access_key_id = form.aws_access_key_id;
        }
        if (form.aws_secret_access_key) {
          payload.aws_secret_access_key = form.aws_secret_access_key;
        }
      } else {
        payload.aws_role_arn = form.aws_role_arn;
        if (!form.id || form.aws_external_id) {
          payload.aws_external_id = form.aws_external_id;
        }
      }

      if (form.id) {
        await api.updateCloudConnection(form.id, payload);
        setMessage(t("settings.cloudConnections.updated"));
      } else {
        await api.createCloudConnection({
          ...payload,
          aws_secret_access_key: form.auth_type === "aws_static_keys" ? form.aws_secret_access_key : "",
        });
        setMessage(t("settings.cloudConnections.created"));
      }

      handleClose();
      await load();
    } catch (e) {
      setError(e?.message || t("settings.cloudConnections.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(t("settings.cloudConnections.deleteConfirm", { name: item.name }))) return;
    setError("");
    setMessage("");
    try {
      await api.deleteCloudConnection(item.id);
      setMessage(t("settings.cloudConnections.deleted"));
      await load();
    } catch (e) {
      setError(e?.message || t("settings.cloudConnections.deleteError"));
    }
  };

  const handleTest = async (item) => {
    setError("");
    setMessage("");
    try {
      const result = await api.testCloudConnection(item.id);
      setMessage(
        result?.ok
          ? t("settings.cloudConnections.testOk", { message: result?.message })
          : t("settings.cloudConnections.testFail", { message: result?.message })
      );
      await load();
    } catch (e) {
      setError(e?.message || t("settings.cloudConnections.testError"));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t("settings.cloudConnections.title")}
        subtitle={t("settings.cloudConnections.subtitle")}
        actions={<Button variant="contained" onClick={handleOpenCreate}>{t("settings.cloudConnections.new")}</Button>}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {t("settings.cloudConnections.statusPrefix")}{" "}
          <b>{loading ? t("settings.cloudConnections.loading") : t("settings.cloudConnections.visibleCount", { count: items.length })}</b>
          . {t("settings.cloudConnections.statusHelp")}
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("settings.cloudConnections.columns.name")}</TableCell>
              <TableCell>{t("settings.cloudConnections.columns.scope")}</TableCell>
              <TableCell>{t("settings.cloudConnections.columns.auth")}</TableCell>
              <TableCell>{t("settings.cloudConnections.columns.course")}</TableCell>
              <TableCell>{t("settings.cloudConnections.columns.region")}</TableCell>
              <TableCell>{t("settings.cloudConnections.columns.target")}</TableCell>
              <TableCell>{t("settings.cloudConnections.columns.lastTest")}</TableCell>
              <TableCell align="right">{t("settings.cloudConnections.columns.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {String(item.provider || "aws").toUpperCase()} · {item.is_active ? t("settings.cloudConnections.active") : t("settings.cloudConnections.inactive")}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>{item.scope === "course_shared" ? t("settings.cloudConnections.scopeCourse") : t("settings.cloudConnections.scopePersonal")}</TableCell>
                <TableCell>{item.auth_type === "aws_assume_role" ? t("settings.cloudConnections.authAssumeRole") : t("settings.cloudConnections.authStaticKeys")}</TableCell>
                <TableCell>{item.course?.name || t("settings.cloudConnections.emptyValue")}</TableCell>
                <TableCell>{item.default_region || t("settings.cloudConnections.emptyValue")}</TableCell>
                <TableCell>{item.auth_type === "aws_assume_role" ? item.masked_role_arn || item.aws_role_arn || t("settings.cloudConnections.emptyValue") : item.masked_access_key_id || t("settings.cloudConnections.emptyValue")}</TableCell>
                <TableCell>{item.last_test_status || t("settings.cloudConnections.untested")}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {item.can_edit && <Button size="small" variant="outlined" onClick={() => handleTest(item)}>{t("settings.cloudConnections.test")}</Button>}
                    {item.can_edit && <Button size="small" variant="outlined" onClick={() => handleOpenEdit(item)}>{t("settings.cloudConnections.edit")}</Button>}
                    {item.can_edit && <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(item)}>{t("settings.cloudConnections.delete")}</Button>}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!items.length && !loading && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    {t("settings.cloudConnections.empty")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? t("settings.cloudConnections.editTitle") : t("settings.cloudConnections.createTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("settings.cloudConnections.fields.name")}
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="scope-label">{t("settings.cloudConnections.fields.scope")}</InputLabel>
              <Select
                labelId="scope-label"
                value={form.scope}
                label={t("settings.cloudConnections.fields.scope")}
                onChange={(e) => handleChange("scope", e.target.value)}
              >
                <MenuItem value="personal">{t("settings.cloudConnections.scopePersonal")}</MenuItem>
                {canCreateCourseShared && <MenuItem value="course_shared">{t("settings.cloudConnections.scopeCourseShared")}</MenuItem>}
              </Select>
              <FormHelperText>
                {form.scope === "course_shared"
                  ? t("settings.cloudConnections.scopeSharedHelp")
                  : t("settings.cloudConnections.scopePersonalHelp")}
              </FormHelperText>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="auth-type-label">{t("settings.cloudConnections.fields.authType")}</InputLabel>
              <Select
                labelId="auth-type-label"
                value={form.auth_type}
                label={t("settings.cloudConnections.fields.authType")}
                onChange={(e) => handleChange("auth_type", e.target.value)}
              >
                <MenuItem value="aws_static_keys">{t("settings.cloudConnections.authStaticKeys")}</MenuItem>
                <MenuItem value="aws_assume_role">{t("settings.cloudConnections.authAssumeRole")}</MenuItem>
              </Select>
              <FormHelperText>
                {form.auth_type === "aws_assume_role"
                  ? t("settings.cloudConnections.assumeRoleHelp")
                  : t("settings.cloudConnections.staticKeysHelp")}
              </FormHelperText>
            </FormControl>

            {form.scope === "course_shared" && (
              <FormControl fullWidth>
                <InputLabel id="course-label">{t("settings.cloudConnections.fields.course")}</InputLabel>
                <Select
                  labelId="course-label"
                  value={form.course_id}
                  label={t("settings.cloudConnections.fields.course")}
                  onChange={(e) => handleChange("course_id", e.target.value)}
                >
                  {visibleCourses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>{course.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label={t("settings.cloudConnections.fields.defaultRegion")}
              value={form.default_region}
              onChange={(e) => handleChange("default_region", e.target.value)}
              fullWidth
            />

            {form.auth_type === "aws_static_keys" ? (
              <>
                <TextField
                  label={t("settings.cloudConnections.fields.accessKeyId")}
                  value={form.aws_access_key_id}
                  onChange={(e) => handleChange("aws_access_key_id", e.target.value)}
                  fullWidth
                />

                <TextField
                  label={form.id ? t("settings.cloudConnections.fields.secretAccessKeyReplace") : t("settings.cloudConnections.fields.secretAccessKey")}
                  value={form.aws_secret_access_key}
                  onChange={(e) => handleChange("aws_secret_access_key", e.target.value)}
                  type="password"
                  fullWidth
                />
              </>
            ) : (
              <>
                <TextField
                  label={t("settings.cloudConnections.fields.roleArn")}
                  value={form.aws_role_arn}
                  onChange={(e) => handleChange("aws_role_arn", e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/syslab-course-role"
                  fullWidth
                />

                <TextField
                  label={form.id ? t("settings.cloudConnections.fields.externalIdReplace") : t("settings.cloudConnections.fields.externalId")}
                  value={form.aws_external_id}
                  onChange={(e) => handleChange("aws_external_id", e.target.value)}
                  fullWidth
                />
              </>
            )}

            <Stack direction="row" spacing={1} alignItems="center">
              <Switch checked={!!form.is_active} onChange={(e) => handleChange("is_active", e.target.checked)} />
              <Typography variant="body2">{t("settings.cloudConnections.fields.activeConnection")}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t("settings.cloudConnections.cancel")}</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? t("settings.cloudConnections.saving") : t("settings.cloudConnections.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
