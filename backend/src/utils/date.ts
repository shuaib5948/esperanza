/**
 * Formats an ISO string or Date into MySQL DATETIME compatible format 'YYYY-MM-DD HH:MM:SS'
 */
export function toSqlDatetime(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  return d.toISOString().slice(0, 19).replace('T', ' ');
}
