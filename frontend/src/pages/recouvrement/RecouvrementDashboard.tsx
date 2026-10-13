import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  HandCoins,
  Inbox,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import PageHeader from '../../components/PageHeader';
import {
  getTableauDeBordRecouvrement,
  TableauDeBordRecouvrement,
} from '../../lib/recouvrement';
import {
  BORDER_TOP,
  SOLID,
  TINT_BG,
  TINT_TEXT,
} from '../../lib/theme';

function formatFCFA(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-80 rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-80 rounded-xl bg-gray-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-72 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

export default function RecouvrementDashboard() {
  const [data, setData] = useState<TableauDeBordRecouvrement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    getTableauDeBordRecouvrement()
      .then(setData)
      .catch((err: any) => {
        setError(
          err.response?.data?.message?.toString() ??
            'Impossible de charger le tableau de bord de recouvrement.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const balanceAgee = useMemo(
    () => [
      {
        nom: 'À échoir',
        valeur: data?.balanceAgee.aEchoir ?? 0,
        couleur: '#14213D',
      },
      {
        nom: '1–30 jours',
        valeur: data?.balanceAgee.retard1a30 ?? 0,
        couleur: '#B08D3E',
      },
      {
        nom: '31–60 jours',
        valeur: data?.balanceAgee.retard31a60 ?? 0,
        couleur: '#D97706',
      },
      {
        nom: '61–90 jours',
        valeur: data?.balanceAgee.retard61a90 ?? 0,
        couleur: '#8B1E3F',
      },
      {
        nom: '90+ jours',
        valeur: data?.balanceAgee.retard90Plus ?? 0,
        couleur: '#7F1D1D',
      },
    ].filter((tranche) => tranche.valeur > 0),
    [data],
  );

  const soldeTotal = data?.synthese.soldeRestantTotal ?? 0;

  const cards = [
    {
      label: 'Solde à recouvrer',
      value: formatFCFA(soldeTotal),
      icon: Wallet,
      color: 'navy' as const,
    },
    {
      label: 'Montant échu',
      value: formatFCFA(data?.synthese.montantEchu ?? 0),
      icon: AlertTriangle,
      color: 'wine' as const,
    },
    {
      label: 'Créances en cours',
      value: String(data?.synthese.nombreCreancesEnCours ?? 0),
      icon: HandCoins,
      color: 'gold' as const,
    },
    {
      label: 'Créances échues',
      value: String(data?.synthese.nombreCreancesEchues ?? 0),
      icon: Clock3,
      color: 'brass' as const,
    },
    {
      label: 'Actions échues',
      value: String(data?.synthese.nombreActionsEchues ?? 0),
      icon: BellRing,
      color: 'wine' as const,
    },
    {
      label: 'Montant encaissé',
      value: formatFCFA(data?.synthese.montantEncaisseTotal ?? 0),
      icon: TrendingUp,
      color: 'green' as const,
    },
    {
      label: 'Taux d’encaissement',
      value:
        data && data.synthese.montantInitialTotal > 0
          ? `${Math.round(
              (data.synthese.montantEncaisseTotal /
                data.synthese.montantInitialTotal) *
                100,
            )}%`
          : '0%',
      icon: CheckCircle2,
      color: 'gold' as const,
    },
  ];

  return (
    <div>
      <PageHeader
        icon={HandCoins}
        title="Tableau de bord recouvrement"
        subtitle="Suivez les encours, retards, actions à traiter et débiteurs prioritaires."
        accent="gold"
        action={
          <Link
            to="/recouvrement"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-navy-800 hover:shadow-md"
          >
            Voir les créances <ArrowRight size={16} />
          </Link>
        }
      />

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-wine-100 bg-wine-50 px-4 py-3 text-sm text-wine-600">
          <span>{error}</span>
          <button
            onClick={load}
            className="inline-flex shrink-0 items-center gap-1.5 font-medium hover:underline"
          >
            <RefreshCw size={13} /> Réessayer
          </button>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  className={`${SOLID[card.color]} relative overflow-hidden rounded-xl p-5 shadow-md`}
                >
                  <Icon
                    size={78}
                    strokeWidth={1.2}
                    className="absolute -bottom-3 -right-3 text-white/10"
                  />
                  <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white">
                    <Icon size={19} />
                  </div>
                  <p className="relative text-xs font-medium uppercase tracking-wide text-white/75">
                    {card.label}
                  </p>
                  <p className="relative mt-1.5 font-nums text-xl font-semibold text-white">
                    {card.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section
              className={`rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.gold} bg-white p-5 shadow-sm transition-shadow hover:shadow-md`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TINT_BG.gold} ${TINT_TEXT.gold}`}
                >
                  <PieChartIcon size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-navy-900">
                    Balance âgée
                  </h2>
                  <p className="text-xs text-gray-500">
                    Répartition du solde restant par ancienneté
                  </p>
                </div>
              </div>

              {balanceAgee.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-gray-400">
                  <Inbox size={24} className="mb-2" />
                  <p className="text-sm">Aucune créance à recouvrer.</p>
                </div>
              ) : (
                <div className="relative mt-2">
                  <ResponsiveContainer width="100%" height={270}>
                    <PieChart>
                      <Pie
                        data={balanceAgee}
                        dataKey="valeur"
                        nameKey="nom"
                        innerRadius={60}
                        outerRadius={88}
                        paddingAngle={3}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {balanceAgee.map((tranche) => (
                          <Cell key={tranche.nom} fill={tranche.couleur} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          formatFCFA(value),
                          'Solde',
                        ]}
                        contentStyle={{
                          borderRadius: 8,
                          borderColor: '#E7E2D6',
                          fontSize: 13,
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span className="text-xs text-gray-600">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                    style={{ paddingBottom: 36 }}
                  >
                    <p className="font-nums text-xl font-bold text-navy-900">
                      {formatFCFA(soldeTotal)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      À recouvrer
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section
              className={`rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.navy} bg-white shadow-sm transition-shadow hover:shadow-md`}
            >
              <div className="flex items-center gap-3 p-5 pb-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TINT_BG.navy} ${TINT_TEXT.navy}`}
                >
                  <BellRing size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-navy-900">
                    Actions à traiter
                  </h2>
                  <p className="text-xs text-gray-500">
                    Prochaines actions de relance planifiées
                  </p>
                </div>
              </div>

              <div className="px-2 pb-2">
                {data?.prochainesActions.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-gray-400">
                    <BellRing size={24} className="mb-2" />
                    <p className="text-sm">Aucune action planifiée.</p>
                  </div>
                ) : (
                  <ul>
                    {data?.prochainesActions.map((action) => (
                      <li key={action.creanceId}>
                        <Link
                          to={`/recouvrement/${action.creanceId}`}
                          className="flex items-start justify-between gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-gray-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-navy-900">
                              {action.creanceNumero} · {action.creanceLibelle}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-gray-500">
                              {action.debiteurNom ?? 'Débiteur non renseigné'}{' '}
                              {action.debiteurPrenom ?? ''} ·{' '}
                              {action.prochaineAction}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-xs font-medium text-gold-700">
                              {formatDate(action.prochaineActionLe)}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500">
                              {action.joursRetard > 0
                                ? `${action.joursRetard} j de retard`
                                : formatFCFA(action.soldeRestant)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <section
            className={`mt-4 rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.wine} bg-white shadow-sm transition-shadow hover:shadow-md`}
          >
            <div className="flex items-center justify-between gap-3 p-5 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TINT_BG.wine} ${TINT_TEXT.wine}`}
                >
                  <Users size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-navy-900">
                    Débiteurs prioritaires
                  </h2>
                  <p className="text-xs text-gray-500">
                    Classés par montant échu puis solde restant
                  </p>
                </div>
              </div>
              <Link
                to="/debiteurs"
                className="text-xs font-medium text-wine-700 hover:text-wine-900 hover:underline"
              >
                Voir les débiteurs
              </Link>
            </div>

            <div className="overflow-x-auto px-2 pb-2">
              {data?.debiteursPrioritaires.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center text-gray-400">
                  <Users size={24} className="mb-2" />
                  <p className="text-sm">Aucun débiteur prioritaire.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-wine-50 text-xs uppercase tracking-wide text-wine-700">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Débiteur</th>
                      <th className="px-3 py-2.5 text-right">Créances</th>
                      <th className="px-3 py-2.5 text-right">Solde restant</th>
                      <th className="px-3 py-2.5 text-right">Montant échu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data?.debiteursPrioritaires.map((debiteur) => (
                      <tr key={debiteur.debiteurId} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium text-navy-900">
                          {debiteur.debiteurNom ?? '—'}{' '}
                          {debiteur.debiteurPrenom ?? ''}
                        </td>
                        <td className="px-3 py-3 text-right font-nums text-gray-600">
                          {debiteur.nombreCreances}
                        </td>
                        <td className="px-3 py-3 text-right font-nums font-medium text-navy-900">
                          {formatFCFA(debiteur.soldeRestant)}
                        </td>
                        <td className="px-3 py-3 text-right font-nums font-semibold text-wine-700">
                          {formatFCFA(debiteur.montantEchu)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
