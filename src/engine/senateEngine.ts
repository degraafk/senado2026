import {
  BASEDATA,
  BaseData,
  CandidateRow,
  ConstituencyBaseTuple,
  EIF,
  IBZ,
  FOR,
  IBV,
  FOV,
  getConstituencyCCAA,
  formatConstituencyName
} from '../data/electionData';

export interface ModelInput {
  pct: Record<string, number>;
  sdpOverride: number | null;
  direct: Record<string, number>;
  X: number; // VOX -> PP vote transfer (0..1)
  Y: number; // Frente Amplio -> PSOE vote transfer (0..1)
  voxWithdraw?: string[]; // Constituencies where VOX withdraws candidacies and 100% goes to PP
  targetMajorityThreshold?: number; // default 133
}

export interface ComputedCandidateRow extends CandidateRow {
  i: number;
  m: number;
  f: number;
  note: string;
  rank: number;
  seat: string;
}

export interface ConstituencyResult {
  name: string;
  n: number;
  list: ComputedCandidateRow[];
  tally: Record<string, number>;
  baseTally: Record<string, number>;
  margin: number | null;
  last?: ComputedCandidateRow;
  next?: ComputedCandidateRow;
  diff: [string, number][]; // [party, +/- seat diff]
  isFlipped: boolean;
  isTight: boolean; // margin < 3000
  voxWithdrawn: boolean;
}

export interface ModelResult {
  mult: Record<string, number>;
  rows: ComputedCandidateRow[];
  seats: Record<string, number>;
  baseSeats: Record<string, number>;
  totalSeats: number;
  cons: ConstituencyResult[];
}

export const SDP_UNIFIED_PROVINCES = new Set(['Badajoz', 'Cáceres', 'Sevilla']);

export function buildData(): BaseData {
  const rows: CandidateRow[] = [];

  // Group rows by constituency for pre-processing unified provinces
  const byProvince: Record<string, CandidateRow[]> = {};
  BASEDATA.rows.forEach(r => {
    (byProvince[r.c] = byProvince[r.c] || []).push(r);
  });

  Object.entries(byProvince).forEach(([province, pRows]) => {
    if (SDP_UNIFIED_PROVINCES.has(province)) {
      // In Badajoz, Cáceres, and Sevilla, PSOE and Frente Amplio unite under SdP
      const psoeRows = pRows.filter(r => r.g === 'PSOE').sort((a, b) => b.v - a.v);
      const faRows = pRows.filter(r => r.g === 'Frente Amplio').sort((a, b) => b.v - a.v);
      const otherRows = pRows.filter(r => r.g !== 'PSOE' && r.g !== 'Frente Amplio');

      // Unite 1st with 1st, 2nd with 2nd, 3rd with 3rd
      psoeRows.forEach((psoe, idx) => {
        const fa = faRows[idx];
        const combinedVotes = psoe.v + (fa ? fa.v : 0);
        const baseSeat = psoe.base === 'PSOE' ? 'SdP' : psoe.base;
        rows.push({
          c: province,
          l: 'Senado de Progreso',
          g: 'SdP',
          v: combinedVotes,
          s: psoe.s,
          base: baseSeat
        });
      });

      // Push non-PSOE/FA candidates (PP, VOX, etc.)
      otherRows.forEach(r => rows.push(r));
    } else {
      // Other provinces: standard processing
      pRows.forEach(r => {
        let row = r;
        if (r.g === 'EiF') row = { ...r, g: 'SdP' };
        if (row.c !== EIF) {
          rows.push(row);
          return;
        }
        if (IBV[row.g] == null) {
          rows.push({ ...row, c: IBZ }, { ...row, c: FOR, v: 0 });
          return;
        }
        const forList = row.g === 'PP' ? 'Sa Unió' : row.l;
        const forGroup = row.g === 'PP' ? 'Sa Unió' : row.g;
        rows.push(
          { ...row, c: IBZ, v: IBV[row.g] },
          { ...row, c: FOR, v: FOV[row.g], l: forList, g: forGroup }
        );
      });
    }
  });

  const cons: ConstituencyBaseTuple[] = [];
  BASEDATA.cons.forEach(c => {
    if (c[0] === EIF) {
      cons.push([IBZ, 1, c[2]], [FOR, 1, {}]);
    } else if (SDP_UNIFIED_PROVINCES.has(c[0])) {
      // Replace PSOE seats with SdP seats in base 2023 tally
      const modifiedB23: Record<string, number> = {};
      Object.entries(c[2]).forEach(([g, cnt]) => {
        if (g === 'PSOE') modifiedB23['SdP'] = cnt;
        else modifiedB23[g] = cnt;
      });
      cons.push([c[0], c[1], modifiedB23]);
    } else {
      cons.push(c);
    }
  });

  // Sort constituencies alphabetically within their respective CCAA
  cons.sort((a, b) => {
    const ccaaA = getConstituencyCCAA(a[0]);
    const ccaaB = getConstituencyCCAA(b[0]);
    const cmpCCAA = ccaaA.localeCompare(ccaaB, 'es', { sensitivity: 'base' });
    if (cmpCCAA !== 0) return cmpCCAA;
    const nameA = formatConstituencyName(a[0]);
    const nameB = formatConstituencyName(b[0]);
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });

  return { rows, cons, mult: BASEDATA.mult };
}

