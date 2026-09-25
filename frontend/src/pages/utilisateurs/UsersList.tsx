import { FormEvent, useEffect, useState } from 'react';
import { Plus, UserCog, Users as UsersIcon, Copy, Check } from 'lucide-react';
import { api } from '../../lib/api';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

type RoleUtilisateur = 'HUISSIER' | 'CLERC' | 'COMPTABLE' | 'SECRETAIRE' | 'AGENT_TERRAIN';

interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: RoleUtilisateur;
  actif: boolean;
  created_at: string;
}

const LABELS_ROLE: Record<RoleUtilisateur, string> = {
  HUISSIER: 'Huissier',
  CLERC: 'Clerc',
  COMPTABLE: 'Comptable',
  SECRETAIRE: 'Secretaire',
  AGENT_TERRAIN: 'Agent terrain',
};

export default function UsersList() {
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [actionEnCoursId, setActionEnCoursId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Utilisateur[]>('/users');
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDesactiver(u: Utilisateur) {
    if (!window.confirm(`Desactiver le compte de ${u.nom} ${u.prenom} ? Cette personne ne pourra plus se connecter.`)) {
      return;
    }
    setActionEnCoursId(u.id);
    setErrorBanner(null);
    try {
      await api.patch(`/users/${u.id}/desactiver`);
      load();
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? 'Erreur lors de la desactivation.');
    } finally {
      setActionEnCoursId(null);
    }
  }

  async function handleReactiver(u: Utilisateur) {
    setActionEnCoursId(u.id);
    setErrorBanner(null);
    try {
      await api.patch(`/users/${u.id}/reactiver`);
      load();
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? 'Erreur lors de la reactivation.');
    } finally {
      setActionEnCoursId(null);
    }
  }

  async function handleSupprimer(u: Utilisateur) {
    if (
      !window.confirm(
        `Supprimer definitivement le compte de ${u.nom} ${u.prenom} ? Cette action est irreversible.`,
      )
    ) {
      return;
    }
    setActionEnCoursId(u.id);
    setErrorBanner(null);
    try {
      await api.delete(`/users/${u.id}`);
      load();
    } catch (err: any) {
      setErrorBanner(
        err.response?.data?.message?.toString() ?? 'Erreur lors de la suppression.',
      );
    } finally {
      setActionEnCoursId(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon={UserCog}
        title="Utilisateurs"
        subtitle="Personnel du cabinet — Clercs, Comptables, Secretaires et Agents terrain. Un mot de passe temporaire est envoye par email a la creation."
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md px-4 py-2"
          >
            <Plus size={16} /> Nouveau membre
          </button>
        }
      />

      {errorBanner && (
        <div className="mb-4 rounded-md border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {errorBanner}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={UsersIcon}
                    title="Aucun membre du personnel"
                    description="Ajoutez un Clerc, un Comptable ou un Agent terrain pour qu'il puisse se connecter a la plateforme."
                    actionLabel="Nouveau membre"
                    onAction={() => setShowCreate(true)}
                  />
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-navy-900">
                  {u.nom} {u.prenom}
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-gray-600">{LABELS_ROLE[u.role]}</td>
                <td className="px-4 py-3">
                  <Badge statut={u.actif ? 'ACTIF' : 'ARCHIVE'} label={u.actif ? 'Actif' : 'Desactive'} />
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== 'HUISSIER' && (
                    <div className="flex items-center justify-end gap-3">
                      {u.actif ? (
                        <button
                          onClick={() => handleDesactiver(u)}
                          disabled={actionEnCoursId === u.id}
                          className="text-xs text-wine-600 hover:underline disabled:opacity-40"
                        >
                          Desactiver
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactiver(u)}
                          disabled={actionEnCoursId === u.id}
                          className="text-xs text-emerald-600 hover:underline disabled:opacity-40"
                        >
                          Reactiver
                        </button>
                      )}
                      <button
                        onClick={() => handleSupprimer(u)}
                        disabled={actionEnCoursId === u.id}
                        className="text-xs text-gray-500 hover:text-wine-700 hover:underline disabled:opacity-40"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'CLERC' | 'COMPTABLE' | 'SECRETAIRE' | 'AGENT_TERRAIN'>('CLERC');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ email: string; motDePasseTemporaire: string } | null>(null);
  const [copie, setCopie] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post('/users', { nom, prenom, email, role });
      setResultat({ email, motDePasseTemporaire: data.motDePasseTemporaire });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la creation.');
    } finally {
      setSaving(false);
    }
  }

  function copierMotDePasse() {
    if (!resultat) return;
    navigator.clipboard.writeText(resultat.motDePasseTemporaire).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    });
  }

  if (resultat) {
    return (
      <Modal title="Compte cree" onClose={onClose}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Un email a ete envoye a <strong>{resultat.email}</strong> avec les identifiants. Note aussi le
            mot de passe temporaire ci-dessous — il ne sera plus jamais affiche.
          </p>
          <div className="flex items-center justify-between rounded-md border border-brass-200 bg-brass-50 px-3 py-2">
            <span className="font-ref text-navy-900 font-semibold">{resultat.motDePasseTemporaire}</span>
            <button
              onClick={copierMotDePasse}
              className="flex items-center gap-1 text-xs text-navy-700 hover:underline"
            >
              {copie ? (
                <>
                  <Check size={12} /> Copie
                </>
              ) : (
                <>
                  <Copy size={12} /> Copier
                </>
              )}
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2"
          >
            Termine
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Nouveau membre du personnel" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
            <input
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prenom</label>
            <input
              required
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'CLERC' | 'COMPTABLE' | 'SECRETAIRE' | 'AGENT_TERRAIN')}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
          >
            <option value="CLERC">Clerc</option>
            <option value="COMPTABLE">Comptable</option>
            <option value="SECRETAIRE">Secretaire</option>
            <option value="AGENT_TERRAIN">Agent terrain</option>
          </select>
        </div>

        {error && <p className="text-sm text-wine-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
        >
          {saving ? 'Creation…' : 'Creer le compte'}
        </button>
      </form>
    </Modal>
  );
}
