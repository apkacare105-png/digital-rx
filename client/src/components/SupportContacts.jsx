import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_LINK } from '../config/support';

/** Tap-to-open WhatsApp and email links for support. */
export default function SupportContacts() {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <span className="text-slate-500">WhatsApp: </span>
        <a className="font-medium text-teal-700 underline" href={SUPPORT_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
          {SUPPORT_WHATSAPP_DISPLAY}
        </a>
      </div>
      <div>
        <span className="text-slate-500">Email: </span>
        <a className="font-medium text-teal-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </div>
    </div>
  );
}
