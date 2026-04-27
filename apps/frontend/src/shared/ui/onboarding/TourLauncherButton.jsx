import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import { Fab, Tooltip } from "@mui/material";

export default function TourLauncherButton({
  onClick,
  label = "Ver tour",
  bottom = 24,
  right = 24,
}) {
  return (
    <Tooltip title={label}>
      <Fab
        color="primary"
        aria-label={label}
        onClick={onClick}
        size="medium"
        sx={{
          position: "fixed",
          right,
          bottom,
          zIndex: (theme) => theme.zIndex.tooltip,
          boxShadow: "0 18px 40px rgba(37, 99, 235, 0.28)",
        }}
      >
        <AutoStoriesIcon />
      </Fab>
    </Tooltip>
  );
}
