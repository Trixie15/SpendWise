import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getError } from '../api/axios';
import { PAYMENT_METHODS, todayStr, toInputDate } from '../utils/format';

// Used for both adding and editing. Pass `transaction` to edit.
export default function TransactionForm({ transaction, onSaved, onCancel }) {
  const isEdit = Boolean(transaction);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: transaction?.type || 'expense',
    amount: transaction?.amount ?? '',
    category: transaction?.category?._id || '',
    date: transaction ? toInputDate(transaction.date) : todayStr(),
    paymentMethod: transaction?.paymentMethod || 'cash',
    note: transaction?.note || '',
  });

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => toast.error(getError(err)));
  }, []);

  const options = categories.filter((c) => c.type === form.type);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const switchType = (type) => {
    // Clear the category if it doesn't belong to the new type
    setForm((f) => {
      const stillValid = categories.some((c) => c._id === f.category && c.type === type);
      return { ...f, type, category: stillValid ? f.category : '' };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) return toast.error('Choose a category');

    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      const res = isEdit
        ? await api.put(`/transactions/${transaction._id}`, payload)
        : await api.post('/transactions', payload);
      toast.success(isEdit ? 'Transaction updated' : 'Transaction added');
      onSaved(res.data);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1" role="radiogroup" aria-label="Type">
        {['expense', 'income'].map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={form.type === t}
            onClick={() => switchType(t)}
            className={`rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
              form.type === t
                ? t === 'expense'
                  ? 'bg-rose text-white'
                  : 'bg-jade text-white'
                : 'text-pine-soft hover:text-pine'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="amount" className="label">Amount</label>
        <input
          id="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          autoFocus
          className="input font-display text-2xl font-bold"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => update('amount', e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="label">Category</label>
          <select
            id="category"
            required
            className="input"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            <option value="">Select…</option>
            {options.map((c) => (
              <option key={c._id} value={c._id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date" className="label">Date</label>
          <input
            id="date"
            type="date"
            required
            className="input"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="paymentMethod" className="label">Paid with</label>
        <select
          id="paymentMethod"
          className="input"
          value={form.paymentMethod}
          onChange={(e) => update('paymentMethod', e.target.value)}
        >
          {PAYMENT_METHODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="note" className="label">Note <span className="font-normal text-pine-soft">(optional)</span></label>
        <input
          id="note"
          maxLength={200}
          className="input"
          placeholder="e.g. Lunch at the canteen"
          value={form.note}
          onChange={(e) => update('note', e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add transaction'}
        </button>
      </div>
    </form>
  );
}
