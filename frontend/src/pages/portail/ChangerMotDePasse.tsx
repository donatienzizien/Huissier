import { FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { apiPortail } from '../../lib/apiPortail';

export default function ChangerMotDePasse() {
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);

    if (nouveau !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      await apiPortail.post('/changer-mot-de-passe', {
        motDePasseActuel: actuel,
        nouveauMotDePasse: nouveau,
      });
      setMessage('Mot de passe modifie avec succes.');
      setActuel('');
      setNouveau('');
      setConfirmation('');
    } catch (err: any) {
      const raw = err?.response?.data?.message;
      setErreur(typeof raw === 'string' ? raw : 'Erreur lors de la modification.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="flex items-center gap-2 font-serif text-lg text-navy-900 mb-4">
        <KeyRound size={18} className="text-navy-700" /> Changer mon mot de passe
      </h2>

      {message && (
        <p className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {message}
        </p>
      )}
      {erreur && (
        <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {erreur}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <input
          type="password"
          required
          placeholder="Mot de passe actuel"
          value={actuel}
          onChange={(e) => setActuel(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Nouveau mot de passe (8 caracteres minimum)"
          value={nouveau}
          onChange={(e) => setNouveau(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400"
        />
        <input
          type="password"
          required
          placeholder="Confirmer le nouveau mot de passe"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400"
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-navy-700 text-white text-sm font-medium py-2 hover:bg-navy-800 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Modifier le mot de passe'}
        </button>
      </form>
    </div>
  );
}
