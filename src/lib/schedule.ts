import { prisma } from '@/lib/prisma';
import {
  calculateLeagueAverage,
  generateEquitySchedule,
  type Field,
  type Team,
} from '@/lib/equityScheduler';

export type ScheduleMatchView = {
  matchId: string;
  seasonId: string;
  seasonName: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  fieldId: string;
  fieldName: string;
  locationName: string;
  timeSlot: string;
  date: string;
  scheduledAt: string;
  matchType: string;
  gameLengthMinutes: number;
  refId: string | null;
  refName: string | null;
  status: string;
  divisionName: string | null;
};

export type ScheduleSummary = {
  totalTeams: number;
  totalFields: number;
  scheduledMatches: number;
  leagueAverageQualityScore: number;
  divisions: string[];
};

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function toTimeSlot(date: Date): string {
  return date.toISOString().split('T')[1].slice(0, 5);
}

function toSchedulerTeams(teams: Array<{
  id: string;
  name: string;
  divisionId: string;
  division: { level: number; name: string } | null;
}>) : Team[] {
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    divisionId: team.divisionId,
    divisionLevel: team.division?.level || 1,
    qualityScore: 100,
    preferredTimes: [],
    preferredFields: [],
    blackoutDates: [],
  }));
}

function toSchedulerFields(fields: Array<{
  id: string;
  name: string;
  qualityScore: number;
  location: { name: string };
}>) : Field[] {
  return fields.map((field) => ({
    id: field.id,
    name: field.name,
    location: field.location.name,
    qualityScore: field.qualityScore,
  }));
}

async function resolveSeason(preferredSeasonId?: string | null) {
  if (preferredSeasonId) {
    const season = await prisma.season.findUnique({ where: { id: preferredSeasonId } });
    if (season) {
      return season;
    }
  }

  return prisma.season.findFirst({
    where: { isArchived: false },
    orderBy: { startDate: 'desc' },
  });
}

export async function getSchedulerSeasons() {
  const seasons = await prisma.season.findMany({
    where: { isArchived: false },
    orderBy: { startDate: 'desc' },
  });

  return seasons.map((season) => ({
    id: season.id,
    name: season.name,
    startDate: season.startDate.toISOString(),
    endDate: season.endDate?.toISOString() || null,
  }));
}

export async function getSchedulerTeamsBySeason(seasonId?: string | null) {
  const season = await resolveSeason(seasonId);
  if (!season) {
    return [];
  }

  const teams = await prisma.team.findMany({
    where: {
      seasonId: season.id,
      approvalStatus: 'APPROVED',
    },
    include: {
      division: true,
    },
  });

  return toSchedulerTeams(
    teams.sort((a, b) => {
      const levelDelta = (a.division?.level || 0) - (b.division?.level || 0);
      if (levelDelta !== 0) {
        return levelDelta;
      }

      return a.name.localeCompare(b.name);
    })
  );
}

export async function getSchedulerFields(locationId?: string | null, fieldIds?: string[] | null) {
  const normalizedFieldIds = Array.isArray(fieldIds) ? fieldIds.filter(Boolean) : [];
  const fields = await prisma.field.findMany({
    where: {
      ...(locationId ? { locationId } : {}),
      ...(normalizedFieldIds.length ? { id: { in: normalizedFieldIds } } : {}),
    },
    include: { location: true },
  });

  return toSchedulerFields(
    fields.sort((a, b) => {
      const locationDelta = a.location.name.localeCompare(b.location.name);
      if (locationDelta !== 0) {
        return locationDelta;
      }

      return a.name.localeCompare(b.name);
    })
  );
}

