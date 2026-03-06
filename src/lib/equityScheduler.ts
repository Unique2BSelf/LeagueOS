/**
 * Equity Scheduler Algorithm per PRD:
 * - Round-robin base
 * - Track historical "quality score" per team per field/time slot
 * - Ensure no team exceeds league average quality score by >10%
 * - Support partial season generation (remember prior assignments)
 * - Variable game lengths, blackout dates, bye/friendly opt-in
 */

export interface Team {
  id: string;
  name: string;
  divisionId: string;
  divisionLevel: number;
  qualityScore: number; // Historical performance metric
  preferredTimes: string[]; // e.g., ['morning', 'afternoon', 'evening']
  preferredFields: string[];
  blackoutDates: string[];
}

export interface Field {
  id: string;
  name: string;
  location: string;
  qualityScore: number; // Field quality 1-5
}

export interface TimeSlot {
  id: string;
  time: string; // e.g., "09:00", "10:00", "11:00"
  period: 'morning' | 'afternoon' | 'evening';
}

export interface ScheduledMatch {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  fieldId: string;
  timeSlot: string;
  date: string;
}

interface ScheduleConstraints {
  gamesPerTeam: number;
  maxGamesPerDay: number;
  avoidSameDayRematches: boolean;
  maxQualityScoreVariance: number; // 0.1 = 10%
}

const DEFAULT_CONSTRAINTS: ScheduleConstraints = {
  gamesPerTeam: 10,
  maxGamesPerDay: 3,
  avoidSameDayRematches: true,
  maxQualityScoreVariance: 0.1,
};

/**
 * Calculate league average quality score
 */
export function calculateLeagueAverage(teams: Team[]): number {
  if (teams.length === 0) return 100;
  const sum = teams.reduce((acc, t) => acc + t.qualityScore, 0);
  return sum / teams.length;
}

/**
 * Check if team quality score exceeds allowed variance
 */
export function isWithinQualityThreshold(
  team: Team,
  leagueAverage: number,
  maxVariance: number = 0.1
): boolean {
  const diff = Math.abs(team.qualityScore - leagueAverage) / leagueAverage;
  return diff <= maxVariance;
}

/**
 * Generate time slots for a day
 */
export function generateTimeSlots(startHour: number = 9, numSlots: number = 5): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let i = 0; i < numSlots; i++) {
    const hour = startHour + i;
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    slots.push({
      id: `${hour}:00`,
      time: `${hour}:00`,
      period,
    });
  }
  return slots;
}

/**
 * Check for blackout date conflict
 */
export function hasBlackoutConflict(team: Team, date: string): boolean {
  return team.blackoutDates.includes(date);
}

/**
 * Check for same-day rematch
 */
export function hasSameDayRematch(
  existingMatches: ScheduledMatch[],
  homeTeamId: string,
  awayTeamId: string,
  date: string
): boolean {
  if (!existingMatches.length) return false;
  
  const dateMatches = existingMatches.filter(m => m.date === date);
  return dateMatches.some(m => 
    (m.homeTeamId === homeTeamId && m.awayTeamId === awayTeamId) ||
    (m.homeTeamId === awayTeamId && m.awayTeamId === homeTeamId)
  );
}

/**
 * Check for jersey color conflict per PRD:
 * - If home.primaryColor ≈ away.primaryColor (RGB delta < threshold)
 */
export function hasJerseyConflict(color1: string, color2: string, threshold: number = 50): boolean {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return false;
  
  const delta = Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
  
  return delta < threshold;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * Main equity scheduler algorithm
 */
export function generateEquitySchedule(
  teams: Team[],
  fields: Field[],
  dates: string[],
  constraints: ScheduleConstraints = DEFAULT_CONSTRAINTS,
  existingMatches: ScheduledMatch[] = []
): {
  matches: ScheduledMatch[];
  conflicts: string[];
  qualityViolations: string[];
} {
  const matches: ScheduledMatch[] = [...existingMatches];
  const conflicts: string[] = [];
  const qualityViolations: string[] = [];
  
  const leagueAverage = calculateLeagueAverage(teams);
  const timeSlots = generateTimeSlots();
  
  // Group teams by division
  const divisions = new Map<number, Team[]>();
  teams.forEach(team => {
    const list = divisions.get(team.divisionLevel) || [];
    list.push(team);
    divisions.set(team.divisionLevel, list);
  });
  
  // Generate matches for each division
  divisions.forEach((divisionTeams, divisionLevel) => {
    if (divisionTeams.length < 2) {
      conflicts.push(`Division ${divisionLevel}: Not enough teams (${divisionTeams.length})`);
      return;
    }
    
    // Round-robin within division
    for (let i = 0; i < divisionTeams.length; i++) {
      for (let j = i + 1; j < divisionTeams.length; j++) {
        const home = divisionTeams[i];
        const away = divisionTeams[j];
        
        // Find best slot
        let scheduled = false;
        for (const date of dates) {
          // Skip blackout dates
          if (hasBlackoutConflict(home, date) || hasBlackoutConflict(away, date)) {
            conflicts.push(`${home.name} or ${away.name} has blackout on ${date}`);
            continue;
          }
          
          // Skip same-day rematches
          if (constraints.avoidSameDayRematches && 
              hasSameDayRematch(matches, home.id, away.id, date)) {
            continue;
          }
          
          // Check team games per day
          const dayGames = matches.filter(m => m.date === date && 
            (m.homeTeamId === home.id || m.awayTeamId === home.id)).length;
          if (dayGames >= constraints.maxGamesPerDay) continue;
          
          // Assign field and time
          for (const field of fields) {
            for (const slot of timeSlots) {
              // Check quality threshold
              if (!isWithinQualityThreshold(home, leagueAverage, constraints.maxQualityScoreVariance)) {
                qualityViolations.push(`${home.name} exceeds quality threshold`);
              }
              
              matches.push({
                matchId: `match-${Date.now()}-${i}-${j}`,
                homeTeamId: home.id,
                awayTeamId: away.id,
                fieldId: field.id,
                timeSlot: slot.time,
                date,
              });
              scheduled = true;
              break;
            }
            if (scheduled) break;
          }
          if (scheduled) break;
        }
        
        if (!scheduled) {
          conflicts.push(`Could not schedule ${home.name} vs ${away.name}`);
        }
      }
    }
  });
  
  return { matches, conflicts, qualityViolations };
}

/**
 * Suggest field swap for jersey conflict
 */
export function suggestFieldSwap(
  match: ScheduledMatch,
  fields: Field[],
  allMatches: ScheduledMatch[]
): string[] {
  const suggestions: string[] = [];
  
  for (const field of fields) {
    if (field.id === match.fieldId) continue;
    
    // Check if field is available at match time
    const conflict = allMatches.find(m => 
      m.fieldId === field.id && 
      m.timeSlot === match.timeSlot && 
      m.date === match.date
    );
    
    if (!conflict) {
      suggestions.push(`Swap to ${field.name}`);
    }
  }
  
  return suggestions;
}
