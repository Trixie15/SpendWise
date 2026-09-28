import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api, { getError } from '../api/axios';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';

const ICONS = ['🍔', '☕', '🚌', '⛽', '💡', '🏠', '📱', '🛍️', '👕', '🎬', '🎮', '💊', '📚', '✈️', '🐶', '🎁', '📦', '💼', '💵', '💻', '💰', '📈'];
const COLORS = ['#0e7c66', '#22c55e', '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#be123c', '#f97316', '#eab308', '#64748b'];

const blank = (type) => ({ name: '', type, icon: ICONS[0], color: COLORS[0] });

export default function Categories() {
  const [type, setType] = useState('expense');
  const [categories, setCategories] = useState(null);
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(blank('expense'));
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => toast.error(getError(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setForm(blank(type));
    setModal({ open: true, editing: null });
  };

  const openEdit = (c) => {
    setForm({ name: c.name, type: c.type, icon: c.icon, color: c.color });
    setModal({ open: true, editing: c });
  };

  const close = () => setModal({ open: false, editing: null });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.editing) {
        const { name, icon, color } = form;
        await api.put(`/categories/${modal.editing._id}`, { name, icon, color });
        toast.success('Category updated');
      } else {
        await api.post('/categories', form);
        toast.success('Category added');
      }
      close();
      load();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete the "${c.name}" category?`)) return;
    try {
      await api.delete(`/categories/${c._id}`);
      toast.success('Category deleted');
      load();
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const shown = categories?.filter((c) => c.type === type) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Categories</h1>
          <p className="text-pine-soft">Organize your transactions your way.</p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          <Plus className="h-4 w-4" /> New category
        </button>
      </div>

      <div className="inline-grid grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1" role="tablist">
        {['expense', 'income'].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={type === t}
            onClick={() => setType(t)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              type === t ? 'bg-pine text-white' : 'text-pine-soft hover:text-pine'
            }`}
          >
            {t === 'expense' ? 'Expenses' : 'Income'}
          </button>
        ))}
      </div>

      {!categories ? (
        <Spinner />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <li key={c._id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
                style={{ backgroundColor: `${c.color}22` }}
              >
                {c.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.name}</span>
                <span className="mt-1 block h-1 w-8 rounded-full" style={{ backgroundColor: c.color }} />
              </span>
              <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-pine-soft hover:bg-canvas hover:text-pine" aria-label={`Edit ${c.name}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(c)} className="rounded-lg p-2 text-pine-soft hover:bg-rose-soft hover:text-rose" aria-label={`Delete ${c.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modal.open} title={modal.editing ? 'Edit category' : 'New category'} onClose={close}>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl bg-canvas p-3">
            <span
              className="grid h-12 w-12 place-items-center rounded-xl text-2xl"
              style={{ backgroundColor: `${form.color}22` }}
            >
              {form.icon}
            </span>
            <span className="font-semibold">{form.name || 'Category name'}</span>
          </div>

          <div>
            <label htmlFor="c-name" className="label">Name</label>
            <input
              id="c-name"
              required
              maxLength={30}
              autoFocus
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {!modal.editing && (
            <div>
              <span className="label">Type</span>
              <div className="flex gap-4 text-sm">
                {['expense', 'income'].map((t) => (
                  <label key={t} className="flex items-center gap-2 capitalize">
                    <input
                      type="radio"
                      name="c-type"
                      checked={form.type === t}
                      onChange={() => setForm({ ...form, type: t })}
                      className="accent-jade"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="label">Icon</span>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  aria-label={`Icon ${icon}`}
                  aria-pressed={form.icon === icon}
                  className={`grid h-10 w-10 place-items-center rounded-lg text-lg ${
                    form.icon === icon ? 'bg-jade-soft ring-2 ring-jade' : 'bg-canvas hover:bg-line'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Color</span>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  aria-label={`Color ${color}`}
                  aria-pressed={form.color === color}
                  className={`h-8 w-8 rounded-full ${form.color === color ? 'ring-2 ring-pine ring-offset-2' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                aria-label="Custom color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded border border-line"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving…' : modal.editing ? 'Save changes' : 'Add category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
