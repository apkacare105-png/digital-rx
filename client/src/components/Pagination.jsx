export default function Pagination({ page, pages, total, onPage }) {
  if (!pages || pages <= 1) return total != null ? <div className="text-center text-xs text-slate-500">{total} total</div> : null;
  return (
    <div className="flex items-center justify-center gap-3 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
      <span>Page {page} of {pages} · {total} total</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
    </div>
  );
}
