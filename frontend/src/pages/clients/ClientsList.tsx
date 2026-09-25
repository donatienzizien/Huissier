import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Download, Trash2, Users, ImagePlus } from 'lucide-react';
import { api } from '../../lib/api';
import { exportToCsv } from '../../lib/csv';
import {
  Client,
  PaginatedResult,
  LABELS_STATUT_CLIENT,
  StatutClient,
  LABELS_CATEGORIE_CLIENT,
  CategorieClient,
  LABELS_TYPE_PIECE,
  TypePieceIdentite,
  RoleTiers,
  LABELS_ROLE_TIERS,
} from '../../types';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';

function identifiantAffiche(client: Client): string {
  if (client.categorie === 'PARTICULIER' || !client.categorie) return client.nin ?? '—';
  const parts: string[] = [];
  if (client.ifu) parts.push(`IFU ${client.ifu}`);
  if (client.rccm) parts.push(`RCCM ${client.rccm}`);
  return parts.length ? parts.join(' · ') : '—';
}

interface Props {
  roleTiersFixe: RoleTiers;
}

export default function ClientsList({ roleTiersFixe }: Props) {
  const [result, setResult] = useState<PaginatedResult<Client> | null>(null);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState<StatutClient | ''>('');
  const [categorie, setCategorie] = useState<CategorieClient | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedResult<Client>>('/clients', {
        params: {
          search: search || undefined,
          statut: statut || undefined,
          categorie: categorie || undefined,
          roleTiers: roleTiersFixe,
          page,
          limit: 20,
        },
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statut, categorie, roleTiersFixe]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleExport() {
    setExporting(true);
    setErrorBanner(null);
    try {
      const tous: Client[] = [];
      let page_ = 1;
      let totalPages = 1;
      do {
        const { data } = await api.get<PaginatedResult<Client>>('/clients', {
          params: {
            search: search || undefined,
            statut: statut || undefined,
            categorie: categorie || undefined,
            roleTiers: roleTiersFixe,
            page: page_,
            limit: 100,
          },
        });
        tous.push(...data.data);
        totalPages = data.pagination.totalPages;
        page_++;
      } while (page_ <= totalPages);

      exportToCsv('clients', tous, [
        { key: 'nom', label: 'Nom' },
        { key: (c) => c.prenom ?? '', label: 'Prénom' },
        { key: (c) => (c.role_tiers ? LABELS_ROLE_TIERS[c.role_tiers] : 'Client'), label: 'Rôle' },
        { key: (c) => (c.categorie ? LABELS_CATEGORIE_CLIENT[c.categorie] : ''), label: 'Catégorie' },
        { key: (c) => c.nin ?? '', label: 'CNIB/Passeport' },
        { key: (c) => c.ifu ?? '', label: 'IFU' },
        { key: (c) => c.rccm ?? '', label: 'RCCM' },
        { key: (c) => c.telephone ?? '', label: 'Téléphone' },
        { key: (c) => c.email ?? '', label: 'Email' },
        { key: (c) => c.adresse ?? '', label: 'Adresse' },
        { key: (c) => LABELS_STATUT_CLIENT[c.statut], label: 'Statut' },
      ]);
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? "Erreur lors de l'export CSV.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(c: Client) {
    if (!window.confirm(`Supprimer définitivement la fiche de ${c.nom} ${c.prenom ?? ''} ?`)) return;
    setDeletingId(c.id);
    setErrorBanner(null);
    try {
      await api.delete(`/clients/${c.id}`);
      load();
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message?.toString() ?? 'Erreur lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon={Users}
        title={roleTiersFixe === 'CLIENT' ? 'Clients' : 'Débiteurs'}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:border-brass-400 hover:text-brass-700 text-navy-700 text-sm font-medium rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
            >
              <Download size={16} /> {exporting ? 'Export…' : 'Exporter CSV'}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all"
            >
              <Plus size={16} /> {roleTiersFixe === 'CLIENT' ? 'Nouveau client' : 'Nouveau débiteur'}
            </button>
          </div>
        }
      />

      {errorBanner && (
        <div className="mt-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {errorBanner}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, CNIB/Passeport, IFU, RCCM, téléphone…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
          />
        </form>
        <select
          value={categorie}
          onChange={(e) => {
            setCategorie(e.target.value as CategorieClient | '');
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
        >
          <option value="">Toutes catégories</option>
          {Object.entries(LABELS_CATEGORIE_CLIENT).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value as StatutClient | '');
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(LABELS_STATUT_CLIENT).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3">Catégorie</th>
              <th className="text-left px-4 py-3">Contact</th>
              <th className="text-left px-4 py-3">Identifiant</th>
              <th className="text-left px-4 py-3">Statut</th>
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
            {!loading && result?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Aucune fiche trouvée.
                </td>
              </tr>
            )}
            {result?.data.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {client.logo_path ? (
                      <img
                        src={`/api/clients/${client.id}/logo`}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 text-xs font-semibold flex items-center justify-center shrink-0">
                        {(client.nom?.[0] ?? '').toUpperCase()}
                      </span>
                    )}
                    <Link to={`/clients/${client.id}`} className="text-navy-700 font-medium hover:underline hover:text-brass-600">
                      {client.nom} {client.prenom ?? ''}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge statut={client.categorie ?? 'PARTICULIER'} label={LABELS_CATEGORIE_CLIENT[client.categorie ?? 'PARTICULIER']} />
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {client.telephone ?? client.email ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 font-ref text-xs">{identifiantAffiche(client)}</td>
                <td className="px-4 py-3">
                  <Badge statut={client.statut} label={LABELS_STATUT_CLIENT[client.statut]} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(client)}
                    disabled={deletingId === client.id}
                    title="Supprimer cette fiche"
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-wine-600 disabled:opacity-40 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Page {result.pagination.page} sur {result.pagination.totalPages} ({result.pagination.total}{' '}
            résultats)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:border-brass-400 transition-colors"
            >
              Précédent
            </button>
            <button
              disabled={page >= result.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-40 hover:border-brass-400 transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateClientModal
          roleParDefaut={roleTiersFixe}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateClientModal({
  roleParDefaut,
  onClose,
  onCreated,
}: {
  roleParDefaut: RoleTiers;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    categorie: 'PARTICULIER' as CategorieClient,
    role_tiers: roleParDefaut,
    nin: '',
    ifu: '',
    rccm: '',
    telephone: '',
    whatsapp: '',
    email: '',
    adresse: '',
    type_piece: '' as TypePieceIdentite | '',
    date_naissance: '',
    lieu_naissance: '',
    nationalite: '',
    date_delivrance_piece: '',
    date_expiration_piece: '',
    lieu_delivrance_piece: '',
    profession: '',
    representant_nom: '',
    representant_prenom: '',
    representant_fonction: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const estEntite = form.categorie !== 'PARTICULIER';

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data: nouveauClient } = await api.post('/clients', {
        nom: form.nom,
        prenom: form.prenom || undefined,
        categorie: form.categorie,
        role_tiers: form.role_tiers,
        nin: form.nin || undefined,
        ifu: form.ifu || undefined,
        rccm: form.rccm || undefined,
        telephone: form.telephone || undefined,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        adresse: form.adresse || undefined,
        type_piece: form.type_piece || undefined,
        date_naissance: form.date_naissance || undefined,
        lieu_naissance: form.lieu_naissance || undefined,
        nationalite: form.nationalite || undefined,
        date_delivrance_piece: form.date_delivrance_piece || undefined,
        date_expiration_piece: form.date_expiration_piece || undefined,
        lieu_delivrance_piece: form.lieu_delivrance_piece || undefined,
        profession: form.profession || undefined,
        representant_nom: form.representant_nom || undefined,
        representant_prenom: form.representant_prenom || undefined,
        representant_fonction: form.representant_fonction || undefined,
      });

      // Le logo est envoyé juste après la création : il faut l'id du
      // client, connu seulement une fois la fiche créée. Si cet upload
      // échoue, la fiche existe déjà — on n'annule pas la création pour
      // autant, on informe juste que le logo n'a pas pu être ajouté.
      if (logoFile) {
        try {
          const logoData = new FormData();
          logoData.append('logo', logoFile);
          await api.post(`/clients/${nouveauClient.id}/logo`, logoData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          setError('Fiche créée, mais le logo n\'a pas pu être envoyé — vous pouvez réessayer depuis la fiche.');
          setSaving(false);
          onCreated();
          return;
        }
      }

      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nouvelle fiche" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-navy-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="Aperçu" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={18} className="text-gray-400" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Logo / photo <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleLogoSelect}
              className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-gray-300 file:text-xs file:font-medium file:bg-white hover:file:bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cette fiche représente</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, role_tiers: 'CLIENT' })}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                form.role_tiers === 'CLIENT'
                  ? 'border-navy-500 bg-navy-50 text-navy-900'
                  : 'border-gray-300 text-gray-500 hover:border-gray-400'
              }`}
            >
              Un Client (mandant)
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role_tiers: 'DEBITEUR' })}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                form.role_tiers === 'DEBITEUR'
                  ? 'border-wine-500 bg-wine-50 text-wine-700'
                  : 'border-gray-300 text-gray-500 hover:border-gray-400'
              }`}
            >
              Un Débiteur (poursuivi)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
          <select
            value={form.categorie}
            onChange={(e) => setForm({ ...form, categorie: e.target.value as CategorieClient })}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400"
          >
            {Object.entries(LABELS_CATEGORIE_CLIENT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={estEntite ? 'Raison sociale' : 'Nom'}
            required
            value={form.nom}
            onChange={(v) => setForm({ ...form, nom: v })}
          />
          {!estEntite && (
            <Field label="Prénom" value={form.prenom} onChange={(v) => setForm({ ...form, prenom: v })} />
          )}
        </div>

        {estEntite ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="IFU" value={form.ifu} onChange={(v) => setForm({ ...form, ifu: v })} />
            <Field label="RCCM" value={form.rccm} onChange={(v) => setForm({ ...form, rccm: v })} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type de pièce</label>
              <select
                value={form.type_piece}
                onChange={(e) => setForm({ ...form, type_piece: e.target.value as TypePieceIdentite | '' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400"
              >
                <option value="">Non renseigné</option>
                {Object.entries(LABELS_TYPE_PIECE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Numéro de pièce" value={form.nin} onChange={(v) => setForm({ ...form, nin: v })} />
          </div>
        )}

        {!estEntite && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Date de délivrance"
                type="date"
                value={form.date_delivrance_piece}
                onChange={(v) => setForm({ ...form, date_delivrance_piece: v })}
              />
              <Field
                label="Date d'expiration"
                type="date"
                value={form.date_expiration_piece}
                onChange={(v) => setForm({ ...form, date_expiration_piece: v })}
              />
              <Field
                label="Lieu de délivrance"
                value={form.lieu_delivrance_piece}
                onChange={(v) => setForm({ ...form, lieu_delivrance_piece: v })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Date de naissance"
                type="date"
                value={form.date_naissance}
                onChange={(v) => setForm({ ...form, date_naissance: v })}
              />
              <Field
                label="Lieu de naissance"
                value={form.lieu_naissance}
                onChange={(v) => setForm({ ...form, lieu_naissance: v })}
              />
              <Field
                label="Nationalité"
                value={form.nationalite}
                onChange={(v) => setForm({ ...form, nationalite: v })}
              />
            </div>

            <Field label="Profession" value={form.profession} onChange={(v) => setForm({ ...form, profession: v })} />
          </>
        )}

        {estEntite && (
          <div className="rounded-lg border border-gray-200 p-3 space-y-3">
            <p className="text-xs font-medium text-gray-600">
              Représentant légal <span className="text-gray-400 font-normal">(pour signifier un acte)</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Nom"
                value={form.representant_nom}
                onChange={(v) => setForm({ ...form, representant_nom: v })}
              />
              <Field
                label="Prénom"
                value={form.representant_prenom}
                onChange={(v) => setForm({ ...form, representant_prenom: v })}
              />
              <Field
                label="Fonction"
                value={form.representant_fonction}
                onChange={(v) => setForm({ ...form, representant_fonction: v })}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Téléphone" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} />
          <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
        </div>
        <Field label="Adresse" value={form.adresse} onChange={(v) => setForm({ ...form, adresse: v })} />

        {error && <p className="text-sm text-wine-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-lg py-2 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
        >
          {saving ? 'Création…' : 'Créer la fiche'}
        </button>
      </form>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
      />
    </div>
  );
}