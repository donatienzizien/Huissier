import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Receipt } from 'lucide-react';
import { api } from '../../lib/api';
import { telechargerFacturePdf } from '../../lib/pdf';
import {
  FactureDetail as FactureDetailType,
  LABELS_STATUT_FACTURE,
  LABELS_MODE_PAIEMENT,
  ModePaiement,
} from '../../types';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';

function formatFCFA(n: string | number) {
  return new Intl.NumberFormat('fr-FR').format(Number(n)) + ' FCFA';
}

export default function FactureDetail() {
  const { id } = useParams<{ id: string }>();
  const [facture, setFacture] = useState<FactureDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState<ModePaiement>('ESPECES');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<FactureDetailType>(`/factures/${id}`);
      setFacture(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAjouterPaiement(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/factures/${id}/paiements`, { montant: Number(montant), mode, reference: reference || undefined });
      setMontant('');
      setReference('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? "Erreur lors de l'enregistrement du paiement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnnuler() {
    if (!confirm('Annuler cette facture ? Cette action est irréversible.')) return;
    await api.patch(`/factures/${id}/annuler`);
    load();
  }

  if (loading) return <p className="text-gray-400 text-sm">Chargement…</p>;
  if (!facture) return <p className="text-gray-400 text-sm">Facture introuvable.</p>;

  const montantRestant = Number(facture.montant_total) - Number(facture.montant_paye);

  return (
    <div>
      <Link to="/facturation" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-700 mb-4">
        <ArrowLeft size={14} /> Retour aux factures
      </Link>

      <PageHeader
        icon={Receipt}
        title={facture.numero}
        accent="brass"
        subtitle={
          <>
            {facture.client_nom} {facture.client_prenom ?? ''} ·{' '}
            <Link to={`/dossiers/${facture.dossier_id}`} className="font-ref text-navy-700 hover:underline">
              {facture.dossier_numero}
            </Link>
          </>
        }
        action={
          <div className="flex gap-2 items-start">
            <button
              onClick={() => telechargerFacturePdf(facture.id, facture.numero)}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-navy-200 text-navy-700 hover:bg-navy-50"
            >
              <Download size={14} /> PDF
            </button>
            {facture.statut !== 'ANNULEE' && facture.statut !== 'PAYEE' && (
              <button
                onClick={handleAnnuler}
                className="text-sm px-3 py-1.5 rounded-md border border-wine-100 text-wine-600 hover:bg-wine-50"
              >
                Annuler
              </button>
            )}
          </div>
        }
      />
      <div className="-mt-4 mb-6">
        <Badge statut={facture.statut} label={LABELS_STATUT_FACTURE[facture.statut]} />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Montant total</p>
          <p className="font-ref text-xl font-semibold text-navy-900 mt-1">{formatFCFA(facture.montant_total)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Réglé</p>
          <p className="font-ref text-xl font-semibold text-emerald-600 mt-1">{formatFCFA(facture.montant_paye)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Solde restant</p>
          <p className={`font-ref text-xl font-semibold mt-1 ${montantRestant > 0 ? 'text-wine-600' : 'text-emerald-600'}`}>
            {formatFCFA(montantRestant)}
          </p>
        </div>
      </div>

      {facture.statut !== 'ANNULEE' && facture.statut !== 'PAYEE' && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
          <h2 className="text-sm font-semibold text-navy-900 mb-3">Enregistrer un paiement</h2>
          <form onSubmit={handleAjouterPaiement} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA)</label>
              <input
                type="number"
                min={1}
                required
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ModePaiement)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
              >
                {Object.entries(LABELS_MODE_PAIEMENT).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Référence (optionnel)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md px-4 py-1.5 disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
          {error && <p className="text-sm text-wine-600 mt-2">{error}</p>}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Historique des paiements</h2>
        {facture.paiements.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun paiement enregistré.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-navy-700 uppercase bg-navy-50">
              <tr>
                <th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Mode</th>
                <th className="text-left px-2 py-2">Référence</th>
                <th className="text-right px-2 py-2">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facture.paiements.map((p) => (
                <tr key={p.id}>
                  <td className="px-2 py-2 text-gray-600">{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                  <td className="px-2 py-2">{LABELS_MODE_PAIEMENT[p.mode]}</td>
                  <td className="px-2 py-2 text-gray-500">{p.reference ?? '—'}</td>
                  <td className="font-ref px-2 py-2 text-right font-medium">{formatFCFA(p.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}