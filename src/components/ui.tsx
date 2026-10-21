import React from 'react';
import { Search } from 'lucide-react';
import { ORDER, PARTY_COLORS } from '../data/electionData';

export const CARD = 'w-full rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm';
export const fmt = (x: number) => x.toLocaleString('es-ES');
export const dec = (x: number, d = 2) => x.toFixed(d).replace('.', ',');

export const Delta: React.FC<{ d: number }> = ({ d }) => (
  <span className={`tabular-nums ${d === 0 ? 'text-slate-400' : 'font-semibold text-slate-800'}`}>
    {d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '='}
  </span>
);

/* One dot per senator, in party colour */
export const SeatDots: React.FC<{ tally: Record<string, number>; size?: number }> = ({ tally, size = 12 }) => {
  const dots: string[] = [];
  ORDER.forEach(p => { for (let i = 0; i < (tally[p] || 0); i++) dots.push(p); });
  return (
    <span className="inline-flex items-center gap-1">
      {dots.map((p, i) => (
        <span key={i} title={p} className="rounded-full" style={{ width: size, height: size, backgroundColor: PARTY_COLORS[p] || '#8f968c' }} />
      ))}
    </span>
  );
};

export const Pill: React.FC<{ active?: boolean; onClick: () => void; title?: string; children: React.ReactNode }> = ({
  active, onClick, title, children
}) => (
  <button
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
      active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-900'
    }`}
  >
    {children}
  </button>
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({
  value, onChange, placeholder
}) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-48 rounded-full border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs placeholder:text-slate-400 sm:w-56"
    />
  </div>
);

export const SectionHead: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({ title, sub, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
    {right}
  </div>
);
