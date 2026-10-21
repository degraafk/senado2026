import React, { useState, useMemo } from 'react';
import { Search, ArrowRightLeft, AlertTriangle, MapPin } from 'lucide-react';
import { ConstituencyResult } from '../engine/senateEngine';
import {
  PARTY_COLORS,
  formatConstituencyName,
  ORDER,
  getConstituencyCCAA
} from '../data/electionData';
import { ConstituencyDetailModal } from './ConstituencyDetailModal';

interface ConstituencyGridProps {
  constituencies: ConstituencyResult[];
  onToggleVoxWithdraw?: (name: string) => void;
}

type FilterType = 'all' | 'flipped' | 'tight' | 'vox_withdrawn' | 'pp_lead' | 'sdp_lead';

export const ConstituencyGrid: React.FC<ConstituencyGridProps> = ({
  constituencies,
  onToggleVoxWithdraw
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedCCAA, setSelectedCCAA] = useState<string>('all');
  const [selectedConstituency, setSelectedConstituency] = useState<ConstituencyResult | null>(null);

  // Filtered and searched list
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return constituencies.filter(c => {
      const name = formatConstituencyName(c.name).toLowerCase();
      const ccaa = getConstituencyCCAA(c.name).toLowerCase();

      // Search by province or CCAA
      if (q && !name.includes(q) && !ccaa.includes(q)) return false;

      // Filter by selected CCAA dropdown/selector if active
      if (selectedCCAA !== 'all' && getConstituencyCCAA(c.name) !== selectedCCAA) {
        return false;
      }

      // Filter types
      if (filterType === 'flipped') return c.isFlipped;
      if (filterType === 'tight') return c.isTight;
      if (filterType === 'vox_withdrawn') return c.voxWithdrawn;
      if (filterType === 'pp_lead') return (c.tally['PP'] || 0) >= 3 || (c.tally['PP'] || 0) >= c.n;
      if (filterType === 'sdp_lead') {
        const sdpSeats = (c.tally['SdP'] || 0) + (c.tally['PSOE'] || 0) + (c.tally['PSC'] || 0);
        return sdpSeats >= 3 || sdpSeats >= c.n;
      }

      return true;
    });
  }, [constituencies, searchQuery, filterType, selectedCCAA]);

  // Grouped by CCAA in alphabetical order, and provinces inside each CCAA sorted alphabetically
  const groupedByCCAA = useMemo(() => {
    const groups: Record<string, ConstituencyResult[]> = {};
    filteredList.forEach(c => {
      const ccaa = getConstituencyCCAA(c.name);
      (groups[ccaa] = groups[ccaa] || []).push(c);
    });

    const sortedCCAA = Object.keys(groups).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    return sortedCCAA.map(ccaa => ({
      ccaa,
      items: groups[ccaa].sort((a, b) =>
        formatConstituencyName(a.name).localeCompare(
          formatConstituencyName(b.name),
          'es',
          { sensitivity: 'base' }
        )
      )
    }));
  }, [filteredList]);

  // List of all CCAAs present for the filter dropdown
  const allCCAAs = useMemo(() => {
    const set = new Set<string>();
    constituencies.forEach(c => set.add(getConstituencyCCAA(c.name)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [constituencies]);

  const flippedCount = useMemo(() => constituencies.filter(c => c.isFlipped).length, [constituencies]);
  const tightCount = useMemo(() => constituencies.filter(c => c.isTight).length, [constituencies]);
  const voxWithdrawnCount = useMemo(() => constituencies.filter(c => c.voxWithdrawn).length, [constituencies]);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Mapa de Circunscripciones por Comunidades Autónomas ({filteredList.length} de {constituencies.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Provincias ordenadas alfabéticamente dentro de sus respectivas Comunidades Autónomas.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* CCAA Filter Select */}
          <select
            value={selectedCCAA}
            onChange={e => setSelectedCCAA(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer"
          >
            <option value="all">Todas las CCAA (19)</option>
            {allCCAAs.map(ccaa => (
              <option key={ccaa} value={ccaa}>
                {ccaa}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar provincia o CCAA..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-52"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas (59)
            </button>
            <button
              onClick={() => setFilterType('flipped')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'flipped'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Circunscripciones donde cambia la asignación de escaños respecto a 2023"
            >
              <ArrowRightLeft className="h-3 w-3" />
              <span>Cambian ({flippedCount})</span>
            </button>
            <button
              onClick={() => setFilterType('tight')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'tight'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Margen de corte menor a 3.000 votos"
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Ajustadas ({tightCount})</span>
            </button>
            {voxWithdrawnCount > 0 && (
              <button
                onClick={() => setFilterType('vox_withdrawn')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  filterType === 'vox_withdrawn'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
                title="Circunscripciones con lista de VOX retirada"
              >
                <span>VOX Ret. ({voxWithdrawnCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grouped by CCAA in Alphabetical Order */}
      <div className="mt-6 space-y-7">
        {groupedByCCAA.map(({ ccaa, items }) => (
          <div key={ccaa} className="space-y-3">
            {/* CCAA Header Badge */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  {ccaa}
                </span>
                <span className="text-[11px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                  {items.length} {items.length === 1 ? 'circunscripción' : 'circunscripciones'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {items.reduce((acc, c) => acc + c.n, 0)} senadores
              </span>
            </div>

            {/* Grid of Provinces sorted alphabetically within this CCAA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {items.map(c => {
                const name = formatConstituencyName(c.name);
                const hasDiff = c.diff.length > 0;
                const isTight = c.isTight;

                // Ordered seat dots
                const seatDots: { party: string; color: string }[] = [];
                ORDER.forEach(p => {
                  const count = c.tally[p] || 0;
                  for (let i = 0; i < count; i++) {
                    seatDots.push({ party: p, color: PARTY_COLORS[p] || '#64748b' });
                  }
                });

                return (
                  <button
                    key={c.name}
                    onClick={() => setSelectedConstituency(c)}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      hasDiff
                        ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400 hover:shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {c.voxWithdrawn && (
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">
                            VOX ret.
                          </span>
                        )}
                        <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {c.n} esc.
                        </span>
                      </div>
                    </div>

                    {/* Seat Dots in Full Party Color */}
                    <div className="flex items-center gap-1.5 mt-2.5">
                      {seatDots.map((dot, idx) => (
                        <span
                          key={idx}
                          className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-extrabold text-white shadow-2xs transition-transform group-hover:scale-110"
                          style={{ backgroundColor: dot.color }}
                          title={dot.party}
                        >
                          {dot.party.slice(0, 1)}
                        </span>
                      ))}
                    </div>

                    {/* Status / Margin Footer */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                      {hasDiff ? (
                        <div className="flex items-center gap-1 truncate max-w-[130px]">
                          {c.diff.map(([p, d]) => (
                            <span
                              key={p}
                              style={{ color: PARTY_COLORS[p] || '#b45309' }}
                              className="font-bold"
                            >
                              {d > 0 ? '+' : ''}{d} {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          Igual que 2023
                        </span>
                      )}

                      <span
                        className={`tabular-nums font-semibold ${
                          isTight ? 'text-rose-600 font-extrabold' : 'text-slate-500'
                        }`}
                        title="Diferencia de votos con el primer candidato que no obtiene escaño"
                      >
                        {c.margin !== null ? `±${(c.margin / 1000).toFixed(1)}k` : '–'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredList.length === 0 && (
        <div className="p-8 text-center text-slate-500 text-sm">
          No se encontraron circunscripciones con los criterios de búsqueda actuales.
        </div>
      )}

      {/* Modal Details */}
      <ConstituencyDetailModal
        constituency={selectedConstituency}
        onClose={() => setSelectedConstituency(null)}
        onToggleVoxWithdraw={onToggleVoxWithdraw}
      />
    </div>
  );
};
