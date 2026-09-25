import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, UserCircle, Building2, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import UserAvatar from './UserAvatar';

// Menu deroulant declenche par l'avatar dans le header — meme pattern
// (ref + click-outside) que GlobalSearch et AlertesBell deja en place.
export default function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function aller(chemin: string) {
    setOpen(false);
    navigate(chemin);
  }

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/login');
  }

  const initiales = `${user?.nom?.[0] ?? ''}${user?.prenom?.[0] ?? ''}`.toUpperCase();

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full hover:bg-navy-900/5 pr-1.5 py-0.5 transition-colors"
      >
        <UserAvatar userId={user?.id} initiales={initiales} size={32} />
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <UserAvatar userId={user?.id} initiales={initiales} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy-900 truncate">
                {user?.nom} {user?.prenom}
              </p>
              <p className="text-xs text-brass-600">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={() => aller('/profil')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
          >
            <UserCircle size={16} className="text-gray-400" />
            Mon profil
          </button>

          {user?.role === 'HUISSIER' && (
            <button
              onClick={() => aller('/administration/cabinet')}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <Building2 size={16} className="text-gray-400" />
              Paramètres du cabinet
            </button>
          )}

          <div className="border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-wine-600 hover:bg-wine-50 text-left"
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
