import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Evenement, Dossier, PaginatedResult } from '../../types';
import Modal from '../../components/Modal';

interface UserOption {
  id: string;
  nom: string;
  prenom: string;
}

interface Props {
  evenement?: Evenement;
  onClose: () => void;
  onSaved: () => void;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EvenementModal({ evenement, onClose, onSaved }: Props) {
  const [titre, setTitre] = useState(evenement?.titre ?? '');
  const [description, setDescription] = useState(evenement?.description ?? '');
  const [dateDebut, setDateDebut] = useState(toLocalInput(evenement?.date_debut ?? null) || toLocalInput(new Date().toISOString()));
  const [dateFin, setDateFin] = useState(toLocalInput(evenement?.date_fin ?? null));
  const [assigneA, setAssigneA] = useState(evenement?.assigne_a ?? '');
  const [rappelJ1, setRappelJ1] = useState(evenement?.rappel_j1 ?? true);
  const [rappelJ7, setRappelJ7] = useState(evenement?.rappel_j7 ?? false);
  const [dossierSearch, setDossierSearch] = useState('');
  const [dossierId, setDossierId] = useState(evenement?.dossier_id ?? '');
  const [dossierResults, setDossierResults] = useState<Dossier[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<UserOption[]>('/users').then(({ data }) => setUsers(data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (dossierSearch.length < 2) {
        setDossierResults([]);
        return;
      }
      const { data } = await api.get<PaginatedResult<Dossier>>('/dossiers', {
        params: { search: dossierSearch, limit: 5 },
      });
      setDossierResults(data.data);
    }, 300);
    return () => clearTimeout(timeout);
  }, [dossierSearch]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        titre,
        description: description || undefined,
        dossierId: dossierId || undefined,
        assigneA: assigneA || undefined,
        dateDebut: new Date(dateDebut).toISOString(),
        dateFin: dateFin ? new Date(dateFin).toISOString() : undefined,
        rappelJ1,
        rappelJ7,
      };
      if (evenement) {
        await api.patch(`/agenda/${evenement.id}`, payload);
      } else {
        await api.post('/agenda', payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={evenement ? "Modifier l'événement" : 'Nouvel événement'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
          <input
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Début</label>
            <input
              type="datetime-local"
              required
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fin (optionnel)</label>
            <input
              type="datetime-local"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Assigné à (optionnel)</label>
          <select
            value={assigneA}
            onChange={(e) => setAssigneA(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          >
            <option value="">— Non assigné —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom} {u.prenom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dossier lié (optionnel)</label>
          {dossierId ? (
            <div className="flex items-center justify-between rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-sm">
              <span>{dossierResults.find((d) => d.id === dossierId)?.numero ?? 'Dossier sélectionné'}</span>
              <button type="button" onClick={() => setDossierId('')} className="text-navy-700 text-xs">
                Retirer
              </button>
            </div>
          ) : (
            <>
              <input
                value={dossierSearch}
                onChange={(e) => setDossierSearch(e.target.value)}
                placeholder="Rechercher un dossier…"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
              {dossierResults.length > 0 && (
                <ul className="mt-1 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-32 overflow-y-auto">
                  {dossierResults.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setDossierId(d.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {d.numero} — {d.client_nom}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description (optionnel)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={rappelJ1} onChange={(e) => setRappelJ1(e.target.checked)} />
            Rappel la veille
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={rappelJ7} onChange={(e) => setRappelJ7(e.target.checked)} />
            Rappel à J-7
          </label>
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
