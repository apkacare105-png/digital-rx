import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Button, Card, Field, Select, Textarea } from '../components/ui';
import SupportContacts from '../components/SupportContacts';
import api, { errMsg } from '../api/client';

const TYPES = [
  ['login', 'Login or account'],
  ['prescription', 'Writing or printing a prescription'],
  ['medicine', 'A medicine is missing or wrong'],
  ['whatsapp', 'Sharing a prescription (PDF)'],
  ['other', 'Something else'],
];

export default function Help() {
  const loc = useLocation();
  const [type, setType] = useState('prescription');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/support', { type, message, page: loc.state?.from || '' });
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(errMsg(err, 'Could not send your report'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Help</h1>
      <Card>
        <div className="mb-3 font-semibold">Contact support</div>
        <SupportContacts />
      </Card>
      <Card>
        <div className="mb-1 font-semibold">Report a problem</div>
        <p className="mb-3 text-sm text-slate-500">
          Your name, email and phone are sent with the report so we can contact you. Please do not include patient names or phone numbers.
        </p>
        {sent ? (
          <div className="space-y-3">
            <Alert type="success">Request sent. We will contact you on your phone or email.</Alert>
            <Button variant="secondary" onClick={() => setSent(false)}>Report another problem</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Alert>{error}</Alert>
            <Field label="What is it about?">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Describe the problem" hint="What did you do, and what happened?">
              <Textarea rows={6} required minLength={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <Button disabled={busy}>{busy ? 'Sending…' : 'Send'}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
