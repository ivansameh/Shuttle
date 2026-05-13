export const formatCurrency = (amount: number | null | undefined, currency: string = 'EGP') => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return `0.00 ${currency}`;
  return `${Number(amount).toFixed(2)} ${currency}`;
};

export const formatDate = (date: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}) => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...options
  });
};

export const formatTime = (date: string | Date | null | undefined) => {
  if (!date) return '—:—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—:—';
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};
