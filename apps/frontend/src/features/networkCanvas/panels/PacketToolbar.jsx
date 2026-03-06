// apps/frontend/src/components/flow/PacketToolbar.jsx
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveIcon from '@mui/icons-material/Save';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { Alert, Box, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { useThemeMode } from '@/shared/ui/theme/AppThemeProvider';


export default function PacketToolbar({
  onSave,
  onRestore,
  onRestoreInitial,
  onDeploy,
  onZoomIn,
  onZoomOut,
  onFitView,
  title = 'Logical Topology',
  onPreviewRoutes,
  planStatus = null, // { status, last_action, simulate_only, updated_at }
  canvasState = "NO_PLAN",
  validationState = "IDLE",
}) {
  const { mode, toggle } = useThemeMode();

  const PLAN_STATES = {
    IDLE: "IDLE",
    SYNCING: "SYNCING",
    PLANNING: "PLANNING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
  };

  const normalizedValidation = String(validationState || "").toUpperCase();

  const renderPlanChip = () => {
    if (!normalizedValidation || normalizedValidation === PLAN_STATES.IDLE) {
      return null;
    }

    if (normalizedValidation === PLAN_STATES.SUCCESS) {
      return (
        <Chip
          size="small"
          variant="outlined"
          label="VALIDATED"
          color="success"
        />
      );
    }

    if (
      normalizedValidation === PLAN_STATES.SYNCING ||
      normalizedValidation === PLAN_STATES.PLANNING
    ) {
      return (
        <Chip
          size="small"
          variant="outlined"
          label="VALIDATING..."
          color="info"
        />
      );
    }

    if (normalizedValidation === PLAN_STATES.ERROR) {
      return (
        <Chip
          size="small"
          variant="outlined"
          label="ERROR"
          color="error"
        />
      );
    }

    return null;
  };

  return (
    <div
      className="pt-panel"
      style={{
        padding: 6,
        margin: 0,
        width: '100%',
        position: 'relative',
        zIndex: 60,
      }}
    >
      <div className="pt-toolbar">
        {/* Izquierda: título */}
        <div className="pt-toolbar__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{title}</span>
          <>
            {renderPlanChip()}
            {canvasState === "PLAN_OUTDATED" && (
              <Chip
                size="small"
                variant="outlined"
                label="OUTDATED"
                color="warning"
              />
            )}
          </>
        </div>

        {/* Controles de vista */}
        <div className="pt-toolbar__group">
          <Tooltip title="Acercar"><IconButton size="small" className="pt-ibtn" onClick={onZoomIn}><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Alejar"><IconButton size="small" className="pt-ibtn" onClick={onZoomOut}><ZoomOutIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Ajustar vista"><IconButton size="small" className="pt-ibtn" onClick={onFitView}><CenterFocusStrongIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            <IconButton size="small" className="pt-ibtn" onClick={toggle}>
              {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </div>

        {/* Spacer que empuja todo lo siguiente a la derecha */}
        <div className="pt-toolbar__spacer" />

        {/* Botones de acción */}
        <div className="pt-toolbar__group">
          <Tooltip title="Guardar estado actual del canvas en Firestore">
            <span>
              <Button
                variant="outlined"
                className="pt-btn"
                startIcon={<SaveIcon />}
                onClick={onSave}
                size="small"
                disabled={canvasState === "PLAN_RUNNING"}
              >
                Guardar
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Restaurar última versión guardada desde Firestore">
            <span>
              <Button
                variant="outlined"
                className="pt-btn"
                startIcon={<RestoreIcon />}
                onClick={onRestore}
                size="small"
                disabled={canvasState === "PLAN_RUNNING"}
              >
                Restaurar
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Restablecer canvas al estado inicial de la plantilla">
            <span>
              <Button
                variant="outlined"
                className="pt-btn pt-btn--yellow"
                startIcon={<RestartAltIcon />}
                onClick={onRestoreInitial}
                size="small"
                disabled={canvasState === "PLAN_RUNNING"}
              >
                Restaurar inicial
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Aplicar plan validado (ejecución real de Terraform)">
            <span>
              <Button
                variant="outlined"
                className="pt-btn pt-btn--green"
                startIcon={<PlayArrowIcon />}
                onClick={onDeploy}
                size="small"
                disabled={canvasState === "PLAN_RUNNING"}
              >
                Desplegar
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Generar y previsualizar plan de ruteo sin aplicar cambios">
            <span>
              <Button
                variant="outlined"
                className="pt-btn pt-btn--green"
                startIcon={<PlayArrowIcon />}
                onClick={onPreviewRoutes}
                size="small"
                disabled={canvasState === "PLAN_RUNNING"}
              >
                Previsualizar
              </Button>
            </span>
          </Tooltip>
        </div>

      </div>

      {/* Mensajes visibles de estado (canvas) */}
      {canvasState === "PLAN_RUNNING" && (
        <Box sx={{ mt: 1 }}>
          <Alert severity="warning" variant="outlined">
            Hay un plan ejecutándose. El canvas está bloqueado.
          </Alert>
        </Box>
      )}

      {canvasState === "PLAN_OUTDATED" && (
        <Box sx={{ mt: 1 }}>
          <Alert severity="info" variant="outlined">
            El canvas cambió desde la última validación. Revalida antes de aplicar (deploy real).
          </Alert>
        </Box>
      )}

    </div>
  );
}
