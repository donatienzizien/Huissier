import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import Modal from '../../components/Modal';

interface Props {
  dossierId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function NouvelleFactureModal({ dossierId, onClose, onCreated }: Props) {
  const [montantTotal, setMontantTotal] = useState('');
  const [dateEcheance, setDateEcheance] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/factures', {
        dossierId,
        montantTotal: Number(montantTotal),
        dateEcheance: dateEcheance ? new Date(dateEcheance).toISOString() : undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la création de la facture.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nouvelle facture" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Montant total (FCFA)</label>
          <input
            type="number"
            min={1}
            required
            value={montantTotal}
            onChange={(e) => setMontantTotal(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date d'échéance (optionnel)</label>
          <input
            type="date"
            value={dateEcheance}
            onChange={(e) => setDateEcheance(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
        >
          {saving ? 'Création…' : 'Créer la facture'}
        </button>
      </form>
    </Modal>
  );
}
