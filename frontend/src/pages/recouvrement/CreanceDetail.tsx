import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, HandCoins, Pencil, Save } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import {
  getCreance,
  modifierCreance,
  modifierStatutCreance,
} from '../../lib/recouvrement';
import { useAuthStore } from '../../store/auth';
import {
  CreanceDetail as CreanceDetailType,
  LABELS_STATUT_CREANCE,
  StatutCreance,
} from '../../types';

function formatFCFA(value: string | number) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(value))} FCFA`;
}

export default function CreanceDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [creance, setCreance] = useState<CreanceDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingStatut, setChangingStatut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [libelle, setLibelle] = useState('');
  const [montantInitial, setMontantInitial] = useState('');
  const [reference, setReference] = useState('');
  const [dateExigibilite, setDateExigibilite] = useState('');
  const [observations, setObservations] = useState('');

  const peutModifier =
    user?.role === 'HUISSIER' || user?.role === 'CLERC';

  const estFinalisee =
    creance?.statut === 'SOLDEE' || creance?.statut === 'ABANDONNEE';

  async function load() {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getCreance(id);
      setCreance(data);
      setLibelle(data.libelle);
      setMontantInitial(String(data.montant_initial));
      setReference(data.reference ?? '');
      setDateExigibilite(data.date_exigibilite ? data.date_exigibilite.slice(0, 10) : '');
      setObservations(data.observations ?? '');
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur de chargement de la creance.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!id) return;

    const montant = Number(montantInitial);
    if (!Number.isFinite(montant) || montant <= 0) {
      setError('Le montant doit etre superieur a zero.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await modifierCreance(id, {
        libelle: libelle.trim(),
        montantInitial: montant,
        reference: reference.trim() || null,
        dateExigibilite: dateExigibilite
          ? new Date(dateExigibilite).toISOString()
          : null,
        observations: observations.trim() || null,
      });
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la modification.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatut(statut: StatutCreance) {
    if (!id || !creance) return;

    if (
      (statut === 'SOLDEE' || statut === 'ABANDONNEE') &&
      !window.confirm(
        statut === 'SOLDEE'
          ? 'Marquer cette creance comme soldee ? Cette action est definitive.'
          : 'Abandonner cette creance ? Cette action est definitive.',
      )
    ) {
      return;
    }

    setChangingStatut(true);
    setError(null);

    try {
      await modifierStatutCreance(id, statut);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors du changement de statut.');
    } finally {
      setChangingStatut(false);
    }
  }

  if (loading) return <p className="text-gray-400 text-sm">Chargement…</p>;
  if (!creance) return <p className="text-gray-400 text-sm">Creance introuvable.</p>;

  return (
    <div>
      <Link
        to="/recouvrement"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-700 mb-4"
      >
        <ArrowLeft size={14} /> Retour au recouvrement
      </Link>

      <PageHeader
        icon={HandCoins}
        title={creance.numero}
        accent="gold"
        subtitle={
          <>
            {creance.libelle} · Dossier{' '}
            <Link to={`/dossiers/${creance.dossier_id}`} className="font-ref text-navy-700 hover:underline">
              {creance.dossier_numero}
            </Link>
          </>
        }
        action={
          peutModifier && !estFinalisee ? (
            <button
              onClick={() => setEditing((value) => !value)}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-gold-200 text-gold-700 hover:bg-gold-50"
            >
              <Pencil size={14} /> {editing ? 'Annuler' : 'Modifier'}
            </button>
          ) : undefined
        }
      />

      <div className="-mt-4 mb-6">
        <Badge statut={creance.statut} label={LABELS_STATUT_CREANCE[creance.statut]} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-wine-100 bg-wine-50 text-wine-600 text-sm px-4 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Montant initial</p>
          <p className="font-ref text-xl font-semibold text-gold-700 mt-1">
            {formatFCFA(creance.montant_initial)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Debiteur</p>
          <p className="text-base font-semibold text-navy-900 mt-1">
            {creance.debiteur_nom} {creance.debiteur_prenom ?? ''}
          </p>
          {creance.debiteur_telephone && (
            <p className="text-xs text-gray-500 mt-1">{creance.debiteur_telephone}</p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Date d exigibilite</p>
          <p className="text-base font-semibold text-navy-900 mt-1">
            {creance.date_exigibilite
              ? new Date(creance.date_exigibilite).toLocaleDateString('fr-FR')
              : 'Non renseignee'}
          </p>
        </div>
      </div>

      {!editing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Reference</dt>
              <dd className="mt-1 text-navy-900">{creance.reference ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Client mandant</dt>
              <dd className="mt-1 text-navy-900">
                {creance.client_nom} {creance.client_prenom ?? ''}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Observations</dt>
              <dd className="mt-1 whitespace-pre-wrap text-navy-900">
                {creance.observations ?? 'Aucune observation.'}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-5 mt-6 space-y-4">
          <h2 className="text-sm font-semibold text-navy-900">Modifier la creance</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Libelle</label>
            <input
              required
              minLength={3}
              value={libelle}
              onChange={(event) => setLibelle(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant initial (FCFA)</label>
              <input
                type="number"
                min={1}
                required
                value={montantInitial}
                onChange={(event) => setMontantInitial(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date d exigibilite</label>
              <input
                type="date"
                value={dateExigibilite}
                onChange={(event) => setDateExigibilite(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observations</label>
            <textarea
              rows={4}
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-gold-700 hover:bg-gold-800 text-white text-sm font-medium rounded-md px-4 py-2 disabled:opacity-60"
          >
            <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}

      {peutModifier && !estFinalisee && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
          <h2 className="text-sm font-semibold text-navy-900 mb-3">Statut de la creance</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LABELS_STATUT_CREANCE).map(([value, label]) => {
              const prochainStatut = value as StatutCreance;
              const reserveHuissier =
                prochainStatut === 'SOLDEE' || prochainStatut === 'ABANDONNEE';

              if (reserveHuissier && user?.role !== 'HUISSIER') {
                return null;
              }

              return (
                <button
                  key={value}
                  disabled={changingStatut || prochainStatut === creance.statut}
                  onClick={() => handleStatut(prochainStatut)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                    prochainStatut === creance.statut
                      ? 'border-gold-300 bg-gold-50 text-gold-800'
                      : 'border-gray-300 text-gray-600 hover:border-gold-400 hover:text-gold-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
