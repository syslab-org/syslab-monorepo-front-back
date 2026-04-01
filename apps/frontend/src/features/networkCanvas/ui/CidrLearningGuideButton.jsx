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

const CidrLearningGuideButton = ({
  buttonLabel = '¿Cómo calcular?',
  buttonVariant = 'outlined',
  buttonColor = 'info',
  buttonSize = 'small',
  buttonSx,
}) => {
  const [open, setOpen] = useState(false);

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
        {buttonLabel}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullScreen>
        <DialogTitle sx={{ pr: 7 }}>
          Guía rápida de CIDR, subredes y direcciones IP
          <IconButton
            aria-label="cerrar guía"
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
                1. Qué significa un CIDR
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Un CIDR combina una dirección base y un prefijo. Por ejemplo,
                {' '}
                <b>`10.20.0.0/16`</b>
                {' '}
                significa que el laboratorio tiene un bloque amplio desde el cual luego derivaremos segmentos y subredes.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                2. Regla práctica para este MVP
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Si partes con un
                {' '}
                <b>`/16`</b>
                , normalmente podrás dividirlo con tranquilidad en varias redes
                {' '}
                <b>`/24`</b>
                . Esa combinación es cómoda para laboratorio porque deja margen para crecer sin tener que rehacer el direccionamiento.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                3. Ejemplo sencillo
              </Typography>
              <Stack spacing={1.25}>
                <Typography variant="body1" color="text.secondary">
                  Supón que tu rango maestro es
                  {' '}
                  <b>`10.20.0.0/16`</b>
                  .
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Desde ahí puedes definir segmentos o VPCs como:
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - `10.20.0.0/16` para una VPC simple
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - o separar varios segmentos en rangos distintos si el caso lo requiere
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Dentro de una VPC, puedes crear subredes como:
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - `10.20.1.0/24` para una subred pública
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - `10.20.2.0/24` para una subred privada
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Y luego asignar IPs a workloads, por ejemplo:
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - `10.20.1.10` para una bastion
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - `10.20.2.10` para una app privada
                </Typography>
              </Stack>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                3.1. Mapa visual del direccionamiento
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
                Piensa el laboratorio como una jerarquía: cada nivel contiene al siguiente.
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
                    Laboratorio / rango maestro
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
                        Segmento / VPC
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
                            Subred pública
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            `10.20.1.0/24`
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Workload ejemplo: `10.20.1.10`
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
                            Subred privada
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            `10.20.2.0/24`
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Workload ejemplo: `10.20.2.10`
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
                4. Cómo pensar el cálculo sin complicarte
              </Typography>
              <Stack spacing={1}>
                <Typography component="div" variant="body1" color="text.secondary">
                  1. Elige primero el rango maestro del laboratorio.
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  2. Decide cuántos segmentos o VPCs vas a necesitar.
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  3. Dentro de cada segmento, separa subredes públicas y privadas con bloques que no se solapen.
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  4. Reserva IPs fijas para workloads solo después de definir bien sus subredes.
                </Typography>
              </Stack>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                4.1. Cómo se calcula matemáticamente
              </Typography>
              <Stack spacing={1.1}>
                <Typography variant="body1" color="text.secondary">
                  En IPv4 hay
                  {' '}
                  <b>32 bits</b>
                  . El prefijo indica cuántos bits están reservados para la red.
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  La fórmula base es:
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
                  En laboratorio usamos esa regla práctica aunque algunos entornos reservan direcciones adicionales.
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
                  Ejemplo A: `10.20.0.0/16`
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
                  Eso explica por qué un `/16` sirve bien como rango maestro: deja mucho espacio para varias subredes internas.
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
                  Ejemplo B: `10.20.1.0/24`
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
                  Por eso una subred `/24` suele ser cómoda para laboratorio: puedes asignar varias IPs fijas sin quedarte corto.
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                4.2. Cómo saber si una IP pertenece a una subred
              </Typography>
              <Stack spacing={1.1}>
                <Typography variant="body1" color="text.secondary">
                  En un `/24`, los primeros 3 octetos identifican la red y el último octeto cambia por host.
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
                  Regla mental rápida:
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
                  Ejemplo C: `10.20.1.128/25`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Un `/25` divide el `/24` en dos bloques:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - `10.20.1.0 - 10.20.1.127`
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - `10.20.1.128 - 10.20.1.255`
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  Entonces:
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
                4.3. Private IP vs Public IP
              </Typography>
              <Stack spacing={1.1}>
                <Typography variant="body1" color="text.secondary">
                  Una
                  {' '}
                  <b>private IP</b>
                  {' '}
                  identifica al workload dentro de su red interna. Esa IP se usa para ruteo entre subredes y segmentos.
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Una
                  {' '}
                  <b>public IP</b>
                  {' '}
                  sirve para acceso desde Internet cuando la topología, la subred y las reglas de seguridad lo permiten.
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - Private IP ejemplo: `10.20.1.10`
                </Typography>
                <Typography component="div" variant="body1" color="text.secondary">
                  - Public IP ejemplo: `54.236.71.226`
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  No compiten entre sí: una VM puede tener private IP siempre, y public IP solo si el diseño lo requiere.
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
                  Ejemplo D: cómo leerlo en una VM pública
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
                  Si haces `ssh` desde tu computador, entrarás por la public IP. Pero dentro de la nube, otras máquinas alcanzarán esa VM por su private IP.
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
                  Regla práctica para laboratorio
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
              Si cambias el CIDR maestro después de elegir una plantilla, el canvas precargado no recalcula automáticamente todas las IPs. En ese caso, revisa manualmente los CIDR de segmentos, subredes e IPs fijas antes de validar o desplegar.
            </Alert>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                5. Regla de oro
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Ningún segmento debe salirse del rango maestro, ninguna subred debe salirse de su segmento y ninguna IP fija debe salirse de su subred. Si mantienes esa jerarquía, el modelado suele ser estable y fácil de explicar en la demo.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} variant="contained">
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CidrLearningGuideButton;
