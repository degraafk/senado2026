import React from 'react';
import { ModelResult } from '../engine/senateEngine';
import { PARTY_COLORS, PARTY_NAMES, ORDER } from '../data/electionData';
import { CARD, Delta, SectionHead } from './ui';

const PROG = ['SdP', 'PSOE', 'PSC', 'Frente Amplio'];
const RIGHT = ['PP', 'UPN', 'VOX', 'Sa Unió'];

const Row: React.FC<{ label: React.ReactNode; a: number; b: number; color: string; max: number; strong?: boolean }> = ({ label, a, b, color, max, strong }) => (
  <tr className={`border-b border-slate-100 ${strong ? 'bg-slate-50' : ''}`}>
    <td className="py-2 pl-2">{label}</td>
    <td className="py-2 text-right font-display text-lg font-semibold tabular-nums text-slate-950">{a}</td>
    <td className="py-2 text-right tabular-nums text-slate-500">{b}</td>
    <td className="py-2 text-right"><Delta d={a - b} /></td>
    <td className="hidden w-48 py-2 pl-6 pr-2 sm:table-cell">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(a / max) * 100}%`, backgroundColor: color }} />
      </div>
    </td>
  </tr>
);


export const ComparisonTable: React.FC<{ result: ModelResult }> = ({ result }) => {
  const s26 = (p: string) => result.seats[p] || 0;
  const s23 = (p: string) => result.baseSeats[p] || 0;
  const parties = Array.from(new Set([...Object.keys(result.seats), ...Object.keys(result.baseSeats)]))
    .filter(p => s26(p) > 0 || s23(p) > 0)
    .sort((a, b) => s26(b) - s26(a) || (ORDER.indexOf(a) === -1 ? 99 : ORDER.indexOf(a)) - (ORDER.indexOf(b) === -1 ? 99 : ORDER.indexOf(b)));
  const total = result.totalSeats || 209;
  const max = Math.max(...parties.map(p => Math.max(s26(p), s23(p))), 1);
  const sum = (ps: string[], f: (p: string) => number) => ps.reduce((a, p) => a + f(p), 0);

  return (
    <div className={`${CARD} space-y-4`}>
      <SectionHead title="2026 frente a 2023" sub="Senadores por partido. En 2023 eran 208 y en 2026 son 209 porque Formentera elige uno aparte." />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2 pl-2 font-medium">Partido</th>
              <th className="py-2 text-right font-medium">2026</th>
              <th className="py-2 text-right font-medium">2023</th>
              <th className="py-2 text-right font-medium">Cambio</th>
              <th className="hidden sm:table-cell" />
            </tr>
          </thead>
          <tbody>
            {parties.map(p => (
              <Row
                key={p}
                max={max}
                a={s26(p)}
                b={s23(p)}
                color={PARTY_COLORS[p] || '#8f968c'}
                label={
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PARTY_COLORS[p] || '#8f968c' }} />
                    <span className="font-semibold text-slate-950">{p === 'UPN' ? 'UPN-PP' : p}</span>
                    <span className="hidden truncate text-xs text-slate-400 md:inline">{PARTY_NAMES[p] || ''}</span>
                  </span>
                }
              />
            ))}
            <Row strong max={max} a={sum(RIGHT, s26)} b={sum(RIGHT, s23)} color={PARTY_COLORS['PP']}
              label={<span className="text-sm font-semibold text-slate-950">Derechas <span className="font-normal text-slate-500">(PP, UPN-PP, VOX, Sa Unió)</span></span>} />
            <Row strong max={max} a={sum(PROG, s26)} b={sum(PROG, s23)} color={PARTY_COLORS['SdP']}
              label={<span className="text-sm font-semibold text-slate-950">Izquierda <span className="font-normal text-slate-500">(SdP, PSOE, PSC, Frente Amplio)</span></span>} />
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Cada bloque suma sus escaños sobre un total de {total}.</p>
    </div>
  );
};
