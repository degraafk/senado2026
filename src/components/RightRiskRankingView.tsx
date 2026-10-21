import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Search,
  ChevronRight,
  Info,
  TrendingUp,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  Check,
  RotateCcw,
  Zap,
  UserX,
  UserCheck
} from 'lucide-react';
import { ModelResult, ConstituencyResult } from '../engine/senateEngine';
import {
  computeRightWingRiskAnalysis,
  ConstituencyRiskProfile
} from '../engine/riskAnalysis';
import {
  PARTY_COLORS,
  formatConstituencyName,
  ORDER,
  getConstituencyCCAA
} from '../data/electionData';
import { ConstituencyDetailModal } from './ConstituencyDetailModal';

interface RightRiskRankingViewProps {
  result: ModelResult;
  voxWithdraw: string[];
  onToggleVoxWithdraw: (constituencyName: string) => void;
  onSetVoxWithdraw: (constituencies: string[]) => void;
}

type SectionViewMode = 'all' | 'left_wins' | 'right_majority';

export const RightRiskRankingView: React.FC<RightRiskRankingViewProps> = ({
  result,
  voxWithdraw,
  onToggleVoxWithdraw,
  onSetVoxWithdraw
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<SectionViewMode>('all');
  const [selectedConstituency, setSelectedConstituency] = useState<ConstituencyResult | null>(null);

  // Compute dual ranking from engine
  const dualRanking = useMemo(() => {
    return computeRightWingRiskAnalysis(result);
  }, [result]);

  const {
    leftWinningList,
    rightWinningList,
    leftWinningCount,
    rightWinningCount,
    criticalCount,
    moderateCount,
    safeCount,
    rightSeats
  } = dualRanking;

  const totalWithdrawnCount = voxWithdraw.length;

  // Filter lists by search query (province or CCAA, preserving risk ranking order)
  const filteredLeftList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return leftWinningList;
    return leftWinningList.filter(
      item =>
        formatConstituencyName(item.name).toLowerCase().includes(q) ||
        getConstituencyCCAA(item.name).toLowerCase().includes(q)
    );
  }, [leftWinningList, searchQuery]);

  const filteredRightList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rightWinningList;
    return rightWinningList.filter(
      item =>
        formatConstituencyName(item.name).toLowerCase().includes(q) ||
        getConstituencyCCAA(item.name).toLowerCase().includes(q)
    );
  }, [rightWinningList, searchQuery]);

  // Batch actions
  const handleWithdrawAllLeftWinning = () => {
    const namesToWithdraw = new Set(voxWithdraw);
    leftWinningList.forEach(item => {
      if (item.hasVoxCandidates) {
        namesToWithdraw.add(item.name);
      }
    });
    onSetVoxWithdraw(Array.from(namesToWithdraw));
  };

  const handleWithdrawAllCritical = () => {
    const namesToWithdraw = new Set(voxWithdraw);
    rightWinningList
      .filter(item => item.riskCategory === 'critical' && item.hasVoxCandidates)
      .forEach(item => namesToWithdraw.add(item.name));
    onSetVoxWithdraw(Array.from(namesToWithdraw));
  };

  const handleResetAllWithdrawals = () => {
    onSetVoxWithdraw([]);
  };

  const handleOpenConstituency = (name: string) => {
    const found = result.cons.find(c => c.name === name);
    if (found) setSelectedConstituency(found);
  };

  return (
    <div className="w-full space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
            Escaños Totales Derecha
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-blue-700 font-mono tabular-nums">
              {rightSeats}
            </span>
            <span className="text-xs font-mono text-slate-500">
              / {result.totalSeats}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            PP + UPN-PP + VOX + Sa Unió
          </span>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 shadow-2xs">
          <span className="text-xs font-mono font-semibold text-rose-800 uppercase tracking-wider">
            Donde Vence la Izquierda
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-rose-700 font-mono tabular-nums">
              {leftWinningCount}
            </span>
            <span className="text-xs font-mono text-rose-600">
              plazas
            </span>
          </div>
          <span className="text-[11px] text-rose-700 font-medium mt-1 block">
            De más posibles a imposibles
          </span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-2xs">
          <span className="text-xs font-mono font-semibold text-amber-800 uppercase tracking-wider">
            Mayoría Derecha: Críticas (&lt; 2 %)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-amber-700 font-mono tabular-nums">
              {criticalCount}
            </span>
            <span className="text-xs font-mono text-amber-700">
              plazas
            </span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">
            A riesgo inminente de caer a 2-2
          </span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
          <span className="text-xs font-mono font-semibold text-emerald-800 uppercase tracking-wider">
            Candidaturas VOX Retiradas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
              {totalWithdrawnCount}
            </span>
            <span className="text-xs font-mono text-emerald-700">
              / {result.totalSeats > 0 ? 59 : 0}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            100% votos transferidos al PP
          </span>
        </div>
      </div>

      {/* Explanatory Banner with Strategy & VOX Withdrawal controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700 shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Dos Categorías Electorales y Opción de Retirada de VOX por Circunscripción
              </h3>
              {totalWithdrawnCount > 0 && (
                <button
                  onClick={handleResetAllWithdrawals}
                  className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restablecer todas las listas de VOX ({totalWithdrawnCount})
                </button>
              )}
            </div>
            <p>
              El informe divide el mapa electoral en dos bloques y permite simular el pacto de retirada de listas de VOX circunscripción a circunscripción (100% de sus votos pasan a los candidatos del PP):
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>1. Plazas donde vence la izquierda / nacionalistas:</strong> La derecha está en minoría. Se ordenan desde las <strong>más factibles de recuperar</strong> (menor déficit de votos y %) hasta las <strong>imposibles</strong>. Retirar a VOX en estas plazas puede voltear el 1-3 a 3-1 o empatar a 2-2.
              </li>
              <li>
                <strong>2. Plazas donde la mayoría la tiene la derecha:</strong> La derecha ostenta la mayoría (3-1, 2-1, 2-0 o 1-0). Se ordenan desde las <strong>más críticas</strong> (menor colchón frente al corte para caer a 2-2) hasta los <strong>bastiones seguros</strong>.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search, Section View Controls, and Global Batch Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por provincia o isla..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Section View Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer font-semibold ${
              viewMode === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Ver Ambas Secciones ({dualRanking.totalCirc})
          </button>
          <button
            onClick={() => setViewMode('left_wins')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer font-semibold flex items-center gap-1.5 ${
              viewMode === 'left_wins'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>1. Vence la Izquierda ({leftWinningCount})</span>
          </button>
          <button
            onClick={() => setViewMode('right_majority')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer font-semibold flex items-center gap-1.5 ${
              viewMode === 'right_majority'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>2. Mayoría Derecha ({rightWinningCount})</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: WHERE LEFT WINS (SORTED FROM MOST POSSIBLE TO IMPOSSIBLE TO RECOVER) */}
      {(viewMode === 'all' || viewMode === 'left_wins') && (
        <div className="rounded-2xl border-2 border-rose-200 bg-white overflow-hidden shadow-sm">
          {/* Section Header */}
          <div className="p-5 border-b border-rose-100 bg-rose-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white font-bold text-xs">
                1
              </span>
              <div>
                <h3 className="text-base font-extrabold text-rose-950 tracking-tight flex items-center gap-2">
                  <span>Plazas donde Vence la Izquierda / Nacionalistas</span>
                  <span className="text-xs font-mono font-bold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full">
                    {filteredLeftList.length} circunscripciones
                  </span>
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  Ordenadas de <strong>más posibles de recuperar por la derecha</strong> (menor déficit de votos y %) a <strong>imposibles</strong>.
                </p>
              </div>
            </div>

            {/* Batch action button for left-winning plazas */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleWithdrawAllLeftWinning}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                title="Retira a VOX en todas las circunscripciones donde vence la izquierda y transfiere 100% de votos al PP"
              >
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                <span>Retirar VOX en todas estas plazas</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                  <th className="py-3 px-3 text-center w-14">Rango</th>
                  <th className="py-3 px-4">Circunscripción</th>
                  <th className="py-3 px-3 text-center">Escaños Derecha</th>
                  <th className="py-3 px-3">Déficit / Transición</th>
                  <th className="py-3 px-4">Contienda Decisiva</th>
                  <th className="py-3 px-4 text-right">Intervalo % para Remontar</th>
                  <th className="py-3 px-4 text-center">Opción VOX</th>
                  <th className="py-3 px-3 text-center w-12">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLeftList.map((item, idx) => {
                  const seatBlocks: { party: string; color: string }[] = [];
                  ORDER.forEach(p => {
                    const count = item.seatsDistribution[p] || 0;
                    for (let i = 0; i < count; i++) {
                      seatBlocks.push({ party: p, color: PARTY_COLORS[p] || '#64748b' });
                    }
                  });

                  return (
                    <tr
                      key={item.name}
                      onClick={() => handleOpenConstituency(item.name)}
                      className={`hover:bg-rose-50/40 transition-colors cursor-pointer group ${
                        item.voxWithdrawn ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs bg-rose-100 text-rose-800 font-mono">
                          {idx + 1}
                        </span>
                      </td>

                      {/* Province */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 group-hover:text-rose-700 transition-colors">
                              {formatConstituencyName(item.name)}
                            </span>
                            <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {getConstituencyCCAA(item.name)}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              {item.n} esc.
                            </span>
                            {item.voxWithdrawn && (
                              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                VOX retirado
                              </span>
                            )}
                          </div>
                          {/* Seat Dots */}
                          <div className="flex items-center gap-1 mt-1.5">
                            {seatBlocks.map((b, bIdx) => (
                              <span
                                key={bIdx}
                                className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[9px] font-extrabold text-white shadow-2xs"
                                style={{ backgroundColor: b.color }}
                                title={b.party}
                              >
                                {b.party.slice(0, 1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Seats Right vs Max */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-rose-50 text-rose-800 border border-rose-200">
                          {item.currentRightSeats} / {item.maxRightSeats}
                        </span>
                      </td>

                      {/* Transition & Feasibility */}
                      <td className="py-3.5 px-3 font-sans">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-rose-800">
                            {item.feasibilityLabel}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {item.scenarioTransition}
                          </span>
                        </div>
                      </td>

                      {/* Decisive Contest */}
                      <td className="py-3.5 px-4 font-sans text-xs">
                        <div className="flex flex-col text-slate-700">
                          <span className="font-semibold text-slate-900">
                            Aspirante Derecha: {item.firstRightChallenger?.g ?? 'PP'} ({item.firstRightChallenger?.f.toLocaleString('es-ES') ?? '–'} votos)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            vs último electo rival: {item.lastNonRightElected?.g ?? '–'} ({item.lastNonRightElected?.f.toLocaleString('es-ES') ?? '–'} votos)
                          </span>
                        </div>
                      </td>

                      {/* Interval % to Recover */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-rose-700">
                            Déficit: -{item.marginToGainVotes?.toLocaleString('es-ES') ?? '–'} votos
                          </span>
                          <span className="text-[11px] font-extrabold text-rose-800">
                            +{item.marginToGainPct?.toFixed(2) ?? '–'} % necesario
                          </span>
                        </div>
                      </td>

                      {/* VOX Candidate Toggle Option */}
                      <td className="py-3.5 px-4 text-center">
                        {item.hasVoxCandidates ? (
                          item.voxWithdrawn ? (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onToggleVoxWithdraw(item.name);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer shadow-2xs"
                              title="Haz clic para volver a presentar a VOX en esta circunscripción"
                            >
                              <Check className="h-3 w-3 text-emerald-700" />
                              <span>{item.name.includes('FORMENTERA') ? 'Retirado (100% Sa Unió)' : 'Retirado (100% PP)'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onToggleVoxWithdraw(item.name);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors cursor-pointer shadow-2xs"
                              title={`Retirar lista de VOX: pasaría ~${item.estimatedVoxVotes.toLocaleString('es-ES')} votos al PP`}
                            >
                              <Zap className="h-3 w-3 text-amber-500" />
                              <span>Retirar VOX (~{Math.round(item.estimatedVoxVotes / 1000)}k)</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            Sin lista VOX
                          </span>
                        )}
                      </td>

                      {/* Action Chevron */}
                      <td className="py-3.5 px-3 text-center text-slate-400 group-hover:text-rose-600 transition-colors">
                        <ChevronRight className="h-4 w-4 inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLeftList.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-xs">
              No se han encontrado circunscripciones con victoria de la izquierda con los filtros actuales.
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: WHERE RIGHT HAS MAJORITY (SORTED FROM MOST CRITICAL TO SAFEST) */}
      {(viewMode === 'all' || viewMode === 'right_majority') && (
        <div className="rounded-2xl border-2 border-blue-200 bg-white overflow-hidden shadow-sm">
          {/* Section Header */}
          <div className="p-5 border-b border-blue-100 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                2
              </span>
              <div>
                <h3 className="text-base font-extrabold text-blue-950 tracking-tight flex items-center gap-2">
                  <span>Plazas donde la Mayoría la tiene la Derecha</span>
                  <span className="text-xs font-mono font-bold bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full">
                    {filteredRightList.length} circunscripciones
                  </span>
                </h3>
                <p className="text-xs text-blue-800 mt-0.5">
                  Ordenadas de <strong>más críticas para la derecha</strong> (menor colchón de ventaja) hasta <strong>más seguras</strong> (bastiones).
                </p>
              </div>
            </div>

            {/* Batch action for critical plazas */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleWithdrawAllCritical}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                title="Retira a VOX en todas las plazas críticas (< 2%) para blindar el 3-1 o 2-1"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                <span>Blindar plazas críticas (&lt; 2%)</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                  <th className="py-3 px-3 text-center w-14">Rango</th>
                  <th className="py-3 px-4">Circunscripción</th>
                  <th className="py-3 px-3 text-center">Escaños Derecha</th>
                  <th className="py-3 px-3">Nivel de Riesgo</th>
                  <th className="py-3 px-4">Contienda Decisiva</th>
                  <th className="py-3 px-4 text-right">Intervalo % de Ventaja</th>
                  <th className="py-3 px-4 text-center">Opción VOX</th>
                  <th className="py-3 px-3 text-center w-12">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredRightList.map((item, idx) => {
                  const isCritical = item.riskCategory === 'critical';
                  const isModerate = item.riskCategory === 'moderate';

                  const seatBlocks: { party: string; color: string }[] = [];
                  ORDER.forEach(p => {
                    const count = item.seatsDistribution[p] || 0;
                    for (let i = 0; i < count; i++) {
                      seatBlocks.push({ party: p, color: PARTY_COLORS[p] || '#64748b' });
                    }
                  });

                  return (
                    <tr
                      key={item.name}
                      onClick={() => handleOpenConstituency(item.name)}
                      className={`hover:bg-blue-50/30 transition-colors cursor-pointer group ${
                        item.voxWithdrawn ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs font-mono ${
                            isCritical
                              ? 'bg-amber-100 text-amber-800'
                              : isModerate
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Province */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                              {formatConstituencyName(item.name)}
                            </span>
                            <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {getConstituencyCCAA(item.name)}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              {item.n} esc.
                            </span>
                            {item.voxWithdrawn && (
                              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                VOX retirado
                              </span>
                            )}
                          </div>
                          {/* Seat Dots */}
                          <div className="flex items-center gap-1 mt-1.5">
                            {seatBlocks.map((b, bIdx) => (
                              <span
                                key={bIdx}
                                className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[9px] font-extrabold text-white shadow-2xs"
                                style={{ backgroundColor: b.color }}
                                title={b.party}
                              >
                                {b.party.slice(0, 1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Seats Right vs Max */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                          {item.currentRightSeats} / {item.maxRightSeats}
                        </span>
                      </td>

                      {/* Risk Category & Transition */}
                      <td className="py-3.5 px-3 font-sans">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-xs font-bold ${
                              isCritical
                                ? 'text-amber-800 font-extrabold flex items-center gap-1'
                                : isModerate
                                ? 'text-yellow-800'
                                : 'text-emerald-800'
                            }`}
                          >
                            {isCritical && <Flame className="h-3.5 w-3.5 text-amber-600" />}
                            {item.riskCategoryLabel}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Peligro: {item.scenarioTransition}
                          </span>
                        </div>
                      </td>

                      {/* Decisive Contest */}
                      <td className="py-3.5 px-4 font-sans text-xs">
                        <div className="flex flex-col text-slate-700">
                          <span className="font-semibold text-slate-900">
                            Último electo: {item.lastRightElected?.g ?? 'PP'} ({item.lastRightElected?.f.toLocaleString('es-ES') ?? '–'} votos)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            vs 1.er aspirante rival: {item.firstNonRightChallenger?.g ?? '–'} ({item.firstNonRightChallenger?.f.toLocaleString('es-ES') ?? '–'} votos)
                          </span>
                        </div>
                      </td>

                      {/* Interval % to Lose */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="flex flex-col items-end">
                          <span
                            className={`text-xs font-bold ${
                              isCritical
                                ? 'text-amber-800 font-extrabold'
                                : isModerate
                                ? 'text-yellow-800 font-bold'
                                : 'text-emerald-800'
                            }`}
                          >
                            Colchón: +{item.marginToLoseVotes?.toLocaleString('es-ES') ?? '–'} votos
                          </span>
                          <span
                            className={`text-[11px] font-extrabold ${
                              isCritical
                                ? 'text-amber-900'
                                : isModerate
                                ? 'text-yellow-900'
                                : 'text-slate-500 font-semibold'
                            }`}
                          >
                            +{item.marginToLosePct?.toFixed(2) ?? '–'} % margen
                          </span>
                        </div>
                      </td>

                      {/* VOX Candidate Toggle Option */}
                      <td className="py-3.5 px-4 text-center">
                        {item.hasVoxCandidates ? (
                          item.voxWithdrawn ? (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onToggleVoxWithdraw(item.name);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer shadow-2xs"
                              title="Haz clic para volver a presentar a VOX en esta circunscripción"
                            >
                              <Check className="h-3 w-3 text-emerald-700" />
                              <span>{item.name.includes('FORMENTERA') ? 'Retirado (100% Sa Unió)' : 'Retirado (100% PP)'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onToggleVoxWithdraw(item.name);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors cursor-pointer shadow-2xs"
                              title={`Retirar lista de VOX: pasaría ~${item.estimatedVoxVotes.toLocaleString('es-ES')} votos al PP`}
                            >
                              <ShieldCheck className="h-3 w-3 text-blue-600" />
                              <span>Retirar VOX (~{Math.round(item.estimatedVoxVotes / 1000)}k)</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            Sin lista VOX
                          </span>
                        )}
                      </td>

                      {/* Action Chevron */}
                      <td className="py-3.5 px-3 text-center text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ChevronRight className="h-4 w-4 inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRightList.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-xs">
              No se han encontrado circunscripciones con mayoría de la derecha con los filtros actuales.
            </div>
          )}
        </div>
      )}

      {/* Candidate Detail Modal */}
      <ConstituencyDetailModal
        constituency={selectedConstituency}
        onClose={() => setSelectedConstituency(null)}
        onToggleVoxWithdraw={onToggleVoxWithdraw}
      />
    </div>
  );
};
