/**
 * Test Suite: ASL Scalable Lexicon & Smart NLP Resolver
 * ======================================================
 * Tests:
 * 1. Resolution Priority Order (Phrase > Exact > Lemma > Synonym > Composed > Number > Fingerspell)
 * 2. "Only exact" toggle behavior
 * 3. Preload & Cache mechanics
 * 4. Synthetic 3,000-entry index performance benchmark (<10ms per sentence)
 */

const fs = require('fs');
const path = require('path');
const LexiconService = require('../src/lexicon_service.js');

async function runTests() {
    console.log('====================================================');
    console.log('   ASL Lexicon & NLP Resolver Test Suite');
    console.log('====================================================');

    const service = new LexiconService();

    // Mock fetch for Node test environment
    global.fetch = async (url) => {
        const cleanPath = url.replace('data/lexicon/', '');
        const fullPath = path.join(__dirname, '..', 'data', 'lexicon', cleanPath);
        if (fs.existsSync(fullPath)) {
            const data = fs.readFileSync(fullPath, 'utf-8');
            return {
                ok: true,
                status: 200,
                json: async () => JSON.parse(data)
            };
        }
        return {
            ok: false,
            status: 404,
            json: async () => ({})
        };
    };

    await service.init('data/lexicon/');
    console.log(`[+] Initialized Lexicon with ${service.index.length} real signs.`);

    let passed = 0;
    let failed = 0;

    function assert(condition, desc) {
        if (condition) {
            console.log(`  [PASS] ${desc}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${desc}`);
            failed++;
        }
    }

    // Test 1: Exact gloss match
    console.log('\n--- Test 1: Exact Gloss Match ---');
    const resExact = service.resolveSentence('hello');
    assert(resExact.length === 1 && resExact[0].matchedBy === 'exact' && resExact[0].signId === 'hello',
        `'hello' resolves to exact sign (got ${resExact[0]?.matchedBy}, signId=${resExact[0]?.signId})`);

    // Test 2: Phrase match takes priority over individual words
    console.log('\n--- Test 2: Longest Multi-word Phrase Match ---');
    const resPhrase = service.resolveSentence('thank you very much');
    assert(resPhrase.length > 0 && resPhrase[0].matchedBy === 'phrase' && resPhrase[0].signId === 'thank_you',
        `'thank you' resolves as a phrase unit 'thank_you' (got ${resPhrase[0]?.matchedBy})`);

    // Test 3: Lemma match (inflection -> base sign)
    console.log('\n--- Test 3: Lemma Match ---');
    const resLemma = service.resolveSentence('helping');
    assert(resLemma.length === 1 && resLemma[0].matchedBy === 'lemma' && resLemma[0].signId === 'help',
        `'helping' resolves via lemma to 'help' (got ${resLemma[0]?.matchedBy}, signId=${resLemma[0]?.signId})`);

    // Test 4: Synonym match
    console.log('\n--- Test 4: Synonym Match ---');
    const resSynonym = service.resolveSentence('glad');
    assert(resSynonym.length === 1 && resSynonym[0].matchedBy === 'synonym' && resSynonym[0].signId === 'happy',
        `'glad' resolves via synonym to 'happy' (got ${resSynonym[0]?.matchedBy}, signId=${resSynonym[0]?.signId})`);

    // Test 5: Composed / Derivation Hints
    console.log('\n--- Test 5: Composed Compound Derivation ---');
    const resCompound = service.resolveSentence('teacher');
    assert(resCompound.length >= 1 && resCompound[0].matchedBy === 'composed' && resCompound[0].signId === 'teach',
        `'teacher' decomposes into teach + person (got ${resCompound.map(c=>c.matchedBy).join(', ')})`);

    // Test 6: Number resolution
    console.log('\n--- Test 6: Number Resolution ---');
    const resNum = service.resolveSentence('5');
    assert(resNum.length === 1 && resNum[0].matchedBy === 'number',
        `'5' resolves as number match (got ${resNum[0]?.matchedBy})`);

    // Test 7: Fingerspelling fallback
    console.log('\n--- Test 7: Fingerspelling Fallback ---');
    const resFingerspell = service.resolveSentence('supercalifragilistic');
    assert(resFingerspell.length === 1 && resFingerspell[0].matchedBy === 'fingerspell' && resFingerspell[0].signId === null,
        `Unrecognized word falls back to fingerspell (got ${resFingerspell[0]?.matchedBy})`);

    // Test 8: "Only exact" toggle disables NLP fallbacks
    console.log('\n--- Test 8: "Only Exact" Toggle ---');
    const resExactOnly = service.resolveSentence('glad', { onlyExact: true });
    assert(resExactOnly.length === 1 && resExactOnly[0].matchedBy === 'fingerspell',
        `With onlyExact=true, 'glad' falls back to fingerspelling instead of synonym`);

    // Test 9: Preload sentence signs
    console.log('\n--- Test 9: Preload Sentence Signs ---');
    const sentenceToPreload = service.resolveSentence('hello friend');
    await service.preloadSentence(sentenceToPreload);
    assert(sentenceToPreload[0].signData && sentenceToPreload[0].signData.frames.length > 0,
        `Preload attached sign landmark data to unit (frames=${sentenceToPreload[0].signData?.frames?.length})`);

    // Test 10: Scalability Benchmark (3,000 Synthetic Signs Index)
    console.log('\n--- Test 10: 3,000-Sign Index Benchmark ---');
    const syntheticService = new LexiconService();
    const syntheticSigns = [];
    for (let i = 1; i <= 3000; i++) {
        syntheticSigns.push({
            id: `sign_${i}`,
            glosses: [`SYNTH_${i}`, `WORD_${i}`],
            synonyms: [`syn_${i}`],
            category: 'Benchmark',
            frameCount: 20,
            file: `signs/sign_${i}.json`,
            source: 'Synthetic Benchmark',
            license: 'CC0'
        });
    }
    syntheticService.index = syntheticSigns;
    syntheticService.buildLookups();

    const sampleSentences = [
        "word_1 word_2 word_3 word_4 word_5",
        "synth_100 synth_500 synth_1000 synth_2000 synth_2990",
        "hello how are you today my dear friend",
        "word_2500 nonexistingword word_1234 somethingelse"
    ];

    const iterations = 100;
    const startTime = Date.now();
    for (let it = 0; it < iterations; it++) {
        for (const s of sampleSentences) {
            syntheticService.resolveSentence(s);
        }
    }
    const elapsed = Date.now() - startTime;
    const avgPerSentence = elapsed / (iterations * sampleSentences.length);

    console.log(`  Processed ${iterations * sampleSentences.length} sentences across 3,000-sign index in ${elapsed}ms.`);
    console.log(`  Average time per sentence: ${avgPerSentence.toFixed(3)}ms (Target: < 10.0ms)`);
    assert(avgPerSentence < 10.0, `Index resolution speed is well under 10ms threshold (< 10ms)`);

    // Test 11: AI-Rewrite Output Validator (rejects invented glosses)
    console.log('\n--- Test 11: AI-Rewrite Output Validation ---');
    function validateAIRewrite(rewritten, allowedGlosses, lexService) {
        if (!rewritten || typeof rewritten !== 'string') return false;
        const words = rewritten.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
        const allowedSet = new Set(allowedGlosses.map(g => g.toLowerCase()));
        for (const w of words) {
            if (!w) continue;
            if (!isNaN(w)) continue;
            if (allowedSet.has(w) || lexService.hasSign(w)) continue;
            return false;
        }
        return true;
    }

    const allowed = ['HELLO', 'HOW', 'YOU', 'HAPPY', 'GOOD'];
    const validRewrite = "Hello you happy";
    const invalidRewrite = "Hello you flabbergasted";

    assert(validateAIRewrite(validRewrite, allowed, service) === true,
        'Valid AI rewrite with authorized glosses passes validation');
    assert(validateAIRewrite(invalidRewrite, allowed, service) === false,
        'AI rewrite containing invented/unauthorized gloss is strictly rejected');

    console.log('\n====================================================');
    console.log(`Test Results: ${passed} Passed, ${failed} Failed.`);
    console.log('====================================================');

    process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});

