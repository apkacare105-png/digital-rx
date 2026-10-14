import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const link = ({ isActive }) =>
  `rounded-xl px-3 py-1.5 text-sm font-medium transition ${isActive ? 'neu-inset text-teal-700' : 'text-slate-600 hover:neu-raised-sm'}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <div className="min-h-screen">
      <header className="no-print neu-raised mb-2 rounded-b-3xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-3 text-lg font-bold text-teal-700">Digital Rx</span>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" end className={link}>Prescriptions</NavLink>
            <NavLink to="/patients" className={link}>Patients</NavLink>
            <NavLink to="/prescriptions/new" className={link}>+ New Rx</NavLink>
            <NavLink to="/profile" className={link}>Profile</NavLink>
            <NavLink to="/help" state={{ from: loc.pathname }} className={link}>Help</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">Dr. {user?.name}</span>
            <button
              className="rounded-xl px-3 py-1.5 text-slate-600 transition hover:neu-raised-sm"
              onClick={async () => {
                await logout();
                nav('/login');
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
