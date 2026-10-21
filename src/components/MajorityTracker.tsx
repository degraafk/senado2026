import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { Check, X } from 'lucide-react';
import { ModelResult } from '../engine/senateEngine';
import { PARTY_COLORS, getPartyTint } from '../data/electionData';

interface MajorityTrackerProps {
  result: ModelResult;
  selectedBloc: Set<string>;
  onTogglePartyInBloc: (party: string) => void;
  onSetBloc: (parties: string[]) => void;
  targetMajority: number;
  onTargetMajorityChange: (val: number) => void;
}

const THRESHOLDS = [
  { val: 105, label: 'Absoluta' },
  { val: 126, label: 'Tres quintos' },
  { val: 133, label: 'Objetivo' }
];

const PACTS = [
  { name: 'PP solo', parties: ['PP'] },
  { name: 'PP + UPN + VOX + Sa Unió', parties: ['PP', 'UPN', 'VOX', 'Sa Unió'] },
  { name: 'Izquierda + nacionalistas', parties: ['SdP', 'PSOE', 'PSC', 'Frente Amplio', 'EH Bildu', 'PNV', 'ERC', 'BNG'] },
  { name: 'SdP + PNV + Junts', parties: ['SdP', 'PSOE', 'PSC', 'PNV', 'Junts'] }
];

