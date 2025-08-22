// Crea el tema MUI a partir del modo
import { createTheme } from '@mui/material/styles';

const palettes = {
  light: {
    bg: '#f5f7fa',
    panel: '#ffffff',
    panel2: '#f0f3f8',
    border: '#d9dee6',
    text: '#1a1d29',
    subtext: '#5a6275',
    blue: '#2f6fed',
    cyan: '#26b4d7',
    green: '#28a745',
    yellow:'#f0b429',
    red: '#e55353',
  },
  dark: {
    bg: '#0c1118',
    panel: '#101727',
    panel2: '#0c1423',
    border: '#1a2438',
    text: '#e7ebf6',
    subtext: '#9fb0c9',
    blue: '#4b82ff',
    cyan: '#34c6f3',
    green: '#2ecc71',
    yellow:'#f5c451',
    red: '#ff6b6b',
  }
};

export default function createPacketTheme(mode = 'light') {
  const c = palettes[mode] ?? palettes.light;

  return createTheme({
    palette: {
      mode,
      background: { default: c.bg, paper: c.panel },
      text: { primary: c.text, secondary: c.subtext },
      primary: { main: c.blue },
      secondary: { main: c.cyan },
      success: { main: c.green },
      warning: { main: c.yellow },
      error: { main: c.red },
      divider: c.border,
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: [
        'Inter','ui-sans-serif','system-ui','-apple-system',
        'Segoe UI','Roboto','Ubuntu','Cantarell','Noto Sans',
        'Helvetica','Arial'
      ].join(','),
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: .2 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          html, body, #root { background: ${c.bg}; }
          ::selection { background: ${mode === 'light' ? 'rgba(47,111,237,.15)' : 'rgba(52,198,243,.22)'}; }
          .pt-panel {
            background: ${c.panel};
            border: 1px solid ${c.border};
            border-radius: ${mode==='light' ? 8 : 14}px;
            box-shadow: ${mode==='light' ? '0 4px 16px rgba(0,0,0,.06)' : '0 10px 28px rgba(5,12,25,.45)'};
          }
          .pt-ibtn { background: ${mode==='light' ? 'rgba(0,0,0,.04)' : 'rgba(255,255,255,.06)'}; border: 1px solid ${c.border}; color: ${c.text}; border-radius: 10px; }
          .pt-ibtn:hover { border-color: ${c.cyan}; }
        `
      }
    }
  });
}
