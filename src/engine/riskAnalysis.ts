import { ConstituencyResult, ComputedCandidateRow, ModelResult } from './senateEngine';

export const RIGHT_WING_PARTIES = new Set(['PP', 'UPN', 'VOX', 'Sa Unió']);

export function isRightWing(partyGroup: string): boolean {
  return RIGHT_WING_PARTIES.has(partyGroup);
}

export interface ConstituencyRiskProfile {
  name: string;
  n: number; // total seats in constituency
  maxRightSeats: number; // 3 in 4-seat, 2 in 3-seat, 2 in 2-seat, 1 in 1-seat
  currentRightSeats: number;
  hasMaxSeats: boolean; // whether right holds the maximum possible seats
  seatsDistribution: Record<string, number>;
  statusType: 'below_max' | 'at_risk_max' | 'safe_max';
  scenarioTransition: string; // e.g. "3-1 ➔ 2-2", "2-2 (sin máximo)", etc.

  // If right holds maximum/majority: margin to losing a seat to a non-right party
  lastRightElected?: ComputedCandidateRow;
  firstNonRightChallenger?: ComputedCandidateRow;
  marginToLoseVotes: number | null; // absolute vote difference
  marginToLosePct: number | null; // adjusted for population / total effective voters

  // If right holds below max (left wins): margin to gaining that extra seat
  firstRightChallenger?: ComputedCandidateRow;
  lastNonRightElected?: ComputedCandidateRow;
  marginToGainVotes: number | null; // votes needed to reach the seat
  marginToGainPct: number | null; // % of effective voters needed to flip

  totalVotes: number;
  estimatedVoters: number;
  riskCategory: 'minority' | 'critical' | 'moderate' | 'safe';
  riskCategoryLabel: string;
  feasibilityLabel?: string; // for left-winning list: "Muy factible", "Posible", "Difícil", "Imposible"
  voxWithdrawn: boolean;
  hasVoxCandidates: boolean;
  estimatedVoxVotes: number;
}

export interface RightWingDualRanking {
  leftWinningList: ConstituencyRiskProfile[];
  rightWinningList: ConstituencyRiskProfile[];
  totalCirc: number;
  rightSeats: number;
  leftWinningCount: number;
  rightWinningCount: number;
  criticalCount: number;
  moderateCount: number;
  safeCount: number;
}

