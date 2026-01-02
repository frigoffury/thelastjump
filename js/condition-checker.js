/* The Last Jump - Condition Checker - by FrigOfFury
 *
 * Evaluates declarative conditions from JSON data.
 * Used by actions, events, and other systems to check availability.
 *
 * Condition types:
 *   hasFlag: 'flag' or ['flag1', 'flag2']     - all flags must be set
 *   notFlag: 'flag' or ['flag1', 'flag2']     - none of these flags set
 *   inChapter: { storyId: 'chapterId' }       - must be in specific chapter(s)
 *   stat: ['statName', 'op', value]           - compare player stat
 *   charStat: ['charId', 'statName', 'op', value] - compare any character stat
 *   skill: ['skillName', 'op', value]         - compare player skill (general+specific)
 *   hasDeepSkill: 'skill' or ['skill1', ...]  - player has deep skill specialty
 *   hasObjectOfType: 'templateType'           - player owns object of type
 *   weekDivisibleBy: number                   - current week divisible by N
 *   minWeek: number                           - at least week N
 *   maxWeek: number                           - at most week N
 *   objectiveProgress: ['storyId', 'op', val] - check objective progress value
 *   objectiveComplete: { storyId: result }    - result: true|'success'|'failure'
 *   objectiveActive: 'storyId' or [...]       - objective started but not done
 *   pursuitActive: 'id' or ['id1', 'id2']     - pursuit is active (& enabled for toggle)
 *   pursuitOption: ['id', 'option']           - check select pursuit's current option
 *   pursuitHours: ['op', value]               - check total weekly pursuit hours
 *   all: [conditions...]                      - all must pass (AND)
 *   any: [conditions...]                      - at least one must pass (OR)
 *   not: condition                            - inverts a condition
 */

