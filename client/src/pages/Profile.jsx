import { useState } from 'react';
import { Alert, Button, Card, Field, Input, Textarea } from '../components/ui';
import api, { assetUrl, errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';

const FIELDS = ['name', 'phone', 'clinicName', 'registrationNo', 'qualification', 'clinicAddress', 'clinicPhone'];

function ImageUpload({ label, field, url, onDone, setError }) {
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append(field, file);
      const { data } = await api.post(`/doctors/me/${field}`, fd);
      onDone(data.user);
    } catch (err) {
      setError(errMsg(err, 'Upload failed'));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };
  return (
    <div>
      <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
      <div className="flex h-24 items-center justify-center neu-inset rounded-xl">
        {url ? <img src={assetUrl(url)} alt={label} className="max-h-20 object-contain" /> : <span className="text-xs text-slate-400">None</span>}
      </div>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={busy} className="mt-2 block w-full text-xs" />
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState(() => Object.fromEntries(FIELDS.map((k) => [k, user[k] || ''])));
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      const { data } = await api.put('/doctors/me', f);
      setUser(data.user);
      setMsg('Profile saved');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Clinic profile</h1>
      <p className="text-sm text-slate-500">These details appear on every prescription you issue.</p>
      <Card>
        <form onSubmit={save} className="space-y-4">
          <Alert>{error}</Alert>
          <Alert type="success">{msg}</Alert>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input value={f.name} onChange={set('name')} required /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Clinic name"><Input value={f.clinicName} onChange={set('clinicName')} /></Field>
            <Field label="Clinic phone"><Input value={f.clinicPhone} onChange={set('clinicPhone')} /></Field>
            <Field label="Registration no."><Input value={f.registrationNo} onChange={set('registrationNo')} /></Field>
            <Field label="Qualification"><Input value={f.qualification} onChange={set('qualification')} /></Field>
          </div>
          <Field label="Clinic address"><Textarea value={f.clinicAddress} onChange={set('clinicAddress')} /></Field>
          <Button>Save profile</Button>
        </form>
      </Card>
      <Card>
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageUpload label="Clinic logo" field="logo" url={user.logoUrl} onDone={setUser} setError={setError} />
          <ImageUpload label="Signature" field="signature" url={user.signatureUrl} onDone={setUser} setError={setError} />
        </div>
        <p className="mt-3 text-xs text-slate-500">PNG, JPG or WEBP, up to 2 MB. A transparent PNG works best for the signature.</p>
      </Card>
    </div>
  );
}
