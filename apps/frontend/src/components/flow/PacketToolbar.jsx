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
import { useThemeMode } from '../../theme/AppThemeProvider';


export default function PacketToolbar({
  onSave,
  onRestore,
  onRestoreInitial,
  onDeploy,
  onZoomIn,
  onZoomOut,
  onFitView,
  title = 'Logical',
  onPreviewRoutes,
  planStatus = null, // { status, last_action, simulate_only, updated_at }
  canvasState = "NO_PLAN",
}) {
  const { mode, toggle } = useThemeMode();

  return (
    <div
      className="pt-panel"
      style={{
        padding: 8,
        margin: 8,
        width: '100%',
        position: 'relative',
        zIndex: 60,
      }}
    >
      <div className="pt-toolbar">
        {/* Izquierda: título */}
        <div className="pt-toolbar__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{title}</span>
          {planStatus?.status ? (
            <>
              <Chip
                size="small"
                variant="outlined"
                label={`PLAN: ${String(planStatus.status).toUpperCase()}`}
                color={
                  String(planStatus.status).toUpperCase() === 'SUCCESS'
                    ? 'success'
                    : ['RUNNING', 'PENDING', 'STARTED'].includes(String(planStatus.status).toUpperCase())
                      ? 'info'
                      : String(planStatus.status).toUpperCase() === 'FAILURE'
                        ? 'error'
                        : 'default'
                }
              />
              {canvasState === "PLAN_OUTDATED" && (
                <Chip
                  size="small"
                  variant="outlined"
                  label="DESACTUALIZADO"
                  color="warning"
                />
              )}
            </>
          ) : null}
        </div>

        {/* Controles de vista */}
        <div className="pt-toolbar__group">
          <Tooltip title="Zoom in"><IconButton size="small" className="pt-ibtn" onClick={onZoomIn}><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Zoom out"><IconButton size="small" className="pt-ibtn" onClick={onZoomOut}><ZoomOutIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Fit view"><IconButton size="small" className="pt-ibtn" onClick={onFitView}><CenterFocusStrongIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
            <IconButton size="small" className="pt-ibtn" onClick={toggle}>
              {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </div>

        {/* Spacer que empuja todo lo siguiente a la derecha */}
        <div className="pt-toolbar__spacer" />

        {/* Botones de acción */}
        <div className="pt-toolbar__group">
          <Button variant="outlined" className="pt-btn" startIcon={<SaveIcon />} onClick={onSave} size="small" disabled={canvasState === "PLAN_RUNNING"}>Save</Button>
          <Button variant="outlined" className="pt-btn" startIcon={<RestoreIcon />} onClick={onRestore} size="small" disabled={canvasState === "PLAN_RUNNING"}>Restore</Button>
          <Button variant="outlined" className="pt-btn pt-btn--yellow" startIcon={<RestartAltIcon />} onClick={onRestoreInitial} size="small" disabled={canvasState === "PLAN_RUNNING"}>Restore Initial</Button>
          <Button variant="outlined" className="pt-btn pt-btn--green" startIcon={<PlayArrowIcon />} onClick={onDeploy} size="small" disabled={canvasState === "PLAN_RUNNING"}>Deploy</Button>
          <Button variant="outlined" className="pt-btn pt-btn--green" startIcon={<PlayArrowIcon />} onClick={onPreviewRoutes} size="small" disabled={canvasState === "PLAN_RUNNING"}>Preview</Button>
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

