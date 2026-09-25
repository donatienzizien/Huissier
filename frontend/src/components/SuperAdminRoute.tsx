import { Navigate, Outlet } from 'react-router-dom';
import { useAuthSuperAdminStore } from '../store/authSuperAdmin';

export default function SuperAdminRoute() {
  const { user, accessToken } = useAuthSuperAdminStore();

  if (!accessToken || user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/super-admin/login" replace />;
  }

  return <Outlet />;
}
