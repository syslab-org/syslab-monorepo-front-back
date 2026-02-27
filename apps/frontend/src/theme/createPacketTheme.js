// Crea el tema MUI a partir del modo
import { createTheme } from "@mui/material/styles";

const palettes = {
  light: {
    bg: "#eef2f7",
    panel: "#ffffff",
    panel2: "#f8fafc",
    border: "#e2e8f0",
    text: "#1a1d29",
    subtext: "#5a6275",
    blue: "#3b82f6",
    cyan: "#22d3ee",
    green: "#16a34a",
    yellow: "#f59e0b",
    red: "#ef4444",
  },
  dark: {
    bg: "#0c1118",
    panel: "#101727",
    panel2: "#0c1423",
    border: "#1a2438",
    text: "#e7ebf6",
    subtext: "#9fb0c9",
    blue: "#4b82ff",
    cyan: "#34c6f3",
    green: "#2ecc71",
    yellow: "#f5c451",
    red: "#ff6b6b",
  },
  infrastructure: {
    vpc: "#2f6fed",
    subnet: "#26b4d7",
    instance: "#4b8bff",
    router: "#ff9a6a",
  },
};

export default function createPacketTheme(mode = "light") {
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
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: [
        "Inter",
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Roboto",
        "Ubuntu",
        "Cantarell",
        "Noto Sans",
        "Helvetica",
        "Arial",
      ].join(","),
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0.2 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          html, body, #root {
            background: linear-gradient(180deg, ${c.bg} 0%, #e6edf5 100%);
          }
          ::selection { background: ${mode === "light" ? "rgba(47,111,237,.15)" : "rgba(52,198,243,.22)"}; }
          .pt-panel {
            background: ${c.panel};
            border: 1px solid ${c.border};
             box-shadow: ${
               mode === "light"
                 ? "0 1px 3px rgba(0,0,0,.04)"
                 : "0 8px 24px rgba(0,0,0,.55)"
             };
            border-radius: 8px;
            transition: all .18s ease;
          }
          .pt-panel:hover {
            box-shadow: ${
              mode === "light"
                ? "0 4px 12px rgba(0,0,0,.05)"
                : "0 10px 24px rgba(0,0,0,.6)"
            };
          }
          .pt-ibtn { background: ${mode === "light" ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.06)"}; border: 1px solid ${c.border}; color: ${c.text}; border-radius: 10px; }
          .pt-ibtn:hover { border-color: ${c.cyan}; }
        `,
      },
    },
  });
}
