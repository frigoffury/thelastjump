/* The Last Jump - Creation Choices - by FrigOfFury
 *
 * Choices presented during character creation. Each choice is independent
 * and their impacts are additive. Different creation scenarios can use
 * different subsets of choices via CreationChoiceSets.
 *
 * Choice structure:
 *   id: string - unique identifier
 *   text: string | function(game, char) - question to display
 *   condition: function(game) - optional, whether this choice is available
 *   options: array of options the player can select
 *
 * Option structure:
 *   text: string - button label
 *   condition: function(game, char) - optional, whether this option is available
 *   impacts: array of impacts applied when selected (see character-creation.js)
 *
 * CreationChoiceSets group choices for different scenarios:
 *   firstJump: choices for initial player creation
 *   rememberAcquaintance: choices for creating an NPC acquaintance
 */

const CreationChoices = {
    combatCapability: {
        id: 'combatCapability',
        text: 'How combat-capable do you need to be in this life?',
        condition: (game) => game.state.jumpCount === 0,  // First universe only for now
        options: [
            {
                text: 'Low',
                impacts: []  // Base 50 health, no change
            },
            {
                text: 'Medium',
                impacts: [{ stat: 'health', delta: 50 }]
            },
            {
                text: 'High',
                impacts: [{ stat: 'health', delta: 100 }]
            }
        ]
    },

    affluence: {
        id: 'affluence',
        text: 'How affluent is your new identity?',
        condition: (game) => game.state.jumpCount === 0,
        options: [
            {
                text: 'Low',
                impacts: [
                    { stat: 'health', delta: 20, probability: 0.5 }  // Scrappy survivor
                ]
            },
            {
                text: 'Medium',
                impacts: [{ stat: 'money', delta: 100 }]
            },
            {
                text: 'High',
                impacts: [
                    { stat: 'money', delta: 300 },
                    { stat: 'health', delta: -20, probability: 0.5 }  // Wealthy but fragile
                ]
            }
        ]
    },

    // === Acquaintance creation choices ===

    acquaintanceGender: {
        id: 'acquaintanceGender',
        text: 'You have a hazy memory of someone. Are they:',
        options: [
            { text: 'Male', impacts: [{ gender: 'male' }] },
            { text: 'Female', impacts: [{ gender: 'female' }] },
            { text: 'Nonbinary', impacts: [{ gender: 'nonbinary' }] }
        ]
    },

    acquaintanceRelationship: {
        id: 'acquaintanceRelationship',
        text: (game, char) => {
            const g = char.gender || 'nonbinary';
            return `Is the ${g} person an enemy or a loved one?`;
        },
        options: [
            { text: 'An enemy', impacts: [{ acquaintanceType: 'enemy' }] },
            { text: 'A loved one', impacts: [{ acquaintanceType: 'loved_one' }] }
        ]
    }
};

// Standard choice sets for different scenarios
const CreationChoiceSets = {
    firstJump: ['combatCapability', 'affluence'],
    rememberAcquaintance: ['acquaintanceGender', 'acquaintanceRelationship']
};
