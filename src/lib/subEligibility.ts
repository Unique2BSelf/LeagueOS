/**
 * Sub Eligibility Logic per PRD:
 * - Standard: player.homeDivision >= match.division - 1 && <= match.division + any higher
 * - Goalie Exception: if player.isGoalie === true → ignore division restriction
 * - Ringer Flag: if player.eloRating > (divisionAverage * 1.5) → notify admin/ref
 * - Free for insured players only
 * - Seasonal quota per team; injury subs exempt from quota (admin approval)
 */

interface Player {
  id: string;
  eloRating: number;
  isGoalie: boolean;
  isInsured: boolean;
  homeDivision: number;
}

interface Match {
  id: string;
  division: number;
}

interface Team {
  id: string;
  subQuotaRemaining: number;
}

export function checkSubEligibility(player: Player, match: Match, team: Team, divisionAverageElo: number): {
  eligible: boolean;
  reason?: string;
  isRinger?: boolean;
  isGoalieException?: boolean;
  requiresInsurance?: boolean;
  quotaExhausted?: boolean;
} {
  // Check insurance first (required)
  if (!player.isInsured) {
    return { eligible: false, reason: 'Player must be insured to request subs', requiresInsurance: true };
  }
  
  // Check quota
  if (team.subQuotaRemaining <= 0) {
    return { eligible: false, reason: 'Team sub quota exhausted for season', quotaExhausted: true };
  }
  
  // Goalie exception - can play any division
  if (player.isGoalie) {
    const isRinger = player.eloRating > (divisionAverageElo * 1.5);
    return { 
      eligible: true, 
      isGoalieException: true,
      isRinger 
    };
  }
  
  // 1-Down/Any-Up rule: can play current division, 1 down, or any higher
  const minDivision = match.division - 1;
  const maxDivision = match.division + 10; // "Any Up" means any higher
  
  if (player.homeDivision < minDivision) {
    return { eligible: false, reason: `Player division (${player.homeDivision}) too low for this match (${match.division})` };
  }
  
  // Check for ringer
  const isRinger = player.eloRating > (divisionAverageElo * 1.5);
  
  return { eligible: true, isRinger };
}

export function calculateDivisionAverageElo(players: { eloRating: number }[]): number {
  if (players.length === 0) return 1200;
  const sum = players.reduce((acc, p) => acc + p.eloRating, 0);
  return Math.round(sum / players.length);
}
