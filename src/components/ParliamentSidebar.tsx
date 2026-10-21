import React, { useState, useMemo, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ModelResult } from '../engine/senateEngine';
import { PARTY_COLORS, PARTY_NAMES, ORDER } from '../data/electionData';
import {
  Check,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface ParliamentSidebarProps {
  result: ModelResult;
  selectedBloc: Set<string>;
  onTogglePartyInBloc: (party: string) => void;
  targetMajority: number;
  isOpenMobile?: boolean;
  onToggleMobile?: () => void;
}

// Geometry constants for the compact sidebar SVG hemicycle
const COMPACT_DN = { cx: 160, cy: 155, ro: 135, ri: 100, qo: 94, qi: 82 };

function pt(r: number, f: number): [number, number] {
  const a = Math.PI * (1 - f);
  return [COMPACT_DN.cx + r * Math.cos(a), COMPACT_DN.cy - r * Math.sin(a)];
}

function arcPath(f1: number, f2: number, ro: number, ri: number): string {
  if (f2 - f1 < 1e-4) return '';
  const [a, b] = pt(ro, f1);
  const [c, d] = pt(ro, f2);
  const [e, f] = pt(ri, f2);
  const [g, h] = pt(ri, f1);
  return `M${a} ${b}A${ro} ${ro} 0 0 1 ${c} ${d}L${e} ${f}A${ri} ${ri} 0 0 0 ${g} ${h}Z`;
}

export const ParliamentSidebar: React.FC<ParliamentSidebarProps> = ({
  result,
  selectedBloc,
  onTogglePartyInBloc,
  targetMajority,
  isOpenMobile = false,
  onToggleMobile
}) => {
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [, setTick] = useState(0);

  const animatedValuesRef = useRef<Record<string, number>>({});
  const animatedBaseValuesRef = useRef<Record<string, number>>({});

  const totalSeats = result.totalSeats || 209;
  const baseTotalSeats = Object.values(result.baseSeats).reduce((a, b) => a + b, 0) || 208;

  // Ordered parties that have seats in 2026 or 2023
  const activeParties = useMemo(() => {
    const partiesWithSeats = new Set([
      ...Object.keys(result.seats).filter(p => (result.seats[p] || 0) > 0),
      ...Object.keys(result.baseSeats).filter(p => (result.baseSeats[p] || 0) > 0)
    ]);

    // Keep parliamentary order
    const ordered = ORDER.filter(p => partiesWithSeats.has(p));
    partiesWithSeats.forEach(p => {
      if (!ordered.includes(p)) ordered.push(p);
    });

    return ordered;
  }, [result.seats, result.baseSeats]);

  // Parties sorted by 2026 seats (descending) for the seat list
  const rankedParties = useMemo(() => {
    return [...activeParties].sort((a, b) => {
      const seatsA = result.seats[a] || 0;
      const seatsB = result.seats[b] || 0;
      if (seatsB !== seatsA) return seatsB - seatsA;
      return (result.baseSeats[b] || 0) - (result.baseSeats[a] || 0);
    });
  }, [activeParties, result.seats, result.baseSeats]);

  // GSAP smooth animation on variable changes
  useEffect(() => {
    const currentObj = { ...animatedValuesRef.current };
    const currentBaseObj = { ...animatedBaseValuesRef.current };

    const targetObj: Record<string, number> = {};
    const targetBaseObj: Record<string, number> = {};

    activeParties.forEach(p => {
      targetObj[p] = result.seats[p] || 0;
      targetBaseObj[p] = result.baseSeats[p] || 0;
      if (currentObj[p] == null) currentObj[p] = targetObj[p];
      if (currentBaseObj[p] == null) currentBaseObj[p] = targetBaseObj[p];
    });

    const tween = gsap.to(currentObj, {
      ...targetObj,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => {
        animatedValuesRef.current = { ...currentObj };
        setTick(t => t + 1);
      }
    });

    const baseTween = gsap.to(currentBaseObj, {
      ...targetBaseObj,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => {
        animatedBaseValuesRef.current = { ...currentBaseObj };
      }
    });

    return () => {
      tween.kill();
      baseTween.kill();
    };
  }, [result.seats, result.baseSeats, activeParties]);

  // Compute hemicycle arcs
  const currentValues = animatedValuesRef.current;
  const currentBaseValues = animatedBaseValuesRef.current;

  let acc26 = 0;
  const arcs26 = activeParties.map(p => {
    const val = currentValues[p] != null ? currentValues[p] : (result.seats[p] || 0);
    const startF = acc26 / totalSeats;
    const endF = (acc26 + val) / totalSeats;
    acc26 += val;
    return {
      party: p,
      val: result.seats[p] || 0,
      path: arcPath(startF, endF, COMPACT_DN.ro, COMPACT_DN.ri),
      color: PARTY_COLORS[p] || '#64748b'
    };
  });

  let acc23 = 0;
  const arcs23 = activeParties.map(p => {
    const val = currentBaseValues[p] != null ? currentBaseValues[p] : (result.baseSeats[p] || 0);
    const startF = acc23 / baseTotalSeats;
    const endF = (acc23 + val) / baseTotalSeats;
    acc23 += val;
    return {
      party: p,
      val: result.baseSeats[p] || 0,
      path: arcPath(startF, endF, COMPACT_DN.qo, COMPACT_DN.qi),
      color: PARTY_COLORS[p] || '#64748b'
    };
  });

  // Bloc aggregations
  const rightSeats =
    (result.seats['PP'] || 0) +
    (result.seats['UPN'] || 0) +
    (result.seats['VOX'] || 0) +
    (result.seats['Sa Unió'] || 0);
  const progSeats =
    (result.seats['SdP'] || 0) +
    (result.seats['PSOE'] || 0) +
    (result.seats['PSC'] || 0) +
    (result.seats['Frente Amplio'] || 0);

  const isRightMajority = rightSeats >= targetMajority;

  // Center display data
  const centerParty = hoveredParty;
  const centerSeats = centerParty ? result.seats[centerParty] || 0 : null;
  const centerBaseSeats = centerParty ? result.baseSeats[centerParty] || 0 : null;
  const centerDelta = centerSeats != null && centerBaseSeats != null ? centerSeats - centerBaseSeats : 0;

  // Inner content
  const blocRow = (label: string, color: string, n: number) => (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-700">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-mono font-bold text-slate-900 tabular-nums">{n}</span>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brass opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brass"></span>
          </span>
          <h3 className="font-display text-base font-semibold text-slate-950">Escaños en directo</h3>
        </div>
        <div className="flex items-center gap-1">
          {onToggleMobile && (
            <button onClick={onToggleMobile} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 cursor-pointer" title="Cerrar" aria-label="Cerrar panel">
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 cursor-pointer"
            title={isCollapsed ? 'Abrir panel' : 'Plegar panel'}
            aria-label={isCollapsed ? 'Abrir panel' : 'Plegar panel'}
          >
            {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs">
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[280px]">
            <svg viewBox="0 0 320 180" className="w-full h-auto overflow-visible select-none" role="img" aria-label="Hemiciclo resumido: anillo exterior 2026, interior 2023">
              <g>
                {arcs23.map(a => {
                  const isHovered = hoveredParty === a.party;
                  return (
                    <path key={`base-mini-${a.party}`} d={a.path} fill={a.color} stroke="#ffffff" strokeWidth="1"
                      opacity={hoveredParty !== null && !isHovered ? 0.15 : isHovered ? 0.85 : 0.4} />
                  );
                })}
              </g>
              <g>
                {arcs26.map(a => {
                  const isHovered = hoveredParty === a.party;
                  const isSelected = selectedBloc.has(a.party);
                  return (
                    <path key={`proj-mini-${a.party}`} d={a.path} fill={a.color}
                      stroke={isSelected ? '#161b18' : '#ffffff'} strokeWidth={isSelected ? 2 : 1}
                      opacity={hoveredParty !== null && !isHovered ? 0.2 : 1}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredParty(a.party)}
                      onMouseLeave={() => setHoveredParty(null)}
                      onClick={() => onTogglePartyInBloc(a.party)}>
                      <title>{`${a.party}: ${a.val} escaños en 2026`}</title>
                    </path>
                  );
                })}
              </g>
              <g>
                {[105, targetMajority].map(v => {
                  const f = v / totalSeats;
                  const [x1, y1] = pt(COMPACT_DN.ro + 2, f);
                  const [x2, y2] = pt(COMPACT_DN.ro + 9, f);
                  const isTarget = v === targetMajority;
                  return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isTarget ? '#a9741a' : '#8f968c'} strokeWidth={isTarget ? 2.5 : 1.2} />;
                })}
              </g>
              <g className="pointer-events-none select-none">
                {centerParty ? (
                  <>
                    <text x={COMPACT_DN.cx} y={COMPACT_DN.cy - 24} textAnchor="middle" className="text-[13px] font-sans font-bold" fill={PARTY_COLORS[centerParty] || '#161b18'}>
                      {centerParty === 'UPN' ? 'UPN-PP' : centerParty}
                    </text>
                    <text x={COMPACT_DN.cx} y={COMPACT_DN.cy + 2} textAnchor="middle" className="font-display text-3xl font-semibold fill-slate-900">
                      {centerSeats}
                    </text>
                    <text x={COMPACT_DN.cx} y={COMPACT_DN.cy + 17} textAnchor="middle" className="font-mono text-[10px] font-semibold fill-slate-500">
                      {centerDelta === 0 ? 'igual que en 2023' : `${centerDelta > 0 ? '+' : ''}${centerDelta} vs 2023`}
                    </text>
                  </>
                ) : (
                  <>
                    <text x={COMPACT_DN.cx} y={COMPACT_DN.cy - 20} textAnchor="middle" className="text-[11px] font-sans fill-slate-500">
                      Senadores
                    </text>
                    <text x={COMPACT_DN.cx} y={COMPACT_DN.cy + 6} textAnchor="middle" className="font-display text-4xl font-semibold fill-slate-900">
                      {totalSeats}
                    </text>
                    <text x={COMPACT_DN.cx} y={COMPACT_DN.cy + 20} textAnchor="middle" className="font-mono text-[10px] font-bold" fill="#a9741a">
                      objetivo {targetMajority}
                    </text>
                  </>
                )}
              </g>
            </svg>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-900">Bloque de derechas</span>
            <span className="font-display text-2xl font-semibold text-slate-950 tabular-nums">
              {rightSeats}<span className="ml-1 font-sans text-xs font-normal text-slate-400">/ {totalSeats}</span>
            </span>
          </div>
          <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-slate-900 transition-all duration-300" style={{ width: `${Math.min(100, (rightSeats / totalSeats) * 100)}%` }} />
          </div>
          <div className="relative h-1.5 w-full">
            <span className="absolute -top-1.5 h-3.5 w-0.5 bg-brass" style={{ left: `${(targetMajority / totalSeats) * 100}%` }} title={`Objetivo: ${targetMajority}`} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-slate-600">
            {isRightMajority && <Check className="h-3.5 w-3.5 text-slate-900" strokeWidth={3} />}
            {isRightMajority
              ? `Superan los ${targetMajority} por ${rightSeats - targetMajority}`
              : `Les faltan ${targetMajority - rightSeats} para los ${targetMajority}`}
            <span className="ml-auto font-mono tabular-nums text-slate-400">{((rightSeats / totalSeats) * 100).toFixed(1)} %</span>
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-slate-500">
            <span>Partido</span>
            <span className="flex gap-4"><span>2026</span><span className="w-8 text-right">vs 2023</span></span>
          </div>
          <div className="mt-1 space-y-0.5">
            {rankedParties.map(p => {
              const s26 = result.seats[p] || 0;
              const s23 = result.baseSeats[p] || 0;
              const diff = s26 - s23;
              const color = PARTY_COLORS[p] || '#667068';
              const isSelected = selectedBloc.has(p);
              const isHovered = hoveredParty === p;
              return (
                <button
                  key={p}
                  onMouseEnter={() => setHoveredParty(p)}
                  onMouseLeave={() => setHoveredParty(null)}
                  onFocus={() => setHoveredParty(p)}
                  onBlur={() => setHoveredParty(null)}
                  onClick={() => onTogglePartyInBloc(p)}
                  aria-pressed={isSelected}
                  className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer ${isHovered ? 'bg-slate-100' : isSelected ? 'bg-slate-50' : ''}`}
                  title={`${PARTY_NAMES[p] || p}: ${s26} escaños. Toca para sumarlo a tu bloque.`}
                  style={isSelected ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
                >
                  <span className="flex items-center justify-between">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="truncate text-xs font-semibold text-slate-900">{p === 'UPN' ? 'UPN-PP' : p}</span>
                    </span>
                    <span className="flex items-center gap-4 font-mono tabular-nums">
                      <span className="text-sm font-bold text-slate-900">{s26}</span>
                      <span className={`w-8 text-right text-[11px] ${diff === 0 ? 'text-slate-400' : 'font-bold text-slate-700'}`}>
                        {diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : '='}
                      </span>
                    </span>
                  </span>
                  <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full transition-all duration-200" style={{ width: `${(s26 / totalSeats) * 100}%`, backgroundColor: color }} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <span className="block text-sm font-semibold text-slate-900">Por bloques</span>
          {blocRow('PP, UPN, VOX y Sa Unió', PARTY_COLORS['PP'], rightSeats)}
          {blocRow('SdP, PSOE y Frente Amplio', PARTY_COLORS['SdP'], progSeats)}
          {blocRow('Nacionalistas y otros', '#8f968c', Math.max(0, totalSeats - rightSeats - progSeats))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className={`hidden lg:block shrink-0 self-stretch transition-all duration-300 z-30 ${isCollapsed ? 'w-10' : 'w-64 xl:w-72 2xl:w-80'}`}>
        <div className="sticky top-28 h-[calc(100vh-8rem)] flex flex-col">
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="h-full w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
              title="Abrir escaños en directo"
            >
              <span className="h-2 w-2 rounded-full bg-brass" />
              <span className="[writing-mode:vertical-rl] rotate-180 flex items-center gap-2 text-xs font-semibold text-slate-600">
                Escaños en directo <span className="font-mono text-slate-900">{totalSeats}</span>
              </span>
              <ChevronLeft className="h-4 w-4 text-slate-400" />
            </button>
          ) : (
            sidebarContent
          )}
        </div>
      </aside>

      <div className="lg:hidden fixed bottom-5 right-4 z-40">
        <button
          onClick={onToggleMobile}
          className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <span className="h-2 w-2 rounded-full bg-brass" />
          <span>Derechas <span className="font-mono tabular-nums">{rightSeats}</span> de <span className="font-mono tabular-nums">{targetMajority}</span></span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>

      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onToggleMobile} />
          <div className="relative flex h-full w-full max-w-sm flex-col bg-slate-50 p-3 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
