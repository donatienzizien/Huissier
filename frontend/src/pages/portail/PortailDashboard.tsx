import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FolderOpen, Receipt } from 'lucide-react';
import { apiPortail } from '../../lib/apiPortail';
import { telechargerFacturePortailPdf } from '../../lib/pdfPortail';

interface Dossier {
  id: string;
  numero: string;
  type: string;
  statut: string;
  date_ouverture: string;
}

interface Facture {
  id: string;
  numero: string;
  dossier_numero: string;
  montant_total: string;
  montant_paye: string;
  statut: string;
  date_emission: string;
}

function formatFCFA(n: string | number) {
  return new Intl.NumberFormat('fr-FR').format(Number(n)) + ' FCFA';
}

export default function PortailDashboard() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiPortail.get<Dossier[]>('/dossiers'), apiPortail.get<Facture[]>('/factures')])
      .then(([d, f]) => {
        setDossiers(d.data);
        setFactures(f.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="flex items-center gap-2 font-serif text-lg text-navy-900 mb-4">
          <FolderOpen size={18} className="text-navy-700" /> Mes dossiers
        </h2>
        {dossiers.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun dossier pour le moment.</p>
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
              {dossiers.map((d) => (
                <tr key={d.id}>
                  <td className="py-2">
                    <Link to={`/portail/dossiers/${d.id}`} className="font-ref text-navy-700 font-medium hover:underline">
                      {d.numero}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-600">{d.type}</td>
                  <td className="py-2 text-gray-600">{d.statut}</td>
                  <td className="py-2 text-gray-500">{new Date(d.date_ouverture).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="flex items-center gap-2 font-serif text-lg text-navy-900 mb-4">
          <Receipt size={18} className="text-brass-600" /> Mes factures
        </h2>
        {factures.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune facture pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left py-2">Numéro</th>
                <th className="text-left py-2">Dossier</th>
                <th className="text-right py-2">Montant</th>
                <th className="text-left py-2">Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {factures.map((f) => (
                <tr key={f.id}>
                  <td className="py-2 font-ref font-medium text-navy-900">{f.numero}</td>
                  <td className="py-2 font-ref text-gray-600">{f.dossier_numero}</td>
                  <td className="py-2 text-right font-ref">
                    {formatFCFA(f.montant_paye)} <span className="text-gray-400">/</span>{' '}
                    <span className="font-semibold text-brass-700">{formatFCFA(f.montant_total)}</span>
                  </td>
                  <td className="py-2 text-gray-600">{f.statut}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => telechargerFacturePortailPdf(f.id, f.numero)}
                      className="inline-flex items-center gap-1 text-xs text-navy-700 border border-gray-200 rounded-md px-2 py-1 hover:border-brass-400"
                    >
                      <Download size={12} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}