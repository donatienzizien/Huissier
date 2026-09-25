import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiSuperAdmin } from '../../lib/apiSuperAdmin';
import { useAuthSuperAdminStore } from '../../store/authSuperAdmin';
import SealMark from '../../components/SealMark';

function extractErrorMessage(err: any): string {
  const data = err?.response?.data;
  const raw = data?.message ?? data?.error;
  if (Array.isArray(raw)) return raw.join(' ');
  if (typeof raw === 'string' && raw.trim().length > 0) return raw;
  return 'Identifiants invalides.';
}

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const setSession = useAuthSuperAdminStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiSuperAdmin.post('/auth/super-admin/login', { email, motDePasse });
      setSession(data.user, data.accessToken, data.refreshToken);
      navigate('/super-admin');
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <SealMark size={34} className="text-brass-300" />
          <div className="leading-tight text-center">
            <p className="font-serif font-semibold text-white">LOGINET</p>
            <p className="text-xs text-brass-300 tracking-wide">SUPER ADMIN</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-7 shadow-xl">
          <h1 className="font-serif text-xl text-navy-900">Espace propriétaire</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">Gestion de tous les cabinets clients.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/40 focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <input
                type="password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/40 focus:border-navy-500"
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
              className="w-full bg-navy-900 hover:bg-navy-950 transition-colors text-white text-sm font-medium rounded-md py-2.5 disabled:opacity-60"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
