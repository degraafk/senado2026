import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { ConstituencyResult } from '../engine/senateEngine';
import { PARTY_COLORS, formatConstituencyName, getPartyTint, getConstituencyCCAA } from '../data/electionData';
import { Delta, fmt } from './ui';

interface Props {
  constituency: ConstituencyResult | null;
  onClose: () => void;
  onToggleVoxWithdraw?: (name: string) => void;
}

export const ConstituencyDetailModal: React.FC<Props> = ({ constituency, onClose, onToggleVoxWithdraw }) => {
  useEffect(() => {
    if (!constituency) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [constituency, onClose]);

  if (!constituency) return null;
  const n = constituency.n;
  const hasVox = constituency.list.some(c => c.g === 'VOX');
  const dest = constituency.name.includes('FORMENTERA') ? 'Sa Unió' : 'PP';
  const name = formatConstituencyName(constituency.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={name} className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-2xl font-semibold text-slate-950">{name}</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {getConstituencyCCAA(constituency.name)} · {n} {n > 1 ? 'senadores' : 'senador'}
              {constituency.voxWithdrawn && <span className="ml-2 font-semibold text-slate-900">VOX retirado</span>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {(hasVox && onToggleVoxWithdraw) || constituency.margin !== null ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-sm">
            {constituency.margin !== null && (
              <span className="text-slate-600">
                Margen de corte: <strong className={`tabular-nums ${constituency.margin < 3000 ? 'text-brass' : 'text-slate-900'}`}>{fmt(constituency.margin)} votos</strong>
              </span>
            )}
            {hasVox && onToggleVoxWithdraw && (
              <button
                onClick={() => onToggleVoxWithdraw(constituency.name)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  constituency.voxWithdrawn ? 'border-slate-300 bg-white text-slate-700 hover:border-slate-900' : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                {constituency.voxWithdrawn ? 'Volver a presentar a VOX' : `Retirar VOX (todo al ${dest})`}
              </button>
            )}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 py-2">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="w-8 py-2 font-medium">#</th>
                <th className="py-2 font-medium">Candidatura</th>
                <th className="py-2 text-right font-medium">2023</th>
                <th className="py-2 text-right font-medium">2026</th>
                <th className="w-8 py-2" />
              </tr>
            </thead>
            <tbody>
              {constituency.list.map(c => {
                const elected = c.rank <= n && c.f > 0;
                return (
                  <tr
                    key={c.i}
                    style={elected ? { backgroundColor: getPartyTint(c.g, 0.07) } : undefined}
                    className={`border-b border-slate-100 ${c.rank === n ? 'border-b-2 border-slate-900' : ''} ${elected ? 'text-slate-950' : 'text-slate-500'}`}
                  >
                    <td className="py-1.5 tabular-nums">{c.rank}</td>
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PARTY_COLORS[c.g] || '#8f968c' }} />
                        <span className="min-w-0">
                          <span className="block font-semibold">{c.g}</span>
                          <span className="block max-w-[15rem] truncate text-xs text-slate-500">
                            {c.l}{c.note && ` · ${c.note}`}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-500">{fmt(c.v)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${elected ? 'font-bold' : ''}`}>{fmt(c.f)}</td>
                    <td className="py-1.5 text-right">{elected && <Check className="ml-auto h-4 w-4 text-slate-900" strokeWidth={3} aria-label="Electo" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          {constituency.diff.length > 0 ? (
            <span className="flex flex-wrap items-center gap-x-3">
              Frente a 2023:
              {constituency.diff.map(([g, d]) => (
                <span key={g} className="flex items-center gap-1 font-semibold" style={{ color: PARTY_COLORS[g] }}>
                  <Delta d={d} /> {g}
                </span>
              ))}
            </span>
          ) : (
            'Mismo reparto que en 2023.'
          )}
        </div>
      </div>
    </div>
  );
};
