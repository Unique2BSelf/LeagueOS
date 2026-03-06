// Simple test user creation script
// Run this in the browser console or use curl to create test accounts

const testUsers = [
  { email: 'admin@league.os', fullName: 'Board Admin', role: 'ADMIN' },
  { email: 'moderator@league.os', fullName: 'League Moderator', role: 'MODERATOR' },
  { email: 'referee@league.os', fullName: 'John Ref', role: 'REF' },
  { email: 'captain@league.os', fullName: 'Team Captain', role: 'CAPTAIN' },
  { email: 'player@league.os', fullName: 'Test Player', role: 'PLAYER' },
  { email: 'sponsor@league.os', fullName: 'Business Sponsor', role: 'SPONSOR' },
];

const password = 'TestPass123!';
const photoUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23121212" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2300F5FF" font-size="40">👤</text></svg>';

// Create users via API
async function createTestUsers() {
  const results = [];
  
  for (const user of testUsers) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          password,
          photoUrl,
        }),
      });
      
      const data = await response.json();
      results.push({ ...user, success: response.ok, data });
      console.log(`Created ${user.role}: ${user.email}`, data);
    } catch (error) {
      console.error(`Failed to create ${user.email}:`, error);
      results.push({ ...user, success: false, error: String(error) });
    }
  }
  
  return results;
}

// Log results
createTestUsers().then(results => {
  console.log('All results:', results);
});
