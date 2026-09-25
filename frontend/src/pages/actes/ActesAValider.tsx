import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Check, X, Inbox, Eye } from 'lucide-react';
import { api } from '../../lib/api';
import { validerActe, rejeterActe, getActe, corrigerActeEnAttente } from '../../lib/actes';
import { separerStyleEtCorps, recombinerDocument } from '../../lib/actes';
import { ActeAValider, LABELS_TYPE_ACTE } from '../../types';
import { SOLID, BORDER_TOP } from '../../lib/theme';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import EditeurActe from '../../components/EditeurActe';

export default function ActesAValider() {
  const [actes, setActes] = useState<ActeAValider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejetActeId, setRejetActeId] = useState<string | null>(null);
  const [corrigerActeId, setCorrigerActeId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<ActeAValider[]>('/actes/a-valider');
      setActes(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleValider(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await validerActe(id);
      load();
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
      load();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors du rejet.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Actes a valider"
        subtitle="Documents soumis par le personnel du cabinet, en attente de votre validation avant generation officielle."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {error}
        </div>
      )}

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
                  onClick={() => setCorrigerActeId(a.id)}
                  disabled={busyId === a.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-navy-700 border border-navy-200 rounded-lg px-3 py-1.5 hover:bg-navy-50 disabled:opacity-50"
                >
                  <Eye size={13} /> Voir / Corriger
                </button>
                <button
                  onClick={() => setRejetActeId(a.id)}
                  disabled={busyId === a.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-wine-600 border border-wine-200 rounded-lg px-3 py-1.5 hover:bg-wine-50 disabled:opacity-50"
                >
                  <X size={13} /> Rejeter
                </button>
                <button
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
            load();
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
            Motif du rejet <span className="text-gray-400 font-normal">(optionnel, visible par le createur)</span>
          </label>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={3}
            placeholder="Ex : corriger le montant, verifier l'adresse du debiteur…"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
          />
        </div>
        <p className="text-xs text-gray-400">
          L'acte repassera en brouillon, modifiable par son createur, qui pourra le resoumettre.
        </p>
        <button
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
            <h2 className="font-serif text-[17px] text-navy-900">Verifier et corriger avant validation</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Vos modifications sont enregistrees des que vous cliquez sur "Enregistrer" ci-dessous.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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


