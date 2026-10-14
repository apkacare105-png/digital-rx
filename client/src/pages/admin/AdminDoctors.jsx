import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { Alert, Button, Card, Field, Input, Select, StatusBadge, Textarea, fmtDate } from '../../components/ui';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

function DoctorForm({ doctor, onSaved, onCancel }) {
  const [f, setF] = useState({
    name: doctor?.name || '', email: doctor?.email || '', phone: doctor?.phone || '', password: '',
    clinicName: doctor?.clinicName || '', registrationNo: doctor?.registrationNo || '', qualification: doctor?.qualification || '',
    clinicPhone: doctor?.clinicPhone || '', clinicAddress: doctor?.clinicAddress || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...f };
      if (doctor) delete body.email; // email is the login identity; not editable here
      Object.keys(body).forEach((k) => body[k] === '' && k !== 'phone' && delete body[k]);
      const { data } = doctor ? await api.put(`/admin/users/${doctor._id}`, body) : await api.post('/admin/users', body);
      onSaved(data.user);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Alert>{error}</Alert>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><Input value={f.name} onChange={set('name')} required /></Field>
        <Field label="Email">{doctor ? <Input value={f.email} disabled /> : <Input type="email" value={f.email} onChange={set('email')} required />}</Field>
        <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
        <Field label={doctor ? 'New password (optional)' : 'Password'} hint="8+ characters with a letter and a number">
          <Input type="text" value={f.password} onChange={set('password')} required={!doctor} autoComplete="off" />
        </Field>
        <Field label="Clinic name"><Input value={f.clinicName} onChange={set('clinicName')} /></Field>
        <Field label="Clinic phone"><Input value={f.clinicPhone} onChange={set('clinicPhone')} /></Field>
        <Field label="Registration no."><Input value={f.registrationNo} onChange={set('registrationNo')} /></Field>
        <Field label="Qualification"><Input value={f.qualification} onChange={set('qualification')} /></Field>
      </div>
      <Field label="Clinic address"><Textarea rows={2} value={f.clinicAddress} onChange={set('clinicAddress')} /></Field>
      <div className="flex gap-2">
        <Button disabled={busy}>{doctor ? 'Save changes' : 'Add doctor'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function AdminDoctors() {
  const [params] = useSearchParams();
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // 'add' | doctor object
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/admin/users', { params: { q, status, page } });
        setData(data);
        setError('');
      } catch (err) {
        setError(errMsg(err));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, status, page, tick]);

  const setDoctorStatus = async (d, next, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    try {
      await api.put(`/admin/users/${d._id}`, { status: next });
      reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-bold">Doctors</h1>
        <Button onClick={() => setModal('add')}>+ Add doctor</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1"><Input placeholder="Search name, email, clinic or phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        <div className="w-44">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="active">Active</option><option value="disabled">Disabled</option>
          </Select>
        </div>
      </div>
      <Alert>{error}</Alert>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-300/60 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Doctor</th><th>Clinic</th><th>Reg. no.</th><th>Joined</th><th>Status</th><th className="pr-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {data.items.map((d) => (
              <tr key={d._id} className="border-b border-slate-100">
                <td className="p-3"><div className="font-medium">{d.name}</div><div className="text-xs text-slate-500">{d.email}{d.phone ? ` · ${d.phone}` : ''}</div></td>
                <td>{d.clinicName || '—'}</td>
                <td>{d.registrationNo || '—'}</td>
                <td className="text-xs text-slate-500">{fmtDate(d.createdAt)}</td>
                <td><StatusBadge status={d.status === 'active' ? 'issued' : d.status === 'disabled' ? 'cancelled' : 'draft'} label={d.status} /></td>
                <td className="whitespace-nowrap pr-3 text-right">
                  <Button variant="ghost" onClick={() => setModal(d)}>Edit</Button>
                  {d.status === 'disabled'
                    ? <Button variant="ghost" onClick={() => setDoctorStatus(d, 'active')}>Enable</Button>
                    : <Button variant="ghost" onClick={() => setDoctorStatus(d, 'disabled', `Disable ${d.name}? They will be logged out and cannot sign in. Their prescriptions are kept.`)}>Disable</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && !error && <p className="py-10 text-center text-slate-500">No doctors found.</p>}
      </Card>
      <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />
      {modal && (
        <Modal title={modal === 'add' ? 'Add doctor' : `Edit ${modal.name}`} onClose={() => setModal(null)} wide>
          <DoctorForm doctor={modal === 'add' ? null : modal} onCancel={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />
        </Modal>
      )}
    </div>
  );
}
