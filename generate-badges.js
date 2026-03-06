const fs = require('fs');
const path = require('path');

// Color schemes for different badge types
const COLORS = {
  rank: {
    scout: '#4A90D9',
    tenderfoot: '#2E7D32',
    secondClass: '#1565C0',
    firstClass: '#7B1FA2',
    star: '#C62828',
    life: '#F57C00',
    eagle: '#FFD700'
  },
  meritBadge: {
    eagle: {
      'First Aid': '#E53935',
      'Lifesaving': '#1E88E5',
      'Environmental Science': '#43A047',
      'Swimming': '#00ACC1',
      'Hiking': '#8E24AA',
      'Cycling': '#FB8C00',
      'Cooking': '#D84315',
      'Communications': '#5E35B1',
      'Citizenship in the Nation': '#3949AB',
      'Citizenship in the World': '#00ACC1',
      'Personal Fitness': '#00897B',
      'Emergency Preparedness': '#F4511E',
      'Sustainability': '#7CB342',
      'Citizenship in Society': '#EC407A'
    },
    default: '#546E7A'
  }
};

function createBadgeSVG(name, type, isEagleRequired = false) {
  // Get color based on type
  let bgColor = COLORS.meritBadge.default;
  let borderColor = '#37474F';
  
  if (type === 'rank') {
    const rankKey = name.toLowerCase().replace(' ', '');
    bgColor = COLORS.rank[rankKey] || COLORS.rank.scout;
    borderColor = '#263238';
  } else if (isEagleRequired) {
    bgColor = COLORS.meritBadge.eagle[name] || '#FFD700';
    borderColor = '#1A1A1A';
  }
  
  // Shorten name if too long
  let displayName = name;
  if (name.length > 15) {
    displayName = name.substring(0, 12) + '...';
  }
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${lightenColor(bgColor, 30)};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${bgColor};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Badge background -->
  <rect x="10" y="10" width="180" height="180" rx="20" ry="20" 
        fill="url(#grad)" stroke="${borderColor}" stroke-width="4" filter="url(#shadow)"/>
  
  <!-- Inner circle -->
  <circle cx="100" cy="90" r="55" fill="none" stroke="${borderColor}" stroke-width="3" opacity="0.5"/>
  
  <!-- Badge icon - star for ranks, circle for merit badges -->
  ${type === 'rank' 
    ? `<polygon points="100,45 108,75 140,75 115,95 125,125 100,105 75,125 85,95 60,75 92,75" fill="${borderColor}" opacity="0.3"/>`
    : `<circle cx="100" cy="85" r="35" fill="none" stroke="${borderColor}" stroke-width="2" opacity="0.3"/>`
  }
  
  <!-- Eagle palm for eagle rank -->
  ${name === 'Eagle Scout' 
    ? `<path d="M85,60 L115,60 L115,80 L100,95 L85,80 Z" fill="${borderColor}" opacity="0.3"/>`
    : ''
  }
  
  <!-- Badge name -->
  <text x="100" y="165" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="16" font-weight="bold" fill="white" 
        style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
    ${escapeXml(displayName)}
  </text>
  
  ${isEagleRequired 
    ? `<text x="100" y="185" text-anchor="middle" font-family="Arial, sans-serif" 
          font-size="10" fill="#FFD700" font-weight="bold">★ EAGLE REQUIRED</text>`
    : ''
  }
</svg>`;
  
  return svg;
}

function lightenColor(color, percent) {
  // Parse hex color
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// Generate all badges
const ranks = ['Scout', 'Tenderfoot', 'Second Class', 'First Class', 'Star', 'Life', 'Eagle Scout'];
const eagleRequired = ['First Aid', 'Lifesaving', 'Environmental Science', 'Swimming', 'Hiking', 'Cycling', 'Cooking', 'Communications', 'Citizenship in the Nation', 'Citizenship in the World', 'Personal Fitness', 'Emergency Preparedness', 'Sustainability', 'Citizenship in Society'];
const meritBadges = [
  'American Business', 'American Culture', 'Animals', 'Archery', 'Art', 'Astronomy',
  'Automotive Maintenance', 'Aviation', 'Basketry', 'Bird Study', 'Botany', 'Bugling',
  'Camping', 'Canoeing', 'Chemistry', 'Chess', 'Climbing', 'College Planning',
  'Computers', 'Conservation', 'Dog Care', 'Drafting', 'Electricity', 'Electronics',
  'Energy', 'Engineering', 'Entrepreneurship', 'Family Life', 'Fingerprinting', 'Fire Safety',
  'Fishing', 'Fly-Fishing', 'Forestry', 'Game Design', 'Gardening', 'Genealogy',
  'Geocaching', 'Geology', 'Golf', 'Graphic Arts', 'Home Repairs', 'Horsemanship',
  'Indian Lore', 'Insect Study', 'Inventing', 'Journalism', 'Kayaking', 'Landscape Architecture',
  'Leatherwork', 'Mammal Study', 'Motion Picture', 'Music', 'Nature', 'Nuclear Science',
  'Oceanography', 'Orienteering', 'Painting', 'Personal Fitness', 'Personal Management',
  'Photography', 'Pioneering', 'Plant Science', 'Plumbing', 'Pottery', 'Public Health',
  'Public Speaking', 'Radio', 'Railroading', 'Ranking', 'Reptile and Amphibian Study',
  'Rifle Shooting', 'Rowboating', 'Safety', 'Salesmanship', 'Scouting Heritage',
  'Sculpture', 'Shotgun Shooting', 'Signaling', 'Skating', 'Small-Boat Sailing',
  'Snow Sports', 'Space Exploration', 'Sports', 'Stamp Collecting', 'Surveying',
  'Theater', 'Traffic Safety', 'Truck Transportation', 'Veterinary Medicine',
  'Weather', 'Welding', 'Whitewater', 'Wilderness Survival', 'Wood Carving', 'Woodwork'
];

// Generate rank badges
console.log('Generating rank badges...');
ranks.forEach(rank => {
  const svg = createBadgeSVG(rank, 'rank', rank === 'Eagle Scout');
  const filename = rank.toLowerCase().replace(' ', '-').replace('scout', 'scout') + '.svg';
  fs.writeFileSync(path.join(__dirname, 'public/images/ranks', filename), svg);
  console.log(`  Created: ranks/${filename}`);
});

// Generate eagle required badges
console.log('\nGenerating eagle required badges...');
eagleRequired.forEach(badge => {
  const svg = createBadgeSVG(badge, 'merit_badge', true);
  const filename = badge.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.svg';
  fs.writeFileSync(path.join(__dirname, 'public/images/merit-badges', filename), svg);
  console.log(`  Created: merit-badges/${filename}`);
});

// Generate other merit badges
console.log('\nGenerating other merit badges...');
meritBadges.forEach(badge => {
  const svg = createBadgeSVG(badge, 'merit_badge', false);
  const filename = badge.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.svg';
  fs.writeFileSync(path.join(__dirname, 'public/images/merit-badges', filename), svg);
  console.log(`  Created: merit-badges/${filename}`);
});

console.log('\n✅ All badge SVGs generated successfully!');
console.log(`   - Ranks: ${ranks.length}`);
console.log(`   - Eagle Required: ${eagleRequired.length}`);
console.log(`   - Other Merit Badges: ${meritBadges.length}`);
console.log(`   - Total: ${ranks.length + eagleRequired.length + meritBadges.length}`);
