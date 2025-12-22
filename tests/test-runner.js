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
        Game: null,
        CharacterCreation: null,
        TextInterpolation: null,
        ConditionChecker: null,
        EffectExecutor: null,
        Handlers: null
    });

    const basePath = path.join(__dirname, '..');

    // Load JSON data files
    context.Actions = JSON.parse(fs.readFileSync(path.join(basePath, 'data/actions.json'), 'utf8'));
    context.Events = JSON.parse(fs.readFileSync(path.join(basePath, 'data/events/events.json'), 'utf8'));
    context.Stories = JSON.parse(fs.readFileSync(path.join(basePath, 'data/stories/stories.json'), 'utf8'));

    // JS files must be loaded in dependency order
    const files = [
        'data/config.js',
        'data/stats.js',
        'data/templates/characters.js',
        'data/templates/objects.js',
        'data/creation-choices.js',
        'js/text-interpolation.js',
        'js/condition-checker.js',
        'js/effect-executor.js',
        'js/handlers.js',
        'js/character-creation.js',
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

    // Print summary
    const success = harness.printSummary();
    process.exit(success ? 0 : 1);
}

// Run if executed directly
runTests();
