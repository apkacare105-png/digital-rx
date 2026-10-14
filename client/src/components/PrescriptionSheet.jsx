import { assetUrl } from '../api/client';
import { fmtDate } from './ui';

/** Print-friendly prescription. Used by the doctor view AND the public verify page. Always flat white (printed / saved as PDF). */
// Avoid "DOLO 650MG 650 mg": skip the strength when the brand name already contains it
const showStrength = (it) => {
  const norm = (v) => String(v || '').toLowerCase().replace(/\s+/g, '');
  return it.strength && !norm(it.brandName).includes(norm(it.strength)) ? it.strength : '';
};

export default function PrescriptionSheet({ prescription: rx, patient, doctor, qr }) {
  const items = rx.items || [];
  return (
    <div className="print-sheet mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4 border-b-2 border-teal-600 pb-4">
        {doctor?.logoUrl && <img src={assetUrl(doctor.logoUrl)} alt="" className="h-16 w-16 object-contain" />}
        <div className="flex-1">
          <div className="text-xl font-bold text-teal-800">{doctor?.clinicName || `Dr. ${doctor?.name}`}</div>
          <div className="text-sm font-medium">
            Dr. {doctor?.name}
            {doctor?.qualification && <span className="font-normal text-slate-600"> · {doctor.qualification}</span>}
          </div>
          {doctor?.registrationNo && <div className="text-xs text-slate-600">Reg. No: {doctor.registrationNo}</div>}
          {doctor?.clinicAddress && <div className="text-xs text-slate-600">{doctor.clinicAddress}</div>}
          {doctor?.clinicPhone && <div className="text-xs text-slate-600">Clinic: {doctor.clinicPhone}</div>}
          {doctor?.phone && <div className="text-xs text-slate-600">Phone: {doctor.phone}</div>}
          {doctor?.email && <div className="text-xs text-slate-600">Email: {doctor.email}</div>}
        </div>
        <div className="text-right text-xs text-slate-600">
          <div className="font-semibold text-slate-800">{rx.rxNo || 'DRAFT'}</div>
          <div>{fmtDate(rx.issuedAt || rx.createdAt)}</div>
          {rx.status === 'cancelled' && <div className="mt-1 font-bold text-red-600">CANCELLED</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-slate-200 py-3 text-sm sm:grid-cols-3">
        <div><span className="text-slate-500">Patient: </span><b>{patient?.name}</b></div>
        <div><span className="text-slate-500">Age/Sex: </span>{[patient?.age, patient?.gender].filter(Boolean).join(' / ') || '—'}</div>
        {patient?.phone && <div><span className="text-slate-500">Phone: </span>{patient.phone}</div>}
        {patient?.allergies && (
          <div className="col-span-full"><span className="font-semibold text-red-600">Allergies: </span>{patient.allergies}</div>
        )}
      </div>

      {rx.note && (
        <div className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm"><b>Note: </b>{rx.note}</div>
      )}

      {rx.diagnosis && (
        <div className="py-3 text-sm"><span className="font-semibold">Diagnosis: </span>{rx.diagnosis}</div>
      )}

      <div className="py-2">
        <div className="mb-2 text-2xl font-serif text-teal-700">℞</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
              <th className="py-1 pr-2">#</th><th className="pr-2">Medicine</th><th className="pr-2">Dose</th>
              <th className="pr-2">Duration</th><th>Timing</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-2">{i + 1}</td>
                <td className="pr-2">
                  <div className="font-medium">{it.brandName} {showStrength(it)}</div>
                  {it.genericName && <div className="text-xs text-slate-500">{it.genericName}</div>}
                </td>
                <td className="pr-2">{it.dose || '—'}</td>
                <td className="pr-2">{it.duration || '—'}</td>
                <td>{it.timing || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rx.advice && (
        <div className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm"><b>Advice: </b>{rx.advice}</div>
      )}

      <div className="keep-together mt-10 flex items-end justify-between gap-4">
        <div className="flex items-end gap-3">
          {qr && <img src={qr} alt="QR code to verify this prescription" className="h-20 w-20" />}
          <div className="text-[11px] leading-snug text-slate-400">
            {qr && <div className="font-medium text-slate-500">Scan to verify</div>}
            Computer-generated prescription
          </div>
        </div>
        <div className="text-center">
          {doctor?.signatureUrl && <img src={assetUrl(doctor.signatureUrl)} alt="Signature" className="mx-auto h-14 object-contain" />}
          <div className="border-t border-slate-400 px-6 pt-1 text-xs">Dr. {doctor?.name}</div>
        </div>
      </div>
    </div>
  );
}
