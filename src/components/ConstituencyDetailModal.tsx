import React from 'react';
import { X, Award, Zap, Check, RotateCcw } from 'lucide-react';
import { ConstituencyResult } from '../engine/senateEngine';
import { PARTY_COLORS, formatConstituencyName, getPartyTint, getConstituencyCCAA } from '../data/electionData';

interface ConstituencyDetailModalProps {
  constituency: ConstituencyResult | null;
  onClose: () => void;
  onToggleVoxWithdraw?: (name: string) => void;
}

export const ConstituencyDetailModal: React.FC<ConstituencyDetailModalProps> = ({
  constituency,
  onClose,
  onToggleVoxWithdraw
}) => {
  if (!constituency) return null;

  const totalSeats = constituency.n;
  const hasVoxCandidates = constituency.list.some(c => c.g === 'VOX');
  const ccaa = getConstituencyCCAA(constituency.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {formatConstituencyName(constituency.name)}
              </h3>
              <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md">
                {ccaa}
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-200/80 px-2.5 py-0.5 rounded-md">
                {totalSeats} {totalSeats > 1 ? 'escaños en juego' : 'escaño en juego'}
              </span>
              {constituency.voxWithdrawn && (
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                  VOX retirado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ganan el escaño los {totalSeats} candidatos con mayor número de votos. Sistema de listas abiertas y voto limitado.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* VOX Withdrawal Strategy Card */}
        {hasVoxCandidates && onToggleVoxWithdraw && (
          <div
            className={`px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
              constituency.voxWithdrawn
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-blue-50/60 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`p-1.5 rounded-lg ${
                  constituency.voxWithdrawn
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-blue-200 text-blue-900'
                }`}
              >
                {constituency.voxWithdrawn ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
              </span>
              <div>
                <span className="font-bold block">
                  {constituency.voxWithdrawn
                    ? 'VOX ha retirado sus candidaturas en esta circunscripción'
                    : 'Pacto de concentración: Retirar candidatura de VOX'}
                </span>
                <span className="text-[11px] opacity-85 block mt-0.5">
                  {constituency.voxWithdrawn
                    ? `El 100% de los votos de VOX se han sumado ${constituency.name.includes('FORMENTERA') ? 'a Sa Unió' : 'al PP'}, fortaleciendo la candidatura de derechas.`
                    : `Al retirar la lista de VOX, todos sus votos se transferirán automáticamente ${constituency.name.includes('FORMENTERA') ? 'a Sa Unió' : 'al PP'}.`}
                </span>
              </div>
            </div>

            <button
              onClick={() => onToggleVoxWithdraw(constituency.name)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto ${
                constituency.voxWithdrawn
                  ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {constituency.voxWithdrawn ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  <span>Restablecer lista VOX</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>Retirar VOX (100% al PP)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Margin Notice Banner */}
        {constituency.margin !== null && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Margen de corte entre el último electo ({constituency.last?.g}) y el primer candidato sin escaño ({constituency.next?.g}):
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                constituency.margin < 3000 ? 'text-amber-700 font-extrabold' : 'text-slate-800'
              }`}
            >
              {constituency.margin.toLocaleString('es-ES')} votos
            </span>
          </div>
        )}

        {/* Candidate List Table */}
        <div className="p-5 overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-mono">
                <th className="py-2.5 px-3 text-center w-12">Puesto</th>
                <th className="py-2.5 px-3">Candidatura / Partido</th>
                <th className="py-2.5 px-3 text-right">Votos 2023</th>
                <th className="py-2.5 px-3 text-right">Votos 2026 Proy.</th>
                <th className="py-2.5 px-3 text-center w-24">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {constituency.list.map(cand => {
                const isElected = cand.rank <= totalSeats && cand.f > 0;
                const isCutoff = cand.rank === totalSeats;
                const partyColor = PARTY_COLORS[cand.g] || '#64748b';

                return (
                  <tr
                    key={cand.i}
                    style={{
                      backgroundColor: isElected ? getPartyTint(cand.g, 0.06) : undefined
                    }}
                    className={`transition-colors ${
                      isElected ? 'font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    } ${isCutoff ? 'border-b-2 border-slate-400' : ''}`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                          isElected
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {cand.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: partyColor }}
                        />
                        <div className="flex flex-col">
                          <span className="font-sans font-bold text-slate-900">
                            {cand.g}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[240px]">
                            {cand.l}
                          </span>
                          {cand.note && (
                            <span className="text-[9px] text-amber-700 font-mono font-semibold">
                              ({cand.note})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                      {cand.v.toLocaleString('es-ES')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {cand.f.toLocaleString('es-ES')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isElected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Award className="h-3 w-3 text-emerald-600" />
                          Electo
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Sin escaño
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            {constituency.diff.length > 0
              ? `Variación vs 2023: ${constituency.diff
                  .map(([g, d]) => `${d > 0 ? '+' : ''}${d} ${g}`)
                  .join(' · ')}`
              : 'Misma asignación de senadores que en 2023'}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
