import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthPortailStore } from '../store/authPortail';
import SealMark from '../components/SealMark';

export default function PortailLayout() {
  const navigate = useNavigate();
  const { client, logout } = useAuthPortailStore();

  function handleLogout() {
    logout();
    navigate('/portail/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between">
        <NavLink to="/portail" className="flex items-center gap-3">
          <SealMark size={26} className="text-brass-400" />
          <span className="font-serif font-semibold text-sm">
            Espace client — {client?.nom} {client?.prenom}
          </span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-navy-100 hover:text-white"
        >
          <LogOut size={16} /> Déconnexion
        </button>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}