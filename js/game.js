/* The Last Jump - Game Engine - by FrigOfFury
 *
 * Central game engine managing state, entities, and the main game loop.
 *
 * Main game loop (triggered after actions and at week end):
 *   1. evaluateEvents() - check for triggered events, run highest priority
 *   2. evaluateStorylines() - check each storyline for chapter advancement
 *   3. refreshDisplay() - collect narrative text, available actions, render UI
 *
 * Key concepts:
 *   - Characters and Objects are instances created from templates
 *   - Player is just a character with id stored in state.playerId
 *   - Storylines track current chapter and whether text has been shown
 *   - Actions are collected based on conditions and rendered as buttons
 *   - Flags drive storyline advancement and action availability
 */

const Game = {
    state: null,
    nextId: 1,

    // Controllable randomness for testing - override this to inject deterministic values
    random() {
        return Math.random();
    },

    // Initialize new game
    init() {
        this.nextId = 1;
        this.state = {
            week: 1,
            actionsRemaining: Config.actionsPerPeriod,
            weekStartActions: Config.actionsPerPeriod,  // Track total actions for week progress
            jumpCount: 0,
            playerId: null,
            characters: {},
            objects: {},
            storylines: {},
            pursuits: {},
            completedEvents: [],
            eventSchedule: {},  // Tracks event rolls and trigger times for current week
            flags: {}
        };
        this.state.playerId = this.createCharacter('player', 'You');

        // Initialize pursuits (non-action types get their defaults)
        if (typeof PursuitManager !== 'undefined') {
            PursuitManager.initDefaults(this);
        }

        this.enterStory(Config.initialStory);
        this.evaluateStorylines();
        this.refreshDisplay();
    },

    // === ID Generation ===
    generateId(prefix) {
        return `${prefix}_${this.nextId++}`;
    },

    // === Template Resolution ===
    resolveTemplate(templates, typeName) {
        const template = templates[typeName];
        if (!template) return null;
        if (!template.extends) return { ...template };
        const parent = this.resolveTemplate(templates, template.extends);
        return this.mergeTemplates(parent, template);
    },

    mergeTemplates(parent, child) {
        return {
            ...parent,
            ...child,
            stats: { ...parent?.stats, ...child?.stats },
            state: { ...parent?.state, ...child?.state },
            traits: [...(parent?.traits || []), ...(child?.traits || [])]
        };
    },

    // === Character Management ===
    createCharacter(templateType, name) {
        const template = this.resolveTemplate(CharacterTemplates, templateType);
        const stats = {};
        for (const [key, def] of Object.entries(StatDefinitions)) {
            stats[key] = template?.stats?.[key] ?? def.default;
        }
        const id = this.generateId('char');
        this.state.characters[id] = {
            id,
            templateType,
            name,
            stats,
            skills: { general: {}, specific: {} },
            deepSkills: [],
            gender: template?.gender || null,
            inventory: [],
            flags: {}
        };
        return id;
    },

    setCharacterGender(charId, gender) {
        const char = this.getCharacter(charId);
        if (char && Genders.includes(gender)) {
            char.gender = gender;
        }
    },

    getCharacter(id) {
        return this.state.characters[id];
    },

    getPlayer() {
        return this.getCharacter(this.state.playerId);
    },

    transformCharacter(charId, newTemplateType) {
        const char = this.getCharacter(charId);
        const template = this.resolveTemplate(CharacterTemplates, newTemplateType);
        char.templateType = newTemplateType;
        for (const [key, def] of Object.entries(StatDefinitions)) {
            if (template?.stats?.[key] !== undefined && char.stats[key] === undefined) {
                char.stats[key] = template.stats[key];
            }
        }
        if (template?.traits) {
            char.traits = [...new Set([...(char.traits || []), ...template.traits])];
        }
    },

    // === Object Management ===
    createObject(templateType, name, initialState = {}) {
        const template = this.resolveTemplate(ObjectTemplates, templateType);
        const id = this.generateId('obj');
        this.state.objects[id] = {
            id,
            templateType,
            name,
            state: { ...template?.state, ...initialState },
            ownerId: null
        };
        return id;
    },

    getObject(id) {
        return this.state.objects[id];
    },

    giveObject(objectId, charId) {
        const obj = this.getObject(objectId);
        const char = this.getCharacter(charId);
        if (obj && char) {
            // Remove from previous owner
            if (obj.ownerId) {
                this.removeObject(objectId, obj.ownerId);
            }
            obj.ownerId = charId;
            if (!char.inventory.includes(objectId)) {
                char.inventory.push(objectId);
            }
        }
    },

    removeObject(objectId, charId) {
        const char = this.getCharacter(charId);
        if (!char) return;
        const idx = char.inventory.indexOf(objectId);
        if (idx !== -1) char.inventory.splice(idx, 1);
        const obj = this.getObject(objectId);
        if (obj && obj.ownerId === charId) obj.ownerId = null;
    },

    getCharacterObjects(charId) {
        const char = this.getCharacter(charId);
        if (!char) return [];
        return char.inventory.map(id => this.getObject(id)).filter(Boolean);
    },

    getCharacterObjectsOfType(charId, templateType) {
        return this.getCharacterObjects(charId)
            .filter(obj => obj.templateType === templateType);
    },

    getCharacterObjectOfType(charId, templateType) {
        return this.getCharacterObjectsOfType(charId, templateType)[0] || null;
    },

    // === Stats ===
    getStat(charId, statName) {
        const char = this.getCharacter(charId);
        return char?.stats?.[statName] ?? 0;
    },

    modifyStat(charId, statName, delta) {
        const char = this.getCharacter(charId);
        if (!char) return;
        const def = StatDefinitions[statName];
        let value = (char.stats[statName] ?? 0) + delta;
        if (def?.min != null) value = Math.max(def.min, value);
        if (def?.max != null) value = Math.min(def.max, value);
        char.stats[statName] = value;
    },

    setStat(charId, statName, value) {
        const char = this.getCharacter(charId);
        if (!char) return;
        const def = StatDefinitions[statName];
        if (def?.min != null) value = Math.max(def.min, value);
        if (def?.max != null) value = Math.min(def.max, value);
        char.stats[statName] = value;
    },

    // === Skills ===
    getSkill(charId, skillName) {
        const char = this.getCharacter(charId);
        if (!char) return 0;
        const def = typeof SkillDefinitions !== 'undefined' ? SkillDefinitions[skillName] : null;
        if (!def) return 0;

        if (def.type === 'general') {
            return char.skills?.general?.[skillName] ?? 0;
        } else {
            // Specific skill: add to parent general
            const specific = char.skills?.specific?.[skillName] ?? 0;
            const general = char.skills?.general?.[def.parent] ?? 0;
            return general + specific;
        }
    },

    modifySkill(charId, skillName, delta) {
        const char = this.getCharacter(charId);
        const def = typeof SkillDefinitions !== 'undefined' ? SkillDefinitions[skillName] : null;
        if (!char || !def) return;

        const bucket = def.type === 'general' ? 'general' : 'specific';
        if (!char.skills) char.skills = { general: {}, specific: {} };
        if (!char.skills[bucket]) char.skills[bucket] = {};

        char.skills[bucket][skillName] = (char.skills[bucket][skillName] ?? 0) + delta;
    },

    setSkill(charId, skillName, value) {
        const char = this.getCharacter(charId);
        const def = typeof SkillDefinitions !== 'undefined' ? SkillDefinitions[skillName] : null;
        if (!char || !def) return;

        const bucket = def.type === 'general' ? 'general' : 'specific';
        if (!char.skills) char.skills = { general: {}, specific: {} };
        if (!char.skills[bucket]) char.skills[bucket] = {};

        char.skills[bucket][skillName] = value;
    },

    hasDeepSkill(charId, skillName) {
        const char = this.getCharacter(charId);
        return char?.deepSkills?.includes(skillName) ?? false;
    },

    addDeepSkill(charId, skillName) {
        const char = this.getCharacter(charId);
        if (!char) return;
        if (!char.deepSkills) char.deepSkills = [];
        if (!char.deepSkills.includes(skillName)) {
            char.deepSkills.push(skillName);
        }
    },

    // === Flags ===
    setFlag(flag, value = true) {
        this.state.flags[flag] = value;
    },

    hasFlag(flag) {
        return !!this.state.flags[flag];
    },

    setCharacterFlag(charId, flag, value = true) {
        const char = this.getCharacter(charId);
        if (char) char.flags[flag] = value;
    },

    hasCharacterFlag(charId, flag) {
        const char = this.getCharacter(charId);
        return char ? !!char.flags[flag] : false;
    },

    // === Time ===
    endWeek() {
        // Check exit conditions for action-gated pursuits
        if (typeof PursuitManager !== 'undefined') {
            PursuitManager.checkExitConditions(this);
        }

        this.state.week++;

        // Save checkpoint: before pursuit management for the new week
        this.save('autosave');

        // Flow: save prompt -> pursuit UI -> start week
        // Each step calls the next via callback when user dismisses modal
        const showPursuitsThenStart = () => {
            if (typeof PursuitManager !== 'undefined') {
                PursuitManager.showPursuitUI(this, () => this.startWeek());
            } else {
                this.startWeek();
            }
        };

        if (typeof SaveManager !== 'undefined') {
            // Show save prompt, then continue to pursuits when dismissed
            SaveManager.showWeekEndSavePrompt(this, showPursuitsThenStart);
        } else {
            showPursuitsThenStart();
        }
    },

    startWeek() {
        // Calculate actions based on pursuit load
        if (typeof PursuitManager !== 'undefined') {
            const actions = PursuitManager.calculateEffectiveActions(this);
            this.state.actionsRemaining = actions.guaranteed;

            // Roll for bonus action
            if (actions.bonusChance > 0 && this.random() < actions.bonusChance) {
                this.state.actionsRemaining++;
            }

            // Process weekly effects from pursuits
            PursuitManager.processWeeklyEffects(this);
        } else {
            this.state.actionsRemaining = Config.actionsPerPeriod;
        }

        // Reset event schedule for new week and record total actions
        this.state.eventSchedule = {};
        this.state.weekStartActions = this.state.actionsRemaining;

        this.evaluateEvents();
        this.evaluateStorylines();
        this.refreshDisplay();
    },

    // Calculate progress through the week (0 = start, 1 = end)
    getWeekProgress() {
        const used = this.state.weekStartActions - this.state.actionsRemaining;
        // +1 in denominator accounts for the week-end evaluation point
        return used / (this.state.weekStartActions + 1);
    },

    // Roll probabilistic events and schedule trigger points
    // Events rolled in [0,1]; if trigger point < current progress, they miss this week
    scheduleNewEvents() {
        const progress = this.getWeekProgress();

        for (const [id, event] of Object.entries(Events)) {
            // Skip if already scheduled, completed, or not eligible
            if (this.state.eventSchedule[id] !== undefined) continue;
            if (this.state.completedEvents.includes(id)) continue;
            if (!ConditionChecker.check(event.conditions, this)) continue;

            // Probability 1 (or undefined) means always eligible, no scheduling needed
            if (!event.probability || event.probability >= 1) continue;

            // Roll the probability
            if (this.random() > event.probability) {
                // Failed roll - mark as checked so we don't re-roll
                this.state.eventSchedule[id] = { passed: false };
            } else {
                // Passed roll - assign random trigger point in [0, 1]
                const triggerAt = this.random();
                // If triggerAt < progress, event misses this week (pro-rated probability)
                const missed = triggerAt < progress;
                this.state.eventSchedule[id] = { passed: true, triggerAt, triggered: false, missed };
            }
        }
    },

    useAction(cost = 1) {
        this.state.actionsRemaining -= cost;
        this.evaluateEvents();
        this.evaluateStorylines();
        this.refreshDisplay();
    },

    // === Events ===
    evaluateEvents() {
        // Schedule any newly eligible probabilistic events
        this.scheduleNewEvents();

        const progress = this.getWeekProgress();
        const eligible = [];

        for (const [id, event] of Object.entries(Events)) {
            if (this.state.completedEvents.includes(id)) continue;
            if (!ConditionChecker.check(event.conditions, this)) continue;

            // Check probabilistic events against schedule
            if (event.probability && event.probability < 1) {
                const schedule = this.state.eventSchedule[id];
                // Must have passed roll, not missed, reached trigger time, and not yet triggered
                if (!schedule || !schedule.passed) continue;
                if (schedule.missed) continue;
                if (schedule.triggerAt > progress) continue;
                if (schedule.triggered) continue;
            }

            eligible.push({ id, event });
        }

        if (eligible.length === 0) return;

        eligible.sort((a, b) => (b.event.priority || 0) - (a.event.priority || 0));
        const winner = eligible[0];

        // Mark scheduled event as triggered
        if (this.state.eventSchedule[winner.id]) {
            this.state.eventSchedule[winner.id].triggered = true;
        }

        // Handle superseded events
        for (let i = 1; i < eligible.length; i++) {
            const { id, event } = eligible[i];
            if (event.onSuperseded === 'remove') {
                this.state.completedEvents.push(id);
            }
            // 'reschedule' means do nothing - event stays eligible for next check
        }

        // Execute the winning event
        let result;
        if (winner.event.handler && Handlers[winner.event.handler]) {
            result = Handlers[winner.event.handler](this, winner.event, {});
        } else if (winner.event.effects) {
            const text = EffectExecutor.execute(winner.event.effects, this);
            result = {
                text: winner.event.text || text || '',
                choices: [{ text: 'Continue', action: 'dismiss' }]
            };
        } else {
            result = { text: winner.event.text || '', choices: [{ text: 'Continue', action: 'dismiss' }] };
        }

        if (result) this.showEventResult(result);
    },

    showEventResult(result) {
        this.renderStory(result.text);
        this.renderChoices(result.choices);
    },

    // === Stories ===
    // Storylines are narrative arcs that can be active simultaneously.
    // Each tracks its current chapter and whether its text has been shown.
    // Chapters auto-advance when their advanceWhen conditions are met.
    // Text display is controlled by showText: 'onEnter' (once) or 'always'.

    enterStory(storyId) {
        const story = Stories[storyId];
        if (!story) return;
        const initialChapter = story.initialChapter || Object.keys(story.chapters)[0];
        this.state.storylines[storyId] = {
            currentChapter: initialChapter,
            enteredChapter: true  // Flag that we just entered this chapter
        };
    },

    advanceChapter(storyId, chapterId) {
        if (!this.state.storylines[storyId]) return;
        this.state.storylines[storyId].currentChapter = chapterId;
        this.state.storylines[storyId].enteredChapter = true;
    },

    evaluateStorylines() {
        // Check each storyline for chapter advancement or failure
        for (const [storyId, storylineState] of Object.entries(this.state.storylines)) {
            const story = Stories[storyId];
            if (!story) continue;

            const chapter = story.chapters[storylineState.currentChapter];
            if (!chapter) continue;

            // Check for failure first (failure takes precedence if both match)
            if (chapter.failWhen && chapter.failTo) {
                if (ConditionChecker.check(chapter.failWhen, this)) {
                    this.advanceChapter(storyId, chapter.failTo);
                    continue; // Don't also check advanceWhen
                }
            }

            // Check if chapter should advance (success path)
            if (chapter.advanceWhen && chapter.advanceTo) {
                if (ConditionChecker.check(chapter.advanceWhen, this)) {
                    this.advanceChapter(storyId, chapter.advanceTo);
                }
            }
        }

        // After all advancement, check for completed objectives
        this.checkObjectiveCompletions();
    },

    // Check for objectives that have reached terminal states
    checkObjectiveCompletions() {
        for (const [storyId, storylineState] of Object.entries(this.state.storylines)) {
            // Skip already completed objectives
            if (storylineState.completed) continue;

            const story = Stories[storyId];
            if (!story) continue;

            const chapter = story.chapters[storylineState.currentChapter];
            if (!chapter || !chapter.objectiveResult) continue;

            // Mark as completed
            storylineState.completed = true;
            storylineState.result = chapter.objectiveResult;

            const isSuccess = chapter.objectiveResult === 'success';

            // Execute handler if present
            if (isSuccess && chapter.successHandler && Handlers[chapter.successHandler]) {
                Handlers[chapter.successHandler](this, { story, chapter, storyId }, {});
            } else if (!isSuccess && chapter.failureHandler && Handlers[chapter.failureHandler]) {
                Handlers[chapter.failureHandler](this, { story, chapter, storyId }, {});
            }

            // Execute effects
            const effects = isSuccess ? chapter.successEffects : chapter.failureEffects;
            if (effects) {
                const text = EffectExecutor.execute(effects, this);
                if (text) this.renderStory(text);
            }
        }
    },

    collectNarrativeText() {
        const texts = [];

        for (const [storyId, storylineState] of Object.entries(this.state.storylines)) {
            const story = Stories[storyId];
            if (!story) continue;

            const chapter = story.chapters[storylineState.currentChapter];
            if (!chapter || !chapter.text) continue;

            // Show text if: just entered chapter (onEnter), or always
            if (storylineState.enteredChapter && chapter.showText === 'onEnter') {
                texts.push(chapter.text);
            } else if (chapter.showText === 'always') {
                texts.push(chapter.text);
            }
        }

        // Clear enteredChapter flags after collecting text
        for (const storyId of Object.keys(this.state.storylines)) {
            this.state.storylines[storyId].enteredChapter = false;
        }

        return texts;
    },

    // === Actions ===
    // Actions are things the player can do, defined in data/actions.js.
    // They're collected based on conditions (storyline state, flags, etc.)
    // and rendered as buttons. Actions set flags/stats; storylines react.

    collectAvailableActions() {
        const available = [];
        for (const [id, action] of Object.entries(Actions)) {
            if (ConditionChecker.check(action.conditions, this)) {
                available.push(action);
            }
        }
        return available;
    },

    executeAction(action) {
        if (action.actionCost) {
            this.state.actionsRemaining -= action.actionCost;
        }

        // Continuation: resumes game loop after action completes
        const continueGameLoop = () => {
            this.evaluateEvents();
            this.evaluateStorylines();
            this.refreshDisplay();
        };

        // Run handler if present
        // Handlers can return { async: true, skipEffects: true }
        // Async handlers must call onComplete() when done to resume the game loop
        let handlerResult = null;
        if (action.handler && Handlers[action.handler]) {
            handlerResult = Handlers[action.handler](this, action, { onComplete: continueGameLoop });
        }

        // Process declarative effects unless handler said to skip
        if (action.effects && !handlerResult?.skipEffects) {
            const text = EffectExecutor.execute(action.effects, this);
            if (text) {
                this.renderStory(text);
            }
        }

        // If handler is async (interactive sequence), it will call onComplete when done
        // Otherwise, continue the game loop now
        if (!handlerResult?.async) {
            continueGameLoop();
        }
    },

    refreshDisplay() {
        // Always update narrative area (clears stale text when nothing to show)
        const narrativeTexts = this.collectNarrativeText();
        this.renderStory(narrativeTexts.join('\n\n'));

        const actions = this.collectAvailableActions();
        this.renderActions(actions);

        this.updateUI();
    },

    // === Save/Load ===
    getSaveKey(slot) {
        return slot === 'autosave' ? Config.autoSaveKey : Config.saveKeyPrefix + slot;
    },

    save(slot) {
        const key = this.getSaveKey(slot);
        const data = {
            state: this.state,
            nextId: this.nextId,
            meta: {
                savedAt: Date.now(),
                week: this.state.week,
                characterName: this.getPlayer()?.name || 'Unknown'
            }
        };
        localStorage.setItem(key, JSON.stringify(data));
    },

    load(slot) {
        const key = this.getSaveKey(slot);
        const data = localStorage.getItem(key);
        if (data) {
            const parsed = JSON.parse(data);
            this.state = parsed.state;
            this.nextId = parsed.nextId;
            this.updateUI();
            return true;
        }
        return false;
    },

    // Resume game after loading - shows pursuit UI since saves happen before it
    // TODO: First week has no pursuit UI yet; default pursuits should be set during character creation
    resumeFromLoad() {
        if (typeof PursuitManager !== 'undefined') {
            PursuitManager.showPursuitUI(this, () => this.startWeek());
        } else {
            this.startWeek();
        }
    },

    getSaveSlotInfo(slot) {
        const key = this.getSaveKey(slot);
        const data = localStorage.getItem(key);
        if (!data) {
            return { exists: false, slot };
        }
        const parsed = JSON.parse(data);
        return {
            exists: true,
            slot,
            meta: parsed.meta || { week: parsed.state?.week || 1 }
        };
    },

    getAllSaveSlots() {
        const slots = [];
        // Add autosave first
        slots.push(this.getSaveSlotInfo('autosave'));
        // Add numbered slots
        for (let i = 0; i < Config.saveSlotCount; i++) {
            slots.push(this.getSaveSlotInfo(i));
        }
        return slots;
    },

    hasSave() {
        return this.getAllSaveSlots().some(s => s.exists);
    },

    deleteSave(slot) {
        const key = this.getSaveKey(slot);
        localStorage.removeItem(key);
    },

    // === UI ===
    renderStory(text) {
        const el = document.getElementById('story-text');
        el.innerHTML = text.split('\n\n').map(p => `<p>${p}</p>`).join('');
    },

    renderChoices(choices) {
        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        for (const choice of choices) {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            if (choice.actionCost) {
                btn.textContent += ` [${choice.actionCost} action${choice.actionCost > 1 ? 's' : ''}]`;
                btn.disabled = this.state.actionsRemaining < choice.actionCost;
            }
            btn.addEventListener('click', () => this.handleChoice(choice));
            container.appendChild(btn);
        }

        if (this.state.actionsRemaining === 0) {
            const endBtn = document.createElement('button');
            endBtn.className = 'choice-btn';
            endBtn.textContent = `End ${Config.timeUnit}`;
            endBtn.addEventListener('click', () => this.endWeek());
            container.appendChild(endBtn);
        }
    },

    renderActions(actions) {
        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        for (const action of actions) {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = action.text;
            if (action.actionCost) {
                btn.textContent += ` [${action.actionCost} action${action.actionCost > 1 ? 's' : ''}]`;
                btn.disabled = this.state.actionsRemaining < action.actionCost;
            }
            btn.addEventListener('click', () => this.executeAction(action));
            container.appendChild(btn);
        }

        if (this.state.actionsRemaining === 0) {
            const endBtn = document.createElement('button');
            endBtn.className = 'choice-btn';
            endBtn.textContent = `End ${Config.timeUnit}`;
            endBtn.addEventListener('click', () => this.endWeek());
            container.appendChild(endBtn);
        }
    },

    handleChoice(choice) {
        if (choice.actionCost) this.useAction(choice.actionCost);
        if (choice.effects) choice.effects(this);

        if (choice.action === 'startCreation') {
            const choiceSet = CreationChoiceSets[choice.creationChoices] || [];
            const nextChapter = choice.next;
            CharacterCreation.start(this.state.playerId, choiceSet, {
                onComplete: () => {
                    if (nextChapter) {
                        const storyId = Object.keys(this.state.storylines)[0];
                        if (storyId) this.loadChapter(storyId, nextChapter);
                    }
                    this.updateUI();
                }
            });
        } else if (choice.action === 'createNpcAcquaintance') {
            // Create NPC and run creation flow
            const npcId = this.createCharacter('human', 'Acquaintance');
            const choiceSet = CreationChoiceSets[choice.creationChoices] || [];
            const nextChapter = choice.next;
            CharacterCreation.start(npcId, choiceSet, {
                createAcquaintanceFor: this.state.playerId,
                reverseAcquaintance: choice.reverseAcquaintance || false,
                onComplete: () => {
                    if (nextChapter) {
                        const storyId = Object.keys(this.state.storylines)[0];
                        if (storyId) this.loadChapter(storyId, nextChapter);
                    }
                    this.updateUI();
                }
            });
        } else if (choice.action === 'dismiss') {
            const storyId = Object.keys(this.state.storylines)[0];
            if (storyId) {
                this.loadChapter(storyId, this.state.storylines[storyId].currentChapter);
            }
        } else if (choice.next) {
            const storyId = Object.keys(this.state.storylines)[0];
            if (storyId) this.loadChapter(storyId, choice.next);
        }
        this.updateUI();
    },

    updateUI() {
        const pid = this.state.playerId;
        document.getElementById('time-display').textContent =
            `${this.capitalize(Config.timeUnit)} ${this.state.week}`;
        document.getElementById('actions-display').textContent =
            `Actions: ${this.state.actionsRemaining}/${Config.actionsPerPeriod}`;

        const statsList = document.getElementById('stats-list');
        statsList.innerHTML = DisplayedStats
            .map(key => {
                const def = StatDefinitions[key];
                const val = this.getStat(pid, key);
                return `<li><span>${def?.displayName || key}</span><span>${val}</span></li>`;
            })
            .join('');
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};
