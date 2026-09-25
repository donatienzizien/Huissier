import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Receipt, Wallet, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { telechargerFacturePdf } from '../../lib/pdf';
import { exportToCsv } from '../../lib/csv';
import { useAuthStore } from '../../store/auth';
import { Facture, PaginatedResult, LABELS_STATUT_FACTURE, StatutFacture, TauxRecouvrement } from '../../types';
import { SOLID, BORDER_TOP } from '../../lib/theme';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

function formatFCFA(n: string | number) {
  return new Intl.NumberFormat('fr-FR').format(Number(n)) + ' FCFA';
}

function RowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-100 animate-pulse ml-auto" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-6 w-12 rounded bg-gray-100 animate-pulse ml-auto" /></td>
    </tr>
  );
}

export default function FacturesList() {
  const user = useAuthStore((s) => s.user);
  const peutVoirFinances = user?.role === 'HUISSIER' || user?.role === 'COMPTABLE';

  const [result, setResult] = useState<PaginatedResult<Facture> | null>(null);
  const [statut, setStatut] = useState<StatutFacture | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [recouvrement, setRecouvrement] = useState<TauxRecouvrement | null>(null);
  const [loadingStats, setLoadingStats] = useState(peutVoirFinances);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedResult<Facture>>('/factures', {
        params: { statut: statut || undefined, page, limit: 20 },
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statut]);

  useEffect(() => {
    if (!peutVoirFinances) return;
    api
      .get<TauxRecouvrement>('/rapports/taux-recouvrement')
      .then(({ data }) => setRecouvrement(data))
      .catch(() => undefined)
      .finally(() => setLoadingStats(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExport() {
    setExporting(true);
    setErrorBanner(null);
    try {
      const toutes: Facture[] = [];
      let page_ = 1;
      let totalPages = 1;
      do {
        const { data } = await api.get<PaginatedResult<Facture>>('/factures', {
          params: { statut: statut || undefined, page: page_, limit: 100 },
        });
        toutes.push(...data.data);
        totalPages = data.pagination.totalPages;
        page_++;
      } while (page_ <= totalPages);

      exportToCsv('factures', toutes, [
        { key: 'numero', label: 'Numero' },
        { key: (f) => `${f.client_nom ?? ''} ${f.client_prenom ?? ''}`.trim(), label: 'Client' },
        { key: (f) => f.dossier_numero ?? '', label: 'Dossier' },
        { key: (f) => Number(f.montant_total), label: 'Montant total (FCFA)' },
        { key: (f) => Number(f.montant_paye), label: 'Montant regle (FCFA)' },
        { key: (f) => LABELS_STATUT_FACTURE[f.statut], label: 'Statut' },
        { key: (f) => new Date(f.date_emission).toLocaleDateString('fr-FR'), label: 'Emission' },
      ]);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? "Erreur lors de l'export CSV.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={Receipt}
        title="Facturation & paiements"
        subtitle="Les factures se creent depuis la fiche d'un dossier (bouton « Nouvelle facture »)."
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

      {peutVoirFinances && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {loadingStats ? (
            <>
              <div className="rounded-xl bg-gray-100 animate-pulse h-[100px]" />
              <div className="rounded-xl bg-gray-100 animate-pulse h-[100px]" />
              <div className="rounded-xl bg-gray-100 animate-pulse h-[100px]" />
            </>
          ) : (
            <>
              <div className={`${SOLID.navy} rounded-xl p-4 shadow-md relative overflow-hidden`}>
                <Wallet size={54} className="absolute -right-2 -bottom-2 text-white/10" strokeWidth={1.2} />
                <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center mb-3 relative">
                  <Wallet size={17} className="text-white" />
                </div>
                <p className="text-xs text-white/75 uppercase tracking-wide font-medium relative">Total facture</p>
                <p className="font-nums text-xl text-white mt-1 font-semibold relative">
                  {formatFCFA(recouvrement?.totalFacture ?? 0)}
                </p>
              </div>
              <div className={`${SOLID.green} rounded-xl p-4 shadow-md relative overflow-hidden`}>
                <TrendingUp size={54} className="absolute -right-2 -bottom-2 text-white/10" strokeWidth={1.2} />
                <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center mb-3 relative">
                  <TrendingUp size={17} className="text-white" />
                </div>
                <p className="text-xs text-white/75 uppercase tracking-wide font-medium relative">Total encaisse</p>
                <p className="font-nums text-xl text-white mt-1 font-semibold relative">
                  {formatFCFA(recouvrement?.totalEncaisse ?? 0)}
                </p>
              </div>
              <div className={`${SOLID.gold} rounded-xl p-4 shadow-md relative overflow-hidden`}>
                <PieChartIcon size={54} className="absolute -right-2 -bottom-2 text-white/10" strokeWidth={1.2} />
                <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center mb-3 relative">
                  <PieChartIcon size={17} className="text-white" />
                </div>
                <p className="text-xs text-white/75 uppercase tracking-wide font-medium relative">Taux de recouvrement</p>
                <p className="font-nums text-xl text-white mt-1 font-semibold relative">
                  {recouvrement?.tauxPourcentage ?? 0}%
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {errorBanner && (
        <div className="mb-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {errorBanner}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value as StatutFacture | '');
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(LABELS_STATUT_FACTURE).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.brass} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Numero</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Dossier</th>
              <th className="text-right px-4 py-3">Montant</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <>
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </>
            )}
            {!loading && result?.data.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon={Receipt} title="Aucune facture" description="Creez une facture depuis la fiche d'un dossier." />
                </td>
              </tr>
            )}
            {result?.data.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/facturation/${f.id}`} className="font-nums text-navy-700 font-semibold hover:underline hover:text-brass-700">
                    {f.numero}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {f.client_nom} {f.client_prenom ?? ''}
                </td>
                <td className="px-4 py-3 text-gray-600 font-nums">{f.dossier_numero}</td>
                <td className="px-4 py-3 text-right font-nums text-gray-700">
                  {formatFCFA(f.montant_paye)}{' '}
                  <span className="text-gray-400">/</span>{' '}
                  <span className="font-semibold text-brass-700">{formatFCFA(f.montant_total)}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge statut={f.statut} label={LABELS_STATUT_FACTURE[f.statut]} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => telechargerFacturePdf(f.id, f.numero)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 border border-gray-200 rounded-lg px-2 py-1 hover:border-brass-400 hover:text-brass-700 transition-colors"
                  >
                    <Download size={12} /> PDF
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
    </div>
  );
}
