import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Alert, Button, Field, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(identifier.trim(), password);
      nav(u.role === 'admin' ? '/admin' : loc.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      footer={<>New doctor? <Link className="text-teal-700 underline" to="/register">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Field label="Email or phone"><Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus /></Field>
        <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <Button className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        <div className="text-right text-sm"><Link className="text-teal-700" to="/forgot-password">Forgot password?</Link></div>
      </form>
    </AuthShell>
  );
}
