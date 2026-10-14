import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { Alert, Button, Card, Field, Input, Select } from '../../components/ui';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

const TEMPLATE =
  'brandName,genericName,genericNameHindi,strength,form,manufacturer,schedule\n' +
  'DOLO 650MG,Paracetamol,,650 mg,Tablet,Micro Labs,\n';

function MedicineForm({ medicine, onSaved, onCancel }) {
  const [f, setF] = useState({
    brandName: medicine?.brandName || '', genericName: medicine?.genericName || '', genericNameHindi: medicine?.genericNameHindi || '',
    strength: medicine?.strength || '', form: medicine?.form || '', manufacturer: medicine?.manufacturer || '', schedule: medicine?.schedule || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = medicine ? await api.put(`/admin/medicines/${medicine._id}`, f) : await api.post('/admin/medicines', f);
      onSaved(data.medicine);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Alert>{error}</Alert>
      {medicine && !medicine.isVerified && <Alert type="warn">Saving marks this medicine as verified.</Alert>}
      <Field label="Brand name"><Input value={f.brandName} onChange={set('brandName')} required autoFocus /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Generic name"><Input value={f.genericName} onChange={set('genericName')} /></Field>
        <Field label="Generic name (Hindi)"><Input value={f.genericNameHindi} onChange={set('genericNameHindi')} /></Field>
        <Field label="Strength"><Input value={f.strength} onChange={set('strength')} placeholder="500 mg" /></Field>
        <Field label="Form"><Input value={f.form} onChange={set('form')} placeholder="Tablet, Syrup…" /></Field>
        <Field label="Manufacturer"><Input value={f.manufacturer} onChange={set('manufacturer')} /></Field>
        <Field label="Schedule">
          <Select value={f.schedule} onChange={set('schedule')}>
            <option value="">None</option><option value="H">H</option><option value="H1">H1</option><option value="OTC">OTC</option>
          </Select>
        </Field>
      </div>
      <div className="flex gap-2">
        <Button disabled={busy}>{medicine ? 'Save changes' : 'Add medicine'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function ImportPanel({ onDone }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef();

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/admin/medicines/bulk-import', fd);
      setResult(data);
      onDone();
    } catch (err) {
      setError(errMsg(err, 'Import failed'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const template = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'medicines-template.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="space-y-3">
      <div className="font-semibold">Bulk import from CSV</div>
      <p className="text-sm text-slate-600">
        The file needs a <b>brandName</b> column; optional: genericName, genericNameHindi, strength, form, manufacturer, schedule (H, H1 or OTC).
        Medicines that already exist are skipped, never duplicated.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept=".csv" onChange={upload} disabled={busy} className="text-sm" />
        <button type="button" className="text-sm text-teal-700 underline" onClick={template}>Download template</button>
        {busy && <span className="text-sm text-slate-500">Importing…</span>}
      </div>
      <Alert>{error}</Alert>
      {result && (
        <div className="space-y-1 rounded-lg bg-green-50 p-3 text-sm">
          <div><b>{result.created}</b> added · <b>{result.existing}</b> already present · <b>{result.failed.length}</b> failed (of {result.total} rows)</div>
          {result.failed.map((r) => <div key={r.row} className="text-xs text-red-700">Row {r.row} {r.brandName ? `(${r.brandName})` : ''}: {r.error}</div>)}
        </div>
      )}
    </Card>
  );
}

const TABS = {
  active: { label: 'Active', params: { active: 'true' } },
  unverified: { label: 'Unverified', params: { active: 'true', verified: 'false' } },
  removed: { label: 'Removed', params: { active: 'false' } },
};

export default function AdminMedicines() {
  const [sp] = useSearchParams();
  const [tab, setTab] = useState(TABS[sp.get('tab')] ? sp.get('tab') : 'active');
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // 'add' | medicine
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/admin/medicines', { params: { q, page, limit: 25, ...TABS[tab].params } });
        setData(data);
        setError('');
      } catch (err) {
        setError(errMsg(err));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, page, tab, tick]);

  const act = async (fn, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    try {
      await fn();
      reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-bold">Medicines</h1>
        <Button variant="secondary" onClick={() => setShowImport(!showImport)}>{showImport ? 'Hide import' : 'Import CSV'}</Button>
        <Button onClick={() => setModal('add')}>+ Add medicine</Button>
      </div>
      {showImport && <ImportPanel onDone={reload} />}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex neu-inset rounded-xl p-1 text-sm">
          {Object.entries(TABS).map(([key, t]) => (
            <button key={key} onClick={() => { setTab(key); setPage(1); }} className={`rounded-lg px-3 py-1 ${tab === key ? 'neu-raised-sm font-medium text-teal-700' : 'text-slate-600'}`}>{t.label}</button>
          ))}
        </div>
        <div className="min-w-48 flex-1"><Input placeholder="Search brand, generic or manufacturer" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      </div>
      {tab === 'unverified' && <Alert type="warn">These were added by doctors while prescribing. Doctors can already see them. Edit to fix spelling (this verifies it), approve as-is, or remove.</Alert>}
      <Alert>{error}</Alert>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-slate-300/60 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Brand</th><th>Generic</th><th>Strength</th><th>Form</th><th>Manufacturer</th><th>Sch.</th><th>Source</th><th className="pr-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m._id} className="border-b border-slate-100 align-top">
                <td className="p-3 font-medium">{m.brandName}{!m.isVerified && <span className="ml-2 rounded bg-amber-100 px-1.5 text-[10px] text-amber-800">unverified</span>}</td>
                <td className="max-w-56 text-xs text-slate-600">{m.genericName || '—'}</td>
                <td>{m.strength || '—'}</td><td>{m.form || '—'}</td><td>{m.manufacturer || '—'}</td><td>{m.schedule || '—'}</td>
                <td className="text-xs text-slate-500">{m.source}{m.source === 'doctor' && m.createdBy?.name ? ` (${m.createdBy.name})` : ''}</td>
                <td className="whitespace-nowrap pr-3 text-right">
                  {!m.isVerified && m.isActive && <Button variant="ghost" onClick={() => act(() => api.post(`/admin/medicines/${m._id}/approve`))}>Approve</Button>}
                  <Button variant="ghost" onClick={() => setModal(m)}>Edit</Button>
                  {m.isActive
                    ? <Button variant="ghost" onClick={() => act(() => api.delete(`/admin/medicines/${m._id}`), `Remove ${m.brandName}? Past prescriptions keep it.`)}>Remove</Button>
                    : <Button variant="ghost" onClick={() => act(() => api.put(`/admin/medicines/${m._id}`, { isActive: true }))}>Restore</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && !error && <p className="py-10 text-center text-slate-500">No medicines found.</p>}
      </Card>
      <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />
      {modal && (
        <Modal title={modal === 'add' ? 'Add medicine' : `Edit ${modal.brandName}`} onClose={() => setModal(null)} wide>
          <MedicineForm medicine={modal === 'add' ? null : modal} onCancel={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />
        </Modal>
      )}
    </div>
  );
}
