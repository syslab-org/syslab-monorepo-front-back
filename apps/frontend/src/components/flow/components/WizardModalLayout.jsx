// apps/frontend/src/components/flow/components/WizardModalLayout.jsx
import { Box, Divider, Stack, Typography } from "@mui/material";

// eslint-disable-next-line react/prop-types
export default function WizardModalLayout({ eyebrow, title, description, children }) {
  return (
    <Stack sx={{ height: "90vh" /* fallback */, maxHeight: "90vh" }}>
      {/* Header fijo */}
      <Box sx={{ p: 4, pb: 2 }}>
        {eyebrow && (
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
            {eyebrow}
          </Typography>
        )}

        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
          {title}
        </Typography>

        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {description}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Body scrolleable */}
      <Box sx={{ p: 4, pt: 3, overflowY: "auto", flex: 1 }}>
        {children}
      </Box>
    </Stack>
  );
}