// ---- Motor del modelo (réplica de la hoja «Futurible indexado») ----
function computeModel(DATA, inp) {
  // inp: { pct: {PP,PSOE,Frente Amplio,VOX,...}, sdpOverride: number|null, direct: {AHI,...}, X: number }
  const pct23 = {}, pct26 = {};
  DATA.mult.forEach(m => { if (typeof m.b === 'number') pct23[m.g] = m.b; });
  Object.keys(inp.pct).forEach(g => { pct26[g] = inp.pct[g]; });
  const mult = {};
  DATA.mult.forEach(m => {
    const g = m.g;
    if (g === 'SdP') {
      const b = pct23.PSOE + pct23['Frente Amplio'];
      const c = (inp.sdpOverride != null) ? inp.sdpOverride : (pct26.PSOE + pct26['Frente Amplio']);
      mult[g] = c / b;
    } else if (g === 'PSC') {
      mult[g] = pct26.PSOE / pct23.PSOE;
    } else if (typeof m.b === 'number') {
      mult[g] = pct26[g] / pct23[g];
    } else {
      mult[g] = inp.direct[g] != null ? inp.direct[g] : 1;
    }
  });
  const X = inp.X;
  const rows = DATA.rows.map((r, i) => ({ i, c: r.c, l: r.l, g: r.g, v: r.v, s: r.s, base: r.base, m: mult[r.g] }));
  // sumas por circunscripción (votos base 2023)
  const sumPP = {}, sumVOX = {}, sumPS = {}, sumSUM = {};
  const Y = inp.Y || 0;
  rows.forEach(r => {
    if (r.g === 'PP') sumPP[r.c] = (sumPP[r.c] || 0) + r.v;
    if (r.g === 'VOX') sumVOX[r.c] = (sumVOX[r.c] || 0) + r.v;
    if (r.g === 'PSOE' || r.g === 'PSC') sumPS[r.c] = (sumPS[r.c] || 0) + r.v;
    if (r.g === 'Frente Amplio') sumSUM[r.c] = (sumSUM[r.c] || 0) + r.v;
  });
  const xl = x => Math.floor(x + 0.5 + 1e-9);   // ROUND de Excel (positivos)
  // Navarra: coalición PP+UPN bajo marca UPN (i-ésimo UPN + i-ésimo PP, por votos base)
  const navUPN = rows.filter(r => r.c === 'Navarra' && r.g === 'UPN' && r.l.indexOf('UNIÓN DEL PUEBLO') === 0);
  const navPP  = rows.filter(r => r.c === 'Navarra' && r.g === 'UPN' && r.l === 'PARTIDO POPULAR');
  const navPair = new Map(), navAbsorbed = new Set();
  navUPN.forEach((u, k) => { if (navPP[k]) navPair.set(u.i, navPP[k]); });
  navPP.forEach(p => navAbsorbed.add(p.i));
  const vVOXmult = mult.VOX;
  rows.forEach(r => {
    if (navAbsorbed.has(r.i)) { r.f = 0; r.note = 'absorbido'; }
    else if (navPair.has(r.i)) { const p = navPair.get(r.i); r.f = xl(r.v * r.m + p.v * p.m); r.note = 'coalición PP+UPN'; }
    else if (r.g === 'PP') {
      const spp = sumPP[r.c] || 0;
      const add = spp === 0 ? 0 : (sumVOX[r.c] || 0) * vVOXmult * X * (r.v / spp);
      r.f = xl(r.v * r.m + add); r.note = '';
    }
    else if (r.g === 'VOX') { r.f = xl(r.v * r.m * (1 - X)); r.note = ''; }
    else if ((r.g === 'PSOE' || r.g === 'PSC') && sumPS[r.c] > 0 && sumSUM[r.c] > 0) {
      r.f = xl(r.v * r.m + sumSUM[r.c] * mult['Frente Amplio'] * Y * (r.v / sumPS[r.c])); r.note = '';
    }
    else if (r.g === 'Frente Amplio' && sumPS[r.c] > 0) { r.f = xl(r.v * r.m * (1 - Y)); r.note = ''; }
    else { r.f = xl(r.v * r.m); r.note = ''; }
  });
  // ranking con desempate por orden de fila (igual que COUNTIFS de Excel)
  const byCons = {};
  rows.forEach(r => { (byCons[r.c] = byCons[r.c] || []).push(r); });
  Object.values(byCons).forEach(list => {
    list.forEach((r, idx) => {
      let gt = 0, eqBefore = 0;
      list.forEach((o, j) => { if (o.f > r.f) gt++; else if (o.f === r.f && j < idx) eqBefore++; });
      r.rank = gt + eqBefore + 1;
      r.seat = r.rank <= r.s ? r.g : '';
    });
  });
  // agregados
  const seats = {}, baseSeats = {};
  const consRes = DATA.cons.map(([name, n, b23]) => {
    const list = byCons[name].slice().sort((a, b) => a.rank - b.rank);
    const tally = {}, baseTally = Object.assign({}, b23 || {});
    byCons[name].forEach(r => {
      if (r.seat) { tally[r.seat] = (tally[r.seat] || 0) + 1; seats[r.seat] = (seats[r.seat] || 0) + 1; }
    });
    Object.keys(baseTally).forEach(g => { baseSeats[g] = (baseSeats[g] || 0) + baseTally[g]; });
    const last = list[n - 1], next = list[n];
    return { name, n, list, tally, baseTally, margin: (last && next) ? last.f - next.f : null, last, next };
  });
  return { mult, rows, seats, baseSeats, cons: consRes };
}
