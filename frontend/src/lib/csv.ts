// Export CSV compatible Excel (séparateur ';', BOM UTF-8 pour les accents).
export interface CsvColumn<T> {
  key: keyof T | ((row: T) => string | number | null | undefined);
  label: string;
}

function cellValue<T>(row: T, col: CsvColumn<T>): string {
  const raw = typeof col.key === 'function' ? col.key(row) : (row[col.key] as unknown);
  if (raw === null || raw === undefined) return '';
  const s = String(raw);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const header = columns.map((c) => c.label).join(';');
  const lines = rows.map((row) => columns.map((c) => cellValue(row, c)).join(';'));
  const csv = [header, ...lines].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
}