const fs = require('fs');
const path = require('path');

const COLORS = {
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
};

function createBadgeSVG(name, isEagleRequired = false) {
  let bgColor = isEagleRequired ? (COLORS.eagle[name] || '#FFD700') : COLORS.default;
  let borderColor = '#1A1A1A';
  
  let displayName = name;
  if (name.length > 15) displayName = name.substring(0, 12) + '...';
  
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
  
  <rect x="10" y="10" width="180" height="180" rx="20" ry="20" 
        fill="url(#grad)" stroke="${borderColor}" stroke-width="4" filter="url(#shadow)"/>
  
  <circle cx="100" cy="90" r="55" fill="none" stroke="${borderColor}" stroke-width="3" opacity="0.5"/>
  
  <circle cx="100" cy="85" r="35" fill="none" stroke="${borderColor}" stroke-width="2" opacity="0.3"/>
  
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

const badges = [
  // EAGLE REQUIRED
  { name: "First Aid", eagleRequired: true },
  { name: "Lifesaving", eagleRequired: true },
  { name: "Environmental Science", eagleRequired: true },
  { name: "Swimming", eagleRequired: true },
  { name: "Hiking", eagleRequired: true },
  { name: "Cycling", eagleRequired: true },
  { name: "Cooking", eagleRequired: true },
  { name: "Communications", eagleRequired: true },
  { name: "Citizenship in the Nation", eagleRequired: true },
  { name: "Citizenship in the World", eagleRequired: true },
  { name: "Personal Fitness", eagleRequired: true },
  { name: "Emergency Preparedness", eagleRequired: true },
  { name: "Sustainability", eagleRequired: true },
  { name: "Citizenship in Society", eagleRequired: true },
  
  // ALL OTHER MERIT BADGES
  { name: "American Business" },
  { name: "American Culture" },
  { name: "Animals" },
  { name: "Archery" },
  { name: "Art" },
  { name: "Astronomy" },
  { name: "Automotive Maintenance" },
  { name: "Aviation" },
  { name: "Basketry" },
  { name: "Bird Study" },
  { name: "Bugling" },
  { name: "Camping" },
  { name: "Canoeing" },
  { name: "Chemistry" },
  { name: "Chess" },
  { name: "Climbing" },
  { name: "Coin Collecting" },
  { name: "Collections" },
  { name: "Computer Science" },
  { name: "Crime Prevention" },
  { name: "Dentistry" },
  { name: "Disabilities Awareness" },
  { name: "Dog Care" },
  { name: "Drafting" },
  { name: "Electricity" },
  { name: "Electronics" },
  { name: "Energy" },
  { name: "Engineering" },
  { name: "Entrepreneurship" },
  { name: "Family Life" },
  { name: "Fingerprinting" },
  { name: "Fire Safety" },
  { name: "Fish and Wildlife Management" },
  { name: "Fishing" },
  { name: "Fly-Fishing" },
  { name: "Forestry" },
  { name: "Game Design" },
  { name: "Gardening" },
  { name: "Genealogy" },
  { name: "Geocaching" },
  { name: "Geology" },
  { name: "Golf" },
  { name: "Graphic Arts" },
  { name: "Health Care" },
  { name: "Home Repairs" },
  { name: "Horsemanship" },
  { name: "Indian Lore" },
  { name: "Insect Study" },
  { name: "Inventing" },
  { name: "Journalism" },
  { name: "Kayaking" },
  { name: "Landscape Architecture" },
  { name: "Law" },
  { name: "Leatherwork" },
  { name: "Mammal Study" },
  { name: "Medicine" },
  { name: "Metalwork" },
  { name: "Model Design and Building" },
  { name: "Motorboating" },
  { name: "Music" },
  { name: "Nature" },
  { name: "Nuclear Science" },
  { name: "Oceanography" },
  { name: "Orienteering" },
  { name: "Painting" },
  { name: "Personal Management" },
  { name: "Pets" },
  { name: "Photography" },
  { name: "Pioneering" },
  { name: "Plant Science" },
  { name: "Plumbing" },
  { name: "Pottery" },
  { name: "Programming" },
  { name: "Public Health" },
  { name: "Public Speaking" },
  { name: "Pulp and Paper" },
  { name: "Radio" },
  { name: "Railroading" },
  { name: "Reading" },
  { name: "Reptile and Amphibian Study" },
  { name: "Rifle Shooting" },
  { name: "Rowboating" },
  { name: "Safety" },
  { name: "Salesmanship" },
  { name: "Scouting Heritage" },
  { name: "Sculpture" },
  { name: "Shotgun Shooting" },
  { name: "Signaling" },
  { name: "Skating" },
  { name: "Small-Boat Sailing" },
  { name: "Snow Sports" },
  { name: "Space Exploration" },
  { name: "Sports" },
  { name: "Stamp Collecting" },
  { name: "Surveying" },
  { name: "Textile" },
  { name: "Theater" },
  { name: "Traffic Safety" },
  { name: "Truck Transportation" },
  { name: "Veterinary Medicine" },
  { name: "Weather" },
  { name: "Welding" },
  { name: "Whitewater" },
  { name: "Wilderness Survival" },
  { name: "Wood Carving" },
  { name: "Woodwork" }
];

console.log('Generating ALL merit badge images...');
let count = 0;
badges.forEach(badge => {
  const svg = createBadgeSVG(badge.name, badge.eagleRequired);
  const filename = badge.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".svg";
  fs.writeFileSync(path.join(__dirname, 'public/images/merit-badges', filename), svg);
  count++;
});

console.log(`✅ Generated ${count} merit badge images!`);
