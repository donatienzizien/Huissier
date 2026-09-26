export type TypeDossier = 'RECOUVREMENT' | 'EXPULSION' | 'SIGNIFICATION' | 'SAISIE' | 'AUTRE';
export type StatutDossier = 'OUVERT' | 'EN_COURS' | 'CLOTURE' | 'ARCHIVE';
export type StatutClient = 'ACTIF' | 'SOLDE' | 'INSOLVABLE';
export type CategorieClient = 'PARTICULIER' | 'ENTREPRISE' | 'BANQUE' | 'BAILLEUR' | 'ADMINISTRATION' | 'AUTRE';

export const LABELS_TYPE_DOSSIER: Record<TypeDossier, string> = {
  RECOUVREMENT: 'Recouvrement',
  EXPULSION: 'Expulsion',
  SIGNIFICATION: 'Signification',
  SAISIE: 'Saisie',
  AUTRE: 'Autre',
};

export const LABELS_STATUT_DOSSIER: Record<StatutDossier, string> = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  CLOTURE: 'Cloture',
  ARCHIVE: 'Archive',
};

export const LABELS_STATUT_CLIENT: Record<StatutClient, string> = {
  ACTIF: 'Actif',
  SOLDE: 'Solde',
  INSOLVABLE: 'Insolvable',
};

export const LABELS_CATEGORIE_CLIENT: Record<CategorieClient, string> = {
  PARTICULIER: 'Particulier',
  ENTREPRISE: 'Entreprise',
  BANQUE: 'Banque',
  BAILLEUR: 'Bailleur',
  ADMINISTRATION: 'Administration',
  AUTRE: 'Autre',
};

// Role du tiers dans une fiche "clients" : CLIENT (mandant, paie le
// cabinet) ou DEBITEUR (poursuivi dans un dossier). Meme table, role
// distinct — voir dossiers.client_id (payeur) vs dossiers.debiteur_id
// (poursuivi, optionnel pour compatibilite avec les dossiers anciens).
export type RoleTiers = 'CLIENT' | 'DEBITEUR';

export const LABELS_ROLE_TIERS: Record<RoleTiers, string> = {
  CLIENT: 'Client',
  DEBITEUR: 'Debiteur',
};

export type TypePieceIdentite = 'CNIB' | 'PASSEPORT' | 'CARTE_SEJOUR' | 'PERMIS_CONDUIRE' | 'AUTRE';

export const LABELS_TYPE_PIECE: Record<TypePieceIdentite, string> = {
  CNIB: 'CNIB',
  PASSEPORT: 'Passeport',
  CARTE_SEJOUR: 'Carte de sejour',
  PERMIS_CONDUIRE: 'Permis de conduire',
  AUTRE: 'Autre',
};

export function pieceEstExpiree(dateExpiration: string | null | undefined): boolean {
  if (!dateExpiration) return false;
  return new Date(dateExpiration) < new Date();
}

export interface Dossier {
  id: string;
  numero: string;
  type: TypeDossier;
  statut: StatutDossier;
  client_id: string;
  client_nom?: string;
  client_prenom?: string;
  debiteur_id?: string | null;
  debiteur_nom?: string;
  debiteur_prenom?: string;
  assigne_clerc_id?: string | null;
  assigne_clerc_nom?: string;
  assigne_clerc_prenom?: string;
  assigne_agent_id?: string | null;
  assigne_agent_nom?: string;
  assigne_agent_prenom?: string;
  description: string | null;
  date_ouverture: string;
  date_cloture: string | null;
  created_at: string;
}

export interface DossierDetail extends Dossier {
  client_telephone?: string;
  debiteur_telephone?: string;
  debiteur_adresse?: string;
  historique: Array<{
    id: string;
    action: string;
    details: Record<string, unknown> | null;
    utilisateur_nom?: string;
    utilisateur_prenom?: string;
    created_at: string;
  }>;
  actes: Array<{
    id: string;
    numero: string;
    type: string;
    date_acte: string;
    envoye_client_le?: string | null;
    signe_client_le?: string | null;
    notifie_par?: string | null;
    notifie_le?: string | null;
    notifie_par_nom?: string;
    notifie_par_prenom?: string;
    statut_validation?: StatutValidationActe;
    soumis_le?: string | null;
    valide_le?: string | null;
    motif_rejet?: string | null;
  }>;
  factures: Array<{
    id: string;
    numero: string;
    montant_total: string;
    montant_paye: string;
    statut: string;
  }>;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string | null;
  categorie: CategorieClient;
  role_tiers?: RoleTiers;
  nin: string | null;
  ifu: string | null;
  rccm: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  statut: StatutClient;
  type_piece: TypePieceIdentite | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  nationalite: string | null;
  date_delivrance_piece: string | null;
  date_expiration_piece: string | null;
  lieu_delivrance_piece: string | null;
  profession: string | null;
  representant_nom: string | null;
  representant_prenom: string | null;
  representant_fonction: string | null;
  whatsapp: string | null;
  logo_path: string | null;
  created_at: string;
}
export type TypeAlerteClient = 'ECHEANCE_PROCHE' | 'RETARD';

