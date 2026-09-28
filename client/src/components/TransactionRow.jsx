import { Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatMoney, paymentLabel } from '../utils/format';

export default function TransactionRow({ tx, currency, onEdit, onDelete }) {
  const isIncome = tx.type === 'income';
  const color = tx.category?.color || '#64748b';

  return (
    <li className="group flex items-center gap-3 py-3">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
        style={{ backgroundColor: `${color}22` }}
        aria-hidden="true"
      >
        {tx.category?.icon || '💰'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{tx.note || tx.category?.name || 'Transaction'}</p>
        <p className="truncate text-xs text-pine-soft">
          {tx.note ? `${tx.category?.name} · ` : ''}
          {formatDate(tx.date)} · {paymentLabel(tx.paymentMethod)}
        </p>
      </div>

      <p className={`shrink-0 text-sm font-bold tabular-nums ${isIncome ? 'text-jade' : 'text-rose'}`}>
        {isIncome ? '+' : '−'}
        {formatMoney(tx.amount, currency)}
      </p>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0 gap-0.5">
          {onEdit && (
            <button
              onClick={() => onEdit(tx)}
              className="rounded-lg p-2 text-pine-soft hover:bg-canvas hover:text-pine"
              aria-label="Edit transaction"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(tx)}
              className="rounded-lg p-2 text-pine-soft hover:bg-rose-soft hover:text-rose"
              aria-label="Delete transaction"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
