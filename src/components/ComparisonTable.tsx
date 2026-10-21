import React from 'react';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Flag } from 'lucide-react';
import { ModelResult } from '../engine/senateEngine';
import { PARTY_COLORS, PARTY_NAMES, ORDER, getPartyTint } from '../data/electionData';

interface ComparisonTableProps {
  result: ModelResult;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ result }) => {
  const allParties = Array.from(
    new Set([
      ...Object.keys(result.seats).filter(p => (result.seats[p] || 0) > 0),
      ...Object.keys(result.baseSeats).filter(p => (result.baseSeats[p] || 0) > 0)
    ])
  ).sort((a, b) => {
    const seatA = result.seats[a] || 0;
    const seatB = result.seats[b] || 0;
    if (seatB !== seatA) return seatB - seatA;
    const orderA = ORDER.indexOf(a);
    const orderB = ORDER.indexOf(b);
    return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
  });

  const maxSeats = Math.max(
    ...allParties.map(p => Math.max(result.seats[p] || 0, result.baseSeats[p] || 0)),
    1
  );

  // Progressive bloc aggregated row (SdP, PSOE, PSC, Frente Amplio)
  const progParties = ['SdP', 'PSOE', 'PSC', 'Frente Amplio'];
  const prog26 = progParties.reduce((acc, p) => acc + (result.seats[p] || 0), 0);
  const prog23 = progParties.reduce((acc, p) => acc + (result.baseSeats[p] || 0), 0);
  const progDiff = prog26 - prog23;

  // Right-wing bloc aggregated row (PP + UPN-PP + VOX + Sa Unió)
  // Sa Unió is independent list in Formentera; UPN-PP is joint coalition in Navarra
  const rightParties = ['PP', 'UPN', 'VOX', 'Sa Unió'];
  const right26 = rightParties.reduce((acc, p) => acc + (result.seats[p] || 0), 0);
  const right23 = rightParties.reduce((acc, p) => acc + (result.baseSeats[p] || 0), 0);
  const rightDiff = right26 - right23;

  const totalSeats = result.totalSeats || 209;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="pb-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Comparativa de Escaños: 2026 vs 2023 Real
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Diferencia de senadores respecto a las elecciones del 23-J de 2023 (208 escaños en 2023, 209 en 2026 por la segregación de Formentera).
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-slate-200 text-slate-500 font-mono bg-white">
              <th className="py-2.5 px-3">Partido Político</th>
              <th className="py-2.5 px-3 text-right">Proyección 2026</th>
              <th className="py-2.5 px-3 text-right">Real 2023</th>
              <th className="py-2.5 px-3 text-right">Diferencia</th>
              <th className="py-2.5 px-3 text-left pl-6 hidden sm:table-cell">Distribución Relativa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {allParties.map(party => {
              const s26 = result.seats[party] || 0;
              const s23 = result.baseSeats[party] || 0;
              const diff = s26 - s23;
              const partyColor = PARTY_COLORS[party] || '#64748b';
              const pctOfTotal = ((s26 / totalSeats) * 100).toFixed(1);

              return (
                <tr key={party} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: partyColor }}
                      />
                      <span
                        className="font-sans font-bold text-sm"
                        style={{ color: partyColor }}
                      >
                        {party === 'UPN' ? 'UPN-PP' : party}
                      </span>
                      <span className="hidden md:inline text-xs font-sans text-slate-500">
                        · {PARTY_NAMES[party] || party}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-slate-900 text-sm tabular-nums">
                    {s26}
                    <span className="text-[11px] text-slate-400 font-normal ml-1">
                      ({pctOfTotal}%)
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                    {s23}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {diff > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                        +{diff}
                      </span>
                    ) : diff < 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <TrendingDown className="h-3 w-3 text-rose-600" />
                        {diff}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-slate-400">
                        <Minus className="h-3 w-3" />0
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 pl-6 hidden sm:table-cell">
                    <div className="w-full max-w-[200px] h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(s26 / maxSeats) * 100}%`,
                          backgroundColor: partyColor
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Combined Progressive Row */}
            <tr className="bg-rose-50/40 font-semibold border-t-2 border-slate-300">
              <td className="py-3.5 px-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: PARTY_COLORS['SdP'] }}
                  />
                  <span className="font-sans text-rose-950 text-xs font-bold">
                    Bloque Progresista (PSOE + Frente Amplio / SdP / PSC)
                  </span>
                </div>
              </td>
              <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 text-sm tabular-nums">
                {prog26}
                <span className="text-[11px] text-slate-500 font-normal ml-1">
                  ({((prog26 / totalSeats) * 100).toFixed(1)}%)
                </span>
              </td>
              <td className="py-3.5 px-3 text-right text-slate-600 tabular-nums">
                {prog23}
              </td>
              <td className="py-3.5 px-3 text-right tabular-nums">
                {progDiff > 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    +{progDiff}
                  </span>
                ) : progDiff < 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    <TrendingDown className="h-3 w-3 text-rose-600" />
                    {progDiff}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-slate-400">
                    <Minus className="h-3 w-3" />0
                  </span>
                )}
              </td>
              <td className="py-3.5 px-3 pl-6 hidden sm:table-cell">
                <div className="w-full max-w-[200px] h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(prog26 / maxSeats) * 100}%`,
                      backgroundColor: PARTY_COLORS['SdP']
                    }}
                  />
                </div>
              </td>
            </tr>

            {/* Combined Right-Wing Row (PP + UPN-PP + VOX + Sa Unió) */}
            <tr className="bg-blue-50/40 font-semibold border-t border-slate-200">
              <td className="py-3.5 px-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: PARTY_COLORS['PP'] }}
                  />
                  <div className="flex flex-col">
                    <span className="font-sans text-blue-950 text-xs font-bold">
                      Bloque de Derechas (PP + UPN-PP + VOX + Sa Unió)
                    </span>
                    <span className="font-sans text-[10px] text-slate-500 font-normal">
                      Incluye coalición UPN-PP en Navarra y Sa Unió en Formentera
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 text-sm tabular-nums">
                {right26}
                <span className="text-[11px] text-slate-500 font-normal ml-1">
                  ({((right26 / totalSeats) * 100).toFixed(1)}%)
                </span>
              </td>
              <td className="py-3.5 px-3 text-right text-slate-600 tabular-nums">
                {right23}
              </td>
              <td className="py-3.5 px-3 text-right tabular-nums">
                {rightDiff > 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    +{rightDiff}
                  </span>
                ) : rightDiff < 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    <TrendingDown className="h-3 w-3 text-rose-600" />
                    {rightDiff}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-slate-400">
                    <Minus className="h-3 w-3" />0
                  </span>
                )}
              </td>
              <td className="py-3.5 px-3 pl-6 hidden sm:table-cell">
                <div className="w-full max-w-[200px] h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(right26 / maxSeats) * 100}%`,
                      backgroundColor: PARTY_COLORS['PP']
                    }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