export async function getScheduleMatches(seasonId?: string | null): Promise<ScheduleMatchView[]> {
  const season = await resolveSeason(seasonId);
  if (!season) {
    return [];
  }

  const matches = await prisma.match.findMany({
    where: { seasonId: season.id },
    include: {
      season: true,
      homeTeam: { include: { division: true } },
      awayTeam: { include: { division: true } },
      ref: { select: { id: true, fullName: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  const fieldIds = [...new Set(matches.map((match) => match.fieldId))];
  const fields = fieldIds.length
    ? await prisma.field.findMany({
        where: { id: { in: fieldIds } },
        include: { location: true },
      })
    : [];
  const fieldsById = new Map(fields.map((field) => [field.id, field]));

  return matches.map((match) => {
    const field = fieldsById.get(match.fieldId);

    return {
      matchId: match.id,
      seasonId: match.seasonId,
      seasonName: match.season.name,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      fieldId: match.fieldId,
      fieldName: field?.name ?? 'Unknown Field',
      locationName: field?.location?.name ?? 'Unknown Location',
      timeSlot: toTimeSlot(match.scheduledAt),
      date: toIsoDate(match.scheduledAt),
      scheduledAt: match.scheduledAt.toISOString(),
      matchType: match.matchType || 'REGULAR',
      gameLengthMinutes: match.gameLengthMinutes || 60,
      refId: match.refId,
      refName: match.ref?.fullName ?? null,
      status: match.status,
      divisionName: match.homeTeam.division?.name ?? match.awayTeam.division?.name ?? null,
    };
  });
}

export async function getScheduleSummary(seasonId?: string | null): Promise<ScheduleSummary> {
  const [teams, fields, matches] = await Promise.all([
    getSchedulerTeamsBySeason(seasonId),
    getSchedulerFields(),
    getScheduleMatches(seasonId),
  ]);

  const teamQualityScores = teams.map((team) => team.qualityScore);
  const leagueAverage = teamQualityScores.length
    ? teamQualityScores.reduce((sum, value) => sum + value, 0) / teamQualityScores.length
    : 100;

  return {
    totalTeams: teams.length,
    totalFields: fields.length,
    scheduledMatches: matches.length,
    leagueAverageQualityScore: leagueAverage,
    divisions: [...new Set(teams.map((team) => team.divisionId))],
  };
}

export async function generateSeasonSchedule(input: {
  seasonId?: string | null;
  dates: string[];
  gamesPerTeam?: number;
  maxGamesPerDay?: number;
  replaceExisting?: boolean;
  locationId?: string | null;
  fieldIds?: string[] | null;
}) {
  const season = await resolveSeason(input.seasonId);
  if (!season) {
    throw new Error('No active season found');
  }

  const [teams, fields] = await Promise.all([
    getSchedulerTeamsBySeason(season.id),
    getSchedulerFields(input.locationId, input.fieldIds),
  ]);

  if (teams.length < 2) {
    throw new Error('Need at least two approved teams in the selected season');
  }

  if (fields.length === 0) {
    throw new Error('Need at least one field before generating a schedule');
  }

  const existingMatches = input.replaceExisting === false
    ? await getScheduleMatches(season.id)
    : [];

  const result = generateEquitySchedule(
    teams,
    fields,
    input.dates,
    {
      gamesPerTeam: input.gamesPerTeam || 10,
      maxGamesPerDay: input.maxGamesPerDay || 2,
      avoidSameDayRematches: true,
      maxQualityScoreVariance: 0.1,
    },
    existingMatches.map((match) => ({
      matchId: match.matchId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      fieldId: match.fieldId,
      timeSlot: match.timeSlot,
      date: match.date,
    }))
  );

  if (input.replaceExisting !== false) {
    await prisma.match.deleteMany({
      where: { seasonId: season.id },
    });
  }

  for (const match of result.matches) {
    const [year, month, day] = match.date.split('-').map(Number);
    const [hours, minutes] = match.timeSlot.split(':').map(Number);
    const scheduledAt = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    await prisma.match.create({
      data: {
        scheduledAt,
        fieldId: match.fieldId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        seasonId: season.id,
        status: 'SCHEDULED',
        matchType: 'REGULAR',
        gameLengthMinutes: 60,
      },
    });
  }

  const savedMatches = await getScheduleMatches(season.id);

  return {
    seasonId: season.id,
    seasonName: season.name,
    matches: savedMatches,
    conflicts: result.conflicts,
    qualityViolations: result.qualityViolations,
    stats: {
      totalMatches: savedMatches.length,
      teams: teams.length,
      dates: input.dates.length,
      leagueAverage: calculateLeagueAverage(teams),
    },
  };
}
