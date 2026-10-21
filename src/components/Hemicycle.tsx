import React, { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { ModelResult } from '../engine/senateEngine';
import { PARTY_COLORS, PARTY_NAMES, ORDER, getPartyTint } from '../data/electionData';

interface HemicycleProps {
  result: ModelResult;
  selectedBloc: Set<string>;
  onTogglePartyInBloc: (party: string) => void;
  targetMajority: number;
}

const DN = { cx: 350, cy: 330, ro: 290, ri: 220, qo: 205, qi: 185 };

function pt(r: number, f: number): [number, number] {
  const a = Math.PI * (1 - f);
  return [DN.cx + r * Math.cos(a), DN.cy - r * Math.sin(a)];
}

function arcPath(f1: number, f2: number, ro: number, ri: number): string {
  if (f2 - f1 < 1e-4) return '';
  const [a, b] = pt(ro, f1);
  const [c, d] = pt(ro, f2);
  const [e, f] = pt(ri, f2);
  const [g, h] = pt(ri, f1);
  return `M${a} ${b}A${ro} ${ro} 0 0 1 ${c} ${d}L${e} ${f}A${ri} ${ri} 0 0 0 ${g} ${h}Z`;
}

export const Hemicycle: React.FC<HemicycleProps> = ({
  result,
  selectedBloc,
  onTogglePartyInBloc,
  targetMajority
}) => {
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Animated values storage for GSAP interpolation
  const animatedValuesRef = useRef<Record<string, number>>({});
  const animatedBaseValuesRef = useRef<Record<string, number>>({});
  const [, setTick] = useState(0);

  // Ordered parties present in seats or baseSeats
  const orderedParties = useMemo(() => {
    const present = new Set([
      ...Object.keys(result.seats).filter(p => (result.seats[p] || 0) > 0),
      ...Object.keys(result.baseSeats).filter(p => (result.baseSeats[p] || 0) > 0)
    ]);
    const list = ORDER.filter(p => present.has(p));
    present.forEach(p => {
      if (!list.includes(p)) list.push(p);
    });
    return list;
  }, [result.seats, result.baseSeats]);

  // GSAP animation on seat changes
  useEffect(() => {
    const currentObj = { ...animatedValuesRef.current };
    const currentBaseObj = { ...animatedBaseValuesRef.current };

    const targetObj: Record<string, number> = {};
    const targetBaseObj: Record<string, number> = {};

    orderedParties.forEach(p => {
      targetObj[p] = result.seats[p] || 0;
      targetBaseObj[p] = result.baseSeats[p] || 0;
      if (currentObj[p] == null) currentObj[p] = targetObj[p];
      if (currentBaseObj[p] == null) currentBaseObj[p] = targetBaseObj[p];
    });

    const tween = gsap.to(currentObj, {
      ...targetObj,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        animatedValuesRef.current = { ...currentObj };
        setTick(t => t + 1);
      }
    });

    const baseTween = gsap.to(currentBaseObj, {
      ...targetBaseObj,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        animatedBaseValuesRef.current = { ...currentBaseObj };
      }
    });

    return () => {
      tween.kill();
      baseTween.kill();
    };
  }, [result.seats, result.baseSeats, orderedParties]);

  // Compute geometry arcs
  const total26 = result.totalSeats || 209;
  const total23 = Object.values(result.baseSeats).reduce((a, b) => a + b, 0) || 208;

  const currentValues = animatedValuesRef.current;
  const currentBaseValues = animatedBaseValuesRef.current;

  let acc26 = 0;
  const arcs26 = orderedParties.map(p => {
    const val = currentValues[p] != null ? currentValues[p] : (result.seats[p] || 0);
    const startF = acc26 / total26;
    const endF = (acc26 + val) / total26;
    acc26 += val;
    return {
      party: p,
      val: result.seats[p] || 0,
      path: arcPath(startF, endF, DN.ro, DN.ri),
      color: PARTY_COLORS[p] || '#64748b'
    };
  });

  let acc23 = 0;
  const arcs23 = orderedParties.map(p => {
    const val = currentBaseValues[p] != null ? currentBaseValues[p] : (result.baseSeats[p] || 0);
    const startF = acc23 / total23;
    const endF = (acc23 + val) / total23;
    acc23 += val;
    return {
      party: p,
      val: result.baseSeats[p] || 0,
      path: arcPath(startF, endF, DN.qo, DN.qi),
      color: PARTY_COLORS[p] || '#64748b'
    };
  });

  // Threshold ticks
  const absMaj = Math.floor(total26 / 2) + 1; // 105
  const threeFifths = Math.ceil((total26 * 3) / 5); // 126
  const ticksList = [
    { val: absMaj, label: 'Absoluta' },
    { val: threeFifths, label: '3/5' }
  ];
  if (targetMajority !== absMaj && targetMajority !== threeFifths) {
    ticksList.push({ val: targetMajority, label: `Objetivo ${targetMajority}` });
  }
  ticksList.sort((a, b) => a.val - b.val);

  // Active party info for center
  const activeParty = hoveredParty;
  const activeSeats = activeParty ? (result.seats[activeParty] || 0) : null;
  const activeBaseSeats = activeParty ? (result.baseSeats[activeParty] || 0) : null;
  const activeDelta = (activeSeats ?? 0) - (activeBaseSeats ?? 0);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hemicycle SVG Container */}
      <div className="relative w-full max-w-2xl px-2">
        <svg
          ref={svgRef}
          viewBox="0 0 700 375"
          className="w-full h-auto overflow-visible select-none drop-shadow-sm"
          role="img"
          aria-label="Hemiciclo del Senado: anillo exterior 2026, anillo interior 2023"
        >
          <defs>
            <filter id="arcGlowLight" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* Inner ring: 2023 results */}
          <g>
            {arcs23.map(a => {
              const isHovered = hoveredParty === a.party;
              const isDimmed = hoveredParty !== null && !isHovered;
              return (
                <path
                  key={`base-${a.party}`}
                  d={a.path}
                  fill={a.color}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  opacity={isDimmed ? 0.15 : isHovered ? 0.85 : 0.45}
                  className="transition-opacity duration-200"
                >
                  <title>{`${a.party} (2023): ${a.val} escaños`}</title>
                </path>
              );
            })}
          </g>

          {/* Outer ring: 2026 projection */}
          <g>
            {arcs26.map(a => {
              const isHovered = hoveredParty === a.party;
              const isDimmed = hoveredParty !== null && !isHovered;
              const isSelected = selectedBloc.has(a.party);

              return (
                <path
                  key={`proj-${a.party}`}
                  d={a.path}
                  fill={a.color}
                  stroke={isSelected ? '#0f172a' : '#ffffff'}
                  strokeWidth={isSelected ? 3 : 2}
                  opacity={isDimmed ? 0.2 : 1}
                  filter={isHovered ? 'url(#arcGlowLight)' : undefined}
                  className="cursor-pointer transition-all duration-150 focus:outline-none"
                  onMouseEnter={() => setHoveredParty(a.party)}
                  onMouseLeave={() => setHoveredParty(null)}
                  onClick={() => onTogglePartyInBloc(a.party)}
                  tabIndex={0}
                  onFocus={() => setHoveredParty(a.party)}
                  onBlur={() => setHoveredParty(null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onTogglePartyInBloc(a.party);
                    }
                  }}
                >
                  <title>{`${a.party} (2026): ${a.val} escaños`}</title>
                </path>
              );
            })}
          </g>

          {/* Majority threshold markers / ticks */}
          <g>
            {ticksList.map(t => {
              const f = t.val / total26;
              const [x1, y1] = pt(DN.ro + 4, f);
              const [x2, y2] = pt(DN.ro + 18, f);
              const [tx, ty] = pt(DN.ro + 34, f);
              const isTarget = t.val === targetMajority;

              return (
                <g key={`tick-${t.val}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isTarget ? '#a9741a' : '#64748b'}
                    strokeWidth={isTarget ? 2.5 : 1.5}
                    strokeDasharray={isTarget ? undefined : '2,2'}
                  />
                  <text
                    x={tx}
                    y={ty + 4}
                    textAnchor="middle"
                    fill={isTarget ? '#a9741a' : '#475569'}
                    className="font-mono text-[12px] font-bold"
                  >
                    {t.val}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Center Display (Light Mode with high-contrast party colors) */}
          <g className="pointer-events-none select-none">
            {activeParty ? (
              <>
                <text
                  x={DN.cx}
                  y={DN.cy - 52}
                  textAnchor="middle"
                  fill={PARTY_COLORS[activeParty] || '#0f172a'}
                  className="font-mono text-5xl font-extrabold tracking-tight"
                >
                  {activeSeats}
                </text>
                <text
                  x={DN.cx}
                  y={DN.cy - 24}
                  textAnchor="middle"
                  fill="#0f172a"
                  className="text-base font-bold"
                >
                  {PARTY_NAMES[activeParty] || activeParty}
                </text>
                <text
                  x={DN.cx}
                  y={DN.cy - 2}
                  textAnchor="middle"
                  fill="#64748b"
                  className="text-xs font-mono font-medium"
                >
                  {total26 > 0 ? `${((activeSeats! / total26) * 100).toFixed(1)} % del Senado` : ''} ·{' '}
                  <tspan
                    fill={activeDelta > 0 ? '#15803d' : activeDelta < 0 ? '#b91c1c' : '#64748b'}
                    fontWeight="bold"
                  >
                    {activeDelta > 0 ? `+${activeDelta}` : activeDelta} vs 2023
                  </tspan>
                </text>
              </>
            ) : (
              <>
                <text
                  x={DN.cx}
                  y={DN.cy - 52}
                  textAnchor="middle"
                  fill="#0f172a"
                  className="font-mono text-5xl font-extrabold tracking-tight"
                >
                  209
                </text>
                <text
                  x={DN.cx}
                  y={DN.cy - 24}
                  textAnchor="middle"
                  fill="#1e293b"
                  className="text-base font-bold tracking-tight"
                >
                  Senadores Electos
                </text>
                <text
                  x={DN.cx}
                  y={DN.cy - 2}
                  textAnchor="middle"
                  fill="#64748b"
                  className="text-xs"
                >
                  Toca un partido para sumarlo a tu mayoría
                </text>
              </>
            )}
          </g>
        </svg>

        {/* Caption below svg */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-mono px-2">
          <span>Anillo exterior: 2026</span>
          <div className="flex items-center gap-3">
            {ticksList.map(t => (
              <span key={t.val} className={t.val === targetMajority ? 'text-brass font-bold' : ''}>
                {t.val} {t.label.toLowerCase()}
              </span>
            ))}
          </div>
          <span>Anillo interior: 2023</span>
        </div>
      </div>

      {/* Interactive Legend & Party Filter Chips with Party Color Accents */}
      <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-4xl px-2">
        {orderedParties
          .filter(p => (result.seats[p] || 0) > 0)
          .sort((a, b) => (result.seats[b] || 0) - (result.seats[a] || 0))
          .map(p => {
            const seats = result.seats[p] || 0;
            const isSelected = selectedBloc.has(p);
            const isHovered = hoveredParty === p;
            const partyColor = PARTY_COLORS[p] || '#64748b';

            return (
              <button
                key={p}
                onClick={() => onTogglePartyInBloc(p)}
                onMouseEnter={() => setHoveredParty(p)}
                onMouseLeave={() => setHoveredParty(null)}
                style={{
                  backgroundColor: isSelected ? getPartyTint(p, 0.16) : isHovered ? getPartyTint(p, 0.08) : '#ffffff',
                  borderColor: isSelected ? partyColor : isHovered ? partyColor : '#e2e8f0',
                  color: isSelected ? partyColor : '#1e293b'
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border shadow-xs ${
                  isSelected ? 'ring-2 ring-offset-1' : ''
                }`}
                title={`Haz clic para sumar o restar a ${p} del bloque de mayoría`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs transition-transform group-hover:scale-125"
                  style={{ backgroundColor: partyColor }}
                />
                <span className="font-mono font-bold text-sm tabular-nums" style={{ color: partyColor }}>
                  {seats}
                </span>
                <span className="font-medium text-slate-800">{p}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
};
