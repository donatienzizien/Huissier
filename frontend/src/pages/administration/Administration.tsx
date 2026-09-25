import { FormEvent, useEffect, useState } from 'react';
import { Plus, ScrollText, FileX, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { ModeleActe, LABELS_TYPE_ACTE, TypeActe, TYPES_LETTRE_CLIENT } from '../../types';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Georgia, serif; font-size: 12pt; color: #1b2c4a; line-height: 1.6; }
    h1 { font-size: 14pt; text-align: center; text-transform: uppercase; }
  </style>
</head>
<body>
  <p style="text-align:right; font-size:10pt;">Acte n° {{numeroActe}} — {{dateActe}}</p>
  <h1>Titre de l'acte</h1>
  <p>{{client.nom}} {{client.prenom}}</p>
  <p>Dossier n° {{dossier.numero}}</p>
</body>
</html>`;

export default function Administration() {
  const user = useAuthStore((s) => s.user);
  const [modeles, setModeles] = useState<ModeleActe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ModeleActe | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<ModeleActe[]>('/modeles-actes');
      setModeles(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActif(modele: ModeleActe) {
    await api.patch(`/modeles-actes/${modele.id}`, { actif: !modele.actif });
    load();
  }

  async function handleDelete(modele: ModeleActe) {
    if (!window.confirm(`Supprimer définitivement le modèle « ${modele.nom} » ? Les actes déjà générés avec ce modèle ne sont pas affectés.`)) {
      return;
    }
    setDeletingId(modele.id);
    setErrorBanner(null);
    try {
      await api.delete(`/modeles-actes/${modele.id}`);
      load();
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? 'Erreur lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  }

  if (user && user.role !== 'HUISSIER') {
    return (
      <div>
        <PageHeader icon={ScrollText} title="Administration" accent="brass" />
        <EmptyState
          icon={ScrollText}
          title="Accès réservé"
          description="Cette section est réservée au rôle Huissier, administrateur du cabinet."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={ScrollText}
        title="Modèles d'actes"
        subtitle="Gabarits légaux utilisés pour générer les PDF d'actes. Gestion du personnel disponible depuis la page Utilisateurs."
        accent="brass"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md px-4 py-2"
          >
            <Plus size={16} /> Nouveau modèle
          </button>
        }
      />

      {errorBanner && (
        <div className="mb-4 rounded-md border border-red-100 bg-red-50 text-red-600 text-sm px-4 py-2">
          {errorBanner}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && modeles.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    icon={FileX}
                    title="Aucun modèle d'acte"
                    description="Créez votre premier gabarit pour commencer à générer des actes en PDF."
                    actionLabel="Nouveau modèle"
                    onAction={() => setShowCreate(true)}
                  />
                </td>
              </tr>
            )}
            {modeles.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button
                    onClick={() => setEditing(m)}
                    className="flex items-center gap-2.5 text-navy-700 font-medium hover:underline"
                  >
                    <span className="w-7 h-7 rounded-full bg-brass-50 flex items-center justify-center shrink-0">
                      <ScrollText size={13} className="text-brass-600" />
                    </span>
                    {m.nom}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600">{LABELS_TYPE_ACTE[m.type]}</td>
                <td className="px-4 py-3">
                  <Badge statut={m.actif ? 'ACTIF' : 'ARCHIVE'} label={m.actif ? 'Actif' : 'Inactif'} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => toggleActif(m)} className="text-xs text-navy-700 hover:underline">
                      {m.actif ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      disabled={deletingId === m.id}
                      title="Supprimer ce modèle"
                      className="text-gray-400 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <ModeleFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {editing && (
        <ModeleFormModal
          modele={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ModeleFormModal({
  modele,
  onClose,
  onSaved,
}: {
  modele?: ModeleActe;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState(modele?.nom ?? '');
  const [type, setType] = useState<TypeActe>(modele?.type ?? 'AUTRE');
  const [templateHtml, setTemplateHtml] = useState(modele?.template_html ?? DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (modele) {
        await api.patch(`/modeles-actes/${modele.id}`, { nom, type, templateHtml });
      } else {
        await api.post('/modeles-actes', { nom, type, templateHtml });
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de l\u2019enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={modele ? "Modifier le modèle" : "Nouveau modèle d'acte"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
            <input
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type d'acte</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TypeActe)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <optgroup label="Actes de procédure">
                {Object.entries(LABELS_TYPE_ACTE)
                  .filter(([value]) => !TYPES_LETTRE_CLIENT.includes(value as TypeActe))
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Lettres client (pour signature)">
                {Object.entries(LABELS_TYPE_ACTE)
                  .filter(([value]) => TYPES_LETTRE_CLIENT.includes(value as TypeActe))
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Gabarit HTML (Handlebars — champs : numeroActe, dateActe, dossier.numero, dossier.description,
            client.nom, client.prenom, client.adresse, client.telephone, notes)
          </label>
          <textarea
            required
            value={templateHtml}
            onChange={(e) => setTemplateHtml(e.target.value)}
            rows={12}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  );
}