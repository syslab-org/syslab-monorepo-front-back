import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import AppThemeProvider from '@/shared/ui/theme/AppThemeProvider.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const appTree = (
  <AppThemeProvider>
    <App />
  </AppThemeProvider>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      {appTree}
    </GoogleOAuthProvider>
  ) : (
    appTree
  )
)
