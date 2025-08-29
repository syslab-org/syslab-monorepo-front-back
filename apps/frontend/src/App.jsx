import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import DashboardRoutes from './components/common/DashboardRoutes'
import ProtectedRoute from './components/common/ProtectedRoute'
import LoginPage from './components/pages/authentication/LoginPage'
import RegistrationPage from './components/pages/authentication/RegistrationPage'
import TaskDemo from './components/TaskDemo'
import { AuthProvider } from './contexts/AuthContext'


function App() {
  return (

    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/*" element={<ProtectedRoute><DashboardRoutes /></ProtectedRoute>} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='registration/:userId' element={<RegistrationPage />} />
          <Route
            path="/tasks-demo"
            element={<ProtectedRoute><TaskDemo /></ProtectedRoute>}
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>


  )
}

export default App
