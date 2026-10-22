import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { ConstituencyResult, ModelResult } from '../engine/senateEngine';
import { computeRightWingRiskAnalysis, ConstituencyRiskProfile } from '../engine/riskAnalysis';
import { PARTY_COLORS, ORDER, formatConstituencyName, getPartyTint } from '../data/electionData';
import { dec } from './ui';

export type MapMode = 'result' | 'changes' | 'margin' | 'risk' | 'vox';

const BRASS = '#a9741a';
const brass = (a: number) => `rgba(169,116,26,${a})`;

/* Tile map: each province is one square, placed roughly where it is on the map */
const T = (s: string) => s;
const GRID: (string[] | { caption: string })[] = [
  ['Coruña (A)', 'Lugo', 'Asturias', 'Cantabria', 'Bizkaia', 'Gipuzkoa', '', '', '', '', '', ''],
  ['Pontevedra', 'Ourense', 'León', 'Palencia', 'Burgos', 'Araba/Álava', 'Navarra', 'Huesca', 'Lleida', 'Girona', '', ''],
  ['', '', 'Zamora', 'Valladolid', 'Soria', 'Rioja (La)', 'Zaragoza', '', 'Tarragona', 'Barcelona', '', ''],
  ['', '', 'Salamanca', 'Segovia', 'Guadalajara', 'Cuenca', 'Teruel', 'Castellón/Castelló', '', '', '', ''],
  ['', 'Cáceres', 'Ávila', 'Madrid', 'Toledo', 'Albacete', '', 'Valencia/València', 'Balears (Illes): IBIZA', 'Balears (Illes): MALLORCA', 'Balears (Illes): MENORCA', ''],
  ['', 'Badajoz', '', 'Córdoba', 'Ciudad Real', 'Jaén', 'Murcia', 'Alicante/Alacant', 'Balears (Illes): FORMENTERA', '', '', ''],
  ['', 'Huelva', 'Sevilla', 'Málaga', 'Granada', 'Almería', '', '', '', '', '', ''],
  ['', '', 'Cádiz', 'Ceuta', '', 'Melilla', '', '', '', '', '', ''],
  { caption: 'Canarias' },
  [
    'Santa Cruz de Tenerife: EL HIERRO', 'Santa Cruz de Tenerife: LA GOMERA', 'Santa Cruz de Tenerife: LA PALMA',
    'Santa Cruz de Tenerife: TENERIFE', 'Palmas (Las): GRAN CANARIA', 'Palmas (Las): FUERTEVENTURA', 'Palmas (Las): LANZAROTE',
    '', '', '', '', ''
  ].map(T)
];

const SHORT: Record<string, string> = {
  'Coruña (A)': 'A Coruña', 'Rioja (La)': 'La Rioja', 'Araba/Álava': 'Álava',
  'Alicante/Alacant': 'Alicante', 'Castellón/Castelló': 'Castellón', 'Valencia/València': 'Valencia'
};

function winner(tally: Record<string, number>): string | null {
  const e = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (!e.length) return null;
  if (e[1] && e[1][1] === e[0][1]) return null; // tied: no colour
  return e[0][0];
}

function dots(tally: Record<string, number>): string[] {
  const out: string[] = [];
  const keys = [...ORDER.filter(p => tally[p]), ...Object.keys(tally).filter(p => !ORDER.includes(p))];
  keys.forEach(p => { for (let i = 0; i < (tally[p] || 0); i++) out.push(p); });
  return out;
}

interface Props {
  result: ModelResult;
  mode: MapMode;
  onSelect?: (c: ConstituencyResult) => void;
  onToggleVox?: (name: string) => void;
}

