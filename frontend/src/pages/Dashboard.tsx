import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Coins,
  FileText,
  CalendarClock,
  ArrowRight,
  FolderSearch,
  CalendarDays,
  BarChart3,
  Wallet,
  TrendingUp,
  PieChart as PieChartIcon,
  BellRing,
  AlertTriangle,
  Clock,
  Inbox,
  Receipt,
  RefreshCw,
  HandCoins,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';
import {
  getTableauDeBordRecouvrement,
  TableauDeBordRecouvrement,
} from '../lib/recouvrement';
import {
  CaMensuel,
  DashboardKpis,
  Dossier,
  Facture,
  Evenement,
  LABELS_STATUT_DOSSIER,
  LABELS_TYPE_DOSSIER,
  LABELS_STATUT_FACTURE,
  PaginatedResult,
  RepartitionStatutDossier,
  RepartitionTypeDossier,
  StatutDossier,
  TauxRecouvrement,
} from '../types';
import { SOLID, TINT_BG, TINT_TEXT, BORDER_TOP } from '../lib/theme';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';

interface AlerteDashboard {
  id: string;
  type: 'FACTURE_EN_RETARD' | 'FACTURE_ECHEANCE_PROCHE' | 'ECHEANCE_AGENDA';
  titre: string;
  message: string;
  lien: string;
  date: string;
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function formatMoisCourt(mois: string) {
  const [annee, m] = mois.split('-');
  const date = new Date(Number(annee), Number(m) - 1, 1);
  const libelle = date.toLocaleDateString('fr-FR', { month: 'short' });
  return libelle.charAt(0).toUpperCase() + libelle.slice(1).replace('.', '');
}

function formatDateComplete() {
  const libelle = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return libelle.charAt(0).toUpperCase() + libelle.slice(1);
}

function formatJourCourt(dateIso: string) {
  const d = new Date(dateIso);
  const jour = d.getDate();
  const mois = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return { jour, mois, heure };
}

const COULEURS_STATUT: Record<StatutDossier, string> = {
  OUVERT: '#10B981',
  EN_COURS: '#B08D3E',
  CLOTURE: '#14213D',
  ARCHIVE: '#B3AA92',
};

const ICONES_ALERTE: Record<AlerteDashboard['type'], typeof AlertTriangle> = {
  FACTURE_EN_RETARD: AlertTriangle,
  FACTURE_ECHEANCE_PROCHE: Clock,
  ECHEANCE_AGENDA: CalendarClock,
};

const TEINTES_ALERTE: Record<AlerteDashboard['type'], string> = {
  FACTURE_EN_RETARD: 'bg-wine-50 text-wine-600',
  FACTURE_ECHEANCE_PROCHE: TINT_BG.gold + ' ' + TINT_TEXT.gold,
  ECHEANCE_AGENDA: TINT_BG.navy + ' ' + TINT_TEXT.navy,
};

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <div style={{ height }} className="rounded-lg bg-gray-100 animate-pulse" />;
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-3 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/5 rounded bg-gray-100 animate-pulse" />
            <div className="h-2.5 w-2/5 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          <div className="h-3 w-2/5 rounded bg-gray-100 animate-pulse mb-2" />
          <div className="h-2 w-full rounded-full bg-gray-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function AgendaSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const peutVoirFinances = user?.role === 'HUISSIER' || user?.role === 'COMPTABLE';

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreurKpis, setErreurKpis] = useState<string | null>(null);

  const [caMensuel, setCaMensuel] = useState<CaMensuel[]>([]);
  const [dossiersParStatut, setDossiersParStatut] = useState<RepartitionStatutDossier[]>([]);
  const [dossiersParType, setDossiersParType] = useState<RepartitionTypeDossier[]>([]);
  const [tauxRecouvrement, setTauxRecouvrement] = useState<TauxRecouvrement | null>(null);
  const [dernieresFactures, setDernieresFactures] = useState<Facture[]>([]);
  const [loadingFinances, setLoadingFinances] = useState(peutVoirFinances);

  const [alertes, setAlertes] = useState<AlerteDashboard[]>([]);
  const [loadingAlertes, setLoadingAlertes] = useState(true);
  const [derniersDossiers, setDerniersDossiers] = useState<Dossier[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(true);
  const [prochainsEvenements, setProchainsEvenements] = useState<Evenement[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);

  const [recouvrement, setRecouvrement] =
    useState<TableauDeBordRecouvrement | null>(null);
  const [loadingRecouvrement, setLoadingRecouvrement] = useState(true);

  const chargerKpis = useCallback(() => {
    setLoading(true);
    setErreurKpis(null);
    api
      .get<DashboardKpis>('/rapports/dashboard')
      .then(({ data }) => setKpis(data))
      .catch(() => setErreurKpis('Impossible de charger les indicateurs. Verifiez votre connexion.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    chargerKpis();

    getTableauDeBordRecouvrement()
      .then(setRecouvrement)
      .catch(() => undefined)
      .finally(() => setLoadingRecouvrement(false));

    api
      .get<AlerteDashboard[]>('/alertes')
      .then(({ data }) => setAlertes(data.slice(0, 5)))
      .catch(() => undefined)
      .finally(() => setLoadingAlertes(false));

    api
      .get<PaginatedResult<Dossier>>('/dossiers', { params: { page: 1, limit: 5 } })
      .then(({ data }) => setDerniersDossiers(data.data))
      .catch(() => undefined)
      .finally(() => setLoadingDossiers(false));

    api
      .get<Evenement[]>('/agenda')
      .then(({ data }) => {
        const maintenant = Date.now();
        const dansQuatorzeJours = maintenant + 14 * 24 * 3600 * 1000;
        const prochains = data
          .filter((e) => {
            const t = new Date(e.date_debut).getTime();
            return t >= maintenant - 3600 * 1000 && t <= dansQuatorzeJours;
          })
          .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime())
          .slice(0, 5);
        setProchainsEvenements(prochains);
      })
      .catch(() => undefined)
      .finally(() => setLoadingAgenda(false));

    if (!peutVoirFinances) return;

    Promise.all([
      api.get<CaMensuel[]>('/rapports/chiffre-affaires-mensuel'),
      api.get<RepartitionStatutDossier[]>('/rapports/dossiers-par-statut'),
      api.get<RepartitionTypeDossier[]>('/rapports/dossiers-par-type'),
      api.get<TauxRecouvrement>('/rapports/taux-recouvrement'),
      api.get<PaginatedResult<Facture>>('/factures', { params: { page: 1, limit: 5 } }),
    ])
      .then(([ca, statut, type, taux, factures]) => {
        setCaMensuel(ca.data);
        setDossiersParStatut(statut.data);
        setDossiersParType(type.data);
        setTauxRecouvrement(taux.data);
        setDernieresFactures(factures.data.data);
      })
      .catch(() => undefined)
      .finally(() => setLoadingFinances(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargerKpis]);

  const cards = [
    {
      label: 'Dossiers actifs',
      value: loading ? '—' : String(kpis?.dossiersActifs ?? 0),
      icon: FolderOpen,
      color: 'navy' as const,
      to: '/dossiers',
    },
    {
      label: "Chiffre d'affaires (mois)",
      value: loading ? '—' : formatFCFA(kpis?.chiffreAffairesMois ?? 0),
      icon: Coins,
      color: 'brass' as const,
      to: '/rapports',
    },
    {
      label: 'Actes generes (mois)',
      value: loading ? '—' : String(kpis?.actesGeneresMois ?? 0),
      icon: FileText,
      color: 'green' as const,
      to: '/actes',
    },
    {
      label: "Rendez-vous aujourd'hui",
      value: loading ? '—' : String(kpis?.rendezVousAujourdhui ?? 0),
      icon: CalendarClock,
      color: 'wine' as const,
      to: '/agenda',
    },
  ];

  const secondaryStats = [
    {
      label: 'Total facture',
      value: loadingFinances ? '—' : formatFCFA(tauxRecouvrement?.totalFacture ?? 0),
      icon: Wallet,
      color: 'navy' as const,
    },
    {
      label: 'Total encaisse',
      value: loadingFinances ? '—' : formatFCFA(tauxRecouvrement?.totalEncaisse ?? 0),
      icon: TrendingUp,
      color: 'green' as const,
    },
    {
      label: 'Taux de recouvrement',
      value: loadingFinances ? '—' : `${tauxRecouvrement?.tauxPourcentage ?? 0}%`,
      icon: PieChartIcon,
      color: 'gold' as const,
    },
  ];

  const links = [
    {
      to: '/dossiers',
      label: 'Voir les dossiers',
      desc: 'Consulter, filtrer, ouvrir un nouveau dossier',
      icon: FolderSearch,
      color: 'navy' as const,
    },
    {
      to: '/agenda',
      label: "Consulter l'agenda",
      desc: 'Rendez-vous et rappels des 30 prochains jours',
      icon: CalendarDays,
      color: 'wine' as const,
    },
    {
      to: '/rapports',
      label: 'Voir les rapports',
      desc: "Chiffre d'affaires, recouvrement, repartition",
      icon: BarChart3,
      color: 'brass' as const,
    },
  ];

  const donneesGraphiqueCa = caMensuel.map((c) => ({ mois: formatMoisCourt(c.mois), total: Number(c.total) }));
  const donneesDonut = dossiersParStatut
    .filter((d) => Number(d.total) > 0)
    .map((d) => ({
      nom: LABELS_STATUT_DOSSIER[d.statut],
      valeur: Number(d.total),
      couleur: COULEURS_STATUT[d.statut],
    }));
  const totalDossiersParType = dossiersParType.reduce((s, d) => s + Number(d.total), 0);
  const dossiersParTypeTries = [...dossiersParType]
    .filter((d) => Number(d.total) > 0)
    .sort((a, b) => Number(b.total) - Number(a.total));

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title={`Bonjour ${user?.nom ?? ''} 👋`}
        subtitle={`Voici l'apercu de votre cabinet — ${formatDateComplete()}.`}
      />

      {erreurKpis && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-3">
          <span>{erreurKpis}</span>
          <button onClick={chargerKpis} className="flex items-center gap-1.5 font-medium hover:underline shrink-0 ml-3">
            <RefreshCw size={13} /> Reessayer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`${SOLID[kpi.color]} rounded-xl p-5 shadow-md relative overflow-hidden`}>
              <Icon size={90} className="absolute -right-4 -bottom-4 text-white/10" strokeWidth={1.2} />
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 text-white mb-4 relative">
                <Icon size={19} />
              </div>
              <p className="text-xs uppercase tracking-wide text-white/75 font-medium relative">{kpi.label}</p>
              <p className="font-nums mt-1.5 font-semibold text-white text-xl relative">{kpi.value}</p>
              <Link
                to={kpi.to}
                className="inline-flex items-center gap-1 text-xs text-white/85 hover:text-white mt-3 hover:underline relative"
              >
                Voir tout <ArrowRight size={11} />
              </Link>
            </div>
          );
        })}
      </div>      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <section className={`rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.wine} bg-white p-5 shadow-sm transition-shadow hover:shadow-md`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TINT_BG.wine} ${TINT_TEXT.wine}`}>
                <HandCoins size={17} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-navy-900">Situation recouvrement</h2>
                <p className="text-xs text-gray-500">Encours et priorités à traiter</p>
              </div>
            </div>
            <Link
              to="/recouvrement/tableau-de-bord"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-wine-700 hover:text-wine-900 hover:underline"
            >
              Détails <ArrowRight size={12} />
            </Link>
          </div>

          {loadingRecouvrement ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-navy-50 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-navy-600">Solde à recouvrer</p>
                <p className="mt-1 font-nums text-base font-semibold text-navy-900">
                  {formatFCFA(recouvrement?.synthese.soldeRestantTotal ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-wine-50 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-wine-600">Montant échu</p>
                <p className="mt-1 font-nums text-base font-semibold text-wine-700">
                  {formatFCFA(recouvrement?.synthese.montantEchu ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-gold-50 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gold-700">Créances échues</p>
                <p className="mt-1 font-nums text-xl font-semibold text-gold-800">
                  {recouvrement?.synthese.nombreCreancesEchues ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-brass-50 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-brass-700">Actions échues</p>
                <p className="mt-1 font-nums text-xl font-semibold text-brass-800">
                  {recouvrement?.synthese.nombreActionsEchues ?? 0}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className={`rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.gold} bg-white p-5 shadow-sm transition-shadow hover:shadow-md`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TINT_BG.gold} ${TINT_TEXT.gold}`}>
                <PieChartIcon size={17} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-navy-900">Balance âgée</h2>
                <p className="text-xs text-gray-500">Ancienneté du solde restant</p>
              </div>
            </div>
            <Link
              to="/recouvrement/tableau-de-bord"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gold-700 hover:text-gold-900 hover:underline"
            >
              Voir le détail <ArrowRight size={12} />
            </Link>
          </div>

          {loadingRecouvrement ? (
            <div className="mt-5">
              <BarsSkeleton rows={5} />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {[
                { label: 'À échoir', value: recouvrement?.balanceAgee.aEchoir ?? 0, color: 'bg-navy-700' },
                { label: '1 à 30 jours', value: recouvrement?.balanceAgee.retard1a30 ?? 0, color: 'bg-gold-600' },
                { label: '31 à 60 jours', value: recouvrement?.balanceAgee.retard31a60 ?? 0, color: 'bg-amber-600' },
                { label: '61 à 90 jours', value: recouvrement?.balanceAgee.retard61a90 ?? 0, color: 'bg-wine-600' },
                { label: '90 jours et plus', value: recouvrement?.balanceAgee.retard90Plus ?? 0, color: 'bg-red-800' },
              ].map((tranche) => {
                const total = recouvrement?.synthese.soldeRestantTotal ?? 0;
                const largeur = total > 0 ? Math.min((tranche.value / total) * 100, 100) : 0;

                return (
                  <div key={tranche.label}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-600">{tranche.label}</span>
                      <span className="font-nums text-xs font-medium text-navy-800">
                        {formatFCFA(tranche.value)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${tranche.color}`}
                        style={{ width: `${largeur}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {peutVoirFinances && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className={`lg:col-span-2 bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.brass} p-5 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-9 h-9 rounded-md ${TINT_BG.brass} ${TINT_TEXT.brass} shrink-0`}>
                  <TrendingUp size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">Chiffre d'affaires — 6 derniers mois</p>
                  <p className="text-xs text-gray-500 mt-0.5">Montants encaisses par mois</p>
                </div>
              </div>
              <Link
                to="/rapports"
                className="text-xs text-brass-700 hover:text-brass-900 font-medium hover:underline shrink-0"
              >
                Voir les rapports
              </Link>
            </div>
            {loadingFinances ? (
              <ChartSkeleton height={260} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={donneesGraphiqueCa} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="degradeCa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B08D3E" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#B08D3E" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D6" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#6B6252' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B6252' }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={(v) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatFCFA(value), 'Encaisse']}
                    contentStyle={{ borderRadius: 8, borderColor: '#E7E2D6', fontSize: 13 }}
                    cursor={{ stroke: '#D2B767', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#14213D"
                    strokeWidth={2.5}
                    fill="url(#degradeCa)"
                    activeDot={{ r: 5, fill: '#14213D', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.navy} p-5 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3 mb-1">
              <div className={`flex items-center justify-center w-9 h-9 rounded-md ${TINT_BG.navy} ${TINT_TEXT.navy} shrink-0`}>
                <PieChartIcon size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">Repartition des dossiers</p>
                <p className="text-xs text-gray-500">Par statut</p>
              </div>
            </div>
            {loadingFinances ? (
              <ChartSkeleton height={260} />
            ) : donneesDonut.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">Aucun dossier pour le moment.</div>
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={donneesDonut}
                      dataKey="valeur"
                      nameKey="nom"
                      innerRadius={58}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {donneesDonut.map((entree) => (
                        <Cell key={entree.nom} fill={entree.couleur} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E7E2D6', fontSize: 13 }} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: 36 }}>
                  <p className="text-2xl font-bold font-nums text-navy-900">
                    {donneesDonut.reduce((somme, d) => somme + d.valeur, 0)}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Dossiers</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {peutVoirFinances && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.green} p-5 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex items-center justify-center w-9 h-9 rounded-md ${TINT_BG.green} ${TINT_TEXT.green} shrink-0`}>
                <BarChart3 size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">Dossiers par type</p>
                <p className="text-xs text-gray-500">Repartition de l'activite du cabinet</p>
              </div>
            </div>
            {loadingFinances ? (
              <BarsSkeleton rows={4} />
            ) : dossiersParTypeTries.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Aucun dossier pour le moment.</p>
            ) : (
              <ul className="space-y-3">
                {dossiersParTypeTries.map((d) => {
                  const total = Number(d.total);
                  const pourcentage = totalDossiersParType > 0 ? Math.round((total / totalDossiersParType) * 100) : 0;
                  return (
                    <li key={d.type}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-navy-900 font-medium">{LABELS_TYPE_DOSSIER[d.type]}</span>
                        <span className="text-gray-500 font-nums">{total} · {pourcentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700"
                          style={{ width: `${pourcentage}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.gold} shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between p-5 pb-3">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-9 h-9 rounded-md ${TINT_BG.gold} ${TINT_TEXT.gold} shrink-0`}>
                  <Receipt size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">Dernieres factures</p>
                  <p className="text-xs text-gray-500">Les 5 factures les plus recentes</p>
                </div>
              </div>
              <Link to="/facturation" className="text-xs text-gold-700 hover:text-gold-900 font-medium hover:underline shrink-0">
                Voir tout
              </Link>
            </div>
            <div className="px-2 pb-2">
              {loadingFinances ? (
                <ListSkeleton rows={4} />
              ) : dernieresFactures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Inbox size={22} className="mb-2" />
                  <p className="text-sm">Aucune facture pour le moment.</p>
                </div>
              ) : (
                <ul>
                  {dernieresFactures.map((f) => (
                    <li key={f.id}>
                      <Link
                        to={`/facturation/${f.id}`}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-navy-900 truncate">{f.numero}</span>
                          <span className="block text-xs text-gray-500 truncate">
                            {f.client_nom ?? ''} {f.client_prenom ?? ''} · {formatFCFA(Number(f.montant_total))}
                          </span>
                        </span>
                        <Badge statut={f.statut} label={LABELS_STATUT_FACTURE[f.statut]} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {peutVoirFinances && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {secondaryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`${SOLID[stat.color]} rounded-xl p-4 shadow-md relative overflow-hidden`}>
                <Icon size={64} className="absolute -right-3 -bottom-3 text-white/10" strokeWidth={1.2} />
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-white/20 text-white mb-3 relative">
                  <Icon size={18} />
                </div>
                <p className="text-xs uppercase tracking-wide text-white/75 font-medium relative">{stat.label}</p>
                <p className="font-nums mt-1 text-xl font-semibold text-white relative">{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.wine} shadow-sm hover:shadow-md transition-shadow`}>
          <div className="flex items-center gap-3 p-5 pb-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-md ${TINT_BG.wine} ${TINT_TEXT.wine} shrink-0`}>
              <BellRing size={17} />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">Alertes a traiter</p>
              <p className="text-xs text-gray-500">Echeances proches, retards, rendez-vous</p>
            </div>
          </div>
          <div className="px-2 pb-2">
            {loadingAlertes ? (
              <ListSkeleton rows={4} />
            ) : alertes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Inbox size={22} className="mb-2" />
                <p className="text-sm">Rien a signaler pour le moment.</p>
              </div>
            ) : (
              <ul>
                {alertes.map((a) => {
                  const Icon = ICONES_ALERTE[a.type];
                  return (
                    <li key={a.id}>
                      <Link
                        to={a.lien}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${TEINTES_ALERTE[a.type]}`}>
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-navy-900 truncate">{a.titre}</span>
                          <span className="block text-xs text-gray-500 truncate">{a.message}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.navy} shadow-sm hover:shadow-md transition-shadow`}>
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-9 h-9 rounded-md ${TINT_BG.navy} ${TINT_TEXT.navy} shrink-0`}>
                <FolderOpen size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">Derniers dossiers</p>
                <p className="text-xs text-gray-500">Les 5 dossiers les plus recents</p>
              </div>
            </div>
            <Link to="/dossiers" className="text-xs text-navy-700 hover:text-navy-900 font-medium hover:underline shrink-0">
              Voir tout
            </Link>
          </div>
          <div className="px-2 pb-2">
            {loadingDossiers ? (
              <ListSkeleton rows={4} />
            ) : derniersDossiers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Inbox size={22} className="mb-2" />
                <p className="text-sm">Aucun dossier pour le moment.</p>
              </div>
            ) : (
              <ul>
                {derniersDossiers.map((d) => (
                  <li key={d.id}>
                    <Link
                      to={`/dossiers/${d.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-navy-900 truncate">{d.numero}</span>
                        <span className="block text-xs text-gray-500 truncate">
                          {d.client_nom} {d.client_prenom ?? ''} · {LABELS_TYPE_DOSSIER[d.type]}
                        </span>
                      </span>
                      <Badge statut={d.statut} label={LABELS_STATUT_DOSSIER[d.statut]} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.brass} shadow-sm hover:shadow-md transition-shadow mt-4`}>
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-md ${TINT_BG.brass} ${TINT_TEXT.brass} shrink-0`}>
              <CalendarDays size={17} />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">Prochains rendez-vous</p>
              <p className="text-xs text-gray-500">Les 14 prochains jours</p>
            </div>
          </div>
          <Link to="/agenda" className="text-xs text-brass-700 hover:text-brass-900 font-medium hover:underline shrink-0">
            Voir l'agenda
          </Link>
        </div>
        <div className="px-3 pb-4">
          {loadingAgenda ? (
            <AgendaSkeleton />
          ) : prochainsEvenements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Inbox size={22} className="mb-2" />
              <p className="text-sm">Aucun rendez-vous prevu dans les 14 prochains jours.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {prochainsEvenements.map((e) => {
                const { jour, mois, heure } = formatJourCourt(e.date_debut);
                return (
                  <Link
                    key={e.id}
                    to={e.dossier_id ? `/dossiers/${e.dossier_id}` : '/agenda'}
                    className="flex items-start gap-3 rounded-lg border border-brass-100 bg-brass-50/40 p-3 hover:bg-brass-50 hover:border-brass-200 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-brass-600 text-white shrink-0">
                      <span className="text-base font-bold leading-none font-nums">{jour}</span>
                      <span className="text-[9px] uppercase tracking-wide leading-none mt-0.5">{mois}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">{e.titre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{heure}</p>
                      {e.dossier_numero && <p className="text-xs text-brass-700 truncate mt-0.5">{e.dossier_numero}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {links.map(({ to, label, desc, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className={`group ${SOLID[color]} rounded-lg p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden`}
          >
            <Icon size={60} className="absolute -right-2 -bottom-2 text-white/10" strokeWidth={1.2} />
            <div className="flex items-start justify-between relative">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-white/20 text-white">
                <Icon size={18} />
              </div>
              <ArrowRight
                size={16}
                className="text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all mt-1.5"
              />
            </div>
            <p className="text-sm font-semibold text-white mt-3 relative">{label}</p>
            <p className="text-xs text-white/75 mt-1 relative">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
