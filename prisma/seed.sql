-- Seed test data for League OS
-- Run: psql -d league_os -f seed.sql

-- Users
INSERT INTO "User" (id, email, password, fullName, role, isActive, isInsured, eloRating, isGoalie) VALUES
('user-admin', 'admin@league.os', 'TestPass123!', 'Admin User', 'ADMIN', true, true, 1200, false),
('user-captain', 'captain@league.os', 'TestPass123!', 'Team Captain', 'CAPTAIN', true, true, 1400, false),
('user-player', 'player@league.os', 'TestPass123!', 'Player User', 'PLAYER', true, true, 1300, false),
('user-referee', 'referee@league.os', 'TestPass123!', 'Referee User', 'REF', true, true, 1200, false),
('user-goalie', 'goalie@league.os', 'TestPass123!', 'Goalie User', 'PLAYER', true, true, 1150, true),
('user-sponsor', 'sponsor@league.os', 'TestPass123!', 'Sponsor User', 'SPONSOR', true, false, 1200, false)
ON CONFLICT (email) DO NOTHING;

-- Teams
INSERT INTO "Team" (id, name, captainId, divisionId, primaryColor, secondaryColor, escrowTarget, currentBalance, isConfirmed, seasonId, subQuotaRemaining) VALUES
('team-1', 'FC United', 'user-captain', 'div-1', '#FF0000', '#FFFFFF', 2000, 2000, true, 'season-1', 10),
('team-2', 'City Kickers', 'user-captain', 'div-1', '#0000FF', '#FFFF00', 2000, 1800, true, 'season-1', 8),
('team-3', 'Riverside FC', 'user-captain', 'div-2', '#00FF00', '#000000', 1800, 1200, false, 'season-1', 10)
ON CONFLICT (id) DO NOTHING;

-- Matches
INSERT INTO "Match" (id, scheduledAt, fieldId, homeTeamId, awayTeamId, status, seasonId) VALUES
('match-1', '2026-03-15 10:00:00', 'field-1', 'team-1', 'team-2', 'SCHEDULED', 'season-1'),
('match-2', '2026-03-15 12:00:00', 'field-2', 'team-3', 'team-1', 'SCHEDULED', 'season-1'),
('match-3', '2026-03-08 10:00:00', 'field-1', 'team-2', 'team-3', 'FINAL', 'season-1')
ON CONFLICT (id) DO NOTHING;

-- Background Checks
INSERT INTO "BackgroundCheck" (id, userId, provider, status, expiresAt) VALUES
('bg-1', 'user-referee', 'Checkr', 'CLEAR', '2027-01-01')
ON CONFLICT (id) DO NOTHING;

-- Fundraising Campaigns
INSERT INTO "FundraisingCampaign" (id, name, goalAmount, current, description, endDate) VALUES
('camp-1', 'Season Equipment Fund', 5000, 2500, 'Help us buy new goals and nets', '2026-04-01'),
('camp-2', 'Field Improvement', 10000, 3200, 'Upgrade lighting and drainage', '2026-06-01')
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO "Product" (id, name, description, category, basePrice, sizes, colors, stock, isActive, isFeatured) VALUES
('prod-1', 'League Jersey', 'Official league jersey with team colors', 'JERSEYS', 45.00, ARRAY['XS','S','M','L','XL','XXL'], ARRAY['Red','Blue','White','Black'], 200, true, true),
('prod-2', 'Training Kit', 'Training bibs, cones, and ball', 'EQUIPMENT', 35.00, ARRAY['One Size'], ARRAY['Multi'], 50, true, false),
('prod-3', 'Winter Jacket', 'Warm winter jacket with league logo', 'APPAREL', 75.00, ARRAY['S','M','L','XL'], ARRAY['Navy','Black'], 75, true, true)
ON CONFLICT (id) DO NOTHING;

SELECT 'Database seeded!' as status;
