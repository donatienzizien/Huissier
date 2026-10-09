import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, Download, HandCoins, Plus, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { exportToCsv } from '../../lib/csv';
import { getCreances } from '../../lib/recouvrement';
import { BORDER_TOP, SOLID } from '../../lib/theme';
import { useAuthStore } from '../../store/auth';
import {
  Creance,
  LABELS_STATUT_CREANCE,
  PaginatedResult,
  StatutCreance,
} from '../../types';

function formatFCFA(value: string | number) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(value))} FCFA`;
}

export default function CreancesList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dossierId = searchParams.get('dossierId') ?? '';
  const enRetard = searchParams.get('enRetard') === 'true';
  const user = useAuthStore((state) => state.user);
  const peutCreer = user?.role === 'HUISSIER' || user?.role === 'CLERC';

  const [result, setResult] = useState<PaginatedResult<Creance> | null>(null);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState<StatutCreance | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorBanner(null);
    try {
      const data = await getCreances({
        search: search || undefined,
        statut: statut || undefined,
        dossierId: dossierId || undefined,
        enRetard: enRetard ? 'true' : undefined,
        page,
        limit: 20,
      });
      setResult(data);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? 'Erreur de chargement des creances.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statut, dossierId, enRetard]);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    load();
  }

  async function handleExport() {
    setExporting(true);
    setErrorBanner(null);

    try {
      const toutes: Creance[] = [];
      let pageCourante = 1;
      let totalPages = 1;

      do {
        const data = await getCreances({
          search: search || undefined,
          statut: statut || undefined,
          dossierId: dossierId || undefined,
        enRetard: enRetard ? 'true' : undefined,
          page: pageCourante,
          limit: 100,
        });
        toutes.push(...data.data);
        totalPages = data.pagination.totalPages;
        pageCourante += 1;
      } while (pageCourante <= totalPages);

      exportToCsv('creances-recouvrement', toutes, [
        { key: 'numero', label: 'Numero' },
        { key: 'libelle', label: 'Libelle' },
        { key: (c) => c.dossier_numero ?? '', label: 'Dossier' },
        { key: (c) => `${c.debiteur_nom ?? ''} ${c.debiteur_prenom ?? ''}`.trim(), label: 'Debiteur' },
        { key: (c) => Number(c.montant_initial), label: 'Montant initial (FCFA)' },
        { key: (c) => LABELS_STATUT_CREANCE[c.statut], label: 'Statut' },
        {
          key: (c) =>
            c.date_exigibilite
              ? new Date(c.date_exigibilite).toLocaleDateString('fr-FR')
              : '',
          label: 'Exigibilite',
        },
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
        icon={HandCoins}
        title="Recouvrement"
        subtitle="Suivi des creances dues par les debiteurs dans les dossiers de recouvrement."
        accent="gold"
        action={
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:border-gold-400 hover:text-gold-700 text-navy-700 text-sm font-medium rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
            >
              <Download size={16} /> {exporting ? 'Export…' : 'Exporter CSV'}
            </button>
            {peutCreer && (
              <Link
                to="/dossiers?type=RECOUVREMENT"
                className="flex items-center gap-2 bg-gold-700 hover:bg-gold-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all"
              >
                <Plus size={16} /> Nouvelle creance
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className={`${SOLID.gold} rounded-xl p-4 shadow-md`}>
          <p className="text-xs text-white/75 uppercase tracking-wide font-medium">Creances affichees</p>
          <p className="font-nums text-xl text-white mt-1 font-semibold">{result?.pagination.total ?? 0}</p>
        </div>
        <div className={`${SOLID.navy} rounded-xl p-4 shadow-md`}>
          <p className="text-xs text-white/75 uppercase tracking-wide font-medium">Montant sur cette page</p>
          <p className="font-nums text-xl text-white mt-1 font-semibold">
            {formatFCFA(result?.data.reduce((total, c) => total + Number(c.montant_initial), 0) ?? 0)}
          </p>
        </div>
        <div className={`${SOLID.wine} rounded-xl p-4 shadow-md`}>
          <p className="text-xs text-white/75 uppercase tracking-wide font-medium">Creances actives</p>
          <p className="font-nums text-xl text-white mt-1 font-semibold">
            {result?.data.filter(
              (c) =>
                c.statut === 'ACTIVE' ||
                c.statut === 'PARTIELLEMENT_ENCAISSEE',
            ).length ?? 0}
          </p>
        </div>
      </div>

      {errorBanner && (
        <div className="mb-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {errorBanner}
        </div>
      )}

      {enRetard && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-wine-100 bg-wine-50 px-4 py-2 text-sm text-wine-700">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={16} />
            Affichage des créances en retard : échéance dépassée et créance non soldée.
          </span>
          <button
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('enRetard');
              setSearchParams(nextParams);
              setPage(1);
            }}
            className="text-xs font-medium underline hover:text-wine-950"
          >
            Afficher toutes les créances
          </button>
        </div>
      )}

      {dossierId && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold-200 bg-gold-50 px-4 py-2 text-sm text-gold-800">
          <span>Créances filtrées pour un dossier.</span>
          <button
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('dossierId');
              setSearchParams(nextParams);
              setPage(1);
            }}
            className="text-xs font-medium underline hover:text-gold-950"
          >
            Afficher toutes les créances
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[230px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Numero, libelle, dossier ou debiteur…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
          />
        </form>

        <button
          type="button"
          onClick={() => {
            const nextParams = new URLSearchParams(searchParams);

            if (enRetard) {
              nextParams.delete('enRetard');
            } else {
              nextParams.set('enRetard', 'true');
            }

            setSearchParams(nextParams);
            setPage(1);
          }}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            enRetard
              ? 'border-wine-700 bg-wine-700 text-white hover:bg-wine-800'
              : 'border-wine-200 bg-wine-50 text-wine-700 hover:border-wine-400 hover:bg-wine-100'
          }`}
        >
          <AlertTriangle size={15} />
          Créances en retard
        </button>

        <select
          value={statut}
          onChange={(event) => {
            setStatut(event.target.value as StatutCreance | '');
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(LABELS_STATUT_CREANCE).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.gold} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Numero</th>
              <th className="text-left px-4 py-3">Libelle</th>
              <th className="text-left px-4 py-3">Debiteur</th>
              <th className="text-left px-4 py-3">Dossier</th>
              <th className="text-right px-4 py-3">Montant</th>
              <th className="text-left px-4 py-3">Exigibilite</th>
              <th className="text-left px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            )}

            {!loading && result?.data.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={HandCoins}
                    title="Aucune creance"
                    description="Les creances se creent depuis un dossier de type Recouvrement."
                  />
                </td>
              </tr>
            )}

            {result?.data.map((creance) => (
              <tr key={creance.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    to={`/recouvrement/${creance.id}`}
                    className="font-nums text-navy-700 font-semibold hover:underline hover:text-gold-700"
                  >
                    {creance.numero}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{creance.libelle}</td>
                <td className="px-4 py-3 text-gray-600">
                  {creance.debiteur_nom} {creance.debiteur_prenom ?? ''}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/dossiers/${creance.dossier_id}`} className="font-nums text-gray-600 hover:text-navy-700 hover:underline">
                    {creance.dossier_numero}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-nums font-semibold text-gold-700">
                  {formatFCFA(creance.montant_initial)}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {creance.date_exigibilite
                    ? new Date(creance.date_exigibilite).toLocaleDateString('fr-FR')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge statut={creance.statut} label={LABELS_STATUT_CREANCE[creance.statut]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Page {result.pagination.page} sur {result.pagination.totalPages} ({result.pagination.total} resultats)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:border-gold-400 transition-colors"
            >
              Precedent
            </button>
            <button
              disabled={page >= result.pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:border-gold-400 transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
