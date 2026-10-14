import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { Alert, Card, Input, Select, StatusBadge, fmtDate } from '../components/ui';

export default function PrescriptionList() {
  const [data, setData] = useState({ items: [], pages: 1 });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/prescriptions', { params: { q, status, page } });
        setData(data);
        setError('');
      } catch (err) {
        setError(errMsg(err));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, status, page]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-bold">Prescriptions</h1>
        <Link to="/prescriptions/new" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">+ New prescription</Link>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1"><Input placeholder="Search patient or Rx no." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        <div className="w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {['draft', 'issued', 'dispensed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <Alert>{error}</Alert>
      <div className="space-y-2">
        {data.items.map((rx) => (
          <Link key={rx._id} to={rx.status === 'draft' ? `/prescriptions/${rx._id}/edit` : `/prescriptions/${rx._id}`}>
            <Card className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 !p-3 hover:border-teal-300">
              <div className="min-w-40 flex-1">
                <div className="font-medium">{rx.patientId?.name || 'Unknown patient'}</div>
                <div className="truncate text-xs text-slate-500">
                  {rx.note || rx.diagnosis || rx.items.map((i) => i.brandName).join(', ') || 'No medicines yet'}
                </div>
              </div>
              <div className="text-xs text-slate-500">{rx.rxNo}</div>
              <div className="text-xs text-slate-500">{fmtDate(rx.issuedAt || rx.createdAt)}</div>
              <StatusBadge status={rx.status} />
            </Card>
          </Link>
        ))}
        {!data.items.length && !error && <p className="py-10 text-center text-slate-500">No prescriptions found.</p>}
      </div>
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
