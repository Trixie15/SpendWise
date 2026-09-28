import Logo from './Logo';

// Shared two-column layout for the login and register pages
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-pine p-12 text-white lg:flex">
        <Logo light />
        <div>
          <p className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
            Know where every peso goes.
          </p>
          <p className="mt-5 max-w-md text-lg text-white/70">
            Log your spending in seconds, set monthly budgets, and see your habits laid out
            in simple charts.
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-marigold" />
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-pine-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
