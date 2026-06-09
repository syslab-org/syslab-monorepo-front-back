import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const CidrLearningGuideButton = ({
  buttonLabel,
  buttonVariant = 'outlined',
  buttonColor = 'info',
  buttonSize = 'small',
  buttonSx,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const resolvedButtonLabel = buttonLabel || t('canvas.cidrGuide.button');

  return (
    <>
      <Button
        size={buttonSize}
        variant={buttonVariant}
        color={buttonColor}
        startIcon={<InfoOutlinedIcon fontSize="small" />}
        onClick={() => setOpen(true)}
        sx={buttonSx}
      >
        {resolvedButtonLabel}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullScreen>
        <DialogTitle sx={{ pr: 7 }}>
          {t('canvas.cidrGuide.title')}
          <IconButton
            aria-label={t('actions.close')}
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('canvas.cidrGuide.sections.meaning.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('canvas.cidrGuide.sections.meaning.bodyStart')}
                {' '}
                <b>`10.20.0.0/16`</b>
                {' '}
                {t('canvas.cidrGuide.sections.meaning.bodyEnd')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('canvas.cidrGuide.sections.rule.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('canvas.cidrGuide.sections.rule.bodyStart')}
                {' '}
                <b>`/16`</b>
                {t('canvas.cidrGuide.sections.rule.bodyMiddle')}
                {' '}
                <b>`/24`</b>
                {t('canvas.cidrGuide.sections.rule.bodyEnd')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('canvas.cidrGuide.sections.example.title')}
              </Typography>
              <Stack spacing={1.25}>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.masterStart')}
                  {' '}
                  <b>`10.20.0.0/16`</b>
                  .
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.defineSegments')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.simpleVpc')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.multiSegments')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.subnets')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.publicSubnet')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.privateSubnet')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.workloads')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.bastion')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.example.privateApp')}
                </Typography>
              </Stack>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('canvas.cidrGuide.sections.visualMap.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
                {t('canvas.cidrGuide.sections.visualMap.body')}
              </Typography>

              <Stack spacing={1.25}>
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'primary.light',
                    borderRadius: 3,
                    p: 2,
                    bgcolor: 'primary.50',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {t('canvas.cidrGuide.sections.visualMap.masterLabel')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    `10.20.0.0/16`
                  </Typography>

                  <Box
                    sx={{
                      mt: 1.5,
                      ml: 2,
                      borderLeft: '2px dashed',
                      borderColor: 'primary.light',
                      pl: 2,
                    }}
                  >
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'success.light',
                        borderRadius: 2,
                        p: 1.5,
                        bgcolor: 'success.50',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t('canvas.cidrGuide.sections.visualMap.segmentLabel')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        `10.20.0.0/16`
                      </Typography>

                      <Box
                        sx={{
                          mt: 1.25,
                          ml: 2,
                          borderLeft: '2px dashed',
                          borderColor: 'success.light',
                          pl: 2,
                          display: 'grid',
                          gap: 1,
                        }}
                      >
                        <Box
                          sx={{
                            border: '1px solid',
                            borderColor: 'info.light',
                            borderRadius: 2,
                            p: 1.25,
                            bgcolor: 'info.50',
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {t('canvas.cidrGuide.sections.visualMap.publicSubnetLabel')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            `10.20.1.0/24`
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('canvas.cidrGuide.sections.visualMap.publicWorkload')}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            border: '1px solid',
                            borderColor: 'warning.light',
                            borderRadius: 2,
                            p: 1.25,
                            bgcolor: 'warning.50',
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {t('canvas.cidrGuide.sections.visualMap.privateSubnetLabel')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            `10.20.2.0/24`
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('canvas.cidrGuide.sections.visualMap.privateWorkload')}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('canvas.cidrGuide.sections.howToThink.title')}
              </Typography>
              <Stack spacing={1}>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.howToThink.step1')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.howToThink.step2')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.howToThink.step3')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.howToThink.step4')}
                </Typography>
              </Stack>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('canvas.cidrGuide.sections.math.title')}
              </Typography>
              <Stack spacing={1.1}>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.math.bodyStart')}
                  {' '}
                  <b>32 bits</b>
                  {t('canvas.cidrGuide.sections.math.bodyEnd')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.math.formula')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - bits de host = `32 - prefijo`
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - total de direcciones = `2^(bits de host)`
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - hosts utilizables aproximados = `2^(bits de host) - 2`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('canvas.cidrGuide.sections.math.note')}
                </Typography>
              </Stack>

              <Box
                sx={{
                  mt: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.75,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                  {t('canvas.cidrGuide.sections.math.exampleA')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - bits de host = `32 - 16 = 16`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - total de direcciones = `2^16 = 65.536`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - hosts utilizables aproximados = `65.534`
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  {t('canvas.cidrGuide.sections.math.exampleAConclusion')}
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 1.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.75,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                  {t('canvas.cidrGuide.sections.math.exampleB')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - bits de host = `32 - 24 = 8`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - total de direcciones = `2^8 = 256`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - hosts utilizables aproximados = `254`
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  {t('canvas.cidrGuide.sections.math.exampleBConclusion')}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('canvas.cidrGuide.sections.membership.title')}
              </Typography>
              <Stack spacing={1.1}>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.membership.body')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - subred: `10.20.1.0/24`
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - IP válida de ejemplo: `10.20.1.10`
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - no válida para esa subred: `10.20.2.10`
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.membership.mentalRule')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - si la subred es `/24`, el bloque cambia cada 256 direcciones
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - si la subred es `/25`, el bloque cambia cada 128 direcciones
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - si la subred es `/26`, el bloque cambia cada 64 direcciones
                </Typography>
              </Stack>

              <Box
                sx={{
                  mt: 1.5,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.75,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                  {t('canvas.cidrGuide.sections.membership.exampleC')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('canvas.cidrGuide.sections.membership.exampleCBody')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - `10.20.1.0 - 10.20.1.127`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - `10.20.1.128 - 10.20.1.255`
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  {t('canvas.cidrGuide.sections.membership.then')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - `10.20.1.140` sí pertenece a `10.20.1.128/25`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - `10.20.1.70` no pertenece a `10.20.1.128/25`
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('canvas.cidrGuide.sections.ipTypes.title')}
              </Typography>
              <Stack spacing={1.1}>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.ipTypes.privateStart')}
                  {' '}
                  <b>private IP</b>
                  {' '}
                  {t('canvas.cidrGuide.sections.ipTypes.privateEnd')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.ipTypes.publicStart')}
                  {' '}
                  <b>public IP</b>
                  {' '}
                  {t('canvas.cidrGuide.sections.ipTypes.publicEnd')}
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - Private IP ejemplo: `10.20.1.10`
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - Public IP ejemplo: `54.236.71.226`
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('canvas.cidrGuide.sections.ipTypes.note')}
                </Typography>
              </Stack>

              <Box
                sx={{
                  mt: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.75,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                  {t('canvas.cidrGuide.sections.ipTypes.exampleD')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - subred pública: `10.20.1.0/24`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - private IP de la VM: `10.20.1.10`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - public IP eventual: `54.236.71.226`
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  {t('canvas.cidrGuide.sections.ipTypes.exampleDConclusion')}
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 1.25,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.75,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                  {t('canvas.cidrGuide.sections.ipTypes.practicalRule')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - Bastion o VM de entrada: suele necesitar public IP y SSH key.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - App privada: suele quedarse solo con private IP.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - Las pruebas entre segmentos casi siempre usan private IP, no public IP.
                </Typography>
              </Box>
            </Box>

            <Alert severity="warning">
              {t('canvas.cidrGuide.templateWarning')}
            </Alert>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('canvas.cidrGuide.sections.goldenRule.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('canvas.cidrGuide.sections.goldenRule.body')}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} variant="contained">
            {t('canvas.cidrGuide.understood')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CidrLearningGuideButton;
