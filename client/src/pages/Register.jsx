import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Alert, Button, Field, Input } from '../components/ui';
import api, { errMsg, setToken } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { setUser } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim() !== ''));
      const { data } = await api.post('/auth/register', body);
      setToken(data.accessToken);
      setUser(data.user);
      nav('/patients');
    } catch (err) {
      setError(errMsg(err, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create doctor account" footer={<>Have an account? <Link className="text-teal-700 underline" to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-3">
        <Alert>{error}</Alert>
        <Field label="Full name"><Input value={f.name} onChange={set('name')} required /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={set('email')} required /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set('phone')} placeholder="+91…" required /></Field>
        <Field label="Password" hint="8+ characters with a letter and a number"><Input type="password" value={f.password} onChange={set('password')} required /></Field>
        <Button className="w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button>
      </form>
    </AuthShell>
  );
}
