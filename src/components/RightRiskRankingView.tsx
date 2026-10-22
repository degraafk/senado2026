import React, { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { ModelResult, ConstituencyResult } from '../engine/senateEngine';
import { computeRightWingRiskAnalysis, ConstituencyRiskProfile } from '../engine/riskAnalysis';
import { PARTY_COLORS, formatConstituencyName, getConstituencyCCAA, getPartyTint } from '../data/electionData';
import { ConstituencyDetailModal } from './ConstituencyDetailModal';
import { SpainMap, MapLegend, MapMode } from './SpainMap';
import { CARD, Pill, SearchBox, SeatDots, dec, fmt } from './ui';

interface Props {
  result: ModelResult;
  voxWithdraw: string[];
  onToggleVoxWithdraw: (constituencyName: string) => void;
  onSetVoxWithdraw: (constituencies: string[]) => void;
}

type Mode = 'all' | 'left' | 'right';

interface TableProps {
  title: string;
  sub: string;
  items: ConstituencyRiskProfile[];
  kind: 'left' | 'right';
  action: React.ReactNode;
  onOpen: (name: string) => void;
  onToggle: (name: string) => void;
}

const RiskTable: React.FC<TableProps> = ({ title, sub, items, kind, action, onOpen, onToggle }) => (
  <section className={CARD}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">
          {title} <span className="ml-1 text-base font-normal text-slate-400 tabular-nums">{items.length}</span>
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{sub}</p>
      </div>
      {action}
    </div>

    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th className="w-8 py-2 font-medium">#</th>
            <th className="py-2 font-medium">Circunscripción</th>
            <th className="py-2 text-center font-medium">Derecha</th>
            <th className="py-2 font-medium">{kind === 'left' ? 'Posibilidad de remontar' : 'Riesgo'}</th>
            <th className="py-2 text-right font-medium">{kind === 'left' ? 'Déficit' : 'Colchón'}</th>
            <th className="py-2 text-right font-medium">VOX</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const hot = kind === 'left' ? it.feasibilityLabel?.startsWith('Muy') : it.riskCategory === 'critical';
            const votes = kind === 'left' ? it.marginToGainVotes : it.marginToLoseVotes;
            const pct = kind === 'left' ? it.marginToGainPct : it.marginToLosePct;
            const a = kind === 'left' ? it.firstRightChallenger : it.lastRightElected;
            const b = kind === 'left' ? it.lastNonRightElected : it.firstNonRightChallenger;
            const label = kind === 'left' ? it.feasibilityLabel : it.riskCategoryLabel;
            const dest = it.name.includes('FORMENTERA') ? 'Sa Unió' : 'PP';
            return (
              <tr
                key={it.name}
                onClick={() => onOpen(it.name)}
                style={hot ? { boxShadow: 'inset 3px 0 0 #a9741a' } : undefined}
                className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
              >
                <td className="py-2.5 pl-2 text-xs tabular-nums text-slate-400">{idx + 1}</td>
                <td className="py-2.5 pr-3">
                  <button className="block text-left font-semibold text-slate-950">
                    {formatConstituencyName(it.name)}
                    <span className="ml-2 text-xs font-normal text-slate-400">{getConstituencyCCAA(it.name)}</span>
                  </button>
                  <span className="mt-1 block"><SeatDots tally={it.seatsDistribution} size={10} /></span>
                </td>
                <td className="py-2.5 text-center tabular-nums text-slate-700">{it.currentRightSeats}<span className="text-slate-400"> / {it.maxRightSeats}</span></td>
                <td className="py-2.5 pr-3">
                  <span className={`block font-semibold ${hot ? 'text-brass' : 'text-slate-800'}`}>{label}</span>
                  <span className="block text-xs text-slate-500">
                    {it.scenarioTransition}
                    {a && b && <> · {a.g} {fmt(a.f)} vs {b.g} {fmt(b.f)}</>}
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  <span className="block font-semibold text-slate-900">{votes != null ? `${kind === 'left' ? '−' : '+'}${fmt(votes)}` : '–'}</span>
                  <span className="block text-xs text-slate-500">{pct != null ? `${dec(pct)} %` : ''}</span>
                </td>
                <td className="py-2.5 pr-2 text-right">
                  {!it.hasVoxCandidates ? (
                    <span className="text-xs text-slate-400">sin lista</span>
                  ) : it.voxWithdrawn ? (
                    <button
                      onClick={e => { e.stopPropagation(); onToggle(it.name); }}
                      style={{ borderColor: PARTY_COLORS['VOX'], backgroundColor: getPartyTint('VOX', 0.14) }}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold text-slate-950 cursor-pointer"
                      title={`Volver a presentar a VOX (ahora todo va al ${dest})`}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} /> Retirado
                    </button>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); onToggle(it.name); }}
                      className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-900 cursor-pointer"
                      title={`Pasaría unos ${fmt(it.estimatedVoxVotes)} votos al ${dest}`}
                    >
                      Retirar · {Math.round(it.estimatedVoxVotes / 1000)}k
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {items.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No hay circunscripciones con estos filtros.</p>}
    </div>
  </section>
);

