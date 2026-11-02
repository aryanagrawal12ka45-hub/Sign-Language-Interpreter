// tests/test_text_to_sign_generation.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Mock browser globals for testing avatar.js
globalThis.window = {
    addEventListener: () => {},
    location: { search: '' },
    SpeechRecognition: null,
    webkitSpeechRecognition: null
};
globalThis.document = {
    addEventListener: () => {},
    getElementById: () => null,
    querySelectorAll: () => []
};
globalThis.navigator = { clipboard: { writeText: async () => {} } };
globalThis.THREE = {
    Vector3: class { constructor(x,y,z) { this.x=x; this.y=y; this.z=z; } },
    Euler: class { constructor(x,y,z) { this.x=x; this.y=y; this.z=z; } },
    Quaternion: class {
        constructor() { this._q = [0,0,0,1]; }
        setFromEuler() { return this; }
        clone() { return new globalThis.THREE.Quaternion(); }
        multiply() { return this; }
    },
    GLTFLoader: class { load() {} }
};

// Load LexiconService and sentences.json
const LexiconService = require('../src/lexicon_service.js');
const sentencesData = JSON.parse(fs.readFileSync('data/sentences.json', 'utf8'));

test('sentences.json contains at least 100 sentences across 11 categories', () => {
    assert.ok(sentencesData.length >= 100, `Expected at least 100 sentences, got ${sentencesData.length}`);

    const categories = new Set(sentencesData.map(s => s.category));
    assert.ok(categories.size >= 11, `Expected 11 categories, got ${categories.size}`);

    const counts = {};
    for (const s of sentencesData) {
        counts[s.category] = (counts[s.category] || 0) + 1;
        assert.ok(s.id, 'Every sentence must have an id');
        assert.ok(s.text, 'Every sentence must have text');
        assert.ok(['beginner', 'intermediate', 'advanced'].includes(s.difficulty), `Invalid difficulty: ${s.difficulty}`);
        assert.ok(Array.isArray(s.signs) && s.signs.length > 0, `Signs must be non-empty array in sentence ${s.id}`);
    }

    for (const [cat, count] of Object.entries(counts)) {
        assert.ok(count >= 10, `Category '${cat}' has only ${count} sentences (minimum 10 required)`);
    }
});

test('LexiconService resolves whole words and sentences to signs', async () => {
    globalThis.fetch = async (url) => {
        const file = url.replace(/^\.\//, '').replace(/^\//, '');
        return { ok: true, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) };
    };

    const lex = new LexiconService();
    await lex.init();

    // Test greetings
    const u1 = lex.resolveSentence("Hello, how are you?");
    assert.ok(u1.length >= 3);
    assert.equal(u1[0].unit, "HELLO");
    assert.equal(u1[1].unit, "HOW");

    // Test family
    const u2 = lex.resolveSentence("I love my mother and father.");
    assert.ok(u2.some(u => u.unit === "LOVE"));
    assert.ok(u2.some(u => u.unit === "MOTHER"));
    assert.ok(u2.some(u => u.unit === "FATHER"));

    // Test school
    const u3 = lex.resolveSentence("We learn sign language at school.");
    assert.ok(u3.some(u => u.unit === "LEARN"));
    assert.ok(u3.some(u => u.unit === "SCHOOL"));
});

test('Avatar sign animation queue generates non-empty keyframes for whole-word signs and fingerspelling', async () => {
    // Read avatar.js code and execute inside sandbox
    const avatarCode = fs.readFileSync('avatar.js', 'utf8');

    // Extract ASL_ALPHABET and ASL_WORD_SIGNS from avatar.js
    const context = {
        console: console,
        Math: Math,
        Object: Object,
        Array: Array,
        THREE: globalThis.THREE,
        window: globalThis.window,
        document: globalThis.document,
        LexiconService: LexiconService
    };

    vm.createContext(context);
    vm.runInContext(avatarCode, context);

    // Verify ASL_ALPHABET exists and is case-insensitive
    const ASL_ALPHABET = context.window.ASL_ALPHABET || context.ASL_ALPHABET;
    assert.ok(ASL_ALPHABET, 'ASL_ALPHABET must be exported');
    assert.equal(typeof ASL_ALPHABET['A'], 'function', 'Uppercase A must exist');
    assert.equal(typeof ASL_ALPHABET['a'], 'function', 'Lowercase a must exist');
    assert.equal(typeof ASL_ALPHABET['Z'], 'function', 'Uppercase Z must exist');
    assert.equal(typeof ASL_ALPHABET['z'], 'function', 'Lowercase z must exist');

    // Test generating frames for letter 'A'
    const runtimeA = { animations: [], characters: [] };
    ASL_ALPHABET['a'](runtimeA);
    assert.ok(runtimeA.animations.length > 0, 'Letter A must generate frames');
    assert.ok(runtimeA.animations[0].length > 0, 'Frame must contain bone deltas');

    // Verify ASL_WORD_SIGNS has expanded vocabulary
    const ASL_WORD_SIGNS = context.window.ASL_WORD_SIGNS || context.ASL_WORD_SIGNS;
    assert.ok(ASL_WORD_SIGNS, 'ASL_WORD_SIGNS must exist');

    const expectedSigns = [
        'HELLO', 'THANK_YOU', 'PLEASE', 'HOW', 'FAMILY', 'FRIEND',
        'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'SCHOOL', 'BOOK',
        'READ', 'WRITE', 'LEARN', 'TEACH', 'WORK', 'SLEEP', 'WANT',
        'NEED', 'WHO', 'WHEN', 'WHY', 'WHERE', 'FOOD', 'WATER',
        'CAR', 'DOCTOR', 'HOSPITAL', 'MONEY', 'HAPPY', 'SAD'
    ];

    for (const sign of expectedSigns) {
        assert.equal(typeof ASL_WORD_SIGNS[sign], 'function', `Sign '${sign}' must be defined in ASL_WORD_SIGNS`);
        // Test frame generation
        const runtimeSign = { animations: [], characters: [] };
        ASL_WORD_SIGNS[sign](runtimeSign);
        assert.ok(runtimeSign.animations.length > 0, `Sign '${sign}' must generate non-empty animation frames`);
        assert.ok(runtimeSign.animations[0].length > 0, `Sign '${sign}' frame 0 must contain bone deltas`);
    }

    console.log(`[PASS] Verified ${expectedSigns.length} core word signs generate valid kinematic keyframes.`);
});
