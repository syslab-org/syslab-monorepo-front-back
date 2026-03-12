import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppThemeProvider from '@/shared/ui/theme/AppThemeProvider.jsx'


ReactDOM.createRoot(document.getElementById('root')).render(

  <AppThemeProvider>
    <App />
  </AppThemeProvider>
)
