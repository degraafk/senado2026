import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Sliders,
  Info,
  Check,
  RotateCcw,
  ShieldCheck,
  Search,
  UserX
} from 'lucide-react';
import { ModelInput, ModelResult } from '../engine/senateEngine';
import {
  BASEDATA,
  NATIONAL_PARTIES,
  DIRECT_PARTIES,
  PARTY_COLORS,
  PARTY_NAMES,
  getPartyTint,
  formatConstituencyName,
  getConstituencyCCAA
} from '../data/electionData';
import { computeRightWingRiskAnalysis } from '../engine/riskAnalysis';

interface ControlPanelProps {
  input: ModelInput;
  result: ModelResult;
  onChange: (newInput: ModelInput) => void;
  onReset: () => void;
  onToggleVoxWithdraw?: (constituencyName: string) => void;
  onSetVoxWithdraw?: (constituencies: string[]) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  input,
  result,
  onChange,
  onReset,
  onToggleVoxWithdraw,
  onSetVoxWithdraw
}) => {
  const [showDirect, setShowDirect] = useState(false);
  const [showVoxSelector, setShowVoxSelector] = useState(true);
  const [voxSearch, setVoxSearch] = useState('');

  // Multipliers map from BASEDATA
  const baseMultMap: Record<string, { b: number | 'n/d' }> = {};
  BASEDATA.mult.forEach(m => {
    baseMultMap[m.g] = m;
  });

  const handlePartyPctChange = (party: string, val: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    onChange({
      ...input,
      pct: {
        ...input.pct,
        [party]: clamped / 100
      }
    });
  };

  const handleDirectFactorChange = (party: string, val: number) => {
    const clamped = Math.max(0, isNaN(val) ? 1 : val);
    onChange({
      ...input,
      direct: {
        ...input.direct,
        [party]: clamped
      }
    });
  };

  const totalSumPct = NATIONAL_PARTIES.reduce(
    (sum, p) => sum + (input.pct[p] || 0),
    0
  );

  const sdpEstimatedPct = (
    ((input.pct.PSOE || 0) + (input.pct['Frente Amplio'] || 0)) * 100
  ).toFixed(1);

  const voxWithdrawnSet = useMemo(() => new Set(input.voxWithdraw || []), [input.voxWithdraw]);

  // Constituencies list with VOX status
  const constituenciesWithVox = useMemo(() => {
    return result.cons.map(c => {
      const hasVox = c.list.some(cand => cand.g === 'VOX');
      const isWithdrawn = voxWithdrawnSet.has(c.name);
      return {
        name: c.name,
        cleanName: formatConstituencyName(c.name),
        seats: c.n,
        hasVox,
        isWithdrawn,
        diff: c.diff,
        tally: c.tally
      };
    });
  }, [result.cons, voxWithdrawnSet]);

  const filteredVoxCircs = useMemo(() => {
    const q = voxSearch.toLowerCase().trim();
    if (!q) return constituenciesWithVox;
    return constituenciesWithVox.filter(
      c =>
        c.cleanName.toLowerCase().includes(q) ||
        getConstituencyCCAA(c.name).toLowerCase().includes(q)
    );
  }, [constituenciesWithVox, voxSearch]);

  // Grouped by CCAA in alphabetical order, and inside each CCAA sorted alphabetically
  const groupedVoxByCCAA = useMemo(() => {
    const groups: Record<string, typeof constituenciesWithVox> = {};
    filteredVoxCircs.forEach(c => {
      const ccaa = getConstituencyCCAA(c.name);
      (groups[ccaa] = groups[ccaa] || []).push(c);
    });

    const sortedCCAA = Object.keys(groups).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    return sortedCCAA.map(ccaa => ({
      ccaa,
      items: groups[ccaa].sort((a, b) =>
        a.cleanName.localeCompare(b.cleanName, 'es', { sensitivity: 'base' })
      )
    }));
  }, [filteredVoxCircs]);

  const handleToggleVox = (name: string) => {
    if (onToggleVoxWithdraw) {
      onToggleVoxWithdraw(name);
    } else {
      const current = new Set(input.voxWithdraw || []);
      if (current.has(name)) current.delete(name);
      else current.add(name);
      onChange({ ...input, voxWithdraw: Array.from(current) });
    }
  };

  // Quick actions
  const handleWithdrawCritical = () => {
    const analysis = computeRightWingRiskAnalysis(result);
    const criticalNames = analysis.rightWinningList
      .filter(p => p.riskCategory === 'critical' && p.hasVoxCandidates)
      .map(p => p.name);
    const merged = new Set([...(input.voxWithdraw || []), ...criticalNames]);
    if (onSetVoxWithdraw) {
      onSetVoxWithdraw(Array.from(merged));
    } else {
      onChange({ ...input, voxWithdraw: Array.from(merged) });
    }
  };

  const handleWithdrawLeftWins = () => {
    const analysis = computeRightWingRiskAnalysis(result);
    const leftNames = analysis.leftWinningList
      .filter(p => p.hasVoxCandidates)
      .map(p => p.name);
    const merged = new Set([...(input.voxWithdraw || []), ...leftNames]);
    if (onSetVoxWithdraw) {
      onSetVoxWithdraw(Array.from(merged));
    } else {
      onChange({ ...input, voxWithdraw: Array.from(merged) });
    }
  };

  const handleWithdrawAll = () => {
    const allWithVox = constituenciesWithVox.filter(c => c.hasVox).map(c => c.name);
    if (onSetVoxWithdraw) {
      onSetVoxWithdraw(allWithVox);
    } else {
      onChange({ ...input, voxWithdraw: allWithVox });
    }
  };

  const handleResetWithdrawals = () => {
    if (onSetVoxWithdraw) {
      onSetVoxWithdraw([]);
    } else {
      onChange({ ...input, voxWithdraw: [] });
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Strategic Voting Section (X and Y) with Party Colors */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Voto Útil y Estratégico en el Senado
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Voto limitado en circunscripciones provinciales
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slider X: VOX -> PP */}
          <div
            className="flex flex-col gap-2.5 p-4 rounded-xl border transition-all"
            style={{
              backgroundColor: getPartyTint('PP', 0.04),
              borderColor: '#93c5fd'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: PARTY_COLORS['PP'] }}
                />
                <span className="text-sm font-bold text-slate-900">
                  VOX → PP (Traspaso Estratégico General)
                </span>
              </div>
              <span className="font-mono text-sm font-extrabold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded border border-blue-200 tabular-nums">
                {Math.round(input.X * 100)} %
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Porcentaje de votantes de VOX que marcan al PP en el Senado a nivel nacional para asegurar 3 escaños provinciales frente al bloque progresista.
            </p>

            {/* Custom styled slider with colored fill */}
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(input.X * 100)}
              onChange={e => onChange({ ...input, X: parseFloat(e.target.value) / 100 })}
              className="custom-range-slider cursor-pointer"
              style={{
                '--thumb-color': PARTY_COLORS['PP'],
                background: `linear-gradient(to right, ${PARTY_COLORS['PP']} 0%, ${PARTY_COLORS['PP']} ${Math.round(input.X * 100)}%, #e2e8f0 ${Math.round(input.X * 100)}%, #e2e8f0 100%)`
              } as React.CSSProperties}
            />

            {/* Quick chips for X */}
            <div className="flex items-center gap-1.5 mt-1">
              {[0, 15, 30, 50, 75].map(presetX => (
                <button
                  key={presetX}
                  onClick={() => onChange({ ...input, X: presetX / 100 })}
                  className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded transition-colors cursor-pointer ${
                    Math.round(input.X * 100) === presetX
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                  }`}
                >
                  {presetX}%
                </button>
              ))}
            </div>
          </div>

          {/* Slider Y: Frente Amplio -> PSOE */}
          <div
            className="flex flex-col gap-2.5 p-4 rounded-xl border transition-all"
            style={{
              backgroundColor: getPartyTint('PSOE', 0.04),
              borderColor: '#fca5a5'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: PARTY_COLORS['PSOE'] }}
                />
                <span className="text-sm font-bold text-slate-900">
                  Frente Amplio → PSOE / PSC
                </span>
              </div>
              <span className="font-mono text-sm font-extrabold text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded border border-rose-200 tabular-nums">
                {Math.round(input.Y * 100)} %
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              En las circunscripciones donde concurren por separado: Cataluña (PSC) y las Islas Canarias (Gran Canaria, Tenerife, Lanzarote, Fuerteventura, La Palma, El Hierro).
            </p>

            {/* Custom styled slider with colored fill */}
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(input.Y * 100)}
              onChange={e => onChange({ ...input, Y: parseFloat(e.target.value) / 100 })}
              className="custom-range-slider cursor-pointer"
              style={{
                '--thumb-color': PARTY_COLORS['PSOE'],
                background: `linear-gradient(to right, ${PARTY_COLORS['PSOE']} 0%, ${PARTY_COLORS['PSOE']} ${Math.round(input.Y * 100)}%, #e2e8f0 ${Math.round(input.Y * 100)}%, #e2e8f0 100%)`
              } as React.CSSProperties}
            />

            {/* Quick chips for Y */}
            <div className="flex items-center gap-1.5 mt-1">
              {[0, 15, 30, 50].map(presetY => (
                <button
                  key={presetY}
                  onClick={() => onChange({ ...input, Y: presetY / 100 })}
                  className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded transition-colors cursor-pointer ${
                    Math.round(input.Y * 100) === presetY
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                  }`}
                >
                  {presetY}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED PANEL: Retirada de candidaturas de VOX por circunscripción (100% al PP) */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Retirada de Candidaturas de VOX por Circunscripción
                </h3>
                <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  {voxWithdrawnSet.size} plazas retiradas
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Selecciona dónde VOX no presenta lista: en esas plazas el <strong>100% de sus votos</strong> se transfieren automáticamente al PP para maximizar escaños.
              </p>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleWithdrawCritical}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Retirar VOX en plazas donde el PP tiene riesgo crítico de caer a 2-2 (< 2% margen)"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              <span>Plazas Críticas</span>
            </button>
            <button
              onClick={handleWithdrawLeftWins}
              className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Retirar VOX donde vence la izquierda para intentar remontar el escaño"
            >
              <Zap className="h-3.5 w-3.5 text-rose-600" />
              <span>Donde Vence la Izquierda</span>
            </button>
            <button
              onClick={handleWithdrawAll}
              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Retirar en Todas
            </button>
            {voxWithdrawnSet.size > 0 && (
              <button
                onClick={handleResetWithdrawals}
                className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3 text-slate-500" />
                <span>Restablecer</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and toggle grid for VOX withdrawal */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar provincia para pacto VOX..."
                value={voxSearch}
                onChange={e => setVoxSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              Haz clic en cualquier provincia para activar/desactivar la retirada
            </span>
          </div>

          {/* Grouped Chips by CCAA (alphabetical order) */}
          <div className="space-y-3.5 max-h-72 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
            {groupedVoxByCCAA.map(({ ccaa, items }) => (
              <div key={ccaa} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span className="text-[11px] font-bold text-slate-800 font-mono tracking-tight">
                    {ccaa}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({items.length})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                  {items.map(c => {
                    const isWithdrawn = c.isWithdrawn;
                    const hasVox = c.hasVox;

                    if (!hasVox) {
                      return (
                        <div
                          key={c.name}
                          className="p-2 rounded-lg border border-slate-200 bg-slate-100/60 opacity-60 flex flex-col justify-between text-left text-xs"
                        >
                          <span className="font-semibold text-slate-600 truncate">{c.cleanName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Sin lista VOX</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleToggleVox(c.name)}
                        className={`p-2 rounded-lg border transition-all text-left text-xs cursor-pointer flex flex-col justify-between gap-1 shadow-2xs ${
                          isWithdrawn
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold hover:bg-emerald-100'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate font-semibold">{c.cleanName}</span>
                          {isWithdrawn && (
                            <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400">{c.seats} esc.</span>
                          <span
                            className={`font-bold ${
                              isWithdrawn ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {isWithdrawn ? '100% al PP' : 'VOX compite'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Party Estimates Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Proyección de Voto Nacional (%)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ajusta el porcentaje estimado para cada formación política para 2026.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono px-3 py-1 rounded-md border font-bold tabular-nums ${
                totalSumPct > 1.005
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Suma estimada: {(totalSumPct * 100).toFixed(1)} %
              {totalSumPct > 1.005 && ' (aviso: > 100 %)'}
            </span>
          </div>
        </div>

        {/* Parties Sliders Grid: PDeCAT-CiU and NC are excluded as requested */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {NATIONAL_PARTIES.map(party => {
            const currentPct = (input.pct[party] || 0) * 100;
            const basePctEntry = baseMultMap[party]?.b;
            const basePct = typeof basePctEntry === 'number' ? basePctEntry * 100 : null;
            const multiplier = result.mult[party] || 1;
            const partyColor = PARTY_COLORS[party] || '#64748b';
            const maxVal = basePct && basePct > 5 ? 50 : 6;
            const pctFilled = Math.min(100, Math.max(0, (currentPct / maxVal) * 100));

            return (
              <div
                key={party}
                className="flex flex-col gap-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: partyColor
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold font-mono"
                      style={{
                        backgroundColor: getPartyTint(party, 0.15),
                        color: partyColor
                      }}
                    >
                      {party}
                    </span>
                    {basePct !== null && (
                      <span className="text-[11px] font-mono text-slate-500">
                        ({basePct.toFixed(1)}% en 23)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={+(currentPct.toFixed(1))}
                      onChange={e => handlePartyPctChange(party, parseFloat(e.target.value))}
                      className="w-16 px-1.5 py-0.5 text-right font-mono text-xs font-bold bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums shadow-2xs"
                    />
                    <span className="text-xs text-slate-500 font-mono">%</span>
                  </div>
                </div>

                {/* Slider with custom gradient fill and consistent light track */}
                <input
                  type="range"
                  min="0"
                  max={maxVal}
                  step="0.1"
                  value={currentPct}
                  onChange={e => handlePartyPctChange(party, parseFloat(e.target.value))}
                  className="custom-range-slider"
                  style={{
                    '--thumb-color': partyColor,
                    background: `linear-gradient(to right, ${partyColor} 0%, ${partyColor} ${pctFilled}%, #e2e8f0 ${pctFilled}%, #e2e8f0 100%)`
                  } as React.CSSProperties}
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-0.5">
                  <span className="truncate max-w-[140px] text-slate-600">
                    {PARTY_NAMES[party] || party}
                  </span>
                  <span className="tabular-nums font-semibold" style={{ color: partyColor }}>
                    ×{multiplier.toFixed(2)} vs 2023
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Special SdP coalition box: Automatically calculated, NO override option as requested */}
        <div
          className="mt-5 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{
            backgroundColor: getPartyTint('SdP', 0.05),
            borderColor: '#f43f5e'
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: PARTY_COLORS['SdP'] }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Senado de Progreso (SdP: coalición PSOE + Frente Amplio)
                </span>
                <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                  Cálculo automático: {sdpEstimatedPct} %
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                En 40 circunscripciones (incluyendo Badajoz, Cáceres y Sevilla), PSOE y Frente Amplio concurren juntos bajo la papeleta de Senado de Progreso.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold text-rose-700 bg-white px-2.5 py-1 rounded border border-rose-200">
              Factor resultante: ×{result.mult.SdP?.toFixed(2) ?? 1.0} vs 2023
            </span>
          </div>
        </div>
      </div>

      {/* Accordion: Partidos sin dato nacional (factores directos) */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <button
          onClick={() => setShowDirect(!showDirect)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-900">
              Partidos Regionales sin Sondeo Nacional (Factores Directos)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>{DIRECT_PARTIES.length} formaciones (AHI, ASG, Geroa Bai...)</span>
            {showDirect ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showDirect && (
          <div className="p-4 pt-1 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {DIRECT_PARTIES.map(party => (
              <div
                key={party}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: PARTY_COLORS[party] || '#64748b' }}
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    {party}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-mono">Factor:</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={input.direct[party] != null ? input.direct[party] : 1}
                    onChange={e => handleDirectFactorChange(party, parseFloat(e.target.value))}
                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
