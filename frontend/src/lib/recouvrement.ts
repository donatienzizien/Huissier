import { api } from './api';
import type {
  Creance,
  CreanceDetail,
  EncaissementCreance,
  ModePaiement,
  PaginatedResult,
  StatutCreance,
} from '../types';

export interface QueryCreances {
  page?: number;
  limit?: number;
  search?: string;
  statut?: StatutCreance;
  dossierId?: string;
  debiteurId?: string;
  dateExigibiliteAvant?: string;
  dateExigibiliteApres?: string;
  enRetard?: string;
}

export interface SyntheseRecouvrement {
  montantInitialTotal: number;
  montantEncaisseTotal: number;
  soldeRestantTotal: number;
  montantEchu: number;
  nombreCreancesEnCours: number;
  nombreCreancesEchues: number;
  nombreActionsEchues: number;
}

export interface BalanceAgeeRecouvrement {
  aEchoir: number;
  retard1a30: number;
  retard31a60: number;
  retard61a90: number;
  retard90Plus: number;
}

export interface ProchaineActionRecouvrement {
  creanceId: string;
  creanceNumero: string;
  creanceLibelle: string;
  dossierId: string;
  dossierNumero: string;
  debiteurNom: string | null;
  debiteurPrenom: string | null;
  soldeRestant: number;
  joursRetard: number;
  prochaineAction: string;
  prochaineActionLe: string;
}

export interface DebiteurPrioritaireRecouvrement {
  debiteurId: string;
  debiteurNom: string | null;
  debiteurPrenom: string | null;
  nombreCreances: number;
  soldeRestant: number;
  montantEchu: number;
}

export interface TableauDeBordRecouvrement {
  synthese: SyntheseRecouvrement;
  balanceAgee: BalanceAgeeRecouvrement;
  prochainesActions: ProchaineActionRecouvrement[];
  debiteursPrioritaires: DebiteurPrioritaireRecouvrement[];
}

export interface CreateCreancePayload {
  dossierId: string;
  libelle: string;
  montantInitial: number;
  reference?: string;
  dateExigibilite?: string;
  observations?: string;
}

export interface CreateEncaissementPayload {
  montant: number;
  mode: ModePaiement;
  reference?: string;
  note?: string;
}

export interface CreateEncaissementResult {
  creance: Creance;
  encaissement: EncaissementCreance;
}

export interface UpdateCreancePayload {
  libelle?: string;
  montantInitial?: number;
  reference?: string | null;
  dateExigibilite?: string | null;
  observations?: string | null;
}

export async function getTableauDeBordRecouvrement() {
  const { data } = await api.get<TableauDeBordRecouvrement>(
    '/recouvrement/tableau-de-bord',
  );
  return data;
}

export async function getCreances(query: QueryCreances = {}) {
  const { data } = await api.get<PaginatedResult<Creance>>('/recouvrement', {
    params: query,
  });
  return data;
}

export async function getCreance(id: string) {
  const { data } = await api.get<CreanceDetail>(`/recouvrement/${id}`);
  return data;
}

export async function creerCreance(payload: CreateCreancePayload) {
  const { data } = await api.post<Creance>('/recouvrement', payload);
  return data;
}

export async function modifierCreance(id: string, payload: UpdateCreancePayload) {
  const { data } = await api.patch<Creance>(`/recouvrement/${id}`, payload);
  return data;
}

export async function modifierStatutCreance(id: string, statut: StatutCreance) {
  const { data } = await api.patch<Creance>(`/recouvrement/${id}/statut`, { statut });
  return data;
}

export async function getEncaissementsCreance(id: string) {
  const { data } = await api.get<EncaissementCreance[]>(
    '/recouvrement/' + id + '/encaissements',
  );
  return data;
}

export async function creerEncaissement(
  id: string,
  payload: CreateEncaissementPayload,
) {
  const { data } = await api.post<CreateEncaissementResult>(
    '/recouvrement/' + id + '/encaissements',
    payload,
  );
  return data;
}
