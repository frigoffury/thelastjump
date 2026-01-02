/* The Last Jump - Ability Checker
 * Resolves ability checks with dice rolls, bonuses, modifiers, and outcome tiers.
 * See docs/skills.md for full documentation.
 *
 * TODO: Review all fallback/default values and add proper validation/errors.
 * Currently some missing parameters silently use defaults which can hide bugs.
 */

const AbilityChecker = {
    // Parse dice notation "2d6" -> { count: 2, sides: 6 }
    parseDice(notation) {
        const match = notation.match(/(\d+)d(\d+)/);
        if (!match) return { count: 1, sides: 20 };
        return { count: parseInt(match[1]), sides: parseInt(match[2]) };
    },

    // Roll dice using game's random function
    rollDice(notation, game) {
        const { count, sides } = this.parseDice(notation);
        let total = 0;
        for (let i = 0; i < count; i++) {
            total += Math.floor(game.random() * sides) + 1;
        }
        return total;
    },

    // Calculate average roll for showing odds
    averageRoll(notation) {
        const { count, sides } = this.parseDice(notation);
        return count * (sides + 1) / 2;
    },

    // Resolve check reference (string ID, object with ref, or inline definition)
    resolveCheck(abilityCheck) {
        if (typeof abilityCheck === 'string') {
            const resolved = typeof AbilityChecks !== 'undefined' ? AbilityChecks[abilityCheck] : null;
            if (!resolved) {
                console.error(`AbilityChecker: Unknown check reference "${abilityCheck}"`);
                return null;
            }
            return resolved;
        }
        if (abilityCheck.ref) {
            const base = typeof AbilityChecks !== 'undefined' ? AbilityChecks[abilityCheck.ref] : null;
            if (!base) {
                console.error(`AbilityChecker: Unknown check reference "${abilityCheck.ref}"`);
                return null;
            }
            // Merge overrides onto base (shallow merge, arrays replaced not merged)
            const merged = { ...base };
            for (const key of Object.keys(abilityCheck)) {
                if (key !== 'ref') {
                    merged[key] = abilityCheck[key];
                }
            }
            return merged;
        }
        return abilityCheck;
    },

    // Validate a check has required fields
    validateCheck(abilityCheck) {
        const errors = [];
        if (!abilityCheck.skill) {
            errors.push('Missing required field: skill');
        }
        if (!abilityCheck.dice) {
            errors.push('Missing required field: dice');
        }
        if (abilityCheck.difficulty == null) {
            errors.push('Missing required field: difficulty');
        }
        return errors;
    },

    // Resolve dynamic difficulty (number or expression like "opponent.skills.computers + 10")
    resolveDifficulty(difficulty, game) {
        if (typeof difficulty === 'number') return difficulty;
        if (typeof difficulty !== 'string') {
            console.error('AbilityChecker: difficulty must be a number or string expression');
            return 0;
        }

        // Parse expressions like "entity.path + 10" or "entity.path - 5"
        const match = difficulty.match(/^([a-z_][a-z0-9_.]*)\s*([+-])\s*(\d+)$/i);
        if (match) {
            const [, path, op, num] = match;
            const base = this.resolveEntityPath(path, game);
            return op === '+' ? base + parseInt(num) : base - parseInt(num);
        }

        // Just a path reference
        return this.resolveEntityPath(difficulty, game);
    },

    // Resolve entity.path references (e.g., "opponent.skills.hacking")
    resolveEntityPath(path, game) {
        const parts = path.split('.');
        if (parts.length < 2) return 0;

        const entityId = parts[0];
        const propPath = parts.slice(1);

        // Resolve entity ID to character
        let char = null;
        if (entityId === 'player') {
            char = game.getPlayer();
        } else {
            // Try as character ID or flag reference
            char = game.getCharacter(entityId);
        }

        if (!char) return 0;

        // Navigate property path
        let value = char;
        for (const prop of propPath) {
            if (value == null) return 0;
            value = value[prop];
        }

        return typeof value === 'number' ? value : 0;
    },

    // Perform an ability check
    check(abilityCheckInput, game, useDeepMemory = false) {
        const abilityCheck = this.resolveCheck(abilityCheckInput);
        if (!abilityCheck) {
            return { outcome: 'failure', error: 'Invalid check reference' };
        }

        // Validate required fields
        const errors = this.validateCheck(abilityCheck);
        if (errors.length > 0) {
            console.error('AbilityChecker: Invalid check:', errors.join(', '), abilityCheck);
            return { outcome: 'failure', error: errors.join(', ') };
        }

        const pid = game.state.playerId;
        const { skill, dice, difficulty, crushMargin, bonuses, modifiers } = abilityCheck;

        // Base skill value
        let playerValue = game.getSkill(pid, skill);

        // Deep memory bonus
        if (useDeepMemory) {
            playerValue += game.hasDeepSkill(pid, skill) ? 100 : 30;
        }

        // Add bonuses from stats
        if (bonuses) {
            for (const bonus of bonuses) {
                const statValue = game.getStat(pid, bonus.stat);
                playerValue += Math.floor(statValue * (bonus.scale ?? 1));
            }
        }

        // Roll dice
        const roll = this.rollDice(dice, game);
        const playerRoll = playerValue + roll;

        // Calculate effective difficulty
        let effectiveDifficulty = this.resolveDifficulty(difficulty, game);

        // Apply modifiers (conditions that adjust difficulty)
        if (modifiers && typeof ConditionChecker !== 'undefined') {
            for (const mod of modifiers) {
                if (ConditionChecker.check(mod.condition, game)) {
                    effectiveDifficulty += mod.add;
                }
            }
        }

        // Determine outcome
        let outcome;
        if (crushMargin && playerRoll >= effectiveDifficulty + crushMargin) {
            outcome = 'crushingSuccess';
        } else if (playerRoll >= effectiveDifficulty) {
            outcome = 'success';
        } else if (crushMargin && playerRoll < effectiveDifficulty - crushMargin) {
            outcome = 'crushingFailure';
        } else {
            outcome = 'failure';
        }

        return {
            outcome,
            playerRoll,
            effectiveDifficulty,
            roll,
            skillValue: playerValue,
            margin: playerRoll - effectiveDifficulty
        };
    },

    // Estimate odds before a check (for UI display)
    estimateOdds(abilityCheckInput, game, useDeepMemory = false) {
        const abilityCheck = this.resolveCheck(abilityCheckInput);
        if (!abilityCheck) return 'unknown';

        const errors = this.validateCheck(abilityCheck);
        if (errors.length > 0) return 'unknown';

        const pid = game.state.playerId;
        const { skill, dice, difficulty, bonuses, modifiers } = abilityCheck;

        // Calculate expected player value
        let playerValue = game.getSkill(pid, skill);
        if (useDeepMemory) {
            playerValue += game.hasDeepSkill(pid, skill) ? 100 : 30;
        }
        if (bonuses) {
            for (const bonus of bonuses) {
                const statValue = game.getStat(pid, bonus.stat);
                playerValue += Math.floor(statValue * (bonus.scale ?? 1));
            }
        }

        // Average roll
        const avgRoll = this.averageRoll(dice);
        const expectedRoll = playerValue + avgRoll;

        // Effective difficulty
        let effectiveDifficulty = this.resolveDifficulty(difficulty, game);
        if (modifiers && typeof ConditionChecker !== 'undefined') {
            for (const mod of modifiers) {
                if (ConditionChecker.check(mod.condition, game)) {
                    effectiveDifficulty += mod.add;
                }
            }
        }

        // Margin determines estimate
        const margin = expectedRoll - effectiveDifficulty;
        if (margin >= 15) return 'very likely';
        if (margin >= 5) return 'likely';
        if (margin >= -5) return 'possible';
        if (margin >= -15) return 'unlikely';
        return 'very unlikely';
    }
};
