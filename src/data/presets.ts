import { BASEDATA } from './electionData';

export interface PresetScenario {
  id: string;
  name: string;
  tagline: string;
  description: string;
  pct: Record<string, number>;
  sdpOverride: number | null;
  direct: Record<string, number>;
  X: number;
  Y: number;
  voxWithdraw?: string[];
  thr: number;
  defaultBloc: string[];
}

export function getDefaultBasePercentages(): Record<string, number> {
  const pct: Record<string, number> = {};
  BASEDATA.mult.forEach(m => {
    if (typeof m.b === 'number' && m.g !== 'NC' && m.g !== 'PDeCAT-CiU') {
      pct[m.g] = m.b;
    }
  });
  return pct;
}

export function getDefaultDirect(): Record<string, number> {
  return {
    'AHI': 1,
    'ASG': 1,
    'Adelante Andalucía': 1,
    'Bloque Extremeño': 1,
    'Coalición por Melilla': 1,
    'Geroa Bai': 1,
  };
}

export const PRESETS: PresetScenario[] = [
  {
    id: 'base2023',
    name: '2023 Real (Base)',
    tagline: 'Resultado oficial elecciones 23-J',
    description: 'Los porcentajes y candidaturas exactas del 23 de julio de 2023. El PP obtuvo 120 senadores y el PSOE/SdP 72.',
    pct: getDefaultBasePercentages(),
    sdpOverride: null,
    direct: getDefaultDirect(),
    X: 0,
    Y: 0,
    thr: 133,
    defaultBloc: ['PP']
  },
  {
    id: 'pp_majority_133',
    name: 'Mayoría PP (≥ 133 escaños)',
    tagline: 'Objetivo 133: Voto útil estratégico',
    description: 'Con PP al 34,2 % y un traspaso de voto útil del 30 % de votantes de VOX hacia el PP en las papeletas al Senado, el PP supera la barrera de 133 senadores.',
    pct: {
      ...getDefaultBasePercentages(),
      'PP': 0.342,
      'PSOE': 0.298,
      'VOX': 0.125,
      'Frente Amplio': 0.082,
      'ERC': 0.019,
      'Junts': 0.015,
      'EH Bildu': 0.014,
      'PNV': 0.011,
      'BNG': 0.007,
      'CC': 0.004,
      'UPN': 0.0022
    },
    sdpOverride: null,
    direct: getDefaultDirect(),
    X: 0.30,
    Y: 0.10,
    thr: 133,
    defaultBloc: ['PP']
  },
  {
    id: 'polls_consensus',
    name: 'Encuestas Actuales',
    tagline: 'Promedio de sondeos 2025/2026',
    description: 'Estimación basada en el pulso electoral actual: crecimiento moderado del PP, resistencia del PSOE y descenso de Sumar/Frente Amplio.',
    pct: {
      ...getDefaultBasePercentages(),
      'PP': 0.338,
      'PSOE': 0.302,
      'VOX': 0.134,
      'Frente Amplio': 0.078,
      'ERC': 0.018,
      'Junts': 0.016,
      'EH Bildu': 0.015,
      'PNV': 0.011,
      'BNG': 0.008,
      'CC': 0.0045,
      'UPN': 0.0021
    },
    sdpOverride: null,
    direct: getDefaultDirect(),
    X: 0.15,
    Y: 0.15,
    thr: 133,
    defaultBloc: ['PP']
  },
  {
    id: 'progressive_surge',
    name: 'Avance Progresista',
    tagline: 'Movilización SdP + Periféricos',
    description: 'Mayoría de progreso: movilización alta en la izquierda con Senado de Progreso al alza y acuerdo estratégico en las 13 provincias separadas.',
    pct: {
      ...getDefaultBasePercentages(),
      'PP': 0.315,
      'PSOE': 0.325,
      'VOX': 0.118,
      'Frente Amplio': 0.115,
      'ERC': 0.021,
      'Junts': 0.014,
      'EH Bildu': 0.015,
      'PNV': 0.012,
      'BNG': 0.009,
      'CC': 0.004,
      'UPN': 0.002
    },
    sdpOverride: null,
    direct: getDefaultDirect(),
    X: 0.05,
    Y: 0.35,
    thr: 133,
    defaultBloc: ['SdP', 'PSOE', 'PSC', 'EH Bildu', 'PNV', 'ERC', 'BNG']
  },
  {
    id: 'high_right_concentration',
    name: 'Concentración Derecha (X=60%)',
    tagline: 'Máxima eficacia del voto útil conservador',
    description: 'El 60 % del electorado de VOX apoya en bloque las listas del PP en el Senado para rentabilizar el sistema mayoritario de 3 de 4 escaños.',
    pct: {
      ...getDefaultBasePercentages(),
      'PP': 0.328,
      'PSOE': 0.310,
      'VOX': 0.130,
      'Frente Amplio': 0.090,
    },
    sdpOverride: null,
    direct: getDefaultDirect(),
    X: 0.60,
    Y: 0.05,
    thr: 133,
    defaultBloc: ['PP']
  }
];
