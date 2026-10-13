import { useEffect, useState, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Receipt,
  FolderOpen,
  Mail,
  CheckCircle2,
  Clock,
  Paperclip,
  Upload,
  Trash2,
  FileImage,
  File as FileIcon,
  Pencil,
  UserCheck,
  UserCog,
  XCircle,
  Send,
  HandCoins,
} from 'lucide-react';
import { api } from '../../lib/api';
import { telechargerActePdf } from '../../lib/pdf';
import { soumettreActe } from '../../lib/actes';
import {
  DossierDetail as DossierDetailType,
  LABELS_STATUT_DOSSIER,
  LABELS_TYPE_DOSSIER,
  LABELS_TYPE_ACTE,
  StatutDossier,
  TypeActe,
  TYPES_LETTRE_CLIENT,
  TYPES_ACTE_PROCEDURE,
  PieceJointe,
  CategoriePieceJointe,
  LABELS_CATEGORIE_PIECE_JOINTE,
  Client,
  PaginatedResult,
  UtilisateurSimple,
  LABELS_STATUT_VALIDATION,
  Creance,
  LABELS_STATUT_CREANCE,
} from '../../types';
import { useAuthStore } from '../../store/auth';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import GenererActeModal from '../actes/GenererActeModal';
import NouvelleFactureModal from '../facturation/NouvelleFactureModal';
import NouvelleCreanceModal from '../recouvrement/NouvelleCreanceModal';
import { getCreances } from '../../lib/recouvrement';

const TRANSITIONS: Record<StatutDossier, StatutDossier[]> = {
  OUVERT: ['EN_COURS', 'CLOTURE'],
  EN_COURS: ['CLOTURE'],
  CLOTURE: ['ARCHIVE', 'EN_COURS'],
  ARCHIVE: [],
};

