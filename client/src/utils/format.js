const pad = (n) => String(n).padStart(2, '0');

export const formatMoney = (amount, currency = 'PHP') => {
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

// Dates are stored as UTC midnight, so display them in UTC to avoid off-by-one days
export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const toInputDate = (date) => new Date(date).toISOString().slice(0, 10);

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};

export const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'e-wallet', label: 'E-wallet (GCash, Maya)' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

export const paymentLabel = (value) =>
  PAYMENT_METHODS.find((p) => p.value === value)?.label.split(' (')[0] || value;

export const CURRENCIES = ['PHP', 'USD', 'EUR', 'JPY', 'KRW', 'SGD', 'AUD', 'GBP'];
