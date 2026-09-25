import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
// Roles legitimes pour l'espace cabinet. Toute session dont le role sorti
// du localStorage ne figure pas ici est consideree perimee ou corrompue
// (ex : ancienne session SUPER_ADMIN enregistree avant la separation des
// stores auth / authSuperAdmin) et provoque une deconnexion immediate,
// plutot que d'afficher un espace cabinet avec un role incoherent.
const ROLES_CABINET = ['HUISSIER', 'CLERC', 'COMPTABLE', 'SECRETAIRE', 'AGENT_TERRAIN'];
export default function ProtectedRoute() {
  const { accessToken, user, logout } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  if (user && !ROLES_CABINET.includes(user.role)) {
    logout();
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
