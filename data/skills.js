/* The Last Jump - Skill Definitions
 * Defines general and specific skills available in the game.
 * See docs/skills.md for full documentation.
 */

const SkillDefinitions = {
    // Physical skills
    athletics: { type: 'general', title: 'Athletics', category: 'physical' },
    stealth: { type: 'general', title: 'Stealth', category: 'physical' },
    melee: { type: 'general', title: 'Melee', category: 'physical' },
    firearms: { type: 'general', title: 'Firearms', category: 'physical' },
    projectiles: { type: 'general', title: 'Projectiles', category: 'physical' },

    // Social skills
    persuasion: { type: 'general', title: 'Persuasion', category: 'social' },
    deception: { type: 'general', title: 'Deception', category: 'social' },
    intimidation: { type: 'general', title: 'Intimidation', category: 'social' },
    empathy: { type: 'general', title: 'Empathy', category: 'social' },

    // Technical skills
    computers: { type: 'general', title: 'Computers', category: 'technical' },
    mechanics: { type: 'general', title: 'Mechanics', category: 'technical' },
    electronics: { type: 'general', title: 'Electronics', category: 'technical' },
    treatment: { type: 'general', title: 'Treatment', category: 'technical' },
    driving: { type: 'general', title: 'Driving', category: 'technical' },
    piloting: { type: 'general', title: 'Piloting', category: 'technical' },

    // Mental skills
    calculation: { type: 'general', title: 'Calculation', category: 'mental' },
    analysis: { type: 'general', title: 'Analysis', category: 'mental' },
    art: { type: 'general', title: 'Art', category: 'mental' },
    jumper_awareness: { type: 'general', title: 'Jumper Awareness', category: 'mental' },

    // Specific skills (add to parent general skill)

    // Physical - Melee
    unarmed: { type: 'specific', parent: 'melee', title: 'Unarmed' },
    blades: { type: 'specific', parent: 'melee', title: 'Blades' },

    // Physical - Stealth
    sleight_of_hand: { type: 'specific', parent: 'stealth', title: 'Sleight of Hand' },
    shadowing: { type: 'specific', parent: 'stealth', title: 'Shadowing' },

    // Physical - Athletics
    parkour: { type: 'specific', parent: 'athletics', title: 'Parkour' },
    swimming: { type: 'specific', parent: 'athletics', title: 'Swimming' },
    dancing: { type: 'specific', parent: 'athletics', title: 'Dancing' },
    walking_in_heels: { type: 'specific', parent: 'athletics', title: 'Walking in Heels' },
    yoga: { type: 'specific', parent: 'athletics', title: 'Yoga' },
    horse_riding: { type: 'specific', parent: 'athletics', title: 'Horse Riding' },

    // Physical - Projectiles
    throwing: { type: 'specific', parent: 'projectiles', title: 'Throwing' },

    // Social - Persuasion
    contract_negotiation: { type: 'specific', parent: 'persuasion', title: 'Contract Negotiation' },
    comedy: { type: 'specific', parent: 'persuasion', title: 'Comedy' },
    seduction: { type: 'specific', parent: 'persuasion', title: 'Seduction' },
    storytelling: { type: 'specific', parent: 'persuasion', title: 'Storytelling' },
    public_speaking: { type: 'specific', parent: 'persuasion', title: 'Public Speaking' },

    // Social - Deception
    disguise: { type: 'specific', parent: 'deception', title: 'Disguise' },
    cosmetics: { type: 'specific', parent: 'deception', title: 'Cosmetics' },
    fashion: { type: 'specific', parent: 'deception', title: 'Fashion' },
    poker: { type: 'specific', parent: 'deception', title: 'Poker' },

    // Social - Empathy
    cold_reading: { type: 'specific', parent: 'empathy', title: 'Cold Reading' },
    singing: { type: 'specific', parent: 'empathy', title: 'Singing' },
    animal_handling: { type: 'specific', parent: 'empathy', title: 'Animal Handling' },

    // Technical - Computers
    hacking: { type: 'specific', parent: 'computers', title: 'Hacking' },
    document_forgery: { type: 'specific', parent: 'computers', title: 'Document Forgery' },
    typing: { type: 'specific', parent: 'computers', title: 'Typing' },
    long_nail_typing: { type: 'specific', parent: 'computers', title: 'Long Nail Typing' },

    // Technical - Mechanics
    lockpicking: { type: 'specific', parent: 'mechanics', title: 'Lockpicking' },
    handyman: { type: 'specific', parent: 'mechanics', title: 'Handyman' },
    sewing: { type: 'specific', parent: 'mechanics', title: 'Sewing' },

    // Technical - Electronics
    security_systems: { type: 'specific', parent: 'electronics', title: 'Security Systems' },

    // Technical - Treatment
    first_aid: { type: 'specific', parent: 'treatment', title: 'First Aid' },
    surgery: { type: 'specific', parent: 'treatment', title: 'Surgery' },
    massage: { type: 'specific', parent: 'treatment', title: 'Massage' },

    // Mental - Analysis
    cooking: { type: 'specific', parent: 'analysis', title: 'Cooking' },
    forensics: { type: 'specific', parent: 'analysis', title: 'Forensics' },
    gardening: { type: 'specific', parent: 'analysis', title: 'Gardening' },

    // Mental - Art
    drawing: { type: 'specific', parent: 'art', title: 'Drawing' },
    photography: { type: 'specific', parent: 'art', title: 'Photography' },
    calligraphy: { type: 'specific', parent: 'art', title: 'Calligraphy' },
    neat_handwriting: { type: 'specific', parent: 'art', title: 'Neat Handwriting' },
    cute_handwriting: { type: 'specific', parent: 'art', title: 'Cute Handwriting' },

    // Mental - Jumper Awareness
    deep_integration: { type: 'specific', parent: 'jumper_awareness', title: 'Deep Integration' },
    controlled_recall: { type: 'specific', parent: 'jumper_awareness', title: 'Controlled Recall' }
};