export function computeModel(data: BaseData, inp: ModelInput): ModelResult {
  const pct23: Record<string, number> = {};
  const pct26: Record<string, number> = {};

  data.mult.forEach(m => {
    if (typeof m.b === 'number') pct23[m.g] = m.b;
  });

  // NC and PDeCAT-CiU are kept identical to 2023
  if (pct23['NC']) pct26['NC'] = pct23['NC'];
  if (pct23['PDeCAT-CiU']) pct26['PDeCAT-CiU'] = pct23['PDeCAT-CiU'];

  Object.keys(inp.pct).forEach(g => {
    pct26[g] = inp.pct[g];
  });

  const mult: Record<string, number> = {};
  data.mult.forEach(m => {
    const g = m.g;
    if (g === 'SdP') {
      const b = (pct23.PSOE || 0) + (pct23['Frente Amplio'] || 0);
      // SdP is always automatically calculated as PSOE + Frente Amplio
      const c = (pct26.PSOE || 0) + (pct26['Frente Amplio'] || 0);
      mult[g] = b > 0 ? c / b : 1;
    } else if (g === 'PSC') {
      mult[g] = pct23.PSOE > 0 ? (pct26.PSOE || 0) / pct23.PSOE : 1;
    } else if (g === 'NC' || g === 'PDeCAT-CiU') {
      mult[g] = 1; // Fixed to 2023 base
    } else if (typeof m.b === 'number') {
      mult[g] = m.b > 0 ? (pct26[g] || 0) / m.b : 1;
    } else {
      mult[g] = inp.direct[g] != null ? inp.direct[g] : 1;
    }
  });

  // Sa Unió absorbs PP's evolution
  mult['Sa Unió'] = mult['PP'] || 1;

  const X = Math.max(0, Math.min(1, inp.X || 0));
  const Y = Math.max(0, Math.min(1, inp.Y || 0));
  const voxWithdrawSet = new Set(inp.voxWithdraw || []);

  const rows: ComputedCandidateRow[] = data.rows.map((r, i) => ({
    ...r,
    i,
    m: mult[r.g] ?? 1,
    f: 0,
    note: '',
    rank: 0,
    seat: ''
  }));

  // Constituency vote sums for strategic reallocations (2023 base)
  const sumPP: Record<string, number> = {};
  const sumVOX: Record<string, number> = {};
  const sumPS: Record<string, number> = {};
  const sumSUM: Record<string, number> = {};

  rows.forEach(r => {
    if (r.g === 'PP') sumPP[r.c] = (sumPP[r.c] || 0) + r.v;
    if (r.g === 'VOX') sumVOX[r.c] = (sumVOX[r.c] || 0) + r.v;
    if (r.g === 'PSOE' || r.g === 'PSC') sumPS[r.c] = (sumPS[r.c] || 0) + r.v;
    if (r.g === 'Frente Amplio') sumSUM[r.c] = (sumSUM[r.c] || 0) + r.v;
  });

  const xl = (x: number) => Math.floor(x + 0.5 + 1e-9);

  // Navarra coalition: PP + UPN under UPN brand
  const navUPN = rows.filter(r => r.c === 'Navarra' && r.g === 'UPN' && r.l.indexOf('UNIÓN DEL PUEBLO') === 0);
  const navPP = rows.filter(r => r.c === 'Navarra' && r.g === 'UPN' && r.l === 'PARTIDO POPULAR');
  const navPair = new Map<number, ComputedCandidateRow>();
  const navAbsorbed = new Set<number>();

  navUPN.forEach((u, k) => {
    if (navPP[k]) navPair.set(u.i, navPP[k]);
  });
  navPP.forEach(p => navAbsorbed.add(p.i));

  const vVOXmult = mult.VOX || 1;
  const vSUMmult = mult['Frente Amplio'] || 1;

  rows.forEach(r => {
    const isVoxWithdrawn = voxWithdrawSet.has(r.c);

    if (navAbsorbed.has(r.i)) {
      r.f = 0;
      r.note = 'absorbido';
    } else if (navPair.has(r.i)) {
      const p = navPair.get(r.i)!;
      r.f = xl(r.v * r.m + p.v * p.m);
      r.note = isVoxWithdrawn ? 'coalición UPN-PP (VOX retirado)' : 'coalición UPN-PP';
    } else if (r.g === 'PP' || r.g === 'Sa Unió') {
      const spp = r.g === 'Sa Unió' ? r.v : (sumPP[r.c] || 0);
      const multToUse = r.g === 'Sa Unió' ? (mult.PP || 1) : r.m;
      const transferFactor = isVoxWithdrawn ? 1.0 : X;
      const add = spp === 0 ? 0 : (sumVOX[r.c] || 0) * vVOXmult * transferFactor * (r.v / spp);
      r.f = xl(r.v * multToUse + add);
      r.note = isVoxWithdrawn
        ? `VOX retira lista (100% a ${r.g === 'Sa Unió' ? 'Sa Unió' : 'PP'})`
        : '';
    } else if (r.g === 'VOX') {
      if (isVoxWithdrawn) {
        r.f = 0;
        const target = r.c === FOR ? 'Sa Unió' : 'PP';
        r.note = `candidatura retirada (100% a ${target})`;
      } else {
        r.f = xl(r.v * r.m * (1 - X));
        r.note = '';
      }
    } else if ((r.g === 'PSOE' || r.g === 'PSC') && (sumPS[r.c] || 0) > 0 && (sumSUM[r.c] || 0) > 0) {
      r.f = xl(r.v * r.m + (sumSUM[r.c] || 0) * vSUMmult * Y * (r.v / (sumPS[r.c] || 1)));
      r.note = '';
    } else if (r.g === 'Frente Amplio' && (sumPS[r.c] || 0) > 0) {
      r.f = xl(r.v * r.m * (1 - Y));
      r.note = '';
    } else {
      r.f = xl(r.v * r.m);
      r.note = '';
    }
  });

  // Ranking by constituency
  const byCons: Record<string, ComputedCandidateRow[]> = {};
  rows.forEach(r => {
    (byCons[r.c] = byCons[r.c] || []).push(r);
  });

  Object.values(byCons).forEach(list => {
    list.forEach((r, idx) => {
      let gt = 0;
      let eqBefore = 0;
      list.forEach((o, j) => {
        if (o.f > r.f) gt++;
        else if (o.f === r.f && j < idx) eqBefore++;
      });
      r.rank = gt + eqBefore + 1;
      r.seat = r.rank <= r.s ? r.g : '';
    });
  });

  const seats: Record<string, number> = {};
  const baseSeats: Record<string, number> = {};

  const consRes: ConstituencyResult[] = data.cons.map(([name, n, b23]) => {
    const list = (byCons[name] || []).slice().sort((a, b) => a.rank - b.rank);
    const tally: Record<string, number> = {};
    const baseTally: Record<string, number> = Object.assign({}, b23 || {});

    (byCons[name] || []).forEach(r => {
      if (r.seat) {
        tally[r.seat] = (tally[r.seat] || 0) + 1;
        seats[r.seat] = (seats[r.seat] || 0) + 1;
      }
    });

    Object.keys(baseTally).forEach(g => {
      baseSeats[g] = (baseSeats[g] || 0) + baseTally[g];
    });

    const last = list[n - 1];
    const next = list[n];
    const margin = last && next ? last.f - next.f : null;

    // Diff vs 2023
    const allGs = new Set([...Object.keys(tally), ...Object.keys(baseTally)]);
    const diff: [string, number][] = [];
    if (name !== FOR) {
      allGs.forEach(g => {
        const delta = (tally[g] || 0) - (baseTally[g] || 0);
        if (delta !== 0) diff.push([g, delta]);
      });
    }

    const isFlipped = diff.length > 0;
    const isTight = margin != null && margin < 3000;

    return {
      name,
      n,
      list,
      tally,
      baseTally,
      margin,
      last,
      next,
      diff,
      isFlipped,
      isTight,
      voxWithdrawn: voxWithdrawSet.has(name)
    };
  });

  const totalSeats = consRes.reduce((acc, c) => acc + c.n, 0);

  return {
    mult,
    rows,
    seats,
    baseSeats,
    totalSeats,
    cons: consRes
  };
}
