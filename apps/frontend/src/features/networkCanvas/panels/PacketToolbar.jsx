// apps/frontend/src/components/flow/PacketToolbar.jsx
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveIcon from '@mui/icons-material/Save';
import SchoolIcon from '@mui/icons-material/School';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { Button, Chip, IconButton, Tooltip } from '@mui/material';
import { computePlanActionState } from '@/features/networkCanvas/utils/planActionUi';
import { useThemeMode } from '@/shared/ui/theme/AppThemeProvider';


export default function PacketToolbar({
  onSave,
  saveState = "idle",
  saveMessage = "",
  lastSavedAt = null,
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
  paletteOpen = true,
  guideOpen = false,
  onTogglePalette,
  onToggleGuide,
}) {
  const { mode, toggle } = useThemeMode();
  const canTogglePalette = typeof onTogglePalette === "function";
  const canToggleGuide = typeof onToggleGuide === "function";

  const PLAN_STATES = {
    IDLE: "IDLE",
    SYNCING: "SYNCING",
    PLANNING: "PLANNING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
  };

  const normalizedValidation = String(validationState || "").toUpperCase();
  const actionState = computePlanActionState(planStatus, canvasState, validationState);
  const planSnapshotStatus = String(planStatus?.status || '').toUpperCase();
  const hasActiveInfra = planStatus?.applied === true;
  const formatSaveTime = (value) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderSaveChip = () => {
    if (saveState === "saving") {
      return (
        <Chip
          size="small"
          color="info"
          variant="filled"
          icon={<SyncRoundedIcon fontSize="small" />}
          label={saveMessage || "Guardando..."}
          sx={{ fontWeight: 700 }}
        />
      );
    }

    if (saveState === "saved") {
      return (
        <Chip
          size="small"
          color="success"
          variant="outlined"
          icon={<CheckCircleOutlineIcon fontSize="small" />}
          label={lastSavedAt ? `Guardado ${formatSaveTime(lastSavedAt)}` : (saveMessage || "Guardado")}
          sx={{ fontWeight: 700, bgcolor: "rgba(34,197,94,0.06)" }}
        />
      );
    }

    if (saveState === "error") {
      return (
        <Chip
          size="small"
          color="error"
          variant="filled"
          icon={<ErrorOutlineIcon fontSize="small" />}
          label={saveMessage || "Error al guardar"}
          sx={{ fontWeight: 700 }}
        />
      );
    }

    return null;
  };

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
            {planSnapshotStatus && (
              <Chip
                size="small"
                variant="outlined"
                label={`PLAN ${planSnapshotStatus}`}
                color={planSnapshotStatus === 'SUCCESS' ? 'success' : planSnapshotStatus === 'FAILURE' ? 'error' : 'info'}
              />
            )}
            {hasActiveInfra && (
              <Chip
                size="small"
                variant="outlined"
                label="ACTIVE INFRA"
                color="warning"
              />
            )}
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
          {canTogglePalette && (
            <Tooltip title={paletteOpen ? "Ocultar paleta de herramientas" : "Mostrar paleta de herramientas"}>
              <IconButton size="small" className="pt-ibtn" onClick={onTogglePalette}>
                <ViewSidebarIcon
                  fontSize="small"
                  sx={{ transform: paletteOpen ? "scaleX(1)" : "scaleX(-1)" }}
                />
              </IconButton>
            </Tooltip>
          )}
          {canToggleGuide && (
            <Tooltip title={guideOpen ? "Ocultar guía de aprendizaje" : "Mostrar guía de aprendizaje"}>
              <IconButton size="small" className="pt-ibtn" onClick={onToggleGuide}>
                <SchoolIcon
                  fontSize="small"
                  sx={{ opacity: guideOpen ? 1 : 0.7 }}
                />
              </IconButton>
            </Tooltip>
          )}
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
          {renderSaveChip()}
          <Tooltip title="Guardar estado actual del canvas en la API">
            <span>
              <Button
                variant="outlined"
                className="pt-btn"
                startIcon={<SaveIcon />}
                onClick={onSave}
                size="small"
                disabled={canvasState === "PLAN_RUNNING" || saveState === "saving"}
              >
                {saveState === "saving" ? "Guardando…" : "Guardar"}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Restaurar última versión guardada desde la API">
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
          <Tooltip title={actionState.actionTooltip}>
            <span>
              <Button
                variant="outlined"
                className="pt-btn pt-btn--green"
                startIcon={<PlayArrowIcon />}
                onClick={onDeploy}
                size="small"
                disabled={canvasState === "PLAN_RUNNING"}
              >
                {actionState.actionLabel}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Generar y revisar el plan de ruteo sin aplicar cambios">
            <span>
              <Button
                variant="outlined"
                className="pt-btn pt-btn--green"
                startIcon={<PlayArrowIcon />}
                onClick={onPreviewRoutes}
                size="small"
                disabled={canvasState === "PLAN_RUNNING"}
              >
                Ver ruteo
              </Button>
            </span>
          </Tooltip>
        </div>

      </div>
    </div>
  );
}
