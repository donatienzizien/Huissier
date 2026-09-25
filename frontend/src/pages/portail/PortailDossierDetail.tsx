import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { apiPortail } from '../../lib/apiPortail';
import { telechargerActePortailPdf, telechargerFacturePortailPdf } from '../../lib/pdfPortail';

interface DossierDetail {
  id: string;
  numero: string;
  type: string;
  statut: string;
  description: string | null;
  date_ouverture: string;
  actes: { id: string; numero: string; type: string; date_acte: string }[];
  factures: { id: string; numero: string; montant_total: string; montant_paye: string; statut: string }[];
}

function formatFCFA(n: string | number) {
  return new Intl.NumberFormat('fr-FR').format(Number(n)) + ' FCFA';
}

export default function PortailDossierDetail() {
  const { id } = useParams<{ id: string }>();
  const [dossier, setDossier] = useState<DossierDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiPortail.get<DossierDetail>(`/dossiers/${id}`).then(({ data }) => setDossier(data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-gray-400">Chargement…</p>;
  if (!dossier) return <p className="text-sm text-gray-400">Dossier introuvable.</p>;

  return (
    <div>
      <Link to="/portail" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-700 mb-4">
        <ArrowLeft size={14} /> Retour
      </Link>

      <h1 className="font-serif text-2xl text-navy-900">{dossier.numero}</h1>
      <p className="text-sm text-gray-500 mt-1">
        {dossier.type} · {dossier.statut}
      </p>
      {dossier.description && <p className="text-sm text-gray-600 mt-2">{dossier.description}</p>}

      <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Actes ({dossier.actes.length})</h2>
        {dossier.actes.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun acte pour ce dossier.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {dossier.actes.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-ref font-medium text-navy-900">{a.numero}</span>{' '}
                  <span className="text-gray-500">— {new Date(a.date_acte).toLocaleDateString('fr-FR')}</span>
                </span>
                <button
                  onClick={() => telechargerActePortailPdf(a.id, a.numero)}
                  className="inline-flex items-center gap-1 text-xs text-navy-700 border border-gray-200 rounded-md px-2 py-1 hover:border-brass-400"
                >
                  <Download size={12} /> PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Factures ({dossier.factures.length})</h2>
        {dossier.factures.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune facture pour ce dossier.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {dossier.factures.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-ref font-medium text-navy-900">{f.numero}</span>
                <span className="font-ref">{formatFCFA(f.montant_paye)} / {formatFCFA(f.montant_total)}</span>
                <button
                  onClick={() => telechargerFacturePortailPdf(f.id, f.numero)}
                  className="inline-flex items-center gap-1 text-xs text-navy-700 border border-gray-200 rounded-md px-2 py-1 hover:border-brass-400"
                >
                  <Download size={12} /> PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}