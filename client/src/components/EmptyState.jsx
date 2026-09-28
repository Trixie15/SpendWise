export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      {Icon && (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-jade-soft text-jade">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="font-display text-lg font-bold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-pine-soft">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
