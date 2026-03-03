// src/theme/packetTracerTheme.js
import { createTheme } from '@mui/material/styles';

const colors = {
  bg: '#f5f7fa',            // fondo general claro
  panel: '#ffffff',         // panel blanco
  panel2: '#f0f3f8',        // panel alterno
  border: '#d9dee6',        // bordes suaves
  text: '#1a1d29',          // texto principal oscuro
  subtext: '#5a6275',       // texto secundario gris

  blue: '#2f6fed',
  cyan: '#26b4d7',
  green: '#28a745',
  yellow: '#f0b429',
  red: '#e55353',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    background: { default: colors.bg, paper: colors.panel },
    text: { primary: colors.text, secondary: colors.subtext },
    primary: { main: colors.blue },
    secondary: { main: colors.cyan },
    success: { main: colors.green },
    warning: { main: colors.yellow },
    error: { main: colors.red },
    divider: colors.border,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: [
      'Inter', 'ui-sans-serif', 'system-ui', '-apple-system',
      'Segoe UI', 'Roboto', 'Ubuntu', 'Cantarell', 'Noto Sans',
      'Helvetica', 'Arial'
    ].join(','),
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: .2 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        html, body, #root {
          background: ${colors.bg};
        }
        ::selection {
          background: rgba(47,111,237,.15);
        }
        /* Lienzo claro */
        .react-flow__background {
          background-color: ${colors.panel2} !important;
        }
        .react-flow__background svg path {
          stroke: rgba(90, 98, 117, .08) !important;
        }
        /* Paneles flotantes */
        .pt-panel {
          background: ${colors.panel};
          border: 1px solid ${colors.border};
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,.06);
        }
        /* Botones base */
        .pt-btn {
          background: linear-gradient(180deg, ${colors.blue}, #1f56c3);
          color: #fff;
          border: 1px solid #1f56c3;
          border-radius: 6px;
        }
        .pt-btn:hover {
          filter: brightness(1.05);
        }
        /* Botones por estado */
        .pt-btn--green {
          background: linear-gradient(180deg, ${colors.green}, #1d7f38);
          border-color: #1d7f38;
        }
        .pt-btn--yellow {
          background: linear-gradient(180deg, ${colors.yellow}, #c79421);
          color: ${colors.text};
          border-color: #c79421;
        }
        .pt-btn--red {
          background: linear-gradient(180deg, ${colors.red}, #b83c3c);
          border-color: #b83c3c;
        }
      `
    }
  }
});

export default theme;
