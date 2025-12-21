/* The Last Jump - Character Creation - by FrigOfFury
 *
 * Reusable flow for creating new characters or modifying existing ones.
 * Used for initial player setup, creating NPCs, and potentially rebuilding
 * characters after major transformations.
 *
 * Flow:
 *   1. start() called with target charId and list of choice IDs
 *   2. Each choice is presented in sequence via presentChoice()
 *   3. Player selections queue impacts in pendingImpacts
 *      Exception: gender is applied immediately so later choice text can use correct pronouns
 *   4. After all choices, applyImpactsAndFinish() resolves impacts with probability
 *   5. If acquaintanceOwnerId set, creates acquaintance object(s) linking characters
 *   6. onComplete callback is called
 *
 * Impact types:
 *   stat: { stat: 'health', delta: 50 } - modify a stat
 *   stat with probability: { stat: 'health', delta: -20, probability: 0.5 }
 *   flag: { flag: 'flagName', flagValue: true }
 *   gender: { gender: 'male' } - applied immediately for pronoun control in choice text
 *   acquaintanceType: { acquaintanceType: 'enemy' } - used when creating acquaintance
 *   giveObject: { giveObject: { template, name, state } }
 *   effect: { effect: (game, char) => {} } - custom function
 */

const CharacterCreation = {
    targetCharId: null,
    acquaintanceOwnerId: null,     // Owner gets acquaintance pointing to target
    createReverseAcquaintance: false, // Target also gets acquaintance pointing to owner
    availableChoices: [],
    currentChoiceIndex: 0,
    pendingImpacts: [],
    onComplete: null,

    // Start creation - modifies an existing character
    // options.createAcquaintanceFor: charId who will own an acquaintance pointing to target
    // options.reverseAcquaintance: if true, target also gets acquaintance pointing to owner
    start(charId, choiceIds, options = {}) {
        this.targetCharId = charId;
        this.acquaintanceOwnerId = options.createAcquaintanceFor || null;
        this.createReverseAcquaintance = options.reverseAcquaintance || false;
        this.onComplete = options.onComplete || null;
        this.pendingImpacts = [];
        this.currentChoiceIndex = 0;

        // Filter to valid, available choices
        this.availableChoices = choiceIds
            .map(id => CreationChoices[id])
            .filter(choice => {
                if (!choice) return false;
                if (choice.condition && !choice.condition(Game)) return false;
                return true;
            });

        if (this.availableChoices.length === 0) {
            this.finish();
            return;
        }

        this.presentChoice();
    },

    presentChoice() {
        if (this.currentChoiceIndex >= this.availableChoices.length) {
            this.applyImpactsAndFinish();
            return;
        }

        const choice = this.availableChoices[this.currentChoiceIndex];
        const char = Game.getCharacter(this.targetCharId);

        // Render question text
        let text = choice.text;
        if (typeof text === 'function') text = text(Game, char);
        Game.renderStory(text);

        // Render options
        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        for (const option of choice.options) {
            if (option.condition && !option.condition(Game, char)) continue;

            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = option.text;
            btn.addEventListener('click', () => this.selectOption(option));
            container.appendChild(btn);
        }
    },

    selectOption(option) {
        if (option.impacts) {
            for (const impact of option.impacts) {
                // Apply gender immediately so later choices can reference it
                if (impact.gender) {
                    Game.setCharacterGender(this.targetCharId, impact.gender);
                } else {
                    this.pendingImpacts.push(impact);
                }
            }
        }
        this.currentChoiceIndex++;
        this.presentChoice();
    },

    applyImpactsAndFinish() {
        const char = Game.getCharacter(this.targetCharId);
        let acquaintanceType = null;

        for (const impact of this.pendingImpacts) {
            // Check probability
            if (impact.probability != null && Game.random() > impact.probability) continue;

            // Stat changes
            if (impact.stat) {
                Game.modifyStat(this.targetCharId, impact.stat, impact.delta ?? 0);
            }

            // Flags
            if (impact.flag) {
                Game.setCharacterFlag(this.targetCharId, impact.flag, impact.flagValue ?? true);
            }

            // Give objects
            if (impact.giveObject) {
                const objId = Game.createObject(
                    impact.giveObject.template,
                    impact.giveObject.name,
                    impact.giveObject.state
                );
                Game.giveObject(objId, this.targetCharId);
            }

            // Acquaintance relationship type (collected for object creation)
            if (impact.acquaintanceType) {
                acquaintanceType = impact.acquaintanceType;
            }

            // Custom effect
            if (impact.effect) {
                impact.effect(Game, char);
            }
        }

        // Create acquaintance objects if configured
        if (this.acquaintanceOwnerId) {
            const ownerChar = Game.getCharacter(this.acquaintanceOwnerId);
            const acqId = Game.createObject('acquaintance', char.name, {
                targetCharId: this.targetCharId,
                relationshipType: acquaintanceType,
                strength: 50
            });
            Game.giveObject(acqId, this.acquaintanceOwnerId);

            // Create reverse acquaintance if requested
            if (this.createReverseAcquaintance) {
                const reverseAcqId = Game.createObject('acquaintance', ownerChar.name, {
                    targetCharId: this.acquaintanceOwnerId,
                    relationshipType: acquaintanceType,  // Same type for now
                    strength: 50
                });
                Game.giveObject(reverseAcqId, this.targetCharId);
            }
        }

        this.finish();
    },

    finish() {
        const char = Game.getCharacter(this.targetCharId);

        if (this.onComplete) {
            this.onComplete(char);
        }

        this.reset();
    },

    reset() {
        this.targetCharId = null;
        this.acquaintanceOwnerId = null;
        this.createReverseAcquaintance = false;
        this.availableChoices = [];
        this.pendingImpacts = [];
        this.currentChoiceIndex = 0;
        this.onComplete = null;
    }
};
