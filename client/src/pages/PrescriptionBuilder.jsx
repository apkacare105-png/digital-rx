import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { Alert, Button, Card, Field, Input, Textarea } from '../components/ui';
import MedicineAutocomplete from '../components/MedicineAutocomplete';
import PatientForm from '../components/PatientForm';

let keySeq = 0;
const newItem = (o = {}) => ({ key: ++keySeq, medicineId: null, brandName: '', genericName: '', strength: '', dose: '', duration: '', timing: '', ...o });
const TIMINGS = ['After food', 'Before food', 'With food', 'Empty stomach', 'At bedtime', 'As needed (SOS)'];

function PatientPicker({ patient, onChange }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const timer = useRef();

  const search = (v) => {
    setQ(v);
    setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/patients', { params: { q: v, limit: 8 } });
        setResults(data.items);
      } catch { /* ignore */ }
    }, 250);
  };

  if (patient)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-teal-50 px-3 py-2 text-sm">
        <div className="flex-1">
          <b>{patient.name}</b>
          <span className="text-slate-600"> · {[patient.age && `${patient.age} yrs`, patient.gender, patient.phone].filter(Boolean).join(' · ')}</span>
          {patient.allergies && <div className="text-xs font-medium text-red-600">Allergies: {patient.allergies}</div>}
        </div>
        <button type="button" className="text-teal-700 underline" onClick={() => onChange(null)}>Change</button>
      </div>
    );

  if (creating)
    return (
      <div className="neu-inset rounded-xl p-3">
        <PatientForm compact onSaved={(p) => { setCreating(false); onChange(p); }} onCancel={() => setCreating(false)} />
      </div>
    );

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input placeholder="Search patient by name or phone" value={q} onChange={(e) => search(e.target.value)} onFocus={() => { setOpen(true); if (!results.length) search(q); }} onBlur={() => setTimeout(() => setOpen(false), 150)} />
        <Button type="button" variant="secondary" onClick={() => setCreating(true)}>+ New</Button>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto neu-raised rounded-xl">
          {results.map((p) => (
            <li key={p._id} onMouseDown={(e) => { e.preventDefault(); onChange(p); setOpen(false); }} className="cursor-pointer px-3 py-2 text-sm hover:bg-teal-50/60">
              <b>{p.name}</b> <span className="text-xs text-slate-500">{[p.age && `${p.age} yrs`, p.phone].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PrescriptionBuilder() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [rxId, setRxId] = useState(id || null);
  const [patient, setPatient] = useState(null);
  const [items, setItems] = useState([newItem()]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));

  // Load existing draft (edit) or preselected patient (?patientId=)
  useEffect(() => {
    (async () => {
      try {
        if (id) {
          const { data } = await api.get(`/prescriptions/${id}`);
          if (data.prescription.status !== 'draft') return nav(`/prescriptions/${id}`, { replace: true });
          setPatient(data.patient);
          setNote(data.prescription.note || '');
          setItems(data.prescription.items.length ? data.prescription.items.map((i) => newItem(i)) : [newItem()]);
        } else if (params.get('patientId')) {
          const { data } = await api.get(`/patients/${params.get('patientId')}`);
          setPatient(data.patient);
        }
      } catch (err) {
        setError(errMsg(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const patchItem = (key, patch) => setItems((arr) => arr.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const save = async (status) => {
    setError('');
    setInfo('');
    if (!patient) return setError('Select or create a patient first');
    const filled = items.filter((i) => i.brandName.trim());
    if (status === 'issued') {
      if (!filled.length) return setError('Add at least one medicine');
      if (!confirm('Issue this prescription? Once issued it is locked and cannot be edited.')) return;
    }
    setBusy(true);
    try {
      const body = {
        patientId: patient._id,
        note,
        status,
        items: filled.map(({ key, ...rest }) => rest),
      };
      const { data } = rxId ? await api.put(`/prescriptions/${rxId}`, body) : await api.post('/prescriptions', body);
      if (status === 'issued') return nav(`/prescriptions/${data.prescription._id}`, { replace: true });
      setRxId(data.prescription._id);
      setInfo('Draft saved');
      if (!rxId) nav(`/prescriptions/${data.prescription._id}/edit`, { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/" className="text-sm text-teal-700">← Prescriptions</Link>
      <h1 className="text-xl font-bold">{rxId ? 'Edit draft' : 'New prescription'}</h1>
      <Alert>{error}</Alert>
      <Alert type="success">{info}</Alert>

      <Card>
        <div className="mb-2 text-sm font-semibold">Patient</div>
        <PatientPicker patient={patient} onChange={setPatient} />
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Medicines</div>
        {items.map((it, idx) => (
          <div key={it.key} className="neu-inset rounded-xl p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>#{idx + 1}{!it.medicineId && it.brandName && <span className="ml-2 rounded bg-amber-100 px-1.5 text-amber-800">custom</span>}</span>
              {items.length > 1 && <button type="button" className="text-red-600" onClick={() => setItems((a) => a.filter((x) => x.key !== it.key))}>Remove</button>}
            </div>
            <div className="grid gap-2 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <MedicineAutocomplete
                  value={it.brandName}
                  onType={(v) => patchItem(it.key, { brandName: v, medicineId: null })}
                  onPick={(m) => patchItem(it.key, { medicineId: m._id, brandName: m.brandName, genericName: m.genericName || '', strength: m.strength || '' })}
                />
                {it.genericName && <div className="mt-0.5 text-xs text-slate-500">{it.genericName}</div>}
              </div>
              <div className="sm:col-span-2"><Input placeholder="Strength" value={it.strength} onChange={(e) => patchItem(it.key, { strength: e.target.value })} /></div>
              <div className="sm:col-span-2"><Input placeholder="Dose e.g. 1-0-1" value={it.dose} onChange={(e) => patchItem(it.key, { dose: e.target.value })} /></div>
              <div className="sm:col-span-2"><Input placeholder="Duration e.g. 5 days" value={it.duration} onChange={(e) => patchItem(it.key, { duration: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <Input list="timings" placeholder="Timing" value={it.timing} onChange={(e) => patchItem(it.key, { timing: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
        <datalist id="timings">{TIMINGS.map((t) => <option key={t} value={t} />)}</datalist>
        <Button type="button" variant="secondary" onClick={() => setItems((a) => [...a, newItem()])}>+ Add medicine</Button>
      </Card>

      <Card className="space-y-3">
        <Field label="Note" hint="Describe the issue, diagnosis or any advice. Free text.">
          <Textarea rows={6} maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={busy} onClick={() => save('draft')}>Save draft</Button>
        <Button disabled={busy} onClick={() => save('issued')}>Issue prescription</Button>
      </div>
    </div>
  );
}
