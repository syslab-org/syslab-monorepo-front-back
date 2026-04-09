// apps/frontend/src/components/flow/PacketToolbar.jsx
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveIcon from '@mui/icons-material/Save';
import SchoolIcon from '@mui/icons-material/School';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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
  showPanelToggles = true,
}) {
  const { mode } = useThemeMode();
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
  const getPanelToggleSx = (isOpen, tone = "primary") => {
    const accent = tone === "secondary"
      ? (mode === "light" ? "#0f766e" : "#67e8f9")
      : (mode === "light" ? "#1d4ed8" : "#93c5fd");
    const border = tone === "secondary"
      ? (mode === "light" ? "rgba(15,118,110,0.24)" : "rgba(103,232,249,0.32)")
      : (mode === "light" ? "rgba(29,78,216,0.22)" : "rgba(147,197,253,0.34)");
    const background = isOpen
      ? tone === "secondary"
        ? (mode === "light" ? "rgba(20,184,166,0.14)" : "rgba(20,184,166,0.24)")
        : (mode === "light" ? "rgba(59,130,246,0.14)" : "rgba(59,130,246,0.24)")
      : (mode === "light" ? "#f8fafc" : "rgba(15,23,42,0.72)");

    return {
      color: accent,
      borderColor: border,
      backgroundColor: background,
      boxShadow: mode === "light"
        ? "0 8px 18px rgba(15,23,42,0.08)"
        : "0 10px 22px rgba(2,6,23,0.34)",
      fontWeight: 700,
      "&:hover": {
        borderColor: accent,
        backgroundColor: isOpen
          ? tone === "secondary"
            ? (mode === "light" ? "rgba(20,184,166,0.18)" : "rgba(20,184,166,0.3)")
            : (mode === "light" ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.3)")
          : (mode === "light" ? "#eef4ff" : "rgba(30,41,59,0.92)"),
      },
      "& .MuiButton-startIcon, & .MuiButton-endIcon": {
        color: accent,
      },
    };
  };
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
          {showPanelToggles && canTogglePalette && (
            <Tooltip title={paletteOpen ? "Ocultar herramientas para modelar" : "Mostrar herramientas para modelar"}>
              <Button
                size="small"
                variant="outlined"
                className="pt-btn"
                sx={getPanelToggleSx(paletteOpen, "primary")}
                startIcon={
                  <ViewSidebarIcon
                    fontSize="small"
                    sx={{ transform: paletteOpen ? "scaleX(1)" : "scaleX(-1)" }}
                  />
                }
                endIcon={paletteOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                onClick={onTogglePalette}
                aria-expanded={paletteOpen}
                aria-controls="tool-palette-panel"
                aria-label={paletteOpen ? "Ocultar herramientas para modelar" : "Mostrar herramientas para modelar"}
              >
                Herramientas
              </Button>
            </Tooltip>
          )}
          {showPanelToggles && canToggleGuide && (
            <Tooltip title={guideOpen ? "Ocultar guía de modelado" : "Mostrar guía de modelado"}>
              <Button
                size="small"
                variant="outlined"
                className="pt-btn"
                sx={getPanelToggleSx(guideOpen, "secondary")}
                startIcon={
                  <SchoolIcon
                    fontSize="small"
                    sx={{ opacity: guideOpen ? 1 : 0.82 }}
                  />
                }
                endIcon={guideOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                onClick={onToggleGuide}
                aria-expanded={guideOpen}
                aria-controls="learning-guide-panel"
                aria-label={guideOpen ? "Ocultar guía de modelado" : "Mostrar guía de modelado"}
              >
                Guía
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Acercar"><IconButton size="small" className="pt-ibtn" onClick={onZoomIn}><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Alejar"><IconButton size="small" className="pt-ibtn" onClick={onZoomOut}><ZoomOutIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Ajustar vista"><IconButton size="small" className="pt-ibtn" onClick={onFitView}><CenterFocusStrongIcon fontSize="small" /></IconButton></Tooltip>
        </div>

        {/* Spacer que empuja todo lo siguiente a la derecha */}
        <div className="pt-toolbar__spacer" />

        {/* Botones de acción */}
        <div className="pt-toolbar__group">
          {renderSaveChip()}
          <Tooltip title="Guardar estado actual del canvas en la API">
            <span data-tour="canvas-toolbar-save">
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
            <span data-tour="canvas-toolbar-restore">
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
            <span data-tour="canvas-toolbar-restore-initial">
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
            <span data-tour="canvas-toolbar-deploy">
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
            <span data-tour="canvas-toolbar-routes">
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
