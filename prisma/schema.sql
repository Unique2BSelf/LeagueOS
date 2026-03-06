-- League OS Database Schema
-- Run: psql -d league_os -f schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT DEFAULT 'PLAYER',
    fullName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    photoUrl TEXT,
    isInsured BOOLEAN DEFAULT false,
    insuranceExpiry TIMESTAMP,
    eloRating INTEGER DEFAULT 1200,
    isGoalie BOOLEAN DEFAULT false,
    taxIdEncrypted TEXT,
    isActive BOOLEAN DEFAULT true,
    hideFromDirectory BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS "Team" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    captainId TEXT,
    divisionId TEXT,
    primaryColor TEXT,
    secondaryColor TEXT,
    jerseyPhotoUrl TEXT,
    escrowTarget REAL DEFAULT 2000,
    currentBalance REAL DEFAULT 0,
    isConfirmed BOOLEAN DEFAULT false,
    subQuotaRemaining INTEGER DEFAULT 10,
    sponsorId TEXT,
    seasonId TEXT
);

-- Matches table
CREATE TABLE IF NOT EXISTS "Match" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduledAt TIMESTAMP NOT NULL,
    fieldId TEXT,
    homeTeamId TEXT,
    awayTeamId TEXT,
    refId TEXT,
    homeScore INTEGER,
    awayScore INTEGER,
    status TEXT DEFAULT 'SCHEDULED',
    checklistDone BOOLEAN DEFAULT false,
    streamLink TEXT,
    weatherStatus TEXT,
    seasonId TEXT
);

-- Ledger table
CREATE TABLE IF NOT EXISTS "Ledger" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    userId TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    year INTEGER,
    description TEXT,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Disciplinary Actions table
CREATE TABLE IF NOT EXISTS "DisciplinaryAction" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    userId TEXT NOT NULL,
    matchId TEXT,
    cardType TEXT,
    fineAmount REAL DEFAULT 0,
    isPaid BOOLEAN DEFAULT false,
    isReleased BOOLEAN DEFAULT false,
    suspensionGames INTEGER DEFAULT 0,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Background Checks table
CREATE TABLE IF NOT EXISTS "BackgroundCheck" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    userId TEXT NOT NULL,
    provider TEXT,
    status TEXT,
    resultUrl TEXT,
    expiresAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Volunteer Shifts table
CREATE TABLE IF NOT EXISTS "VolunteerShift" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    userId TEXT,
    eventId TEXT,
    role TEXT,
    hours REAL,
    status TEXT DEFAULT 'ASSIGNED',
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Fundraising Campaigns table
CREATE TABLE IF NOT EXISTS "FundraisingCampaign" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    goalAmount REAL NOT NULL,
    current REAL DEFAULT 0,
    description TEXT,
    endDate TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Maintenance Logs table
CREATE TABLE IF NOT EXISTS "MaintenanceLog" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    fieldId TEXT NOT NULL,
    issue TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS "Product" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    basePrice REAL NOT NULL,
    imageUrl TEXT,
    sizes TEXT[],
    colors TEXT[],
    stock INTEGER DEFAULT 100,
    isActive BOOLEAN DEFAULT true,
    isFeatured BOOLEAN DEFAULT false,
    externalUrl TEXT,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS "Order" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    userId TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    total REAL NOT NULL,
    shippingAddress TEXT,
    trackingNumber TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- Analytics Events table
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    eventType TEXT NOT NULL,
    userId TEXT,
    teamId TEXT,
    matchId TEXT,
    metadata JSONB,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Insert test users
INSERT INTO "User" (id, email, password, fullName, role, isActive) 
VALUES 
    ('user-admin', 'admin@league.os', 'TestPass123!', 'Admin User', 'ADMIN', true),
    ('user-captain', 'captain@league.os', 'TestPass123!', 'Team Captain', 'CAPTAIN', true),
    ('user-player', 'player@league.os', 'TestPass123!', 'Player User', 'PLAYER', true),
    ('user-referee', 'referee@league.os', 'TestPass123!', 'Referee User', 'REF', true)
ON CONFLICT (email) DO NOTHING;

-- Insert test teams
INSERT INTO "Team" (id, name, captainId, divisionId, primaryColor, secondaryColor, escrowTarget, currentBalance, isConfirmed, seasonId)
VALUES 
    ('team-1', 'FC United', 'user-captain', 'div-1', '#FF0000', '#FFFFFF', 2000, 1500, true, 'season-1'),
    ('team-2', 'City Kickers', 'user-captain', 'div-1', '#0000FF', '#FFFF00', 2000, 2000, true, 'season-1'),
    ('team-3', 'Riverside FC', 'user-captain', 'div-2', '#00FF00', '#000000', 1800, 1200, true, 'season-1')
ON CONFLICT (id) DO NOTHING;

SELECT 'Database initialized!' as status;
