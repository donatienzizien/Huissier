import { FormEvent, useState } from 'react';
import Modal from '../../components/Modal';
import { creerCreance } from '../../lib/recouvrement';

interface Props {
  dossierId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function NouvelleCreanceModal({ dossierId, onClose, onCreated }: Props) {
  const [libelle, setLibelle] = useState('');
  const [montantInitial, setMontantInitial] = useState('');
  const [reference, setReference] = useState('');
  const [dateExigibilite, setDateExigibilite] = useState('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (libelle.trim().length < 3) {
      setError('Saisissez un libelle d au moins 3 caracteres.');
      return;
    }

    const montant = Number(montantInitial);
    if (!Number.isFinite(montant) || montant <= 0) {
      setError('Saisissez un montant superieur a zero.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await creerCreance({
        dossierId,
        libelle: libelle.trim(),
        montantInitial: montant,
        reference: reference.trim() || undefined,
        dateExigibilite: dateExigibilite
          ? new Date(dateExigibilite).toISOString()
          : undefined,
        observations: observations.trim() || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la creation de la creance.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nouvelle creance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Libelle</label>
          <input
            required
            minLength={3}
            value={libelle}
            onChange={(event) => setLibelle(event.target.value)}
            placeholder="Ex. Arrieres de loyer"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Montant initial (FCFA)</label>
          <input
            type="number"
            min={1}
            required
            value={montantInitial}
            onChange={(event) => setMontantInitial(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reference (optionnel)</label>
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date d exigibilite (optionnel)</label>
          <input
            type="date"
            value={dateExigibilite}
            onChange={(event) => setDateExigibilite(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Observations (optionnel)</label>
          <textarea
            rows={3}
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        {error && <p className="text-sm text-wine-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gold-700 hover:bg-gold-800 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
        >
          {saving ? 'Creation…' : 'Creer la creance'}
        </button>
      </form>
    </Modal>
  );
}
