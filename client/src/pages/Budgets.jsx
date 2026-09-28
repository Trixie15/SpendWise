import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Pencil, PiggyBank, Trash2 } from 'lucide-react';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { currentMonth, formatMoney, monthLabel, shiftMonth } from '../utils/format';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const STATUS_STYLES = {
  ok: { bar: 'bg-jade', text: 'text-jade' },
  warning: { bar: 'bg-marigold', text: 'text-amber-700' },
  over: { bar: 'bg-rose', text: 'text-rose' },
};

export default function Budgets() {
  const { user } = useAuth();
  const currency = user?.currency || 'PHP';
  const formRef = useRef(null);

  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category: '', limit: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/budgets', { params: { month } });
      setBudgets(res.data);
    } catch (err) {
      toast.error(getError(err));
    }
  }, [month]);

  useEffect(() => {
    setBudgets(null);
    load();
  }, [load]);

  useEffect(() => {
    api.get('/categories', { params: { type: 'expense' } }).then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const isEditing = budgets?.some((b) => b.category._id === form.category);
  // Only show categories that don't have a budget yet (plus the one being edited)
  const available = categories.filter(
    (c) => !budgets?.some((b) => b.category._id === c._id) || c._id === form.category
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/budgets', { category: form.category, limit: Number(form.limit), month });
      toast.success(isEditing ? 'Budget updated' : 'Budget saved');
      setForm({ category: '', limit: '' });
      load();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b) => {
    setForm({ category: b.category._id, limit: b.limit });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Remove the ${b.category.name} budget for ${monthLabel(month)}?`)) return;
    try {
      await api.delete(`/budgets/${b._id}`);
      toast.success('Budget removed');
      load();
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const totalLimit = budgets?.reduce((s, b) => s + b.limit, 0) || 0;
  const totalSpent = budgets?.reduce((s, b) => s + b.spent, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Budgets</h1>
          <p className="text-pine-soft">Set a spending limit for each category.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="rounded-lg p-2 hover:bg-canvas" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(month)}</span>
          <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="rounded-lg p-2 hover:bg-canvas" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Set budget form */}
      <form ref={formRef} onSubmit={handleSave} className="panel grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="b-category" className="label">Category</label>
          <select
            id="b-category"
            required
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Select…</option>
            {available.map((c) => (
              <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="b-limit" className="label">Monthly limit</label>
          <input
            id="b-limit"
            type="number"
            min="1"
            step="0.01"
            required
            className="input"
            placeholder="3000"
            value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          {form.category && (
            <button type="button" onClick={() => setForm({ category: '', limit: '' })} className="btn btn-ghost">
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving} className="btn btn-primary flex-1 sm:flex-none">
            {saving ? 'Saving…' : isEditing ? 'Update budget' : 'Set budget'}
          </button>
        </div>
      </form>

      {!budgets ? (
        <Spinner />
      ) : budgets.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={PiggyBank}
            title={`No budgets for ${monthLabel(month)}`}
            text="Pick a category above and set how much you want to spend on it this month."
          />
        </div>
      ) : (
        <>
          <div className="panel flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-pine-soft">
              Total spent{' '}
              <span className="font-display text-2xl font-bold text-pine tabular-nums">{formatMoney(totalSpent, currency)}</span>
              {' '}of {formatMoney(totalLimit, currency)}
            </p>
            <p className="text-sm text-pine-soft">
              {totalLimit - totalSpent >= 0
                ? `${formatMoney(totalLimit - totalSpent, currency)} left overall`
                : `${formatMoney(totalSpent - totalLimit, currency)} over overall`}
            </p>
          </div>

          <ul className="grid gap-4 md:grid-cols-2">
            {budgets.map((b) => {
              const style = STATUS_STYLES[b.status];
              return (
                <li key={b._id} className="panel">
                  <div className="flex items-start gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
                      style={{ backgroundColor: `${b.category.color}22` }}
                    >
                      {b.category.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{b.category.name}</p>
                      <p className="text-sm text-pine-soft tabular-nums">
                        {formatMoney(b.spent, currency)} of {formatMoney(b.limit, currency)}
                      </p>
                    </div>
                    <button onClick={() => startEdit(b)} className="rounded-lg p-2 text-pine-soft hover:bg-canvas hover:text-pine" aria-label={`Edit ${b.category.name} budget`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(b)} className="rounded-lg p-2 text-pine-soft hover:bg-rose-soft hover:text-rose" aria-label={`Delete ${b.category.name} budget`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div
                    className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-canvas"
                    role="progressbar"
                    aria-valuenow={b.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(b.percentage, 100)}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className={`font-semibold ${style.text}`}>{b.percentage}% used</span>
                    <span className="text-pine-soft">
                      {b.remaining >= 0
                        ? `${formatMoney(b.remaining, currency)} left`
                        : `${formatMoney(-b.remaining, currency)} over`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
