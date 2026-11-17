/**
 * Tanzanian Shilling (TZS) currency formatter
 */
export function formatTZS(amount: number): string {
  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(amount).replace('TSh', 'TZS');
}

/**
 * Format date as DD/MM/YYYY per project specification
 */
export function formatDate(dateStringOrTimestamp: string | number | Date): string {
  if (!dateStringOrTimestamp) return '—';
  const d = new Date(dateStringOrTimestamp);
  if (isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format datetime in East Africa Time (Africa/Dar_es_Salaam)
 */
export function formatDateTimeEAT(dateStringOrTimestamp: string | number | Date): string {
  if (!dateStringOrTimestamp) return '—';
  const d = new Date(dateStringOrTimestamp);
  if (isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes} EAT`;
}

/**
 * Clean relative time or time only
 */
export function formatTimeEAT(dateStringOrTimestamp: string | number | Date): string {
  if (!dateStringOrTimestamp) return '—';
  const d = new Date(dateStringOrTimestamp);
  if (isNaN(d.getTime())) return '—';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes} EAT`;
}
