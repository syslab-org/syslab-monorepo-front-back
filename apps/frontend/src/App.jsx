import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { Routes } from 'react-router-dom'
import { Route } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import LoginPage from './components/pages/authentication/LoginPage'
import { BrowserRouter } from 'react-router-dom'
import DashboardRoutes from './components/common/DashboardRoutes'
import { Navigate } from 'react-router-dom'
import RegistrationPage from './components/pages/authentication/RegistrationPage'


function App() {
  return (

    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/*" element={<ProtectedRoute><DashboardRoutes /></ProtectedRoute>} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='registration/:userId' element={<RegistrationPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>


  )
}

export default App
