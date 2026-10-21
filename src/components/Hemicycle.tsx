import React, { useMemo, useState } from 'react';
import { ModelResult } from '../engine/senateEngine';
import { PARTY_COLORS, PARTY_NAMES, ORDER, getPartyTint } from '../data/electionData';

interface HemicycleProps {
  result: ModelResult;
  selectedBloc: Set<string>;
  onTogglePartyInBloc: (party: string) => void;
  onClearBloc?: () => void;
  targetMajority: number;
}

/* One dot per senator, laid out in concentric rows */
const CX = 350, CY = 352, R0 = 130, R1 = 320, ROWS = 8, DOT = 10.5;

interface Dot { x: number; y: number; theta: number; r: number }

function buildLayout(n: number): Dot[] {
  if (n <= 0) return [];
  const radii = Array.from({ length: ROWS }, (_, i) => R0 + ((R1 - R0) * i) / (ROWS - 1));
  const sumR = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map(r => Math.round((n * r) / sumR));
  counts[ROWS - 1] += n - counts.reduce((a, b) => a + b, 0);

  const dots: Dot[] = [];
  counts.forEach((c, i) => {
    for (let k = 0; k < c; k++) {
      const theta = c === 1 ? Math.PI / 2 : Math.PI - (Math.PI * k) / (c - 1);
      dots.push({ theta, r: radii[i], x: CX + radii[i] * Math.cos(theta), y: CY - radii[i] * Math.sin(theta) });
    }
  });
  // left to right; ties (same angle) go from the inner row outwards
  dots.sort((a, b) => (Math.abs(a.theta - b.theta) < 1e-9 ? a.r - b.r : b.theta - a.theta));
  return dots;
}

const polar = (r: number, theta: number): [number, number] => [CX + r * Math.cos(theta), CY - r * Math.sin(theta)];

