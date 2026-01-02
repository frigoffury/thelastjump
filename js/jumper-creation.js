/* The Last Jump - Jumper Creation - by FrigOfFury
 *
 * Multi-step flow for defining the Jumper's persistent identity.
 * This happens before character creation and defines attributes
 * that persist across all universe iterations.
 *
 * Flow:
 *   1. Core gender selection
 *   2. Attraction preferences (multi-select)
 *   3. Aspiration selection
 *   4. First strategy selection
 *   5. First strategy skills (pick 2)
 *   6. Second strategy selection (can repeat)
 *   7. Second strategy skills (pick 2)
 *   8. Personal interest skill (from remaining)
 *   9. Apply and finish
 *
 * Unlike CharacterCreation which modifies a character, this
 * creates the game-scoped jumperIdentity in Game.state.
 */

const JumperCreation = {
    // Current step in the flow
    currentStep: 0,

    // Accumulated identity during creation
    pendingIdentity: null,

    // Skills already selected (to exclude from later picks)
    selectedSkills: [],

    // Multi-select state for current step
    multiSelectState: [],

    // Callback when complete
    onComplete: null,

    // Points spent in current multi-select step
    pointsSpent: 0,

    // Step definitions
    steps: [
        { id: 'gender', type: 'single', title: 'Who Are You?' },
        { id: 'attraction', type: 'multi', title: 'Who Do You Love?', min: 1, max: 3 },
        { id: 'aspiration', type: 'single', title: 'What Do You Hope For?' },
        { id: 'strategy1', type: 'single', title: 'Your First Well-Trod Path' },
        { id: 'skills1', type: 'points', title: 'Skills From Your Path' },
        { id: 'strategy2', type: 'single', title: 'Your Second Well-Trod Path' },
        { id: 'skills2', type: 'points', title: 'More Skills From Your Path' },
        { id: 'personal', type: 'points', title: 'A Personal Interest' }
    ],

    // Get the cost of a skill
    getSkillCost(skillId) {
        const skillDef = typeof SkillDefinitions !== 'undefined' ? SkillDefinitions[skillId] : null;
        const isSpecific = skillDef?.type === 'specific';
        return isSpecific ? JumperCreationConfig.skillCosts.specific : JumperCreationConfig.skillCosts.general;
    },

    // Start the creation flow
    start(options = {}) {
        this.currentStep = 0;
        this.onComplete = options.onComplete || null;
        this.selectedSkills = [];
        this.multiSelectState = [];
        this.pointsSpent = 0;
        this.pendingIdentity = {
            coreGender: null,
            attractedTo: [],
            aspirations: [],
            strategies: [],
            deepSkills: []
        };

        this.presentStep();
    },

    // Present the current step
    presentStep() {
        if (this.currentStep >= this.steps.length) {
            this.applyAndFinish();
            return;
        }

        const step = this.steps[this.currentStep];
        this.multiSelectState = [];
        this.pointsSpent = 0;

        switch (step.id) {
            case 'gender':
                this.renderGenderStep();
                break;
            case 'attraction':
                this.renderAttractionStep();
                break;
            case 'aspiration':
                this.renderAspirationStep();
                break;
            case 'strategy1':
            case 'strategy2':
                this.renderStrategyStep();
                break;
            case 'skills1':
            case 'skills2':
                this.renderSkillsStep();
                break;
            case 'personal':
                this.renderPersonalStep();
                break;
        }
    },

    // Render gender selection
    renderGenderStep() {
        Game.renderStory('Across countless iterations, through every identity you\'ve worn, who are you at your core?');

        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        for (const [id, option] of Object.entries(JumperGenderOptions)) {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = option.title;
            btn.addEventListener('click', () => this.selectGender(id));
            container.appendChild(btn);
        }
    },

    selectGender(genderId) {
        this.pendingIdentity.coreGender = genderId;
        this.currentStep++;
        this.presentStep();
    },

    // Render attraction multi-select
    renderAttractionStep() {
        Game.renderStory('Who captures your heart? Select all that apply.');

        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        for (const [id, option] of Object.entries(JumperAttractionOptions)) {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = option.title;
            btn.dataset.optionId = id;
            btn.addEventListener('click', () => this.toggleMultiSelect(btn, id));
            container.appendChild(btn);
        }

        // Add continue button
        this.addContinueButton(container, 1, 3);
    },

    // Render aspiration selection
    renderAspirationStep() {
        Game.renderStory('If you ever do avert The End for good... what do you hope for?');

        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        for (const [id, aspiration] of Object.entries(JumperAspirations)) {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = `<strong>${aspiration.title}</strong><br><small>${aspiration.description}</small>`;
            btn.addEventListener('click', () => this.selectAspiration(id));
            container.appendChild(btn);
        }
    },

    selectAspiration(aspirationId) {
        this.pendingIdentity.aspirations = [aspirationId];
        this.currentStep++;
        this.presentStep();
    },

    // Render strategy selection
    renderStrategyStep() {
        const isSecond = this.currentStep === 5; // strategy2 step
        const text = isSecond
            ? 'And what other approach have you refined over the iterations? You may double down on the same path.'
            : 'Over countless iterations, you\'ve developed expertise. What approach have you focused on?';

        Game.renderStory(text);

        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        for (const [id, strategy] of Object.entries(JumperStrategies)) {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = `<strong>${strategy.title}</strong><br><small>${strategy.description}</small>`;
            btn.addEventListener('click', () => this.selectStrategy(id));
            container.appendChild(btn);
        }
    },

    selectStrategy(strategyId) {
        this.pendingIdentity.strategies.push(strategyId);
        this.currentStep++;
        this.presentStep();
    },

    // Render skills selection for a strategy
    renderSkillsStep() {
        const strategyIndex = this.currentStep === 4 ? 0 : 1; // skills1 = strategy[0], skills2 = strategy[1]
        const strategyId = this.pendingIdentity.strategies[strategyIndex];
        const strategy = JumperStrategies[strategyId];
        const budget = JumperCreationConfig.pointsPerStrategy;

        // Get available skills (from strategy, not already selected)
        const availableSkills = strategy.skills.filter(s => !this.selectedSkills.includes(s));

        if (availableSkills.length === 0) {
            this.currentStep++;
            this.presentStep();
            return;
        }

        Game.renderStory(`From your time as ${strategy.title}, which skills became second nature? You have ${budget} points to spend.`);

        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        for (const skillId of availableSkills) {
            const cost = this.getSkillCost(skillId);
            const skillDef = typeof SkillDefinitions !== 'undefined' ? SkillDefinitions[skillId] : null;
            const title = skillDef?.title || skillId;

            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = `${title} (${cost} pt${cost > 1 ? 's' : ''})`;
            btn.dataset.optionId = skillId;
            btn.dataset.cost = cost;
            btn.addEventListener('click', () => this.toggleSkillSelect(btn, skillId, cost, budget));
            container.appendChild(btn);
        }

        // Add points display and continue button
        this.addPointsContinueButton(container, budget);
    },

    // Render personal interest selection
    renderPersonalStep() {
        const budget = JumperCreationConfig.personalInterestPoints;

        // Get all skills not yet selected
        const allSkills = this.getAllSkillIds();
        const availableSkills = allSkills.filter(s => !this.selectedSkills.includes(s));

        // Filter to only skills we can afford
        const affordableSkills = availableSkills.filter(s => this.getSkillCost(s) <= budget);

        if (affordableSkills.length === 0) {
            // No affordable skills left for personal interest
            this.currentStep++;
            this.presentStep();
            return;
        }

        Game.renderStory(`Beyond your practiced approaches, what personal interest have you cultivated? You have ${budget} point${budget > 1 ? 's' : ''} to spend.`);

        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        for (const skillId of affordableSkills) {
            const cost = this.getSkillCost(skillId);
            const skillDef = typeof SkillDefinitions !== 'undefined' ? SkillDefinitions[skillId] : null;
            const title = skillDef?.title || skillId;

            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = `${title} (${cost} pt${cost > 1 ? 's' : ''})`;
            btn.dataset.optionId = skillId;
            btn.dataset.cost = cost;
            btn.addEventListener('click', () => this.toggleSkillSelect(btn, skillId, cost, budget));
            container.appendChild(btn);
        }

        // Add points display and continue button
        this.addPointsContinueButton(container, budget);
    },

    // Get all skill IDs from all strategies (union)
    getAllSkillIds() {
        const allSkills = new Set();
        for (const strategy of Object.values(JumperStrategies)) {
            for (const skill of strategy.skills) {
                allSkills.add(skill);
            }
        }
        return Array.from(allSkills);
    },

    // Toggle a multi-select option (for non-skill selections like attractions)
    toggleMultiSelect(btn, optionId) {
        const index = this.multiSelectState.indexOf(optionId);
        if (index >= 0) {
            this.multiSelectState.splice(index, 1);
            btn.classList.remove('selected');
        } else {
            this.multiSelectState.push(optionId);
            btn.classList.add('selected');
        }

        // Update continue button state
        this.updateContinueButton();
    },

    // Toggle a skill selection with point costs
    toggleSkillSelect(btn, skillId, cost, budget) {
        const index = this.multiSelectState.indexOf(skillId);
        if (index >= 0) {
            // Deselect
            this.multiSelectState.splice(index, 1);
            this.pointsSpent -= cost;
            btn.classList.remove('selected');
        } else {
            // Only select if we can afford it
            if (this.pointsSpent + cost <= budget) {
                this.multiSelectState.push(skillId);
                this.pointsSpent += cost;
                btn.classList.add('selected');
            }
        }

        // Update button states (disable unaffordable)
        this.updateSkillButtons(budget);
        this.updatePointsContinueButton(budget);
    },

    // Update skill buttons to disable unaffordable ones
    updateSkillButtons(budget) {
        const buttons = document.querySelectorAll('.choice-btn[data-cost]');
        const remaining = budget - this.pointsSpent;

        for (const btn of buttons) {
            const cost = parseInt(btn.dataset.cost);
            const isSelected = btn.classList.contains('selected');
            // Disable if can't afford and not already selected
            btn.disabled = !isSelected && cost > remaining;
        }
    },

    // Add continue button for multi-select steps
    addContinueButton(container, min, max) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn continue-btn';
        btn.textContent = 'Continue';
        btn.disabled = true;
        btn.dataset.min = min;
        btn.dataset.max = max;
        btn.addEventListener('click', () => this.confirmMultiSelect());
        container.appendChild(btn);
    },

    // Add continue button for points-based selection
    addPointsContinueButton(container, budget) {
        const display = document.createElement('div');
        display.className = 'points-display';
        display.style.cssText = 'color: #aaa; font-size: 0.9rem; margin: 0.5rem 0;';
        display.textContent = `Points: 0/${budget} spent`;
        container.appendChild(display);

        const btn = document.createElement('button');
        btn.className = 'choice-btn continue-btn';
        btn.textContent = 'Continue';
        btn.disabled = true;
        btn.dataset.budget = budget;
        btn.addEventListener('click', () => this.confirmMultiSelect());
        container.appendChild(btn);
    },

    // Update continue button and display for points-based selection
    updatePointsContinueButton(budget) {
        const display = document.querySelector('.points-display');
        const btn = document.querySelector('.continue-btn');
        if (!btn) return;

        if (display) {
            display.textContent = `Points: ${this.pointsSpent}/${budget} spent`;
        }

        // Enable continue if at least 1 skill selected
        btn.disabled = this.multiSelectState.length === 0;
    },

    // Update continue button enabled state
    updateContinueButton() {
        const btn = document.querySelector('.continue-btn');
        if (!btn) return;

        const min = parseInt(btn.dataset.min);
        const max = parseInt(btn.dataset.max);
        const count = this.multiSelectState.length;

        btn.disabled = count < min || count > max;
    },

    // Confirm multi-select and proceed
    confirmMultiSelect() {
        const step = this.steps[this.currentStep];

        switch (step.id) {
            case 'attraction':
                this.pendingIdentity.attractedTo = [...this.multiSelectState];
                break;
            case 'skills1':
            case 'skills2':
            case 'personal':
                // Add selected skills to tracking array
                for (const skillId of this.multiSelectState) {
                    this.selectedSkills.push(skillId);
                }
                break;
        }

        this.currentStep++;
        this.presentStep();
    },

    // Apply the identity and finish
    applyAndFinish() {
        // Set final deep skills
        this.pendingIdentity.deepSkills = [...this.selectedSkills];

        // Store in game state
        Game.state.jumperIdentity = { ...this.pendingIdentity };

        // Sync deep skills to player character
        if (Game.state.playerId) {
            for (const skill of this.pendingIdentity.deepSkills) {
                Game.addDeepSkill(Game.state.playerId, skill);
            }
        }

        // Call completion callback
        if (this.onComplete) {
            this.onComplete(this.pendingIdentity);
        }

        this.reset();
    },

    // Reset state
    reset() {
        this.currentStep = 0;
        this.pendingIdentity = null;
        this.selectedSkills = [];
        this.multiSelectState = [];
        this.pointsSpent = 0;
        this.onComplete = null;
    }
};
