import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Check, X, Inbox, Eye, Download, FileText, Send, BadgeCheck, UserCheck } from 'lucide-react';
import {
  validerActe,
  rejeterActe,
  getActe,
  corrigerActeEnAttente,
  separerStyleEtCorps,
  recombinerDocument,
  getActesValides,
  ouvrirPdfActe,
  telechargerDocxActe,
  envoyerActeAuClient,
  marquerActeSigne,
  getAgentsActifs,
  marquerActeNotifie,
  ActeValide,
  AgentActif,
} from '../../lib/actes';
import { api } from '../../lib/api';
import { ActeAValider, LABELS_TYPE_ACTE } from '../../types';
import { SOLID, BORDER_TOP } from '../../lib/theme';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import EditeurActe from '../../components/EditeurActe';

type Onglet = 'a-valider' | 'valides' | 'signes';

export default function ActesAValider() {
  const [actes, setActes] = useState<ActeAValider[]>([]);
  const [actesValides, setActesValides] = useState<ActeValide[]>([]);
  const [actesSignes, setActesSignes] = useState<ActeValide[]>([]);
  const [ongletActif, setOngletActif] = useState<Onglet>('a-valider');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejetActeId, setRejetActeId] = useState<string | null>(null);
  const [corrigerActeId, setCorrigerActeId] = useState<string | null>(null);
  const [actionPostValidation, setActionPostValidation] = useState<{ type: 'envoi' | 'signe' | 'notification'; id: string } | null>(null);
  const [errorPostValidation, setErrorPostValidation] = useState<string | null>(null);
  const [agentsActifs, setAgentsActifs] = useState<AgentActif[]>([]);
  const [notificationActe, setNotificationActe] = useState<ActeValide | null>(null);
  const [agentNotificateurId, setAgentNotificateurId] = useState('');

  async function loadEnAttente() {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<ActeAValider[]>('/actes/a-valider');
      setActes(data);
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Impossible de charger les actes à valider.');
    } finally {
      setLoading(false);
    }
  }

  async function loadValides() {
    setLoading(true);
    setError(null);

    try {
      const data = await getActesValides();
      setActesValides(data);
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Impossible de charger les actes validés.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSignes() {
    setLoading(true);
    setError(null);

    try {
      const data = await getActesValides(true);
      setActesSignes(data);
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Impossible de charger les actes signés.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ongletActif === 'a-valider') {
      loadEnAttente();
    } else if (ongletActif === 'valides') {
      loadValides();
    } else {
      loadSignes();
    }
  }, [ongletActif]);

  async function handleValider(id: string) {
    setBusyId(id);
    setError(null);

    try {
      await validerActe(id);
      await loadEnAttente();
      await loadValides();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la validation.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejeter(id: string, motif: string) {
    setBusyId(id);
    setError(null);

    try {
      await rejeterActe(id, motif || undefined);
      setRejetActeId(null);
      await loadEnAttente();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors du rejet.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleEnvoyerClient(a: ActeValide) {
    const confirme = window.confirm(
      `Envoyer le PDF officiel « ${a.numero} » à l'adresse email du client ?`,
    );

    if (!confirme) return;

    setActionPostValidation({ type: 'envoi', id: a.id });
    setErrorPostValidation(null);

    try {
      await envoyerActeAuClient(a.id);
      await loadValides();
    } catch (err: any) {
      setErrorPostValidation(
        err.response?.data?.message?.toString() ?? "L'envoi de l'acte a échoué.",
      );
    } finally {
      setActionPostValidation(null);
    }
  }

  async function handleMarquerSigne(a: ActeValide) {
    const confirme = window.confirm(
      `Confirmer que le client a signé ou retourné l'acte « ${a.numero} » ?`,
    );

    if (!confirme) return;

    setActionPostValidation({ type: 'signe', id: a.id });
    setErrorPostValidation(null);

    try {
      await marquerActeSigne(a.id);
      await loadValides();
      await loadSignes();
    } catch (err: any) {
      setErrorPostValidation(
        err.response?.data?.message?.toString() ?? 'Impossible de marquer cet acte comme signé.',
      );
    } finally {
      setActionPostValidation(null);
    }
  }
  async function ouvrirNotification(a: ActeValide) {
    setErrorPostValidation(null);
    setAgentNotificateurId('');

    try {
      const agents = await getAgentsActifs();
      setAgentsActifs(agents);
      setNotificationActe(a);
    } catch (err: any) {
      setErrorPostValidation(
        err.response?.data?.message?.toString() ?? 'Impossible de charger la liste des agents.',
      );
    }
  }

  async function confirmerNotification() {
    if (!notificationActe || !agentNotificateurId) return;

    setActionPostValidation({ type: 'notification', id: notificationActe.id });
    setErrorPostValidation(null);

    try {
      await marquerActeNotifie(notificationActe.id, agentNotificateurId);
      setNotificationActe(null);
      await loadSignes();
      await loadValides();
    } catch (err: any) {
      setErrorPostValidation(
        err.response?.data?.message?.toString() ?? 'Impossible de marquer cet acte comme notifié.',
      );
    } finally {
      setActionPostValidation(null);
    }
  }
  function fmtDate(d?: string | null) {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function nomNotificateur(a: ActeValide) {
    return [a.notifie_par_prenom, a.notifie_par_nom].filter(Boolean).join(' ') || 'Agent non renseigné';
  }
  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Gestion des actes"
        subtitle="Validation, consultation et téléchargement des documents officiels du cabinet."
      />

      <div className="mb-5 flex gap-1 border-b border-gray-200" role="tablist" aria-label="Gestion des actes">
        <button
          type="button"
          role="tab"
          aria-selected={ongletActif === 'a-valider'}
          onClick={() => setOngletActif('a-valider')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            ongletActif === 'a-valider'
              ? 'border-navy-700 text-navy-800'
              : 'border-transparent text-gray-500 hover:text-navy-700'
          }`}
        >
          Actes à valider
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={ongletActif === 'valides'}
          onClick={() => setOngletActif('valides')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            ongletActif === 'valides'
              ? 'border-navy-700 text-navy-800'
              : 'border-transparent text-gray-500 hover:text-navy-700'
          }`}
        >
          Actes validés
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={ongletActif === 'signes'}
          onClick={() => setOngletActif('signes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            ongletActif === 'signes'
              ? 'border-navy-700 text-navy-800'
              : 'border-transparent text-gray-500 hover:text-navy-700'
          }`}
        >
          Actes signés
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {error}
        </div>
      )}

      {errorPostValidation && (
        <div className="mb-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {errorPostValidation}
        </div>
      )}

      {ongletActif === 'a-valider' && (
        <div role="tabpanel">
    
      {loading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : actes.length === 0 ? (
            <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.navy} p-10 text-center`}>
              <Inbox size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">Aucun acte en attente de validation pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actes.map((a) => (
                <div
                  key={a.id}
                  className={`bg-white rounded-xl border border-gray-200 border-l-4 ${BORDER_TOP.brass} p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-nums font-semibold text-navy-900">{a.numero}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brass-50 text-brass-700">
                        {LABELS_TYPE_ACTE[a.type]}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      <Link to={`/dossiers/${a.dossier_id}`} className="text-navy-700 hover:underline font-nums">
                        {a.dossier_numero}
                      </Link>
                      {a.soumis_par_nom && ` · Soumis par ${a.soumis_par_nom} ${a.soumis_par_prenom ?? ''}`}
                      {a.soumis_le && ` · ${new Date(a.soumis_le).toLocaleString('fr-FR')}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCorrigerActeId(a.id)}
                      disabled={busyId === a.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-navy-700 border border-navy-200 rounded-lg px-3 py-1.5 hover:bg-navy-50 disabled:opacity-50"
                    >
                      <Eye size={13} /> Voir / Corriger
                    </button>

                    <button
                      type="button"
                      onClick={() => setRejetActeId(a.id)}
                      disabled={busyId === a.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-wine-600 border border-wine-200 rounded-lg px-3 py-1.5 hover:bg-wine-50 disabled:opacity-50"
                    >
                      <X size={13} /> Rejeter
                    </button>

                    <button
                      type="button"
                      onClick={() => handleValider(a.id)}
                      disabled={busyId === a.id}
                      className={`flex items-center gap-1.5 text-xs font-medium text-white rounded-lg px-3 py-1.5 disabled:opacity-50 ${SOLID.green}`}
                    >
                      <Check size={13} /> {busyId === a.id ? 'Validation…' : 'Valider'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ongletActif === 'valides' && (
        <div role="tabpanel">
    
      {loading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : actesValides.length === 0 ? (
            <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.navy} p-10 text-center`}>
              <Inbox size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">Aucun acte validé pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actesValides.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-green-500 p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-nums font-semibold text-navy-900">{a.numero}</span>

                      <Badge
                        color="green"
                        title={a.valide_le ? `Validé le ${fmtDate(a.valide_le)}` : undefined}
                      >
                        Validé
                      </Badge>

                      {a.envoye_client_le && (
                        <Badge
                          color="blue"
                          title={`Envoyé au client le ${fmtDate(a.envoye_client_le)}`}
                        >
                          Envoyé au client
                        </Badge>
                      )}

                      {a.signe_client_le && (
                        <Badge
                          color="green"
                          title={`Signé le ${fmtDate(a.signe_client_le)}`}
                        >
                          Signé
                        </Badge>
                      )}

                      {a.notifie_le && (
                        <Badge
                          color="purple"
                          title={`Notifié par ${nomNotificateur(a)} le ${fmtDate(a.notifie_le)}`}
                        >
                          Notifié par {nomNotificateur(a)}
                        </Badge>
                      )}

                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brass-50 text-brass-700">
                        {LABELS_TYPE_ACTE[a.type]}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      <Link to={`/dossiers/${a.dossier_id}`} className="text-navy-700 hover:underline font-nums">
                        {a.dossier_numero}
                      </Link>
                      {a.valide_le && ` · Validé le ${new Date(a.valide_le).toLocaleString('fr-FR')}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {a.pdf_disponible && (
                      <button
                        type="button"
                        onClick={() => ouvrirPdfActe(a.id, a.numero)}
                        className="flex items-center gap-1.5 text-xs font-medium text-navy-700 border border-navy-200 rounded-lg px-3 py-1.5 hover:bg-navy-50"
                      >
                        <Eye size={13} /> PDF
                      </button>
                    )}

                    {a.docx_disponible && (
                      <button
                        type="button"
                        onClick={() => telechargerDocxActe(a.id, a.numero)}
                        className="flex items-center gap-1.5 text-xs font-medium text-navy-700 border border-navy-200 rounded-lg px-3 py-1.5 hover:bg-navy-50"
                      >
                        <Download size={13} /> Word
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEnvoyerClient(a)}
                      disabled={actionPostValidation?.id === a.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-navy-700 border border-navy-200 rounded-lg px-3 py-1.5 hover:bg-navy-50 disabled:opacity-50"
                    >
                      <Send size={13} />
                      {actionPostValidation?.id === a.id && actionPostValidation.type === 'envoi'
                        ? 'Envoi…'
                        : 'Envoyer'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarquerSigne(a)}
                      disabled={actionPostValidation?.id === a.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 disabled:opacity-50"
                    >
                      <BadgeCheck size={13} />
                      {actionPostValidation?.id === a.id && actionPostValidation.type === 'signe'
                        ? 'Mise à jour…'
                        : 'Signé'}
                    </button>

                    <Link
                      to={`/dossiers/${a.dossier_id}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                    >
                      <FileText size={13} /> Dossier
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ongletActif === 'signes' && (
        <div role="tabpanel">
          {loading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : actesSignes.length === 0 ? (
            <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${BORDER_TOP.navy} p-10 text-center`}>
              <Inbox size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">Aucun acte signé pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actesSignes.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-green-600 p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-nums font-semibold text-navy-900">{a.numero}</span>

                      <Badge
                        color="green"
                        title={a.valide_le ? `Validé le ${fmtDate(a.valide_le)}` : undefined}
                      >
                        Validé
                      </Badge>

                      {a.envoye_client_le && (
                        <Badge
                          color="blue"
                          title={`Envoyé au client le ${fmtDate(a.envoye_client_le)}`}
                        >
                          Envoyé au client
                        </Badge>
                      )}

                      <Badge
                        color="green"
                        title={a.signe_client_le ? `Signé le ${fmtDate(a.signe_client_le)}` : undefined}
                      >
                        Signé
                      </Badge>

                      {a.notifie_le && (
                        <Badge
                          color="purple"
                          title={`Notifié par ${nomNotificateur(a)} le ${fmtDate(a.notifie_le)}`}
                        >
                          Notifié par {nomNotificateur(a)}
                        </Badge>
                      )}

                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brass-50 text-brass-700">
                        {LABELS_TYPE_ACTE[a.type]}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      <Link to={`/dossiers/${a.dossier_id}`} className="text-navy-700 hover:underline font-nums">
                        {a.dossier_numero}
                      </Link>
                      {a.signe_client_le && ` · Signé le ${new Date(a.signe_client_le).toLocaleString('fr-FR')}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {a.pdf_disponible && (
                      <button
                        type="button"
                        onClick={() => ouvrirPdfActe(a.id, a.numero)}
                        className="flex items-center gap-1.5 text-xs font-medium text-navy-700 border border-navy-200 rounded-lg px-3 py-1.5 hover:bg-navy-50"
                      >
                        <Eye size={13} /> PDF
                      </button>
                    )}

                    {a.docx_disponible && (
                      <button
                        type="button"
                        onClick={() => telechargerDocxActe(a.id, a.numero)}
                        className="flex items-center gap-1.5 text-xs font-medium text-navy-700 border border-navy-200 rounded-lg px-3 py-1.5 hover:bg-navy-50"
                      >
                        <Download size={13} /> Word
                      </button>
                    )}

                    {!a.notifie_le && (
                      <button
                        type="button"
                        onClick={() => ouvrirNotification(a)}
                        disabled={actionPostValidation?.id === a.id}
                        className="flex items-center gap-1.5 text-xs font-medium text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 disabled:opacity-50"
                      >
                        <UserCheck size={13} />
                        {actionPostValidation?.id === a.id && actionPostValidation.type === 'notification'
                          ? 'Mise à jour…'
                          : 'Notifié'}
                      </button>
                    )}

                    <Link
                      to={`/dossiers/${a.dossier_id}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                    >
                      <FileText size={13} /> Dossier
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {notificationActe && (
        <Modal title="Marquer l'acte comme notifié" onClose={() => setNotificationActe(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Acte : <span className="font-nums font-medium">{notificationActe.numero}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Agent notificateur
              </label>

              <select
                value={agentNotificateurId}
                onChange={(e) => setAgentNotificateurId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                <option value="">Sélectionner un agent…</option>
                {agentsActifs.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.nom} {agent.prenom} — {agent.role}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-gray-400">
              Cette action conserve la date de notification et l'agent responsable.
            </p>

            <button
              type="button"
              onClick={confirmerNotification}
              disabled={!agentNotificateurId}
              className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-50"
            >
              Confirmer la notification
            </button>
          </div>
        </Modal>
      )}

      {rejetActeId && (
        <RejeterModal
          onClose={() => setRejetActeId(null)}
          onConfirm={(motif) => handleRejeter(rejetActeId, motif)}
        />
      )}

      {corrigerActeId && (
        <CorrigerModal
          acteId={corrigerActeId}
          onClose={() => setCorrigerActeId(null)}
          onSaved={() => {
            setCorrigerActeId(null);
            loadEnAttente();
          }}
        />
      )}
    </div>
  );
}

function RejeterModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (motif: string) => void }) {
  const [motif, setMotif] = useState('');

  return (
    <Modal title="Rejeter l'acte" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Motif du rejet <span className="text-gray-400 font-normal">(optionnel, visible par le créateur)</span>
          </label>

          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={3}
            placeholder="Ex : corriger le montant, vérifier l'adresse du débiteur…"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
          />
        </div>

        <p className="text-xs text-gray-400">
          L'acte repassera en brouillon, modifiable par son créateur, qui pourra le resoumettre.
        </p>

        <button
          type="button"
          onClick={() => onConfirm(motif)}
          className="w-full bg-wine-600 hover:bg-wine-700 text-white text-sm font-medium rounded-lg py-2"
        >
          Confirmer le rejet
        </button>
      </div>
    </Modal>
  );
}

function CorrigerModal({
  acteId,
  onClose,
  onSaved,
}: {
  acteId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [styleBlock, setStyleBlock] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActe(acteId)
      .then((acte) => {
        const { styleBlock: sb, bodyHtml: bh } = separerStyleEtCorps(acte.corps_html ?? '');
        setStyleBlock(sb);
        setBodyHtml(bh);
      })
      .catch(() => setError('Impossible de charger le contenu de cet acte.'))
      .finally(() => setLoading(false));
  }, [acteId]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const corpsHtml = recombinerDocument(styleBlock, bodyHtml);
      await corrigerActeEnAttente(acteId, corpsHtml);
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-serif text-[17px] text-navy-900">Vérifier et corriger avant validation</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Vos modifications sont enregistrées lorsque vous cliquez sur « Enregistrer ».
            </p>
          </div>

          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            X
          </button>
        </div>

        <div className="p-5 space-y-4">
    
      {loading ? (
            <p className="text-sm text-gray-400">Chargement du contenu…</p>
          ) : (
            <EditeurActe contenuInitial={bodyHtml} onChange={setBodyHtml} />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium rounded-md py-2 hover:bg-gray-50"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={saving || loading}
              onClick={handleSave}
              className="flex-1 bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer les corrections'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

