export const Hemicycle: React.FC<HemicycleProps> = ({
  result, selectedBloc, onTogglePartyInBloc, onClearBloc, targetMajority
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState<'2026' | '2023'>('2026');
  const is26 = view === '2026';
  const seatsNow = is26 ? result.seats : result.baseSeats;

  const parties = useMemo(() => {
    const present = new Set([
      ...Object.keys(result.seats).filter(p => (result.seats[p] || 0) > 0),
      ...Object.keys(result.baseSeats).filter(p => (result.baseSeats[p] || 0) > 0)
    ]);
    const list = ORDER.filter(p => present.has(p));
    present.forEach(p => { if (!list.includes(p)) list.push(p); });
    return list;
  }, [result.seats, result.baseSeats]);

  const seatList = useMemo(() => {
    const l: string[] = [];
    parties.forEach(p => { for (let i = 0; i < (seatsNow[p] || 0); i++) l.push(p); });
    return l;
  }, [parties, seatsNow]);

  const n = seatList.length;
  const layout = useMemo(() => buildLayout(n), [n]);

  const blocActive = is26 && selectedBloc.size > 0;
  const blocSeats = Array.from(selectedBloc).reduce((s, p) => s + (result.seats[p] || 0), 0);

  const ticks = is26
    ? [105, targetMajority]
        .map(k => ({ k, theta: k > 0 && k < layout.length ? (layout[k - 1].theta + layout[k].theta) / 2 : null }))
        .filter(t => t.theta !== null) as { k: number; theta: number }[]
    : [];

  const pctOf = (p: string) => (n > 0 ? (((seatsNow[p] || 0) / n) * 100).toFixed(1).replace('.', ',') : '0')
  const deltaOf = (p: string) => (result.seats[p] || 0) - (result.baseSeats[p] || 0);
  const fmtDelta = (d: number) => (d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '=');
  const short = (p: string) => (p === 'UPN' ? 'UPN-PP' : p);

  // Centre of the chamber
  let big: string | number = n;
  let bigColor = '#161b18';
  let label = 'senadores';
  let labelColor = '#667068';
  let sub = is26 ? 'proyección con tus datos' : 'resultado real del 23-J';
  if (hovered) {
    big = seatsNow[hovered] || 0;
    bigColor = PARTY_COLORS[hovered] || '#161b18';
    label = short(hovered);
    labelColor = '#161b18';
    sub = is26
      ? `${pctOf(hovered)} % · ${deltaOf(hovered) === 0 ? 'igual que en 2023' : `${fmtDelta(deltaOf(hovered))} vs 2023`}`
      : `${pctOf(hovered)} % del Senado`;
  } else if (blocActive) {
    big = blocSeats;
    const gap = targetMajority - blocSeats;
    label = gap <= 0 ? `superan los ${targetMajority} (+${-gap})` : `faltan ${gap} para ${targetMajority}`;
    labelColor = gap <= 0 ? '#161b18' : '#a9741a';
    const names = Array.from(selectedBloc).map(short).join(' + ');
    sub = names.length > 30 ? `${names.slice(0, 28)}…` : names;
  }

  const legend = parties
    .filter(p => (seatsNow[p] || 0) > 0)
    .sort((a, b) => (seatsNow[b] || 0) - (seatsNow[a] || 0));

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950">Así queda el Senado</h2>
          <p className="mt-1 text-sm text-slate-500">Un punto es un senador. Toca un partido para sumarlo a tu bloque.</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Elegir año">
          {(['2026', '2023'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                view === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {v === '2026' ? 'Proyección 2026' : 'Real 2023'}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox="0 0 700 376"
        className="mt-6 h-auto w-full overflow-visible select-none"
        role="img"
        aria-label={`Hemiciclo con ${n} senadores en ${view}`}
      >
        {layout.map((d, i) => {
          const p = seatList[i];
          const dimmed = hovered ? p !== hovered : blocActive && !selectedBloc.has(p);
          return (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={DOT}
              fill={PARTY_COLORS[p] || '#8f968c'}
              opacity={hovered ? (p === hovered ? 1 : 0.16) : dimmed ? 0.25 : 1}
              className="cursor-pointer transition-[fill,opacity] duration-300"
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onTogglePartyInBloc(p)}
            />
          );
        })}

        {ticks.map(t => {
          const [x1, y1] = polar(R1 + DOT + 8, t.theta);
          const [x2, y2] = polar(R1 + DOT + 22, t.theta);
          const [tx, ty] = polar(R1 + DOT + 36, t.theta);
          const isTarget = t.k === targetMajority;
          return (
            <g key={t.k}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isTarget ? '#a9741a' : '#8f968c'} strokeWidth={isTarget ? 3 : 1.5} strokeLinecap="round" />
              <text x={tx} y={ty + 4} textAnchor="middle" fill={isTarget ? '#a9741a' : '#667068'} className="text-[13px] font-semibold tabular-nums">
                {t.k}
              </text>
            </g>
          );
        })}

        <g className="pointer-events-none">
          <text x={CX} y={CY - 38} textAnchor="middle" fill={bigColor} className="font-display text-[72px] font-semibold tabular-nums">
            {big}
          </text>
          <text x={CX} y={CY - 10} textAnchor="middle" fill={labelColor} className="text-[16px] font-semibold">
            {label}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" fill="#667068" className="text-[13px]">
            {sub}
          </text>
        </g>
      </svg>

      {is26 && (
        <p className="mt-1 text-center text-xs text-slate-500">
          Las marcas del borde cuentan escaños desde la izquierda: 105 es la mayoría absoluta y <span className="font-semibold text-brass">{targetMajority}</span> el objetivo.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {legend.map(p => {
          const color = PARTY_COLORS[p] || '#8f968c';
          const isSelected = selectedBloc.has(p);
          const d = deltaOf(p);
          return (
            <button
              key={p}
              onClick={() => onTogglePartyInBloc(p)}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(p)}
              onBlur={() => setHovered(null)}
              aria-pressed={isSelected}
              title={`${PARTY_NAMES[p] || p}: ${seatsNow[p]} escaños`}
              style={{
                borderColor: isSelected ? color : undefined,
                backgroundColor: isSelected ? getPartyTint(p, 0.12) : undefined
              }}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-3 pr-3.5 text-sm transition-colors hover:border-slate-400 cursor-pointer"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-semibold text-slate-900">{short(p)}</span>
              <span className="font-bold tabular-nums text-slate-900">{seatsNow[p]}</span>
              {is26 && <span className={`text-xs tabular-nums ${d === 0 ? 'text-slate-400' : 'font-semibold text-slate-600'}`}>{fmtDelta(d)}</span>}
            </button>
          );
        })}
        {blocActive && onClearBloc && (
          <button onClick={onClearBloc} className="px-2 py-1.5 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900 cursor-pointer">
            Vaciar bloque
          </button>
        )}
      </div>
    </div>
  );
};
