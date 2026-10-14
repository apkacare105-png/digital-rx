import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { Alert, Card, Input, Select, fmtDateTime } from '../../components/ui';
import Pagination from '../../components/Pagination';

const metaText = (m) =>
  m ? Object.entries(m).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}: ${v}`).join(' · ') : '';

export default function AdminAudit() {
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [actorRole, setRole] = useState('admin');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/admin/audit', { params: { actorRole, action, page, limit: 30 } });
        setData(data);
        setError('');
      } catch (err) {
        setError(errMsg(err));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [actorRole, action, page]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Audit log</h1>
      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={actorRole} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="admin">Admin actions</option><option value="doctor">Doctor actions</option>
            <option value="pharmacy">Pharmacy actions</option><option value="all">Everything</option>
          </Select>
        </div>
        <div className="min-w-48 flex-1"><Input placeholder="Filter by action, e.g. medicine or user.disable" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} /></div>
      </div>
      <Alert>{error}</Alert>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-slate-300/60 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">When</th><th>Who</th><th>Action</th><th>Details</th></tr>
          </thead>
          <tbody>
            {data.items.map((a) => (
              <tr key={a._id} className="border-b border-slate-100 align-top">
                <td className="whitespace-nowrap p-3 text-xs text-slate-500">{fmtDateTime(a.timestamp)}</td>
                <td className="text-xs">{a.actorId?.name || a.actorRole}<div className="text-slate-400">{a.actorRole}</div></td>
                <td className="font-mono text-xs">{a.action}</td>
                <td className="text-xs text-slate-600">{a.entityType}{metaText(a.meta) ? ` — ${metaText(a.meta)}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && !error && <p className="py-10 text-center text-slate-500">Nothing logged yet.</p>}
      </Card>
      <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />
    </div>
  );
}
