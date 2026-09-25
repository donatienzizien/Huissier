import { api } from './api';

async function telechargerPdf(path: string, numero: string) {
  const response = await api.get(path, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.download = `${numero}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
}

export function telechargerActePdf(acteId: string, numero: string) {
  return telechargerPdf(`/actes/${acteId}/pdf`, numero);
}

export function telechargerFacturePdf(factureId: string, numero: string) {
  return telechargerPdf(`/factures/${factureId}/pdf`, numero);
}
