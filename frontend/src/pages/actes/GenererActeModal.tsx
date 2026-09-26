import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';
import {
  genererApercuActe,
  creerActeBrouillon,
  soumettreActe,
  separerStyleEtCorps,
  recombinerDocument,
} from '../../lib/actes';
import { ModeleActe, LABELS_TYPE_ACTE, TypeActe, TYPES_LETTRE_CLIENT } from '../../types';
import Modal from '../../components/Modal';
import EditeurActe from '../../components/EditeurActe';

interface Props {
  dossierId: string;
  onClose: () => void;
  onCreated: () => void;
}

type Etape = 'choix' | 'edition';

export default function GenererActeModal({ dossierId, onClose, onCreated }: Props) {
  const [etape, setEtape] = useState<Etape>('choix');
  const [modeles, setModeles] = useState<ModeleActe[]>([]);
  const [modeleId, setModeleId] = useState('');
  const [notes, setNotes] = useState('');
  const [delaiJours, setDelaiJours] = useState('8');
  const [loading, setLoading] = useState(true);
  const [generatingApercu, setGeneratingApercu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [styleBlock, setStyleBlock] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [saving, setSaving] = useState<'brouillon' | 'soumission' | null>(null);

  useEffect(() => {
    api
      .get<ModeleActe[]>('/modeles-actes', { params: { actifOnly: true } })
      .then(({ data }) => {
        setModeles(data);
        if (data.length > 0) setModeleId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  function contenuActuel() {
    return {
      ...(notes ? { notes } : {}),
      delaiJours: delaiJours ? Number(delaiJours) : undefined,
    };
  }

  async function handleGenererApercu(e: FormEvent) {
    e.preventDefault();
    setGeneratingApercu(true);
    setError(null);
    try {
      const html = await genererApercuActe({ dossierId, modeleId, contenu: contenuActuel() });
      const { styleBlock: sb, bodyHtml: bh } = separerStyleEtCorps(html);
      setStyleBlock(sb);
      setBodyHtml(bh);
      setEtape('edition');
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? "Erreur lors de la generation de l'apercu.");
    } finally {
      setGeneratingApercu(false);
    }
  }

  async function handleEnregistrer(soumettre: boolean) {
    setSaving(soumettre ? 'soumission' : 'brouillon');
    setError(null);
    try {
      const corpsHtml = recombinerDocument(styleBlock, bodyHtml);
      const acte = await creerActeBrouillon({ dossierId, modeleId, contenu: contenuActuel(), corpsHtml });
      if (soumettre) {
        await soumettreActe(acte.id);
      }
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(null);
    }
  }

  if (etape === 'choix') {
    return (
      <Modal title="Generer un acte" onClose={onClose}>
        {loading ? (
          <p className="text-sm text-gray-400">Chargement des modeles…</p>
        ) : modeles.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun modele d'acte actif. Creez-en un depuis Administration → Modeles d'actes.
          </p>
        ) : (
          <form onSubmit={handleGenererApercu} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modele d'acte</label>
              <select
                value={modeleId}
                onChange={(e) => setModeleId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                <optgroup label="Actes de procedure">
                  {modeles
                    .filter((m) => !TYPES_LETTRE_CLIENT.includes(m.type as TypeActe))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nom} ({LABELS_TYPE_ACTE[m.type]})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Lettres client (pour signature)">
                  {modeles
                    .filter((m) => TYPES_LETTRE_CLIENT.includes(m.type as TypeActe))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nom} ({LABELS_TYPE_ACTE[m.type]})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Delai de paiement (jours)</label>
              <input
                type="number"
                min={1}
                value={delaiJours}
                onChange={(e) => setDelaiJours(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Utilise par {'{{delaiJours}}'} dans le modele. Le montant du est calcule automatiquement
                depuis les factures du dossier.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Informations complementaires (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Ajoutees au document si le modele les reference via {{notes}}"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={generatingApercu}
              className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
            >
              {generatingApercu ? "Preparation de l'apercu…" : "Voir et modifier l'apercu"}
            </button>
          </form>
        )}
      </Modal>
    );
  }

  // Etape edition : conteneur large dedie (le Modal partage n'est pas
  // adapte a un editeur de document, largeur max-w-md fixe).
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-serif text-[17px] text-navy-900">Apercu et edition</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Modifiez librement le texte ci-dessous avant d'enregistrer. Rien n'est encore officiel.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <EditeurActe contenuInitial={bodyHtml} onChange={setBodyHtml} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEtape('choix')}
              className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium rounded-md py-2 hover:bg-gray-50"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => handleEnregistrer(false)}
              className="flex-1 border border-navy-300 text-navy-700 text-sm font-medium rounded-md py-2 hover:bg-navy-50 disabled:opacity-60"
            >
              {saving === 'brouillon' ? 'Enregistrement…' : 'Enregistrer comme brouillon'}
            </button>
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => handleEnregistrer(true)}
              className="flex-1 bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
            >
              {saving === 'soumission' ? 'Envoi…' : 'Soumettre pour validation'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            « Brouillon » reste modifiable et n'est visible que dans le dossier. « Soumettre » l'envoie
            a l'Huissier pour validation — le PDF officiel ne sera genere qu'apres validation.
          </p>
        </div>
      </div>
    </div>
  );
}

