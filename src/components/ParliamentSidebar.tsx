import React, { useState, useMemo, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ModelResult } from '../engine/senateEngine';
import { PARTY_COLORS, PARTY_NAMES, ORDER } from '../data/electionData';
import {
  CheckCircle2,
  AlertCircle,
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
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-200/40 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-1.5">
              <span>Parlamento en Vivo</span>
              <span className="text-[10px] text-blue-700 bg-blue-100 font-mono font-bold px-1.5 py-0.2 rounded">
                209 esc.
              </span>
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Mobile close button */}
          {onToggleMobile && (
            <button
              onClick={onToggleMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cerrar panel lateral"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Desktop collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expandir panel lateral' : 'Plegar panel lateral'}
          >
            {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs font-sans">
        {/* Compact Hemicycle SVG */}
        <div className="flex flex-col items-center pt-1">
          <div className="relative w-full max-w-[280px]">
            <svg
              viewBox="0 0 320 180"
              className="w-full h-auto overflow-visible select-none drop-shadow-2xs"
            >
              {/* Inner ring (2023) */}
              <g>
                {arcs23.map(a => {
                  const isHovered = hoveredParty === a.party;
                  return (
                    <path
                      key={`base-mini-${a.party}`}
                      d={a.path}
                      fill={a.color}
                      stroke="#ffffff"
                      strokeWidth="1"
                      opacity={hoveredParty !== null && !isHovered ? 0.15 : isHovered ? 0.85 : 0.45}
                    />
                  );
                })}
              </g>

              {/* Outer ring (2026) */}
              <g>
                {arcs26.map(a => {
                  const isHovered = hoveredParty === a.party;
                  const isSelected = selectedBloc.has(a.party);

                  return (
                    <path
                      key={`proj-mini-${a.party}`}
                      d={a.path}
                      fill={a.color}
                      stroke={isSelected ? '#0f172a' : '#ffffff'}
                      strokeWidth={isSelected ? 2 : 1}
                      opacity={hoveredParty !== null && !isHovered ? 0.2 : 1}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredParty(a.party)}
                      onMouseLeave={() => setHoveredParty(null)}
                      onClick={() => onTogglePartyInBloc(a.party)}
                    >
                      <title>{`${a.party}: ${a.val} escaños 2026`}</title>
                    </path>
                  );
                })}
              </g>

              {/* Markers for 105 (Absoluta) and 133 (Meta) */}
              <g>
                {[
                  { val: 105, label: '105' },
                  { val: targetMajority, label: `${targetMajority}` }
                ].map(t => {
                  const f = t.val / totalSeats;
                  const [x1, y1] = pt(COMPACT_DN.ro + 2, f);
                  const [x2, y2] = pt(COMPACT_DN.ro + 9, f);
                  const isTarget = t.val === targetMajority;

                  return (
                    <line
                      key={t.val}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isTarget ? '#1d4ed8' : '#64748b'}
                      strokeWidth={isTarget ? 2 : 1.2}
                    />
                  );
                })}
              </g>

              {/* Center Real-Time Text */}
              <g className="pointer-events-none select-none">
                {centerParty ? (
                  <>
                    <text
                      x={COMPACT_DN.cx}
                      y={COMPACT_DN.cy - 22}
                      textAnchor="middle"
                      className="text-[13px] font-sans font-extrabold"
                      fill={PARTY_COLORS[centerParty] || '#0f172a'}
                    >
                      {centerParty === 'UPN' ? 'UPN-PP' : centerParty}
                    </text>
                    <text
                      x={COMPACT_DN.cx}
                      y={COMPACT_DN.cy + 1}
                      textAnchor="middle"
                      className="font-mono text-xl font-black fill-slate-900"
                    >
                      {centerSeats} esc.
                    </text>
                    <text
                      x={COMPACT_DN.cx}
                      y={COMPACT_DN.cy + 16}
                      textAnchor="middle"
                      className="font-mono text-[10px] font-semibold"
                      fill={centerDelta > 0 ? '#15803d' : centerDelta < 0 ? '#b91c1c' : '#64748b'}
                    >
                      {centerDelta > 0 ? `+${centerDelta} vs 23` : centerDelta < 0 ? `${centerDelta} vs 23` : '= vs 23'}
                    </text>
                  </>
                ) : (
                  <>
                    <text
                      x={COMPACT_DN.cx}
                      y={COMPACT_DN.cy - 18}
                      textAnchor="middle"
                      className="font-mono text-[10px] uppercase font-bold fill-slate-400 tracking-wider"
                    >
                      Total Cámara
                    </text>
                    <text
                      x={COMPACT_DN.cx}
                      y={COMPACT_DN.cy + 4}
                      textAnchor="middle"
                      className="font-mono text-2xl font-black fill-slate-900"
                    >
                      {totalSeats}
                    </text>
                    <text
                      x={COMPACT_DN.cx}
                      y={COMPACT_DN.cy + 17}
                      textAnchor="middle"
                      className="font-mono text-[10px] font-bold fill-blue-700"
                    >
                      Meta: {targetMajority} esc.
                    </text>
                  </>
                )}
              </g>
            </svg>
          </div>
        </div>

        {/* Majority Status Card */}
        <div
          className={`p-2.5 rounded-xl border transition-all ${
            isRightMajority
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/70 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between font-mono">
            <span className="text-[11px] font-bold flex items-center gap-1">
              {isRightMajority ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              )}
              Bloque Derechas
            </span>
            <span className="font-extrabold text-sm tabular-nums">
              {rightSeats} <span className="text-[10px] font-normal text-slate-500">/ {totalSeats}</span>
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-600">
              {isRightMajority
                ? `Mayoría ${targetMajority} superada (+${rightSeats - targetMajority})`
                : `Faltan ${targetMajority - rightSeats} para mayoría`}
            </span>
            <span className="font-bold">
              {((rightSeats / totalSeats) * 100).toFixed(1)}%
            </span>
          </div>

          {/* Mini progress bar toward 133 */}
          <div className="mt-1.5 w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 ${
                isRightMajority ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, (rightSeats / targetMajority) * 100)}%` }}
            />
            {/* 133 marker */}
            <div
              className="absolute top-0 bottom-0 w-[1.5px] bg-slate-900 z-10"
              style={{ left: `${(targetMajority / totalSeats) * 100}%` }}
              title={`Meta: ${targetMajority}`}
            />
          </div>
        </div>

        {/* Party Seats List Header */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 pb-1.5 border-b border-slate-100 uppercase tracking-wider">
            <span>Partido</span>
            <div className="flex items-center gap-3">
              <span>2026</span>
              <span>vs 23</span>
            </div>
          </div>

          {/* Real-time Party Rows */}
          <div className="divide-y divide-slate-100 mt-0.5">
            {rankedParties.map(p => {
              const s26 = result.seats[p] || 0;
              const s23 = result.baseSeats[p] || 0;
              const diff = s26 - s23;
              const color = PARTY_COLORS[p] || '#64748b';
              const pctOfChamber = ((s26 / totalSeats) * 100).toFixed(1);
              const isSelected = selectedBloc.has(p);
              const isHovered = hoveredParty === p;

              return (
                <div
                  key={p}
                  onMouseEnter={() => setHoveredParty(p)}
                  onMouseLeave={() => setHoveredParty(null)}
                  onClick={() => onTogglePartyInBloc(p)}
                  className={`py-1.5 px-1.5 rounded-lg transition-colors cursor-pointer flex flex-col gap-1 ${
                    isHovered
                      ? 'bg-slate-100/90'
                      : isSelected
                      ? 'bg-blue-50/50'
                      : 'hover:bg-slate-50'
                  }`}
                  title={`${PARTY_NAMES[p] || p}: ${s26} escaños (Haz clic para alternar en tu coalición)`}
                >
                  <div className="flex items-center justify-between">
                    {/* Party Tag & Color Dot */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="font-bold text-xs truncate"
                        style={{ color }}
                      >
                        {p === 'UPN' ? 'UPN-PP' : p}
                      </span>
                      {s26 > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          {pctOfChamber}%
                        </span>
                      )}
                    </div>

                    {/* Seats & Diff */}
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="font-extrabold text-xs text-slate-900 tabular-nums">
                        {s26}
                      </span>

                      {/* Diff Badge */}
                      <span className="w-11 text-right">
                        {diff > 0 ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            +{diff}
                          </span>
                        ) : diff < 0 ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                            {diff}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            =
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Relative bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${(s26 / totalSeats) * 100}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Blocs Breakdown Box */}
        <div className="pt-2 border-t border-slate-100">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider block">
              Bloques Ideológicos
            </span>

            <div className="space-y-1.5 font-mono text-xs">
              {/* Right Bloc */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Derechas (PP+UPN+VOX+Sa Unió)
                </span>
                <span className="font-extrabold text-blue-900 tabular-nums">
                  {rightSeats}
                </span>
              </div>

              {/* Progressive Bloc */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-rose-600" />
                  Izquierda (SdP+PSOE+FA)
                </span>
                <span className="font-extrabold text-rose-900 tabular-nums">
                  {progSeats}
                </span>
              </div>

              {/* Other Nationalists / Regionalists */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Nacionalistas y otros
                </span>
                <span className="font-extrabold text-slate-700 tabular-nums">
                  {Math.max(0, totalSeats - rightSeats - progSeats)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP VIEW: Sticky Right Column that stays fixed on screen while scrolling */}
      <aside
        className={`hidden lg:block shrink-0 self-stretch transition-all duration-300 z-30 ${
          isCollapsed ? 'w-10' : 'w-64 xl:w-72 2xl:w-80'
        }`}
      >
        <div className="sticky top-20 h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)] flex flex-col">
          {isCollapsed ? (
            /* Collapsed mini-strip */
            <div
              onClick={() => setIsCollapsed(false)}
              className="h-full w-full bg-white rounded-2xl border border-slate-200 shadow-md p-2 flex flex-col items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
              title="Expandir parlamento lateral"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <div className="[writing-mode:vertical-rl] rotate-180 font-mono font-bold text-xs text-slate-600 tracking-wider flex items-center gap-2">
                <span>Parlamento en Vivo</span>
                <span className="font-extrabold text-blue-700">{totalSeats} esc.</span>
              </div>
              <ChevronLeft className="h-4 w-4 text-slate-400" />
            </div>
          ) : (
            sidebarContent
          )}
        </div>
      </aside>

      {/* MOBILE / TABLET FLOATING TRIGGER PILL */}
      <div className="lg:hidden fixed bottom-5 right-4 z-40">
        <button
          onClick={onToggleMobile}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-xl shadow-slate-900/30 hover:bg-slate-800 transition-all cursor-pointer border border-slate-700"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono">
            Hemiciclo ({rightSeats} Der / {targetMajority})
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>

      {/* MOBILE / TABLET SLIDE-OVER DRAWER */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onToggleMobile}
          />
          {/* Slide-over Container */}
          <div className="relative w-full max-w-sm h-full bg-white shadow-2xl p-3 flex flex-col animate-in slide-in-from-right duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
