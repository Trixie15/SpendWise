import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, LayoutDashboard, LogOut, PiggyBank, Settings, ShieldCheck, Tags } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // The Admin link only appears for admins (the server also blocks non-admins)
  const navLinks =
    user?.role === 'admin' ? [...links, { to: '/admin', label: 'Admin', icon: ShieldCheck }] : links;

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-pine text-white' : 'text-pine-soft hover:bg-canvas hover:text-pine'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line pt-4">
          <p className="truncate px-3 text-sm font-semibold">{user?.name}</p>
          <p className="truncate px-3 text-xs text-pine-soft">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-pine-soft hover:bg-rose-soft hover:text-rose"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <button onClick={handleLogout} className="rounded-lg p-2 text-pine-soft hover:bg-canvas" aria-label="Log out">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white md:hidden"
        style={{ gridTemplateColumns: `repeat(${navLinks.length}, minmax(0, 1fr))` }}
      >
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-jade' : 'text-pine-soft'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
