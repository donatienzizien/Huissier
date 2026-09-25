import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, Wallet, TrendingUp, PieChart as PieChartIcon, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { telechargerRapportExcel, telechargerRapportPdf } from '../../lib/rapports';
import {
  CaMensuel,
  RepartitionStatutDossier,
  RepartitionTypeDossier,
  TauxRecouvrement,
  LABELS_STATUT_DOSSIER,
  LABELS_TYPE_DOSSIER,
} from '../../types';
import { SOLID, TINT_BG, TINT_TEXT, BORDER_TOP } from '../../lib/theme';
import PageHeader from '../../components/PageHeader';

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defautDateDebut() {
  const d = new Date();
  d.setMonth(d.getMonth() - 5);
  d.setDate(1);
  return isoDateOnly(d);
}

const COLORS = ['#14213D', '#B08D3E', '#10B981', '#9333EA', '#D7D0BE'];

const MOIS_COURTS = [
  'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec',
];

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <div style={{ height }} className="rounded-lg bg-gray-100 animate-pulse" />;
}

function StatSkeleton() {
  return <div className="rounded-xl bg-gray-100 animate-pulse p-5 h-[118px]" />;
}

export default function Rapports() {
  const [dateDebut, setDateDebut] = useState(defautDateDebut());
  const [dateFin, setDateFin] = useState(isoDateOnly(new Date()));

  const [ca, setCa] = useState<CaMensuel[]>([]);
  const [loadingCa, setLoadingCa] = useState(true);

  const [parStatut, setParStatut] = useState<RepartitionStatutDossier[]>([]);
  const [parType, setParType] = useState<RepartitionTypeDossier[]>([]);
  const [recouvrement, setRecouvrement] = useState<TauxRecouvrement | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [erreurExport, setErreurExport] = useState<string | null>(null);

  function chargerCa() {
    setLoadingCa(true);
    api
      .get<CaMensuel[]>('/rapports/chiffre-affaires-mensuel', { params: { dateDebut, dateFin } })
      .then(({ data }) => setCa(data))
      .catch(() => setErreur("Impossible de charger le chiffre d'affaires pour cette periode."))
      .finally(() => setLoadingCa(false));
  }

  function chargerReste() {
    setLoading(true);
    setErreur(null);
    Promise.all([
      api.get<RepartitionStatutDossier[]>('/rapports/dossiers-par-statut'),
      api.get<RepartitionTypeDossier[]>('/rapports/dossiers-par-type'),
      api.get<TauxRecouvrement>('/rapports/taux-recouvrement'),
    ])
      .then(([statutRes, typeRes, recouvrementRes]) => {
        setParStatut(statutRes.data);
        setParType(typeRes.data);
        setRecouvrement(recouvrementRes.data);
      })
      .catch(() => setErreur('Impossible de charger les rapports. Verifiez votre connexion.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    chargerReste();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chargerCa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateDebut, dateFin]);

  async function handleExport(format: 'excel' | 'pdf') {
    setErreurExport(null);
    const setBusy = format === 'excel' ? setExportingExcel : setExportingPdf;
    setBusy(true);
    try {
      if (format === 'excel') {
        await telechargerRapportExcel(dateDebut, dateFin);
      } else {
        await telechargerRapportPdf(dateDebut, dateFin);
      }
    } catch {
      setErreurExport("Erreur lors de la generation de l'export. Reessayez.");
    } finally {
      setBusy(false);
    }
  }

  const caData = ca.map((c) => ({
    mois: MOIS_COURTS[Number(c.mois.split('-')[1]) - 1],
    total: Number(c.total),
  }));

  const statutData = parStatut.map((s) => ({
    name: LABELS_STATUT_DOSSIER[s.statut],
    value: Number(s.total),
  }));

  const typeData = parType.map((t) => ({
    name: LABELS_TYPE_DOSSIER[t.type],
    value: Number(t.total),
  }));

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Rapports & statistiques"
        subtitle="Vue d'ensemble de l'activite du cabinet."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={exportingExcel}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:border-emerald-400 hover:text-emerald-700 text-navy-700 text-sm font-medium rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
            >
              <FileSpreadsheet size={16} /> {exportingExcel ? '...' : 'Excel'}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exportingPdf}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:border-wine-400 hover:text-wine-600 text-navy-700 text-sm font-medium rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
            >
              <FileText size={16} /> {exportingPdf ? '...' : 'PDF'}
            </button>
          </div>
        }
      />

      {erreur && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-3">
          <span>{erreur}</span>
          <button onClick={() => { chargerReste(); chargerCa(); }} className="font-medium hover:underline shrink-0 ml-3">
            Reessayer
          </button>
        </div>
      )}
      {erreurExport && (
        <div className="mb-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {erreurExport}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className={`${SOLID.navy} rounded-xl p-5 shadow-md relative overflow-hidden`}>
              <Wallet size={64} className="absolute -right-3 -bottom-3 text-white/10" strokeWidth={1.2} />
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3.5 relative">
                <Wallet size={18} className="text-white" strokeWidth={1.75} />
              </div>
              <p className="text-xs text-white/75 uppercase tracking-wide font-medium relative">Total facture</p>
              <p className="font-nums text-xl text-white mt-1.5 font-semibold relative">
                {formatFCFA(recouvrement?.totalFacture ?? 0)}
              </p>
            </div>
            <div className={`${SOLID.green} rounded-xl p-5 shadow-md relative overflow-hidden`}>
              <TrendingUp size={64} className="absolute -right-3 -bottom-3 text-white/10" strokeWidth={1.2} />
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3.5 relative">
                <TrendingUp size={18} className="text-white" strokeWidth={1.75} />
              </div>
              <p className="text-xs text-white/75 uppercase tracking-wide font-medium relative">Total encaisse</p>
              <p className="font-nums text-xl text-white mt-1.5 font-semibold relative">
                {formatFCFA(recouvrement?.totalEncaisse ?? 0)}
              </p>
            </div>
            <div className={`${SOLID.gold} rounded-xl p-5 shadow-md relative overflow-hidden`}>
              <PieChartIcon size={64} className="absolute -right-3 -bottom-3 text-white/10" strokeWidth={1.2} />
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3.5 relative">
                <PieChartIcon size={18} className="text-white" strokeWidth={1.75} />
              </div>
              <p className="text-xs text-white/75 uppercase tracking-wide font-medium relative">Taux de recouvrement</p>
              <p className="font-nums text-xl text-white mt-1.5 font-semibold relative">
                {recouvrement?.tauxPourcentage ?? 0}%
              </p>
            </div>
          </>
        )}
      </div>

      <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.brass} p-5 mt-6 shadow-sm hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-md ${TINT_BG.brass} flex items-center justify-center shrink-0`}>
              <TrendingUp size={17} className={TINT_TEXT.brass} strokeWidth={1.75} />
            </div>
            <h2 className="text-sm font-semibold text-navy-900">Chiffre d'affaires encaisse</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              max={dateFin}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
            <span className="text-gray-400">au</span>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              min={dateDebut}
              max={isoDateOnly(new Date())}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>
        </div>
        {loadingCa ? (
          <ChartSkeleton height={260} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={caData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D6" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#6B6252' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B6252' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)}
              />
              <Tooltip
                formatter={(v: number) => formatFCFA(v)}
                contentStyle={{ borderRadius: 8, borderColor: '#E7E2D6', fontSize: 13 }}
                cursor={{ fill: '#FBF6E9' }}
              />
              <Bar dataKey="total" fill="#14213D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.navy} p-5 shadow-sm hover:shadow-md transition-shadow`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-md ${TINT_BG.navy} flex items-center justify-center shrink-0`}>
              <PieChartIcon size={17} className={TINT_TEXT.navy} strokeWidth={1.75} />
            </div>
            <h2 className="text-sm font-semibold text-navy-900">Dossiers par statut</h2>
          </div>
          {loading ? (
            <ChartSkeleton height={220} />
          ) : statutData.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun dossier.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statutData} dataKey="value" nameKey="name" outerRadius={80} paddingAngle={3} label>
                  {statutData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E7E2D6', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.green} p-5 shadow-sm hover:shadow-md transition-shadow`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-md ${TINT_BG.green} flex items-center justify-center shrink-0`}>
              <BarChart3 size={17} className={TINT_TEXT.green} strokeWidth={1.75} />
            </div>
            <h2 className="text-sm font-semibold text-navy-900">Dossiers par type</h2>
          </div>
          {loading ? (
            <ChartSkeleton height={220} />
          ) : typeData.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun dossier.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={80} paddingAngle={3} label>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E7E2D6', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
