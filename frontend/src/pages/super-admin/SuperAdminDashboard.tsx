import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, LogOut, Copy, CheckCircle2, Ban, RotateCcw } from 'lucide-react';
import { apiSuperAdmin } from '../../lib/apiSuperAdmin';
import { useAuthSuperAdminStore } from '../../store/authSuperAdmin';
import SealMark from '../../components/SealMark';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';

interface Cabinet {
  id: string;
  nom: string;
  slug: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
  statut: 'ACTIF' | 'SUSPENDU';
  createdAt: string;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthSuperAdminStore();
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await apiSuperAdmin.get<Cabinet[]>('/cabinets');
      setCabinets(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatut(c: Cabinet) {
    setBusyId(c.id);
    setErreur(null);
    try {
      await apiSuperAdmin.patch(`/cabinets/${c.id}/${c.statut === 'ACTIF' ? 'suspendre' : 'reactiver'}`);
      load();
    } catch (err: any) {
      setErreur(err.response?.data?.message?.toString() ?? 'Erreur lors de la mise à jour.');
    } finally {
      setBusyId(null);
    }
  }

  function handleLogout() {
    logout();
    navigate('/super-admin/login');
  }

  const total = cabinets.length;
  const actifs = cabinets.filter((c) => c.statut === 'ACTIF').length;
  const suspendus = total - actifs;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SealMark size={26} className="text-brass-300" />
          <div className="leading-tight">
            <p className="font-serif font-semibold text-sm">LOGINET</p>
            <p className="text-[10px] text-brass-300 tracking-wide">SUPER ADMIN</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-navy-200">{user?.nom}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-navy-200 hover:text-white"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-navy-50 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-navy-700" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-serif text-2xl text-navy-900">Cabinets clients</h1>
              <p className="text-sm text-gray-500 mt-0.5">Tous les cabinets provisionnés sur la plateforme.</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md px-4 py-2"
          >
            <Plus size={16} /> Nouveau cabinet
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total cabinets</p>
            <p className="font-nums text-2xl text-navy-900 mt-1">{total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Actifs</p>
            <p className="font-nums text-2xl text-green-700 mt-1">{actifs}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Suspendus</p>
            <p className="font-nums text-2xl text-red-600 mt-1">{suspendus}</p>
          </div>
        </div>

        {erreur && <p className="text-sm text-red-600 mb-3">{erreur}</p>}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-700 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Cabinet</th>
                <th className="text-left px-4 py-3">Sous-domaine</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-left px-4 py-3">Créé le</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    Chargement…
                  </td>
                </tr>
              )}
              {!loading && cabinets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Aucun cabinet pour l'instant.
                  </td>
                </tr>
              )}
              {cabinets.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-navy-900">{c.nom}</td>
                  <td className="px-4 py-3 font-nums text-xs text-gray-600">{c.slug}.localhost</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3">
                    <Badge statut={c.statut === 'ACTIF' ? 'ACTIF' : 'ARCHIVE'} label={c.statut === 'ACTIF' ? 'Actif' : 'Suspendu'} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={busyId === c.id}
                      onClick={() => toggleStatut(c)}
                      className="inline-flex items-center gap-1 text-xs text-navy-700 hover:underline disabled:opacity-40"
                    >
                      {c.statut === 'ACTIF' ? (
                        <>
                          <Ban size={12} /> Suspendre
                        </>
                      ) : (
                        <>
                          <RotateCcw size={12} /> Réactiver
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showCreate && (
        <CreateCabinetModal
          onClose={() => setShowCreate(false)}
          onCreated={() => load()}
        />
      )}
    </div>
  );
}

function CreateCabinetModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    nom: '',
    slug: '',
    email: '',
    telephone: '',
    adresse: '',
    huissierNom: '',
    huissierPrenom: '',
    huissierEmail: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultat, setResultat] = useState<{ huissierEmail: string; motDePasseTemporaire: string; slug: string } | null>(null);
  const [copie, setCopie] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await apiSuperAdmin.post('/cabinets', {
        ...form,
        telephone: form.telephone || undefined,
        adresse: form.adresse || undefined,
      });
      onCreated();
      setResultat({
        huissierEmail: data.huissierEmail,
        motDePasseTemporaire: data.motDePasseTemporaire,
        slug: form.slug,
      });
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  }

  function copier() {
    if (!resultat) return;
    navigator.clipboard.writeText(resultat.motDePasseTemporaire).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    });
  }

  if (resultat) {
    return (
      <Modal title="Cabinet créé" onClose={onClose}>
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Le cabinet est provisionné, accessible sur <strong>{resultat.slug}.localhost</strong>. Un email
            d'accès a été envoyé à <strong>{resultat.huissierEmail}</strong>. Si l'envoi échoue (SMTP non
            configuré), transmets ces identifiants manuellement — le mot de passe ne sera plus affiché
            ensuite.
          </p>
          <div className="bg-navy-50 border border-navy-100 rounded-md p-3 flex items-center justify-between">
            <span className="font-nums text-sm text-navy-900">{resultat.motDePasseTemporaire}</span>
            <button onClick={copier} className="flex items-center gap-1 text-xs text-navy-700 hover:underline shrink-0 ml-3">
              {copie ? <CheckCircle2 size={13} /> : <Copy size={13} />}
              {copie ? 'Copié' : 'Copier'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2"
          >
            Terminé
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Nouveau cabinet" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom du cabinet</label>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sous-domaine (slug)</label>
            <input
              required
              pattern="[a-z][a-z0-9_]{2,30}"
              title="Minuscules, chiffres et underscores, 3-30 caractères"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="ex: cabinet_ouaga"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email du cabinet</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone (optionnel)</label>
            <input
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Adresse (optionnel)</label>
            <input
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Premier compte (Huissier administrateur)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
              <input
                required
                value={form.huissierNom}
                onChange={(e) => setForm({ ...form, huissierNom: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
              <input
                required
                value={form.huissierPrenom}
                onChange={(e) => setForm({ ...form, huissierPrenom: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.huissierEmail}
              onChange={(e) => setForm({ ...form, huissierEmail: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
        >
          {saving ? 'Provisionnement…' : 'Créer le cabinet'}
        </button>
      </form>
    </Modal>
  );
}
