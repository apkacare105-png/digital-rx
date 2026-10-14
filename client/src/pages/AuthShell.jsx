import { useState } from 'react';
import SupportContacts from '../components/SupportContacts';

export default function AuthShell({ title, children, footer }) {
  const [help, setHelp] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-teal-700">Digital Rx</div>
          <div className="text-sm text-slate-500">{title}</div>
        </div>
        <div className="neu-raised rounded-3xl p-6 sm:p-8">{children}</div>
        <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>
        <div className="mt-3 text-center text-sm">
          <button type="button" className="text-teal-700 underline" onClick={() => setHelp((v) => !v)}>Need help?</button>
          {help && (
            <div className="mx-auto mt-2 max-w-xs neu-inset rounded-xl p-3 text-left">
              <SupportContacts />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
