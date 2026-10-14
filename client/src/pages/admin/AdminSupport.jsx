import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { Alert, Button, Card, Select, StatusBadge, fmtDateTime } from '../../components/ui';
import Pagination from '../../components/Pagination';

const TYPE_LABEL = {
  login: 'Login or account',
  prescription: 'Prescription',
  medicine: 'Medicine',
  whatsapp: 'Sharing a prescription (PDF)',
  other: 'Other',
};

export default function AdminSupport() {
  const [data, setData] = useState({ items: [], pages: 1, total: 0, open: 0 });
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/admin/support', { params: { status, page, limit: 20 } });
      setData(data);
      setError('');
    } catch (err) {
      setError(errMsg(err));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, page]);

  const setReqStatus = async (r, next) => {
    try {
      await api.put(`/admin/support/${r._id}`, { status: next });
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Support requests</h1>
        <span className="text-sm text-slate-500">{data.open} open</span>
        <div className="ml-auto w-40">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="open">Open</option><option value="resolved">Resolved</option><option value="">All</option>
          </Select>
        </div>
      </div>
      <Alert>{error}</Alert>
      <div className="space-y-3">
        {data.items.map((r) => (
          <Card key={r._id} className="!p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={r.status === 'open' ? 'draft' : 'dispensed'} label={r.status} />
              <span className="text-sm font-medium">{TYPE_LABEL[r.type] || r.type}</span>
              <span className="ml-auto text-xs text-slate-500">{fmtDateTime(r.createdAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{r.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>Dr. {r.doctorName}</span>
              {r.doctorPhone && <a className="text-teal-700 underline" href={`tel:${r.doctorPhone}`}>{r.doctorPhone}</a>}
              {r.doctorPhone && (
                <a className="text-teal-700 underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${String(r.doctorPhone).replace(/\D/g, '')}`}>WhatsApp</a>
              )}
              {r.doctorEmail && <a className="text-teal-700 underline" href={`mailto:${r.doctorEmail}`}>{r.doctorEmail}</a>}
              {r.page && <span className="text-slate-400">Page: {r.page}</span>}
              <span className="ml-auto">
                {r.status === 'open'
                  ? <Button variant="secondary" onClick={() => setReqStatus(r, 'resolved')}>Mark resolved</Button>
                  : <Button variant="ghost" onClick={() => setReqStatus(r, 'open')}>Reopen</Button>}
              </span>
            </div>
          </Card>
        ))}
        {!data.items.length && !error && <p className="py-10 text-center text-slate-500">No requests here.</p>}
      </div>
      <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />
    </div>
  );
}
