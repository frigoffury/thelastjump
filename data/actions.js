/* The Last Jump - Actions - by FrigOfFury
 *
 * Actions are first-class entities representing things the player can do.
 * They replace chapter-embedded choices, allowing:
 * - Multiple storylines to contribute actions simultaneously
 * - Actions to have cross-storyline consequences (via flags/stats)
 * - Centralized condition checking for action availability
 *
 * Action structure:
 *   id: string - unique identifier
 *   text: string - button label shown to player
 *   actionCost: number - how many actions this consumes (0 = free)
 *   conditions: object - when this action is available
 *     inChapter: { storyId: chapterId } - requires storyline to be at specific chapter
 *     hasFlag: string - requires global flag to be set
 *     notFlag: string - requires global flag to NOT be set
 *   onSelect: function(game) - called when player selects this action
 *     Should call game.evaluateStorylines() and game.refreshDisplay() when done
 *     For async flows (like character creation), call these in the onComplete callback
 *
 * Actions don't directly advance storylines - they set flags/stats that
 * storylines react to via their advanceWhen conditions.
 */

const Actions = {
    beginJourney: {
        id: 'beginJourney',
        text: 'Begin your journey',
        actionCost: 0,
        conditions: {
            inChapter: { intro: 'start' }
        },
        onSelect: (game) => {
            const choiceSet = CreationChoiceSets['firstJump'] || [];
            CharacterCreation.start(game.state.playerId, choiceSet, {
                onComplete: () => {
                    game.setFlag('character_created');
                    game.evaluateStorylines();
                    game.refreshDisplay();
                }
            });
        }
    },

    rememberAcquaintance: {
        id: 'rememberAcquaintance',
        text: 'Try to remember an acquaintance',
        actionCost: 1,
        conditions: {
            inChapter: { intro: 'awakening' }
        },
        onSelect: (game) => {
            const npcId = game.createCharacter('human', 'Acquaintance');
            const choiceSet = CreationChoiceSets['rememberAcquaintance'] || [];
            CharacterCreation.start(npcId, choiceSet, {
                createAcquaintanceFor: game.state.playerId,
                reverseAcquaintance: false,
                onComplete: () => {
                    game.evaluateStorylines();
                    game.refreshDisplay();
                }
            });
        }
    },

    getAJob: {
        id: 'getAJob',
        text: 'Get a job',
        actionCost: 1,
        conditions: {
            inChapter: { intro: 'awakening' }
        },
        onSelect: (game) => {
            // TODO: Implement job-hunting interaction that could spawn a job storyline
            game.evaluateStorylines();
            game.refreshDisplay();
        }
    }
};
