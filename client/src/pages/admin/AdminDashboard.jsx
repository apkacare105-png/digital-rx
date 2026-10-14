import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { Alert, Card } from '../../components/ui';

const Stat = ({ label, value, to, tone = '' }) => {
  const body = (
    <Card className={`!p-4 ${to ? 'hover:border-teal-300' : ''}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${tone}`}>{value ?? '—'}</div>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setD(r.data)).catch((e) => setError(errMsg(e)));
  }, []);
  if (!d) return <Alert>{error}</Alert>;
  const max = Math.max(1, ...d.topMedicines.map((m) => m.count));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total doctors" value={d.doctors.total} to="/admin/doctors" />
        <Stat label="Prescriptions issued" value={d.prescriptions.issued} />
        <Stat label="Active doctors" value={d.doctors.active} />
        <Stat label="Disabled doctors" value={d.doctors.disabled} />
        <Stat label="Open support requests" value={d.openSupport} to="/admin/support" tone={d.openSupport ? 'text-amber-600' : ''} />
        <Stat label="Medicines in list" value={d.medicines.active} to="/admin/medicines" />
        <Stat label="Unverified medicines" value={d.medicines.unverified} to="/admin/medicines?tab=unverified" tone={d.medicines.unverified ? 'text-amber-600' : ''} />
      </div>
      <Card>
        <div className="mb-3 font-semibold">Most prescribed medicines</div>
        {d.topMedicines.length === 0 && <p className="text-sm text-slate-500">No issued prescriptions yet.</p>}
        <div className="space-y-2">
          {d.topMedicines.map((m) => (
            <div key={m.name} className="flex items-center gap-3 text-sm">
              <div className="w-40 shrink-0 truncate sm:w-56">{m.name}</div>
              <div className="h-3 flex-1 rounded-full neu-inset"><div className="h-3 rounded-full bg-teal-500" style={{ width: `${(m.count / max) * 100}%` }} /></div>
              <div className="w-10 text-right text-slate-600">{m.count}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
