import { FormEvent, useState } from 'react';
import { UserCircle, KeyRound } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import PageHeader from '../../components/PageHeader';
import AvatarUpload from '../../components/AvatarUpload';

export default function ProfilPersonnel() {
  const user = useAuthStore((s) => s.user);
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSucces(false);

    if (nouveauMotDePasse !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (nouveauMotDePasse.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/users/moi/mot-de-passe', { ancienMotDePasse, nouveauMotDePasse });
      setSucces(true);
      setAncienMotDePasse('');
      setNouveauMotDePasse('');
      setConfirmation('');
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors du changement de mot de passe.');
    } finally {
      setSaving(false);
    }
  }

  const initiales = `${user?.nom?.[0] ?? ''}${user?.prenom?.[0] ?? ''}`.toUpperCase();

  return (
    <div>
      <PageHeader
        icon={UserCircle}
        title="Mon profil"
        subtitle={`${user?.nom ?? ''} ${user?.prenom ?? ''} - ${user?.role ?? ''}`}
      />

      <div className="max-w-md bg-white rounded-lg border border-gray-200 p-5 mb-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900 mb-4">
          <UserCircle size={16} className="text-brass-600" /> Photo de profil
        </h2>
        {user?.id && <AvatarUpload userId={user.id} initiales={initiales} hasPhotoInitial={false} />}
      </div>

      <div className="max-w-md bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900 mb-4">
          <KeyRound size={16} className="text-brass-600" /> Changer mon mot de passe
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              required
              value={ancienMotDePasse}
              onChange={(e) => setAncienMotDePasse(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>

          {error && <p className="text-sm text-wine-600">{error}</p>}
          {succes && <p className="text-sm text-emerald-600">Mot de passe modifie avec succes.</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

