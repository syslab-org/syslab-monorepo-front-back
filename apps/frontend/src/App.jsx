// apps/frontend/src/App.jsx
import DashboardRoutes from '@/app/routes/DashboardRoutes'
import ProtectedRoute from '@/shared/ui/organisms/ProtectedRoute'
import { LoginPage } from '@/features/auth'
import { RegistrationPage } from '@/features/auth'
import TaskDemo from '@/components/TaskDemo'
import { AuthProvider } from '@/app/providers/AuthContext';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'


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
