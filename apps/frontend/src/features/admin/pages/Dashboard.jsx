import { Box, Button, Card, CardContent, Grid, Typography, Stack } from "@mui/material";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import HistoryIcon from "@mui/icons-material/History";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/infrastructure/http/api";
import { LoadingFlowContext } from "@/app/providers/LoadingFlowContext";
import { PageHeader } from '@/shared/ui/layouts/MainLayout';

function Dashboard() {
  const { t, i18n } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalLaboratorios, setTotalLaboratorios] = useState(0);
  const { showLoading, hideLoading } = useContext(LoadingFlowContext);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        showLoading(t("admin.dashboard.loading"));
        const [plansData, labsData] = await Promise.all([
          api.listPlans(),
          api.listLabs(),
        ]);

        if (mounted) {
          setPlans(Array.isArray(plansData) ? plansData : []);
          setTotalLaboratorios(Array.isArray(labsData) ? labsData.length : 0);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        if (mounted) setLoading(false);
        hideLoading();
      }
    }

    loadData();

    return () => {
      mounted = false;
      hideLoading();
    };
  }, [showLoading, hideLoading]);

  const sortedPlans = [...plans].sort((a, b) => {
    const dateA = new Date(a?.updated_at || a?.created_at || 0).getTime();
    const dateB = new Date(b?.updated_at || b?.created_at || 0).getTime();
    return dateB - dateA;
  });

  const totalEjecuciones = sortedPlans.length;
  const ultimaActividad =
    sortedPlans.length > 0
      ? sortedPlans[0]?.updated_at || sortedPlans[0]?.created_at || t("admin.dashboard.activityRecorded")
      : t("admin.dashboard.noRecentExecutions");

  const formattedUltimaActividad =
    ultimaActividad && ultimaActividad !== t("admin.dashboard.noRecentExecutions")
      ? new Intl.DateTimeFormat(i18n.resolvedLanguage === "es" ? "es-CL" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(ultimaActividad))
      : ultimaActividad;

  return (
    <Box>
      <PageHeader
        title={t("admin.dashboard.title")}
        subtitle={t("admin.dashboard.subtitle")}
        actions={
          <Button component={Link} to="/admin/labs" variant="contained">
            {t("admin.dashboard.createLab")}
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card className="pt-panel" component={Link} to="/admin/labs" sx={{ cursor: "pointer", display: "block", color: "inherit", textDecoration: "none" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t("admin.dashboard.cards.labs")}
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {loading ? t("admin.dashboard.loadingValue") : totalLaboratorios}
                  </Typography>
                </Box>
                <CloudQueueIcon color="primary" sx={{ fontSize: 36 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className="pt-panel" component={Link} to="/admin/plans" sx={{ cursor: "pointer", display: "block", color: "inherit", textDecoration: "none" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t("admin.dashboard.cards.executions")}
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {loading ? t("admin.dashboard.loadingValue") : totalEjecuciones}
                  </Typography>
                </Box>
                <PlayCircleOutlineIcon color="secondary" sx={{ fontSize: 36 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className="pt-panel">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t("admin.dashboard.cards.lastActivity")}
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {loading ? t("admin.dashboard.loading") : formattedUltimaActividad}
                  </Typography>
                </Box>
                <HistoryIcon color="success" sx={{ fontSize: 36, opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
