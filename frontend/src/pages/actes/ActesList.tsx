import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, FileText, Trash2, UserCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { telechargerActePdf } from '../../lib/pdf';
import { exportToCsv } from '../../lib/csv';
import { ActeListItem, PaginatedResult, LABELS_TYPE_ACTE, TypeActe, TYPES_ACTE_PROCEDURE } from '../../types';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { useAuthStore } from '../../store/auth';

const TYPE_TINT: Record<TypeActe, string> = {
  SIGNIFICATION: 'bg-navy-50 text-navy-700',
  COMMANDEMENT_PAYER: 'bg-wine-50 text-wine-600',
  PV_CONSTAT: 'bg-brass-50 text-brass-700',
  PV_SAISIE: 'bg-wine-50 text-wine-600',
  SOMMATION: 'bg-brass-50 text-brass-700',
  MISE_EN_DEMEURE: 'bg-wine-50 text-wine-600',
  ASSIGNATION: 'bg-purple-50 text-purple-700',
  CONGE_BAIL: 'bg-purple-50 text-purple-700',
  SAISIE_ATTRIBUTION: 'bg-wine-50 text-wine-600',
  SAISIE_VENTE: 'bg-wine-50 text-wine-600',
  SIGNIFICATION_JUGEMENT: 'bg-navy-50 text-navy-700',
  LETTRE_MISSION: 'bg-emerald-50 text-emerald-700',
  PROCURATION: 'bg-emerald-50 text-emerald-700',
  CONVENTION_HONORAIRES: 'bg-emerald-50 text-emerald-700',
  ACCUSE_RECEPTION_DOSSIER: 'bg-gray-100 text-gray-600',
  AUTRE: 'bg-gray-100 text-gray-600',
};

export default function ActesList() {
  const user = useAuthStore((s) => s.user);
  const peutSupprimer = user?.role === 'HUISSIER';
  const [result, setResult] = useState<PaginatedResult<ActeListItem> | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeActe | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedResult<ActeListItem>>('/actes', {
        params: { search: search || undefined, type: type || undefined, page, limit: 20 },
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleExport() {
    setExporting(true);
    setErrorBanner(null);
    try {
      const tous: ActeListItem[] = [];
      let page_ = 1;
      let totalPages = 1;
      do {
        const { data } = await api.get<PaginatedResult<ActeListItem>>('/actes', {
          params: { search: search || undefined, type: type || undefined, page: page_, limit: 100 },
        });
        tous.push(...data.data);
        totalPages = data.pagination.totalPages;
        page_++;
      } while (page_ <= totalPages);

      exportToCsv('actes', tous, [
        { key: 'numero', label: "Numero d'acte" },
        { key: (a) => LABELS_TYPE_ACTE[a.type], label: 'Type' },
        { key: 'dossier_numero', label: 'Dossier' },
        { key: (a) => `${a.client_nom} ${a.client_prenom ?? ''}`.trim(), label: 'Client' },
        {
          key: (a) => (a.signataire_nom ? `${a.signataire_nom} ${a.signataire_prenom ?? ''}`.trim() : ''),
          label: 'Signataire',
        },
        {
          key: (a) => (a.notifie_par_nom ? `${a.notifie_par_nom} ${a.notifie_par_prenom ?? ''}`.trim() : ''),
          label: 'Notifie par',
        },
        { key: (a) => new Date(a.date_acte).toLocaleDateString('fr-FR'), label: 'Date' },
      ]);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? "Erreur lors de l'export CSV.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(a: ActeListItem) {
    if (!window.confirm(`Supprimer definitivement l'acte ${a.numero} ? Cette action est irreversible.`)) return;
    setDeletingId(a.id);
    setErrorBanner(null);
    try {
      await api.delete(`/actes/${a.id}`);
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
        icon={FileText}
        title="Actes"
        subtitle="Ensemble des actes generes par le cabinet, tous dossiers confondus. Pour en creer un nouveau, ouvrez le dossier concerne."
        accent="brass"
        action={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:border-brass-400 hover:text-brass-700 text-navy-700 text-sm font-medium rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
          >
            <Download size={16} /> {exporting ? 'Export…' : 'Exporter CSV'}
          </button>
        }
      />

      {errorBanner && (
        <div className="mb-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {errorBanner}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par numero d'acte, de dossier ou client…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
          />
        </form>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as TypeActe | '');
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
        >
          <option value="">Tous les types</option>
          {Object.entries(LABELS_TYPE_ACTE).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Numero d'acte</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Dossier</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Signataire</th>
              <th className="text-left px-4 py-3">Notifie par</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && result?.data.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState icon={FileText} title="Aucun acte genere" description="Les actes crees depuis vos dossiers apparaitront ici." />
                </td>
              </tr>
            )}
            {result?.data.map((a) => {
              const estActeProcedure = TYPES_ACTE_PROCEDURE.includes(a.type);
              return (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-nums text-navy-900 font-semibold">{a.numero}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_TINT[a.type]}`}>
                      {LABELS_TYPE_ACTE[a.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/dossiers/${a.dossier_id}`} className="font-nums text-navy-700 hover:underline hover:text-brass-700">
                      {a.dossier_numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.client_nom} {a.client_prenom ?? ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.signataire_nom ? `${a.signataire_nom} ${a.signataire_prenom ?? ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.notifie_par_nom ? (
                      <span className="inline-flex items-center gap-1">
                        <UserCheck size={12} className="text-navy-500" />
                        {a.notifie_par_nom} {a.notifie_par_prenom}
                      </span>
                    ) : estActeProcedure ? (
                      <span className="text-gray-300">Non notifie</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(a.date_acte).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => telechargerActePdf(a.id, a.numero)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 border border-gray-200 rounded-lg px-2 py-1 hover:border-brass-400 hover:text-brass-700 transition-colors"
                      >
                        <Download size={12} /> PDF
                      </button>
                      {peutSupprimer && (
                        <button
                          onClick={() => handleDelete(a)}
                          disabled={deletingId === a.id}
                          title="Supprimer cet acte"
                          className="text-gray-400 hover:text-wine-600 disabled:opacity-40 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
    </div>
  );
}