export const LABELS_TYPE_ALERTE_CLIENT: Record<TypeAlerteClient, string> = {
  ECHEANCE_PROCHE: 'Echeance a venir',
  RETARD: 'Facture en retard',
};

export interface AlerteClientHistorique {
  id: string;
  type: TypeAlerteClient;
  montant_restant: string;
  envoyee: boolean;
  envoyee_le: string;
  facture_numero: string | null;
}

export interface ClientDetail extends Client {
  dossiers: Array<{
    id: string;
    numero: string;
    type: TypeDossier;
    statut: StatutDossier;
    date_ouverture: string;
    role_dans_dossier?: 'CLIENT' | 'DEBITEUR';
    autre_partie_id?: string | null;
    autre_partie_nom?: string | null;
    autre_partie_prenom?: string | null;
    role_autre_partie?: 'CLIENT' | 'DEBITEUR';
  }>;
  montantDu: number;
  montantEncaisse: number;
  montantRestant: number;
  relances: Array<{ id: string; message: string | null; envoyee_par_nom?: string; envoyee_le: string }>;
  alertesClients: AlerteClientHistorique[];
}

export type TypeActe =
  | 'SIGNIFICATION'
  | 'COMMANDEMENT_PAYER'
  | 'PV_CONSTAT'
  | 'PV_SAISIE'
  | 'SOMMATION'
  | 'MISE_EN_DEMEURE'
  | 'ASSIGNATION'
  | 'CONGE_BAIL'
  | 'SAISIE_ATTRIBUTION'
  | 'SAISIE_VENTE'
  | 'SIGNIFICATION_JUGEMENT'
  | 'LETTRE_MISSION'
  | 'PROCURATION'
  | 'CONVENTION_HONORAIRES'
  | 'ACCUSE_RECEPTION_DOSSIER'
  | 'AUTRE';

export const LABELS_TYPE_ACTE: Record<TypeActe, string> = {
  SIGNIFICATION: 'Signification',
  COMMANDEMENT_PAYER: 'Commandement de payer',
  PV_CONSTAT: 'PV de constat',
  PV_SAISIE: 'PV de saisie',
  SOMMATION: 'Sommation',
  MISE_EN_DEMEURE: 'Mise en demeure',
  ASSIGNATION: "Assignation (introductive d'instance)",
  CONGE_BAIL: 'Conge / resiliation de bail',
  SAISIE_ATTRIBUTION: 'Saisie-attribution',
  SAISIE_VENTE: 'Saisie-vente',
  SIGNIFICATION_JUGEMENT: 'Signification de jugement',
  LETTRE_MISSION: 'Lettre de mission',
  PROCURATION: 'Procuration',
  CONVENTION_HONORAIRES: "Convention d'honoraires",
  ACCUSE_RECEPTION_DOSSIER: 'Accuse de reception de dossier',
  AUTRE: 'Autre',
};

export const TYPES_LETTRE_CLIENT: TypeActe[] = ['LETTRE_MISSION', 'PROCURATION', 'CONVENTION_HONORAIRES'];

export type StatutValidationActe = 'BROUILLON' | 'EN_ATTENTE_VALIDATION' | 'VALIDE';

export const LABELS_STATUT_VALIDATION: Record<StatutValidationActe, string> = {
  BROUILLON: 'Brouillon',
  EN_ATTENTE_VALIDATION: 'En attente de validation',
  VALIDE: 'Valide',
};

export type NiveauValidation = 'CLERC' | 'HUISSIER';

export interface ActeAValider {
  id: string;
  numero: string;
  type: TypeActe;
  soumis_le: string;
  dossier_id: string;
  dossier_numero: string;
  soumis_par_nom?: string;
  soumis_par_prenom?: string;
}

export interface ModeleActe {
  id: string;
  nom: string;
  type: TypeActe;
  template_html: string;
  actif: boolean;
  created_at: string;
}

export interface Acte {
  id: string;
  numero: string;
  type: TypeActe;
  date_acte: string;
  signe_par?: string;
  envoye_client_le?: string | null;
  signe_client_le?: string | null;
  notifie_par?: string | null;
  notifie_le?: string | null;
  notifie_par_nom?: string;
  notifie_par_prenom?: string;
  statut_validation?: StatutValidationActe;
  soumis_le?: string | null;
  valide_le?: string | null;
  motif_rejet?: string | null;
}

// Types d'actes de procedure (par opposition aux lettres client) pour
// lesquels la tracabilite "notifie par" a du sens - un agent physique
// va signifier/notifier ces documents sur le terrain.
export const TYPES_ACTE_PROCEDURE: TypeActe[] = [
  'SIGNIFICATION',
  'COMMANDEMENT_PAYER',
  'PV_CONSTAT',
  'PV_SAISIE',
  'SOMMATION',
  'MISE_EN_DEMEURE',
  'ASSIGNATION',
  'CONGE_BAIL',
  'SAISIE_ATTRIBUTION',
  'SAISIE_VENTE',
  'SIGNIFICATION_JUGEMENT',
];

