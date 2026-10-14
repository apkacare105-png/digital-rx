import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Alert, Button, Field, Input } from '../components/ui';
import api, { errMsg } from '../api/client';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMsg(data.message);
    } catch (err) {
      setError(errMsg(err));
    }
  };
  return (
    <AuthShell title="Reset your password" footer={<Link className="text-teal-700 underline" to="/login">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Alert type="success">{msg}</Alert>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Button className="w-full">Send reset link</Button>
      </form>
    </AuthShell>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      nav('/login');
    } catch (err) {
      setError(errMsg(err));
    }
  };
  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Field label="New password" hint="8+ characters with a letter and a number"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <Button className="w-full">Update password</Button>
      </form>
    </AuthShell>
  );
}
