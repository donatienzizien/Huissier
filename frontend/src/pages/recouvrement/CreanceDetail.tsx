import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, HandCoins, Pencil, Plus, Save } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import { api } from '../../lib/api';
import {
  creerEncaissement,
  getCreance,
  getEncaissementsCreance,
  modifierCreance,
  modifierStatutCreance,
} from '../../lib/recouvrement';
import { useAuthStore } from '../../store/auth';
import {
  CreanceDetail as CreanceDetailType,
  EncaissementCreance,
  LABELS_MODE_PAIEMENT,
  LABELS_STATUT_CREANCE,
  ModePaiement,
  StatutCreance,
} from '../../types';

function formatFCFA(value: string | number) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(value))} FCFA`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR');
}

export default function CreanceDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [creance, setCreance] = useState<CreanceDetailType | null>(null);
  const [encaissements, setEncaissements] = useState<EncaissementCreance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingStatut, setChangingStatut] = useState(false);
  const [savingEncaissement, setSavingEncaissement] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [libelle, setLibelle] = useState('');
  const [montantInitial, setMontantInitial] = useState('');
  const [reference, setReference] = useState('');
  const [dateExigibilite, setDateExigibilite] = useState('');
  const [observations, setObservations] = useState('');

  const [montantEncaissement, setMontantEncaissement] = useState('');
  const [modeEncaissement, setModeEncaissement] = useState<ModePaiement>('ESPECES');
  const [referenceEncaissement, setReferenceEncaissement] = useState('');
  const [noteEncaissement, setNoteEncaissement] = useState('');

  const peutModifier = user?.role === 'HUISSIER' || user?.role === 'CLERC';
  const estFinalisee =
    creance?.statut === 'SOLDEE' || creance?.statut === 'ABANDONNEE';

  const totalEncaisse = useMemo(
    () => encaissements.reduce((total, encaissement) => total + Number(encaissement.montant), 0),
    [encaissements],
  );

  const soldeRestant = Math.max(0, Number(creance?.montant_initial ?? 0) - totalEncaisse);

  async function load() {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const [creanceData, encaissementsData] = await Promise.all([
        getCreance(id),
        getEncaissementsCreance(id),
      ]);

      setCreance(creanceData);
      setEncaissements(encaissementsData);
      setLibelle(creanceData.libelle);
      setMontantInitial(String(creanceData.montant_initial));
      setReference(creanceData.reference ?? '');
      setDateExigibilite(
        creanceData.date_exigibilite ? creanceData.date_exigibilite.slice(0, 10) : '',
      );
      setObservations(creanceData.observations ?? '');
    } catch (err: any) {
      setError(
        err.response?.data?.message?.toString() ??
          'Erreur de chargement de la creance.',
      );
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
        dateExigibilite: dateExigibilite ? new Date(dateExigibilite).toISOString() : null,
        observations: observations.trim() || null,
      });
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(
        err.response?.data?.message?.toString() ??
          'Erreur lors de la modification.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleEncaissement(event: FormEvent) {
    event.preventDefault();
    if (!id || !creance) return;

    const montant = Number(montantEncaissement);
    if (!Number.isFinite(montant) || montant <= 0) {
      setError('Le montant encaisse doit etre superieur a zero.');
      return;
    }

    if (montant > soldeRestant) {
      setError(
        `Le montant encaisse ne peut pas depasser le solde restant (${formatFCFA(soldeRestant)}).`,
      );
      return;
    }

    setSavingEncaissement(true);
    setError(null);

    try {
      await creerEncaissement(id, {
        montant,
        mode: modeEncaissement,
        reference: referenceEncaissement.trim() || undefined,
        note: noteEncaissement.trim() || undefined,
      });

      setMontantEncaissement('');
      setModeEncaissement('ESPECES');
      setReferenceEncaissement('');
      setNoteEncaissement('');
      await load();
    } catch (err: any) {
      setError(
        err.response?.data?.message?.toString() ??
          "Erreur lors de l'enregistrement de l'encaissement.",
      );
    } finally {
      setSavingEncaissement(false);
    }
  }

  async function handleStatut(statut: StatutCreance) {
    if (!id || !creance) return;

    if (
      statut === 'ABANDONNEE' &&
      !window.confirm('Abandonner cette creance ? Cette action est definitive.')
    ) {
      return;
    }

    setChangingStatut(true);
    setError(null);

    try {
      await modifierStatutCreance(id, statut);
      await load();
    } catch (err: any) {
      setError(
        err.response?.data?.message?.toString() ??
          'Erreur lors du changement de statut.',
      );
    } finally {
      setChangingStatut(false);
    }
  }

  if (loading) return <p className="text-gray-400 text-sm">Chargement...</p>;
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
            {creance.libelle ?? '—'} - Dossier{' '}
            <Link
              to={`/dossiers/${creance.dossier_id}`}
              className="font-ref text-navy-700 hover:underline"
            >
              {creance.dossier_numero}
            </Link>
          </>
        }
        action={
          <>
            {peutModifier && !estFinalisee && (
              <button
                onClick={() => setEditing((value) => !value)}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-gold-200 text-gold-700 hover:bg-gold-50"
              >
                <Pencil size={14} /> {editing ? 'Annuler' : 'Modifier'}
              </button>
            )}
            <button
              onClick={async () => {
                try {
                  const res = await api.get(`/recouvrement/${creance.id}/pdf`, {
                    responseType: 'blob',
                  });
                  const blob = res.data as Blob;
                  const url = window.URL.createObjectURL(blob);
                  window.open(url, '_blank');
                } catch (err) {
                  console.error(err);
                  alert('Erreur lors de la generation du PDF');
                }
              }}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-navy-200 text-navy-700 hover:bg-navy-50"
            >
              Exporter en PDF
            </button>
          </>
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
          <p className="text-xs text-gray-500">Total encaisse</p>
          <p className="font-ref text-xl font-semibold text-emerald-700 mt-1">
            {formatFCFA(totalEncaisse)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Solde restant</p>
          <p className="font-ref text-xl font-semibold text-navy-900 mt-1">
            {formatFCFA(soldeRestant)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <div className="bg-white rounded-lg border border-navy-100 p-4">
          <p className="text-xs font-medium text-navy-600">Créancier</p>
          <p className="text-base font-semibold text-navy-900 mt-1">
            {[creance.client_nom, creance.client_prenom].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Client mandant</p>
        </div>

        <div className="bg-white rounded-lg border border-wine-100 p-4">
          <p className="text-xs font-medium text-wine-600">Débiteur poursuivi</p>
          <p className="text-base font-semibold text-navy-900 mt-1">
            {[creance.debiteur_nom, creance.debiteur_prenom].filter(Boolean).join(' ') || '—'}
          </p>
          {creance.debiteur_telephone && (
            <p className="text-xs text-gray-500 mt-1">{creance.debiteur_telephone}</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-600">Date d’exigibilité</p>
          <p className="text-base font-semibold text-navy-900 mt-1">
            {creance.date_exigibilite
              ? new Date(creance.date_exigibilite).toLocaleDateString('fr-FR')
              : 'Non renseignée'}
          </p>
        </div>
      </div>

      {!editing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Reference</dt>
              <dd className="mt-1 text-navy-900">{creance.numero ?? creance.reference ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Créancier</dt>
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
        <form
          onSubmit={handleSave}
          className="bg-white rounded-lg border border-gray-200 p-5 mt-6 space-y-4"
        >
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
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Montant initial (FCFA)
              </label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date d exigibilite
              </label>
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
            <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-navy-900">
            Historique des encaissements
          </h2>

          {encaissements.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Aucun encaissement enregistre.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-gray-100">
              {encaissements.map((encaissement) => (
                <div
                  key={encaissement.id}
                  className="py-3 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-navy-900">
                      {LABELS_MODE_PAIEMENT[encaissement.mode]}
                      {encaissement.reference ? ` - ${encaissement.reference}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(encaissement.date_paiement)}
                      {encaissement.encaisse_par_nom
                        ? ` - ${encaissement.encaisse_par_nom} ${encaissement.encaisse_par_prenom ?? ''}`
                        : ''}
                    </p>
                    {encaissement.note && (
                      <p className="mt-1 text-xs text-gray-600">{encaissement.note}</p>
                    )}
                  </div>
                  <p className="font-ref text-sm font-semibold text-emerald-700 whitespace-nowrap">
                    {formatFCFA(encaissement.montant)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {peutModifier && !estFinalisee && (
          <form
            onSubmit={handleEncaissement}
            className="bg-white rounded-lg border border-gray-200 p-5 space-y-4"
          >
            <h2 className="text-sm font-semibold text-navy-900">
              Enregistrer un encaissement
            </h2>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Montant (FCFA)
              </label>
              <input
                type="number"
                min={1}
                max={soldeRestant}
                step="0.01"
                required
                value={montantEncaissement}
                onChange={(event) => setMontantEncaissement(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                Solde disponible : {formatFCFA(soldeRestant)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mode de paiement
              </label>
              <select
                value={modeEncaissement}
                onChange={(event) =>
                  setModeEncaissement(event.target.value as ModePaiement)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                {Object.entries(LABELS_MODE_PAIEMENT).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
              <input
                value={referenceEncaissement}
                onChange={(event) => setReferenceEncaissement(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
              <textarea
                rows={3}
                value={noteEncaissement}
                onChange={(event) => setNoteEncaissement(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>

            <button
              type="submit"
              disabled={savingEncaissement || soldeRestant <= 0}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-md px-4 py-2 disabled:opacity-60"
            >
              <Plus size={15} />{' '}
              {savingEncaissement
                ? 'Enregistrement...'
                : 'Valider l encaissement'}
            </button>
          </form>
        )}
      </div>

      {peutModifier && !estFinalisee && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
          <h2 className="text-sm font-semibold text-navy-900 mb-3">
            Statut de la creance
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LABELS_STATUT_CREANCE).map(([value, label]) => {
              const prochainStatut = value as StatutCreance;
              const reserveHuissier = prochainStatut === 'ABANDONNEE';

              if (
                prochainStatut === 'SOLDEE' ||
                prochainStatut === 'PARTIELLEMENT_ENCAISSEE'
              ) {
                return null;
              }

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