export function computeRightWingRiskAnalysis(result: ModelResult): RightWingDualRanking {
  const allProfiles: ConstituencyRiskProfile[] = result.cons.map(c => {
    const n = c.n;
    // Max possible seats for a single bloc under limited voting:
    // 4 seats -> 3 max
    // 3 seats -> 2 max
    // 2 seats -> 2 max (Ceuta/Melilla)
    // 1 seat -> 1 max
    let maxRightSeats = 3;
    if (n === 3) maxRightSeats = 2;
    else if (n === 2) maxRightSeats = 2;
    else if (n === 1) maxRightSeats = 1;

    // Count right seats won in 2026
    let currentRightSeats = 0;
    Object.entries(c.tally).forEach(([g, count]) => {
      if (isRightWing(g)) currentRightSeats += count;
    });

    const hasMaxSeats = currentRightSeats >= maxRightSeats;

    // Candidates in this constituency sorted by rank
    const list = c.list;
    const elected = list.filter(cand => cand.rank <= n);
    const nonElected = list.filter(cand => cand.rank > n);

    // Total votes cast across all candidates in constituency
    const totalVotes = list.reduce((sum, cand) => sum + cand.f, 0);
    // In limited voting: 3 votes per voter in 4-seat; 2 in 3-seat; 2 in 2-seat; 1 in 1-seat
    const votesPerVoter = n === 4 ? 3 : n === 3 ? 2 : n === 2 ? 2 : 1;
    const estimatedVoters = Math.max(1, Math.round(totalVotes / votesPerVoter));

    // Case 1: When right holds seats and could LOSE a senator to a non-right party
    const rightElected = elected.filter(cand => isRightWing(cand.g));
    const lastRightElected = rightElected[rightElected.length - 1];

    const nonRightChallengers = nonElected.filter(cand => !isRightWing(cand.g));
    const firstNonRightChallenger = nonRightChallengers[0];

    let marginToLoseVotes: number | null = null;
    let marginToLosePct: number | null = null;

    if (lastRightElected && firstNonRightChallenger) {
      marginToLoseVotes = lastRightElected.f - firstNonRightChallenger.f;
      marginToLosePct = (marginToLoseVotes / estimatedVoters) * 100;
    }

    // Case 2: When right is BELOW MAX (left wins) and right could GAIN a seat
    const nonRightElected = elected.filter(cand => !isRightWing(cand.g));
    const lastNonRightElected = nonRightElected[nonRightElected.length - 1];

    const rightChallengers = nonElected.filter(cand => isRightWing(cand.g));
    const firstRightChallenger = rightChallengers[0];

    let marginToGainVotes: number | null = null;
    let marginToGainPct: number | null = null;

    if (firstRightChallenger && lastNonRightElected) {
      marginToGainVotes = lastNonRightElected.f - firstRightChallenger.f;
      marginToGainPct = (marginToGainVotes / estimatedVoters) * 100;
    }

    // Determine transition description
    let scenarioTransition = '';
    if (n === 4) {
      if (currentRightSeats >= 3) scenarioTransition = '3-1 ➔ 2-2';
      else if (currentRightSeats === 2) scenarioTransition = '2-2 (sin mayoría)';
      else if (currentRightSeats === 1) scenarioTransition = '1-3 (sin mayoría)';
      else scenarioTransition = '0-4 (sin escaños)';
    } else if (n === 3) {
      if (currentRightSeats >= 2) scenarioTransition = '2-1 ➔ 1-2';
      else if (currentRightSeats === 1) scenarioTransition = '1-2 (sin mayoría)';
      else scenarioTransition = '0-3 (sin escaños)';
    } else if (n === 2) {
      if (currentRightSeats >= 2) scenarioTransition = '2-0 ➔ 1-1';
      else if (currentRightSeats === 1) scenarioTransition = '1-1 (sin mayoría)';
      else scenarioTransition = '0-2 (sin escaños)';
    } else if (n === 1) {
      if (currentRightSeats >= 1) scenarioTransition = '1-0 ➔ 0-1';
      else scenarioTransition = '0-1 (sin escaño)';
    }

    // Categorization
    let statusType: 'below_max' | 'at_risk_max' | 'safe_max' = 'safe_max';
    let riskCategory: 'minority' | 'critical' | 'moderate' | 'safe' = 'safe';
    let riskCategoryLabel = 'Plaza Segura';
    let feasibilityLabel = '';

    if (!hasMaxSeats) {
      statusType = 'below_max';
      riskCategory = 'minority';
      riskCategoryLabel = 'Vence la Izquierda / Nacionalistas';

      const deficit = marginToGainPct ?? 50;
      if (deficit < 2.0) feasibilityLabel = 'Muy Factible (< 2 %)';
      else if (deficit < 5.0) feasibilityLabel = 'Posible (2-5 %)';
      else if (deficit < 10.0) feasibilityLabel = 'Difícil (5-10 %)';
      else feasibilityLabel = 'Imposible (> 10 %)';
    } else {
      const marginPct = marginToLosePct ?? 100;
      if (marginPct < 2.0) {
        statusType = 'at_risk_max';
        riskCategory = 'critical';
        riskCategoryLabel = 'Riesgo Crítico (< 2 %)';
      } else if (marginPct < 5.0) {
        statusType = 'at_risk_max';
        riskCategory = 'moderate';
        riskCategoryLabel = 'Riesgo Moderado (2-5 %)';
      } else {
        statusType = 'safe_max';
        riskCategory = 'safe';
        riskCategoryLabel = 'Bastión Seguro (> 5 %)';
      }
    }

    return {
      name: c.name,
      n,
      maxRightSeats,
      currentRightSeats,
      hasMaxSeats,
      seatsDistribution: c.tally,
      statusType,
      scenarioTransition,
      lastRightElected,
      firstNonRightChallenger,
      marginToLoseVotes,
      marginToLosePct,
      firstRightChallenger,
      lastNonRightElected,
      marginToGainVotes,
      marginToGainPct,
      totalVotes,
      estimatedVoters,
      riskCategory,
      riskCategoryLabel,
      feasibilityLabel,
      voxWithdrawn: c.voxWithdrawn,
      hasVoxCandidates: list.some(cand => cand.g === 'VOX'),
      estimatedVoxVotes: Math.round(
        Math.max(
          0,
          ...list
            .filter(cand => cand.g === 'VOX')
            .map(cand => cand.v * (result.mult.VOX || 1))
        )
      )
    };
  });

  // Group 1: Where LEFT/OPPOSITION WINS (right has less than maximum possible seats)
  // Sorted from MOST POSSIBLE to recover to IMPOSSIBLE (ascending deficit %)
  const leftWinningList = allProfiles
    .filter(p => p.statusType === 'below_max')
    .sort((a, b) => (a.marginToGainPct ?? 999) - (b.marginToGainPct ?? 999));

  // Group 2: Where RIGHT HAS THE MAJORITY (maximum seats 3-1, 2-1, 2-0, 1-0)
  // Sorted from MOST CRITICAL to SAFEST (ascending margin % to lose a senator)
  const rightWinningList = allProfiles
    .filter(p => p.statusType !== 'below_max')
    .sort((a, b) => (a.marginToLosePct ?? 999) - (b.marginToLosePct ?? 999));

  const rightSeats = (result.seats['PP'] || 0) + (result.seats['UPN'] || 0) + (result.seats['VOX'] || 0) + (result.seats['Sa Unió'] || 0);
  const criticalCount = rightWinningList.filter(p => p.riskCategory === 'critical').length;
  const moderateCount = rightWinningList.filter(p => p.riskCategory === 'moderate').length;
  const safeCount = rightWinningList.filter(p => p.riskCategory === 'safe').length;

  return {
    leftWinningList,
    rightWinningList,
    totalCirc: allProfiles.length,
    rightSeats,
    leftWinningCount: leftWinningList.length,
    rightWinningCount: rightWinningList.length,
    criticalCount,
    moderateCount,
    safeCount
  };
}
