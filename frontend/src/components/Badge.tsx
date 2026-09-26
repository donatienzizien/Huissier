import { ReactNode } from 'react';

type CouleurBadge = 'green' | 'blue' | 'purple' | 'gray';

export interface BadgeProps {
  children?: ReactNode;
  color?: CouleurBadge;
  title?: string;

  // Compatibilité avec les pages existantes du projet.
  statut?: string;
  label?: string;
}

const stylesParCouleur: Record<CouleurBadge, string> = {
  green: 'bg-green-50 text-green-700 border border-green-200',
  blue: 'bg-blue-50 text-blue-700 border border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  gray: 'bg-gray-50 text-gray-700 border border-gray-200',
};

function couleurDepuisStatut(statut?: string): CouleurBadge {
  const valeur = (statut ?? '').toUpperCase();

  if (
    valeur.includes('ACTIF') ||
    valeur.includes('VALIDE') ||
    valeur.includes('PAYE') ||
    valeur.includes('SIGNE') ||
    valeur.includes('TERMINE')
  ) {
    return 'green';
  }

  if (
    valeur.includes('EN_COURS') ||
    valeur.includes('ATTENTE') ||
    valeur.includes('BROUILLON') ||
    valeur.includes('ENVOYE')
  ) {
    return 'blue';
  }

  if (
    valeur.includes('ARCHIVE') ||
    valeur.includes('ANNULE') ||
    valeur.includes('REJETE') ||
    valeur.includes('INSOLVABLE') ||
    valeur.includes('IMPAYE') ||
    valeur.includes('SUSPENDU')
  ) {
    return 'gray';
  }

  return 'gray';
}

export default function Badge({
  children,
  color,
  title,
  statut,
  label,
}: BadgeProps) {
  const couleur = color ?? couleurDepuisStatut(statut);
  const contenu = children ?? label ?? statut ?? '';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${stylesParCouleur[couleur]}`}
      title={title}
    >
      {contenu}
    </span>
  );
}
