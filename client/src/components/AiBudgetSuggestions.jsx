import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Lightbulb, ShieldCheck, Sparkles } from 'lucide-react';
import api, { getError } from '../api/axios';
import { formatMoney, monthLabel } from '../utils/format';

// Suggests a monthly limit per category. Applying uses the normal budget API,
// so every suggested value is still validated by the server.
export default function AiBudgetSuggestions({ month, currency, onApplied }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(null); // category id or 'all'
  const [applied, setApplied] = useState({});
  const [edits, setEdits] = useState({});

  const fetchSuggestions = async () => {
    setLoading(true);
    setApplied({});
    setEdits({});
    try {
      const res = await api.post('/budgets/recommendations', { month });
      setData(res.data);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const valueFor = (r) => edits[r.category._id] ?? r.suggestedLimit;

  const apply = async (list, key) => {
    setApplying(key);
    try {
      for (const r of list) {
        await api.post('/budgets', { category: r.category._id, limit: Number(valueFor(r)), month });
      }
      setApplied((a) => ({ ...a, ...Object.fromEntries(list.map((r) => [r.category._id, true])) }));
      toast.success(list.length > 1 ? `${list.length} budgets set` : 'Budget set');
      onApplied();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setApplying(null);
    }
  };

  const pending = data?.recommendations.filter((r) => !applied[r.category._id]) || [];

  return (
    <section className="panel space-y-4 border-jade/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-jade" /> AI budget recommendations
          </h2>
          <p className="text-sm text-pine-soft">
            Get suggested limits for {monthLabel(month)} based on your last 3 months of spending.
          </p>
        </div>
        <button onClick={fetchSuggestions} disabled={loading} className="btn btn-primary">
          <Sparkles className="h-4 w-4" />
          {loading ? 'Analyzing your spending…' : data ? 'Refresh suggestions' : 'Get suggestions'}
        </button>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-canvas p-3 text-xs text-pine-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-jade" />
        Only your monthly totals per category are analyzed. Your name, email, and transaction notes are never shared with the AI.
      </p>

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-semibold ${data.source === 'ai' ? 'bg-jade-soft text-jade' : 'bg-marigold-soft text-amber-800'}`}>
              {data.source === 'ai' ? 'AI suggestions' : 'Basic suggestions'}
            </span>
            <span className="text-pine-soft">
              Based on {data.basedOn.map(monthLabel).join(', ')}
              {data.partialMonth ? ' (this month projected)' : ''}
            </span>
          </div>
          {data.notice && <p className="text-sm text-pine-soft">{data.notice}</p>}

          <ul className="divide-y divide-line">
            {data.recommendations.map((r) => {
              const id = r.category._id;
              const done = applied[id];
              return (
                <li key={id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
                    style={{ backgroundColor: `${r.category.color}22` }}
                  >
                    {r.category.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.category.name}</p>
                    <p className="text-xs text-pine-soft">
                      Average spent: {formatMoney(r.averageSpent, currency)}/month
                      {r.currentLimit ? ` · Current limit: ${formatMoney(r.currentLimit, currency)}` : ''}
                    </p>
                    <p className="mt-1 text-sm">{r.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:w-56 sm:justify-end">
                    <input
                      type="number"
                      min="1"
                      step="50"
                      aria-label={`Limit for ${r.category.name}`}
                      disabled={done}
                      className="input w-28 font-semibold tabular-nums"
                      value={valueFor(r)}
                      onChange={(e) => setEdits((x) => ({ ...x, [id]: e.target.value }))}
                    />
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-jade">
                        <Check className="h-4 w-4" /> Set
                      </span>
                    ) : (
                      <button
                        onClick={() => apply([r], id)}
                        disabled={applying !== null || !(Number(valueFor(r)) >= 1)}
                        className="btn btn-ghost px-3"
                      >
                        {applying === id ? '…' : 'Apply'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {data.tip && (
            <p className="flex items-start gap-2 rounded-xl bg-marigold-soft p-3 text-sm">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /> {data.tip}
            </p>
          )}

          {pending.length > 1 && (
            <div className="flex justify-end">
              <button onClick={() => apply(pending, 'all')} disabled={applying !== null} className="btn btn-primary">
                {applying === 'all' ? 'Applying…' : `Apply all ${pending.length}`}
              </button>
            </div>
          )}
          <p className="text-xs text-pine-soft">Suggestions are a guide. You can edit any amount before applying.</p>
        </>
      )}
    </section>
  );
}
