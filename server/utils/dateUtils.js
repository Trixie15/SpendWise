// All dates are handled in UTC so month boundaries stay consistent.
// The frontend should send dates as "YYYY-MM-DD" strings.

const currentMonth = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

// "2026-09" -> { start: 2026-09-01T00:00Z, end: 2026-10-01T00:00Z }  (use $gte start, $lt end)
const monthRange = (month) => {
  const [year, m] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, m - 1, 1)),
    end: new Date(Date.UTC(year, m, 1)),
  };
};

const endOfDay = (dateStr) => {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

module.exports = { currentMonth, monthRange, endOfDay };