const ConditionChecker = {
    // Main entry point - checks if all conditions pass
    check(conditions, game) {
        if (!conditions) return true;
        if (typeof conditions !== 'object') return true;

        const pid = game.state.playerId;

        // inChapter: { storyId: chapterId, ... }
        if (conditions.inChapter) {
            for (const [storyId, chapterId] of Object.entries(conditions.inChapter)) {
                const state = game.state.storylines[storyId];
                if (!state || state.currentChapter !== chapterId) return false;
            }
        }

        // hasFlag: 'flagName' or ['flag1', 'flag2']
        if (conditions.hasFlag != null) {
            const flags = Array.isArray(conditions.hasFlag)
                ? conditions.hasFlag
                : [conditions.hasFlag];
            for (const flag of flags) {
                if (!game.hasFlag(flag)) return false;
            }
        }

        // notFlag: 'flagName' or ['flag1', 'flag2']
        if (conditions.notFlag != null) {
            const flags = Array.isArray(conditions.notFlag)
                ? conditions.notFlag
                : [conditions.notFlag];
            for (const flag of flags) {
                if (game.hasFlag(flag)) return false;
            }
        }

        // stat: ['statName', 'op', value] - player stat comparison
        if (conditions.stat) {
            const [statName, op, value] = conditions.stat;
            const current = game.getStat(pid, statName);
            if (!this.compare(current, op, value)) return false;
        }

        // charStat: ['charId', 'statName', 'op', value] - any character
        if (conditions.charStat) {
            const [charId, statName, op, value] = conditions.charStat;
            const current = game.getStat(charId, statName);
            if (!this.compare(current, op, value)) return false;
        }

        // skill: ['skillName', 'op', value] - player skill comparison
        if (conditions.skill) {
            const [skillName, op, value] = conditions.skill;
            const current = game.getSkill(pid, skillName);
            if (!this.compare(current, op, value)) return false;
        }

        // hasDeepSkill: 'skillName' or ['skill1', 'skill2'] - all must be present
        if (conditions.hasDeepSkill != null) {
            const skills = Array.isArray(conditions.hasDeepSkill)
                ? conditions.hasDeepSkill
                : [conditions.hasDeepSkill];
            for (const skill of skills) {
                if (!game.hasDeepSkill(pid, skill)) return false;
            }
        }

        // weekDivisibleBy: number
        if (conditions.weekDivisibleBy != null) {
            if (game.state.week % conditions.weekDivisibleBy !== 0) return false;
        }

        // minWeek: number
        if (conditions.minWeek != null) {
            if (game.state.week < conditions.minWeek) return false;
        }

        // maxWeek: number
        if (conditions.maxWeek != null) {
            if (game.state.week > conditions.maxWeek) return false;
        }

        // hasObjectOfType: 'templateType'
        if (conditions.hasObjectOfType != null) {
            if (!game.getCharacterObjectOfType(pid, conditions.hasObjectOfType)) {
                return false;
            }
        }

        // playerHasObjectOfType: alias for hasObjectOfType (backwards compat)
        if (conditions.playerHasObjectOfType != null) {
            if (!game.getCharacterObjectOfType(pid, conditions.playerHasObjectOfType)) {
                return false;
            }
        }

        // objectiveProgress: ['storyId', 'op', value] - check progress on objective
        if (conditions.objectiveProgress) {
            const [storyId, op, value] = conditions.objectiveProgress;
            const storyline = game.state.storylines[storyId];
            const progress = storyline?.progress || 0;
            if (!this.compare(progress, op, value)) return false;
        }

        // objectiveComplete: { storyId: 'success' | 'failure' | true }
        // true = just completed, 'success'/'failure' = completed with that result
        if (conditions.objectiveComplete) {
            for (const [storyId, expectedResult] of Object.entries(conditions.objectiveComplete)) {
                const storyline = game.state.storylines[storyId];
                if (!storyline?.completed) return false;
                if (expectedResult !== true && storyline.result !== expectedResult) return false;
            }
        }

        // objectiveActive: 'storyId' or ['storyId1', 'storyId2']
        // Check if objective is active (started but not completed)
        if (conditions.objectiveActive != null) {
            const storyIds = Array.isArray(conditions.objectiveActive)
                ? conditions.objectiveActive
                : [conditions.objectiveActive];
            for (const storyId of storyIds) {
                const storyline = game.state.storylines[storyId];
                if (!storyline || storyline.completed) return false;
            }
        }

        // pursuitActive: 'pursuitId' or ['id1', 'id2']
        // Check if pursuit(s) are currently active (and enabled for toggles)
        if (conditions.pursuitActive != null) {
            const ids = Array.isArray(conditions.pursuitActive)
                ? conditions.pursuitActive
                : [conditions.pursuitActive];
            for (const pursuitId of ids) {
                const state = game.state.pursuits?.[pursuitId];
                if (!state || !state.active) return false;
                // For toggle pursuits, also check if enabled
                const pursuit = typeof Pursuits !== 'undefined' ? Pursuits[pursuitId] : null;
                if (pursuit?.configType === 'toggle' && !state.enabled) return false;
            }
        }

        // pursuitOption: ['pursuitId', 'optionKey']
        // Check current option for a select pursuit
        if (conditions.pursuitOption != null) {
            const [pursuitId, expectedOption] = conditions.pursuitOption;
            const state = game.state.pursuits?.[pursuitId];
            if (!state || state.option !== expectedOption) return false;
        }

        // pursuitHours: ['op', value]
        // Check total weekly pursuit hours
        if (conditions.pursuitHours != null) {
            const [op, value] = conditions.pursuitHours;
            const hours = typeof PursuitManager !== 'undefined'
                ? PursuitManager.calculatePursuitHours(game)
                : 0;
            if (!this.compare(hours, op, value)) return false;
        }

        // flags: ['flag1', 'flag2'] - legacy support, same as hasFlag array
        if (conditions.flags) {
            for (const flag of conditions.flags) {
                if (!game.hasFlag(flag)) return false;
            }
        }

        // all: [condition, condition, ...] - AND logic
        if (conditions.all) {
            for (const sub of conditions.all) {
                if (!this.check(sub, game)) return false;
            }
        }

        // any: [condition, condition, ...] - OR logic
        if (conditions.any) {
            let anyPassed = false;
            for (const sub of conditions.any) {
                if (this.check(sub, game)) {
                    anyPassed = true;
                    break;
                }
            }
            if (!anyPassed) return false;
        }

        // not: condition - inverts result
        if (conditions.not) {
            if (this.check(conditions.not, game)) return false;
        }

        return true;
    },

    // Compare two values with an operator
    compare(current, op, target) {
        switch (op) {
            case '<':  return current < target;
            case '<=': return current <= target;
            case '>':  return current > target;
            case '>=': return current >= target;
            case '==':
            case '=':  return current === target;
            case '!=':
            case '<>': return current !== target;
            default:   return false;
        }
    }
};
