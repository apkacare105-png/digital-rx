export const Button = ({ variant = 'primary', className = '', ...p }) => {
  const styles = {
    // solid teal keeps the main action clearly visible
    primary: 'bg-teal-600 text-white shadow-[4px_4px_8px_var(--neu-dark),-4px_-4px_8px_var(--neu-light)] hover:bg-teal-700 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.25)] disabled:bg-teal-300 disabled:shadow-none',
    secondary: 'neu-raised-sm neu-press text-slate-700 disabled:opacity-50',
    danger: 'bg-red-600 text-white shadow-[4px_4px_8px_var(--neu-dark),-4px_-4px_8px_var(--neu-light)] hover:bg-red-700 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.25)] disabled:bg-red-300 disabled:shadow-none',
    ghost: 'text-teal-700 hover:neu-raised-sm neu-press hover:bg-[var(--neu-bg)]',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${styles[variant]} ${className}`}
      {...p}
    />
  );
};

export const Field = ({ label, hint, children }) => (
  <label className="block">
    {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
    {children}
    {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
  </label>
);

const inputCls =
  'neu-inset w-full rounded-xl border border-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200';
export const Input = (p) => <input className={inputCls} {...p} />;
export const Textarea = (p) => <textarea rows={3} className={inputCls} {...p} />;
export const Select = (p) => <select className={inputCls} {...p} />;
export { inputCls };

export const Card = ({ className = '', ...p }) => (
  <div className={`neu-raised rounded-2xl p-4 sm:p-6 ${className}`} {...p} />
);

export const Alert = ({ type = 'error', children }) =>
  children ? (
    <div
      className={`rounded-xl px-3 py-2 text-sm ${
        type === 'error' ? 'bg-red-50 text-red-700' : type === 'success' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'
      }`}
    >
      {children}
    </div>
  ) : null;

const badge = {
  draft: 'bg-slate-100 text-slate-700',
  issued: 'bg-teal-100 text-teal-800',
  dispensed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};
export const StatusBadge = ({ status, label }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badge[status] || badge.draft}`}>{label || status}</span>
);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
