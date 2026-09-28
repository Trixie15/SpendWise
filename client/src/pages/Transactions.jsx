import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import TransactionForm from '../components/TransactionForm';
import TransactionRow from '../components/TransactionRow';

const EMPTY_FILTERS = { type: '', category: '', startDate: '', endDate: '', sort: '-date' };

export default function Transactions() {
  const { user } = useAuth();
  const currency = user?.currency || 'PHP';

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);

  const [result, setResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState({ open: false, tx: null });

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  // Wait until the user stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const params = { page, limit: 10, ...(search && { search }) };
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    api
      .get('/transactions', { params })
      .then((res) => setResult(res.data))
      .catch((err) => toast.error(getError(err)));
  }, [filters, search, page, refresh]);

  const changeFilter = (field, value) => {
    setFilters((f) => {
      const next = { ...f, [field]: value };
      // Clear the category filter if it doesn't match the selected type
      if (field === 'type' && value && f.category) {
        const cat = categories.find((c) => c._id === f.category);
        if (cat && cat.type !== value) next.category = '';
      }
      return next;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchInput('');
    setPage(1);
  };

  const handleDelete = async (tx) => {
    if (!window.confirm(`Delete "${tx.note || tx.category?.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/transactions/${tx._id}`);
      toast.success('Transaction deleted');
      if (result.transactions.length === 1 && page > 1) setPage((p) => p - 1);
      else setRefresh((r) => r + 1);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const hasFilters = searchInput || JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const categoryOptions = categories.filter((c) => !filters.type || c.type === filters.type);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Transactions</h1>
          <p className="text-pine-soft">
            {result ? `${result.total} ${result.total === 1 ? 'record' : 'records'}` : 'Loading…'}
          </p>
        </div>
        <button onClick={() => setModal({ open: true, tx: null })} className="btn btn-primary">
          <Plus className="h-4 w-4" /> Add transaction
        </button>
      </div>

      {/* Filters */}
      <section className="panel space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine-soft" />
          <input
            className="input pl-9"
            placeholder="Search notes"
            aria-label="Search notes"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <select className="input" aria-label="Type" value={filters.type} onChange={(e) => changeFilter('type', e.target.value)}>
            <option value="">All types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select className="input" aria-label="Category" value={filters.category} onChange={(e) => changeFilter('category', e.target.value)}>
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <input
            type="date"
            className="input"
            aria-label="From date"
            value={filters.startDate}
            onChange={(e) => changeFilter('startDate', e.target.value)}
          />
          <input
            type="date"
            className="input"
            aria-label="To date"
            value={filters.endDate}
            onChange={(e) => changeFilter('endDate', e.target.value)}
          />
          <select className="input col-span-2 md:col-span-1" aria-label="Sort" value={filters.sort} onChange={(e) => changeFilter('sort', e.target.value)}>
            <option value="-date">Newest first</option>
            <option value="date">Oldest first</option>
            <option value="-amount">Highest amount</option>
            <option value="amount">Lowest amount</option>
          </select>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-sm font-semibold text-jade hover:underline">
            Clear filters
          </button>
        )}
      </section>

      {/* List */}
      <section className="panel">
        {!result ? (
          <Spinner />
        ) : result.transactions.length === 0 ? (
          hasFilters ? (
            <EmptyState title="No matches" text="Try a different search or clear the filters." />
          ) : (
            <EmptyState
              icon={ArrowLeftRight}
              title="No transactions yet"
              text="Add your first expense or income to start tracking."
              action={<button onClick={() => setModal({ open: true, tx: null })} className="btn btn-primary">Add transaction</button>}
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-line">
              {result.transactions.map((tx) => (
                <TransactionRow
                  key={tx._id}
                  tx={tx}
                  currency={currency}
                  onEdit={(t) => setModal({ open: true, tx: t })}
                  onDelete={handleDelete}
                />
              ))}
            </ul>

            {result.pages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn btn-ghost px-3"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="text-sm text-pine-soft">
                  Page {result.page} of {result.pages}
                </span>
                <button
                  disabled={page >= result.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn-ghost px-3"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <Modal
        open={modal.open}
        title={modal.tx ? 'Edit transaction' : 'Add transaction'}
        onClose={() => setModal({ open: false, tx: null })}
      >
        <TransactionForm
          key={modal.tx?._id || 'new'}
          transaction={modal.tx}
          onCancel={() => setModal({ open: false, tx: null })}
          onSaved={() => {
            setModal({ open: false, tx: null });
            setRefresh((r) => r + 1);
          }}
        />
      </Modal>
    </div>
  );
}
