import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, CalendarClock } from 'lucide-react';
import { api } from '../lib/api';
const ICONS: Record<any['type'], typeof AlertTriangle> = {
  FACTURE_EN_RETARD: AlertTriangle,
  FACTURE_ECHEANCE_PROCHE: Clock,
  ECHEANCE_AGENDA: CalendarClock,
};

const TINTS: Record<any['type'], string> = {
  FACTURE_EN_RETARD: 'bg-wine-50 text-wine-600',
  FACTURE_ECHEANCE_PROCHE: 'bg-gold-50 text-gold-700',
  ECHEANCE_AGENDA: 'bg-ink-50 text-ink-700',
};

export default function AlertesBell() {
  const navigate = useNavigate();
  const [alertes, setAlertes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const { data } = await api.get<any[]>('/alertes');
      setAlertes(data);
    } catch {
      // Silencieux : les alertes ne doivent jamais bloquer le reste de l'app.
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000); // rafraÃ®chi toutes les 5 min
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function go(lien: string) {
    setOpen(false);
    navigate(lien);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-ink-900 transition-colors"
      >
        <Bell size={18} />
        {alertes.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-wine-600 text-white text-[10px] font-semibold">
            {alertes.length > 9 ? '9+' : alertes.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-xl max-h-96 overflow-y-auto z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-ink-900">Alertes</h3>
          </div>
          {alertes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Rien Ã  signaler pour le moment.</p>
          ) : (
            alertes.map((a) => {
              const Icon = ICONS[a.type];
              return (
                <button
                  key={a.id}
                  onClick={() => go(a.lien)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex gap-3 border-b border-gray-50 last:border-0"
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${TINTS[a.type]}`}>
                    <Icon size={14} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink-900">{a.titre}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{a.message}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
