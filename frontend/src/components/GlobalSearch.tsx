import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderOpen, Users, FileText, Receipt, X } from 'lucide-react';
import { api } from '../lib/api';

interface ResultGroup {
  label: string;
  icon: typeof FolderOpen;
  items: { id: string; primary: string; secondary?: string; to: string }[];
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setGroups([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const [dossiers, clients, factures, actes] = await Promise.all([
          api.get('/dossiers', { params: { search: query, limit: 5 } }),
          api.get('/clients', { params: { search: query, limit: 5 } }),
          api.get('/factures', { params: { search: query, limit: 5 } }).catch(() => ({ data: { data: [] } })),
          api.get('/actes', { params: { search: query, limit: 5 } }),
        ]);

        const next: ResultGroup[] = [
          {
            label: 'Dossiers',
            icon: FolderOpen,
            items: dossiers.data.data.map((d: any) => ({
              id: d.id,
              primary: d.numero,
              secondary: `${d.client_nom ?? ''} ${d.client_prenom ?? ''}`.trim(),
              to: `/dossiers/${d.id}`,
            })),
          },
          {
            label: 'Clients / Débiteurs',
            icon: Users,
            items: clients.data.data.map((c: any) => ({
              id: c.id,
              primary: `${c.nom} ${c.prenom ?? ''}`.trim(),
              secondary: c.telephone ?? c.email ?? undefined,
              to: `/clients/${c.id}`,
            })),
          },
          {
            label: 'Factures',
            icon: Receipt,
            items: factures.data.data.map((f: any) => ({
              id: f.id,
              primary: f.numero,
              secondary: `${f.client_nom ?? ''} ${f.client_prenom ?? ''}`.trim(),
              to: `/facturation/${f.id}`,
            })),
          },
          {
            label: 'Actes',
            icon: FileText,
            items: actes.data.data.map((a: any) => ({
              id: a.id,
              primary: a.numero,
              secondary: a.dossier_numero,
              to: `/dossiers/${a.dossier_id}`,
            })),
          },
        ].filter((g) => g.items.length > 0);

        setGroups(next);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  function go(to: string) {
    setOpen(false);
    setQuery('');
    navigate(to);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un dossier, un client, une facture, un acte…"
        className="w-full pl-9 pr-8 py-2 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
      />
      {query && (
        <button
          onClick={() => {
            setQuery('');
            setGroups([]);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      )}

      {open && query.trim().length >= 2 && (
        <div className="absolute mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-xl max-h-96 overflow-y-auto z-50">
          {loading && <p className="px-4 py-3 text-sm text-gray-400">Recherche…</p>}
          {!loading && groups.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">Aucun résultat pour « {query} ».</p>
          )}
          {!loading &&
            groups.map((group) => (
              <div key={group.label} className="border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <group.icon size={12} /> {group.label}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => go(item.to)}
                    className="w-full text-left px-4 py-2 hover:bg-gold-50 flex items-center justify-between group"
                  >
                    <span className="font-nums text-sm text-ink-900 font-medium">{item.primary}</span>
                    {item.secondary && (
                      <span className="text-xs text-gray-500 group-hover:text-gold-700">{item.secondary}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
