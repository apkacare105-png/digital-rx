import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import api, { errMsg } from '../api/client';
import { Alert, Button, Card, StatusBadge } from '../components/ui';
import PrescriptionSheet from '../components/PrescriptionSheet';
import { downloadBlob, sheetToPdfBlob } from '../utils/pdf';

export default function PrescriptionView() {
  const { id } = useParams();
  const sheetRef = useRef(null);
  const [data, setData] = useState(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [fallback, setFallback] = useState(false); // shown when the device can't attach a file to other apps

  const load = async () => {
    try {
      const { data } = await api.get(`/prescriptions/${id}`);
      setData(data);
    } catch (err) {
      setError(errMsg(err));
    }
  };
  useEffect(() => { load(); }, [id]);

  const code = data?.prescription?.verifyCode;
  useEffect(() => {
    if (!code) return;
    QRCode.toDataURL(`${window.location.origin}/verify/${code}`, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(''));
  }, [code]);

  const cancel = async () => {
    if (!confirm('Cancel this prescription? Anyone scanning its QR code will see that it is cancelled.')) return;
    try {
      const { data: d } = await api.post(`/prescriptions/${id}/cancel`);
      setData(d);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  if (!data) return <Alert>{error}</Alert>;
  const rx = data.prescription;
  const issued = rx.status !== 'draft';
  const fileName = `${rx.rxNo || 'prescription'}.pdf`;
  const shareText = `Prescription ${rx.rxNo} from Dr. ${data.doctor?.name || ''}`.trim();

  const record = (action) => api.post(`/prescriptions/${id}/pdf-event`, { action }).catch(() => {});
  const makePdf = () => sheetToPdfBlob(sheetRef.current);

  const download = async () => {
    setBusy('download');
    setError('');
    try {
      downloadBlob(await makePdf(), fileName);
      record('download');
    } catch {
      setError('Could not create the PDF. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const share = async () => {
    setBusy('share');
    setError('');
    setFallback(false);
    try {
      const blob = await makePdf();
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: shareText, text: shareText });
          record('share');
        } catch (e) {
          if (e?.name !== 'AbortError') throw e; // closing the share sheet is not an error
        }
      } else {
        // Computers can't attach a file to WhatsApp/email from a web page: save it, then offer the apps.
        downloadBlob(blob, fileName);
        record('download');
        setFallback(true);
      }
    } catch {
      setError('Could not share the PDF. Please use Download PDF instead.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link to="/" className="mr-auto text-sm text-teal-700">← Prescriptions</Link>
        <StatusBadge status={rx.status} />
        {issued && <Button disabled={!!busy} onClick={download}>{busy === 'download' ? 'Making PDF…' : 'Download PDF'}</Button>}
        {issued && <Button variant="secondary" disabled={!!busy} onClick={share}>{busy === 'share' ? 'Preparing…' : 'Share'}</Button>}
        <Button variant="secondary" onClick={() => window.print()}>Print</Button>
        {rx.status === 'issued' && <Button variant="ghost" onClick={cancel}>Cancel Rx</Button>}
      </div>
      <Alert>{error}</Alert>
      {fallback && (
        <Card className="no-print space-y-2 !p-4 text-sm">
          <div>The PDF was saved to your device. Open WhatsApp or email and attach it:</div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Open WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent('Please find the prescription attached.')}`}
              className="neu-raised-sm neu-press rounded-xl px-4 py-2 text-sm font-medium text-slate-700"
            >
              Open email
            </a>
          </div>
        </Card>
      )}
      <div ref={sheetRef}>
        <PrescriptionSheet {...data} qr={issued ? qr : ''} />
      </div>
    </div>
  );
}
