import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import SealMark from '../components/SealMark';

function extractErrorMessage(err: any): string {
  const data = err?.response?.data;
  const raw = data?.message ?? data?.error;

  if (Array.isArray(raw)) {
    return raw.join(' ');
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw;
  }
  return 'Identifiants invalides. Vérifiez votre email et mot de passe.';
}

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, motDePasse });
      setSession(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="hidden md:flex md:w-2/5 lg:w-1/3 bg-navy-900 text-white flex-col justify-between p-10 relative overflow-hidden">
        <SealMark size={220} className="absolute -right-16 -bottom-16 text-white/[0.04]" />
        <div className="flex items-center gap-3 relative">
          <SealMark size={38} className="text-brass-300" />
          <div className="leading-tight">
            <p className="font-serif font-semibold text-lg">LOGINET</p>
            <p className="font-serif text-lg -mt-1">Huissiers</p>
          </div>
        </div>
        <div className="relative">
          <p className="font-serif text-2xl leading-snug text-white/95">
            La gestion de votre cabinet, du dossier à l'acte signifié.
          </p>
          <p className="text-sm text-navy-100/60 mt-4">
            Plateforme de gestion pour cabinets d'huissiers de justice.
          </p>
        </div>
        <p className="text-xs text-navy-100/40 relative">LOGINET LAB</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <SealMark size={34} className="text-navy-700" />
            <div className="leading-tight">
              <p className="font-serif font-semibold text-navy-900">LOGINET</p>
              <p className="font-serif text-navy-900 -mt-1">Huissiers</p>
            </div>
          </div>

          <h1 className="font-serif text-2xl text-navy-900">Connexion</h1>
          <p className="text-sm text-gray-500 mt-1.5 mb-8">
            Accédez à l'espace de votre cabinet.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/40 focus:border-navy-500"
                placeholder="vous@cabinet.com"
              />
            </div>
            <div>
              <label htmlFor="motDePasse" className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <input
                id="motDePasse"
                type="password"
                required
                minLength={8}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/40 focus:border-navy-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-700 hover:bg-navy-800 transition-colors text-white text-sm font-medium rounded-md py-2.5 disabled:opacity-60"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
