import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from '@emotion/react'
import { CssBaseline } from '@mui/material'
// import { darkTheme } from './styles/theme.js'
import theme from './theme/packetTracerTheme';
import AppThemeProvider from './theme/AppThemeProvider.jsx'


// const darkTheme = createTheme({
//   palette: {
//     mode: 'dark',
//     primary: {
//       main: '#121212',
//     },
//     secondary: {
//       main: '#2461C2'
//     },
//     background: {
//       default: '#ffffff'
//     }
//   },

// })

ReactDOM.createRoot(document.getElementById('root')).render(

   <AppThemeProvider>
    <App />
  </AppThemeProvider>

  ,
)
