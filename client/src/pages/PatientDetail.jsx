import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { Alert, Button, Card, StatusBadge, fmtDate } from '../components/ui';
import PatientForm from '../components/PatientForm';

export default function PatientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api.get(`/patients/${id}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [id]);

  const remove = async () => {
    if (!confirm('Delete this patient?')) return;
    try {
      await api.delete(`/patients/${id}`);
      nav('/patients');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  if (!data) return <Alert>{error}</Alert> || null;
  const { patient: p, prescriptions } = data;

  return (
    <div className="space-y-4">
      <Link to="/patients" className="text-sm text-teal-700">← Patients</Link>
      <Alert>{error}</Alert>
      <Card>
        {editing ? (
          <PatientForm patient={p} onSaved={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} />
        ) : (
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 space-y-1 text-sm">
              <div className="text-lg font-bold">{p.name}</div>
              <div className="text-slate-600">{[p.age && `${p.age} yrs`, p.gender, p.phone].filter(Boolean).join(' · ')}</div>
              {p.allergies && <div><b className="text-red-600">Allergies:</b> {p.allergies}</div>}
              {p.chronicConditions && <div><b>Chronic conditions:</b> {p.chronicConditions}</div>}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="ghost" onClick={remove}>Delete</Button>
              <Link to={`/prescriptions/new?patientId=${p._id}`} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white">New Rx</Link>
            </div>
          </div>
        )}
      </Card>
      <h2 className="font-semibold">Prescription history</h2>
      {prescriptions.map((rx) => (
        <Link key={rx._id} to={rx.status === 'draft' ? `/prescriptions/${rx._id}/edit` : `/prescriptions/${rx._id}`}>
          <Card className="mb-2 flex flex-wrap items-center gap-4 !p-3 hover:border-teal-300">
            <div className="min-w-40 flex-1">
              <div className="text-sm font-medium">{rx.note || rx.diagnosis || 'No note'}</div>
              <div className="truncate text-xs text-slate-500">{rx.items.map((i) => i.brandName).join(', ')}</div>
            </div>
            <span className="text-xs text-slate-500">{rx.rxNo}</span>
            <span className="text-xs text-slate-500">{fmtDate(rx.issuedAt || rx.createdAt)}</span>
            <StatusBadge status={rx.status} />
          </Card>
        </Link>
      ))}
      {!prescriptions.length && <p className="text-sm text-slate-500">No prescriptions yet.</p>}
    </div>
  );
}
