// Comprehensive advancement sync with local images and requirements
// This script syncs all ranks, merit badges, and requirements to the database

const ADVANCEMENT_DATA = {
  // RANKS with requirements
  ranks: [
    {
      canonical_id: "rank-scout",
      name: "Scout",
      description: "The first rank in Scouts BSA. Learn the Scout Oath, Law, motto, and slogan.",
      requirements: [
        "Repeat from memory the Scout Oath, Scout Law, motto, and slogan",
        "Show the Scout sign, salute, and handshake",
        "Describe the Scout badge",
        "Explain the First Aid method for choking",
        "Demonstrate the telescope roll, starp, and figure-of-eight knot",
        "Recite the Outdoor Code",
        "After meeting the other requirements, have a conference with your leader"
      ]
    },
    {
      canonical_id: "rank-tenderfoot",
      name: "Tenderfoot",
      description: "The second rank in Scouts BSA. Learn camping basics and patrol method.",
      requirements: [
        "Present yourself to your leader, properly dressed, before going on a campout",
        "Demonstrate the practical uses of the outdoor code",
        "Tie and describe the uses of the square knot, bowline, and clove hitch",
        "Demonstrate proper care, sharpening, and use of knife, saw, and ax",
        "Describe when to use first aid and demonstrate first aid for: cuts, scratches, insect stings, blisters, nosebleed, burns/scalds",
        "Camp overnight on a campout",
        "Prepare a menu, shop for ingredients, and cook two meals",
        "Demonstrate how to coleman lantern works and safe operation",
        "Participate in a hike",
        "Describe the elements of leave no trace",
        "Demonstrate responsible behavior on a hike/campout"
      ]
    },
    {
      canonical_id: "rank-second-class",
      name: "Second Class",
      description: "The third rank in Scouts BSA. Learn intermediate outdoor skills.",
      requirements: [
        "Demonstrate first aid for: object in the eye, bite/sting, heat exhaustion, shock, broken bones, bleeding",
        "Demonstrate scout spirit on a campout",
        "Tent pitching demonstration",
        "Explain principles of camp stove/BBQ use",
        "Demonstrate the use of a compass and map",
        "Describe the injuries that can occur from cold/heat",
        "Demonstrate the treatment for hypothermia",
        "Swim 100 yards/meters",
        "Demonstrate water rescue methods",
        "Demonstrate basic rescue breathing",
        "Participate in service project",
        "Identify local poisonous plants, dangerous insects",
        "Set up a campfire and demonstrate proper burning techniques"
      ]
    },
    {
      canonical_id: "rank-first-class",
      name: "First Class",
      description: "The fourth rank in Scouts BSA. Master outdoor leadership skills.",
      requirements: [
        "Demonstrate first aid for: heart attack, stroke, severe burns, heat stroke, convulsions",
        "Lead a hike or campout",
        "Plan and demonstrate cooking over 3 fires with 3 different meals",
        "Demonstrate use of palm-and-wheel saw",
        "Navigate using compass and map for 5 miles",
        "Identify 3 species of plants and animals",
        "Demonstrate the principles of leaving no trace for 24 hours",
        "Meet the time requirements for swimming",
        "Demonstrate rescue breathing and CPR",
        "Direct another person in need of rescue",
        "Demonstrate patrol and troop meeting structure"
      ]
    },
    {
      canonical_id: "rank-star",
      name: "Star",
      description: "The fifth rank in Scouts BSA. Begin leadership journey.",
      requirements: [
        "Be active in your troop for at least 4 months as a First Class Scout",
        "Earn 6 merit badges (including 4 required for Eagle)",
        "While a Star Scout, demonstrate scout spirit",
        "Serve actively in your troop for at least 4 months",
        "Hold a position of responsibility for at least 4 months",
        "Demonstrate you have lived by the Scout Oath and Law"
      ]
    },
    {
      canonical_id: "rank-life",
      name: "Life",
      description: "The sixth rank in Scouts BSA. Advanced leadership and service.",
      requirements: [
        "Be active in your troop for at least 6 months as a Star Scout",
        "Earn 11 merit badges (including 5 required for Eagle)",
        "While a Life Scout, demonstrate scout spirit",
        "Serve actively in your troop for at least 6 months",
        "Hold a position of responsibility for at least 6 months",
        "Demonstrate you have lived by the Scout Oath and Law",
        "Earn the Citizenship in Community, Nation, and World merit badges"
      ]
    },
    {
      canonical_id: "rank-eagle",
      name: "Eagle Scout",
      description: "The highest rank in Scouts BSA. Demonstrates mastery of leadership and service.",
      requirements: [
        "Be active in your troop for at least 6 months as a Life Scout",
        "Earn 21 merit badges total (including 13 specific Eagle required)",
        "While an Eagle Scout candidate, demonstrate scout spirit",
        "Serve actively in your troop for at least 6 months",
        "Hold a position of responsibility for at least 6 months",
        "Plan, develop, and give leadership to a service project",
        "Demonstrate you have lived by the Scout Oath and Law"
      ]
    }
  ],
  
  // EAGLE REQUIRED BADGES
  eagleRequiredBadges: [
    {
      canonical_id: "mb-First Aid",
      name: "First Aid",
      description: "Learn to provide emergency first aid treatment.",
      requirements: [
        "Define first aid and explain the importance",
        "Demonstrate first aid for: wounds, burns, fractures, shock",
        "Show how to control bleeding",
        "Demonstrate bandaging techniques",
        "Prepare a first aid kit"
      ]
    },
    {
      canonical_id: "mb-Lifesaving",
      name: "Lifesaving",
      description: "Master water rescue techniques.",
      requirements: [
        "Demonstrate water rescue methods without entering the water",
        "Demonstrate rescue breathing",
        "Show how to escape from a grasp",
        "Demonstrate survival swimming",
        "Discuss water safety"
      ]
    },
    {
      canonical_id: "mb-Environmental Science",
      name: "Environmental Science",
      description: "Study ecosystems and conservation.",
      requirements: [
        "Define ecology and explain the importance",
        "Conduct an ecological study",
        "Discuss pollution and its effects",
        "Explain biodiversity",
        "Demonstrate conservation methods"
      ]
    },
    {
      canonical_id: "mb-Swimming",
      name: "Swimming",
      description: "Master swimming skills and safety.",
      requirements: [
        "Swim 150 yards using 4 different strokes",
        "Demonstrate floating techniques",
        "Explain water rescue methods",
        "Discuss safe diving",
        "Show knowledge of pool/lake safety"
      ]
    },
    {
      canonical_id: "mb-Hiking",
      name: "Hiking",
      description: "Learn backcountry hiking skills.",
      requirements: [
        "Plan and take three hikes",
        "Demonstrate navigation with map and compass",
        "Discuss packing and food selection",
        "Explain leave no trace principles",
        "Know emergency procedures on the trail"
      ]
    },
    {
      canonical_id: "mb-Cycling",
      name: "Cycling",
      description: "Master bicycle handling and safety.",
      requirements: [
        "Demonstrate bike safety and inspection",
        "Ride 50 miles using proper techniques",
        "Explain bike maintenance basics",
        "Know traffic laws for cyclists",
        "Plan a cycling trip"
      ]
    },
    {
      canonical_id: "mb-Cooking",
      name: "Cooking",
      description: "Master meal planning and outdoor cooking.",
      requirements: [
        "Plan menus for 3 days",
        "Shop for ingredients",
        "Cook 4 meals over fires or stoves",
        "Discuss nutrition and food safety",
        "Clean up properly"
      ]
    },
    {
      canonical_id: "mb-Communications",
      name: "Communications",
      description: "Learn communication techniques.",
      requirements: [
        "Research a topic and give a speech",
        "Write a news story",
        "Demonstrate effective listening",
        "Explain mass media influence",
        "Create a presentation"
      ]
    },
    {
      canonical_id: "mb-Citizenship in the Nation",
      name: "Citizenship in the Nation",
      description: "Understand national government and citizenship.",
      requirements: [
        "Explain the US Constitution and Bill of Rights",
        "Describe the three branches of government",
        "Discuss current national issues",
        "Visit a national landmark",
        "Explain the election process"
      ]
    },
    {
      canonical_id: "mb-Citizenship in the World",
      name: "Citizenship in the World",
      description: "Understand world affairs and international citizenship.",
      requirements: [
        "Explain the United Nations and its functions",
        "Discuss international organizations",
        "Describe global issues",
        "Explain passport and visa requirements",
        "Know world geography"
      ]
    },
    {
      canonical_id: "mb-Personal Fitness",
      name: "Personal Fitness",
      description: "Develop personal fitness habits.",
      requirements: [
        "Create a fitness plan",
        "Track progress for 12 weeks",
        "Improve in all areas of fitness",
        "Explain nutrition basics",
        "Demonstrate stretching and warm-up"
      ]
    },
    {
      canonical_id: "mb-Emergency Preparedness",
      name: "Emergency Preparedness",
      description: "Be prepared for emergencies.",
      requirements: [
        "Create an emergency kit",
        "Develop a family plan",
        "Know emergency communication methods",
        "Demonstrate first aid for emergencies",
        "Participate in emergency service"
      ]
    },
    {
      canonical_id: "mb-Sustainability",
      name: "Sustainability",
      description: "Learn sustainable living practices.",
      requirements: [
        "Explain sustainability principles",
        "Conduct a home energy audit",
        "Reduce household waste",
        "Conserve water",
        "Discuss sustainable practices"
      ]
    },
    {
      canonical_id: "mb-Citizenship in Society",
      name: "Citizenship in Society",
      description: "Understand diversity and inclusion.",
      requirements: [
        "Discuss diversity and its importance",
        "Research a social issue",
        "Demonstrate inclusive behavior",
        "Know about civil rights history",
        "Plan a community service project"
      ]
    }
  ],
  
  // ADDITIONAL MERIT BADGES
  meritBadges: [
    { canonical_id: "mb-American Business", name: "American Business" },
    { canonical_id: "mb-American Culture", name: "American Culture" },
    { canonical_id: "mb-Animals", name: "Animals" },
    { canonical_id: "mb-Archery", name: "Archery" },
    { canonical_id: "mb-Art", name: "Art" },
    { canonical_id: "mb-Astronomy", name: "Astronomy" },
    { canonical_id: "mb-Automotive Maintenance", name: "Automotive Maintenance" },
    { canonical_id: "mb-Aviation", name: "Aviation" },
    { canonical_id: "mb-Basketry", name: "Basketry" },
    { canonical_id: "mb-Bird Study", name: "Bird Study" },
    { canonical_id: "mb-Botany", name: "Botany" },
    { canonical_id: "mb-Bugling", name: "Bugling" },
    { canonical_id: "mb-Camping", name: "Camping" },
    { canonical_id: "mb-Canoeing", name: "Canoeing" },
    { canonical_id: "mb-Chemistry", name: "Chemistry" },
    { canonical_id: "mb-Chess", name: "Chess" },
    { canonical_id: "mb-Climbing", name: "Climbing" },
    { canonical_id: "mb-College Planning", name: "College Planning" },
    { canonical_id: "mb-Computers", name: "Computers" },
    { canonical_id: "mb-Conservation", name: "Conservation" },
    { canonical_id: "mb-Cooking", name: "Cooking" },
    { canonical_id: "mb-Cycling", name: "Cycling" },
    { canonical_id: "mb-Dog Care", name: "Dog Care" },
    { canonical_id: "mb-Drafting", name: "Drafting" },
    { canonical_id: "mb-Electricity", name: "Electricity" },
    { canonical_id: "mb-Electronics", name: "Electronics" },
    { canonical_id: "mb-Energy", name: "Energy" },
    { canonical_id: "mb-Engineering", name: "Engineering" },
    { canonical_id: "mb-Entrepreneurship", name: "Entrepreneurship" },
    { canonical_id: "mb-Family Life", name: "Family Life" },
    { canonical_id: "mb-Fingerprinting", name: "Fingerprinting" },
    { canonical_id: "mb-Fire Safety", name: "Fire Safety" },
    { canonical_id: "mb-First Aid", name: "First Aid" },
    { canonical_id: "mb-Fishing", name: "Fishing" },
    { canonical_id: "mb-Fly-Fishing", name: "Fly-Fishing" },
    { canonical_id: "mb-Forestry", name: "Forestry" },
    { canonical_id: "mb-Game Design", name: "Game Design" },
    { canonical_id: "mb-Gardening", name: "Gardening" },
    { canonical_id: "mb-Genealogy", name: "Genealogy" },
    { canonical_id: "mb-Geocaching", name: "Geocaching" },
    { canonical_id: "mb-Geology", name: "Geology" },
    { canonical_id: "mb-Golf", name: "Golf" },
    { canonical_id: "mb-Graphic Arts", name: "Graphic Arts" },
    { canonical_id: "mb-Hiking", name: "Hiking" },
    { canonical_id: "mb-Home Repairs", name: "Home Repairs" },
    { canonical_id: "mb-Horsemanship", name: "Horsemanship" },
    { canonical_id: "mb-Indian Lore", name: "Indian Lore" },
    { canonical_id: "mb-Insect Study", name: "Insect Study" },
    { canonical_id: "mb-Inventing", name: "Inventing" },
    { canonical_id: "mb-Journalism", name: "Journalism" },
    { canonical_id: "mb-Kayaking", name: "Kayaking" },
    { canonical_id: "mb-Landscape Architecture", name: "Landscape Architecture" },
    { canonical_id: "mb-Leatherwork", name: "Leatherwork" },
    { canonical_id: "mb-Lifesaving", name: "Lifesaving" },
    { canonical_id: "mb-Mammal Study", name: "Mammal Study" },
    { canonical_id: "mb-Motion Picture", name: "Motion Picture" },
    { canonical_id: "mb-Music", name: "Music" },
    { canonical_id: "mb-Nature", name: "Nature" },
    { canonical_id: "mb-Nuclear Science", name: "Nuclear Science" },
    { canonical_id: "mb-Oceanography", name: "Oceanography" },
    { canonical_id: "mb-Orienteering", name: "Orienteering" },
    { canonical_id: "mb-Painting", name: "Painting" },
    { canonical_id: "mb-Personal Fitness", name: "Personal Fitness" },
    { canonical_id: "mb-Personal Management", name: "Personal Management" },
    { canonical_id: "mb-Photography", name: "Photography" },
    { canonical_id: "mb-Pioneering", name: "Pioneering" },
    { canonical_id: "mb-Plant Science", name: "Plant Science" },
    { canonical_id: "mb-Plumbing", name: "Plumbing" },
    { canonical_id: "mb-Pottery", name: "Pottery" },
    { canonical_id: "mb-Public Health", name: "Public Health" },
    { canonical_id: "mb-Public Speaking", name: "Public Speaking" },
    { canonical_id: "mb-Radio", name: "Radio" },
    { canonical_id: "mb-Railroading", name: "Railroading" },
    { canonical_id: "mb-Ranking", name: "Ranking" },
    { canonical_id: "mb-Reptile and Amphibian Study", name: "Reptile and Amphibian Study" },
    { canonical_id: "mb-Rifle Shooting", name: "Rifle Shooting" },
    { canonical_id: "mb-Rowboating", name: "Rowboating" },
    { canonical_id: "mb-Safety", name: "Safety" },
    { canonical_id: "mb-Salesmanship", name: "Salesmanship" },
    { canonical_id: "mb-Scouting Heritage", name: "Scouting Heritage" },
    { canonical_id: "mb-Sculpture", name: "Sculpture" },
    { canonical_id: "mb-Shotgun Shooting", name: "Shotgun Shooting" },
    { canonical_id: "mb-Signaling", name: "Signaling" },
    { canonical_id: "mb-Skating", name: "Skating" },
    { canonical_id: "mb-Small-Boat Sailing", name: "Small-Boat Sailing" },
    { canonical_id: "mb-Snow Sports", name: "Snow Sports" },
    { canonical_id: "mb-Space Exploration", name: "Space Exploration" },
    { canonical_id: "mb-Sports", name: "Sports" },
    { canonical_id: "mb-Stamp Collecting", name: "Stamp Collecting" },
    { canonical_id: "mb-Surveying", name: "Surveying" },
    { canonical_id: "mb-Swimming", name: "Swimming" },
    { canonical_id: "mb-Theater", name: "Theater" },
    { canonical_id: "mb-Traffic Safety", name: "Traffic Safety" },
    { canonical_id: "mb-Truck Transportation", name: "Truck Transportation" },
    { canonical_id: "mb-Veterinary Medicine", name: "Veterinary Medicine" },
    { canonical_id: "mb-Weather", name: "Weather" },
    { canonical_id: "mb-Welding", name: "Welding" },
    { canonical_id: "mb-Whitewater", name: "Whitewater" },
    { canonical_id: "mb-Wilderness Survival", name: "Wilderness Survival" },
    { canonical_id: "mb-Wood Carving", name: "Wood Carving" },
    { canonical_id: "mb-Woodwork", name: "Woodwork" }
  ]
};

export default ADVANCEMENT_DATA;
