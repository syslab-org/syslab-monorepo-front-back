/* eslint-disable react/prop-types */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// eslint-disable-next-line react/prop-types
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, roleUser } = useAuth();
  const location = useLocation();
  
  

  // Verificar si el usuario no está autenticado
  if (!user) {
    // Permitir el acceso a las páginas de login y registration si no hay un usuario autenticado
    if (location.pathname === "/login" || location.pathname.startsWith("/registration")) {
      return children;
    }
    // Redirigir a la página de login si intenta acceder a una página protegida
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(roleUser || user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  // Si el usuario está autenticado, renderizar los componentes hijos
  return children;
};

export default ProtectedRoute;
