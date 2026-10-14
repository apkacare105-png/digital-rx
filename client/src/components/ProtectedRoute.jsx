import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  return <Outlet />;
}