export type StatutFacture = 'BROUILLON' | 'ENVOYEE' | 'PARTIELLE' | 'PAYEE' | 'ANNULEE';
export type ModePaiement = 'ESPECES' | 'VIREMENT' | 'MOBILE_MONEY';

export const LABELS_STATUT_FACTURE: Record<StatutFacture, string> = {
  BROUILLON: 'Brouillon',
  ENVOYEE: 'Envoyee',
  PARTIELLE: 'Partiellement payee',
  PAYEE: 'Payee',
  ANNULEE: 'Annulee',
};

export const LABELS_MODE_PAIEMENT: Record<ModePaiement, string> = {
  ESPECES: 'Especes',
  VIREMENT: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
};

export interface Facture {
  id: string;
  numero: string;
  dossier_id: string;
  dossier_numero?: string;
  client_nom?: string;
  client_prenom?: string;
  montant_total: string;
  montant_paye: string;
  statut: StatutFacture;
  date_emission: string;
  date_echeance: string | null;
}

export interface Paiement {
  id: string;
  montant: string;
  mode: ModePaiement;
  reference: string | null;
  date_paiement: string;
}

export interface FactureDetail extends Facture {
  paiements: Paiement[];
}

export interface Evenement {
  id: string;
  titre: string;
  description: string | null;
  dossier_id: string | null;
  dossier_numero?: string;
  assigne_a: string | null;
  assigne_nom?: string;
  assigne_prenom?: string;
  date_debut: string;
  date_fin: string | null;
  rappel_j1: boolean;
  rappel_j7: boolean;
}

export interface DashboardKpis {
  dossiersActifs: number;
  chiffreAffairesMois: number;
  actesGeneresMois: number;
  rendezVousAujourdhui: number;
  totalFacture: number;
  totalEncaisse: number;
  tauxRecouvrementPourcentage: number;
}

export interface RepartitionStatutDossier {
  statut: StatutDossier;
  total: string;
}

export interface RepartitionTypeDossier {
  type: TypeDossier;
  total: string;
}

export interface CaMensuel {
  mois: string;
  total: string;
}

export interface TauxRecouvrement {
  totalFacture: number;
  totalEncaisse: number;
  tauxPourcentage: number;
}

export type CategoriePieceJointe = 'ACTE_SIGNE_RETOURNE' | 'PIECE_IDENTITE' | 'JUSTIFICATIF' | 'AUTRE';

export const LABELS_CATEGORIE_PIECE_JOINTE: Record<CategoriePieceJointe, string> = {
  ACTE_SIGNE_RETOURNE: 'Acte signe retourne',
  PIECE_IDENTITE: "Piece d'identite",
  JUSTIFICATIF: 'Justificatif',
  AUTRE: 'Autre',
};

export interface PieceJointe {
  id: string;
  categorie: CategoriePieceJointe;
  nom_original: string;
  type_mime: string;
  taille_octets: number;
  televerse_par_nom?: string;
  televerse_par_prenom?: string;
  created_at: string;
}

// Ligne telle que retournee par GET /actes (liste globale, tous
// dossiers confondus) — voir ActesService.findAll.
export interface ActeListItem {
  id: string;
  numero: string;
  type: TypeActe;
  date_acte: string;
  dossier_id: string;
  dossier_numero: string;
  client_nom: string;
  client_prenom: string | null;
  signataire_nom: string | null;
  signataire_prenom: string | null;
  envoye_client_le: string | null;
  signe_client_le: string | null;
  notifie_par: string | null;
  notifie_le: string | null;
  notifie_par_nom: string | null;
  notifie_par_prenom: string | null;
}

export interface UtilisateurSimple {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'HUISSIER' | 'CLERC' | 'COMPTABLE' | 'SECRETAIRE';
  actif: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}







export type StatutCreance =
  | 'BROUILLON'
  | 'ACTIVE'
  | 'EN_NEGOCIATION'
  | 'SUSPENDUE'
  | 'SOLDEE'
  | 'ABANDONNEE';

export const LABELS_STATUT_CREANCE: Record<StatutCreance, string> = {
  BROUILLON: 'Brouillon',
  ACTIVE: 'Active',
  EN_NEGOCIATION: 'En negociation',
  SUSPENDUE: 'Suspendue',
  SOLDEE: 'Soldee',
  ABANDONNEE: 'Abandonnee',
};

export interface Creance {
  id: string;
  numero: string;
  dossier_id: string;
  dossier_numero?: string;
  dossier_type?: TypeDossier;
  debiteur_id?: string;
  debiteur_nom?: string;
  debiteur_prenom?: string | null;
  client_nom?: string;
  client_prenom?: string | null;
  libelle: string;
  reference: string | null;
  montant_initial: string;
  statut: StatutCreance;
  date_exigibilite: string | null;
  observations: string | null;
  cree_par: string | null;
  cloturee_par: string | null;
  cloturee_le: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreanceDetail extends Creance {
  dossier_statut?: StatutDossier;
  debiteur_telephone?: string | null;
  debiteur_adresse?: string | null;
}
