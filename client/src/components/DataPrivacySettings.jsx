import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Braces, FileSpreadsheet, FileText, Trash2 } from 'lucide-react';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney, monthLabel, paymentLabel } from '../utils/format';
import Modal from './Modal';
import PasswordInput from './PasswordInput';

// ---------- helpers ----------

const saveFile = (content, filename, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// CSV cell: quoted, and protected against spreadsheet formula injection (=, +, -, @)
const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const today = () => new Date().toISOString().slice(0, 10);

// ---------- export builders ----------

const buildCsv = (data) => {
  const header = ['Date', 'Type', 'Category', 'Amount', 'Payment method', 'Note'];
  const rows = data.transactions.map((t) => [
    new Date(t.date).toISOString().slice(0, 10),
    t.type === 'income' ? 'Income' : 'Expense',
    t.category?.name || '',
    t.amount.toFixed(2),
    paymentLabel(t.paymentMethod),
    t.note || '',
  ]);
  // BOM (\uFEFF) makes Excel read peso signs and emojis correctly
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
};

const buildReport = (data) => {
  const { profile, transactions, categories, budgets } = data;
  const currency = profile.currency || 'PHP';
  const money = (n) => escapeHtml(formatMoney(n, currency));
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const fullDate = (d) => (d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  const txRows = transactions.length
    ? transactions
        .map(
          (t) => `<tr>
            <td>${escapeHtml(formatDate(t.date))}</td>
            <td>${escapeHtml(t.category?.name || '—')}</td>
            <td>${escapeHtml(t.note || '')}</td>
            <td>${escapeHtml(paymentLabel(t.paymentMethod))}</td>
            <td class="num ${t.type}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="empty">No transactions</td></tr>';

  const catRows = ['expense', 'income']
    .map((type) => {
      const list = categories.filter((c) => c.type === type);
      return `<tr><th>${type === 'expense' ? 'Expense' : 'Income'} categories</th><td>${
        list.map((c) => `${escapeHtml(c.icon)} ${escapeHtml(c.name)}`).join(', ') || '—'
      }</td></tr>`;
    })
    .join('');

  const budgetRows = budgets.length
    ? budgets
        .sort((a, b) => b.month.localeCompare(a.month))
        .map((b) => `<tr><td>${escapeHtml(monthLabel(b.month))}</td><td>${escapeHtml(b.category?.name || '—')}</td><td class="num">${money(b.limit)}</td></tr>`)
        .join('')
    : '<tr><td colspan="3" class="empty">No budgets</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SpendWise – My Data</title>
<style>
  body { font-family: Figtree, Segoe UI, system-ui, sans-serif; color: #17312b; background: #f3f6f4; margin: 0; padding: 32px 16px; }
  main { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #dde5e1; border-radius: 16px; padding: 32px; }
  h1 { margin: 0; font-size: 28px; } h2 { margin: 32px 0 12px; font-size: 18px; }
  .muted { color: #52665f; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #dde5e1; vertical-align: top; }
  th { color: #52665f; font-weight: 600; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .income { color: #0e7c66; } .expense { color: #be123c; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
  .card { background: #f3f6f4; border-radius: 12px; padding: 14px; }
  .card b { display: block; font-size: 20px; margin-top: 4px; }
  .empty { text-align: center; color: #52665f; }
  .print { margin-top: 16px; padding: 10px 16px; border: 0; border-radius: 8px; background: #0e7c66; color: #fff; font-weight: 600; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } main { border: 0; } .print { display: none; } }
  @media (max-width: 600px) { .cards { grid-template-columns: 1fr; } main { padding: 20px; } }
</style>
</head>
<body>
<main>
  <h1>My SpendWise Data</h1>
  <p class="muted">Exported on ${escapeHtml(fullDate(data.exportedAt))}. This report contains all the personal data SpendWise stores about you.</p>
  <button class="print" onclick="window.print()">Print or save as PDF</button>

  <h2>Profile</h2>
  <table>
    <tr><th>Name</th><td>${escapeHtml(profile.name)}</td></tr>
    <tr><th>Email</th><td>${escapeHtml(profile.email)}</td></tr>
    <tr><th>Currency</th><td>${escapeHtml(profile.currency)}</td></tr>
    <tr><th>Account type</th><td>${profile.role === 'admin' ? 'Administrator' : 'User'}</td></tr>
    <tr><th>Two-factor authentication</th><td>${profile.mfaEnabled ? `On (${profile.mfaMethod === 'email' ? 'email code' : 'authenticator app'})` : 'Off'}</td></tr>
    <tr><th>Account created</th><td>${escapeHtml(fullDate(profile.createdAt))}</td></tr>
    <tr><th>Last login</th><td>${escapeHtml(fullDate(profile.lastLoginAt))}</td></tr>
    <tr><th>Privacy consent</th><td>${
      profile.consent?.acceptedAt
        ? `Agreed to Privacy Policy v${escapeHtml(profile.consent.policyVersion)} on ${escapeHtml(fullDate(profile.consent.acceptedAt))}`
        : '—'
    }</td></tr>
  </table>

  <h2>Summary</h2>
  <div class="cards">
    <div class="card">Total income<b class="income">${money(income)}</b></div>
    <div class="card">Total expenses<b class="expense">${money(expense)}</b></div>
    <div class="card">Balance<b>${money(income - expense)}</b></div>
  </div>

  <h2>Transactions (${transactions.length})</h2>
  <table>
    <thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Paid with</th><th class="num">Amount</th></tr></thead>
    <tbody>${txRows}</tbody>
  </table>

  <h2>Categories</h2>
  <table>${catRows}</table>

  <h2>Budgets</h2>
  <table>
    <thead><tr><th>Month</th><th>Category</th><th class="num">Limit</th></tr></thead>
    <tbody>${budgetRows}</tbody>
  </table>

  <p class="muted" style="margin-top:32px">Passwords and security keys are never included in exports. Keep this file private.</p>
</main>
</body>
</html>`;
};

const FORMATS = [
  {
    id: 'report',
    icon: FileText,
    title: 'Readable report',
    text: 'Opens in your browser. Easy to read, print, or save as PDF.',
    build: (d) => [buildReport(d), `spendwise-my-data-${today()}.html`, 'text/html'],
  },
  {
    id: 'csv',
    icon: FileSpreadsheet,
    title: 'Excel (CSV)',
    text: 'Your transactions as a spreadsheet.',
    build: (d) => [buildCsv(d), `spendwise-transactions-${today()}.csv`, 'text/csv;charset=utf-8'],
  },
  {
    id: 'json',
    icon: Braces,
    title: 'JSON',
    text: 'Complete data in a machine-readable format, for moving to another app.',
    build: (d) => [JSON.stringify(d, null, 2), `spendwise-my-data-${today()}.json`, 'application/json'],
  },
];

// ---------- component ----------

export default function DataPrivacySettings() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [deleting, setDeleting] = useState(false);

  const exportData = async (format) => {
    setExporting(format.id);
    try {
      const res = await api.get('/account/export');
      saveFile(...format.build(res.data));
      toast.success('Your data has been downloaded');
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setExporting(null);
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await api.delete('/account', { data: form });
      clearSession();
      toast.success('Your account and data have been deleted');
      navigate('/login');
    } catch (err) {
      toast.error(getError(err));
      setDeleting(false);
    }
  };

  const consentDate = user.consent?.acceptedAt
    ? new Date(user.consent.acceptedAt).toLocaleDateString('en-PH', { dateStyle: 'medium' })
    : null;

  return (
    <section className="panel space-y-5">
      <div>
        <h2 className="text-lg font-bold">Privacy and your data</h2>
        <p className="text-sm text-pine-soft">
          {consentDate ? `You agreed to the Privacy Policy (v${user.consent.policyVersion}) on ${consentDate}. ` : ''}
          <Link to="/privacy" className="font-semibold text-jade hover:underline">Read the Privacy Policy</Link>
        </p>
      </div>

      <div className="space-y-3 border-t border-line pt-4">
        <div>
          <p className="font-semibold">Download your data</p>
          <p className="text-sm text-pine-soft">Get a copy of your profile, transactions, categories and budgets.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => exportData(f)}
                disabled={exporting !== null}
                className="flex flex-col items-start gap-1 rounded-xl border border-line p-3 text-left transition-colors hover:border-jade hover:bg-jade-soft/40 disabled:opacity-60"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-jade" />
                  {exporting === f.id ? 'Preparing…' : f.title}
                </span>
                <span className="text-xs text-pine-soft">{f.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div>
          <p className="font-semibold text-rose">Delete account</p>
          <p className="text-sm text-pine-soft">Permanently erase your account and all your records. This can't be undone.</p>
        </div>
        <button onClick={() => setShowDelete(true)} className="btn btn-danger">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>

      <Modal open={showDelete} title="Delete your account?" onClose={() => setShowDelete(false)}>
        <form onSubmit={deleteAccount} className="space-y-4">
          <p className="text-sm text-pine-soft">
            All your transactions, categories and budgets will be permanently deleted. Consider downloading your data first.
          </p>
          <div>
            <label htmlFor="del-pass" className="label">Password</label>
            <PasswordInput
              id="del-pass"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="del-confirm" className="label">Type <span className="font-mono">DELETE</span> to confirm</label>
            <input
              id="del-confirm"
              required
              autoComplete="off"
              className="input font-mono"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowDelete(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={deleting || form.confirm !== 'DELETE'} className="btn btn-danger">
              {deleting ? 'Deleting…' : 'Delete forever'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
