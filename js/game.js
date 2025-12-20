/* The Last Jump - Game Engine - by FrigOfFury */

const Game = {
    state: null,
    nextId: 1,

    // Initialize new game
    init() {
        this.state = {
            week: 1,
            actionsRemaining: Config.actionsPerPeriod,
            playerId: null,
            characters: {},
            objects: {},
            storylines: {},
            completedEvents: [],
            flags: {}
        };
        this.state.playerId = this.createCharacter('player', 'You');
        this.enterStory(Config.initialStory, Config.initialChapter);
        this.updateUI();
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
            inventory: [],
            flags: {}
        };
        return id;
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
        this.state.week++;
        this.state.actionsRemaining = Config.actionsPerPeriod;
        this.evaluateEvents();
        this.updateUI();
    },

    useAction(cost = 1) {
        this.state.actionsRemaining -= cost;
        this.evaluateEvents();
        this.updateUI();
    },

    // === Events ===
    evaluateEvents() {
        const eligible = [];
        for (const [id, event] of Object.entries(Events)) {
            if (this.state.completedEvents.includes(id)) continue;
            if (!this.checkEventConditions(event.conditions)) continue;
            if (event.probability < 1 && Math.random() > event.probability) continue;
            eligible.push({ id, event });
        }
        if (eligible.length === 0) return;

        eligible.sort((a, b) => (b.event.priority || 0) - (a.event.priority || 0));
        const winner = eligible[0];

        // Handle superseded events
        for (let i = 1; i < eligible.length; i++) {
            const { id, event } = eligible[i];
            if (typeof event.onSuperseded === 'function') {
                event.onSuperseded(this);
            }
            if (event.onSuperseded === 'remove') {
                this.state.completedEvents.push(id);
            }
        }

        const result = winner.event.onTrigger(this);
        this.showEventResult(result);
    },

    checkEventConditions(conditions) {
        if (!conditions) return true;
        const pid = this.state.playerId;
        if (conditions.weekDivisibleBy && this.state.week % conditions.weekDivisibleBy !== 0) {
            return false;
        }
        if (conditions.minWeek && this.state.week < conditions.minWeek) return false;
        if (conditions.maxWeek && this.state.week > conditions.maxWeek) return false;
        if (conditions.flags) {
            for (const flag of conditions.flags) {
                if (!this.hasFlag(flag)) return false;
            }
        }
        if (conditions.playerHasObjectOfType) {
            if (!this.getCharacterObjectOfType(pid, conditions.playerHasObjectOfType)) return false;
        }
        return true;
    },

    showEventResult(result) {
        this.renderStory(result.text);
        this.renderChoices(result.choices);
    },

    // === Stories ===
    enterStory(storyId, chapterId) {
        this.state.storylines[storyId] = { currentChapter: chapterId };
        this.loadChapter(storyId, chapterId);
    },

    loadChapter(storyId, chapterId) {
        const story = Stories[storyId];
        const chapter = story?.chapters?.[chapterId];
        if (!chapter) return;
        this.state.storylines[storyId].currentChapter = chapterId;
        this.renderStory(chapter.text);
        this.renderChoices(chapter.choices);
    },

    // === Save/Load ===
    save() {
        const data = JSON.stringify({ state: this.state, nextId: this.nextId });
        localStorage.setItem(Config.saveKey, data);
    },

    load() {
        const data = localStorage.getItem(Config.saveKey);
        if (data) {
            const parsed = JSON.parse(data);
            this.state = parsed.state;
            this.nextId = parsed.nextId;
            this.updateUI();
            return true;
        }
        return false;
    },

    hasSave() {
        return !!localStorage.getItem(Config.saveKey);
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

    handleChoice(choice) {
        if (choice.actionCost) this.useAction(choice.actionCost);
        if (choice.effects) choice.effects(this);
        if (choice.action === 'dismiss') {
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
