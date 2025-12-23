/* The Last Jump - Effect Executor - by FrigOfFury
 *
 * Processes declarative effects from JSON data.
 * Effects are changes to game state triggered by actions, events, etc.
 *
 * Effect types:
 *   setFlag: 'flagName'                       - set a global flag to true
 *   clearFlag: 'flagName'                     - set a global flag to false
 *   modifyStat: ['statName', delta]           - add delta to player stat
 *   setStat: ['statName', value]              - set player stat to value
 *   modifyCharStat: ['charId', 'stat', delta] - modify any character's stat
 *   setCharFlag: ['charId', 'flag', value]    - set character-specific flag
 *   giveObject: { template, name, state }     - create and give object to player
 *   removeObjectOfType: 'templateType'        - remove first object of type
 *   advanceChapter: ['storyId', 'chapterId']  - advance a storyline
 *   enterStory: 'storyId'                     - enter a new storyline
 *   modifyObjectiveProgress: ['storyId', delta] - add to objective progress
 *   setObjectiveProgress: ['storyId', value]  - set objective progress
 *   startPursuit: 'pursuitId'                 - activate an action-gated pursuit
 *   endPursuit: 'pursuitId'                   - deactivate a pursuit
 *   ensurePossession: ['type', { state }]     - create or update a possession
 *   showText: 'text'                          - queue text for display
 *
 * Returns collected text for display (if any showText effects were used).
 */

const EffectExecutor = {
    // Execute an array of effects, return any text to display
    execute(effects, game, context = {}) {
        if (!effects || !Array.isArray(effects)) return null;

        const textParts = [];
        const pid = game.state.playerId;

        for (const effect of effects) {
            // setFlag: 'flagName'
            if (effect.setFlag != null) {
                game.setFlag(effect.setFlag, true);
            }

            // clearFlag: 'flagName'
            if (effect.clearFlag != null) {
                game.setFlag(effect.clearFlag, false);
            }

            // modifyStat: ['statName', delta]
            if (effect.modifyStat != null) {
                const [stat, delta] = effect.modifyStat;
                game.modifyStat(pid, stat, delta);
            }

            // setStat: ['statName', value]
            if (effect.setStat != null) {
                const [stat, value] = effect.setStat;
                game.setStat(pid, stat, value);
            }

            // modifyCharStat: ['charId', 'statName', delta]
            if (effect.modifyCharStat != null) {
                const [charId, stat, delta] = effect.modifyCharStat;
                game.modifyStat(charId, stat, delta);
            }

            // setCharFlag: ['charId', 'flagName', value]
            if (effect.setCharFlag != null) {
                const [charId, flag, value] = effect.setCharFlag;
                game.setCharacterFlag(charId, flag, value ?? true);
            }

            // giveObject: { template, name, state }
            if (effect.giveObject != null) {
                const { template, name, state } = effect.giveObject;
                const objId = game.createObject(template, name || template, state || {});
                game.giveObject(objId, pid);
            }

            // removeObjectOfType: 'templateType'
            if (effect.removeObjectOfType != null) {
                const obj = game.getCharacterObjectOfType(pid, effect.removeObjectOfType);
                if (obj) {
                    game.removeObject(obj.id, pid);
                }
            }

            // advanceChapter: ['storyId', 'chapterId']
            if (effect.advanceChapter != null) {
                const [storyId, chapterId] = effect.advanceChapter;
                game.advanceChapter(storyId, chapterId);
            }

            // enterStory: 'storyId'
            if (effect.enterStory != null) {
                game.enterStory(effect.enterStory);
            }

            // modifyObjectiveProgress: ['storyId', delta]
            // Modifies progress value on a storyline (for tracking objective completion)
            if (effect.modifyObjectiveProgress != null) {
                const [storyId, delta] = effect.modifyObjectiveProgress;
                if (game.state.storylines[storyId]) {
                    const storyline = game.state.storylines[storyId];
                    storyline.progress = (storyline.progress || 0) + delta;
                }
            }

            // setObjectiveProgress: ['storyId', value]
            if (effect.setObjectiveProgress != null) {
                const [storyId, value] = effect.setObjectiveProgress;
                if (game.state.storylines[storyId]) {
                    game.state.storylines[storyId].progress = value;
                }
            }

            // startPursuit: 'pursuitId' - activate an action-gated pursuit
            if (effect.startPursuit != null) {
                if (typeof PursuitManager !== 'undefined') {
                    PursuitManager.activatePursuit(game, effect.startPursuit);
                }
            }

            // endPursuit: 'pursuitId' - deactivate a pursuit
            if (effect.endPursuit != null) {
                if (typeof PursuitManager !== 'undefined') {
                    PursuitManager.deactivatePursuit(game, effect.endPursuit);
                }
            }

            // ensurePossession: ['templateType', { state }]
            // Creates object if player doesn't have one, or updates existing
            if (effect.ensurePossession != null) {
                const [templateType, stateOverrides] = effect.ensurePossession;
                const existingObj = game.getCharacterObjectOfType(pid, templateType);

                if (existingObj) {
                    // Update existing object's state
                    Object.assign(existingObj.state, stateOverrides || {});
                } else {
                    // Create new object
                    const objId = game.createObject(templateType, templateType, stateOverrides || {});
                    game.giveObject(objId, pid);
                }
            }

            // showText: 'text' - collect for display
            if (effect.showText != null) {
                let text = effect.showText;
                // Support text interpolation if context provided
                if (context.interpolate && typeof TextInterpolation !== 'undefined') {
                    text = TextInterpolation.interpolate(text, context.interpolate);
                }
                textParts.push(text);
            }

            // custom: allows inline simple expressions (use sparingly)
            // This is an escape hatch, prefer handlers for complex logic
            if (effect.custom != null && typeof effect.custom === 'function') {
                const result = effect.custom(game, context);
                if (result) textParts.push(result);
            }
        }

        return textParts.length > 0 ? textParts.join('\n\n') : null;
    },

    // Execute effects with probability check
    executeWithProbability(effects, game, probability = 1) {
        if (probability < 1 && game.random() > probability) {
            return null;
        }
        return this.execute(effects, game);
    }
};
