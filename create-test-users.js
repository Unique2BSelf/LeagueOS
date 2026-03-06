const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  // Connect to the database
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'league_user',
    password: 'league_password',
    database: 'league_db'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash password using bcryptjs
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    console.log('Password hashed successfully');

    // The hashed password will be stored in both password and taxIdEncrypted fields
    // (per the requirements, the hash should go in taxIdEncrypted)

    // Users to create
    const users = [
      {
        email: 'admin@league.os',
        fullName: 'Board Admin',
        role: 'ADMIN',
        password: hashedPassword
      },
      {
        email: 'moderator@league.os',
        fullName: 'League Moderator',
        role: 'MODERATOR',
        password: hashedPassword
      },
      {
        email: 'referee@league.os',
        fullName: 'John Ref',
        role: 'REF',
        password: hashedPassword
      },
      {
        email: 'captain@league.os',
        fullName: 'Team Captain',
        role: 'CAPTAIN',
        password: hashedPassword
      },
      {
        email: 'player@league.os',
        fullName: 'Test Player',
        role: 'PLAYER',
        password: hashedPassword
      },
      {
        email: 'sponsor@league.os',
        fullName: 'Business Sponsor',
        role: 'SPONSOR',
        password: hashedPassword
      }
    ];

    // Insert users
    for (const user of users) {
      const result = await client.query(
        `INSERT INTO "User" (id, role, "fullName", email, password, "taxIdEncrypted", "isActive", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW())
         ON CONFLICT (email) DO UPDATE SET
           role = EXCLUDED.role,
           "fullName" = EXCLUDED."fullName",
           password = EXCLUDED.password,
           "taxIdEncrypted" = EXCLUDED."taxIdEncrypted"
         RETURNING id, email`,
        [user.role, user.fullName, user.email, user.password, user.password]
      );
      console.log(`Created/Updated user: ${user.email} (${user.role})`);
    }

    // Verify users
    const verifyResult = await client.query(
      'SELECT id, email, role, "fullName" FROM "User" ORDER BY email'
    );
    
    console.log('\n=== Created Test Users ===');
    console.log('Password for all users: TestPass123!');
    console.log('');
    verifyResult.rows.forEach(row => {
      console.log(`- ${row.role}: ${row.email} (${row.fullName})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createTestUsers();
