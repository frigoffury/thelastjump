/* The Last Jump - Test Runner - by FrigOfFury
 *
 * Node.js-based integration test runner with DOM mocks.
 * Simulates button clicks and verifies game state changes.
 *
 * Usage: node tests/test-runner.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// === DOM Mocks ===

class MockElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.className = '';
        this.textContent = '';
        this._innerHTML = '';
        this.disabled = false;
        this.children = [];
        this.eventListeners = {};
    }

    get innerHTML() {
        return this._innerHTML;
    }

    set innerHTML(value) {
        this._innerHTML = value;
        this.children = [];
    }

    addEventListener(event, handler) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(handler);
    }

    click() {
        if (this.disabled) return;
        const handlers = this.eventListeners['click'] || [];
        for (const handler of handlers) {
            handler();
        }
    }

    appendChild(child) {
        this.children.push(child);
    }
}

const mockElements = {};

const mockDocument = {
    getElementById(id) {
        if (!mockElements[id]) {
            mockElements[id] = new MockElement('div');
        }
        return mockElements[id];
    },

    createElement(tagName) {
        return new MockElement(tagName);
    }
};

const mockLocalStorage = {
    data: {},
    getItem(key) {
        return this.data[key] || null;
    },
    setItem(key, value) {
        this.data[key] = value;
    },
    removeItem(key) {
        delete this.data[key];
    },
    clear() {
        this.data = {};
    }
};

// === Test Harness ===

class TestHarness {
    constructor() {
        this.randomValues = [];
        this.randomIndex = 0;
        this.testsPassed = 0;
        this.testsFailed = 0;
        this.currentTest = null;
    }

    setRandomSequence(values) {
        this.randomValues = values;
        this.randomIndex = 0;
    }

    nextRandom() {
        if (this.randomIndex < this.randomValues.length) {
            return this.randomValues[this.randomIndex++];
        }
        return Math.random();
    }

    reset() {
        Object.keys(mockElements).forEach(key => delete mockElements[key]);
        mockLocalStorage.clear();
        this.randomIndex = 0;
    }

    findButton(text) {
        const container = mockDocument.getElementById('choices-container');
        for (const child of container.children) {
            if (child.textContent.includes(text)) {
                return child;
            }
        }
        return null;
    }

    clickButton(text) {
        const btn = this.findButton(text);
        if (!btn) {
            throw new Error(`Button not found: "${text}"`);
        }
        if (btn.disabled) {
            throw new Error(`Button is disabled: "${text}"`);
        }
        btn.click();
    }

    getNarrativeText() {
        return mockDocument.getElementById('story-text').innerHTML;
    }

    getAvailableButtons() {
        const container = mockDocument.getElementById('choices-container');
        return container.children
            .filter(child => !child.disabled)
            .map(child => child.textContent);
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    }

    assertContains(text, substring, message) {
        if (!text.includes(substring)) {
            throw new Error(`${message}: "${substring}" not found in "${text}"`);
        }
    }

    runTest(name, testFn) {
        this.currentTest = name;
        this.reset();

        try {
            testFn(this);
            this.testsPassed++;
            console.log(`  \u2713 ${name}`);
        } catch (error) {
            this.testsFailed++;
            console.log(`  \u2717 ${name}`);
            console.log(`    Error: ${error.message}`);
        }
    }

    printSummary() {
        console.log('');
        console.log(`Tests: ${this.testsPassed} passed, ${this.testsFailed} failed`);
        return this.testsFailed === 0;
    }
}

// === Load Game Files ===

function loadGameFiles() {
    const context = vm.createContext({
        document: mockDocument,
        localStorage: mockLocalStorage,
        console: console,
        Math: Math,
        Object: Object,
        Array: Array,
        JSON: JSON,
        Set: Set,
        Config: null,
        StatDefinitions: null,
        DisplayedStats: null,
        CharacterTemplates: null,
        Genders: null,
        ObjectTemplates: null,
        CreationChoices: null,
        CreationChoiceSets: null,
        Actions: null,
        Events: null,
        Stories: null,
        Pursuits: null,
        Game: null,
        CharacterCreation: null,
        TextInterpolation: null,
        ConditionChecker: null,
        EffectExecutor: null,
        Handlers: null,
        PursuitManager: null
    });

    const basePath = path.join(__dirname, '..');

    const files = [
        'data/config.js',
        'data/stats.js',
        'data/templates/characters.js',
        'data/templates/objects.js',
        'data/creation-choices.js',
        'data/actions.js',
        'data/events/events.js',
        'data/stories/stories.js',
        'data/pursuits.js',
        'js/text-interpolation.js',
        'js/condition-checker.js',
        'js/effect-executor.js',
        'js/handlers.js',
        'js/character-creation.js',
        'js/pursuit-manager.js',
        'js/game.js'
    ];

    for (const file of files) {
        const filePath = path.join(basePath, file);
        let code = fs.readFileSync(filePath, 'utf8');
        code = code.replace(/^const (\w+) =/gm, '$1 =');
        vm.runInContext(code, context);
    }

    return context;
}

// === Run Tests ===

function runTests() {
    console.log('Loading game files...');
    const context = loadGameFiles();
    const Game = context.Game;

    if (!Game) {
        console.error('Failed to load Game object from context');
        process.exit(1);
    }

    const harness = new TestHarness();
    Game.random = () => harness.nextRandom();

    console.log('');
    console.log('Running integration tests...');
    console.log('');

    // ============================================================
    // THREAD TEST: Full gameplay integration across all systems
    // ============================================================

    harness.runTest('Thread: full week playthrough with all systems', (t) => {
        // Probabilities: character creation bonuses pass, event passes at 0.3, triggers at 0.7
        t.setRandomSequence([0.3, 0.3, 0.6]);

        // --- INIT & STORY ---
        Game.init();
        t.assertEqual(Game.state.week, 1, 'Should start at week 1');
        t.assert(Game.state.playerId, 'Should have player');
        t.assertContains(t.getNarrativeText(), 'Jumper', 'Should show intro story');

        // --- CHARACTER CREATION (Handlers, Flags, Stats) ---
        t.clickButton('Begin');
        t.clickButton('High'); // combat: +100 health
        t.clickButton('Medium'); // affluence: +100 money
        t.assert(Game.hasFlag('character_created'), 'Flag should be set');
        t.assertEqual(Game.getStat(Game.state.playerId, 'health'), 150, 'Health from creation');
        t.assertEqual(Game.getStat(Game.state.playerId, 'money'), 150, 'Money from creation');

        // --- STORY ADVANCEMENT ---
        t.assertEqual(Game.state.storylines['intro'].currentChapter, 'awakening', 'Story should advance');

        // --- PURSUITS (Weekly Effects) ---
        Game.state.pursuits['frugal_living'].enabled = true;
        const moneyBefore = Game.getStat(Game.state.playerId, 'money');

        // --- EVENT SCHEDULING ---
        context.Events['test_thread_event'] = {
            id: 'test_thread_event',
            probability: 0.5,
            conditions: {},
            handler: 'testThreadHandler'
        };
        let threadEventFired = false;
        context.Handlers['testThreadHandler'] = () => {
            threadEventFired = true;
            return { text: 'Event happened!', choices: [{ text: 'OK', action: 'dismiss' }] };
        };

        // --- WEEK TRANSITION ---
        Game.state.actionsRemaining = 0;
        Game.state.eventSchedule = {}; // Reset for clean scheduling
        t.setRandomSequence([0.3, 0.7, 0.5]); // Event passes (0.3 < 0.5), triggers at 0.7, bonus action roll
        Game.startWeek();

        t.assertEqual(Game.state.week, 1, 'Still week 1 (startWeek doesnt increment)');
        t.assertEqual(
            Game.getStat(Game.state.playerId, 'money'),
            moneyBefore + 10,
            'Frugal living weekly effect should apply'
        );

        // --- EVENT TRIGGERS AT CORRECT TIME ---
        t.assert(!threadEventFired, 'Event should not fire at week start (progress 0)');
        Game.useAction(1); // progress 0.25
        t.assert(!threadEventFired, 'Event should not fire at progress 0.25');
        Game.useAction(1); // progress 0.5
        t.assert(!threadEventFired, 'Event should not fire at progress 0.5');
        Game.useAction(1); // progress 0.75 >= 0.7
        t.assert(threadEventFired, 'Event should fire at progress 0.75');

        // --- SAVE/LOAD PRESERVES ALL STATE ---
        const weekBeforeSave = Game.state.week;
        const healthBeforeSave = Game.getStat(Game.state.playerId, 'health');
        const pursuitEnabledBefore = Game.state.pursuits['frugal_living'].enabled;
        Game.setFlag('thread_test_flag');
        Game.save(0);

        // Reinit and load
        Game.init();
        t.assert(!Game.hasFlag('thread_test_flag'), 'Flag should be gone after init');
        Game.load(0);

        t.assertEqual(Game.state.week, weekBeforeSave, 'Week preserved after load');
        t.assertEqual(Game.getStat(Game.state.playerId, 'health'), healthBeforeSave, 'Health preserved');
        t.assertEqual(Game.state.pursuits['frugal_living'].enabled, pursuitEnabledBefore, 'Pursuit settings preserved');
        t.assert(Game.hasFlag('thread_test_flag'), 'Flag preserved after load');
        t.assert(Game.hasFlag('character_created'), 'Original flags preserved');

        // Cleanup
        delete context.Events['test_thread_event'];
        delete context.Handlers['testThreadHandler'];
    });

    // ============================================================
    // CONSOLIDATED: Core Game
    // ============================================================

    harness.runTest('Core: initialization and story display', (t) => {
        Game.init();

        t.assertEqual(Game.state.week, 1, 'Week should be 1');
        t.assertEqual(Game.state.actionsRemaining, 3, 'Should have 3 actions');
        t.assert(Game.state.playerId, 'Should have player ID');
        t.assertContains(t.getNarrativeText(), 'Jumper', 'Should show intro');
        t.assert(t.getAvailableButtons().some(b => b.includes('Begin')), 'Should have Begin button');
    });

    harness.runTest('Core: character creation flow and probability', (t) => {
        // Test probability passing
        t.setRandomSequence([0.3]); // < 0.5, bonus applies
        Game.init();
        t.clickButton('Begin');
        t.clickButton('Low'); // combat
        t.clickButton('Low'); // affluence - 50% chance +20 health
        t.assertEqual(Game.getStat(Game.state.playerId, 'health'), 70, 'Bonus should apply when random passes');
        t.assert(Game.hasFlag('character_created'), 'Flag should be set');
        t.assertEqual(Game.state.storylines['intro'].currentChapter, 'awakening', 'Story should advance');

        // Test probability failing
        t.reset();
        t.setRandomSequence([0.7]); // > 0.5, bonus fails
        Game.init();
        t.clickButton('Begin');
        t.clickButton('Low');
        t.clickButton('Low');
        t.assertEqual(Game.getStat(Game.state.playerId, 'health'), 50, 'Bonus should not apply when random fails');
    });

    // ============================================================
    // CONSOLIDATED: Text Interpolation
    // ============================================================

    const TextInterpolation = context.TextInterpolation;

    harness.runTest('TextInterpolation: pronouns and conjugation', (t) => {
        // Female pronouns
        let result = TextInterpolation.interpolate(
            '[c:subject] saw [c:reflexive]. [c:possessive] bag.',
            { c: { gender: 'female' } }
        );
        t.assertEqual(result, 'she saw herself. her bag.', 'Female pronouns');

        // Male with capitalization
        result = TextInterpolation.interpolate(
            '[c:Subject] {c:run/runs}. [c:SUBJECT] RUNS.',
            { c: { gender: 'male' } }
        );
        t.assertEqual(result, 'He runs. HE RUNS.', 'Male + caps + conjugation');

        // Nonbinary with plural verb
        result = TextInterpolation.interpolate(
            '[c:Subject] {c:walk/walks} to [c:possessive] car.',
            { c: { gender: 'nonbinary' } }
        );
        t.assertEqual(result, 'They walk to their car.', 'Nonbinary pronouns');

        // Unknown gender defaults to nonbinary
        result = TextInterpolation.interpolate(
            '[c:Subject] {c:is/is}.',
            { c: { gender: null } }
        );
        t.assertEqual(result, 'They is.', 'Defaults to they');
    });

    harness.runTest('TextInterpolation: property access and fallbacks', (t) => {
        // Nested property access
        let result = TextInterpolation.interpolate(
            '[char.name] has [char.weapon.name].',
            { char: { name: 'Alice', weapon: { name: 'a sword' } } }
        );
        t.assertEqual(result, 'Alice has a sword.', 'Nested properties');

        // Fallback for missing
        result = TextInterpolation.interpolate(
            '[char.name] has [char.weapon.name|nothing].',
            { char: { name: 'Bob', weapon: null } }
        );
        t.assertEqual(result, 'Bob has nothing.', 'Fallback works');
    });

    harness.runTest('TextInterpolation: complex template', (t) => {
        const result = TextInterpolation.interpolate(
            '[p:Subject] {p:swing/swings} [p:possessive] [p.weapon.name|fists] at [t.name].',
            {
                p: { gender: 'male', weapon: { name: 'axe' } },
                t: { name: 'the goblin' }
            }
        );
        t.assertEqual(result, 'He swings his axe at the goblin.', 'Complex template');
    });

    // ============================================================
    // CONSOLIDATED: Objectives
    // ============================================================

    const ConditionChecker = context.ConditionChecker;
    const EffectExecutor = context.EffectExecutor;

    harness.runTest('Objectives: success and failure paths', (t) => {
        Game.init();

        context.Stories['testObj'] = {
            initialChapter: 'active',
            chapters: {
                active: {
                    advanceWhen: { hasFlag: 'win' },
                    advanceTo: 'success',
                    failWhen: { hasFlag: 'lose' },
                    failTo: 'failure'
                },
                success: { objectiveResult: 'success', successEffects: [{ setFlag: 'reward' }] },
                failure: { objectiveResult: 'failure', failureEffects: [{ setFlag: 'penalty' }] }
            }
        };

        // Test success path
        Game.enterStory('testObj');
        Game.setFlag('win');
        Game.evaluateStorylines();
        t.assertEqual(Game.state.storylines['testObj'].currentChapter, 'success', 'Should reach success');
        t.assert(Game.state.storylines['testObj'].completed, 'Should be completed');
        t.assertEqual(Game.state.storylines['testObj'].result, 'success', 'Result should be success');
        t.assert(Game.hasFlag('reward'), 'Success effects should run');

        // Test failure path (failure takes precedence)
        t.reset();
        Game.init();
        context.Stories['testObj2'] = {
            initialChapter: 'active',
            chapters: {
                active: {
                    advanceWhen: { hasFlag: 'done' },
                    advanceTo: 'success',
                    failWhen: { hasFlag: 'done' }, // Same condition - failure wins
                    failTo: 'failure'
                },
                success: { objectiveResult: 'success' },
                failure: { objectiveResult: 'failure', failureEffects: [{ setFlag: 'penalty' }] }
            }
        };
        Game.enterStory('testObj2');
        Game.setFlag('done');
        Game.evaluateStorylines();
        t.assertEqual(Game.state.storylines['testObj2'].currentChapter, 'failure', 'Failure takes precedence');
        t.assert(Game.hasFlag('penalty'), 'Failure effects should run');
    });

    harness.runTest('Objectives: progress tracking', (t) => {
        Game.init();
        Game.enterStory('intro');

        // modifyObjectiveProgress
        EffectExecutor.execute([{ modifyObjectiveProgress: ['intro', 5] }], Game);
        t.assertEqual(Game.state.storylines['intro'].progress, 5, 'Progress set to 5');
        EffectExecutor.execute([{ modifyObjectiveProgress: ['intro', 3] }], Game);
        t.assertEqual(Game.state.storylines['intro'].progress, 8, 'Progress accumulated to 8');

        // setObjectiveProgress
        EffectExecutor.execute([{ setObjectiveProgress: ['intro', 2] }], Game);
        t.assertEqual(Game.state.storylines['intro'].progress, 2, 'Progress reset to 2');

        // Condition checks
        t.assert(ConditionChecker.check({ objectiveProgress: ['intro', '>=', 2] }, Game), 'Should pass >= 2');
        t.assert(!ConditionChecker.check({ objectiveProgress: ['intro', '>', 2] }, Game), 'Should fail > 2');
    });

    harness.runTest('Objectives: active and complete conditions', (t) => {
        Game.init();

        context.Stories['testActive'] = {
            initialChapter: 'going',
            chapters: {
                going: { advanceWhen: { hasFlag: 'finish' }, advanceTo: 'done' },
                done: { objectiveResult: 'success' }
            }
        };

        Game.enterStory('testActive');
        t.assert(ConditionChecker.check({ objectiveActive: 'testActive' }, Game), 'Should be active');
        t.assert(!ConditionChecker.check({ objectiveComplete: { testActive: true } }, Game), 'Not complete yet');

        Game.setFlag('finish');
        Game.evaluateStorylines();

        t.assert(!ConditionChecker.check({ objectiveActive: 'testActive' }, Game), 'No longer active');
        t.assert(ConditionChecker.check({ objectiveComplete: { testActive: true } }, Game), 'Now complete');
        t.assert(ConditionChecker.check({ objectiveComplete: { testActive: 'success' } }, Game), 'Complete with success');
    });

    // ============================================================
    // CONSOLIDATED: Pursuits
    // ============================================================

    const PursuitManager = context.PursuitManager;

    harness.runTest('Pursuits: activation and deactivation', (t) => {
        Game.init();

        // Toggle defaults
        t.assert(Game.state.pursuits['burn_midnight_oil'], 'Toggle pursuit should be initialized');
        t.assertEqual(Game.state.pursuits['burn_midnight_oil'].enabled, false, 'Toggle defaults disabled');

        // Action pursuit activation via effect
        context.Pursuits['test_job'] = {
            configType: 'action',
            hoursCost: 40,
            exitEffects: [{ setFlag: 'job_ended' }]
        };
        EffectExecutor.execute([{ startPursuit: 'test_job' }], Game);
        t.assert(Game.state.pursuits['test_job'].active, 'Should activate via effect');

        // Deactivation via effect
        EffectExecutor.execute([{ endPursuit: 'test_job' }], Game);
        t.assert(!Game.state.pursuits['test_job'].active, 'Should deactivate');
        t.assert(Game.hasFlag('job_ended'), 'Exit effects should run');

        // Exit conditions
        context.Pursuits['temp_job'] = {
            configType: 'action',
            hoursCost: 40,
            exitConditions: { hasFlag: 'fired' },
            exitEffects: [{ setFlag: 'severance' }]
        };
        PursuitManager.activatePursuit(Game, 'temp_job');
        Game.setFlag('fired');
        PursuitManager.checkExitConditions(Game);
        t.assert(!Game.state.pursuits['temp_job'].active, 'Should deactivate on exit condition');
        t.assert(Game.hasFlag('severance'), 'Exit effects should run');
    });

    harness.runTest('Pursuits: hours calculation and action penalty', (t) => {
        Game.init();

        // Basic hour calculation
        context.Pursuits['job1'] = { configType: 'action', hoursCost: 40 };
        context.Pursuits['routine1'] = { configType: 'toggle', hoursCost: 10 };
        PursuitManager.activatePursuit(Game, 'job1');
        PursuitManager.activatePursuit(Game, 'routine1');
        Game.state.pursuits['routine1'].enabled = true;
        t.assertEqual(PursuitManager.calculatePursuitHours(Game), 50, 'Hours sum correctly');

        // Disabled toggle doesn't contribute
        Game.state.pursuits['routine1'].enabled = false;
        t.assertEqual(PursuitManager.calculatePursuitHours(Game), 40, 'Disabled toggle excluded');

        // Negative hours (burn midnight oil)
        Game.state.pursuits['burn_midnight_oil'].enabled = true; // -15 hours
        t.assertEqual(PursuitManager.calculatePursuitHours(Game), 25, 'Negative hours subtract');

        // Action penalty: 70 hours = 20 excess = 1 action penalty
        t.reset();
        Game.init();
        context.Pursuits['heavy_job'] = { configType: 'action', hoursCost: 70 };
        PursuitManager.activatePursuit(Game, 'heavy_job');
        let result = PursuitManager.calculateEffectiveActions(Game);
        t.assertEqual(result.guaranteed, 2, '20 excess = -1 action');
        t.assertEqual(result.bonusChance, 0, 'No fractional bonus');

        // Fractional penalty: 62 hours = 12 excess = 0.6 penalty = 2.4 actions
        t.reset();
        Game.init();
        context.Pursuits['medium_job'] = { configType: 'action', hoursCost: 62 };
        PursuitManager.activatePursuit(Game, 'medium_job');
        result = PursuitManager.calculateEffectiveActions(Game);
        t.assertEqual(result.guaranteed, 2, '2 guaranteed actions');
        t.assert(result.bonusChance > 0.35 && result.bonusChance < 0.45, '~40% bonus chance');
    });

    harness.runTest('Pursuits: weekly effects', (t) => {
        Game.init();

        // Action pursuit weekly effects
        context.Pursuits['paycheck'] = {
            configType: 'action',
            hoursCost: 10,
            weeklyEffects: [{ modifyStat: ['money', 100] }]
        };
        const initialMoney = Game.getStat(Game.state.playerId, 'money');
        PursuitManager.activatePursuit(Game, 'paycheck');
        PursuitManager.processWeeklyEffects(Game);
        t.assertEqual(Game.getStat(Game.state.playerId, 'money'), initialMoney + 100, 'Weekly effect adds money');

        // Toggle weekly effects only when enabled
        t.reset();
        Game.init();
        const money2 = Game.getStat(Game.state.playerId, 'money');
        PursuitManager.processWeeklyEffects(Game); // frugal_living disabled
        t.assertEqual(Game.getStat(Game.state.playerId, 'money'), money2, 'Disabled toggle has no effect');
        Game.state.pursuits['frugal_living'].enabled = true;
        PursuitManager.processWeeklyEffects(Game);
        t.assertEqual(Game.getStat(Game.state.playerId, 'money'), money2 + 10, 'Enabled toggle applies effect');

        // Select option weekly effects
        t.reset();
        Game.init();
        context.Pursuits['makeup'] = {
            configType: 'select',
            options: {
                none: { hoursCost: 0, weeklyEffects: [] },
                natural: { hoursCost: 2, weeklyEffects: [{ setFlag: 'wearing_makeup' }] }
            }
        };
        PursuitManager.activatePursuit(Game, 'makeup');
        Game.state.pursuits['makeup'].option = 'natural';
        PursuitManager.processWeeklyEffects(Game);
        t.assert(Game.hasFlag('wearing_makeup'), 'Select option effect applies');
    });

    harness.runTest('Pursuits: conditions', (t) => {
        Game.init();

        // pursuitActive for action
        context.Pursuits['test_p'] = { configType: 'action', hoursCost: 10 };
        t.assert(!ConditionChecker.check({ pursuitActive: 'test_p' }, Game), 'Inactive pursuit fails');
        PursuitManager.activatePursuit(Game, 'test_p');
        t.assert(ConditionChecker.check({ pursuitActive: 'test_p' }, Game), 'Active pursuit passes');

        // pursuitActive for toggle (requires enabled)
        t.assert(!ConditionChecker.check({ pursuitActive: 'frugal_living' }, Game), 'Disabled toggle fails');
        Game.state.pursuits['frugal_living'].enabled = true;
        t.assert(ConditionChecker.check({ pursuitActive: 'frugal_living' }, Game), 'Enabled toggle passes');

        // pursuitOption
        context.Pursuits['select_p'] = { configType: 'select', options: { a: {}, b: {} } };
        PursuitManager.activatePursuit(Game, 'select_p');
        Game.state.pursuits['select_p'].option = 'b';
        t.assert(ConditionChecker.check({ pursuitOption: ['select_p', 'b'] }, Game), 'Correct option passes');
        t.assert(!ConditionChecker.check({ pursuitOption: ['select_p', 'a'] }, Game), 'Wrong option fails');

        // pursuitHours
        t.assert(ConditionChecker.check({ pursuitHours: ['>=', 0] }, Game), 'Hours condition works');
    });

    harness.runTest('Pursuits: conflicts and ensurePossession', (t) => {
        Game.init();

        // Exclusive tag conflicts
        context.Pursuits['job1'] = {
            configType: 'action',
            hoursCost: 40,
            tags: ['employment', 'full_time'],
            exclusive: ['full_time']
        };
        context.Pursuits['job2'] = {
            configType: 'action',
            hoursCost: 40,
            tags: ['employment', 'full_time']
        };
        PursuitManager.activatePursuit(Game, 'job1');
        const conflicts = PursuitManager.getConflictingPursuits(Game, 'job2');
        t.assertEqual(conflicts.length, 1, 'Should detect conflict');
        t.assertEqual(conflicts[0], 'job1', 'Should identify conflicting pursuit');

        // ensurePossession creates object
        EffectExecutor.execute([{ ensurePossession: ['appearance_boost', { level: 1 }] }], Game);
        let obj = Game.getCharacterObjectOfType(Game.state.playerId, 'appearance_boost');
        t.assert(obj, 'Should create object');
        t.assertEqual(obj.state.level, 1, 'Should have state');

        // ensurePossession updates existing
        EffectExecutor.execute([{ ensurePossession: ['appearance_boost', { level: 5 }] }], Game);
        const objects = Game.getCharacterObjectsOfType(Game.state.playerId, 'appearance_boost');
        t.assertEqual(objects.length, 1, 'Should not duplicate');
        t.assertEqual(objects[0].state.level, 5, 'Should update');
    });

    // ============================================================
    // CONSOLIDATED: Save/Load
    // ============================================================

    harness.runTest('Save/Load: basic operations', (t) => {
        t.assert(!Game.hasSave(), 'No save initially');

        Game.init();
        Game.setFlag('test_flag');
        Game.state.week = 5;
        const originalPlayerId = Game.state.playerId;
        Game.save(0);

        t.assert(Game.hasSave(), 'Has save after saving');

        // Load restores state
        Game.init();
        t.assertEqual(Game.state.week, 1, 'Week reset after init');
        Game.load(0);
        t.assertEqual(Game.state.week, 5, 'Week restored');
        t.assert(Game.hasFlag('test_flag'), 'Flag restored');
        t.assertEqual(Game.state.playerId, originalPlayerId, 'Player ID restored');

        // Load returns false for missing save
        t.reset();
        t.assert(!Game.load(9), 'Load returns false for empty slot');

        // nextId preserved
        t.reset();
        Game.init();
        Game.createCharacter('human', 'NPC1');
        const nextIdBefore = Game.nextId;
        Game.save(0);
        Game.init();
        t.assert(Game.nextId < nextIdBefore, 'nextId resets on init');
        Game.load(0);
        t.assertEqual(Game.nextId, nextIdBefore, 'nextId restored');
    });

    harness.runTest('Save/Load: multi-slot and metadata', (t) => {
        Game.init();

        // Slot info
        const slots = Game.getAllSaveSlots();
        t.assertEqual(slots.length, 11, '11 slots (1 autosave + 10 numbered)');
        t.assertEqual(slots[0].slot, 'autosave', 'First is autosave');

        // Empty slot info
        const emptyInfo = Game.getSaveSlotInfo(5);
        t.assert(!emptyInfo.exists, 'Empty slot exists=false');

        // Save with metadata
        Game.state.week = 7;
        Game.save(3);
        const info = Game.getSaveSlotInfo(3);
        t.assert(info.exists, 'Filled slot exists=true');
        t.assertEqual(info.meta.week, 7, 'Metadata has week');
        t.assert(info.meta.savedAt, 'Metadata has timestamp');

        // Autosave
        Game.save('autosave');
        t.assert(mockLocalStorage.getItem(context.Config.autoSaveKey), 'Autosave writes to correct key');

        // Different slots independent
        Game.state.week = 2;
        Game.save(4);
        t.assertEqual(Game.getSaveSlotInfo(3).meta.week, 7, 'Slot 3 unchanged');
        t.assertEqual(Game.getSaveSlotInfo(4).meta.week, 2, 'Slot 4 has new week');

        // Delete save
        Game.deleteSave(4);
        t.assert(!Game.getSaveSlotInfo(4).exists, 'Deleted slot empty');
    });

    harness.runTest('Save/Load: preserves complex state', (t) => {
        Game.init();

        // Set up complex state
        Game.state.pursuits['burn_midnight_oil'].enabled = true;
        Game.setFlag('complex_flag');
        Game.createCharacter('human', 'TestNPC');
        EffectExecutor.execute([{ ensurePossession: ['appearance_boost', { level: 3 }] }], Game);

        Game.save(0);
        Game.init();
        Game.load(0);

        // Verify all preserved
        t.assert(Game.state.pursuits['burn_midnight_oil'].enabled, 'Pursuit setting preserved');
        t.assert(Game.hasFlag('complex_flag'), 'Flag preserved');
        t.assert(Object.keys(Game.state.characters).length > 1, 'NPCs preserved');

        // Old saves without pursuits field don't crash
        t.reset();
        Game.init();
        Game.save(0);
        const key = context.Config.saveKeyPrefix + '0';
        const data = JSON.parse(mockLocalStorage.getItem(key));
        delete data.state.pursuits;
        mockLocalStorage.setItem(key, JSON.stringify(data));
        Game.load(0);
        t.assert(Game.state !== null, 'Loads without crash');
    });

    // ============================================================
    // CONSOLIDATED: Event Scheduling
    // ============================================================

    harness.runTest('Events: scheduling and single roll per week', (t) => {
        Game.init();

        context.Events['test_event'] = {
            id: 'test_event',
            probability: 0.5,
            conditions: {},
            text: 'Test'
        };

        // Fail roll (0.6 > 0.5)
        t.setRandomSequence([0.6]);
        Game.evaluateEvents();
        t.assert(Game.state.eventSchedule['test_event'], 'Event in schedule');
        t.assert(!Game.state.eventSchedule['test_event'].passed, 'Roll failed');

        // Subsequent evals don't re-roll
        t.setRandomSequence([0.1]); // Would pass if re-rolled
        Game.evaluateEvents();
        t.assert(!Game.state.eventSchedule['test_event'].passed, 'Still failed (not re-rolled)');

        // New week resets schedule
        Game.state.actionsRemaining = 0;
        t.setRandomSequence([0.3, 0.5]); // Pass, trigger at 0.5
        Game.startWeek();
        t.assert(Game.state.eventSchedule['test_event'].passed, 'New week allows fresh roll');

        delete context.Events['test_event'];
    });

    harness.runTest('Events: trigger timing and mid-week eligibility', (t) => {
        Game.init();

        context.Events['timed_event'] = {
            id: 'timed_event',
            probability: 0.5,
            conditions: {},
            handler: 'timedHandler'
        };
        let fired = false;
        context.Handlers['timedHandler'] = () => { fired = true; return null; };

        // Pass roll (0.3 < 0.5), trigger at 0.6
        t.setRandomSequence([0.3, 0.6]);
        Game.startWeek();

        // Progress: 0, 0.25, 0.5, 0.75
        t.assert(!fired, 'Not at progress 0');
        Game.useAction(1);
        t.assert(!fired, 'Not at 0.25');
        Game.useAction(1);
        t.assert(!fired, 'Not at 0.5');
        Game.useAction(1); // 0.75 >= 0.6
        t.assert(fired, 'Fires at 0.75');

        // Mid-week eligibility with pro-rated probability
        t.reset();
        Game.init();
        Game.startWeek();
        Game.useAction(1); // 0.25
        Game.useAction(1); // 0.5

        context.Events['late_event'] = {
            id: 'late_event',
            probability: 0.9,
            conditions: {},
            handler: 'lateHandler'
        };
        let lateFired = false;
        context.Handlers['lateHandler'] = () => { lateFired = true; return null; };

        // Pass (0.1 < 0.9), but triggerAt 0.3 < current progress 0.5
        t.setRandomSequence([0.1, 0.3]);
        Game.evaluateEvents();
        t.assert(Game.state.eventSchedule['late_event'].passed, 'Passed roll');
        t.assert(Game.state.eventSchedule['late_event'].missed, 'Marked as missed');
        t.assert(!lateFired, 'Did not fire (missed window)');

        delete context.Events['timed_event'];
        delete context.Events['late_event'];
        delete context.Handlers['timedHandler'];
        delete context.Handlers['lateHandler'];
    });

    // Print summary
    const success = harness.printSummary();
    process.exit(success ? 0 : 1);
}

// Run if executed directly
runTests();
