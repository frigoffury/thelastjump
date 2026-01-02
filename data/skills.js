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
    jumper_awareness: { type: 'general', title: 'Jumper Awareness', category: 'mental' },

    // Specific skills (add to parent general skill)
    unarmed: { type: 'specific', parent: 'melee', title: 'Unarmed' },
    blades: { type: 'specific', parent: 'melee', title: 'Blades' },
    sleight_of_hand: { type: 'specific', parent: 'stealth', title: 'Sleight of Hand' },
    parkour: { type: 'specific', parent: 'athletics', title: 'Parkour' },
    contract_negotiation: { type: 'specific', parent: 'persuasion', title: 'Contract Negotiation' },
    disguise: { type: 'specific', parent: 'deception', title: 'Disguise' },
    hacking: { type: 'specific', parent: 'computers', title: 'Hacking' },
    lockpicking: { type: 'specific', parent: 'mechanics', title: 'Lockpicking' },
    security_systems: { type: 'specific', parent: 'electronics', title: 'Security Systems' },
    deep_integration: { type: 'specific', parent: 'jumper_awareness', title: 'Deep Integration' },
    controlled_recall: { type: 'specific', parent: 'jumper_awareness', title: 'Controlled Recall' }
};
