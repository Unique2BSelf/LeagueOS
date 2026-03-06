// Direct insert script for merit badges
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pyfknrkzqyvqbdhvqyaz.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Zmtucmt6cXl2cWJkaHZxeWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAzMTg2NywiZXhwIjoyMDg3NjA3ODY3fQ.lx7lanvf8smNzXLGJ7UnCdoMvvNc5UpEhyEZOh0RxXo';

const supabase = createClient(supabaseUrl, serviceKey);

const meritBadges = [
  { canonical_id: "mb-First Aid", name: "First Aid", is_eagle_required: true },
  { canonical_id: "mb-Lifesaving", name: "Lifesaving", is_eagle_required: true },
  { canonical_id: "mb-Environmental Science", name: "Environmental Science", is_eagle_required: true },
  { canonical_id: "mb-Swimming", name: "Swimming", is_eagle_required: true },
  { canonical_id: "mb-Hiking", name: "Hiking", is_eagle_required: true },
  { canonical_id: "mb-Cycling", name: "Cycling", is_eagle_required: true },
  { canonical_id: "mb-Cooking", name: "Cooking", is_eagle_required: true },
  { canonical_id: "mb-Communications", name: "Communications", is_eagle_required: true },
  { canonical_id: "mb-Citizenship in the Nation", name: "Citizenship in the Nation", is_eagle_required: true },
  { canonical_id: "mb-Citizenship in the World", name: "Citizenship in the World", is_eagle_required: true },
  { canonical_id: "mb-Personal Fitness", name: "Personal Fitness", is_eagle_required: true },
  { canonical_id: "mb-Emergency Preparedness", name: "Emergency Preparedness", is_eagle_required: true },
  { canonical_id: "mb-Sustainability", name: "Sustainability", is_eagle_required: true },
  { canonical_id: "mb-Citizenship in Society", name: "Citizenship in Society", is_eagle_required: true },
  { canonical_id: "mb-American Business", name: "American Business", is_eagle_required: false },
  { canonical_id: "mb-Archery", name: "Archery", is_eagle_required: false },
  { canonical_id: "mb-Art", name: "Art", is_eagle_required: false },
  { canonical_id: "mb-Astronomy", name: "Astronomy", is_eagle_required: false },
  { canonical_id: "mb-Automotive Maintenance", name: "Automotive Maintenance", is_eagle_required: false },
  { canonical_id: "mb-Aviation", name: "Aviation", is_eagle_required: false },
  { canonical_id: "mb-Basketry", name: "Basketry", is_eagle_required: false },
  { canonical_id: "mb-Bird Study", name: "Bird Study", is_eagle_required: false },
  { canonical_id: "mb-Bugling", name: "Bugling", is_eagle_required: false },
  { canonical_id: "mb-Camping", name: "Camping", is_eagle_required: false },
  { canonical_id: "mb-Canoeing", name: "Canoeing", is_eagle_required: false },
  { canonical_id: "mb-Chemistry", name: "Chemistry", is_eagle_required: false },
  { canonical_id: "mb-Chess", name: "Chess", is_eagle_required: false },
  { canonical_id: "mb-Climbing", name: "Climbing", is_eagle_required: false },
  { canonical_id: "mb-Collections", name: "Collections", is_eagle_required: false },
  { canonical_id: "mb-Computer Science", name: "Computer Science", is_eagle_required: false },
  { canonical_id: "mb-Crime Prevention", name: "Crime Prevention", is_eagle_required: false },
  { canonical_id: "mb-Dentistry", name: "Dentistry", is_eagle_required: false },
  { canonical_id: "mb-Disabilities Awareness", name: "Disabilities Awareness", is_eagle_required: false },
  { canonical_id: "mb-Dog Care", name: "Dog Care", is_eagle_required: false },
  { canonical_id: "mb-Drafting", name: "Drafting", is_eagle_required: false },
  { canonical_id: "mb-Electricity", name: "Electricity", is_eagle_required: false },
  { canonical_id: "mb-Electronics", name: "Electronics", is_eagle_required: false },
  { canonical_id: "mb-Energy", name: "Energy", is_eagle_required: false },
  { canonical_id: "mb-Engineering", name: "Engineering", is_eagle_required: false },
  { canonical_id: "mb-Entrepreneurship", name: "Entrepreneurship", is_eagle_required: false },
  { canonical_id: "mb-Family Life", name: "Family Life", is_eagle_required: false },
  { canonical_id: "mb-Fingerprinting", name: "Fingerprinting", is_eagle_required: false },
  { canonical_id: "mb-Fire Safety", name: "Fire Safety", is_eagle_required: false },
  { canonical_id: "mb-Fishing", name: "Fishing", is_eagle_required: false },
  { canonical_id: "mb-Fly-Fishing", name: "Fly-Fishing", is_eagle_required: false },
  { canonical_id: "mb-Forestry", name: "Forestry", is_eagle_required: false },
  { canonical_id: "mb-Game Design", name: "Game Design", is_eagle_required: false },
  { canonical_id: "mb-Gardening", name: "Gardening", is_eagle_required: false },
  { canonical_id: "mb-Genealogy", name: "Genealogy", is_eagle_required: false },
  { canonical_id: "mb-Geocaching", name: "Geocaching", is_eagle_required: false },
  { canonical_id: "mb-Geology", name: "Geology", is_eagle_required: false },
  { canonical_id: "mb-Golf", name: "Golf", is_eagle_required: false },
  { canonical_id: "mb-Graphic Arts", name: "Graphic Arts", is_eagle_required: false },
  { canonical_id: "mb-Health Care", name: "Health Care", is_eagle_required: false },
  { canonical_id: "mb-Home Repairs", name: "Home Repairs", is_eagle_required: false },
  { canonical_id: "mb-Horsemanship", name: "Horsemanship", is_eagle_required: false },
  { canonical_id: "mb-Indian Lore", name: "Indian Lore", is_eagle_required: false },
  { canonical_id: "mb-Insect Study", name: "Insect Study", is_eagle_required: false },
  { canonical_id: "mb-Inventing", name: "Inventing", is_eagle_required: false },
  { canonical_id: "mb-Journalism", name: "Journalism", is_eagle_required: false },
  { canonical_id: "mb-Kayaking", name: "Kayaking", is_eagle_required: false },
  { canonical_id: "mb-Landscape Architecture", name: "Landscape Architecture", is_eagle_required: false },
  { canonical_id: "mb-Law", name: "Law", is_eagle_required: false },
  { canonical_id: "mb-Leatherwork", name: "Leatherwork", is_eagle_required: false },
  { canonical_id: "mb-Mammal Study", name: "Mammal Study", is_eagle_required: false },
  { canonical_id: "mb-Medicine", name: "Medicine", is_eagle_required: false },
  { canonical_id: "mb-Metalwork", name: "Metalwork", is_eagle_required: false },
  { canonical_id: "mb-Model Design and Building", name: "Model Design and Building", is_eagle_required: false },
  { canonical_id: "mb-Motorboating", name: "Motorboating", is_eagle_required: false },
  { canonical_id: "mb-Music", name: "Music", is_eagle_required: false },
  { canonical_id: "mb-Nature", name: "Nature", is_eagle_required: false },
  { canonical_id: "mb-Nuclear Science", name: "Nuclear Science", is_eagle_required: false },
  { canonical_id: "mb-Oceanography", name: "Oceanography", is_eagle_required: false },
  { canonical_id: "mb-Orienteering", name: "Orienteering", is_eagle_required: false },
  { canonical_id: "mb-Painting", name: "Painting", is_eagle_required: false },
  { canonical_id: "mb-Personal Management", name: "Personal Management", is_eagle_required: false },
  { canonical_id: "mb-Pets", name: "Pets", is_eagle_required: false },
  { canonical_id: "mb-Photography", name: "Photography", is_eagle_required: false },
  { canonical_id: "mb-Pioneering", name: "Pioneering", is_eagle_required: false },
  { canonical_id: "mb-Plant Science", name: "Plant Science", is_eagle_required: false },
  { canonical_id: "mb-Plumbing", name: "Plumbing", is_eagle_required: false },
  { canonical_id: "mb-Pottery", name: "Pottery", is_eagle_required: false },
  { canonical_id: "mb-Programming", name: "Programming", is_eagle_required: false },
  { canonical_id: "mb-Public Health", name: "Public Health", is_eagle_required: false },
  { canonical_id: "mb-Public Speaking", name: "Public Speaking", is_eagle_required: false },
  { canonical_id: "mb-Radio", name: "Radio", is_eagle_required: false },
  { canonical_id: "mb-Railroading", name: "Railroading", is_eagle_required: false },
  { canonical_id: "mb-Reading", name: "Reading", is_eagle_required: false },
  { canonical_id: "mb-Reptile and Amphibian Study", name: "Reptile and Amphibian Study", is_eagle_required: false },
  { canonical_id: "mb-Rifle Shooting", name: "Rifle Shooting", is_eagle_required: false },
  { canonical_id: "mb-Rowboating", name: "Rowboating", is_eagle_required: false },
  { canonical_id: "mb-Safety", name: "Safety", is_eagle_required: false },
  { canonical_id: "mb-Salesmanship", name: "Salesmanship", is_eagle_required: false },
  { canonical_id: "mb-Scouting Heritage", name: "Scouting Heritage", is_eagle_required: false },
  { canonical_id: "mb-Sculpture", name: "Sculpture", is_eagle_required: false },
  { canonical_id: "mb-Shotgun Shooting", name: "Shotgun Shooting", is_eagle_required: false },
  { canonical_id: "mb-Skating", name: "Skating", is_eagle_required: false },
  { canonical_id: "mb-Small-Boat Sailing", name: "Small-Boat Sailing", is_eagle_required: false },
  { canonical_id: "mb-Snow Sports", name: "Snow Sports", is_eagle_required: false },
  { canonical_id: "mb-Space Exploration", name: "Space Exploration", is_eagle_required: false },
  { canonical_id: "mb-Sports", name: "Sports", is_eagle_required: false },
  { canonical_id: "mb-Stamp Collecting", name: "Stamp Collecting", is_eagle_required: false },
  { canonical_id: "mb-Surveying", name: "Surveying", is_eagle_required: false },
  { canonical_id: "mb-Theater", name: "Theater", is_eagle_required: false },
  { canonical_id: "mb-Traffic Safety", name: "Traffic Safety", is_eagle_required: false },
  { canonical_id: "mb-Truck Transportation", name: "Truck Transportation", is_eagle_required: false },
  { canonical_id: "mb-Veterinary Medicine", name: "Veterinary Medicine", is_eagle_required: false },
  { canonical_id: "mb-Weather", name: "Weather", is_eagle_required: false },
  { canonical_id: "mb-Welding", name: "Welding", is_eagle_required: false },
  { canonical_id: "mb-Whitewater", name: "Whitewater", is_eagle_required: false },
  { canonical_id: "mb-Wilderness Survival", name: "Wilderness Survival", is_eagle_required: false },
  { canonical_id: "mb-Wood Carving", name: "Wood Carving", is_eagle_required: false },
  { canonical_id: "mb-Woodwork", name: "Woodwork", is_eagle_required: false },
];

async function insertBadges() {
  let inserted = 0;
  let errors = 0;
  
  for (const badge of meritBadges) {
    const slug = badge.canonical_id.replace(/ /g, "-").toLowerCase();
    const imageUrl = "/images/merit-badges/" + badge.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".svg";
    
    const { error } = await supabase.from("advancement_catalog").insert({
      canonical_id: badge.canonical_id,
      name: badge.name,
      type: "merit_badge",
      slug: slug,
      program: "boy",
      is_active: true,
      is_eagle_required: badge.is_eagle_required
    });
    
    if (error) {
      console.log("Error:", badge.name, error.message);
      errors++;
    } else {
      inserted++;
      if (inserted % 20 === 0) console.log(`Inserted ${inserted}...`);
    }
  }
  
  console.log(`\n✅ Done! Inserted: ${inserted}, Errors: ${errors}`);
}

insertBadges();
