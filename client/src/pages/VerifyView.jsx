import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import PrescriptionSheet from '../components/PrescriptionSheet';
import { Button, fmtDateTime } from '../components/ui';

// Opened by scanning the QR code on a prescription PDF. View-only: it never changes anything.
export default function VerifyView() {
  const { code } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    api
      .get(`/verify/${code}`)
      .then((r) => setState({ status: 'ok', ...r.data }))
      .catch((err) =>
        setState({
          status: 'missing',
          // every failure shows a friendly message, never raw errors
          message:
            err.response?.status === 429
              ? 'Too many requests. Please wait a few minutes and try again.'
              : err.response?.status === 404
              ? err.response?.data?.message
              : 'We could not load this prescription right now. Please try again shortly.',
        })
      );
  }, [code]);

  if (state.status === 'loading') return <div className="p-10 text-center text-slate-500">Checking prescription…</div>;

  if (state.status === 'missing')
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="neu-raised max-w-sm rounded-3xl p-8 text-center">
          <div className="mb-2 text-3xl">⚠️</div>
          <h1 className="mb-2 text-lg font-bold">Prescription not found</h1>
          <p className="text-sm text-slate-600">{state.message}</p>
        </div>
      </div>
    );

  const cancelled = state.prescription.status === 'cancelled';
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <div
          className={`mr-auto rounded-xl px-3 py-2 text-sm font-medium ${cancelled ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}
        >
          {cancelled
            ? 'This prescription has been CANCELLED by the doctor. Do not use it.'
            : `Genuine prescription issued by Dr. ${state.doctor?.name || ''} on ${fmtDateTime(state.prescription.issuedAt)}.`}
        </div>
        <Button variant="secondary" onClick={() => window.print()}>Print</Button>
      </div>
      <PrescriptionSheet prescription={state.prescription} patient={state.patient} doctor={state.doctor} />
    </div>
  );
}
