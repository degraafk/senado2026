import React, { useState, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { ModelInput, ModelResult } from '../engine/senateEngine';
import {
  BASEDATA, NATIONAL_PARTIES, DIRECT_PARTIES, PARTY_COLORS, getPartyTint,
  formatConstituencyName, getConstituencyCCAA
} from '../data/electionData';
import { computeRightWingRiskAnalysis } from '../engine/riskAnalysis';
import { CARD, Pill, SearchBox, dec } from './ui';

interface ControlPanelProps {
  input: ModelInput;
  result: ModelResult;
  onChange: (newInput: ModelInput) => void;
  onReset: () => void;
  onToggleVoxWithdraw?: (constituencyName: string) => void;
  onSetVoxWithdraw?: (constituencies: string[]) => void;
}

const track = (v: number, max: number, color: string) =>
  ({
    '--thumb-color': color,
    background: `linear-gradient(to right, ${color} ${(v / max) * 100}%, #d9dcd6 ${(v / max) * 100}%)`
  }) as React.CSSProperties;

const H3: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div className="mb-3">
    <h3 className="text-lg font-semibold text-slate-950">{children}</h3>
    {hint && <p className="text-sm text-slate-500">{hint}</p>}
  </div>
);

export const ControlPanel: React.FC<ControlPanelProps> = ({
  input, result, onChange, onToggleVoxWithdraw, onSetVoxWithdraw
}) => {
  const [showDirect, setShowDirect] = useState(false);
  const [voxSearch, setVoxSearch] = useState('');

  const baseMult: Record<string, number | 'n/d'> = {};
  BASEDATA.mult.forEach(m => { baseMult[m.g] = m.b; });

  const setPct = (party: string, val: number) => {
    const v = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    onChange({ ...input, pct: { ...input.pct, [party]: v / 100 } });
  };
  const setDirect = (party: string, val: number) =>
    onChange({ ...input, direct: { ...input.direct, [party]: Math.max(0, isNaN(val) ? 1 : val) } });

  const totalPct = NATIONAL_PARTIES.reduce((s, p) => s + (input.pct[p] || 0), 0);
  const sdpPct = ((input.pct.PSOE || 0) + (input.pct['Frente Amplio'] || 0)) * 100;
  const voxSet = useMemo(() => new Set(input.voxWithdraw || []), [input.voxWithdraw]);

  const circs = useMemo(
    () => result.cons.map(c => ({
      name: c.name,
      clean: formatConstituencyName(c.name),
      hasVox: c.list.some(x => x.g === 'VOX')
    })),
    [result.cons]
  );

  const grouped = useMemo(() => {
    const q = voxSearch.toLowerCase().trim();
    const groups: Record<string, typeof circs> = {};
    circs
      .filter(c => !q || c.clean.toLowerCase().includes(q) || getConstituencyCCAA(c.name).toLowerCase().includes(q))
      .forEach(c => { (groups[getConstituencyCCAA(c.name)] ||= []).push(c); });
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
      .map(ccaa => ({ ccaa, items: groups[ccaa].sort((a, b) => a.clean.localeCompare(b.clean, 'es', { sensitivity: 'base' })) }));
  }, [circs, voxSearch]);

  const setWithdrawn = (names: string[]) =>
    onSetVoxWithdraw ? onSetVoxWithdraw(names) : onChange({ ...input, voxWithdraw: names });
  const toggleVox = (name: string) => {
    if (onToggleVoxWithdraw) return onToggleVoxWithdraw(name);
    const cur = new Set(input.voxWithdraw || []);
    cur.has(name) ? cur.delete(name) : cur.add(name);
    onChange({ ...input, voxWithdraw: Array.from(cur) });
  };
  const addWithdrawn = (names: string[]) => setWithdrawn(Array.from(new Set([...(input.voxWithdraw || []), ...names])));

  const critical = () =>
    addWithdrawn(computeRightWingRiskAnalysis(result).rightWinningList.filter(p => p.riskCategory === 'critical' && p.hasVoxCandidates).map(p => p.name));
  const leftWins = () =>
    addWithdrawn(computeRightWingRiskAnalysis(result).leftWinningList.filter(p => p.hasVoxCandidates).map(p => p.name));
  const all = () => setWithdrawn(circs.filter(c => c.hasVox).map(c => c.name));

  const X = Math.round(input.X * 100);
  const Y = Math.round(input.Y * 100);
  const overHundred = totalPct > 1.005;

  return (
    <div className={`${CARD} space-y-8`}>
      {/* 1. National vote */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Ajusta el voto</h2>
            <p className="text-sm text-slate-500">Porcentaje nacional de cada partido en 2026. Entre paréntesis, el de 2023.</p>
          </div>
          <span className={`text-sm font-semibold tabular-nums ${overHundred ? 'text-brass' : 'text-slate-600'}`}>
            Suma {dec(totalPct * 100, 1)} %{overHundred && ' (pasa del 100 %)'}
          </span>
        </div>

        <div className="grid gap-x-12 md:grid-cols-2">
          {NATIONAL_PARTIES.map(party => {
            const cur = (input.pct[party] || 0) * 100;
            const b = baseMult[party];
            const base = typeof b === 'number' ? b * 100 : null;
            const color = PARTY_COLORS[party] || '#667068';
            const max = base && base > 5 ? 50 : 6;
            return (
              <div key={party} className="grid grid-cols-[minmax(0,5.5rem)_1fr_4rem_3rem] items-center gap-3 border-b border-slate-100 py-2">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    {party}
                  </span>
                  {base !== null && <span className="block pl-[18px] text-[11px] text-slate-400">({dec(base, 1)})</span>}
                </span>
                <input
                  type="range" min="0" max={max} step="0.1" value={Math.min(cur, max)}
                  onChange={e => setPct(party, parseFloat(e.target.value))}
                  className="custom-range-slider" style={track(Math.min(cur, max), max, color)}
                  aria-label={`Porcentaje de ${party}`}
                />
                <span className="flex items-center justify-end gap-0.5">
                  <input
                    type="number" step="0.1" min="0" max="100" value={+cur.toFixed(1)}
                    onChange={e => setPct(party, parseFloat(e.target.value))}
                    className="w-12 rounded-md border border-slate-200 px-1 py-0.5 text-right text-sm font-semibold tabular-nums"
                    aria-label={`${party} en %`}
                  />
                  <span className="text-xs text-slate-400">%</span>
                </span>
                <span className="text-right text-xs tabular-nums text-slate-500" title="Cambio respecto a 2023">
                  ×{dec(result.mult[party] || 1)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PARTY_COLORS['SdP'] }} />
          SdP (PSOE + Frente Amplio) se calcula solo: {dec(sdpPct, 1)} %, ×{dec(result.mult.SdP ?? 1)}.
        </p>
      </section>

      {/* 2. Tactical vote */}
      <section className="border-t border-slate-100 pt-6">
        <H3 hint="Cuántos votantes cambian su marca para que su voto sirva más.">Voto útil</H3>
        <div className="grid gap-x-12 gap-y-5 md:grid-cols-2">
          {[
            { key: 'X' as const, v: X, color: PARTY_COLORS['PP'], title: 'VOX → PP', note: 'Votantes de VOX que marcan al PP para asegurar el 3-1.' },
            { key: 'Y' as const, v: Y, color: PARTY_COLORS['PSOE'], title: 'Frente Amplio → PSOE / PSC', note: 'Solo donde van por separado: Cataluña y Canarias.' }
          ].map(s => (
            <div key={s.key}>
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.title}
                </span>
                <span className="font-display text-2xl font-semibold tabular-nums" style={{ color: s.color }}>{s.v} %</span>
              </div>
              <input
                type="range" min="0" max="100" step="1" value={s.v}
                onChange={e => onChange({ ...input, [s.key]: parseFloat(e.target.value) / 100 })}
                className="custom-range-slider" style={track(s.v, 100, s.color)} aria-label={s.title}
              />
              <p className="text-xs text-slate-500">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. VOX withdrawal */}
      <section className="border-t border-slate-100 pt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Retirada de VOX <span className="ml-1 text-sm font-normal text-slate-500 tabular-nums">{voxSet.size} provincias</span>
            </h3>
            <p className="text-sm text-slate-500">Donde VOX no se presenta, todos sus votos pasan al PP. Toca una provincia para cambiarlo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill onClick={critical} title="Plazas donde el PP puede caer a 2-2 (margen menor del 2 %)">Críticas</Pill>
            <Pill onClick={leftWins} title="Plazas donde ahora gana la izquierda">Donde gana la izquierda</Pill>
            <Pill onClick={all}>Todas</Pill>
            {voxSet.size > 0 && (
              <button onClick={() => setWithdrawn([])} className="px-1 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900 cursor-pointer">
                Quitar todas
              </button>
            )}
          </div>
        </div>

        <SearchBox value={voxSearch} onChange={setVoxSearch} placeholder="Buscar provincia" />

        <div className="mt-3 max-h-60 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {grouped.map(({ ccaa, items }) => (
            <div key={ccaa}>
              <div className="mb-1 text-xs font-semibold text-slate-500">{ccaa}</div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
                {items.map(c => {
                  const on = voxSet.has(c.name);
                  if (!c.hasVox) {
                    return (
                      <span key={c.name} className="truncate rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-400" title="No hay lista de VOX">
                        {c.clean}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={c.name}
                      onClick={() => toggleVox(c.name)}
                      aria-pressed={on}
                      style={on ? { borderColor: PARTY_COLORS['VOX'], backgroundColor: getPartyTint('VOX', 0.14) } : undefined}
                      className={`flex items-center justify-between gap-1 rounded-md border px-2 py-1 text-left text-xs cursor-pointer transition-colors ${
                        on ? 'font-semibold text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-900'
                      }`}
                    >
                      <span className="truncate">{c.clean}</span>
                      {on && <Check className="h-3 w-3 shrink-0" strokeWidth={3} style={{ color: PARTY_COLORS['VOX'] }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && <p className="py-2 text-center text-xs text-slate-500">No hay provincias con ese nombre.</p>}
        </div>
      </section>

      {/* 4. Regional parties */}
      <section className="border-t border-slate-100 pt-4">
        <button onClick={() => setShowDirect(!showDirect)} aria-expanded={showDirect} className="flex w-full items-center justify-between text-left cursor-pointer">
          <span>
            <span className="text-lg font-semibold text-slate-950 font-display">Partidos locales</span>
            <span className="ml-2 text-sm text-slate-500">sin encuesta nacional · {DIRECT_PARTIES.length} listas</span>
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showDirect ? 'rotate-180' : ''}`} />
        </button>
        {showDirect && (
          <div className="mt-3 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            {DIRECT_PARTIES.map(p => (
              <label key={p} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PARTY_COLORS[p] || '#667068' }} />
                  {p}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  ×
                  <input
                    type="number" step="0.05" min="0" value={input.direct[p] != null ? input.direct[p] : 1}
                    onChange={e => setDirect(p, parseFloat(e.target.value))}
                    className="w-16 rounded-md border border-slate-200 px-1.5 py-0.5 text-right text-sm font-semibold tabular-nums text-slate-900"
                  />
                </span>
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