export const RightRiskRankingView: React.FC<Props> = ({ result, voxWithdraw, onToggleVoxWithdraw, onSetVoxWithdraw }) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('all');
  const [mapMode, setMapMode] = useState<MapMode>('risk');
  const [selected, setSelected] = useState<ConstituencyResult | null>(null);

  const r = useMemo(() => computeRightWingRiskAnalysis(result), [result]);

  const filter = (list: ConstituencyRiskProfile[]) => {
    const q = query.toLowerCase().trim();
    return q ? list.filter(i => formatConstituencyName(i.name).toLowerCase().includes(q) || getConstituencyCCAA(i.name).toLowerCase().includes(q)) : list;
  };
  const left = useMemo(() => filter(r.leftWinningList), [r, query]);
  const right = useMemo(() => filter(r.rightWinningList), [r, query]);

  const addWithdrawn = (names: string[]) => onSetVoxWithdraw(Array.from(new Set([...voxWithdraw, ...names])));
  const open = (name: string) => { const c = result.cons.find(x => x.name === name); if (c) setSelected(c); };

  const stats = [
    { v: `${r.rightSeats}`, of: `/ ${result.totalSeats}`, l: 'escaños de la derecha' },
    { v: r.leftWinningCount, of: '', l: 'provincias donde gana la izquierda' },
    { v: r.criticalCount, of: '', l: 'con la derecha en riesgo crítico', hot: true },
    { v: voxWithdraw.length, of: '', l: 'listas de VOX retiradas' }
  ];

  return (
    <div className="w-full space-y-5">
      <div className={`${CARD} grid grid-cols-2 gap-y-4 md:grid-cols-4 md:divide-x md:divide-slate-100`}>
        {stats.map((s, i) => (
          <div key={i} className="md:px-5 first:md:pl-0">
            <div className={`font-display text-4xl font-semibold tabular-nums ${s.hot ? 'text-brass' : 'text-slate-950'}`}>
              {s.v}<span className="ml-1 font-sans text-sm font-normal text-slate-400">{s.of}</span>
            </div>
            <div className="text-sm text-slate-500">{s.l}</div>
          </div>
        ))}
      </div>

      <section className={`${CARD} space-y-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">El mapa del riesgo</h2>
            <p className="mt-1 text-sm text-slate-500">
              {mapMode === 'risk' ? 'Toca una provincia para ver sus votos.' : 'Toca una provincia para retirar o devolver a VOX.'}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Pill active={mapMode === 'risk'} onClick={() => setMapMode('risk')}>Riesgo</Pill>
            <Pill active={mapMode === 'vox'} onClick={() => setMapMode('vox')}>Retirada de VOX</Pill>
          </div>
        </div>
        <SpainMap result={result} mode={mapMode} onSelect={setSelected} onToggleVox={onToggleVoxWithdraw} />
        <MapLegend mode={mapMode} />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={query} onChange={setQuery} placeholder="Buscar provincia" />
        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
        <Pill active={mode === 'all'} onClick={() => setMode('all')}>Todas ({r.totalCirc})</Pill>
        <Pill active={mode === 'left'} onClick={() => setMode('left')}>Gana la izquierda ({r.leftWinningCount})</Pill>
        <Pill active={mode === 'right'} onClick={() => setMode('right')}>Mayoría de la derecha ({r.rightWinningCount})</Pill>
        {voxWithdraw.length > 0 && (
          <button onClick={() => onSetVoxWithdraw([])} className="ml-auto px-1 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900 cursor-pointer">
            Volver a presentar a VOX en todas ({voxWithdraw.length})
          </button>
        )}
      </div>

      {(mode === 'all' || mode === 'left') && (
        <RiskTable
          kind="left"
          title="Donde gana la izquierda"
          sub="De la más fácil de recuperar a la más difícil. Cuenta cuántos votos le faltan a la derecha para sumar el escaño que le falta."
          items={left}
          onOpen={open}
          onToggle={onToggleVoxWithdraw}
          action={
            <Pill onClick={() => addWithdrawn(r.leftWinningList.filter(i => i.hasVoxCandidates).map(i => i.name))} title="Retira a VOX en todas estas provincias">
              Retirar VOX en todas
            </Pill>
          }
        />
      )}

      {(mode === 'all' || mode === 'right') && (
        <RiskTable
          kind="right"
          title="Donde manda la derecha"
          sub="De la que más peligra a la más segura. El colchón son los votos de ventaja antes de perder un escaño."
          items={right}
          onOpen={open}
          onToggle={onToggleVoxWithdraw}
          action={
            <Pill
              onClick={() => addWithdrawn(r.rightWinningList.filter(i => i.riskCategory === 'critical' && i.hasVoxCandidates).map(i => i.name))}
              title="Retira a VOX donde el margen es menor del 2 %"
            >
              Blindar las críticas
            </Pill>
          }
        />
      )}

      <ConstituencyDetailModal constituency={selected} onClose={() => setSelected(null)} onToggleVoxWithdraw={onToggleVoxWithdraw} />
    </div>
  );
};
