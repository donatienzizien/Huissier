import { api } from './api';

async function telechargerBlob(url: string, filename: string) {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10_000);
}

function buildParams(dateDebut?: string, dateFin?: string) {
  const params = new URLSearchParams();
  if (dateDebut) params.set('dateDebut', dateDebut);
  if (dateFin) params.set('dateFin', dateFin);
  return params.toString();
}

export async function telechargerRapportExcel(dateDebut?: string, dateFin?: string) {
  const suffix = buildParams(dateDebut, dateFin);
  await telechargerBlob(
    `/rapports/export/excel${suffix ? `?${suffix}` : ''}`,
    `rapport-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export async function telechargerRapportPdf(dateDebut?: string, dateFin?: string) {
  const suffix = buildParams(dateDebut, dateFin);
  await telechargerBlob(
    `/rapports/export/pdf${suffix ? `?${suffix}` : ''}`,
    `rapport-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
