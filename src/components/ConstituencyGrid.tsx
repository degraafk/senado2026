import React, { useState, useMemo } from 'react';
import { ConstituencyResult } from '../engine/senateEngine';
import { formatConstituencyName, getConstituencyCCAA, PARTY_COLORS } from '../data/electionData';
import { ConstituencyDetailModal } from './ConstituencyDetailModal';
import { CARD, Delta, Pill, SearchBox, SeatDots, SectionHead } from './ui';

interface Props {
  constituencies: ConstituencyResult[];
  onToggleVoxWithdraw?: (name: string) => void;
}

type Filter = 'all' | 'flipped' | 'tight' | 'vox';
const collator = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' });

export const ConstituencyGrid: React.FC<Props> = ({ constituencies, onToggleVoxWithdraw }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [ccaa, setCcaa] = useState('all');
  const [selected, setSelected] = useState<ConstituencyResult | null>(null);

  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    return constituencies.filter(c => {
      const region = getConstituencyCCAA(c.name);
      if (q && !formatConstituencyName(c.name).toLowerCase().includes(q) && !region.toLowerCase().includes(q)) return false;
      if (ccaa !== 'all' && region !== ccaa) return false;
      if (filter === 'flipped') return c.isFlipped;
      if (filter === 'tight') return c.isTight;
      if (filter === 'vox') return c.voxWithdrawn;
      return true;
    });
  }, [constituencies, query, filter, ccaa]);

  const groups = useMemo(() => {
    const g: Record<string, ConstituencyResult[]> = {};
    list.forEach(c => { (g[getConstituencyCCAA(c.name)] ||= []).push(c); });
    return Object.keys(g).sort(collator).map(k => ({
      ccaa: k,
      items: g[k].sort((a, b) => collator(formatConstituencyName(a.name), formatConstituencyName(b.name)))
    }));
  }, [list]);

  const regions = useMemo(() => Array.from(new Set(constituencies.map(c => getConstituencyCCAA(c.name)))).sort(collator), [constituencies]);
  const count = (f: (c: ConstituencyResult) => boolean) => constituencies.filter(f).length;
  const voxCount = count(c => c.voxWithdrawn);

  return (
    <div className={`${CARD} space-y-5`}>
      <SectionHead
        title="Circunscripciones"
        sub={`${list.length} de ${constituencies.length}. Toca una para ver los votos candidato a candidato.`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={ccaa}
          onChange={e => setCcaa(e.target.value)}
          aria-label="Comunidad autónoma"
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
        >
          <option value="all">Todas las comunidades</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <SearchBox value={query} onChange={setQuery} placeholder="Buscar provincia" />
        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>Todas</Pill>
        <Pill active={filter === 'flipped'} onClick={() => setFilter('flipped')} title="Cambian de reparto respecto a 2023">
          Cambian ({count(c => c.isFlipped)})
        </Pill>
        <Pill active={filter === 'tight'} onClick={() => setFilter('tight')} title="Margen de corte menor de 3.000 votos">
          Ajustadas ({count(c => c.isTight)})
        </Pill>
        {voxCount > 0 && (
          <Pill active={filter === 'vox'} onClick={() => setFilter('vox')}>VOX retirado ({voxCount})</Pill>
        )}
      </div>

      <div className="space-y-6">
        {groups.map(({ ccaa: region, items }) => (
          <section key={region}>
            <h3 className="mb-2 flex items-baseline gap-2 border-b border-slate-100 pb-1.5 text-base font-semibold text-slate-950">
              {region}
              <span className="text-xs font-normal text-slate-400 tabular-nums">
                {items.length} {items.length === 1 ? 'circunscripción' : 'circunscripciones'} · {items.reduce((a, c) => a + c.n, 0)} senadores
              </span>
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map(c => (
                <button
                  key={c.name}
                  onClick={() => setSelected(c)}
                  style={c.isFlipped ? { boxShadow: 'inset 3px 0 0 #a9741a' } : undefined}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-slate-900 cursor-pointer"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-950">{formatConstituencyName(c.name)}</span>
                    <span className={`shrink-0 text-xs tabular-nums ${c.isTight ? 'font-semibold text-brass' : 'text-slate-400'}`} title="Margen de corte en votos">
                      {c.margin !== null ? `±${(c.margin / 1000).toFixed(1).replace('.', ',')}k` : '–'}
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-2">
                    <SeatDots tally={c.tally} />
                    <span className="flex items-center gap-2 text-xs">
                      {c.voxWithdrawn && <span className="font-semibold" style={{ color: PARTY_COLORS['VOX'] }}>sin VOX</span>}
                      {c.diff.map(([p, d]) => (
                        <span key={p} className="flex items-center gap-0.5 font-semibold" style={{ color: PARTY_COLORS[p] }}>
                          <Delta d={d} />{p}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No hay circunscripciones con esos filtros.</p>}
      </div>

      <ConstituencyDetailModal constituency={selected} onClose={() => setSelected(null)} onToggleVoxWithdraw={onToggleVoxWithdraw} />
    </div>
  );
};
