import { useRef, useState } from 'react';
import api from '../api/client';
import { inputCls } from './ui';

/**
 * Debounced (250 ms) brand-name autocomplete.
 * onType(text): user is typing (parent should clear any previously picked medicineId)
 * onPick(medicine): user chose a suggestion
 * If nothing matches, the typed text is kept as a custom entry and is auto-saved to the master list on issue.
 */
export default function MedicineAutocomplete({ value, onType, onPick }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState(false);
  const timer = useRef();
  const reqId = useRef(0);

  const handleChange = (e) => {
    const v = e.target.value;
    onType(v);
    setOpen(true);
    clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const id = ++reqId.current;
      try {
        const { data } = await api.get('/medicines', { params: { q: v.trim() } });
        if (id !== reqId.current) return; // stale response
        setResults(data.items);
        setActive(-1);
        setSearched(true);
      } catch {
        /* ignore: user can still type a custom entry */
      }
    }, 250);
  };

  const pick = (m) => {
    reqId.current++;
    setOpen(false);
    setResults([]);
    onPick(m);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative">
      <input
        className={inputCls}
        placeholder="Brand name (type to search)"
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        autoComplete="off"
      />
      {open && value.trim().length >= 2 && (results.length > 0 || searched) && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto neu-raised rounded-xl">
          {results.map((m, i) => (
            <li
              key={m._id}
              onMouseDown={(e) => {
                e.preventDefault(); // keep input focus so blur doesn't close before click lands
                pick(m);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-teal-50' : 'hover:bg-teal-50/60'}`}
            >
              <div className="font-medium">
                {m.brandName}
                {!m.isVerified && <span className="ml-2 rounded bg-amber-100 px-1.5 text-[10px] text-amber-800">new</span>}
              </div>
              <div className="text-xs text-slate-500">
                {[m.genericName, m.strength, m.form].filter(Boolean).join(' · ')}
              </div>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-500">No match — it will be added as a custom medicine when you issue.</li>
          )}
        </ul>
      )}
    </div>
  );
}
