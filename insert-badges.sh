#!/bin/bash
# Insert all merit badges via REST API

APIKEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Zmtucmt6cXl2cWJkaHZxeWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAzMTg2NywiZXhwIjoyMDg3NjA3ODY3fQ.lx7lanvf8smNzXLGJ7UnCdoMvvNc5UpEhyEZOh0RxXo"
URL="https://pyfknrkzqyvqbdhvqyaz.supabase.co/rest/v1/advancement_catalog"

badges=(
  "mb-First Aid"
  "mb-Lifesaving"
  "mb-Environmental Science"
  "mb-Swimming"
  "mb-Hiking"
  "mb-Cycling"
  "mb-Cooking"
  "mb-Communications"
  "mb-Citizenship in the Nation"
  "mb-Citizenship in the World"
  "mb-Personal Fitness"
  "mb-Emergency Preparedness"
  "mb-Sustainability"
  "mb-Citizenship in Society"
  "mb-American Business"
  "mb-American Culture"
  "mb-Animals"
  "mb-Archery"
  "mb-Art"
  "mb-Astronomy"
  "mb-Automotive Maintenance"
  "mb-Aviation"
  "mb-Basketry"
  "mb-Bird Study"
  "mb-Bugling"
  "mb-Camping"
  "mb-Canoeing"
  "mb-Chemistry"
  "mb-Chess"
  "mb-Climbing"
  "mb-Collections"
  "mb-Computer Science"
  "mb-Crime Prevention"
  "mb-Dentistry"
  "mb-Disabilities Awareness"
  "mb-Dog Care"
  "mb-Drafting"
  "mb-Electricity"
  "mb-Electronics"
  "mb-Energy"
  "mb-Engineering"
  "mb-Entrepreneurship"
  "mb-Family Life"
  "mb-Fingerprinting"
  "mb-Fire Safety"
  "mb-Fishing"
  "mb-Fly-Fishing"
  "mb-Forestry"
  "mb-Game Design"
  "mb-Gardening"
  "mb-Genealogy"
  "mb-Geocaching"
  "mb-Geology"
  "mb-Golf"
  "mb-Graphic Arts"
  "mb-Health Care"
  "mb-Home Repairs"
  "mb-Horsemanship"
  "mb-Indian Lore"
  "mb-Insect Study"
  "mb-Inventing"
  "mb-Journalism"
  "mb-Kayaking"
  "mb-Landscape Architecture"
  "mb-Law"
  "mb-Leatherwork"
  "mb-Mammal Study"
  "mb-Medicine"
  "mb-Metalwork"
  "mb-Model Design and Building"
  "mb-Motorboating"
  "mb-Music"
  "mb-Nature"
  "mb-Nuclear Science"
  "mb-Oceanography"
  "mb-Orienteering"
  "mb-Painting"
  "mb-Personal Management"
  "mb-Pets"
  "mb-Photography"
  "mb-Pioneering"
  "mb-Plant Science"
  "mb-Plumbing"
  "mb-Pottery"
  "mb-Programming"
  "mb-Public Health"
  "mb-Public Speaking"
  "mb-Pulp and Paper"
  "mb-Radio"
  "mb-Railroading"
  "mb-Reading"
  "mb-Reptile and Amphibian Study"
  "mb-Rifle Shooting"
  "mb-Rowboating"
  "mb-Safety"
  "mb-Salesmanship"
  "mb-Scouting Heritage"
  "mb-Sculpture"
  "mb-Shotgun Shooting"
  "mb-Signaling"
  "mb-Skating"
  "mb-Small-Boat Sailing"
  "mb-Snow Sports"
  "mb-Space Exploration"
  "mb-Sports"
  "mb-Stamp Collecting"
  "mb-Surveying"
  "mb-Textile"
  "mb-Theater"
  "mb-Traffic Safety"
  "mb-Truck Transportation"
  "mb-Veterinary Medicine"
  "mb-Weather"
  "mb-Welding"
  "mb-Whitewater"
  "mb-Wilderness Survival"
  "mb-Wood Carving"
  "mb-Woodwork"
)

count=0
for badge in "${badges[@]}"; do
  slug=$(echo "$badge" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  name=$(echo "$badge" | sed 's/mb-//')
  
  # Check if already exists
  exists=$(curl -s "$URL?canonical_id=eq.$badge" -H "apikey: $APIKEY" | grep -c "$badge" || true)
  
  if [ "$exists" -eq "0" ]; then
    result=$(curl -s -X POST "$URL" \
      -H "apikey: $APIKEY" \
      -H "Authorization: Bearer $APIKEY" \
      -H "Content-Type: application/json" \
      -d "{\"canonical_id\":\"$badge\",\"name\":\"$name\",\"type\":\"merit_badge\",\"slug\":\"$slug\",\"program\":\"boy\",\"is_active\":true}")
    
    if echo "$result" | grep -q "error" || [ -z "$result" ]; then
      echo "Error: $badge - $result"
    else
      count=$((count + 1))
      echo "Inserted: $badge ($count)"
    fi
  else
    echo "Exists: $badge"
  fi
done

echo "Done! Total inserted: $count"
