import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const link = ({ isActive }) =>
  `rounded-xl px-3 py-1.5 text-sm font-medium transition ${isActive ? 'neu-inset text-teal-700' : 'text-slate-600 hover:neu-raised-sm'}`;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="neu-raised mb-2 rounded-b-3xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-3 text-lg font-bold text-slate-800">Digital Rx <span className="text-xs font-medium text-teal-700">ADMIN</span></span>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/admin" end className={link}>Dashboard</NavLink>
            <NavLink to="/admin/doctors" className={link}>Doctors</NavLink>
            <NavLink to="/admin/medicines" className={link}>Medicines</NavLink>
            <NavLink to="/admin/support" className={link}>Support</NavLink>
            <NavLink to="/admin/audit" className={link}>Audit log</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{user?.name}</span>
            <button className="rounded-xl px-3 py-1.5 transition hover:neu-raised-sm" onClick={async () => { await logout(); nav('/login'); }}>Log out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
