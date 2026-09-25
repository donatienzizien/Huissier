import clsx from 'clsx';

const COLORS: Record<string, string> = {
  OUVERT: 'bg-navy-50 text-navy-700 border-navy-100',
  EN_COURS: 'bg-brass-50 text-brass-700 border-brass-100',
  CLOTURE: 'bg-green-50 text-green-700 border-green-200',
  ARCHIVE: 'bg-gray-100 text-gray-600 border-gray-200',
  ACTIF: 'bg-navy-50 text-navy-700 border-navy-100',
  SOLDE: 'bg-green-50 text-green-700 border-green-200',
  INSOLVABLE: 'bg-red-50 text-red-700 border-red-200',
  BROUILLON: 'bg-gray-100 text-gray-600 border-gray-200',
  ENVOYEE: 'bg-navy-50 text-navy-700 border-navy-100',
  PARTIELLE: 'bg-brass-50 text-brass-700 border-brass-100',
  PAYEE: 'bg-green-50 text-green-700 border-green-200',
  ANNULEE: 'bg-red-50 text-red-700 border-red-200',
  PARTICULIER: 'bg-gray-100 text-gray-600 border-gray-200',
  ENTREPRISE: 'bg-brass-50 text-brass-700 border-brass-100',
  BANQUE: 'bg-green-50 text-green-700 border-green-200',
  BAILLEUR: 'bg-purple-50 text-purple-700 border-purple-200',
  ADMINISTRATION: 'bg-navy-50 text-navy-700 border-navy-100',
  CLIENT: 'bg-navy-50 text-navy-700 border-navy-100',
  DEBITEUR: 'bg-wine-50 text-wine-600 border-wine-100',
};

export default function Badge({ statut, label }: { statut: string; label: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        COLORS[statut] ?? 'bg-gray-50 text-gray-700 border-gray-200',
      )}
    >
      {label}
    </span>
  );
}
