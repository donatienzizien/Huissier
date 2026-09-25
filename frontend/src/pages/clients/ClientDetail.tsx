import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  KeyRound,
  Copy,
  Check,
  BellRing,
  ImagePlus,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import {
  ClientDetail as ClientDetailType,
  LABELS_STATUT_CLIENT,
  LABELS_STATUT_DOSSIER,
  LABELS_TYPE_DOSSIER,
  LABELS_CATEGORIE_CLIENT,
  LABELS_TYPE_ALERTE_CLIENT,
} from '../../types';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function lienWhatsapp(numero: string, message?: string) {
  const numeroPropre = numero.replace(/[^0-9]/g, '');
  const base = 'https://wa.me/' + numeroPropre;

  return message
    ? base + '?text=' + encodeURIComponent(message)
    : base;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const peutGererPortail = user?.role === 'HUISSIER' || user?.role === 'CLERC';
  const [client, setClient] = useState<ClientDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [relanceMessage, setRelanceMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showAccesPortail, setShowAccesPortail] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<ClientDetailType>('/clients/' + id);
      setClient(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRelance(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/clients/' + id + '/relances', {
        message: relanceMessage || undefined,
      });
      setRelanceMessage('');
      load();
    } finally {
      setSending(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      await api.post('/clients/' + id + '/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoVersion((v) => v + 1);
      load();
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleLogoRemove() {
    if (!id || !window.confirm('Retirer le logo de cette fiche ?')) return;
    await api.delete('/clients/' + id + '/logo');
    setLogoVersion((v) => v + 1);
    load();
  }

  if (loading) return <p className="text-gray-400 text-sm">Chargement…</p>;
  if (!client) return <p className="text-gray-400 text-sm">Client introuvable.</p>;

  const initiales = (client.nom?.[0] ?? '') + (client.prenom?.[0] ?? '');
  const initialesMaj = initiales.toUpperCase();
  const aUnLogo = Boolean(client.logo_path);

  return (
    <div>
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-700 mb-4">
        <ArrowLeft size={14} /> Retour aux clients
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative group shrink-0">
            <div className="w-11 h-11 rounded-full bg-navy-700 flex items-center justify-center overflow-hidden text-white text-sm font-medium">
              {aUnLogo ? (
                <img
                  src={'/api/clients/' + id + '/logo?v=' + logoVersion}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                initialesMaj || '?'
              )}
            </div>
            {peutGererPortail && (
              <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  title="Changer le logo"
                  className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-navy-700 hover:bg-gray-50 shadow-sm"
                >
                  <ImagePlus size={11} />
                </button>
                {aUnLogo && (
                  <button
                    onClick={handleLogoRemove}
                    title="Retirer le logo"
                    className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-wine-600 hover:bg-gray-50 shadow-sm"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-navy-900">
              {client.nom} {client.prenom ?? ''}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge statut={client.statut} label={LABELS_STATUT_CLIENT[client.statut]} />
              <Badge
                statut={client.categorie ?? 'PARTICULIER'}
                label={LABELS_CATEGORIE_CLIENT[client.categorie ?? 'PARTICULIER']}
              />
            </div>
          </div>
        </div>
        {peutGererPortail && (
          <button
            onClick={() => setShowAccesPortail(true)}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-navy-200 text-navy-700 hover:bg-navy-50"
          >
            <KeyRound size={14} /> Donner accès portail
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-navy-900 mb-3">Coordonnées</h2>
          <dl className="space-y-2 text-sm">
            {(client.categorie ?? 'PARTICULIER') === 'PARTICULIER' ? (
              <Row label="CNIB / Passeport" value={client.nin} />
            ) : (
              <>
                <Row label="IFU" value={client.ifu} />
                <Row label="RCCM" value={client.rccm} />
              </>
            )}
            <Row label="Téléphone" value={client.telephone} />
            <Row
              label="WhatsApp"
              value={
                client.whatsapp ? (
                  <a
                    href={lienWhatsapp(client.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    {client.whatsapp}
                  </a>
                ) : null
              }
            />
            <Row label="Email" value={client.email} />
            <Row label="Adresse" value={client.adresse} />
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-navy-900 mb-3">Situation financière</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Montant dû (factures)" value={formatFCFA(client.montantDu)} />
            <Row label="Montant encaissé" value={formatFCFA(client.montantEncaisse)} />
            <Row
              label="Solde restant"
              value={
                <span className={client.montantRestant > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                  {formatFCFA(client.montantRestant)}
                </span>
              }
            />
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">
          Dossiers liés ({client.dossiers.length})
        </h2>
        {client.dossiers.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun dossier pour ce client.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left py-2">Numéro</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Statut</th>
                <th className="text-left py-2">Ouverture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {client.dossiers.map((d) => (
                <tr key={d.id}>
                  <td className="py-2">
                    <Link to={'/dossiers/' + d.id} className="text-navy-700 hover:underline font-medium">
                      {d.numero}
                    </Link>
                  </td>
                  <td className="py-2">{LABELS_TYPE_DOSSIER[d.type]}</td>
                  <td className="py-2">
                    <Badge statut={d.statut} label={LABELS_STATUT_DOSSIER[d.statut]} />
                  </td>
                  <td className="py-2 text-gray-500">
                    {new Date(d.date_ouverture).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-navy-900">Relances</h2>
          {client.whatsapp && (
            <a
              href={lienWhatsapp(
                client.whatsapp,
                'Bonjour ' + client.nom + ', nous vous contactons au sujet de votre dossier.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-md px-2.5 py-1.5 hover:bg-emerald-100"
            >
              <MessageCircle size={13} /> Contacter sur WhatsApp
            </a>
          )}
        </div>
        <form onSubmit={handleRelance} className="flex gap-2 mb-4">
          <input
            value={relanceMessage}
            onChange={(e) => setRelanceMessage(e.target.value)}
            placeholder="Note de relance (optionnel)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md px-4 py-2 disabled:opacity-60"
          >
            <Send size={14} /> Relancer
          </button>
        </form>
        <p className="text-xs text-gray-400 mb-3">
          Si le client a une adresse email renseignée, la relance lui est envoyée automatiquement.
          Sinon, elle est simplement consignée ci-dessous.
        </p>
        {client.relances.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune relance envoyée.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {client.relances.map((r) => (
              <li key={r.id} className="border-l-2 border-navy-100 pl-3">
                <span className="text-gray-500">
                  {new Date(r.envoyee_le).toLocaleString('fr-FR')}
                </span>
                {r.envoyee_par_nom && (
                  <span className="text-gray-500"> · {r.envoyee_par_nom}</span>
                )}
                {r.message && <p className="text-gray-700">{r.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <BellRing size={15} className="text-navy-700" />
          <h2 className="text-sm font-semibold text-navy-900">Alertes automatiques</h2>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Rappels d'échéance et de retard envoyés automatiquement au client, sans intervention manuelle.
        </p>
        {client.alertesClients.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune alerte automatique envoyée pour le moment.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {client.alertesClients.map((a) => (
              <li key={a.id} className="border-l-2 border-brass-100 pl-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500">
                    {new Date(a.envoyee_le).toLocaleString('fr-FR')}
                  </span>
                  <Badge
                    statut={a.type === 'RETARD' ? 'INSOLVABLE' : 'ACTIF'}
                    label={LABELS_TYPE_ALERTE_CLIENT[a.type]}
                  />
                  {!a.envoyee && (
                    <span className="text-xs text-wine-600">
                      (email non envoyé — pas d'adresse ou échec SMTP)
                    </span>
                  )}
                </div>
                <p className="text-gray-700 mt-0.5">
                  {a.facture_numero ? 'Facture ' + a.facture_numero : 'Facture'}
                  {' — solde restant : '}
                  {formatFCFA(Number(a.montant_restant))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAccesPortail && client.email && (
        <AccesPortailModal
          clientId={client.id}
          onClose={() => setShowAccesPortail(false)}
        />
      )}

      {showAccesPortail && !client.email && (
        <Modal title="Donner accès portail" onClose={() => setShowAccesPortail(false)}>
          <p className="text-sm text-wine-600">
            Ce client n'a pas d'adresse email renseignée — ajoutez-en une d'abord pour pouvoir activer son accès au portail.
          </p>
        </Modal>
      )}
    </div>
  );
}

function AccesPortailModal({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{
    email: string;
    motDePasseTemporaire: string;
  } | null>(null);
  const [copie, setCopie] = useState(false);

  function envoyer() {
    setLoading(true);
    setError(null);

    api
      .post('/clients/' + clientId + '/acces-portail')
      .then(({ data }) => {
        setResultat(data);
      })
      .catch((err) => {
        let message = "Erreur lors de l'activation.";

        if (
          err &&
          err.response &&
          err.response.data &&
          err.response.data.message
        ) {
          message = String(err.response.data.message);
        }

        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function copier() {
    if (!resultat) return;

    navigator.clipboard.writeText(resultat.motDePasseTemporaire).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    });
  }

  return (
    <Modal title="Accès portail" onClose={onClose}>
      {!resultat && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Ceci génère un nouveau mot de passe temporaire et l'envoie immédiatement par email au client.
            Si un accès existait déjà, l'ancien mot de passe cessera de fonctionner.
          </p>
          {error && <p className="text-sm text-wine-600">{error}</p>}
          <button
            onClick={envoyer}
            disabled={loading}
            className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
          >
            {loading ? 'Envoi en cours…' : 'Envoyer un mot de passe temporaire'}
          </button>
        </div>
      )}

      {resultat && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Un email a été envoyé à <strong>{resultat.email}</strong> avec les identifiants.
            Note aussi le mot de passe temporaire ci-dessous — il ne sera plus jamais affiché.
          </p>
          <div className="flex items-center justify-between rounded-md border border-brass-200 bg-brass-50 px-3 py-2">
            <span className="font-ref text-navy-900 font-semibold">
              {resultat.motDePasseTemporaire}
            </span>
            <button
              onClick={copier}
              className="flex items-center gap-1 text-xs text-navy-700 hover:underline"
            >
              {copie ? (
                <>
                  <Check size={12} /> Copié
                </>
              ) : (
                <>
                  <Copy size={12} /> Copier
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value || '—'}</dd>
    </div>
  );
}
