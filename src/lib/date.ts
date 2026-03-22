export function toDate(val: any): Date | undefined {
  if (!val && val !== 0) return undefined;
  // Firestore Timestamp or similar objects expose a toDate() method
  if (typeof val === 'object' && val !== null && typeof (val as any).toDate === 'function') {
    try {
      return (val as any).toDate();
    } catch {
      return undefined;
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

export function toLocaleDateStringSafe(val: any, locale?: string) {
  const d = toDate(val);
  return d ? d.toLocaleDateString(locale) : 'N/A';
}

export function toLocaleTimeStringSafe(val: any, locale?: string, opts?: Intl.DateTimeFormatOptions) {
  const d = toDate(val);
  return d ? d.toLocaleTimeString(locale, opts) : '';
}
