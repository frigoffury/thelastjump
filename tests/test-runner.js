/* The Last Jump - Test Runner - by FrigOfFury
 *
 * Node.js-based integration test runner with DOM mocks.
 * Simulates button clicks and verifies game state changes.
 *
 * Usage: node tests/test-runner.js
 *
 * For more sophisticated browser testing (actual rendering, CSS, etc.),
 * consider migrating to Puppeteer in the future.
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
        // Clear children when innerHTML is set (matches browser behavior)
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

    // Set up deterministic random sequence
    setRandomSequence(values) {
        this.randomValues = values;
        this.randomIndex = 0;
    }

    // Get next random value (or fall back to Math.random if exhausted)
    nextRandom() {
        if (this.randomIndex < this.randomValues.length) {
            return this.randomValues[this.randomIndex++];
        }
        return Math.random();
    }

    // Reset game state between tests
    reset() {
        Object.keys(mockElements).forEach(key => delete mockElements[key]);
        mockLocalStorage.clear();
        this.randomIndex = 0;
    }

    // Find button by text content
    findButton(text) {
        const container = mockDocument.getElementById('choices-container');
        for (const child of container.children) {
            if (child.textContent.includes(text)) {
                return child;
            }
        }
        return null;
    }

    // Click a button by its text
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

    // Get current narrative text
    getNarrativeText() {
        return mockDocument.getElementById('story-text').innerHTML;
    }

    // Get list of available button texts
    getAvailableButtons() {
        const container = mockDocument.getElementById('choices-container');
        return container.children
            .filter(child => !child.disabled)
            .map(child => child.textContent);
    }

    // Assert helpers
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

    // Run a single test
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

    // Print summary
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
        // Pre-declare globals that will be defined by scripts
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

    // JS files must be loaded in dependency order
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
        // Convert const declarations to assignments so they update context
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
        console.log('Context keys:', Object.keys(context));
        process.exit(1);
    }

    const harness = new TestHarness();

    // Inject controlled randomness
    const originalRandom = Game.random.bind(Game);
    Game.random = () => harness.nextRandom();

    console.log('');
    console.log('Running integration tests...');
    console.log('');

    // === Test: Game initializes correctly ===
    harness.runTest('Game initializes with correct state', (t) => {
        Game.init();

        t.assertEqual(Game.state.week, 1, 'Week should be 1');
        t.assertEqual(Game.state.actionsRemaining, 3, 'Should have 3 actions');
        t.assertEqual(Game.state.jumpCount, 0, 'Jump count should be 0');
        t.assert(Game.state.playerId, 'Should have player ID');
        t.assert(Game.getPlayer(), 'Should be able to get player');
    });

    // === Test: Initial story text appears ===
    harness.runTest('Initial story text is displayed', (t) => {
        Game.init();

        const text = t.getNarrativeText();
        t.assertContains(text, 'Jumper', 'Should show Jumper intro');
    });

    // === Test: Begin journey button exists ===
    harness.runTest('Begin journey button is available', (t) => {
        Game.init();

        const buttons = t.getAvailableButtons();
        t.assert(buttons.some(b => b.includes('Begin')), 'Should have Begin button');
    });

    // === Test: Character creation flow ===
    harness.runTest('Character creation completes with stat changes', (t) => {
        t.setRandomSequence([1, 1, 1, 1]); // All probabilities pass
        Game.init();

        const initialHealth = Game.getStat(Game.state.playerId, 'health');
        t.assertEqual(initialHealth, 50, 'Initial health should be 50');

        // Start creation
        t.clickButton('Begin');

        // Select High combat (health +100)
        t.clickButton('High');

        // Select Medium affluence (money +100)
        t.clickButton('Medium');

        // Verify stats changed
        const health = Game.getStat(Game.state.playerId, 'health');
        const money = Game.getStat(Game.state.playerId, 'money');

        t.assertEqual(health, 150, 'Health should be 150 after High combat');
        t.assertEqual(money, 150, 'Money should be 150 after Medium affluence');
    });

    // === Test: Character creation sets flag ===
    harness.runTest('Character creation sets character_created flag', (t) => {
        t.setRandomSequence([1, 1]);
        Game.init();

        t.assert(!Game.hasFlag('character_created'), 'Flag should not exist initially');

        t.clickButton('Begin');
        t.clickButton('Low');
        t.clickButton('Low');

        t.assert(Game.hasFlag('character_created'), 'Flag should be set after creation');
    });

    // === Test: Story advances after creation ===
    harness.runTest('Story advances to awakening chapter after creation', (t) => {
        t.setRandomSequence([1, 1]);
        Game.init();

        t.clickButton('Begin');
        t.clickButton('Low');
        t.clickButton('Low');

        const storylineState = Game.state.storylines['intro'];
        t.assertEqual(storylineState.currentChapter, 'awakening', 'Should be in awakening chapter');
    });

    // === Test: Probability impacts respect randomness ===
    harness.runTest('Low affluence health bonus respects probability', (t) => {
        // Random value 0.3 < 0.5 probability, so bonus applies
        t.setRandomSequence([0.3]);
        Game.init();

        t.clickButton('Begin');
        t.clickButton('Low'); // combat
        t.clickButton('Low'); // affluence - has 50% chance of +20 health

        const health = Game.getStat(Game.state.playerId, 'health');
        t.assertEqual(health, 70, 'Should get +20 health bonus (random passed)');
    });

    harness.runTest('Low affluence health bonus can fail probability', (t) => {
        // Random value 0.7 > 0.5 probability, so bonus does not apply
        t.setRandomSequence([0.7]);
        Game.init();

        t.clickButton('Begin');
        t.clickButton('Low');
        t.clickButton('Low');

        const health = Game.getStat(Game.state.playerId, 'health');
        t.assertEqual(health, 50, 'Should not get health bonus (random failed)');
    });

    // === Text Interpolation Tests ===
    const TextInterpolation = context.TextInterpolation;

    harness.runTest('TextInterpolation: basic pronoun substitution', (t) => {
        const result = TextInterpolation.interpolate(
            '[char:subject] runs.',
            { char: { gender: 'female' } }
        );
        t.assertEqual(result, 'she runs.', 'Should substitute female pronoun');
    });

    harness.runTest('TextInterpolation: capitalization preserved', (t) => {
        const result = TextInterpolation.interpolate(
            '[char:Subject] runs. [char:SUBJECT] RUNS.',
            { char: { gender: 'male' } }
        );
        t.assertEqual(result, 'He runs. HE RUNS.', 'Should preserve capitalization');
    });

    harness.runTest('TextInterpolation: all pronoun types', (t) => {
        const result = TextInterpolation.interpolate(
            '[c:subject] saw [c:reflexive] in the mirror. [c:possessive] reflection stared back at [c:object].',
            { c: { gender: 'female' } }
        );
        t.assertEqual(
            result,
            'she saw herself in the mirror. her reflection stared back at her.',
            'Should handle all pronoun types'
        );
    });

    harness.runTest('TextInterpolation: nonbinary pronouns', (t) => {
        const result = TextInterpolation.interpolate(
            '[char:Subject] took [char:possessive] bag.',
            { char: { gender: 'nonbinary' } }
        );
        t.assertEqual(result, 'They took their bag.', 'Should use they/their for nonbinary');
    });

    harness.runTest('TextInterpolation: verb conjugation singular', (t) => {
        const result = TextInterpolation.interpolate(
            '[char:Subject] {char:run/runs} fast.',
            { char: { gender: 'female' } }
        );
        t.assertEqual(result, 'She runs fast.', 'Should use singular verb for she');
    });

    harness.runTest('TextInterpolation: verb conjugation plural', (t) => {
        const result = TextInterpolation.interpolate(
            '[char:Subject] {char:run/runs} fast.',
            { char: { gender: 'nonbinary' } }
        );
        t.assertEqual(result, 'They run fast.', 'Should use plural verb for they');
    });

    harness.runTest('TextInterpolation: property access', (t) => {
        const result = TextInterpolation.interpolate(
            '[char.name] wields [char.weapon.name].',
            { char: { name: 'Alice', weapon: { name: 'a sword' } } }
        );
        t.assertEqual(result, 'Alice wields a sword.', 'Should access nested properties');
    });

    harness.runTest('TextInterpolation: fallback for missing property', (t) => {
        const result = TextInterpolation.interpolate(
            '[char.name] wields [char.weapon.name|bare fists].',
            { char: { name: 'Bob', weapon: null } }
        );
        t.assertEqual(result, 'Bob wields bare fists.', 'Should use fallback');
    });

    harness.runTest('TextInterpolation: full sentence with all features', (t) => {
        const result = TextInterpolation.interpolate(
            '[player:Subject] {player:swing/swings} [player:possessive] [player.weapon.name|fists] at [target.name].',
            {
                player: { gender: 'male', weapon: { name: 'axe' } },
                target: { name: 'the goblin' }
            }
        );
        t.assertEqual(result, 'He swings his axe at the goblin.', 'Should handle complex template');
    });

    harness.runTest('TextInterpolation: defaults to nonbinary for unknown gender', (t) => {
        const result = TextInterpolation.interpolate(
            '[char:Subject] {char:walk/walks}.',
            { char: { gender: null } }
        );
        t.assertEqual(result, 'They walk.', 'Should default to they/plural');
    });

    // === Objectives Tests ===
    const ConditionChecker = context.ConditionChecker;
    const EffectExecutor = context.EffectExecutor;

    harness.runTest('Objective: failWhen condition advances to failTo chapter', (t) => {
        Game.init();

        // Inject a test objective story
        context.Stories['testObjective'] = {
            initialChapter: 'active',
            chapters: {
                active: {
                    text: 'Do the thing before week 3.',
                    advanceWhen: { hasFlag: 'task_done' },
                    advanceTo: 'success',
                    failWhen: { minWeek: 3 },
                    failTo: 'failure'
                },
                success: { text: 'You did it!', objectiveResult: 'success' },
                failure: { text: 'Too late.', objectiveResult: 'failure' }
            }
        };

        Game.enterStory('testObjective');
        t.assertEqual(Game.state.storylines['testObjective'].currentChapter, 'active', 'Should start in active');

        // Advance time to week 3
        Game.state.week = 3;
        Game.evaluateStorylines();

        t.assertEqual(Game.state.storylines['testObjective'].currentChapter, 'failure', 'Should advance to failure');
    });

    harness.runTest('Objective: advanceWhen takes precedence when both conditions pass', (t) => {
        Game.init();

        context.Stories['testRace'] = {
            initialChapter: 'active',
            chapters: {
                active: {
                    advanceWhen: { hasFlag: 'win' },
                    advanceTo: 'won',
                    failWhen: { hasFlag: 'lose' },
                    failTo: 'lost'
                },
                won: { objectiveResult: 'success' },
                lost: { objectiveResult: 'failure' }
            }
        };

        Game.enterStory('testRace');
        Game.setFlag('win');
        // Note: failWhen is checked first, so if lose is also set, it fails
        Game.evaluateStorylines();

        t.assertEqual(Game.state.storylines['testRace'].currentChapter, 'won', 'Should advance to won');
    });

    harness.runTest('Objective: failure takes precedence when both conditions match', (t) => {
        Game.init();

        context.Stories['testPrecedence'] = {
            initialChapter: 'active',
            chapters: {
                active: {
                    advanceWhen: { hasFlag: 'done' },
                    advanceTo: 'success',
                    failWhen: { hasFlag: 'done' },  // Same condition
                    failTo: 'failure'
                },
                success: { objectiveResult: 'success' },
                failure: { objectiveResult: 'failure' }
            }
        };

        Game.enterStory('testPrecedence');
        Game.setFlag('done');
        Game.evaluateStorylines();

        // failWhen is checked first
        t.assertEqual(Game.state.storylines['testPrecedence'].currentChapter, 'failure', 'Failure should take precedence');
    });

    harness.runTest('Objective: objectiveResult marks completion state', (t) => {
        Game.init();

        context.Stories['testComplete'] = {
            initialChapter: 'start',
            chapters: {
                start: {
                    advanceWhen: { hasFlag: 'go' },
                    advanceTo: 'done'
                },
                done: { objectiveResult: 'success' }
            }
        };

        Game.enterStory('testComplete');
        t.assert(!Game.state.storylines['testComplete'].completed, 'Should not be completed initially');

        Game.setFlag('go');
        Game.evaluateStorylines();

        t.assert(Game.state.storylines['testComplete'].completed, 'Should be marked completed');
        t.assertEqual(Game.state.storylines['testComplete'].result, 'success', 'Result should be success');
    });

    harness.runTest('Objective: successEffects execute on success', (t) => {
        Game.init();

        context.Stories['testSuccessEffects'] = {
            initialChapter: 'start',
            chapters: {
                start: { advanceWhen: { hasFlag: 'win' }, advanceTo: 'end' },
                end: {
                    objectiveResult: 'success',
                    successEffects: [{ setFlag: 'reward_given' }]
                }
            }
        };

        Game.enterStory('testSuccessEffects');
        Game.setFlag('win');
        Game.evaluateStorylines();

        t.assert(Game.hasFlag('reward_given'), 'Success effects should set flag');
    });

    harness.runTest('Objective: failureEffects execute on failure', (t) => {
        Game.init();

        context.Stories['testFailEffects'] = {
            initialChapter: 'start',
            chapters: {
                start: { failWhen: { hasFlag: 'lose' }, failTo: 'end' },
                end: {
                    objectiveResult: 'failure',
                    failureEffects: [{ setFlag: 'penalty_applied' }]
                }
            }
        };

        Game.enterStory('testFailEffects');
        Game.setFlag('lose');
        Game.evaluateStorylines();

        t.assert(Game.hasFlag('penalty_applied'), 'Failure effects should set flag');
    });

    harness.runTest('Effect: modifyObjectiveProgress adds to progress', (t) => {
        Game.init();
        Game.enterStory('intro');

        EffectExecutor.execute([
            { modifyObjectiveProgress: ['intro', 5] }
        ], Game);

        t.assertEqual(Game.state.storylines['intro'].progress, 5, 'Progress should be 5');

        EffectExecutor.execute([
            { modifyObjectiveProgress: ['intro', 3] }
        ], Game);

        t.assertEqual(Game.state.storylines['intro'].progress, 8, 'Progress should accumulate to 8');
    });

    harness.runTest('Effect: setObjectiveProgress sets progress directly', (t) => {
        Game.init();
        Game.enterStory('intro');

        EffectExecutor.execute([
            { setObjectiveProgress: ['intro', 10] }
        ], Game);

        t.assertEqual(Game.state.storylines['intro'].progress, 10, 'Progress should be set to 10');

        EffectExecutor.execute([
            { setObjectiveProgress: ['intro', 3] }
        ], Game);

        t.assertEqual(Game.state.storylines['intro'].progress, 3, 'Progress should be reset to 3');
    });

    harness.runTest('Condition: objectiveProgress checks progress value', (t) => {
        Game.init();
        Game.enterStory('intro');
        Game.state.storylines['intro'].progress = 5;

        t.assert(
            ConditionChecker.check({ objectiveProgress: ['intro', '>=', 5] }, Game),
            'Should pass >= 5'
        );
        t.assert(
            !ConditionChecker.check({ objectiveProgress: ['intro', '>', 5] }, Game),
            'Should fail > 5'
        );
        t.assert(
            ConditionChecker.check({ objectiveProgress: ['intro', '==', 5] }, Game),
            'Should pass == 5'
        );
    });

    harness.runTest('Condition: objectiveComplete checks completion state', (t) => {
        Game.init();

        context.Stories['testCheckComplete'] = {
            initialChapter: 'done',
            chapters: { done: { objectiveResult: 'success' } }
        };

        Game.enterStory('testCheckComplete');

        t.assert(
            !ConditionChecker.check({ objectiveComplete: { testCheckComplete: true } }, Game),
            'Should fail before evaluation'
        );

        Game.evaluateStorylines();

        t.assert(
            ConditionChecker.check({ objectiveComplete: { testCheckComplete: true } }, Game),
            'Should pass after completion'
        );
        t.assert(
            ConditionChecker.check({ objectiveComplete: { testCheckComplete: 'success' } }, Game),
            'Should pass with success result'
        );
        t.assert(
            !ConditionChecker.check({ objectiveComplete: { testCheckComplete: 'failure' } }, Game),
            'Should fail with wrong result'
        );
    });

    harness.runTest('Condition: objectiveActive checks active state', (t) => {
        Game.init();

        context.Stories['testActive'] = {
            initialChapter: 'going',
            chapters: {
                going: { advanceWhen: { hasFlag: 'finish' }, advanceTo: 'done' },
                done: { objectiveResult: 'success' }
            }
        };

        Game.enterStory('testActive');

        t.assert(
            ConditionChecker.check({ objectiveActive: 'testActive' }, Game),
            'Should be active initially'
        );

        Game.setFlag('finish');
        Game.evaluateStorylines();

        t.assert(
            !ConditionChecker.check({ objectiveActive: 'testActive' }, Game),
            'Should not be active after completion'
        );
    });

    // === Pursuit Tests ===
    const PursuitManager = context.PursuitManager;

    harness.runTest('Pursuit: initDefaults activates non-action pursuits', (t) => {
        Game.init();

        t.assert(Game.state.pursuits !== undefined, 'Should have pursuits state');
        // Our sample pursuits are all toggles, so they should be initialized
        t.assert(Game.state.pursuits['burn_midnight_oil'] !== undefined, 'Should init burn_midnight_oil');
        t.assert(Game.state.pursuits['frugal_living'] !== undefined, 'Should init frugal_living');
    });

    harness.runTest('Pursuit: toggle pursuits default to disabled', (t) => {
        Game.init();

        t.assertEqual(Game.state.pursuits['burn_midnight_oil'].enabled, false, 'Should default to disabled');
        t.assertEqual(Game.state.pursuits['frugal_living'].enabled, false, 'Should default to disabled');
    });

    harness.runTest('Pursuit: startPursuit effect activates action pursuit', (t) => {
        Game.init();

        context.Pursuits['test_job'] = {
            configType: 'action',
            hoursCost: 40,
            weeklyEffects: [{ modifyStat: ['money', 100] }]
        };

        EffectExecutor.execute([{ startPursuit: 'test_job' }], Game);

        t.assert(Game.state.pursuits['test_job']?.active, 'Pursuit should be active');
    });

    harness.runTest('Pursuit: endPursuit effect deactivates pursuit', (t) => {
        Game.init();

        context.Pursuits['test_job'] = {
            configType: 'action',
            hoursCost: 40,
            exitEffects: [{ setFlag: 'job_ended' }]
        };

        PursuitManager.activatePursuit(Game, 'test_job');
        t.assert(Game.state.pursuits['test_job']?.active, 'Should be active after activation');

        EffectExecutor.execute([{ endPursuit: 'test_job' }], Game);

        t.assert(!Game.state.pursuits['test_job']?.active, 'Pursuit should be inactive');
        t.assert(Game.hasFlag('job_ended'), 'Exit effects should run');
    });

    harness.runTest('Pursuit: calculatePursuitHours sums active pursuit costs', (t) => {
        Game.init();

        context.Pursuits['job1'] = { configType: 'action', hoursCost: 40 };
        context.Pursuits['routine1'] = { configType: 'toggle', hoursCost: 10 };

        PursuitManager.activatePursuit(Game, 'job1');
        PursuitManager.activatePursuit(Game, 'routine1');
        Game.state.pursuits['routine1'].enabled = true;

        const hours = PursuitManager.calculatePursuitHours(Game);
        t.assertEqual(hours, 50, 'Should sum hours correctly');
    });

    harness.runTest('Pursuit: toggle disabled does not contribute hours', (t) => {
        Game.init();

        context.Pursuits['routine1'] = { configType: 'toggle', hoursCost: 10 };

        PursuitManager.activatePursuit(Game, 'routine1');
        Game.state.pursuits['routine1'].enabled = false;

        const hours = PursuitManager.calculatePursuitHours(Game);
        // Only the default pursuits (burn_midnight_oil, frugal_living) are there, both disabled
        t.assertEqual(hours, 0, 'Disabled toggle should not add hours');
    });

    harness.runTest('Pursuit: excess hours reduce actions', (t) => {
        Game.init();

        context.Pursuits['heavy_job'] = { configType: 'action', hoursCost: 70 };

        PursuitManager.activatePursuit(Game, 'heavy_job');
        const result = PursuitManager.calculateEffectiveActions(Game);

        // 70 - 50 = 20 excess, 20/20 = 1 action penalty
        // 3 - 1 = 2 guaranteed actions
        t.assertEqual(result.guaranteed, 2, 'Should have 2 guaranteed actions');
        t.assertEqual(result.bonusChance, 0, 'Should have no bonus chance');
    });

    harness.runTest('Pursuit: fractional penalty gives bonus chance', (t) => {
        Game.init();

        context.Pursuits['medium_job'] = { configType: 'action', hoursCost: 62 };

        PursuitManager.activatePursuit(Game, 'medium_job');
        const result = PursuitManager.calculateEffectiveActions(Game);

        // 62 - 50 = 12 excess, 12/20 = 0.6 penalty
        // 3 - 0.6 = 2.4, so 2 guaranteed + 40% chance
        t.assertEqual(result.guaranteed, 2, 'Should have 2 guaranteed actions');
        t.assert(result.bonusChance > 0.35 && result.bonusChance < 0.45, 'Should have ~40% bonus chance');
    });

    harness.runTest('Pursuit: weekly effects apply when processed', (t) => {
        Game.init();

        context.Pursuits['test_pursuit'] = {
            configType: 'action',
            hoursCost: 10,
            weeklyEffects: [{ modifyStat: ['money', 50] }]
        };

        const initialMoney = Game.getStat(Game.state.playerId, 'money');
        PursuitManager.activatePursuit(Game, 'test_pursuit');
        PursuitManager.processWeeklyEffects(Game);

        t.assertEqual(
            Game.getStat(Game.state.playerId, 'money'),
            initialMoney + 50,
            'Weekly effect should add money'
        );
    });

    harness.runTest('Pursuit: toggle weekly effects only apply when enabled', (t) => {
        Game.init();

        // frugal_living adds 10 money per week
        const initialMoney = Game.getStat(Game.state.playerId, 'money');

        // Disabled by default
        PursuitManager.processWeeklyEffects(Game);
        t.assertEqual(Game.getStat(Game.state.playerId, 'money'), initialMoney, 'Should not add money when disabled');

        // Enable it
        Game.state.pursuits['frugal_living'].enabled = true;
        PursuitManager.processWeeklyEffects(Game);
        t.assertEqual(Game.getStat(Game.state.playerId, 'money'), initialMoney + 10, 'Should add money when enabled');
    });

    harness.runTest('Pursuit: select option weekly effects use selected option', (t) => {
        Game.init();

        context.Pursuits['makeup'] = {
            configType: 'select',
            default: 'none',
            options: {
                none: { hoursCost: 0, weeklyEffects: [] },
                natural: { hoursCost: 2, weeklyEffects: [{ setFlag: 'wearing_makeup' }] }
            }
        };

        PursuitManager.activatePursuit(Game, 'makeup');
        Game.state.pursuits['makeup'].option = 'natural';
        PursuitManager.processWeeklyEffects(Game);

        t.assert(Game.hasFlag('wearing_makeup'), 'Should apply natural option effects');
    });

    harness.runTest('Condition: pursuitActive checks active state', (t) => {
        Game.init();

        context.Pursuits['test_pursuit'] = { configType: 'action', hoursCost: 10 };

        t.assert(
            !ConditionChecker.check({ pursuitActive: 'test_pursuit' }, Game),
            'Should fail when pursuit not active'
        );

        PursuitManager.activatePursuit(Game, 'test_pursuit');

        t.assert(
            ConditionChecker.check({ pursuitActive: 'test_pursuit' }, Game),
            'Should pass when pursuit active'
        );
    });

    harness.runTest('Condition: pursuitActive checks toggle enabled state', (t) => {
        Game.init();

        // frugal_living is a toggle, initialized but disabled by default
        t.assert(
            !ConditionChecker.check({ pursuitActive: 'frugal_living' }, Game),
            'Should fail when toggle disabled'
        );

        Game.state.pursuits['frugal_living'].enabled = true;

        t.assert(
            ConditionChecker.check({ pursuitActive: 'frugal_living' }, Game),
            'Should pass when toggle enabled'
        );
    });

    harness.runTest('Condition: pursuitOption checks selected option', (t) => {
        Game.init();

        context.Pursuits['makeup'] = {
            configType: 'select',
            options: { none: {}, natural: {} }
        };

        PursuitManager.activatePursuit(Game, 'makeup');
        Game.state.pursuits['makeup'].option = 'natural';

        t.assert(
            ConditionChecker.check({ pursuitOption: ['makeup', 'natural'] }, Game),
            'Should pass for correct option'
        );
        t.assert(
            !ConditionChecker.check({ pursuitOption: ['makeup', 'none'] }, Game),
            'Should fail for wrong option'
        );
    });

    harness.runTest('Condition: pursuitHours checks total hours', (t) => {
        Game.init();

        context.Pursuits['job'] = { configType: 'action', hoursCost: 40 };

        PursuitManager.activatePursuit(Game, 'job');

        t.assert(
            ConditionChecker.check({ pursuitHours: ['>=', 40] }, Game),
            'Should pass >= 40'
        );
        t.assert(
            !ConditionChecker.check({ pursuitHours: ['>', 50] }, Game),
            'Should fail > 50'
        );
    });

    harness.runTest('Pursuit: exitConditions triggers deactivation', (t) => {
        Game.init();

        context.Pursuits['temp_job'] = {
            configType: 'action',
            hoursCost: 40,
            exitConditions: { hasFlag: 'job_cancelled' },
            exitEffects: [{ setFlag: 'received_severance' }]
        };

        PursuitManager.activatePursuit(Game, 'temp_job');
        t.assert(Game.state.pursuits['temp_job'].active, 'Should be active initially');

        Game.setFlag('job_cancelled');
        PursuitManager.checkExitConditions(Game);

        t.assert(!Game.state.pursuits['temp_job'].active, 'Should deactivate');
        t.assert(Game.hasFlag('received_severance'), 'Should run exit effects');
    });

    harness.runTest('Effect: ensurePossession creates new object', (t) => {
        Game.init();

        EffectExecutor.execute([
            { ensurePossession: ['appearance_boost', { level: 1 }] }
        ], Game);

        const obj = Game.getCharacterObjectOfType(Game.state.playerId, 'appearance_boost');
        t.assert(obj, 'Should create object');
        t.assertEqual(obj.state.level, 1, 'Should have correct state');
    });

    harness.runTest('Effect: ensurePossession updates existing object', (t) => {
        Game.init();

        EffectExecutor.execute([
            { ensurePossession: ['appearance_boost', { level: 1 }] }
        ], Game);
        EffectExecutor.execute([
            { ensurePossession: ['appearance_boost', { level: 2 }] }
        ], Game);

        const objects = Game.getCharacterObjectsOfType(Game.state.playerId, 'appearance_boost');
        t.assertEqual(objects.length, 1, 'Should not duplicate');
        t.assertEqual(objects[0].state.level, 2, 'Should update level');
    });

    harness.runTest('Pursuit: exclusive tags detect conflicts', (t) => {
        Game.init();

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
    });

    harness.runTest('Pursuit: negative hoursCost gives back time', (t) => {
        Game.init();

        // burn_midnight_oil has -15 hours
        Game.state.pursuits['burn_midnight_oil'].enabled = true;

        // Add a job that uses 60 hours
        context.Pursuits['demanding_job'] = { configType: 'action', hoursCost: 60 };
        PursuitManager.activatePursuit(Game, 'demanding_job');

        const hours = PursuitManager.calculatePursuitHours(Game);
        // 60 - 15 = 45 hours
        t.assertEqual(hours, 45, 'Negative cost should reduce total hours');

        const result = PursuitManager.calculateEffectiveActions(Game);
        // 45 < 50, so no penalty
        t.assertEqual(result.guaranteed, 3, 'Should have full actions with negative offset');
    });

    // === Save/Load Tests (Multi-Slot) ===

    harness.runTest('Save: hasSave returns false initially', (t) => {
        t.assert(!Game.hasSave(), 'Should have no save initially');
    });

    harness.runTest('Save: save() writes to numbered slot', (t) => {
        Game.init();
        Game.save(0);

        t.assert(Game.hasSave(), 'Should have save after saving');
        const key = context.Config.saveKeyPrefix + '0';
        t.assert(mockLocalStorage.getItem(key), 'localStorage should have data at slot key');
    });

    harness.runTest('Save: save() writes to autosave slot', (t) => {
        Game.init();
        Game.save('autosave');

        const key = context.Config.autoSaveKey;
        t.assert(mockLocalStorage.getItem(key), 'localStorage should have autosave data');
    });

    harness.runTest('Save: save() includes metadata', (t) => {
        Game.init();
        Game.state.week = 7;
        Game.save(0);

        const key = context.Config.saveKeyPrefix + '0';
        const data = JSON.parse(mockLocalStorage.getItem(key));
        t.assert(data.meta, 'Save should have meta object');
        t.assertEqual(data.meta.week, 7, 'Meta should have correct week');
        t.assert(data.meta.savedAt, 'Meta should have savedAt timestamp');
        t.assert(data.meta.characterName, 'Meta should have character name');
    });

    harness.runTest('Save: load() restores state correctly', (t) => {
        Game.init();
        Game.setFlag('test_flag');
        Game.modifyStat(Game.state.playerId, 'health', 25);
        Game.state.week = 5;
        const originalPlayerId = Game.state.playerId;
        Game.save(0);

        // Reinitialize to reset state
        Game.init();
        t.assertEqual(Game.state.week, 1, 'Week should be 1 after reinit');
        t.assert(!Game.hasFlag('test_flag'), 'Flag should not exist after reinit');

        // Load saved state
        const loaded = Game.load(0);
        t.assert(loaded, 'load() should return true');
        t.assertEqual(Game.state.week, 5, 'Week should be restored to 5');
        t.assert(Game.hasFlag('test_flag'), 'Flag should be restored');
        t.assertEqual(Game.state.playerId, originalPlayerId, 'Player ID should be restored');
        t.assertEqual(Game.getStat(Game.state.playerId, 'health'), 75, 'Health should be restored');
    });

    harness.runTest('Save: load() returns false when no save exists', (t) => {
        mockLocalStorage.clear();
        const loaded = Game.load(0);
        t.assert(!loaded, 'load() should return false with no save');
    });

    harness.runTest('Save: nextId is preserved across save/load', (t) => {
        Game.init();
        // Create some entities to increment nextId
        Game.createCharacter('human', 'NPC1');
        Game.createCharacter('human', 'NPC2');
        const nextIdBefore = Game.nextId;
        Game.save(0);

        Game.init(); // Resets nextId
        t.assert(Game.nextId < nextIdBefore, 'nextId should reset on init');

        Game.load(0);
        t.assertEqual(Game.nextId, nextIdBefore, 'nextId should be restored');
    });

    harness.runTest('Save: getAllSaveSlots returns correct count', (t) => {
        Game.init();
        const slots = Game.getAllSaveSlots();
        // 1 autosave + 10 numbered slots
        t.assertEqual(slots.length, 11, 'Should return 11 slots');
        t.assertEqual(slots[0].slot, 'autosave', 'First slot should be autosave');
        t.assertEqual(slots[1].slot, 0, 'Second slot should be slot 0');
    });

    harness.runTest('Save: getSaveSlotInfo returns exists=false for empty slot', (t) => {
        Game.init();
        const info = Game.getSaveSlotInfo(5);
        t.assert(!info.exists, 'Empty slot should have exists=false');
        t.assertEqual(info.slot, 5, 'Slot number should be returned');
    });

    harness.runTest('Save: getSaveSlotInfo returns metadata for filled slot', (t) => {
        Game.init();
        Game.state.week = 10;
        Game.save(3);

        const info = Game.getSaveSlotInfo(3);
        t.assert(info.exists, 'Filled slot should have exists=true');
        t.assertEqual(info.slot, 3, 'Slot number should match');
        t.assertEqual(info.meta.week, 10, 'Week should be in metadata');
    });

    harness.runTest('Save: deleteSave removes save data', (t) => {
        Game.init();
        Game.save(2);
        t.assert(Game.getSaveSlotInfo(2).exists, 'Slot 2 should exist after save');

        Game.deleteSave(2);
        t.assert(!Game.getSaveSlotInfo(2).exists, 'Slot 2 should not exist after delete');
    });

    harness.runTest('Save: different slots are independent', (t) => {
        Game.init();
        Game.state.week = 3;
        Game.save(0);

        Game.state.week = 7;
        Game.save(1);

        const info0 = Game.getSaveSlotInfo(0);
        const info1 = Game.getSaveSlotInfo(1);
        t.assertEqual(info0.meta.week, 3, 'Slot 0 should have week 3');
        t.assertEqual(info1.meta.week, 7, 'Slot 1 should have week 7');
    });

    harness.runTest('Save: loading old save without pursuits field works', (t) => {
        Game.init();
        Game.save(0);

        // Simulate old save without pursuits
        const key = context.Config.saveKeyPrefix + '0';
        const savedData = JSON.parse(mockLocalStorage.getItem(key));
        delete savedData.state.pursuits;
        mockLocalStorage.setItem(key, JSON.stringify(savedData));

        Game.load(0);

        // Game should still work without pursuits field
        t.assert(Game.state !== null, 'State should be loaded');
    });

    harness.runTest('Save: pursuit settings are preserved across save/load', (t) => {
        const PursuitManager = context.PursuitManager;
        Game.init();

        // Modify pursuit settings (toggle the burn_midnight_oil pursuit)
        Game.state.pursuits['burn_midnight_oil'].enabled = true;

        // Save and reinitialize
        Game.save(0);
        Game.init();

        // After init, pursuit should be at default (disabled)
        t.assert(!Game.state.pursuits['burn_midnight_oil'].enabled, 'Pursuit should be disabled after init');

        // Load should restore the enabled state
        Game.load(0);
        t.assert(Game.state.pursuits['burn_midnight_oil'].enabled, 'Pursuit should be enabled after load');
    });

    // Print summary
    const success = harness.printSummary();
    process.exit(success ? 0 : 1);
}

// Run if executed directly
runTests();
