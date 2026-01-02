/* The Last Jump - Reusable Ability Checks
 * Named ability check definitions that can be referenced by ID in stories/events.
 * See docs/skills.md for full documentation.
 *
 * Usage:
 *   { "abilityCheck": "athletic_leap" }                    // Reference by ID
 *   { "abilityCheck": { "ref": "athletic_leap", "difficulty": 70 } }  // With override
 */

const AbilityChecks = {
    // Athletic challenges
    athletic_leap: {
        skill: 'parkour',
        dice: '2d6',
        difficulty: 50,
        bonuses: [
            { stat: 'strength', scale: 0.3 }
        ],
        modifiers: [
            { condition: { stat: ['health', '<', 50] }, add: 10 },
            { condition: { stat: ['health', '<', 20] }, add: 15 }
        ]
    },

    // Stealth challenges
    pick_lock: {
        skill: 'lockpicking',
        dice: '2d6',
        difficulty: 40,
        crushMargin: 15
    },

    sneak_past: {
        skill: 'stealth',
        dice: '2d6',
        difficulty: 45
    },

    // Combat
    unarmed_defense: {
        skill: 'unarmed',
        dice: '2d6',
        difficulty: 50,
        bonuses: [
            { stat: 'strength', scale: 0.5 }
        ]
    },

    // Technical
    hack_system: {
        skill: 'hacking',
        dice: '2d6',
        difficulty: 55,
        crushMargin: 20
    },

    // Social
    fast_talk: {
        skill: 'deception',
        dice: '2d6',
        difficulty: 40
    },

    negotiate_deal: {
        skill: 'contract_negotiation',
        dice: '2d6',
        difficulty: 50,
        crushMargin: 15
    }
};
