import { api } from './api';
import type {
  Creance,
  CreanceDetail,
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
}

export interface CreateCreancePayload {
  dossierId: string;
  libelle: string;
  montantInitial: number;
  reference?: string;
  dateExigibilite?: string;
  observations?: string;
}

export interface UpdateCreancePayload {
  libelle?: string;
  montantInitial?: number;
  reference?: string | null;
  dateExigibilite?: string | null;
  observations?: string | null;
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
