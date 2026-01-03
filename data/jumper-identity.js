/* The Last Jump - Jumper Identity Definitions
 * Defines the persistent identity options for Jumpers across all universe iterations.
 *
 * This includes:
 *   - Core gender options
 *   - Attraction preferences
 *   - Aspirations (unlock content/endings)
 *   - Well-trod strategies (gate deep skill selection)
 */

// Gender options for core Jumper identity
const JumperGenderOptions = {
    male: { id: 'male', title: 'Male', pronoun: 'he' },
    female: { id: 'female', title: 'Female', pronoun: 'she' },
    nonbinary: { id: 'nonbinary', title: 'Non-binary', pronoun: 'they' },
    fluid: { id: 'fluid', title: 'Fluid', pronoun: 'they' }
};

// Attraction options (multi-select)
const JumperAttractionOptions = {
    men: { id: 'men', title: 'Men' },
    women: { id: 'women', title: 'Women' },
    nonbinary: { id: 'nonbinary', title: 'Non-binary people' }
};

// Aspirations - what the Jumper hopes for if they ever avert The End
// These unlock specific storylines and ending variations
const JumperAspirations = {
    find_peace: {
        id: 'find_peace',
        title: 'Find Peace',
        description: 'Finally rest. No more jumps, no more running.'
    },
    rebuild_family: {
        id: 'rebuild_family',
        title: 'Rebuild What Was Lost',
        description: 'Find or recreate the family you once had.'
    },
    understand_end: {
        id: 'understand_end',
        title: 'Understand The End',
        description: 'Learn why it keeps happening. Find the truth.'
    },
    save_everyone: {
        id: 'save_everyone',
        title: 'Save Everyone',
        description: 'Not just avert The End—save everyone you can.'
    }
};

// Well-trod strategies - approaches the Jumper has focused on across iterations
// Each strategy unlocks a pool of skills for deep memory selection
// Player picks 2 strategies (can repeat), then skills from each strategy's pool
const JumperStrategies = {
    shadow: {
        id: 'shadow',
        title: 'The Shadow',
        description: 'Infiltration, stealth, and working unseen.',
        skills: ['stealth', 'sleight_of_hand', 'shadowing', 'lockpicking', 'disguise', 'security_systems']
    },
    face: {
        id: 'face',
        title: 'The Face',
        description: 'Social manipulation, negotiation, reading people.',
        skills: ['persuasion', 'deception', 'contract_negotiation', 'seduction', 'cold_reading', 'public_speaking', 'disguise']
    },
    operator: {
        id: 'operator',
        title: 'The Operator',
        description: 'Technical expertise, systems, and hacking.',
        skills: ['computers', 'hacking', 'document_forgery', 'typing', 'electronics', 'security_systems', 'mechanics']
    },
    blade: {
        id: 'blade',
        title: 'The Blade',
        description: 'Direct confrontation and combat.',
        skills: ['melee', 'unarmed', 'blades', 'firearms', 'intimidation', 'throwing']
    },
    runner: {
        id: 'runner',
        title: 'The Runner',
        description: 'Mobility, evasion, and physical prowess.',
        skills: ['athletics', 'parkour', 'swimming', 'yoga', 'horse_riding', 'stealth', 'driving', 'piloting']
    },
    mind: {
        id: 'mind',
        title: 'The Mind',
        description: 'Analysis, planning, and Jumper awareness.',
        skills: ['analysis', 'calculation', 'forensics', 'jumper_awareness', 'deep_integration', 'controlled_recall']
    },
    charmer: {
        id: 'charmer',
        title: 'The Charmer',
        description: 'Romance, allure, and social grace.',
        skills: ['seduction', 'cosmetics', 'fashion', 'dancing', 'singing', 'cold_reading', 'walking_in_heels']
    },
    caretaker: {
        id: 'caretaker',
        title: 'The Caretaker',
        description: 'Nurturing, healing, and domestic arts.',
        skills: ['first_aid', 'surgery', 'massage', 'cooking', 'gardening', 'animal_handling', 'sewing']
    },
    artist: {
        id: 'artist',
        title: 'The Artist',
        description: 'Creative expression and observation.',
        skills: ['art', 'drawing', 'photography', 'calligraphy', 'neat_handwriting', 'cute_handwriting']
    },
    performer: {
        id: 'performer',
        title: 'The Performer',
        description: 'Entertainment and public presence.',
        skills: ['comedy', 'storytelling', 'public_speaking', 'dancing', 'singing', 'poker']
    }
};

// Configuration for the jumper creation flow
const JumperCreationConfig = {
    pointsPerStrategy: 3,      // Point budget per strategy selection (3 × 2 = 6 pts)
    strategyPicks: 2,          // How many strategy selections (can repeat)
    personalInterestPoints: 2, // Point budget for personal interest (2 specific skills)
    skillCosts: {
        general: 3,            // General skills cost 3 points
        specific: 1            // Specific skills cost 1 point
    }
    // Total: 8 points (6 from strategies + 2 personal)
};
