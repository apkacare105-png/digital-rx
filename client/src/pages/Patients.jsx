import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { Alert, Button, Card, Input } from '../components/ui';
import PatientForm from '../components/PatientForm';

export default function Patients() {
  const [data, setData] = useState({ items: [], pages: 1 });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/patients', { params: { q, page } });
        setData(data);
        setError('');
      } catch (err) {
        setError(errMsg(err));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, page, tick]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="mr-auto text-xl font-bold">Patients</h1>
        <Button onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ Add patient'}</Button>
      </div>
      {adding && (
        <Card>
          <PatientForm onSaved={() => { setAdding(false); setTick((t) => t + 1); }} onCancel={() => setAdding(false)} />
        </Card>
      )}
      <Input placeholder="Search by name or phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <Alert>{error}</Alert>
      {data.items.map((p) => (
        <Link key={p._id} to={`/patients/${p._id}`}>
          <Card className="mb-2 flex items-center gap-4 !p-3 hover:border-teal-300">
            <div className="flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500">{[p.age && `${p.age} yrs`, p.gender, p.phone].filter(Boolean).join(' · ')}</div>
            </div>
            {p.allergies && <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">Allergies</span>}
          </Card>
        </Link>
      ))}
      {!data.items.length && !error && <p className="py-10 text-center text-slate-500">No patients yet.</p>}
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
          <span>Page {page} of {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
