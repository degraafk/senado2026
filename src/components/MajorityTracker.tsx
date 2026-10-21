import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertCircle, ShieldCheck, Trophy, X } from 'lucide-react';
import { ModelResult } from '../engine/senateEngine';
import { PARTY_COLORS, PARTY_NAMES, getPartyTint, ORDER } from '../data/electionData';

interface MajorityTrackerProps {
  result: ModelResult;
  selectedBloc: Set<string>;
  onTogglePartyInBloc: (party: string) => void;
  onSetBloc: (parties: string[]) => void;
  targetMajority: number;
  onTargetMajorityChange: (val: number) => void;
}

export const MajorityTracker: React.FC<MajorityTrackerProps> = ({
  result,
  selectedBloc,
  onTogglePartyInBloc,
  onSetBloc,
  targetMajority,
  onTargetMajorityChange
}) => {
  const totalSeats = result.totalSeats || 209;
  const absMaj = Math.floor(totalSeats / 2) + 1; // 105
  const threeFifths = Math.ceil((totalSeats * 3) / 5); // 126

  // Sum seats in selected bloc
  const blocParties = Array.from(selectedBloc).sort((a, b) => {
    return (result.seats[b] || 0) - (result.seats[a] || 0);
  });
  const blocSeats = blocParties.reduce((sum, p) => sum + (result.seats[p] || 0), 0);
  const blocPct = totalSeats > 0 ? (blocSeats / totalSeats) * 100 : 0;

  const isTargetReached = blocSeats >= targetMajority;
  const isAbsReached = blocSeats >= absMaj;
  const isThreeFifthsReached = blocSeats >= threeFifths;

  // Animated counter using GSAP
  const [displaySeats, setDisplaySeats] = useState(blocSeats);
  const countRef = useRef({ val: blocSeats });

  useEffect(() => {
    const tween = gsap.to(countRef.current, {
      val: blocSeats,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplaySeats(Math.round(countRef.current.val));
      }
    });

    return () => {
      tween.kill();
    };
  }, [blocSeats]);

  const prevReachedRef = useRef(false);

  // Trigger celebratory confetti when 133 target is reached
  useEffect(() => {
    if (isTargetReached && !prevReachedRef.current && blocSeats > 0) {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#1e68d7', '#15803d', '#d97706', '#be123c']
      });
    }
    prevReachedRef.current = isTargetReached;
  }, [isTargetReached, blocSeats]);

  // Pre-configured coalitions with their primary party colors
  const coalitionPresets = [
    {
      name: 'PP en Solitario',
      parties: ['PP'],
      color: PARTY_COLORS['PP']
    },
    {
      name: 'Bloque Derechas (PP + UPN-PP + VOX + Sa Unió)',
      parties: ['PP', 'UPN', 'VOX', 'Sa Unió'],
      color: PARTY_COLORS['PP']
    },
    {
      name: 'Bloque Investidura (SdP + Periféricos)',
      parties: ['SdP', 'PSOE', 'PSC', 'Frente Amplio', 'EH Bildu', 'PNV', 'ERC', 'BNG'],
      color: PARTY_COLORS['SdP']
    },
    {
      name: 'SdP + PNV + Junts',
      parties: ['SdP', 'PSOE', 'PSC', 'PNV', 'Junts'],
      color: PARTY_COLORS['Junts']
    }
  ];

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header with Title and Target Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Control de Mayorías en el Senado
            </h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-mono font-bold text-blue-700 border border-blue-200">
              Objetivo: {targetMajority} escaños
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Comprueba si una formación o pacto alcanza la <strong>mayoría de 133 escaños</strong> para el control absoluto del Senado.
          </p>
        </div>

        {/* Quick majority threshold buttons */}
        <div className="flex items-center gap-1.5 self-start md:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onTargetMajorityChange(105)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer ${
              targetMajority === 105
                ? 'bg-white text-blue-700 font-bold shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Mayoría absoluta de senadores electos (105)"
          >
            105 (Absoluta)
          </button>
          <button
            onClick={() => onTargetMajorityChange(126)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer ${
              targetMajority === 126
                ? 'bg-white text-blue-700 font-bold shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Tres quintos para nombramientos (126)"
          >
            126 (3/5)
          </button>
          <button
            onClick={() => onTargetMajorityChange(133)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer ${
              targetMajority === 133
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Mayoría específica objetivo de 133 senadores"
          >
            133 (Objetivo)
          </button>
        </div>
      </div>

      {/* Main Metric & Status Row */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Metric Card */}
        <div className="md:col-span-5 flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
              Escaños de tu coalición
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-4xl font-extrabold text-slate-900 tabular-nums">
                {displaySeats}
              </span>
              <span className="text-sm font-mono text-slate-500">
                / {totalSeats} ({blocPct.toFixed(1)} %)
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            {isTargetReached ? (
              <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold">
                  Mayoría {targetMajority} superada (+{blocSeats - targetMajority})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold">
                  Faltan {targetMajority - blocSeats} para {targetMajority}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Milestone Badges */}
        <div className="md:col-span-7 grid grid-cols-3 gap-2.5 text-xs">
          <div
            className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
              isAbsReached
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-800">Absoluta (105)</span>
              {isAbsReached ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : (
                <span className="font-mono text-[10px] text-slate-400">
                  -{105 - blocSeats}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium">
              {isAbsReached ? 'Alcanzada' : 'No alcanzada'}
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
              isThreeFifthsReached
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-800">Tres quintos (126)</span>
              {isThreeFifthsReached ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : (
                <span className="font-mono text-[10px] text-slate-400">
                  -{126 - blocSeats}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium">
              {isThreeFifthsReached ? 'Alcanzada' : 'No alcanzada'}
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
              isTargetReached
                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900">Objetivo ({targetMajority})</span>
              {isTargetReached ? (
                <Trophy className="h-4 w-4 text-amber-500" />
              ) : (
                <span className="font-mono text-[10px] text-amber-700 font-bold">
                  -{targetMajority - blocSeats}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold">
              {isTargetReached ? '¡Objetivo alcanzado!' : 'Pendiente'}
            </span>
          </div>
        </div>
      </div>

      {/* Party-Colored Segmented Progress Bar */}
      <div className="mt-7 pt-1">
        <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 flex">
          {/* Multi-Party Segments */}
          {blocParties.map(p => {
            const seats = result.seats[p] || 0;
            const pct = (seats / totalSeats) * 100;
            const color = PARTY_COLORS[p] || '#64748b';

            if (seats <= 0) return null;

            return (
              <div
                key={p}
                className="h-full transition-all duration-300 relative group cursor-pointer"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color
                }}
                title={`${p}: ${seats} escaños (${pct.toFixed(1)}%)`}
              />
            );
          })}

          {/* Marker: 105 */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-slate-400 z-10 pointer-events-none"
            style={{ left: `${(105 / totalSeats) * 100}%` }}
          />

          {/* Marker: 126 */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-slate-400 z-10 pointer-events-none"
            style={{ left: `${(126 / totalSeats) * 100}%` }}
          />

          {/* Marker: Target 133 */}
          <div
            className="absolute top-[-2px] bottom-[-2px] w-[2.5px] bg-amber-500 z-20 pointer-events-none shadow-xs"
            style={{ left: `${(targetMajority / totalSeats) * 100}%` }}
          />
        </div>

        {/* Labels below the bar */}
        <div className="relative h-6 w-full text-[11px] font-mono text-slate-500 mt-1">
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${(105 / totalSeats) * 100}%` }}
          >
            105 (Abs)
          </span>
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${(126 / totalSeats) * 100}%` }}
          >
            126 (3/5)
          </span>
          <span
            className="absolute -translate-x-1/2 font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-300"
            style={{ left: `${(targetMajority / totalSeats) * 100}%` }}
          >
            Meta {targetMajority}
          </span>
        </div>
      </div>

      {/* Coalition Parties Chips & Presets */}
      <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
        {/* Parties in Active Bloc */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-semibold text-slate-500 mr-1">Partidos en el bloque:</span>
          {selectedBloc.size === 0 ? (
            <span className="text-xs italic text-slate-400">
              Ningún partido seleccionado (haz clic en los botones de pactos o en el hemiciclo)
            </span>
          ) : (
            blocParties.map(p => {
              const partyColor = PARTY_COLORS[p] || '#64748b';
              const seats = result.seats[p] || 0;

              return (
                <span
                  key={p}
                  style={{
                    backgroundColor: getPartyTint(p, 0.12),
                    borderColor: partyColor,
                    color: partyColor
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: partyColor }}
                  />
                  <span>{p}</span>
                  <span className="font-mono text-slate-700 font-bold text-[11px]">
                    ({seats})
                  </span>
                  <button
                    onClick={() => onTogglePartyInBloc(p)}
                    className="hover:opacity-75 cursor-pointer ml-1"
                    title={`Quitar a ${p}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>

        {/* Quick coalition preset buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1 hidden sm:inline">Pactos:</span>
          {coalitionPresets.map(c => (
            <button
              key={c.name}
              onClick={() => onSetBloc(c.parties)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              {c.name}
            </button>
          ))}
          {selectedBloc.size > 0 && (
            <button
              onClick={() => onSetBloc([])}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Vaciar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
