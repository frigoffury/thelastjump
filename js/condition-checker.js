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
 *   hasObjectOfType: 'templateType'           - player owns object of type
 *   weekDivisibleBy: number                   - current week divisible by N
 *   minWeek: number                           - at least week N
 *   maxWeek: number                           - at most week N
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