async function telechargerBlob(url: string, filename: string) {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function DossierDetail() {
  const { id } = useParams<{ id: string }>();
  const [dossier, setDossier] = useState<DossierDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showGenererActe, setShowGenererActe] = useState(false);
  const [showNouvelleFacture, setShowNouvelleFacture] = useState(false);
  const [showNouvelleCreance, setShowNouvelleCreance] = useState(false);
  const [creances, setCreances] = useState<Creance[]>([]);
  const [creancesTotal, setCreancesTotal] = useState(0);
  const [loadingCreances, setLoadingCreances] = useState(false);
  const [showCorrigerTiers, setShowCorrigerTiers] = useState(false);
  const [busyActeId, setBusyActeId] = useState<string | null>(null);
  const [envoiError, setEnvoiError] = useState<string | null>(null);

  const [agents, setAgents] = useState<UtilisateurSimple[]>([]);
  const [clercs, setClercs] = useState<UtilisateurSimple[]>([]);
  const [agentsTerrain, setAgentsTerrain] = useState<UtilisateurSimple[]>([]);
  const [notifierActeId, setNotifierActeId] = useState<string | null>(null);
  const [showAssignerClerc, setShowAssignerClerc] = useState(false);
  const [showAssignerAgent, setShowAssignerAgent] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [filtreHistorique, setFiltreHistorique] = useState<'TOUS' | 'ACTES' | 'DOSSIER'>('TOUS');
  const user = useAuthStore((s) => s.user);
  const estHuissier = user?.role === 'HUISSIER';
  const peutModifierDossier = user?.role === 'HUISSIER' || user?.role === 'CLERC';

  const [piecesJointes, setPiecesJointes] = useState<PieceJointe[]>([]);
  const [loadingPj, setLoadingPj] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategorie, setUploadCategorie] = useState<CategoriePieceJointe>('ACTE_SIGNE_RETOURNE');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingPjId, setDeletingPjId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<DossierDetailType>(`/dossiers/${id}`);
      setDossier(data);

      if (data.type === 'RECOUVREMENT') {
        await loadCreances(data.id);
      } else {
        setCreances([]);
        setCreancesTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadCreances(dossierId: string) {
    setLoadingCreances(true);
    try {
      const result = await getCreances({ dossierId, page: 1, limit: 100 });
      setCreances(result.data);
      setCreancesTotal(result.pagination.total);
    } finally {
      setLoadingCreances(false);
    }
  }

  async function loadPiecesJointes() {
    if (!id) return;
    setLoadingPj(true);
    try {
      const { data } = await api.get<PieceJointe[]>('/pieces-jointes', { params: { dossierId: id } });
      setPiecesJointes(data);
    } finally {
      setLoadingPj(false);
    }
  }

  async function loadAgents() {
    try {
      const { data } = await api.get<UtilisateurSimple[]>('/users');
      setAgents(data.filter((u) => (u.role === 'HUISSIER' || u.role === 'CLERC' || (u.role as string) === 'AGENT_TERRAIN') && u.actif));
      setClercs(data.filter((u) => u.role === 'CLERC' && u.actif));
      setAgentsTerrain(data.filter((u) => (u.role as string) === 'AGENT_TERRAIN' && u.actif));
    } catch {
      // Non bloquant : les boutons d'attribution afficheront simplement
      // une liste vide si /users echoue.
    }
  }

  useEffect(() => {
    load();
    loadPiecesJointes();
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleEnvoyerClient(acteId: string) {
    setBusyActeId(acteId);
    setEnvoiError(null);
    try {
      await api.post(`/actes/${acteId}/envoyer-client`);
      load();
    } catch (err: any) {
      setEnvoiError(err.response?.data?.message?.toString() ?? "Echec de l'envoi.");
    } finally {
      setBusyActeId(null);
    }
  }

  async function handleMarquerSigne(acteId: string) {
    setBusyActeId(acteId);
    setEnvoiError(null);
    try {
      await api.patch(`/actes/${acteId}/marquer-signe`);
      load();
    } catch (err: any) {
      setEnvoiError(err.response?.data?.message?.toString() ?? 'Echec de la mise a jour.');
    } finally {
      setBusyActeId(null);
    }
  }

  async function handleMarquerNotifie(acteId: string, agentId: string) {
    setBusyActeId(acteId);
    setEnvoiError(null);
    try {
      await api.patch(`/actes/${acteId}/marquer-notifie`, { agentId });
      setNotifierActeId(null);
      load();
    } catch (err: any) {
      setEnvoiError(err.response?.data?.message?.toString() ?? 'Echec de la mise a jour.');
    } finally {
      setBusyActeId(null);
    }
  }

  async function handleAssignerClerc(clercId: string | null) {
    setAssignError(null);
    try {
      await api.patch(`/dossiers/${id}/assigner-clerc`, { clercId });
      setShowAssignerClerc(false);
      load();
    } catch (err: any) {
      setAssignError(err.response?.data?.message?.toString() ?? "Echec de l'attribution.");
    }
  }

  async function handleAssignerAgent(agentId: string | null) {
    setAssignError(null);
    try {
      await api.patch(`/dossiers/${id}/assigner-agent`, { agentId });
      setShowAssignerAgent(false);
      load();
    } catch (err: any) {
      setAssignError(err.response?.data?.message?.toString() ?? "Echec de l'attribution.");
    }
  }

  async function handleSoumettreActe(acteId: string) {
    setBusyActeId(acteId);
    setEnvoiError(null);
    try {
      await soumettreActe(acteId);
      load();
    } catch (err: any) {
      setEnvoiError(err.response?.data?.message?.toString() ?? 'Echec de la soumission.');
    } finally {
      setBusyActeId(null);
    }
  }

  async function handleStatutChange(statut: StatutDossier) {
    setUpdating(true);
    try {
      await api.patch(`/dossiers/${id}/statut`, { statut });
      load();
    } finally {
      setUpdating(false);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!uploadFile || !id) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('fichier', uploadFile);
      formData.append('dossierId', id);
      formData.append('categorie', uploadCategorie);
      await api.post('/pieces-jointes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadFile(null);
      loadPiecesJointes();
    } catch (err: any) {
      setUploadError(err.response?.data?.message?.toString() ?? "Erreur lors de l'envoi du fichier.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePj(pj: PieceJointe) {
    if (!window.confirm(`Supprimer « ${pj.nom_original} » ?`)) return;
    setDeletingPjId(pj.id);
    try {
      await api.delete(`/pieces-jointes/${pj.id}`);
      loadPiecesJointes();
    } finally {
      setDeletingPjId(null);
    }
  }

  if (loading) return <p className="text-gray-400 text-sm">Chargement…</p>;
  if (!dossier) return <p className="text-gray-400 text-sm">Dossier introuvable.</p>;

  return (
    <div>
      <Link to="/dossiers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-700 mb-4">
        <ArrowLeft size={14} /> Retour aux dossiers
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center shrink-0 mt-0.5">
            <FolderOpen size={18} className="text-navy-700" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="font-ref text-xl text-navy-900">{dossier.numero}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {LABELS_TYPE_DOSSIER[dossier.type]} · Client :{' '}
              <Link to={`/clients/${dossier.client_id}`} className="text-navy-700 hover:underline">
                {dossier.client_nom} {dossier.client_prenom ?? ''}
              </Link>
              {dossier.debiteur_id && (
                <>
                  {' '}
                  · Debiteur :{' '}
                  <Link to={`/clients/${dossier.debiteur_id}`} className="text-wine-600 hover:underline">
                    {dossier.debiteur_nom} {dossier.debiteur_prenom ?? ''}
                  </Link>
                </>
              )}
              {estHuissier && (
                <>
                  {' '}
                  <button
                    onClick={() => setShowCorrigerTiers(true)}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy-700 ml-1"
                    title="Corriger le client / debiteur"
                  >
                    <Pencil size={11} />
                  </button>
                </>
              )}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge statut={dossier.statut} label={LABELS_STATUT_DOSSIER[dossier.statut]} />
              {dossier.assigne_clerc_nom && (
                <span className="inline-flex items-center gap-1 text-xs text-navy-700 bg-navy-50 border border-navy-100 rounded-full px-2 py-0.5">
                  <UserCog size={11} /> Clerc : {dossier.assigne_clerc_nom} {dossier.assigne_clerc_prenom}
                </span>
              )}
              {dossier.assigne_agent_nom && (
                <span className="inline-flex items-center gap-1 text-xs text-brass-700 bg-brass-50 border border-brass-100 rounded-full px-2 py-0.5">
                  <UserCheck size={11} /> Agent : {dossier.assigne_agent_nom} {dossier.assigne_agent_prenom}
                </span>
              )}
              {user?.role === 'HUISSIER' && (
                <button
                  onClick={() => setShowAssignerClerc(true)}
                  className="text-xs text-gray-400 hover:text-navy-700 underline"
                >
                  {dossier.assigne_clerc_nom ? 'Changer le clerc' : 'Assigner un clerc'}
                </button>
              )}
              {(user?.role === 'HUISSIER' || (user?.role === 'CLERC' && dossier.assigne_clerc_id === user?.id)) && (
                <button
                  onClick={() => setShowAssignerAgent(true)}
                  className="text-xs text-gray-400 hover:text-brass-700 underline"
                >
                  {dossier.assigne_agent_nom ? "Changer l'agent" : 'Assigner un agent terrain'}
                </button>
              )}
            </div>
            {assignError && <p className="text-xs text-red-600 mt-1">{assignError}</p>}
          </div>
        </div>

        {peutModifierDossier && TRANSITIONS[dossier.statut].length > 0 && (
          <div className="flex gap-2">
            {TRANSITIONS[dossier.statut].map((next) => (
              <button
                key={next}
                disabled={updating}
                onClick={() => handleStatutChange(next)}
                className="text-sm px-3 py-1.5 rounded-md border border-navy-200 text-navy-700 hover:bg-navy-50 disabled:opacity-50"
              >
                → {LABELS_STATUT_DOSSIER[next]}
              </button>
            ))}
          </div>
        )}
      </div>

      {dossier.description && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
          <h2 className="text-sm font-semibold text-navy-900 mb-2">Description</h2>
          <p className="text-sm text-gray-700">{dossier.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-navy-900">Actes ({dossier.actes.length})</h2>
            <button
              onClick={() => setShowGenererActe(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-navy-700 border border-navy-200 rounded-md px-2.5 py-1.5 hover:bg-navy-50"
            >
              <FileText size={14} /> Generer un acte
            </button>
          </div>
          {dossier.actes.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun acte genere pour ce dossier.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {envoiError && <p className="text-xs text-red-600 mb-1">{envoiError}</p>}
              {dossier.actes.map((a) => {
                const estLettreClient = TYPES_LETTRE_CLIENT.includes(a.type as TypeActe);
                const estActeProcedure = TYPES_ACTE_PROCEDURE.includes(a.type as TypeActe);
                const busy = busyActeId === a.id;
                return (
                  <li key={a.id} className="border-b border-gray-100 pb-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{a.numero}</span>
                        <span className="text-gray-500 ml-2">{LABELS_TYPE_ACTE[a.type as keyof typeof LABELS_TYPE_ACTE]}</span>
                        {a.statut_validation && a.statut_validation !== 'VALIDE' && (
                          <span
                            className={`ml-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                              a.statut_validation === 'BROUILLON'
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-brass-50 text-brass-700'
                            }`}
                          >
                            {LABELS_STATUT_VALIDATION[a.statut_validation]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {a.statut_validation === 'BROUILLON' && (
                          <button
                            disabled={busy}
                            onClick={() => handleSoumettreActe(a.id)}
                            className="flex items-center gap-1 text-brass-700 hover:underline text-xs disabled:opacity-50"
                          >
                            <UserCheck size={13} /> Soumettre
                          </button>
                        )}
                        {a.statut_validation === 'VALIDE' && (
                          <>
                            {estHuissier && (
                              <button
                                disabled={busy}
                                onClick={() => handleEnvoyerClient(a.id)}
                                className="flex items-center gap-1 text-navy-700 hover:underline text-xs disabled:opacity-50"
                                title="Envoyer par email au client"
                              >
                                <Mail size={13} /> Envoyer
                              </button>
                            )}
                            <button
                              onClick={() => telechargerActePdf(a.id, a.numero)}
                              className="flex items-center gap-1 text-navy-700 hover:underline text-xs"
                            >
                              <Download size={13} /> PDF
                            </button>
                            <button
                              onClick={() => telechargerBlob(`/actes/${a.id}/docx`, `${a.numero}.docx`)}
                              className="flex items-center gap-1 text-navy-700 hover:underline text-xs"
                              title="Telecharger la version Word modifiable"
                            >
                              <Download size={13} /> Word
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {a.statut_validation === 'VALIDE' && (
                      <div className="mt-2 ml-0.5 border-l-2 border-gray-200 pl-3 space-y-1.5 text-xs">
                        {a.valide_le && (
                          <div className="flex items-center gap-2 text-green-700">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <span>
                              <span className="font-medium">Acte validé</span>
                              <span className="text-gray-500"> — {new Date(a.valide_le).toLocaleString('fr-FR')}</span>
                            </span>
                          </div>
                        )}

                        {a.envoye_client_le && (
                          <div className="flex items-center gap-2 text-blue-700">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span>
                              <span className="font-medium">Envoyé au client</span>
                              <span className="text-gray-500"> — {new Date(a.envoye_client_le).toLocaleString('fr-FR')}</span>
                            </span>
                          </div>
                        )}

                        {a.signe_client_le && (
                          <div className="flex items-center gap-2 text-green-700">
                            <span className="w-2 h-2 rounded-full bg-green-600 shrink-0" />
                            <span>
                              <span className="font-medium">Signé par le client</span>
                              <span className="text-gray-500"> — {new Date(a.signe_client_le).toLocaleString('fr-FR')}</span>
                            </span>
                          </div>
                        )}

                        {a.notifie_le && (
                          <div className="flex items-center gap-2 text-purple-700">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                            <span>
                              <span className="font-medium">
                                Notifié par {[a.notifie_par_prenom, a.notifie_par_nom].filter(Boolean).join(' ') || 'Agent non renseigné'}
                              </span>
                              <span className="text-gray-500"> — {new Date(a.notifie_le).toLocaleString('fr-FR')}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {estLettreClient && (
                      <div className="mt-1.5 flex items-center gap-2">
                        {a.signe_client_le ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            <CheckCircle2 size={11} /> Signee le {new Date(a.signe_client_le).toLocaleDateString('fr-FR')}
                          </span>
                        ) : a.envoye_client_le ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs text-brass-700 bg-brass-50 border border-brass-200 rounded-full px-2 py-0.5">
                              <Clock size={11} /> Envoyee le {new Date(a.envoye_client_le).toLocaleDateString('fr-FR')} — en attente de signature
                            </span>
                            {estHuissier && (
                              <button
                                disabled={busy}
                                onClick={() => handleMarquerSigne(a.id)}
                                className="text-xs text-navy-700 hover:underline disabled:opacity-50"
                              >
                                Marquer signee
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                            Brouillon — pas encore envoyee
                          </span>
                        )}
                      </div>
                    )}
                    {estActeProcedure && (
                      <div className="mt-1.5 flex items-center gap-2">
                        {a.notifie_par ? (
                          <span className="inline-flex items-center gap-1 text-xs text-navy-700 bg-navy-50 border border-navy-100 rounded-full px-2 py-0.5">
                            <UserCheck size={11} /> Notifie par {a.notifie_par_nom} {a.notifie_par_prenom} le{' '}
                            {a.notifie_le ? new Date(a.notifie_le).toLocaleDateString('fr-FR') : ''}
                          </span>
                        ) : estHuissier ? (
                          <button
                            disabled={busy}
                            onClick={() => setNotifierActeId(a.id)}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5 hover:bg-gray-200 disabled:opacity-50"
                          >
                            <UserCheck size={11} /> Marquer notifie
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">Non notifie</span>
                        )}
                      </div>
                    )}                    {a.motif_rejet && a.statut_validation === 'BROUILLON' && (
                      <p className="mt-1.5 text-xs text-wine-600 bg-wine-50 border border-wine-100 rounded-md px-2 py-1">
                        Rejete : {a.motif_rejet}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-navy-900">Factures ({dossier.factures.length})</h2>
            <button
              onClick={() => setShowNouvelleFacture(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-navy-700 border border-navy-200 rounded-md px-2.5 py-1.5 hover:bg-navy-50"
            >
              <Receipt size={14} /> Nouvelle facture
            </button>
          </div>
          {dossier.factures.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune facture pour ce dossier.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dossier.factures.map((f) => (
                <li key={f.id} className="flex justify-between border-b border-gray-100 pb-2">
                  <Link to={`/facturation/${f.id}`} className="text-navy-700 hover:underline font-medium">
                    {f.numero}
                  </Link>
                  <span className="text-gray-500">
                    {f.montant_paye} / {f.montant_total} FCFA
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {dossier.type === 'RECOUVREMENT' && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-semibold text-navy-900 flex items-center gap-1.5">
              <HandCoins size={15} className="text-gold-700" /> Créances
            </h2>
            <div className="flex items-center gap-2">
              {creancesTotal > 0 && (
                <Link
                  to={`/recouvrement?dossierId=${dossier.id}`}
                  className="text-xs font-medium text-navy-700 hover:underline"
                >
                  Voir toutes les créances
                </Link>
              )}
              <button
                onClick={() => setShowNouvelleCreance(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-gold-700 border border-gold-200 rounded-md px-2.5 py-1.5 hover:bg-gold-50"
              >
                <HandCoins size={14} /> Nouvelle créance
              </button>
            </div>
          </div>

          {loadingCreances ? (
            <p className="text-sm text-gray-400">Chargement des créances…</p>
          ) : creancesTotal === 0 ? (
            <p className="text-sm text-gray-400">
              Aucune créance pour ce dossier. Ajoutez la première créance due par le débiteur.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-md bg-gold-50 border border-gold-100 px-3 py-2">
                  <p className="text-xs text-gold-700">Créances</p>
                  <p className="font-nums text-lg font-semibold text-gold-800">{creancesTotal}</p>
                </div>
                <div className="rounded-md bg-navy-50 border border-navy-100 px-3 py-2">
                  <p className="text-xs text-navy-700">Montant initial</p>
                  <p className="font-nums text-lg font-semibold text-navy-900">
                    {new Intl.NumberFormat('fr-FR').format(
                      creances.reduce((total, creance) => total + Number(creance.montant_initial), 0),
                    )} FCFA
                  </p>
                </div>
                <div className="rounded-md bg-wine-50 border border-wine-100 px-3 py-2">
                  <p className="text-xs text-wine-700">Créances actives</p>
                  <p className="font-nums text-lg font-semibold text-wine-800">
                    {creances.filter((creance) => creance.statut === 'ACTIVE').length}
                  </p>
                </div>
              </div>

              <ul className="divide-y divide-gray-100 text-sm">
                {creances
                  .slice()
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 5)
                  .map((creance) => (
                    <li key={creance.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <Link
                          to={`/recouvrement/${creance.id}`}
                          className="font-nums font-semibold text-navy-700 hover:text-gold-700 hover:underline"
                        >
                          {creance.numero}
                        </Link>
                        <p className="truncate text-xs text-gray-500">{creance.libelle}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-nums text-xs font-semibold text-gold-700">
                          {new Intl.NumberFormat('fr-FR').format(Number(creance.montant_initial))} FCFA
                        </span>
                        <Badge
                          statut={creance.statut}
                          label={LABELS_STATUT_CREANCE[creance.statut]}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      )}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-navy-900 flex items-center gap-1.5">
            <Paperclip size={15} className="text-navy-700" /> Pieces jointes ({piecesJointes.length})
          </h2>
        </div>

        <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-2 mb-4 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Fichier (PDF, JPG, PNG — 15 Mo max)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-xs file:font-medium file:bg-white hover:file:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categorie</label>
            <select
              value={uploadCategorie}
              onChange={(e) => setUploadCategorie(e.target.value as CategoriePieceJointe)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              {Object.entries(LABELS_CATEGORIE_PIECE_JOINTE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!uploadFile || uploading}
            className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-900 text-white text-xs font-medium rounded-md px-3 py-2 disabled:opacity-50"
          >
            <Upload size={14} /> {uploading ? 'Envoi…' : 'Ajouter'}
          </button>
        </form>
        {uploadError && <p className="text-xs text-red-600 mb-3">{uploadError}</p>}

        {loadingPj ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : piecesJointes.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune piece jointe pour ce dossier.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {piecesJointes.map((pj) => (
              <li key={pj.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-navy-50 flex items-center justify-center shrink-0">
                    {pj.type_mime.startsWith('image/') ? (
                      <FileImage size={13} className="text-navy-700" />
                    ) : (
                      <FileIcon size={13} className="text-navy-700" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800">{pj.nom_original}</p>
                    <p className="text-xs text-gray-400">
                      {LABELS_CATEGORIE_PIECE_JOINTE[pj.categorie]} · {formatTaille(pj.taille_octets)} ·{' '}
                      {new Date(pj.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <button
                    onClick={() => telechargerBlob(`/pieces-jointes/${pj.id}/download`, pj.nom_original)}
                    className="flex items-center gap-1 text-navy-700 hover:underline text-xs"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    disabled={deletingPjId === pj.id}
                    onClick={() => handleDeletePj(pj)}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-40"
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-navy-900">Historique</h2>

          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {(() => {
              const compteurs = compterHistorique(dossier.historique);

              return [
                ['TOUS', 'Tous'],
                ['ACTES', 'Actes'],
                ['DOSSIER', 'Dossier'],
              ].map(([valeur, libelle]) => (
                <button
                  key={valeur}
                  type="button"
                  onClick={() => setFiltreHistorique(valeur as 'TOUS' | 'ACTES' | 'DOSSIER')}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    filtreHistorique === valeur
                      ? 'bg-white text-navy-800 shadow-sm'
                      : 'text-gray-500 hover:text-navy-700'
                  }`}
                >
                  {libelle} ({compteurs[valeur as 'TOUS' | 'ACTES' | 'DOSSIER']})
                </button>
              ));
            })()}
          </div>
        </div>
        {dossier.historique.filter((h) => {
          if (filtreHistorique === 'TOUS') return true;
          if (filtreHistorique === 'ACTES') return h.action.startsWith('ACTE_');
          return !h.action.startsWith('ACTE_');
        }).length === 0 ? (
          <p className="text-sm text-gray-400 py-3">
            {filtreHistorique === 'ACTES'
              ? 'Aucun événement lié aux actes.'
              : filtreHistorique === 'DOSSIER'
                ? 'Aucun événement général du dossier.'
                : 'Aucun événement dans l’historique.'}
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {dossier.historique
            .filter((h) => {
              if (filtreHistorique === 'TOUS') return true;
              if (filtreHistorique === 'ACTES') return h.action.startsWith('ACTE_');
              return !h.action.startsWith('ACTE_');
            })
            .map((h) => {
            const style = styleHistorique(h.action);
            const Icon = style.Icon;
            const detail = detailHistorique(h.action, h.details);

            return (
              <li
                key={h.id}
                className={`border-l-2 ${style.border} ${style.background} rounded-r-md px-3 py-2`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={15} className={style.iconColor} />

                  <span className="font-medium text-navy-900">
                    {formatHistorique(h.action, h.details)}
                  </span>

                  <span className="text-gray-400 text-xs ml-auto shrink-0">
                    {new Date(h.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>

                {h.utilisateur_nom && (
                  <p className="text-gray-500 text-xs ml-[23px] mt-0.5">
                    par {h.utilisateur_nom} {h.utilisateur_prenom ?? ''}
                  </p>
                )}

                {detail && (

                  <p className="text-red-700 text-xs ml-[23px] mt-1">

                    {detail}

                  </p>

                )}
              </li>
            );
          })}
          </ul>
        )}
      </div>

      {showGenererActe && (
        <GenererActeModal
          dossierId={dossier.id}
          onClose={() => setShowGenererActe(false)}
          onCreated={() => {
            setShowGenererActe(false);
            load();
          }}
        />
      )}
      {showNouvelleFacture && (
        <NouvelleFactureModal
          dossierId={dossier.id}
          onClose={() => setShowNouvelleFacture(false)}
          onCreated={() => {
            setShowNouvelleFacture(false);
            load();
          }}
        />
      )}
      {showNouvelleCreance && (
        <NouvelleCreanceModal
          dossierId={dossier.id}
          onClose={() => setShowNouvelleCreance(false)}
          onCreated={() => {
            setShowNouvelleCreance(false);
            load();
          }}
        />
      )}
      {showCorrigerTiers && (
        <CorrigerTiersModal
          dossier={dossier}
          onClose={() => setShowCorrigerTiers(false)}
          onSaved={() => {
            setShowCorrigerTiers(false);
            load();
          }}
        />
      )}
      {notifierActeId && (
        <NotifierModal
          agents={agents}
          onClose={() => setNotifierActeId(null)}
          onConfirm={(agentId) => handleMarquerNotifie(notifierActeId, agentId)}
        />
      )}
      {showAssignerClerc && (
        <AssignerModal
          titre="Assigner un clerc responsable"
          libelleVide="Aucun clerc assigne"
          utilisateurs={clercs}
          valeurActuelle={dossier.assigne_clerc_id ?? null}
          onClose={() => setShowAssignerClerc(false)}
          onConfirm={handleAssignerClerc}
        />
      )}
      {showAssignerAgent && (
        <AssignerModal
          titre="Assigner un agent terrain"
          libelleVide="Aucun agent assigne"
          utilisateurs={agentsTerrain}
          valeurActuelle={dossier.assigne_agent_id ?? null}
          onClose={() => setShowAssignerAgent(false)}
          onConfirm={handleAssignerAgent}
        />
      )}
    </div>
  );
}

function compterHistorique(actions: Array<{ action: string }>) {
  const total = actions.length;
  const actes = actions.filter((entree) => entree.action.startsWith('ACTE_')).length;

  return {
    TOUS: total,
    ACTES: actes,
    DOSSIER: total - actes,
  };
}
function styleHistorique(action: string) {
  switch (action) {
    case 'ACTE_VALIDE':
    case 'ACTE_CREE_ET_VALIDE_PAR_HUISSIER':
      return {
        border: 'border-green-200',
        background: 'bg-green-50',
        iconColor: 'text-green-700',
        Icon: CheckCircle2,
      };

    case 'ACTE_ENVOYE_CLIENT':
      return {
        border: 'border-blue-200',
        background: 'bg-blue-50',
        iconColor: 'text-blue-700',
        Icon: Send,
      };

    case 'ACTE_SIGNE_CLIENT':
      return {
        border: 'border-emerald-200',
        background: 'bg-emerald-50',
        iconColor: 'text-emerald-700',
        Icon: CheckCircle2,
      };

    case 'ACTE_NOTIFIE':
      return {
        border: 'border-purple-200',
        background: 'bg-purple-50',
        iconColor: 'text-purple-700',
        Icon: UserCheck,
      };

    case 'ACTE_REJETE':
      return {
        border: 'border-red-200',
        background: 'bg-red-50',
        iconColor: 'text-red-700',
        Icon: XCircle,
      };

    case 'ACTE_SOUMIS_VALIDATION':
      return {
        border: 'border-brass-200',
        background: 'bg-brass-50',
        iconColor: 'text-brass-700',
        Icon: Clock,
      };

    default:
      return {
        border: 'border-navy-100',
        background: 'bg-white',
        iconColor: 'text-navy-600',
        Icon: Clock,
      };
  }
}
function detailHistorique(action: string, details: Record<string, unknown> | null) {
  if (action === 'ACTE_REJETE' && typeof details?.motif === 'string' && details.motif.trim()) {
    return `Motif : ${details.motif}`;
  }

  return null;
}
function formatHistorique(action: string, details: Record<string, unknown> | null) {
  const numeroActe = typeof details?.numeroActe === 'string' ? details.numeroActe : null;
  const agent = typeof details?.agent === 'string' ? details.agent : null;

  const suffixeActe = numeroActe ? ` ${numeroActe}` : '';

  switch (action) {
    case 'ACTE_ENVOYE_CLIENT':
      return `Acte${suffixeActe} envoyé au client`;

    case 'ACTE_SIGNE_CLIENT':
      return `Acte${suffixeActe} signé par le client`;

    case 'ACTE_NOTIFIE':
      return agent
        ? `Acte${suffixeActe} notifié par ${agent}`
        : `Acte${suffixeActe} notifié`;

    default:
      return formatAction(action);
  }
}

function formatAction(action: string) {
  switch (action) {
    case 'CREATION':
      return 'Dossier créé';

    case 'CHANGEMENT_STATUT':
      return 'Statut du dossier modifié';

    case 'CHANGEMENT_TIERS':
      return 'Client ou débiteur modifié';

    case 'ACTE_BROUILLON_CREE':
      return 'Brouillon d’acte créé';

    case 'ACTE_CREE_ET_VALIDE_PAR_HUISSIER':
      return 'Acte créé et validé par l’huissier';

    case 'ACTE_BROUILLON_MODIFIE':
      return 'Brouillon d’acte modifié';

    case 'ACTE_CORRIGE_PAR_VALIDATEUR':
      return 'Acte corrigé par le validateur';

    case 'ACTE_SOUMIS_VALIDATION':
      return 'Acte soumis à validation';

    case 'ACTE_VALIDE':
      return 'Acte validé';

    case 'ACTE_REJETE':
      return 'Acte rejeté';

    case 'ACTE_ENVOYE_CLIENT':
      return 'Acte envoyé au client';

    case 'ACTE_SIGNE_CLIENT':
      return 'Acte signé par le client';

    case 'ACTE_NOTIFIE':
      return 'Acte notifié';

    default:
      return action
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/^\w/, (letter: string) => letter.toUpperCase());
  }
}

// Recherche + selection d'un tiers (client ou debiteur), reutilisee pour
// corriger un dossier existant. Pattern independant de celui de
// DossiersList.tsx pour eviter tout couplage entre les deux fichiers.
function RechercheTiers({
  roleTiers,
  onSelect,
}: {
  roleTiers: 'CLIENT' | 'DEBITEUR';
  onSelect: (c: { id: string; nom: string }) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Client[]>([]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (search.length < 2) {
        setResults([]);
        return;
      }
      const { data } = await api.get<PaginatedResult<Client>>('/clients', {
        params: { search, limit: 5 },
      });
      setResults(data.data);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Rechercher un ${roleTiers === 'CLIENT' ? 'client' : 'debiteur'}…`}
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
      />
      {results.length > 0 && (
        <ul className="mt-1 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-32 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect({ id: c.id, nom: `${c.nom} ${c.prenom ?? ''}`.trim() });
                  setSearch('');
                  setResults([]);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                {c.nom} {c.prenom ?? ''} {c.telephone ? `· ${c.telephone}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CorrigerTiersModal({
  dossier,
  onClose,
  onSaved,
}: {
  dossier: DossierDetailType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [client, setClient] = useState<{ id: string; nom: string } | null>({
    id: dossier.client_id,
    nom: `${dossier.client_nom ?? ''} ${dossier.client_prenom ?? ''}`.trim(),
  });
  const [debiteur, setDebiteur] = useState<{ id: string; nom: string } | null>(
    dossier.debiteur_id
      ? { id: dossier.debiteur_id, nom: `${dossier.debiteur_nom ?? ''} ${dossier.debiteur_prenom ?? ''}`.trim() }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!client) {
      setError('Le dossier doit avoir un client.');
      return;
    }
    if (!debiteur) {
      setError('Le dossier doit obligatoirement avoir un debiteur.');
      return;
    }
    if (client.id === debiteur.id) {
      setError('Le client mandant et le debiteur doivent etre deux fiches distinctes.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/dossiers/${dossier.id}/tiers`, {
        clientId: client.id,
        debiteurId: debiteur.id,
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la correction.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Corriger le client / debiteur" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Client (mandant)</label>
          {client ? (
            <div className="flex items-center justify-between rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm">
              <span>{client.nom}</span>
              <button type="button" onClick={() => setClient(null)} className="text-navy-700 text-xs">
                Changer
              </button>
            </div>
          ) : (
            <RechercheTiers roleTiers="CLIENT" onSelect={setClient} />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Debiteur (poursuivi)
          </label>
          {debiteur ? (
            <div className="flex items-center justify-between rounded-lg border border-wine-200 bg-wine-50 px-3 py-2 text-sm">
              <span>{debiteur.nom}</span>
              <button type="button" onClick={() => setDebiteur(null)} className="text-wine-600 text-xs">
                Retirer
              </button>
            </div>
          ) : (
            <RechercheTiers roleTiers="DEBITEUR" onSelect={setDebiteur} />
          )}
        </div>

        {error && <p className="text-sm text-wine-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  );
}

function NotifierModal({
  agents,
  onClose,
  onConfirm,
}: {
  agents: UtilisateurSimple[];
  onClose: () => void;
  onConfirm: (agentId: string) => void;
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '');

  return (
    <Modal title="Marquer l'acte comme notifie" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Agent ayant notifie / signifie l'acte</label>
          {agents.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun Huissier ou Clerc actif trouve.</p>
          ) : (
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom} {a.prenom} ({a.role === 'HUISSIER' ? 'Huissier' : 'Clerc'})
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => agentId && onConfirm(agentId)}
          disabled={!agentId}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60"
        >
          Confirmer
        </button>
      </div>
    </Modal>
  );
}

function AssignerModal({
  titre,
  libelleVide,
  utilisateurs,
  valeurActuelle,
  onClose,
  onConfirm,
}: {
  titre: string;
  libelleVide: string;
  utilisateurs: UtilisateurSimple[];
  valeurActuelle: string | null;
  onClose: () => void;
  onConfirm: (id: string | null) => void;
}) {
  const [selection, setSelection] = useState(valeurActuelle ?? '');

  return (
    <Modal title={titre} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Choisir</label>
          <select
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          >
            <option value="">{libelleVide}</option>
            {utilisateurs.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom} {u.prenom}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => onConfirm(selection || null)}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-lg py-2"
        >
          Confirmer
        </button>
      </div>
    </Modal>
  );
}




































