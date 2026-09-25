import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPortail } from '../../lib/apiPortail';
import { useAuthPortailStore } from '../../store/authPortail';
import SealMark from '../../components/SealMark';

function extractErrorMessage(err: any): string {
  const data = err?.response?.data;
  const raw = data?.message ?? data?.error;

  if (Array.isArray(raw)) {
    return raw.join(' ');
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw;
  }
  return 'Identifiants invalides.';
}

export default function PortailLogin() {
  const navigate = useNavigate();
  const setSession = useAuthPortailStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiPortail.post('/login', { email, motDePasse });
      setSession(data.client, data.accessToken);
      navigate('/portail');
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4 relative overflow-hidden">
      <SealMark size={420} className="text-white/[0.04] absolute -right-24 -bottom-24 pointer-events-none" />

      <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl p-8 relative border-t-4 border-brass-500">
        <div className="flex flex-col items-center mb-6">
          <SealMark size={44} className="text-navy-900 mb-3" />
          <h1 className="font-serif text-xl font-semibold text-navy-900 text-center">Espace client</h1>
          <p className="text-sm text-gray-500 mt-1">Suivi de vos dossiers et factures</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-400 focus:border-brass-400"
            />
          </div>

          {error && (
            <p className="text-sm text-wine-600 bg-wine-50 border border-wine-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-md py-2.5 disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
