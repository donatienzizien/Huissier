import { Navigate, Outlet } from 'react-router-dom';
import { useAuthPortailStore } from '../store/authPortail';

export default function ProtectedPortailRoute() {
  const accessToken = useAuthPortailStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/portail/login" replace />;
  return <Outlet />;
}