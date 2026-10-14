import { useState } from 'react';
import api, { errMsg } from '../api/client';
import { Alert, Button, Field, Input, Select, Textarea } from './ui';

/** Create or edit a patient. Used on the Patients page and inline in the prescription builder. */
export default function PatientForm({ patient, compact = false, onSaved, onCancel }) {
  const [f, setF] = useState({
    name: patient?.name || '', age: patient?.age ?? '', gender: patient?.gender || '', phone: patient?.phone || '',
    allergies: patient?.allergies || '', chronicConditions: patient?.chronicConditions || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setError('');
    try {
      // omit empty optional fields; server validates the rest
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null));
      const { data } = patient ? await api.put(`/patients/${patient._id}`, body) : await api.post('/patients', body);
      onSaved(data.patient);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Alert>{error}</Alert>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2"><Field label="Name"><Input value={f.name} onChange={set('name')} required /></Field></div>
        <Field label="Age"><Input type="number" min="0" max="130" value={f.age} onChange={set('age')} /></Field>
        <Field label="Gender">
          <Select value={f.gender} onChange={set('gender')}>
            <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </Select>
        </Field>
      </div>
      <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Allergies"><Textarea rows={2} value={f.allergies} onChange={set('allergies')} /></Field>
          <Field label="Chronic conditions"><Textarea rows={2} value={f.chronicConditions} onChange={set('chronicConditions')} /></Field>
        </div>
      )}
      <div className="flex gap-2">
        <Button disabled={busy}>{patient ? 'Save changes' : 'Add patient'}</Button>
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