export const MajorityTracker: React.FC<MajorityTrackerProps> = ({
  result, selectedBloc, onTogglePartyInBloc, onSetBloc, targetMajority, onTargetMajorityChange
}) => {
  const totalSeats = result.totalSeats || 209;
  const absMaj = Math.floor(totalSeats / 2) + 1;
  const threeFifths = Math.ceil((totalSeats * 3) / 5);

  const blocParties = Array.from(selectedBloc).sort((a, b) => (result.seats[b] || 0) - (result.seats[a] || 0));
  const blocSeats = blocParties.reduce((sum, p) => sum + (result.seats[p] || 0), 0);
  const blocPct = totalSeats > 0 ? (blocSeats / totalSeats) * 100 : 0;
  const isTargetReached = blocSeats >= targetMajority;

  const [displaySeats, setDisplaySeats] = useState(blocSeats);
  const countRef = useRef({ val: blocSeats });

  useEffect(() => {
    const tween = gsap.to(countRef.current, {
      val: blocSeats, duration: 0.35, ease: 'power2.out',
      onUpdate: () => setDisplaySeats(Math.round(countRef.current.val))
    });
    return () => { tween.kill(); };
  }, [blocSeats]);

  const prevReachedRef = useRef(false);
  useEffect(() => {
    if (isTargetReached && !prevReachedRef.current && blocSeats > 0) {
      confetti({
        particleCount: 75, spread: 80, origin: { y: 0.6 },
        colors: ['#a9741a', PARTY_COLORS['PP'], PARTY_COLORS['SdP'], PARTY_COLORS['VOX']]
      });
    }
    prevReachedRef.current = isTargetReached;
  }, [isTargetReached, blocSeats]);

  const marks = [
    { val: absMaj, label: String(absMaj) },
    { val: threeFifths, label: String(threeFifths) }
  ];

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950">¿Llega tu pacto a la mayoría?</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Toca partidos en el hemiciclo o elige un pacto y comprueba cuántos escaños suman.
          </p>
        </div>

        <div className="flex items-center gap-1 self-start md:self-auto rounded-full border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Mayoría objetivo">
          {THRESHOLDS.map(t => (
            <button
              key={t.val}
              onClick={() => onTargetMajorityChange(t.val)}
              aria-pressed={targetMajority === t.val}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                targetMajority === t.val ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="font-mono tabular-nums">{t.val}</span> {t.label.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        <div className="md:col-span-5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-7xl sm:text-8xl font-semibold leading-none text-slate-950 tabular-nums">
              {displaySeats}
            </span>
            <span className="text-sm text-slate-500">
              de {totalSeats} escaños<br />
              <span className="font-mono tabular-nums">{blocPct.toFixed(1)} %</span>
            </span>
          </div>
          <p className={`mt-3 flex items-center gap-2 text-base font-semibold ${isTargetReached ? 'text-slate-950' : 'text-brass'}`}>
            {isTargetReached && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>
            )}
            {isTargetReached
              ? `Superas los ${targetMajority} por ${blocSeats - targetMajority}`
              : `Te faltan ${targetMajority - blocSeats} para llegar a ${targetMajority}`}
          </p>
        </div>

        <ul className="md:col-span-7 grid grid-cols-3 gap-4 text-sm">
          {[
            { val: absMaj, label: 'Absoluta' },
            { val: threeFifths, label: 'Tres quintos' },
            { val: targetMajority, label: 'Objetivo' }
          ].map((m, i) => {
            const ok = blocSeats >= m.val;
            return (
              <li key={i} className={`border-t-2 pt-2 ${i === 2 ? 'border-brass' : ok ? 'border-slate-900' : 'border-slate-200'}`}>
                <span className="block text-xs text-slate-500">{m.label} · <span className="font-mono tabular-nums">{m.val}</span></span>
                <span className={`mt-0.5 flex items-center gap-1 font-semibold ${ok ? 'text-slate-950' : 'text-slate-400'}`}>
                  {ok ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Alcanzada</> : <>Faltan <span className="font-mono tabular-nums">{m.val - blocSeats}</span></>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-10">
        <div className="relative flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100">
          {blocParties.map(p => {
            const seats = result.seats[p] || 0;
            if (seats <= 0) return null;
            return (
              <div
                key={p}
                className="h-full transition-all duration-300"
                style={{ width: `${(seats / totalSeats) * 100}%`, backgroundColor: PARTY_COLORS[p] || '#667068' }}
                title={`${p}: ${seats} escaños`}
              />
            );
          })}
        </div>
        <div className="relative mt-0 h-9 w-full text-xs text-slate-500">
          {marks.map(m => (
            <span key={m.val} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${(m.val / totalSeats) * 100}%` }}>
              <span className="mx-auto block h-2 w-px bg-slate-400" />
              <span className="font-mono tabular-nums">{m.label}</span>
            </span>
          ))}
          <span className="absolute top-0 -translate-x-1/2 text-center font-semibold text-brass" style={{ left: `${(targetMajority / totalSeats) * 100}%` }}>
            <span className="mx-auto block h-2 w-0.5 bg-brass" />
            <span className="font-mono tabular-nums">{targetMajority}</span>
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-semibold text-slate-700">Tu bloque</span>
          {selectedBloc.size === 0 ? (
            <span className="text-sm text-slate-400">Vacío. Toca un partido o elige un pacto.</span>
          ) : (
            blocParties.map(p => {
              const c = PARTY_COLORS[p] || '#667068';
              return (
                <span
                  key={p}
                  style={{ backgroundColor: getPartyTint(p, 0.12), borderColor: c, color: c }}
                  className="inline-flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-2 text-xs font-bold"
                >
                  {p === 'UPN' ? 'UPN-PP' : p}
                  <span className="font-mono tabular-nums text-slate-700">{result.seats[p] || 0}</span>
                  <button onClick={() => onTogglePartyInBloc(p)} className="rounded-full p-0.5 hover:bg-black/10 cursor-pointer" aria-label={`Quitar ${p}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-semibold text-slate-700">Pactos</span>
          {PACTS.map(c => (
            <button
              key={c.name}
              onClick={() => onSetBloc(c.parties)}
              className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-900 transition-colors cursor-pointer"
            >
              {c.name}
            </button>
          ))}
          {selectedBloc.size > 0 && (
            <button onClick={() => onSetBloc([])} className="px-2 py-1.5 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900 cursor-pointer">
              Vaciar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
