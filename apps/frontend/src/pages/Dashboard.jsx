//#apps/frontend/src/pages/Dashboard.jsx
import { Box, Button, Card, CardContent, Grid, Typography, Stack } from "@mui/material";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import HistoryIcon from "@mui/icons-material/History";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { DB_FIRESTORE_VPCS, USER_ROL_STUDENT } from "../constants";
import { useAuth } from "../contexts/AuthContext";

function Dashboard() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalLaboratorios, setTotalLaboratorios] = useState(0);
  const { user } = useAuth();


  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        // =========================
        // 1️⃣ Cargar planes (backend)
        // =========================
        const plansData = await api.listPlans();

        if (mounted) {
          setPlans(Array.isArray(plansData) ? plansData : []);
        }

        // =========================
        // 2️⃣ Cargar VPCs (Firestore)
        // =========================
        if (user?.role) {
          let vpcCount = 0;

          if (user.role === USER_ROL_STUDENT) {
            const q = query(
              collection(db, DB_FIRESTORE_VPCS),
              where("userId", "==", user.userId)
            );
            const snapshot = await getDocs(q);
            vpcCount = snapshot.size;
          } else {
            const snapshot = await getDocs(
              collection(db, DB_FIRESTORE_VPCS)
            );
            vpcCount = snapshot.size;
          }

          if (mounted) {
            setTotalLaboratorios(vpcCount);
          }
        }

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Ordenar por fecha más reciente
  const sortedPlans = [...plans].sort((a, b) => {
    const dateA = new Date(a?.updated_at || a?.created_at || 0).getTime();
    const dateB = new Date(b?.updated_at || b?.created_at || 0).getTime();
    return dateB - dateA;
  });

  const totalEjecuciones = sortedPlans.length;



  const ultimaActividad =
    sortedPlans.length > 0
      ? sortedPlans[0]?.updated_at ||
      sortedPlans[0]?.created_at ||
      "Actividad registrada"
      : "Sin ejecuciones recientes";

  const formattedUltimaActividad =
    ultimaActividad && ultimaActividad !== "Sin ejecuciones recientes"
      ? new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(ultimaActividad))
      : ultimaActividad;

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
          <Card
            className="pt-panel"
            component={Link}
            to="/admin/vpcs"
            sx={{
              cursor: "pointer",
              display: "block",
              color: "inherit",
              textDecoration: "none",
              transition: "all .2s ease",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: (theme) =>
                  theme.palette.mode === "light"
                    ? "0 8px 24px rgba(0,0,0,.08)"
                    : "0 14px 32px rgba(0,0,0,.55)",
              },
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Laboratorios
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {loading ? "..." : totalLaboratorios}
                  </Typography>
                </Box>
                <CloudQueueIcon color="primary" sx={{ fontSize: 36 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            className="pt-panel"
            component={Link}
            to="/admin/plans"
            sx={{
              cursor: "pointer",
              display: "block",
              color: "inherit",
              textDecoration: "none",
              transition: "all .2s ease",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: (theme) =>
                  theme.palette.mode === "light"
                    ? "0 8px 24px rgba(0,0,0,.08)"
                    : "0 14px 32px rgba(0,0,0,.55)",
              },
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ejecuciones
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {loading ? "..." : totalEjecuciones}
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
                    Última actividad
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {loading ? "Cargando..." : formattedUltimaActividad}
                  </Typography>
                </Box>
                <HistoryIcon color="success" sx={{ fontSize: 36 }} />
              </Stack>
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
              className="pt-panel"
              component={Link}
              to="/admin/vpcs"
              sx={{
                cursor: "pointer",
                display: "block",
                color: "inherit",
                textDecoration: "none",
                textDecoration: "none",
                transition: "all .2s ease",
                borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: (theme) =>
                    theme.palette.mode === "light"
                      ? "0 8px 24px rgba(0,0,0,.08)"
                      : "0 14px 32px rgba(0,0,0,.55)",
                  borderLeftWidth: "6px",
                },
                "&:active": {
                  transform: "translateY(0px)",
                }
              }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <CloudQueueIcon
                    sx={{
                      fontSize: 42,
                      color: (theme) => theme.palette.primary.main,
                    }}
                  />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Administrar Laboratorios
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Crear, editar y gestionar VPCs guiadas o avanzadas.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              className="pt-panel"
              component={Link}
              to="/admin/plans"
              sx={{
                cursor: "pointer",
                display: "block",
                color: "inherit",
                textDecoration: "none",
                textDecoration: "none",
                transition: "all .2s ease",
                borderLeft: (theme) => `4px solid ${theme.palette.secondary.main}`,
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: (theme) =>
                    theme.palette.mode === "light"
                      ? "0 8px 24px rgba(0,0,0,.08)"
                      : "0 14px 32px rgba(0,0,0,.55)",
                  borderLeftWidth: "6px",
                },
                "&:active": {
                  transform: "translateY(0px)",
                }
              }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <PlayCircleOutlineIcon
                    sx={{
                      fontSize: 42,
                      color: (theme) => theme.palette.secondary.main,
                    }}
                  />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Ver Ejecuciones
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Revisar simulaciones, despliegues y estados de infraestructura.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default Dashboard;
