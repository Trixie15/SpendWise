import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeftRight, CheckCircle2, PiggyBank, Plus } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { currentMonth, formatMoney, monthLabel } from '../utils/format';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import TransactionRow from '../components/TransactionRow';
import EmptyState from '../components/EmptyState';

const compact = (n) =>
  new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export default function Dashboard() {
  const { user } = useAuth();
  const currency = user?.currency || 'PHP';
  const month = currentMonth();

  const [data, setData] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const [summary, byCategory, trend, budgets] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/by-category', { params: { month } }),
        api.get('/dashboard/monthly-trend', { params: { months: 6 } }),
        api.get('/budgets', { params: { month } }),
      ]);
      setData({
        summary: summary.data,
        byCategory: byCategory.data,
        trend: trend.data,
        budgets: budgets.data,
      });
    } catch (err) {
      toast.error(getError(err));
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <Spinner />;

  const { summary, byCategory, trend, budgets } = data;
  const monthSpentTotal = byCategory.reduce((sum, c) => sum + c.total, 0);
  const spentRatio = summary.monthIncome > 0 ? summary.monthExpense / summary.monthIncome : summary.monthExpense > 0 ? 1 : 0;
  const alerts = budgets.filter((b) => b.status !== 'ok');
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hi, {firstName}</h1>
          <p className="text-pine-soft">Here's your money for {monthLabel(month)}.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" /> Add transaction
        </button>
      </div>

      {/* Balance hero */}
      <section className="rounded-3xl bg-pine p-6 text-white md:p-8">
        <p className="text-sm text-white/70">Current balance</p>
        <p
          className={`mt-1 font-display text-5xl font-extrabold tracking-tight tabular-nums md:text-6xl ${
            summary.balance < 0 ? 'text-rose-300' : ''
          }`}
        >
          {formatMoney(summary.balance, currency)}
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-white/70">Earned this month</p>
            <p className="font-display text-2xl font-bold tabular-nums">{formatMoney(summary.monthIncome, currency)}</p>
          </div>
          <div>
            <p className="text-sm text-white/70">Spent this month</p>
            <p className="font-display text-2xl font-bold tabular-nums">{formatMoney(summary.monthExpense, currency)}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full ${spentRatio > 1 ? 'bg-rose-400' : 'bg-marigold'}`}
              style={{ width: `${Math.min(spentRatio * 100, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-white/70">
            {summary.monthIncome > 0
              ? `You've spent ${Math.round(spentRatio * 100)}% of what you earned this month.`
              : 'Add your income to see how much of it you are spending.'}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Spending by category */}
        <section className="panel lg:col-span-2">
          <h2 className="text-lg font-bold">Where it went</h2>
          <p className="text-sm text-pine-soft">Spending by category this month</p>
          {byCategory.length === 0 ? (
            <EmptyState title="No spending yet" text="Expenses you add this month will show up here." />
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {byCategory.map((c) => (
                        <Cell key={c.categoryId} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatMoney(v, currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {byCategory.map((c) => (
                  <li key={c.categoryId} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="flex-1 truncate">{c.icon} {c.name}</span>
                    <span className="text-pine-soft tabular-nums">
                      {Math.round((c.total / monthSpentTotal) * 100)}%
                    </span>
                    <span className="w-24 text-right font-semibold tabular-nums">{formatMoney(c.total, currency)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Monthly trend */}
        <section className="panel lg:col-span-3">
          <h2 className="text-lg font-bold">Last 6 months</h2>
          <p className="text-sm text-pine-soft">Money in vs money out</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} barGap={4}>
                <CartesianGrid vertical={false} stroke="#dde5e1" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#52665f', fontSize: 12 }} />
                <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={44} tick={{ fill: '#52665f', fontSize: 12 }} />
                <Tooltip formatter={(v) => formatMoney(v, currency)} cursor={{ fill: '#f3f6f4' }} />
                <Bar dataKey="income" name="Income" fill="#0e7c66" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#be123c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-5 text-sm text-pine-soft">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-jade" /> Income</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-rose" /> Expenses</span>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent transactions */}
        <section className="panel lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent transactions</h2>
            <Link to="/transactions" className="text-sm font-semibold text-jade hover:underline">View all</Link>
          </div>
          {summary.recentTransactions.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="Nothing logged yet"
              text="Add your first expense or income to get started."
              action={<button onClick={() => setShowAdd(true)} className="btn btn-primary">Add transaction</button>}
            />
          ) : (
            <ul className="divide-y divide-line">
              {summary.recentTransactions.map((tx) => (
                <TransactionRow key={tx._id} tx={tx} currency={currency} />
              ))}
            </ul>
          )}
        </section>

        {/* Budget alerts */}
        <section className="panel lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Budgets</h2>
            <Link to="/budgets" className="text-sm font-semibold text-jade hover:underline">Manage</Link>
          </div>
          {budgets.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No budgets set"
              text="Set a monthly limit for a category and we'll warn you before you go over."
            />
          ) : alerts.length === 0 ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-jade-soft p-4 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-jade" />
              <p>All {budgets.length} budgets are on track this month.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {alerts.map((b) => (
                <li
                  key={b._id}
                  className={`flex items-start gap-3 rounded-xl p-4 text-sm ${
                    b.status === 'over' ? 'bg-rose-soft' : 'bg-marigold-soft'
                  }`}
                >
                  <AlertTriangle className={`h-5 w-5 shrink-0 ${b.status === 'over' ? 'text-rose' : 'text-amber-600'}`} />
                  <p>
                    <span className="font-semibold">{b.category.icon} {b.category.name}</span>{' '}
                    {b.status === 'over'
                      ? `is over budget by ${formatMoney(-b.remaining, currency)}.`
                      : `is at ${b.percentage}%. ${formatMoney(b.remaining, currency)} left.`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal open={showAdd} title="Add transaction" onClose={() => setShowAdd(false)}>
        <TransactionForm
          onCancel={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}
