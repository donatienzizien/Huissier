import { useEffect, useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Download, Trash2, FolderOpen } from 'lucide-react';
import { api } from '../../lib/api';
import { exportToCsv } from '../../lib/csv';
import {
  Dossier,
  PaginatedResult,
  Client,
  LABELS_STATUT_DOSSIER,
  LABELS_TYPE_DOSSIER,
  StatutDossier,
  TypeDossier,
} from '../../types';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { useAuthStore } from '../../store/auth';

export default function DossiersList() {
  const [searchParams] = useSearchParams();
  const clientIdFiltre = searchParams.get('clientId') ?? undefined;
  const debiteurIdFiltre = searchParams.get('debiteurId') ?? undefined;
  const user = useAuthStore((s) => s.user);
  const peutModifier = user?.role === 'HUISSIER' || user?.role === 'CLERC';
  const [result, setResult] = useState<PaginatedResult<Dossier> | null>(null);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState<StatutDossier | ''>('');
  const [type, setType] = useState<TypeDossier | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedResult<Dossier>>('/dossiers', {
        params: {
          search: search || undefined,
          statut: statut || undefined,
          type: type || undefined,
          clientId: clientIdFiltre,
          debiteurId: debiteurIdFiltre,
          page,
          limit: 20,
        },
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statut, type, clientIdFiltre, debiteurIdFiltre]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleExport() {
    setExporting(true);
    setErrorBanner(null);
    try {
      const tous: Dossier[] = [];
      let page_ = 1;
      let totalPages = 1;
      do {
        const { data } = await api.get<PaginatedResult<Dossier>>('/dossiers', {
          params: {
            search: search || undefined,
            statut: statut || undefined,
            type: type || undefined,
            page: page_,
            limit: 100,
          },
        });
        tous.push(...data.data);
        totalPages = data.pagination.totalPages;
        page_++;
      } while (page_ <= totalPages);

      exportToCsv('dossiers', tous, [
        { key: 'numero', label: 'Numero' },
        { key: (d) => `${d.client_nom ?? ''} ${d.client_prenom ?? ''}`.trim(), label: 'Client' },
        { key: (d) => `${d.debiteur_nom ?? ''} ${d.debiteur_prenom ?? ''}`.trim(), label: 'Debiteur' },
        { key: (d) => LABELS_TYPE_DOSSIER[d.type], label: 'Type' },
        { key: (d) => LABELS_STATUT_DOSSIER[d.statut], label: 'Statut' },
        { key: (d) => new Date(d.date_ouverture).toLocaleDateString('fr-FR'), label: 'Ouverture' },
      ]);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? "Erreur lors de l'export CSV.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(d: Dossier) {
    if (!window.confirm(`Supprimer definitivement le dossier ${d.numero} et tout son contenu (actes, factures, agenda, historique) ? Cette action est irreversible.`)) {
      return;
    }
    setDeletingId(d.id);
    setErrorBanner(null);
    try {
      await api.delete(`/dossiers/${d.id}`);
      load();
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? 'Erreur lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon={FolderOpen}
        title="Dossiers"
        action={
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:border-brass-400 hover:text-brass-700 text-navy-700 text-sm font-medium rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
            >
              <Download size={16} /> {exporting ? 'Export…' : 'Exporter CSV'}
            </button>
            {peutModifier && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all"
              >
                <Plus size={16} /> Nouveau dossier
              </button>
            )}
          </div>
        }
      />

      {errorBanner && (
        <div className="mt-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {errorBanner}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par numero, client ou debiteur…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
          />
        </form>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as TypeDossier | '');
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
        >
          <option value="">Tous les types</option>
          {Object.entries(LABELS_TYPE_DOSSIER).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value as StatutDossier | '');
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(LABELS_STATUT_DOSSIER).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Numero</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Debiteur</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Ouverture</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && result?.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Aucun dossier trouve.
                </td>
              </tr>
            )}
            {result?.data.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/dossiers/${d.id}`} className="font-nums text-navy-700 font-semibold hover:underline hover:text-brass-600">
                    {d.numero}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {d.client_nom} {d.client_prenom ?? ''}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {d.debiteur_nom ? `${d.debiteur_nom} ${d.debiteur_prenom ?? ''}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{LABELS_TYPE_DOSSIER[d.type]}</td>
                <td className="px-4 py-3">
                  <Badge statut={d.statut} label={LABELS_STATUT_DOSSIER[d.statut]} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(d.date_ouverture).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(d)}
                    disabled={deletingId === d.id}
                    title="Supprimer ce dossier"
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-wine-600 disabled:opacity-40 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Page {result.pagination.page} sur {result.pagination.totalPages} ({result.pagination.total}{' '}
            resultats)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:border-brass-400 transition-colors"
            >
              Precedent
            </button>
            <button
              disabled={page >= result.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:border-brass-400 transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateDossierModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function TiersPicker({
  label,
  roleTiers,
  value,
  onChange,
  optionnel,
  accent = 'navy',
}: {
  label: string;
  roleTiers: 'CLIENT' | 'DEBITEUR';
  value: { id: string; nom: string } | null;
  onChange: (v: { id: string; nom: string } | null) => void;
  optionnel?: boolean;
  accent?: 'navy' | 'wine';
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Client[]>([]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (search.length < 2) {
        setResults([]);
        return;
      }
      const { data } = await api.get<PaginatedResult<Client>>('/clients', {
        params: { search, roleTiers, limit: 5 },
      });
      setResults(data.data);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, roleTiers]);

  const border = accent === 'wine' ? 'border-wine-200 bg-wine-50' : 'border-brass-200 bg-brass-50';

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {optionnel && <span className="text-gray-400 font-normal">(optionnel)</span>}
      </label>
      {value ? (
        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${border}`}>
          <span>{value.nom}</span>
          <button type="button" onClick={() => onChange(null)} className="text-navy-700 text-xs">
            Changer
          </button>
        </div>
      ) : (
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Rechercher un ${roleTiers === 'CLIENT' ? 'client' : 'debiteur'} existant…`}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
          />
          {results.length > 0 && (
            <ul className="mt-1 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ id: c.id, nom: `${c.nom} ${c.prenom ?? ''}`.trim() });
                      setSearch('');
                      setResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {c.nom} {c.prenom ?? ''} {c.telephone ? `· ${c.telephone}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function CreateDossierModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<TypeDossier>('RECOUVREMENT');
  const [client, setClient] = useState<{ id: string; nom: string } | null>(null);
  const [debiteur, setDebiteur] = useState<{ id: string; nom: string } | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!client) {
      setError('Selectionnez le client (mandant) dans la liste.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post('/dossiers', {
        type,
        clientId: client.id,
        debiteurId: debiteur?.id || undefined,
        description: description || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la creation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nouveau dossier" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type de dossier</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeDossier)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
          >
            {Object.entries(LABELS_TYPE_DOSSIER).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <TiersPicker label="Client (mandant)" roleTiers="CLIENT" value={client} onChange={setClient} accent="navy" />
        <TiersPicker
          label="Debiteur (poursuivi)"
          roleTiers="DEBITEUR"
          value={debiteur}
          onChange={setDebiteur}
          optionnel
          accent="wine"
        />
        <p className="text-xs text-gray-400 -mt-2">
          Pas encore de fiche ? Creez-la d'abord depuis l'onglet Clients / Debiteurs.
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description (optionnel)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
          />
        </div>

        {error && <p className="text-sm text-wine-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-lg py-2 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
        >
          {saving ? 'Creation…' : 'Creer le dossier'}
        </button>
      </form>
    </Modal>
  );
}

