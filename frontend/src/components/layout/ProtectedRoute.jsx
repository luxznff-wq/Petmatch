import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import { dashboardPathFor } from './Navbar.jsx';

/**
 * Guardia de rutas privadas (§9 de los issues: protección de rutas).
 *
 * Es una comodidad de la interfaz, no una medida de seguridad: la API vuelve
 * a comprobar cada permiso en el servidor (§88.10, §88.11).
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner label="Verificando tu sesión…" />;

  if (!isAuthenticated) {
    // Se recuerda el destino para volver a él tras iniciar sesión.
    return <Navigate to="/ingresar" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }

  return <Outlet />;
}