export const SpainMap: React.FC<Props> = ({ result, mode, onSelect, onToggleVox }) => {
  const profiles = useMemo(() => {
    const r = computeRightWingRiskAnalysis(result);
    const m: Record<string, ConstituencyRiskProfile> = {};
    [...r.leftWinningList, ...r.rightWinningList].forEach(p => { m[p.name] = p; });
    return m;
  }, [result]);

  const byName = useMemo(() => new Map(result.cons.map(c => [c.name, c])), [result.cons]);

  const rows = useMemo(() => {
    const used = new Set<string>();
    GRID.forEach(r => Array.isArray(r) && r.forEach(n => n && used.add(n)));
    const rest = result.cons.filter(c => !used.has(c.name)).map(c => c.name);
    const extra: string[][] = [];
    for (let i = 0; i < rest.length; i += 12) extra.push([...rest.slice(i, i + 12), ...Array(12).fill('')].slice(0, 12));
    return [...GRID, ...extra];
  }, [result.cons]);

  const tile = (c: ConstituencyResult) => {
    const label = SHORT[c.name] ?? formatConstituencyName(c.name);
    const prof = profiles[c.name];
    const hasVox = prof ? prof.hasVoxCandidates : c.list.some(x => x.g === 'VOX');
    let bg = '#ffffff';
    let border = '#d9dcd6';
    let dashed = false;
    let faded = false;
    let foot: React.ReactNode = null;
    let corner: React.ReactNode = null;
    let click: (() => void) | undefined = onSelect ? () => onSelect(c) : undefined;
    let tip = `${label}: ${c.n} ${c.n > 1 ? 'senadores' : 'senador'}`;

    if (mode === 'result') {
      const w = winner(c.tally);
      if (w) { bg = getPartyTint(w, 0.16); border = getPartyTint(w, 0.55); }
      if (c.voxWithdrawn) foot = <span style={{ color: PARTY_COLORS['VOX'] }}>sin VOX</span>;
    } else if (mode === 'changes') {
      if (c.isFlipped) {
        border = BRASS;
        foot = (
          <span className="flex gap-1">
            {c.diff.slice(0, 2).map(([p, d]) => (
              <span key={p} style={{ color: PARTY_COLORS[p] }}>{d > 0 ? '+' : '−'}{Math.abs(d)} {p}</span>
            ))}
          </span>
        );
      } else faded = true;
    } else if (mode === 'margin') {
      const m = c.margin;
      const a = m === null ? 0 : m < 1500 ? 0.5 : m < 3000 ? 0.32 : m < 6000 ? 0.16 : 0;
      if (a) { bg = brass(a); border = brass(0.7); }
      if (m !== null) foot = <span className="text-slate-600">±{dec(m / 1000, 1)}k</span>;
    } else if (mode === 'risk' && prof) {
      if (prof.statusType === 'below_max') {
        dashed = true;
        const feasible = !!prof.feasibilityLabel && /^(Muy|Posible)/.test(prof.feasibilityLabel);
        border = feasible ? BRASS : '#8f968c';
        if (prof.marginToGainPct != null) foot = <span className="text-slate-600">−{dec(prof.marginToGainPct, 1)} %</span>;
      } else {
        bg = prof.riskCategory === 'critical' ? brass(0.45) : prof.riskCategory === 'moderate' ? brass(0.2) : getPartyTint('PP', 0.14);
        border = prof.riskCategory === 'safe' ? getPartyTint('PP', 0.5) : brass(0.8);
        if (prof.marginToLosePct != null) foot = <span className="text-slate-600">+{dec(prof.marginToLosePct, 1)} %</span>;
      }
    } else if (mode === 'vox') {
      tip += hasVox ? (c.voxWithdrawn ? '. VOX retirado: toca para volver a presentarlo.' : '. Toca para retirar a VOX.') : '. No hay lista de VOX.';
      if (!hasVox) { faded = true; click = undefined; }
      else {
        click = onToggleVox ? () => onToggleVox(c.name) : undefined;
        const hot = prof && ((prof.statusType === 'below_max' && /^(Muy|Posible)/.test(prof.feasibilityLabel || '')) || prof.riskCategory === 'critical');
        if (c.voxWithdrawn) {
          bg = getPartyTint('VOX', 0.24); border = PARTY_COLORS['VOX'];
          corner = <Check className="h-3 w-3" strokeWidth={3} style={{ color: PARTY_COLORS['VOX'] }} />;
        } else {
          if (prof) foot = <span className="text-slate-500">~{Math.round(prof.estimatedVoxVotes / 1000)}k</span>;
          if (hot) corner = <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BRASS }} />;
        }
        if (hot) tip += ' Aquí retirar a VOX puede cambiar el reparto.';
      }
    }

    return (
      <button
        key={c.name}
        onClick={click}
        disabled={!click}
        title={tip}
        aria-label={tip}
        style={{ backgroundColor: bg, borderColor: border, opacity: faded ? 0.38 : 1 }}
        className={`relative flex aspect-square flex-col justify-between rounded-lg border p-1.5 text-left transition-[opacity,box-shadow] ${dashed ? 'border-dashed' : ''} ${
          click ? 'cursor-pointer hover:ring-2 hover:ring-slate-900/60' : 'cursor-default'
        }`}
      >
        <span className="block truncate pr-3 text-[10px] font-semibold leading-tight text-slate-950">{label}</span>
        <span className="flex flex-wrap gap-[3px]">
          {dots(c.tally).map((p, i) => (
            <span key={i} className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: PARTY_COLORS[p] || '#8f968c' }} />
          ))}
        </span>
        <span className="block min-h-[11px] truncate text-[9px] font-semibold leading-none tabular-nums">{foot}</span>
        {corner && <span className="absolute right-1 top-1">{corner}</span>}
      </button>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[42rem] gap-1.5" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
        {rows.flatMap((row, ri) =>
          Array.isArray(row)
            ? row.map((name, ci) => {
                const c = name ? byName.get(name) : undefined;
                return c ? tile(c) : <div key={`e${ri}-${ci}`} />;
              })
            : [<div key={`cap${ri}`} className="col-span-12 mt-2 border-t border-slate-200 pt-1 text-xs font-semibold text-slate-500">{row.caption}</div>]
        )}
      </div>
    </div>
  );
};

/* Small colour key under the map */
export const MapLegend: React.FC<{ mode: MapMode }> = ({ mode }) => {
  const sw = (bg: string, border: string, label: string, dashed = false) => (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded border ${dashed ? 'border-dashed' : ''}`} style={{ backgroundColor: bg, borderColor: border }} />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
      <span>Cada punto es un senador.</span>
      {mode === 'result' && <span>El fondo es el partido que gana más escaños; sin color si empatan.</span>}
      {mode === 'changes' && <span>Con borde latón: cambia el reparto frente a 2023.</span>}
      {mode === 'margin' && (<>
        {sw(brass(0.5), brass(0.7), 'menos de 1.500 votos')}
        {sw(brass(0.32), brass(0.7), 'menos de 3.000')}
        {sw(brass(0.16), brass(0.7), 'menos de 6.000')}
      </>)}
      {mode === 'risk' && (<>
        {sw(brass(0.45), brass(0.8), 'la derecha puede perder un escaño (< 2 %)')}
        {sw(brass(0.2), brass(0.8), '2-5 %')}
        {sw(getPartyTint('PP', 0.14), getPartyTint('PP', 0.5), 'seguro')}
        {sw('#fff', BRASS, 'gana la izquierda y puede remontar', true)}
      </>)}
      {mode === 'vox' && (<>
        {sw(getPartyTint('VOX', 0.24), PARTY_COLORS['VOX'], 'VOX retirado')}
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: BRASS }} />retirar puede cambiar el reparto</span>
        <span>~12k: votos de VOX que pasarían al PP.</span>
      </>)}
    </div>
  );
};
