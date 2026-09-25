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

