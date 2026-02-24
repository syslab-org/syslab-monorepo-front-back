//#apps/frontend/src/pages/Dashboard.jsx
import { Box, Button, Card, CardContent, Grid, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

function Dashboard() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPlans() {
      try {
        const data = await api.listPlans();
        if (mounted) {
          setPlans(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error loading plans:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPlans();
    return () => {
      mounted = false;
    };
  }, []);

  // Ordenar por fecha más reciente
  const sortedPlans = [...plans].sort((a, b) => {
    const dateA = new Date(a?.updated_at || a?.created_at || 0).getTime();
    const dateB = new Date(b?.updated_at || b?.created_at || 0).getTime();
    return dateB - dateA;
  });

  const totalEjecuciones = sortedPlans.length;

  // Contar laboratorios de forma más robusta
  const totalLaboratorios = sortedPlans.reduce((acc, plan) => {
    // Algunos planes pueden guardar el JSON en payload directamente
    const payload = plan?.payload || plan;
    if (payload?.vpc || payload?.vpcs || payload?.network) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const ultimaActividad =
    sortedPlans.length > 0
      ? sortedPlans[0]?.updated_at ||
      sortedPlans[0]?.created_at ||
      "Actividad registrada"
      : "Sin ejecuciones recientes";

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Resumen general del entorno de laboratorios y ejecuciones.
          </Typography>
        </Box>

        <Button
          component={Link}
          to="/admin/vpcs"
          variant="contained"
          sx={{ textTransform: "none" }}
        >
          Crear laboratorio
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Laboratorios
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {loading ? "..." : totalLaboratorios}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Ejecuciones totales
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {loading ? "..." : totalEjecuciones}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Última actividad
              </Typography>
              <Typography variant="h6" fontWeight={500}>
                {loading ? "Cargando..." : ultimaActividad}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Access */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Accesos rápidos
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                cursor: "pointer",
                transition: "0.2s",
                "&:hover": { boxShadow: 6 },
              }}
              component={Link}
              to="/admin/vpcs"
              style={{ textDecoration: "none" }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={600}>
                  Administrar Laboratorios
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Crear, editar y gestionar VPCs guiadas o avanzadas.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                cursor: "pointer",
                transition: "0.2s",
                "&:hover": { boxShadow: 6 },
              }}
              component={Link}
              to="/admin/plans"
              style={{ textDecoration: "none" }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={600}>
                  Ver Ejecuciones
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Revisar simulaciones, despliegues y estados de infraestructura.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default Dashboard;
