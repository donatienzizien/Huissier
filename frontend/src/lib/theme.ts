// Palette centralisee de la plateforme : chaque "couleur" correspond a un
// sens metier constant (navy = dossiers/general, brass = chiffre d'affaires,
// green = actes/repartition, wine = agenda/urgence, gold = recouvrement/taux).
// Reutilisee par Dashboard, Rapports, Facturation, Agenda pour un langage
// visuel coherent sur toute la plateforme.
export type CouleurAccent = 'navy' | 'brass' | 'green' | 'wine' | 'gold';

export const SOLID: Record<CouleurAccent, string> = {
  navy: 'bg-gradient-to-br from-navy-700 to-navy-900',
  brass: 'bg-gradient-to-br from-brass-600 to-brass-700',
  green: 'bg-gradient-to-br from-emerald-600 to-emerald-800',
  wine: 'bg-gradient-to-br from-wine-600 to-wine-700',
  gold: 'bg-gradient-to-br from-gold-600 to-gold-700',
};

export const TINT_BG: Record<CouleurAccent, string> = {
  navy: 'bg-navy-50',
  brass: 'bg-brass-50',
  green: 'bg-emerald-50',
  wine: 'bg-wine-50',
  gold: 'bg-gold-50',
};

export const TINT_TEXT: Record<CouleurAccent, string> = {
  navy: 'text-navy-700',
  brass: 'text-brass-700',
  green: 'text-emerald-700',
  wine: 'text-wine-600',
  gold: 'text-gold-700',
};

export const BORDER_TOP: Record<CouleurAccent, string> = {
  navy: 'border-t-navy-700',
  brass: 'border-t-brass-600',
  green: 'border-t-emerald-700',
  wine: 'border-t-wine-600',
  gold: 'border-t-gold-600',
};
