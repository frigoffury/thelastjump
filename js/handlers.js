/* The Last Jump - Handlers - by FrigOfFury
 *
 * Named handler functions for complex game logic that can't be expressed
 * declaratively. Referenced by name from JSON data files.
 *
 * When JSON data specifies: "handler": "startCharacterCreation"
 * The game engine looks up Handlers.startCharacterCreation and calls it.
 *
 * Handlers receive (game, entity, context) where:
 *   game    - the Game object
 *   entity  - the action/event/etc that triggered this handler
 *   context - optional additional data
 *
 * For actions: handler is called instead of processing effects
 * For events: handler returns { text, choices } for display
 */

const Handlers = {
    // === Character Creation Handlers ===

    // Start the initial character creation flow
    // Returns async: true because this is an interactive sequence
    startCharacterCreation(game, action, { onComplete }) {
        const choiceSet = CreationChoiceSets['firstJump'] || [];
        CharacterCreation.start(game.state.playerId, choiceSet, {
            onComplete: () => {
                game.setFlag('character_created');
                onComplete(); // Resume game loop
            }
        });
        return { async: true, skipEffects: true };
    },

    // Start the acquaintance memory creation flow
    // Returns async: true because this is an interactive sequence
    startAcquaintanceCreation(game, action, { onComplete }) {
        const npcId = game.createCharacter('human', 'Stranger');
        const choiceSet = CreationChoiceSets['rememberAcquaintance'] || [];
        CharacterCreation.start(npcId, choiceSet, {
            createAcquaintanceFor: game.state.playerId,
            reverseAcquaintance: true,
            onComplete: (npc) => {
                game.setFlag('rememberedAcquaintance');
                onComplete(); // Resume game loop
            }
        });
        return { async: true, skipEffects: true };
    },

    // === Event Handlers ===

    // Process rent payments for all homes
    processRentPayments(game, event, context) {
        const pid = game.state.playerId;
        const homes = game.getCharacterObjectsOfType(pid, 'home');
        const results = [];

        for (const home of homes) {
            const rent = home.state.rent || 0;
            const money = game.getStat(pid, 'money');

            if (money >= rent) {
                game.modifyStat(pid, 'money', -rent);
                results.push(`Paid $${rent} rent for ${home.name}.`);
            } else {
                game.removeObject(home.id, pid);
                results.push(`Evicted from ${home.name}—couldn't afford $${rent} rent.`);
            }
        }

        return {
            text: results.join('\n\n'),
            choices: [{ text: 'Continue', action: 'dismiss' }]
        };
    }

    // Add more handlers as needed...
};
