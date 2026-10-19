import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Lock, Search } from 'lucide-react';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'Never');
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

const STATUS = {
  active: { label: 'Active', className: 'bg-jade-soft text-jade' },
  disabled: { label: 'Disabled', className: 'bg-rose-soft text-rose' },
  locked: { label: 'Locked', className: 'bg-marigold-soft text-amber-800' },
};
const statusOf = (u) => (!u.isActive ? 'disabled' : u.isLocked ? 'locked' : 'active');

export default function Admin() {
  const { user: me } = useAuth();
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState(null); // { user, action, label, description }
  const [busy, setBusy] = useState(false);

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

  const ask = (u, action) => {
    const options = {
      disable: { label: 'Disable account', description: `${u.name} will be signed out and won't be able to log in until re-enabled.` },
      enable: { label: 'Enable account', description: `${u.name} will be able to log in again.` },
      makeAdmin: { label: 'Make admin', description: `${u.name} will become an administrator, lose access to personal finance pages, and be signed out.` },
      makeUser: { label: 'Make regular user', description: `${u.name} will lose admin access and be signed out.` },
      unlock: { label: 'Unlock account', description: `${u.name} was locked after too many failed logins. Unlocking lets them try again now.` },
    };
    setPending({ user: u, action, ...options[action] });
  };

  const confirm = async () => {
    const { user: u, action } = pending;
    setBusy(true);
    try {
      if (action === 'unlock') await api.post(`/admin/users/${u._id}/unlock`);
      else if (action === 'disable') await api.patch(`/admin/users/${u._id}`, { isActive: false });
      else if (action === 'enable') await api.patch(`/admin/users/${u._id}`, { isActive: true });
      else if (action === 'makeAdmin') await api.patch(`/admin/users/${u._id}`, { role: 'admin' });
      else if (action === 'makeUser') await api.patch(`/admin/users/${u._id}`, { role: 'user' });
      toast.success('User updated');
      setPending(null);
      setRefresh((r) => r + 1);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const cards = stats && [
    { label: 'Total users', value: stats.totalUsers },
    { label: 'Active accounts', value: stats.activeUsers },
    { label: 'Disabled accounts', value: stats.disabledUsers, warn: stats.disabledUsers > 0 },
    { label: 'Locked right now', value: stats.lockedUsers, warn: stats.lockedUsers > 0 },
    { label: 'New in last 30 days', value: stats.newUsers },
    { label: 'Using two-factor', value: `${stats.totalUsers ? Math.round((stats.mfaUsers / stats.totalUsers) * 100) : 0}%` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Account Monitoring</h1>
        <p className="flex items-center gap-1.5 text-pine-soft">
          <Lock className="h-4 w-4 shrink-0" /> You can monitor and manage accounts. Users' financial records stay private.
        </p>
      </div>

      {!stats ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.label} className={`panel ${c.warn ? 'border-marigold' : ''}`}>
              <p className="text-sm text-pine-soft">{c.label}</p>
              <p className="font-display text-3xl font-extrabold tabular-nums">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Users</h2>
          {result && <p className="text-sm text-pine-soft">{result.total} total</p>}
        </div>
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
        ) : result.users.length === 0 ? (
          <p className="py-8 text-center text-sm text-pine-soft">No users match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line text-pine-soft">
                <tr>
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">2FA</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 pr-3 font-medium">Last login</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.users.map((u) => {
                  const isMe = u._id === me._id;
                  const status = STATUS[statusOf(u)];
                  return (
                    <tr key={u._id}>
                      <td className="py-3 pr-3">
                        <p className="font-semibold">
                          {u.lastName ? `${u.lastName}, ${u.firstName}` : u.name}
                          {isMe && <span className="font-normal text-pine-soft"> (you)</span>}
                        </p>
                        <p className="text-xs text-pine-soft">{u.email}</p>
                      </td>
                      <td className="py-3 pr-3 capitalize">{u.role}</td>
                      <td className="py-3 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
                        {u.isLocked && u.isActive && (
                          <p className="mt-1 text-xs text-pine-soft">until {fmtTime(u.lockUntil)}</p>
                        )}
                      </td>
                      <td className="py-3 pr-3">{u.mfaEnabled ? (u.mfaMethod === 'email' ? 'Email' : 'App') : 'Off'}</td>
                      <td className="py-3 pr-3 text-pine-soft">{fmt(u.createdAt)}</td>
                      <td className="py-3 pr-3 text-pine-soft">{fmt(u.lastLoginAt)}</td>
                      <td className="py-3">
                        {isMe ? (
                          <span className="text-xs text-pine-soft">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {u.isLocked && (
                              <button onClick={() => ask(u, 'unlock')} className="btn btn-primary px-3 py-1.5 text-xs">Unlock</button>
                            )}
                            <button
                              onClick={() => ask(u, u.isActive ? 'disable' : 'enable')}
                              className={`btn px-3 py-1.5 text-xs ${u.isActive ? 'btn-ghost' : 'btn-primary'}`}
                            >
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => ask(u, u.role === 'admin' ? 'makeUser' : 'makeAdmin')}
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

      <Modal open={Boolean(pending)} title={pending ? `${pending.label}?` : ''} onClose={() => !busy && setPending(null)}>
        {pending && (
          <>
            <p className="text-sm text-pine-soft">{pending.description}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPending(null)} disabled={busy} className="btn btn-ghost">Cancel</button>
              <button
                onClick={confirm}
                disabled={busy}
                className={`btn ${pending.action === 'disable' ? 'btn-danger' : 'btn-primary'}`}
              >
                {busy ? 'Saving…' : pending.label}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
