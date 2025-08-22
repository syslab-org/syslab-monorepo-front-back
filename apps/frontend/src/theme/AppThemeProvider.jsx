import { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import createPacketTheme from './createPacketTheme';

const ThemeModeCtx = createContext({ mode: 'light', toggle: () => {} });

export function useThemeMode() {
  return useContext(ThemeModeCtx);
}

export default function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('pt-mode') || 'light');

  const toggle = () => setMode(m => (m === 'light' ? 'dark' : 'light'));

  // aplica clase al <body> para que tus variables CSS cambien
  useEffect(() => {
    localStorage.setItem('pt-mode', mode);
    document.body.classList.toggle('theme-dark', mode === 'dark');
  }, [mode]);

  const theme = useMemo(() => createPacketTheme(mode), [mode]);

  return (
    <ThemeModeCtx.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeCtx.Provider>
  );
}
