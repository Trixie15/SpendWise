export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine">
        <span className="h-4 w-4 rounded-full border-[3px] border-marigold" />
      </span>
      <span className={`font-display text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-pine'}`}>
        SpendWise
      </span>
    </div>
  );
}
