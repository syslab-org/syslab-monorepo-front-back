import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

const KeyPairList = ({ items, onDelete, t }) => (
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
                    label={entry.scope === "course_shared" ? t("settings.keyPairs.scopeCourseShared") : t("settings.keyPairs.scopePersonal")}
                  />
                  {entry.region && <Chip size="small" variant="outlined" label={entry.region} />}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {t("settings.keyPairs.awsNamePrefix")} <b>{entry.name}</b>
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {entry.cloud_connection?.name && (
                    <Chip
                      size="small"
                      icon={<CloudOutlined />}
                      label={t("settings.keyPairs.connectionChip", { value: entry.cloud_connection.name })}
                      variant="outlined"
                    />
                  )}
                  {entry.course?.name && (
                    <Chip
                      size="small"
                      icon={<SchoolOutlined />}
                      label={t("settings.keyPairs.courseChip", { value: entry.course.name })}
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                  {!entry.course?.name && entry.owner_user?.display_name && (
                    <Chip
                      size="small"
                      icon={<PersonOutlineRounded />}
                      label={t("settings.keyPairs.ownerChip", { value: entry.owner_user.display_name })}
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
                    ? t("settings.keyPairs.scopeCourseHelp")
                    : t("settings.keyPairs.scopePersonalHelp")}
                </Typography>
              </Box>
            }
            secondaryTypographyProps={{ component: "div" }}
          />
        </ListItem>
      ))
    ) : (
      <ListItem>
        <ListItemText primary={t("settings.keyPairs.empty")} />
      </ListItem>
    )}
  </List>
);

const KeyPairLegend = ({ t }) => (
  <Stack
    direction={{ xs: "column", md: "row" }}
    spacing={1}
    useFlexGap
    sx={{ mt: 1.5, mb: 0.25 }}
  >
    <Chip size="small" color="primary" variant="outlined" label={t("settings.keyPairs.legend.personal")} />
    <Chip size="small" color="secondary" variant="filled" label={t("settings.keyPairs.legend.courseShared")} />
    <Chip size="small" variant="outlined" icon={<CloudOutlined />} label={t("settings.keyPairs.legend.connection")} />
  </Stack>
);

export default function KeyPairCatalogPage() {
  const { t } = useTranslation();
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
      setError(loadError?.message || t("settings.keyPairs.loadError"));
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
      setMessage(t("settings.keyPairs.created"));
      await fetchKeyPairs();
    } catch (saveError) {
      setError(saveError?.message || t("settings.keyPairs.createError"));
    } finally {
      setLoadingFlow(false);
    }
  };

  const handleDelete = async (keyPairId) => {
    setLoadingFlow(true);
    setError("");
    try {
      await api.deleteKeyPair(keyPairId);
      setMessage(t("settings.keyPairs.deleted"));
      await fetchKeyPairs();
    } catch (deleteError) {
      setError(deleteError?.message || t("settings.keyPairs.deleteError"));
    } finally {
      setLoadingFlow(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t("settings.keyPairs.title")}
        subtitle={t("settings.keyPairs.subtitle")}
        actions={
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Button variant="outlined" onClick={() => setInfoOpen(true)}>
              {t("settings.keyPairs.howToCreate")}
            </Button>
            <Button variant="contained" onClick={() => setOpen(true)}>
              {t("settings.keyPairs.new")}
            </Button>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        {t("settings.keyPairs.infoBanner")}
      </Alert>

      <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
        {t("settings.keyPairs.warningBanner")}
      </Alert>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {t("settings.keyPairs.info")}
        </Typography>
        <KeyPairLegend t={t} />
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{t("settings.keyPairs.registered")}</Typography>
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
            label={t("settings.keyPairs.search")}
            placeholder={t("settings.keyPairs.searchPlaceholder")}
            fullWidth
          />
          <FormControl sx={{ minWidth: { xs: "100%", md: 180 } }}>
            <InputLabel id="keypair-scope-filter-label">{t("settings.keyPairs.scope")}</InputLabel>
            <Select
              labelId="keypair-scope-filter-label"
              label={t("settings.keyPairs.scope")}
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value)}
            >
              <MenuItem value="all">{t("settings.keyPairs.all")}</MenuItem>
              <MenuItem value="personal">{t("settings.keyPairs.scopePersonal")}</MenuItem>
              <MenuItem value="course_shared">{t("settings.keyPairs.scopeCourseShared")}</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: "100%", md: 180 } }}>
            <InputLabel id="keypair-region-filter-label">{t("settings.keyPairs.region")}</InputLabel>
            <Select
              labelId="keypair-region-filter-label"
              label={t("settings.keyPairs.region")}
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
            >
              <MenuItem value="all">{t("settings.keyPairs.allRegions")}</MenuItem>
              {regionOptions.map((region) => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <KeyPairList items={filteredKeyPairs} onDelete={handleDelete} t={t} />
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
          {t("settings.keyPairs.awsGuide.title")}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.1}>
            <Typography variant="body2" color="text.secondary">
              {t("settings.keyPairs.awsGuide.step1")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("settings.keyPairs.awsGuide.step2")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("settings.keyPairs.awsGuide.step3")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("settings.keyPairs.awsGuide.step4")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("settings.keyPairs.awsGuide.step5")}
            </Typography>
            <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
              {t("settings.keyPairs.awsGuide.alert")}
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
            {t("settings.keyPairs.awsGuide.docs")}
          </Button>
          <Button onClick={() => setInfoOpen(false)}>{t("settings.keyPairs.close")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
