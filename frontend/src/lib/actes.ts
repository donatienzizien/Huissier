import type { TypeActe } from '../types';
import { api } from './api';

// Un modele d'acte renvoie un document HTML complet (DOCTYPE + <style> +
// <body>), mais l'editeur riche (Tiptap) n'edite que le contenu du body.
// On separe donc le bloc <style> (mise en forme figee) du contenu edite,
// puis on les recombine avant d'enregistrer - sinon le PDF final perdrait
// sa mise en forme.
export interface DocumentEditable {
  styleBlock: string;
  bodyHtml: string;
}

export function separerStyleEtCorps(htmlComplet: string): DocumentEditable {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlComplet, 'text/html');
  const styleEl = doc.querySelector('style');
  const styleBlock = styleEl ? styleEl.outerHTML : '';
  const bodyHtml = doc.body ? doc.body.innerHTML : htmlComplet;
  return { styleBlock, bodyHtml };
}

export function recombinerDocument(styleBlock: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${styleBlock}</head><body>${bodyHtml}</body></html>`;
}

export interface ApercuActeParams {
  dossierId: string;
  modeleId: string;
  contenu?: Record<string, unknown>;
}

export async function genererApercuActe(params: ApercuActeParams): Promise<string> {
  const { data } = await api.post<{ html: string }>('/actes/apercu', params);
  return data.html;
}

export interface CreerActeParams extends ApercuActeParams {
  corpsHtml: string;
}

export async function creerActeBrouillon(params: CreerActeParams) {
  const { data } = await api.post('/actes', params);
  return data;
}

export async function modifierBrouillonActe(acteId: string, corpsHtml: string) {
  const { data } = await api.patch(`/actes/${acteId}/brouillon`, { corpsHtml });
  return data;
}

export async function soumettreActe(acteId: string) {
  const { data } = await api.patch(`/actes/${acteId}/soumettre`);
  return data;
}

export async function validerActe(acteId: string) {
  const { data } = await api.patch(`/actes/${acteId}/valider`);
  return data;
}

export async function getActe(acteId: string) {
  const { data } = await api.get(`/actes/${acteId}`);
  return data as { id: string; corps_html: string | null; numero: string };
}

export async function corrigerActeEnAttente(acteId: string, corpsHtml: string) {
  const { data } = await api.patch(`/actes/${acteId}/corriger`, { corpsHtml });
  return data;
}

export async function rejeterActe(acteId: string, motif?: string) {
  const { data } = await api.patch(`/actes/${acteId}/rejeter`, { motif });
  return data;
}


export interface ActeValide {
  id: string;
  numero: string;
  type: TypeActe;
  dossier_id: string;
  dossier_numero: string;
  valide_le: string | null;
  envoye_client_le: string | null;
  signe_client_le: string | null;
  notifie_le: string | null;
  notifie_par: string | null;
  notifie_par_nom: string | null;
  notifie_par_prenom: string | null;
  pdf_disponible: boolean;
  docx_disponible: boolean;
}

export async function getActesValides(signes = false): Promise<ActeValide[]> {
  const { data } = await api.get<ActeValide[]>('/actes/valides', {
    params: signes ? { signes: 'true' } : undefined,
  });
  return data;
}

export function getPdfActeUrl(acteId: string): string {
  return `/api/actes/${acteId}/pdf`;
}

export function getDocxActeUrl(acteId: string): string {
  return `/api/actes/${acteId}/docx`;
}


export async function ouvrirPdfActe(acteId: string, numero: string): Promise<void> {
  const { data } = await api.get(`/actes/${acteId}/pdf`, {
    responseType: 'blob',
  });

  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const fenetre = window.open(url, '_blank', 'noopener,noreferrer');

  if (!fenetre) {
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `${numero}.pdf`;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function telechargerDocxActe(acteId: string, numero: string): Promise<void> {
  const { data } = await api.get(`/actes/${acteId}/docx`, {
    responseType: 'blob',
  });

  const url = URL.createObjectURL(
    new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
  );

  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `${numero}.docx`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function envoyerActeAuClient(acteId: string) {
  const { data } = await api.patch(`/actes/${acteId}/envoyer-client`);
  return data;
}

export async function marquerActeSigne(acteId: string) {
  const { data } = await api.patch(`/actes/${acteId}/marquer-signe`);
  return data;
}

export interface AgentActif {
  id: string;
  nom: string;
  prenom: string;
  role: string;
}

export async function getAgentsActifs(): Promise<AgentActif[]> {
  const { data } = await api.get<AgentActif[]>('/actes/agents-actifs');
  return data;
}

export async function marquerActeNotifie(acteId: string, agentId: string) {
  const { data } = await api.patch(`/actes/${acteId}/marquer-notifie`, { agentId });
  return data;
}



