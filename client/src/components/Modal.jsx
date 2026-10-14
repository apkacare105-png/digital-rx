export default function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div
        className={`my-8 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} neu-raised rounded-2xl p-5`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-xl px-3 py-1 text-xl leading-none text-slate-500 hover:neu-raised-sm" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
