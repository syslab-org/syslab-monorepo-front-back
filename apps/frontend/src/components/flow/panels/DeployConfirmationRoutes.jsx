// apps/frontend/src/components/flow/panels/DeployConfirmationRoutes.jsx
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LanIcon from "@mui/icons-material/Lan";
import PublicIcon from "@mui/icons-material/Public";
import RouteIcon from "@mui/icons-material/Route";
import { Accordion, AccordionDetails, AccordionSummary, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

/**
 * Reutiliza los mismos chips visuales del Preview de rutas
 */
const routeChip = (target) => {
  switch (target) {
    case "local":
      return (
        <Chip
          icon={<LanIcon />}
          label="local"
          color="success"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
    case "igw":
      return (
        <Chip
          icon={<PublicIcon />}
          label="Internet Gateway"
          color="info"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
    case "nat-gw":
      return (
        <Chip
          icon={<CloudUploadIcon />}
          label="NAT Gateway"
          color="warning"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
    case "peering":
      return (
        <Chip
          icon={<RouteIcon />}
          label="Peering"
          color="secondary"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
    default:
      return (
        <Chip
          label={target || "unknown"}
          color="default"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
  }
};

/**
 * Muestra tablas de rutas para cada VPC antes del deploy
 */
export default function DeployConfirmationRoutes({ vpcs = [] }) {
  if (!vpcs.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hay VPCs para mostrar rutas.
      </Typography>
    );
  }

  return (
    <Stack gap={1.5} sx={{ mt: 2 }}>
      {vpcs.map((vpc) => (
        <Accordion key={vpc.id} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="subtitle1">{vpc.name}</Typography>
              <Chip size="small" label={vpc.region || "region n/a"} />
              <Chip size="small" label={vpc.cidr || "CIDR n/a"} variant="outlined" />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Tabla de rutas: <b>main</b>
            </Typography>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Destino (CIDR)</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>via_router_id</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(vpc.route_tables?.[0]?.routes || []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Typography variant="body2">{r.dest_cidr}</Typography>
                    </TableCell>
                    <TableCell>{routeChip(r.target)}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: r.via_router_id ? "text.primary" : "text.disabled" }}
                      >
                        {r.via_router_id || "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {(!vpc.route_tables?.length || !vpc.route_tables[0]?.routes?.length) && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary">
                        Sin rutas definidas.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
