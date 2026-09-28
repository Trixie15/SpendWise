import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Lock, Search } from 'lucide-react';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'Never');

export default function Admin() {
  const { user: me } = useAuth();
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api.get('/admin/stats').then((res) => setStats(res.data)).catch((err) => toast.error(getError(err)));
  }, [refresh]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    api
      .get('/admin/users', { params: { page, ...(search && { search }) } })
      .then((res) => setResult(res.data))
      .catch((err) => toast.error(getError(err)));
  }, [page, search, refresh]);

  const update = async (u, changes, label) => {
    if (!window.confirm(`${label} for ${u.email}? They will be signed out.`)) return;
    try {
      await api.patch(`/admin/users/${u._id}`, changes);
      toast.success('User updated');
      setRefresh((r) => r + 1);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const cards = stats && [
    { label: 'Total users', value: stats.totalUsers },
    { label: 'Active accounts', value: stats.activeUsers },
    { label: 'Using two-factor', value: `${stats.totalUsers ? Math.round((stats.mfaUsers / stats.totalUsers) * 100) : 0}%` },
    { label: 'Transactions logged', value: stats.totalTransactions },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
        <p className="flex items-center gap-1.5 text-pine-soft">
          <Lock className="h-4 w-4" /> You can manage accounts, but users' financial records stay private.
        </p>
      </div>

      {!stats ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="panel">
              <p className="text-sm text-pine-soft">{c.label}</p>
              <p className="font-display text-3xl font-extrabold tabular-nums">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="panel space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine-soft" />
          <input
            className="input pl-9"
            placeholder="Search by name or email"
            aria-label="Search users"
            maxLength={100}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {!result ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-pine-soft">
                <tr>
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">2FA</th>
                  <th className="py-2 pr-3 font-medium">Last login</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.users.map((u) => {
                  const isMe = u._id === me._id;
                  return (
                    <tr key={u._id}>
                      <td className="py-3 pr-3">
                        <p className="font-semibold">{u.name}{isMe && <span className="text-pine-soft"> (you)</span>}</p>
                        <p className="text-xs text-pine-soft">{u.email}</p>
                      </td>
                      <td className="py-3 pr-3 capitalize">{u.role}</td>
                      <td className="py-3 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.isActive ? 'bg-jade-soft text-jade' : 'bg-rose-soft text-rose'}`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 pr-3">{u.mfaEnabled ? (u.mfaMethod === 'email' ? 'Email' : 'App') : 'Off'}</td>
                      <td className="py-3 pr-3 text-pine-soft">{fmt(u.lastLoginAt)}</td>
                      <td className="py-3">
                        {isMe ? (
                          <span className="text-xs text-pine-soft">—</span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? 'Disable account' : 'Enable account')}
                              className={`btn px-3 py-1.5 text-xs ${u.isActive ? 'btn-ghost' : 'btn-primary'}`}
                            >
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => update(u, { role: u.role === 'admin' ? 'user' : 'admin' }, u.role === 'admin' ? 'Remove admin role' : 'Make admin')}
                              className="btn btn-ghost px-3 py-1.5 text-xs"
                            >
                              {u.role === 'admin' ? 'Make user' : 'Make admin'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {result && result.pages > 1 && (
          <div className="flex items-center justify-between border-t border-line pt-4">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn btn-ghost px-3">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-sm text-pine-soft">Page {result.page} of {result.pages}</span>
            <button disabled={page >= result.pages} onClick={() => setPage((p) => p + 1)} className="btn btn-ghost px-3">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
