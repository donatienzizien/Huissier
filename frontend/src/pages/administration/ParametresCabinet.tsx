import { FormEvent, useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';

interface Cabinet {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
}

export default function ParametresCabinet() {
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    api.get<Cabinet>('/cabinets/moi').then(({ data }) => {
      setCabinet(data);
      setNom(data.nom);
      setEmail(data.email);
      setTelephone(data.telephone ?? '');
      setAdresse(data.adresse ?? '');
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSucces(false);
    try {
      await api.patch('/cabinets/moi', {
        nom,
        email,
        telephone: telephone || undefined,
        adresse: adresse || undefined,
      });
      setSucces(true);
    } catch (err: any) {
      setError(err.response?.data?.message?.toString() ?? 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Chargement…</p>;

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Paramètres du cabinet"
        subtitle="Ces informations apparaissent sur les PDF d'actes/factures générés et dans les emails envoyés."
        accent="brass"
      />

      <div className="max-w-lg bg-white rounded-lg border border-gray-200 p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom du cabinet</label>
            <input
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
            <textarea
              rows={2}
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>

          {error && <p className="text-sm text-wine-600">{error}</p>}
          {succes && <p className="text-sm text-emerald-600">Enregistré avec succès.</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium rounded-md py-2 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}