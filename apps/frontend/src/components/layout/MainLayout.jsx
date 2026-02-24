// #apps/frontend/src/pages/Dashboard.jsx
import { Box, Button, Card, CardContent, Grid, Typography } from "@mui/material";
import { Link } from "react-router-dom";

function Dashboard() {
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
                0
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
                0
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
                Sin ejecuciones recientes
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
