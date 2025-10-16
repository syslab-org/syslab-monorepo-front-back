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
import { Button, IconButton, Tooltip } from '@mui/material';
import { useThemeMode } from '../../theme/AppThemeProvider';


export default function PacketToolbar({
  onSave, onRestore, onRestoreInitial, onDeploy,
  onZoomIn, onZoomOut, onFitView, title = 'Logical', onPreviewRoutes
}) {
  const { mode, toggle } = useThemeMode();

  return (
    <div className="pt-panel" style={{ padding: 8, margin: 8, width: '100%' }}>
      <div className="pt-toolbar">
        {/* Izquierda: título */}
        <div className="pt-toolbar__title">{title}</div>

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
          <Button variant="outlined" className="pt-btn" startIcon={<SaveIcon />} onClick={onSave} size="small">Save</Button>
          <Button variant="outlined" className="pt-btn" startIcon={<RestoreIcon />} onClick={onRestore} size="small">Restore</Button>
          <Button variant="outlined" className="pt-btn pt-btn--yellow" startIcon={<RestartAltIcon />} onClick={onRestoreInitial} size="small">Restore Initial</Button>
          <Button variant="outlined" className="pt-btn pt-btn--green" startIcon={<PlayArrowIcon />} onClick={onDeploy} size="small">Deploy</Button>
          <Button variant="outlined" className="pt-btn pt-btn--green" startIcon={<PlayArrowIcon />} onClick={onPreviewRoutes} size="small">Preview</Button>
        </div>

      </div>
    </div>
  );
}

