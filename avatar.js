/**
 * Sign Language Studio - 3D Neural Avatar & ASL Text-to-Sign Engine
 * =================================================================
 * Real-time WebGL Three.js skeletal animation runtime for American Sign Language (ASL).
 * Features:
 *   - 3D Adobe Mixamo Y-Bot humanoid avatar with dynamic shaders & materials:
 *       • Signature Turquoise Robot (mathematical radial gradient falloff, glowing visor)
 *       • Cyber Stealth (deep obsidian titanium, graphite joints, emerald laser accents)
 *       • Classic Titanium (clean silver pearl metallic armor)
 *       • Stylized Human Rig (procedural face, hair, and facial features)
 *   - Authentic One-Handed ASL Fingerspelling (Letters A through Z)
 *   - 35+ Fully Articulated ASL Whole-Word Signs (Social, Questions, Actions, People, Daily)
 *   - Offline ASL Text-to-Gloss NLP engine with grammar reordering (Time-first, SOV, WH-final)
 *   - Real-time interactive gloss timeline with synchronized active-chip highlighting
 *   - Web Speech API integration for natural voice-to-sign translation
 *   - Full playback controls (Play, Pause mid-pose, Resume, Stop to rest, Replay, Speed 0.5x-1.5x)
 */

(function () {
    'use strict';

    // =========================================================================
    // 1. ASL VOCABULARY & GRAMMAR ENGINE
    // =========================================================================

    // Contraction expansions
    const CONTRACTIONS = {
        "don't": "do not", "doesn't": "does not", "didn't": "did not",
        "can't": "can not", "cannot": "can not", "couldn't": "could not",
        "won't": "will not", "wouldn't": "would not", "shouldn't": "should not",
        "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
        "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
        "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is",
        "it's": "it is", "we're": "we are", "they're": "they are",
        "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
        "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will",
        "what's": "what is", "where's": "where is", "who's": "who is", "how's": "how is",
        "let's": "let us"
    };

    // Common English lemmatizations
    const LEMMA_MAP = {
        "thanks": "THANK_YOU",
        "thank": "THANK_YOU",
        "hi": "HELLO",
        "hey": "HELLO",
        "eating": "EAT",
        "ate": "EAT",
        "eats": "EAT",
        "drinking": "DRINK",
        "drank": "DRINK",
        "drinks": "DRINK",
        "helping": "HELP",
        "helped": "HELP",
        "helps": "HELP",
        "wanted": "WANT",
        "wants": "WANT",
        "wanting": "WANT",
        "needed": "NEED",
        "needs": "NEED",
        "needing": "NEED",
        "liked": "LIKE",
        "likes": "LIKE",
        "liking": "LIKE",
        "knowing": "KNOW",
        "knew": "KNOW",
        "knows": "KNOW",
        "loving": "LOVE",
        "loved": "LOVE",
        "loves": "LOVE",
        "waiting": "WAIT",
        "waits": "WAIT",
        "stopping": "STOP",
        "stops": "STOP",
        "asked": "ASK",
        "asking": "ASK",
        "asks": "ASK",
        "sleeps": "SLEEP",
        "sleeping": "SLEEP",
        "slept": "SLEEP",
        "going": "GO",
        "went": "GO",
        "goes": "GO",
        "coming": "COME",
        "came": "COME",
        "comes": "COME",
        "me": "I",
        "my": "MY",
        "mine": "MY",
        "your": "YOUR",
        "yours": "YOUR",
        "please": "PLEASE",
        "sorry": "SORRY",
        "yes": "YES",
        "yeah": "YES",
        "yep": "YES",
        "no": "NO",
        "nope": "NO",
        "good": "GOOD",
        "great": "GOOD",
        "bad": "BAD",
        "water": "WATER",
        "peace": "PEACE",
        "more": "MORE",
        "time": "TIME",
        "home": "HOME",
        "person": "PERSON",
        "again": "AGAIN",
        "what": "WHAT",
        "where": "WHERE",
        "who": "WHO",
        "why": "WHY",
        "when": "WHEN",
        "how": "HOW"
    };

    // Temporal markers placed at beginning of ASL sentences
    const ASL_TIME_WORDS = new Set([
        "TODAY", "TOMORROW", "YESTERDAY", "NOW", "MORNING", "NIGHT", "SOON", "LATER", "TIME"
    ]);

    // WH-Question markers placed at end of ASL sentences
    const ASL_WH_WORDS = new Set([
        "WHAT", "WHERE", "WHY", "WHO", "WHEN", "HOW"
    ]);

    // Negations placed at end of ASL clauses
    const ASL_NEGATIONS = new Set([
        "NOT", "NO", "NEVER"
    ]);

    // Stopwords dropped in ASL grammar
    const ASL_STOPWORDS = new Set([
        "is", "am", "are", "was", "were", "be", "being", "been",
        "a", "an", "the", "to", "of", "and", "or", "in", "at", "for"
    ]);

    /**
     * Converts English text to structured ASL Gloss tokens.
     */
    function textToASLGloss(text, fingerspellOnly = false) {
        if (!text || typeof text !== 'string') return [];

        let cleaned = text.toLowerCase();
        // Expand contractions
        for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
            cleaned = cleaned.replace(new RegExp(`\\b${contraction}\\b`, 'g'), expansion);
        }

        // Tokenize words
        const rawTokens = cleaned.replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
        if (rawTokens.length === 0) return [];

        if (fingerspellOnly) {
            return rawTokens.map(word => ({
                token: word.toUpperCase(),
                isFingerspelling: true,
                letters: word.toUpperCase().split('')
            }));
        }

        // Filter and lemmatize
        const filtered = [];
        for (const word of rawTokens) {
            if (ASL_STOPWORDS.has(word)) continue;
            const lemma = LEMMA_MAP[word] || word.toUpperCase();
            filtered.push(lemma);
        }

        // Apply ASL grammatical reordering:
        // 1. Time markers at start
        // 2. Base content (Subject-Object-Verb)
        // 3. Negations toward end
        // 4. WH-question words at very end
        const timeTokens = [];
        const whTokens = [];
        const negTokens = [];
        const coreTokens = [];

        for (const t of filtered) {
            if (ASL_TIME_WORDS.has(t)) {
                timeTokens.push(t);
            } else if (ASL_WH_WORDS.has(t)) {
                whTokens.push(t);
            } else if (ASL_NEGATIONS.has(t)) {
                negTokens.push(t);
            } else {
                coreTokens.push(t);
            }
        }

        const reordered = [...timeTokens, ...coreTokens, ...negTokens, ...whTokens];
        if (reordered.length === 0 && rawTokens.length > 0) {
            // Fallback if all words were filtered out
            reordered.push(rawTokens[0].toUpperCase());
        }

        // Map tokens into items with fingerspelling flag
        return reordered.map(token => {
            const isKnownWord = Boolean(ASL_WORD_SIGNS[token]);
            return {
                token: token,
                isFingerspelling: !isKnownWord,
                letters: isKnownWord ? null : token.split('')
            };
        });
    }

    // =========================================================================
    // 2. PROCEDURAL ASL ANIMATION DEFINITIONS (ON MIXAMO RIG)
    // =========================================================================

    /**
     * Resets fingers and arms smoothly to natural signing baseline.
     */
    function defaultPose(runtime) {
        runtime.characters.push(' ');
        const a = [];
        // Slight neck tilt forward
        a.push(["mixamorigNeck", "rotation", "x", Math.PI / 16, "+"]);

        // Left Arm relaxed at side with elbow bent
        a.push(["mixamorigLeftArm", "rotation", "x", 0.05, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -Math.PI / 3.4, "-"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -Math.PI / 1.7, "-"]);

        // Right Arm relaxed at side with elbow bent
        a.push(["mixamorigRightArm", "rotation", "x", 0.05, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", Math.PI / 3.4, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", Math.PI / 1.7, "+"]);

        runtime.animations.push(a);
    }

    // --- Helper for standard right-arm signing presentation position ---
    function poseRightArmUp(a) {
        a.push(["mixamorigRightArm", "rotation", "x", -0.12, "-"]);
        a.push(["mixamorigRightArm", "rotation", "y", 0.22, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.95, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.95, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "z", 0.12, "+"]);
        a.push(["mixamorigRightHand", "rotation", "y", 0.25, "+"]);
    }

    function resetRightArm(a) {
        a.push(["mixamorigRightArm", "rotation", "x", 0.05, "+"]);
        a.push(["mixamorigRightArm", "rotation", "y", 0, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", Math.PI / 3.4, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", Math.PI / 1.7, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
        a.push(["mixamorigRightHand", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHand", "rotation", "y", 0, "-"]);
        a.push(["mixamorigRightHand", "rotation", "z", 0, "-"]);
    }

    // --- Helper to curl a single finger (joints 1, 2, 3) ---
    function curlFinger(a, finger, angle = Math.PI / 2) {
        a.push([`mixamorigRightHand${finger}1`, "rotation", "z", angle, angle > 0 ? "+" : "-"]);
        a.push([`mixamorigRightHand${finger}2`, "rotation", "z", angle, angle > 0 ? "+" : "-"]);
        a.push([`mixamorigRightHand${finger}3`, "rotation", "z", angle, angle > 0 ? "+" : "-"]);
    }

    // --- Helper to uncurl a single finger ---
    function uncurlFinger(a, finger) {
        curlFinger(a, finger, 0);
    }

    // =========================================================================
    // 3. AUTHENTIC ONE-HANDED ASL ALPHABET (A - Z)
    // =========================================================================
    const ASL_ALPHABET = {};

    // Letter A: Closed fist, thumb held upright against the side of index finger
    ASL_ALPHABET['A'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        // Thumb alongside index
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 4, "+"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 6, "+"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", -Math.PI / 6, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", 0, "+"]);
        runtime.animations.push(a);
    };

    // Letter B: 4 fingers upright together, thumb folded across palm
    ASL_ALPHABET['B'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Middle');
        uncurlFinger(a, 'Ring');
        uncurlFinger(a, 'Pinky');
        // Thumb folded across palm
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.2, "+"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 3, "+"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", -Math.PI / 5, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", 0, "+"]);
        runtime.animations.push(a);
    };

    // Letter C: Curved fingers and thumb forming an open "C" arc facing sideways
    ASL_ALPHABET['C'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 4.2);
        curlFinger(a, 'Middle', Math.PI / 4.2);
        curlFinger(a, 'Ring', Math.PI / 4.2);
        curlFinger(a, 'Pinky', Math.PI / 4.2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 3, "+"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "y", Math.PI / 3.5, "+"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", -Math.PI / 5, "-"]);
        a.push(["mixamorigRightHand", "rotation", "y", Math.PI / 2.8, "+"]); // turned sideways
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "y", 0, "-"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", 0, "+"]);
        runtime.animations.push(a);
    };

    // Letter D: Index finger straight up; thumb touches middle, ring, and pinky tips in a ring
    ASL_ALPHABET['D'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        curlFinger(a, 'Middle', Math.PI / 2.3);
        curlFinger(a, 'Ring', Math.PI / 2.3);
        curlFinger(a, 'Pinky', Math.PI / 2.3);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.3, "+"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", -Math.PI / 4, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", 0, "+"]);
        runtime.animations.push(a);
    };

    // Letter E: All 4 fingertips curled tightly down resting on top of thumb folded underneath
    ASL_ALPHABET['E'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2.1);
        curlFinger(a, 'Middle', Math.PI / 2.1);
        curlFinger(a, 'Ring', Math.PI / 2.1);
        curlFinger(a, 'Pinky', Math.PI / 2.1);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2, "+"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", -Math.PI / 3, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", 0, "+"]);
        runtime.animations.push(a);
    };

    // Letter F: Index and thumb tips touching in circle (OK sign), middle, ring, pinky straight up
    ASL_ALPHABET['F'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightHandIndex1", "rotation", "z", Math.PI / 2.5, "+"]);
        a.push(["mixamorigRightHandIndex2", "rotation", "z", Math.PI / 2.5, "+"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.4, "+"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", -Math.PI / 3, "-"]);
        uncurlFinger(a, 'Middle');
        uncurlFinger(a, 'Ring');
        uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", 0, "+"]);
        runtime.animations.push(a);
    };

    // Letter G: Index and thumb pointing horizontally forward in parallel, other fingers closed
    ASL_ALPHABET['G'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        uncurlFinger(a, 'Index');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 4, "+"]);
        a.push(["mixamorigRightHand", "rotation", "y", Math.PI / 2.2, "+"]); // turned sideways
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter H: Index and Middle fingers extended together horizontally forward
    ASL_ALPHABET['H'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Middle');
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 3, "+"]);
        a.push(["mixamorigRightHand", "rotation", "y", Math.PI / 2.2, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter I: Pinky finger straight up; all other fingers curled into fist
    ASL_ALPHABET['I'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter J: Pinky upright, swooping downward and curving up into a "J" trace
    ASL_ALPHABET['J'] = function (runtime) {
        // Stage 1: Pinky up
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);

        // Stage 2: Swoop down and rotate wrist (draw J)
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        a.push(["mixamorigRightHand", "rotation", "z", -0.55, "-"]);
        runtime.animations.push(a);

        // Stage 3: Return
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring');
        runtime.animations.push(a);
    };

    // Letter K: Index straight up, middle pointed forward, thumb between them
    ASL_ALPHABET['K'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        a.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI / 4, "+"]);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 3.5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter L: Index straight up, thumb wide at 90 degrees ("L")
    ASL_ALPHABET['L'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 2.2, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter M: Fist with thumb folded under first 3 fingers (index, middle, ring)
    ASL_ALPHABET['M'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.1, "+"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 3.5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter N: Fist with thumb folded under first 2 fingers (index, middle)
    ASL_ALPHABET['N'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.3, "+"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 4.5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter O: All fingertips touch thumb tip forming a rounded "O"
    ASL_ALPHABET['O'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 3);
        curlFinger(a, 'Middle', Math.PI / 3);
        curlFinger(a, 'Ring', Math.PI / 3);
        curlFinger(a, 'Pinky', Math.PI / 3);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.2, "+"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", -Math.PI / 3, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb2", "rotation", "y", 0, "+"]);
        runtime.animations.push(a);
    };

    // Letter P: K handshape pointing downward
    ASL_ALPHABET['P'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        a.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI / 4, "+"]);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHand", "rotation", "z", -Math.PI / 2.2, "-"]); // pointing down
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // Letter Q: G handshape pointing downward
    ASL_ALPHABET['Q'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 4, "+"]);
        a.push(["mixamorigRightHand", "rotation", "z", -Math.PI / 2.2, "-"]); // down
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter R: Index and Middle fingers extended upright and crossed
    ASL_ALPHABET['R'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Middle');
        a.push(["mixamorigRightHandMiddle1", "rotation", "y", -0.25, "-"]); // cross over index
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        a.push(["mixamorigRightHandMiddle1", "rotation", "y", 0, "+"]);
        uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter S: Tight fist with thumb folded horizontally across front of fingers
    ASL_ALPHABET['S'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        // Thumb wrapped across front
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 1.8, "+"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 4, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter T: Fist with thumb tucked between index and middle finger
    ASL_ALPHABET['T'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.8, "+"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter U: Index and Middle fingers upright together, thumb across ring & pinky
    ASL_ALPHABET['U'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Middle');
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter V: Index and Middle fingers extended in a spread "V" / peace sign
    ASL_ALPHABET['V'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Middle');
        a.push(["mixamorigRightHandIndex1", "rotation", "y", -0.16, "-"]);
        a.push(["mixamorigRightHandMiddle1", "rotation", "y", 0.16, "+"]);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        a.push(["mixamorigRightHandIndex1", "rotation", "y", 0, "+"]);
        a.push(["mixamorigRightHandMiddle1", "rotation", "y", 0, "-"]);
        uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter W: Index, Middle, Ring fingers extended upright in "W" / 3
    ASL_ALPHABET['W'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Middle');
        uncurlFinger(a, 'Ring');
        a.push(["mixamorigRightHandIndex1", "rotation", "y", -0.18, "-"]);
        a.push(["mixamorigRightHandRing1", "rotation", "y", 0.18, "+"]);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.4, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        a.push(["mixamorigRightHandIndex1", "rotation", "y", 0, "+"]);
        a.push(["mixamorigRightHandRing1", "rotation", "y", 0, "-"]);
        uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter X: Index finger hooked like a talon, other fingers curled into fist
    ASL_ALPHABET['X'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightHandIndex1", "rotation", "z", 0, "-"]);
        a.push(["mixamorigRightHandIndex2", "rotation", "z", Math.PI / 2.2, "+"]);
        a.push(["mixamorigRightHandIndex3", "rotation", "z", Math.PI / 2.2, "+"]);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter Y: Thumb and Pinky extended wide ("shaka" / hang loose)
    ASL_ALPHABET['Y'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI / 2.2, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "-"]);
        runtime.animations.push(a);
    };

    // Letter Z: Index finger extended forward, traces "Z" in the air
    ASL_ALPHABET['Z'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        runtime.animations.push(a);

        // Path 1: Top bar right
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.3, "+"]);
        runtime.animations.push(a);

        // Path 2: Diagonal down left
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", -0.3, "-"]);
        a.push(["mixamorigRightHand", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        // Path 3: Bottom bar right
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.3, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // =========================================================================
    // 4. ASL WHOLE-WORD SIGNS
    // =========================================================================
    const ASL_WORD_SIGNS = {};

    // HELLO - Salute from forehead / brow outward
    ASL_WORD_SIGNS['HELLO'] = function (runtime) {
        let a = [];
        // Hand to brow
        a.push(["mixamorigRightArm", "rotation", "x", -0.85, "-"]);
        a.push(["mixamorigRightArm", "rotation", "y", 0.45, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 1.25, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.3, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", -0.65, "-"]);
        a.push(["mixamorigNeck", "rotation", "x", 0.08, "+"]);
        runtime.animations.push(a);

        // Salute outward
        a = [];
        a.push(["mixamorigRightArm", "rotation", "y", 0.65, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.7, "-"]);
        a.push(["mixamorigRightHand", "rotation", "x", 0.2, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // THANK_YOU - Flat hand touches chin and extends forward with open palm
    ASL_WORD_SIGNS['THANK_YOU'] = function (runtime) {
        let a = [];
        // Touch chin
        a.push(["mixamorigRightArm", "rotation", "x", -0.22, "-"]);
        a.push(["mixamorigRightArm", "rotation", "y", 0.28, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 1.18, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.22, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", -1.05, "-"]);
        a.push(["mixamorigRightHand", "rotation", "z", 0.5, "+"]);
        runtime.animations.push(a);

        // Push forward, palm up
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.6, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.8, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.1, "-"]);
        a.push(["mixamorigRightHand", "rotation", "x", -0.4, "+"]);
        a.push(["mixamorigNeck", "rotation", "x", Math.PI / 8, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // PLEASE - Flat hand rubs circular motion on chest
    ASL_WORD_SIGNS['PLEASE'] = function (runtime) {
        let a = [];
        // Hand to chest
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        a.push(["mixamorigRightArm", "rotation", "y", 0.45, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.95, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.05, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", -0.85, "-"]);
        runtime.animations.push(a);

        // Circle 1
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.3, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "z", 0.2, "+"]);
        runtime.animations.push(a);

        // Circle 2
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", -0.3, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "z", -0.1, "-"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // SORRY - "A" fist rubs circular motion on chest
    ASL_WORD_SIGNS['SORRY'] = function (runtime) {
        let a = [];
        // Hand to chest in fist
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        a.push(["mixamorigRightArm", "rotation", "y", 0.45, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.95, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.05, "+"]);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 4, "+"]);
        runtime.animations.push(a);

        // Circle
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]);
        a.push(["mixamorigNeck", "rotation", "x", 0.15, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", -0.35, "-"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // YES - "S" fist gently nodding up and down from the wrist
    ASL_WORD_SIGNS['YES'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.2, "+"]);
        runtime.animations.push(a);

        // Nod 1 down
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.65, "+"]);
        a.push(["mixamorigNeck", "rotation", "x", 0.12, "+"]);
        runtime.animations.push(a);

        // Nod 1 up
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.2, "-"]);
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);

        // Nod 2 down
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.65, "+"]);
        a.push(["mixamorigNeck", "rotation", "x", 0.12, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // NO - Index and middle snap down onto thumb tip (duck bill close)
    ASL_WORD_SIGNS['NO'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        // Open snap pose
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Middle');
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 3, "+"]);
        runtime.animations.push(a);

        // Snap fingers closed onto thumb
        a = [];
        curlFinger(a, 'Index', Math.PI / 2.5);
        curlFinger(a, 'Middle', Math.PI / 2.5);
        a.push(["mixamorigNeck", "rotation", "y", 0.18, "+"]); // subtle head shake
        runtime.animations.push(a);

        // Snap open
        a = [];
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Middle');
        a.push(["mixamorigNeck", "rotation", "y", -0.18, "-"]);
        runtime.animations.push(a);

        // Snap closed
        a = [];
        curlFinger(a, 'Index', Math.PI / 2.5);
        curlFinger(a, 'Middle', Math.PI / 2.5);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigNeck", "rotation", "y", 0, "+"]);
        runtime.animations.push(a);
    };

    // I / ME - Index finger points directly to own chest
    ASL_WORD_SIGNS['I'] = function (runtime) {
        let a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.22, "-"]);
        a.push(["mixamorigRightArm", "rotation", "y", 0.35, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.85, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.2, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", -1.1, "-"]);
        uncurlFinger(a, 'Index');
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // YOU - Index finger points forward toward viewer
    ASL_WORD_SIGNS['YOU'] = function (runtime) {
        let a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.55, "-"]);
        a.push(["mixamorigRightArm", "rotation", "y", 0.25, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.75, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.45, "+"]);
        uncurlFinger(a, 'Index');
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // MY - Open flat hand resting against chest
    ASL_WORD_SIGNS['MY'] = function (runtime) {
        let a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.22, "-"]);
        a.push(["mixamorigRightArm", "rotation", "y", 0.42, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.85, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.15, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", -0.9, "-"]);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // LOVE - Crossed arms over chest (warm hug) or ILY gesture
    ASL_WORD_SIGNS['LOVE'] = function (runtime) {
        let a = [];
        // Both arms cross over chest
        a.push(["mixamorigRightArm", "rotation", "x", -0.4, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.9, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.2, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", -0.4, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.9, "-"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -2.2, "-"]);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigNeck", "rotation", "x", 0.12, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        a.push(["mixamorigLeftArm", "rotation", "x", -Math.PI / 10, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -Math.PI / 3.4, "+"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -Math.PI / 1.7, "+"]);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // HELP - Right thumbs-up resting on left open palm, lifted together
    ASL_WORD_SIGNS['HELP'] = function (runtime) {
        let a = [];
        // Left open palm flat at waist
        a.push(["mixamorigLeftArm", "rotation", "x", -0.35, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.65, "-"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -1.8, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.65, "+"]); // palm up

        // Right thumbs up on left palm
        a.push(["mixamorigRightArm", "rotation", "x", -0.35, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.65, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.8, "+"]);
        curlFinger(a, 'Index', Math.PI / 2);
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 4, "+"]);
        runtime.animations.push(a);

        // Lift both up together
        a = [];
        a.push(["mixamorigLeftArm", "rotation", "x", -0.55, "-"]);
        a.push(["mixamorigRightArm", "rotation", "x", -0.55, "-"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        a.push(["mixamorigLeftArm", "rotation", "x", -Math.PI / 10, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -Math.PI / 3.4, "+"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -Math.PI / 1.7, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0, "-"]);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // STOP - Open right hand chops firmly down onto open flat left palm
    ASL_WORD_SIGNS['STOP'] = function (runtime) {
        let a = [];
        // Left hand flat palm up
        a.push(["mixamorigLeftArm", "rotation", "x", -0.4, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.6, "-"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -1.75, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.7, "+"]);

        // Right hand raised high edge-down
        a.push(["mixamorigRightArm", "rotation", "x", -0.7, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.9, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.9, "+"]);
        a.push(["mixamorigRightHand", "rotation", "y", Math.PI / 2, "+"]);
        runtime.animations.push(a);

        // Chop down
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.4, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.65, "-"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        a.push(["mixamorigLeftArm", "rotation", "x", -Math.PI / 10, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -Math.PI / 3.4, "+"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -Math.PI / 1.7, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // WAIT - Both hands forward palms up, wiggling fingers
    ASL_WORD_SIGNS['WAIT'] = function (runtime) {
        let a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.65, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.6, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.65, "-"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -1.6, "-"]);
        runtime.animations.push(a);

        // Wiggle
        a = [];
        curlFinger(a, 'Index', 0.4);
        curlFinger(a, 'Ring', 0.4);
        runtime.animations.push(a);
        a = [];
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Ring');
        curlFinger(a, 'Middle', 0.4);
        curlFinger(a, 'Pinky', 0.4);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        a.push(["mixamorigLeftArm", "rotation", "x", -Math.PI / 10, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -Math.PI / 3.4, "+"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -Math.PI / 1.7, "+"]);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // GOOD - Flat hand touches chin, drops onto open left palm
    ASL_WORD_SIGNS['GOOD'] = function (runtime) {
        let a = [];
        // Touch chin
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 1.1, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.2, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", -1.0, "-"]);
        // Left hand ready palm up
        a.push(["mixamorigLeftArm", "rotation", "x", -0.35, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.55, "-"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -1.65, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.65, "+"]);
        runtime.animations.push(a);

        // Move to left palm
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.4, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.6, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.6, "-"]);
        a.push(["mixamorigRightHand", "rotation", "x", 0.5, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        a.push(["mixamorigLeftArm", "rotation", "x", -Math.PI / 10, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -Math.PI / 3.4, "+"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -Math.PI / 1.7, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // EAT / FOOD - Squished "O" hand taps toward mouth twice
    ASL_WORD_SIGNS['EAT'] = function (runtime) {
        let a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.3, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 1.05, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.25, "+"]);
        // Squished O
        curlFinger(a, 'Index', Math.PI / 3);
        curlFinger(a, 'Middle', Math.PI / 3);
        curlFinger(a, 'Ring', Math.PI / 3);
        curlFinger(a, 'Pinky', Math.PI / 3);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.5, "+"]);
        runtime.animations.push(a);

        // Tap mouth 1
        a = [];
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.4, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.2, "-"]);
        runtime.animations.push(a);
        // Tap mouth 2
        a = [];
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.4, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // DRINK - "C" hand tilts back as if drinking from a cup
    ASL_WORD_SIGNS['DRINK'] = function (runtime) {
        let a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.35, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 1.05, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.15, "+"]);
        // C cup handshape
        curlFinger(a, 'Index', Math.PI / 4);
        curlFinger(a, 'Middle', Math.PI / 4);
        curlFinger(a, 'Ring', Math.PI / 4);
        curlFinger(a, 'Pinky', Math.PI / 4);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 3, "+"]);
        runtime.animations.push(a);

        // Tip back cup
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.65, "+"]);
        a.push(["mixamorigNeck", "rotation", "x", -0.15, "-"]); // head tips back slightly
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        a.push(["mixamorigNeck", "rotation", "x", 0, "+"]);
        runtime.animations.push(a);
    };

    // WATER - "W" hand taps chin twice
    ASL_WORD_SIGNS['WATER'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        // W handshape
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring');
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.2, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.3, "+"]); // toward chin
        runtime.animations.push(a);

        // Tap 1
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.4, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0, "+"]);
        runtime.animations.push(a);
        // Tap 2
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.4, "-"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // PEACE - "V" sign held high, or both hands in victory peace sign
    ASL_WORD_SIGNS['PEACE'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        uncurlFinger(a, 'Middle');
        a.push(["mixamorigRightHandIndex1", "rotation", "y", -0.16, "-"]);
        a.push(["mixamorigRightHandMiddle1", "rotation", "y", 0.16, "+"]);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        a.push(["mixamorigRightHandThumb1", "rotation", "x", Math.PI / 2.5, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        a.push(["mixamorigRightHandIndex1", "rotation", "y", 0, "+"]);
        a.push(["mixamorigRightHandMiddle1", "rotation", "y", 0, "-"]);
        uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // TIME - Index finger taps the back of non-dominant wrist (watch)
    ASL_WORD_SIGNS['TIME'] = function (runtime) {
        let a = [];
        // Left arm bent in front like looking at watch
        a.push(["mixamorigLeftArm", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.65, "-"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -1.85, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.6, "+"]);

        // Right hand index points at left wrist
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.7, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.85, "+"]);
        uncurlFinger(a, 'Index');
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        runtime.animations.push(a);

        // Tap 1
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.1, "-"]);
        runtime.animations.push(a);
        // Tap 2
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        a.push(["mixamorigLeftArm", "rotation", "x", -Math.PI / 10, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -Math.PI / 3.4, "+"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -Math.PI / 1.7, "+"]);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // WHAT - Both hands held out in front, palms up, shaking slightly
    ASL_WORD_SIGNS['WHAT'] = function (runtime) {
        let a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 0.65, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.5, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", 0.65, "+"]); // palm up

        a.push(["mixamorigLeftArm", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.65, "-"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -1.5, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.65, "+"]); // palm up
        a.push(["mixamorigNeck", "rotation", "x", 0.1, "+"]);
        runtime.animations.push(a);

        // Shake outward
        a = [];
        a.push(["mixamorigRightForeArm", "rotation", "z", 0.25, "+"]);
        a.push(["mixamorigLeftForeArm", "rotation", "z", -0.25, "-"]);
        runtime.animations.push(a);
        // Shake inward
        a = [];
        a.push(["mixamorigRightForeArm", "rotation", "z", -0.1, "-"]);
        a.push(["mixamorigLeftForeArm", "rotation", "z", 0.1, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        a.push(["mixamorigLeftArm", "rotation", "x", -Math.PI / 10, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -Math.PI / 3.4, "+"]);
        a.push(["mixamorigLeftForeArm", "rotation", "y", -Math.PI / 1.7, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0, "-"]);
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // WHERE - Index finger upright, wagging side-to-side
    ASL_WORD_SIGNS['WHERE'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index');
        curlFinger(a, 'Middle', Math.PI / 2);
        curlFinger(a, 'Ring', Math.PI / 2);
        curlFinger(a, 'Pinky', Math.PI / 2);
        runtime.animations.push(a);

        // Wag left
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]);
        runtime.animations.push(a);
        // Wag right
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", -0.35, "-"]);
        runtime.animations.push(a);
        // Wag left
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // =========================================================================
    // 5. THREE.JS 3D AVATAR SYSTEM & PROCEDURAL SHADERS
    // =========================================================================

    // Bone mapping table (Mixamo Y-Bot standard hierarchy)
    const BONE_ALIASES = {
        mixamorigNeck: ['Neck', 'neck'],
        mixamorigHead: ['Head', 'head'],
        mixamorigLeftArm: ['LeftArm', 'arm_fk_L'],
        mixamorigRightArm: ['RightArm', 'arm_fk_R'],
        mixamorigLeftForeArm: ['LeftForeArm', 'forearm_fk_L'],
        mixamorigRightForeArm: ['RightForeArm', 'forearm_fk_R'],
        mixamorigLeftHand: ['LeftHand', 'hand_fk_L'],
        mixamorigRightHand: ['RightHand', 'hand_fk_R'],
        // Right Fingers
        mixamorigRightHandThumb1: ['RightHandThumb1', 'thumb_01_r'],
        mixamorigRightHandThumb2: ['RightHandThumb2', 'thumb_02_r'],
        mixamorigRightHandThumb3: ['RightHandThumb3', 'thumb_03_r'],
        mixamorigRightHandIndex1: ['RightHandIndex1', 'index_01_r'],
        mixamorigRightHandIndex2: ['RightHandIndex2', 'index_02_r'],
        mixamorigRightHandIndex3: ['RightHandIndex3', 'index_03_r'],
        mixamorigRightHandMiddle1: ['RightHandMiddle1', 'middle_01_r'],
        mixamorigRightHandMiddle2: ['RightHandMiddle2', 'middle_02_r'],
        mixamorigRightHandMiddle3: ['RightHandMiddle3', 'middle_03_r'],
        mixamorigRightHandRing1: ['RightHandRing1', 'ring_01_r'],
        mixamorigRightHandRing2: ['RightHandRing2', 'ring_02_r'],
        mixamorigRightHandRing3: ['RightHandRing3', 'ring_03_r'],
        mixamorigRightHandPinky1: ['RightHandPinky1', 'pinky_01_r'],
        mixamorigRightHandPinky2: ['RightHandPinky2', 'pinky_02_r'],
        mixamorigRightHandPinky3: ['RightHandPinky3', 'pinky_03_r'],
        // Left Fingers
        mixamorigLeftHandThumb1: ['LeftHandThumb1', 'thumb_01_l'],
        mixamorigLeftHandThumb2: ['LeftHandThumb2', 'thumb_02_l'],
        mixamorigLeftHandThumb3: ['LeftHandThumb3', 'thumb_03_l'],
        mixamorigLeftHandIndex1: ['LeftHandIndex1', 'index_01_l'],
        mixamorigLeftHandIndex2: ['LeftHandIndex2', 'index_02_l'],
        mixamorigLeftHandIndex3: ['LeftHandIndex3', 'index_03_l'],
        mixamorigLeftHandMiddle1: ['LeftHandMiddle1', 'middle_01_l'],
        mixamorigLeftHandMiddle2: ['LeftHandMiddle2', 'middle_02_l'],
        mixamorigLeftHandMiddle3: ['LeftHandMiddle3', 'middle_03_l'],
        mixamorigLeftHandRing1: ['LeftHandRing1', 'ring_01_l'],
        mixamorigLeftHandRing2: ['LeftHandRing2', 'ring_02_l'],
        mixamorigLeftHandRing3: ['LeftHandRing3', 'ring_03_l'],
        mixamorigLeftHandPinky1: ['LeftHandPinky1', 'pinky_01_l'],
        mixamorigLeftHandPinky2: ['LeftHandPinky2', 'pinky_02_l'],
        mixamorigLeftHandPinky3: ['LeftHandPinky3', 'pinky_03_l']
    };

    function getAvatarBone(avatar, boneName) {
        if (!avatar) return null;
        const compact = boneName.replace(/^mixamorig:?/, '');
        const aliasList = BONE_ALIASES[boneName] || BONE_ALIASES[`mixamorig${compact}`] || [];
        const candidates = [boneName, `mixamorig:${compact}`, `mixamorig${compact}`, compact, ...aliasList];

        for (const candidate of candidates) {
            const bone = avatar.getObjectByName(candidate);
            if (bone) return bone;
        }

        // Deep traversal fallback
        const lowerList = candidates.map(c => c.toLowerCase());
        let resolved = null;
        avatar.traverse(child => {
            if (resolved || child.type !== 'Bone') return;
            const normalized = child.name.split('|').pop().replace(/^mixamorig:?/, '');
            if (lowerList.includes(normalized.toLowerCase())) {
                resolved = child;
            }
        });
        return resolved;
    }

    function smoothstep(min, max, v) {
        const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
        return t * t * (3 - 2 * t);
    }

    function lerpColor(c1, c2, t, out) {
        const clamped = Math.max(0, Math.min(1, t));
        out.r = c1.r + (c2.r - c1.r) * clamped;
        out.g = c1.g + (c2.g - c1.g) * clamped;
        out.b = c1.b + (c2.b - c1.b) * clamped;
        return out;
    }

    /**
     * Applies SignFlow's signature Turquoise Robot vertex gradient styling (#8DC1C2 swatch)
     */
    function applyTurquoiseRobotColors(avatar) {
        const seafoamHighlight = new THREE.Color('#38BDF8'); // Sky cyan for fingers & visor
        const seafoamSheen = new THREE.Color('#2DD4BF');     // Crisp teal sheen
        const seafoamPrimary = new THREE.Color('#0D9488');   // Deep rich teal
        const seafoamDeep = new THREE.Color('#115E59');      // Shadow teal
        const armorTitanium = new THREE.Color('#334155');    // Defined slate titanium
        const armorHighlight = new THREE.Color('#64748B');   // Armor edge highlights
        const darkContour = new THREE.Color('#0F172A');      // Recessed contours
        const jointGraphite = new THREE.Color('#090D16');    // Deep joint sockets

        const tempColor = new THREE.Color();

        avatar.traverse((child) => {
            if (!child.isMesh) return;
            const mesh = child;
            const positions = mesh.geometry?.attributes.position;
            if (!positions) return;

            if (mesh.name === 'Alpha_Surface') {
                const colors = new Float32Array(positions.count * 3);
                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i);
                    const y = positions.getY(i);
                    const z = positions.getZ(i);
                    const absX = Math.abs(x);
                    let color = armorTitanium;

                    // 1. Head & Visor (y > 1.52)
                    if (y > 1.52) {
                        if (z > 0.02) {
                            const visorDist = Math.hypot(x * 2.2, (y - 1.65) * 1.6, Math.max(0, z - 0.04));
                            const t = smoothstep(0.04, 0.24, visorDist);
                            color = t < 0.45
                                ? lerpColor(seafoamHighlight, seafoamSheen, t / 0.45, tempColor)
                                : lerpColor(seafoamSheen, seafoamPrimary, (t - 0.45) / 0.55, tempColor);
                        } else {
                            color = lerpColor(armorTitanium, armorHighlight, smoothstep(1.52, 1.76, y), tempColor);
                        }
                    }
                    // 2. Neck
                    else if (y > 1.44) {
                        color = lerpColor(darkContour, seafoamDeep, smoothstep(1.44, 1.52, y) * 0.4, tempColor);
                    }
                    // 3. Arms, Forearms & Hands
                    else if (absX > 0.28) {
                        if (y > 0.98) {
                            color = lerpColor(seafoamPrimary, armorTitanium, smoothstep(0.06, 0.22, Math.hypot(absX - 0.32, y - 1.34)), tempColor);
                        } else if (y >= 0.65) {
                            color = lerpColor(seafoamSheen, seafoamDeep, smoothstep(0.65, 0.98, y), tempColor);
                        } else {
                            // Hands & Fingers: Luminous sky cyan highlight for high visibility
                            color = lerpColor(seafoamHighlight, seafoamSheen, smoothstep(0.40, 0.65, y), tempColor);
                        }
                    }
                    // 4. Chest & Torso
                    else {
                        const coreDist = Math.hypot(x * 2.0, (y - 1.30) * 1.5, Math.max(0, z - 0.05));
                        if (z > 0.03 && coreDist < 0.28) {
                            const coreT = smoothstep(0.04, 0.26, coreDist);
                            color = coreT < 0.5
                                ? lerpColor(seafoamSheen, seafoamPrimary, coreT * 2, tempColor)
                                : lerpColor(seafoamPrimary, armorTitanium, (coreT - 0.5) * 2, tempColor);
                        } else {
                            color = armorTitanium;
                        }
                    }

                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                }

                mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                mesh.geometry.attributes.color.needsUpdate = true;
                mesh.material = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.45,
                    metalness: 0.35,
                    skinning: true,
                });
                mesh.material.needsUpdate = true;
            }

            if (mesh.name === 'Alpha_Joints') {
                const colors = new Float32Array(positions.count * 3);
                for (let i = 0; i < positions.count; i++) {
                    colors[i * 3] = jointGraphite.r;
                    colors[i * 3 + 1] = jointGraphite.g;
                    colors[i * 3 + 2] = jointGraphite.b;
                }
                mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                mesh.geometry.attributes.color.needsUpdate = true;
                mesh.material = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.55,
                    metalness: 0.70,
                    skinning: true,
                });
                mesh.material.needsUpdate = true;
            }
        });
    }

    /**
     * Cyber Stealth Palette (Obsidian Black + Emerald Laser Accents matching Sign Language Studio)
     */
    function applyCyberStealthColors(avatar) {
        const armorObsidian = new THREE.Color('#2A313C');
        const armorHighlight = new THREE.Color('#404B5C');
        const emeraldGlow = new THREE.Color('#10B981');
        const emeraldBright = new THREE.Color('#34D399');
        const graphiteJoint = new THREE.Color('#141820');
        const tempColor = new THREE.Color();

        avatar.traverse((child) => {
            if (!child.isMesh) return;
            const mesh = child;
            const positions = mesh.geometry?.attributes.position;
            if (!positions) return;

            if (mesh.name === 'Alpha_Surface') {
                const colors = new Float32Array(positions.count * 3);
                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i);
                    const y = positions.getY(i);
                    const z = positions.getZ(i);
                    const absX = Math.abs(x);
                    let color = armorObsidian;

                    // Neon Visor
                    if (y > 1.52 && z > 0.02) {
                        const visorDist = Math.hypot(x * 2.2, (y - 1.65) * 1.6);
                        color = visorDist < 0.22 ? emeraldBright : emeraldGlow;
                    }
                    // Hands & Fingers: Glowing Emerald for high contrast
                    else if (absX > 0.28 && y < 0.65) {
                        color = lerpColor(emeraldBright, emeraldGlow, smoothstep(0.40, 0.65, y), tempColor);
                    }
                    // Shoulder & Chest highlights
                    else if (y > 1.25 && y < 1.45 && absX < 0.18) {
                        color = emeraldGlow;
                    }
                    else if (y > 1.2) {
                        color = armorHighlight;
                    }

                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                }

                mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                mesh.geometry.attributes.color.needsUpdate = true;
                mesh.material = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.28,
                    metalness: 0.55,
                    skinning: true,
                });
                mesh.material.needsUpdate = true;
            }

            if (mesh.name === 'Alpha_Joints') {
                mesh.material = new THREE.MeshStandardMaterial({
                    color: graphiteJoint,
                    roughness: 0.5,
                    metalness: 0.8,
                    skinning: true,
                });
                mesh.material.needsUpdate = true;
            }
        });
    }

    /**
     * Warm Armor Palette for Stylized Human Mode
     */
    function applyWarmArmorColors(avatar) {
        const chestCream = new THREE.Color('#E2D3BC');
        const warmBeige = new THREE.Color('#D4BEA1');
        const limbBeige = new THREE.Color('#C8B093');
        const lowerBeige = new THREE.Color('#BFA88C');
        const neckCream = new THREE.Color('#D9C7AE');
        const jointCharcoal = new THREE.Color('#4A4641');

        avatar.traverse((child) => {
            if (!child.isMesh) return;
            const mesh = child;
            const positions = mesh.geometry?.attributes.position;
            if (!positions) return;

            if (mesh.name === 'Alpha_Surface') {
                const colors = new Float32Array(positions.count * 3);
                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i);
                    const y = positions.getY(i);
                    const z = positions.getZ(i);
                    const isNeck = y > 1.48 && Math.abs(x) < 0.12 && z > -0.1;
                    const isChest = y >= 1.18 && Math.abs(x) <= 0.38;
                    const isWaistOrHip = y >= 0.78 && y < 1.18 && Math.abs(x) <= 0.36;
                    const isArm = Math.abs(x) > 0.34 && y > 0.82;
                    const isCalfOrFoot = y < 0.42;
                    const color = isNeck
                        ? neckCream
                        : isChest
                            ? chestCream
                            : isWaistOrHip
                                ? warmBeige
                                : isArm
                                    ? limbBeige
                                    : isCalfOrFoot
                                        ? lowerBeige
                                        : warmBeige;
                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                }
                mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                mesh.geometry.attributes.color.needsUpdate = true;
                mesh.material = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.63,
                    metalness: 0.04,
                    skinning: true,
                });
                mesh.material.needsUpdate = true;
            }

            if (mesh.name === 'Alpha_Joints') {
                const colors = new Float32Array(positions.count * 3);
                for (let i = 0; i < positions.count; i++) {
                    colors[i * 3] = jointCharcoal.r;
                    colors[i * 3 + 1] = jointCharcoal.g;
                    colors[i * 3 + 2] = jointCharcoal.b;
                }
                mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                mesh.geometry.attributes.color.needsUpdate = true;
                mesh.material = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.72,
                    metalness: 0.07,
                    skinning: true,
                });
                mesh.material.needsUpdate = true;
            }
        });
    }

    /**
     * Classic Titanium Model
     */
    function applyClassicTitaniumColors(avatar) {
        avatar.traverse((child) => {
            if (!child.isMesh) return;
            if (child.name === 'Alpha_Surface') {
                child.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color('#CBD5E1'),
                    roughness: 0.35,
                    metalness: 0.45,
                    skinning: true,
                });
                child.material.needsUpdate = true;
            }
            if (child.name === 'Alpha_Joints') {
                child.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color('#1E293B'),
                    roughness: 0.5,
                    metalness: 0.75,
                    skinning: true,
                });
                child.material.needsUpdate = true;
            }
        });
    }

    /**
     * Procedural Human Head Layer
     */
    function createHumanFaceLayer() {
        const headGroup = new THREE.Group();
        headGroup.name = 'HumanHeadLayer';

        const skinMaterial = new THREE.MeshStandardMaterial({
            color: '#E8C5A5',
            roughness: 0.45,
            metalness: 0.05,
        });

        const hairMaterial = new THREE.MeshStandardMaterial({
            color: '#2D241E',
            roughness: 0.85,
            metalness: 0.05,
        });

        // Head Base
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), skinMaterial);
        headMesh.scale.set(0.9, 1.35, 1.05);
        headMesh.castShadow = true;
        headGroup.add(headMesh);

        // Hair Dome
        const hairDome = new THREE.Mesh(
            new THREE.SphereGeometry(1.02, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2.08),
            hairMaterial
        );
        hairDome.scale.set(0.93, 1.22, 1.06);
        hairDome.position.set(0, 0.12, -0.1);
        hairDome.castShadow = true;
        headGroup.add(hairDome);

        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: '#1A1A1A' });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), eyeMat);
        leftEye.position.set(-0.28, 0.12, 0.95);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), eyeMat);
        rightEye.position.set(0.28, 0.12, 0.95);
        headGroup.add(leftEye, rightEye);

        // Eyebrows
        const browMat = new THREE.MeshBasicMaterial({ color: '#2D241E' });
        const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.05), browMat);
        leftBrow.position.set(-0.28, 0.22, 0.96);
        leftBrow.rotation.z = 0.08;
        const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.05), browMat);
        rightBrow.position.set(0.28, 0.22, 0.96);
        rightBrow.rotation.z = -0.08;
        headGroup.add(leftBrow, rightBrow);

        // Nose
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 16), skinMaterial);
        nose.position.set(0, -0.05, 1.04);
        nose.rotation.x = Math.PI / 6;
        headGroup.add(nose);

        // Mouth / Smile
        const mouthMat = new THREE.MeshBasicMaterial({ color: '#C47B75' });
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.05), mouthMat);
        mouth.position.set(0, -0.32, 0.96);
        headGroup.add(mouth);

        return headGroup;
    }

    // =========================================================================
    // 6. MAIN 3D AVATAR STUDIO APPLICATION CLASS
    // =========================================================================

    class ASLAvatarStudio {
        constructor() {
            this.container = document.getElementById('avatar-stage');
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.avatar = null;

            this.currentModelStyle = 'turquoise'; // 'turquoise' | 'stealth' | 'titanium' | 'human'
            this.isLoaded = false;
            this.isSigning = false;
            this.isPaused = false;
            this.speed = 1.0;

            // Animation queue
            this.animationQueue = [];
            this.nextFrameTime = 0;
            this.currentTokens = [];
            this.currentSignIndex = -1;

            // Speech Recognition
            this.recognition = null;
            this.isListening = false;

            this.initAvatarBackground();
            this.initThree();
            this.initDOM();
            this.initSpeechRecognition();

            // Populate initial timeline chips immediately
            const initialText = document.getElementById('avatar-input-text')?.value || 'Hello, how are you?';
            this.currentTokens = textToASLGloss(initialText, false);
            this.renderGlossTimeline(this.currentTokens);
        }

        initAvatarBackground() {
            const canvas = document.getElementById('avatar-bg-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { alpha: true });
            if (!ctx) return;

            let w = canvas.parentElement.clientWidth || 800;
            let h = canvas.parentElement.clientHeight || 560;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            const resizeBg = () => {
                w = canvas.parentElement.clientWidth || 800;
                h = canvas.parentElement.clientHeight || 560;
                canvas.width = Math.floor(w * dpr);
                canvas.height = Math.floor(h * dpr);
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
            };
            resizeBg();
            window.addEventListener('resize', resizeBg);

            // 24 subtle floating particles with slow, calm motion
            const particles = [];
            const count = 24;
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.22,
                    vy: (Math.random() - 0.5) * 0.22,
                    radius: 1.0 + Math.random() * 1.2,
                    alpha: 0.12 + Math.random() * 0.18
                });
            }

            const loop = () => {
                requestAnimationFrame(loop);
                ctx.clearRect(0, 0, w, h);

                // Update & draw particles
                for (let i = 0; i < count; i++) {
                    const p = particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < 0) p.x = w;
                    if (p.x > w) p.x = 0;
                    if (p.y < 0) p.y = h;
                    if (p.y > h) p.y = 0;

                    ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Subtle constellation lines
                    for (let j = i + 1; j < count; j++) {
                        const p2 = particles[j];
                        const dx = p.x - p2.x;
                        const dy = p.y - p2.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist < 95) {
                            const lineAlpha = (1 - dist / 95) * 0.045;
                            ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`;
                            ctx.lineWidth = 0.8;
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }
            };
            requestAnimationFrame(loop);
        }

        initThree() {
            if (!this.container) return;

            const width = this.container.clientWidth || 800;
            const height = this.container.clientHeight || 560;

            // Scene with transparent background
            this.scene = new THREE.Scene();
            this.scene.background = null;

            // Camera - upper-body signing focus
            this.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
            this.camera.position.set(0, 0.55, 2.75);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            if (typeof THREE.SRGBColorSpace !== 'undefined') {
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            } else if (typeof THREE.sRGBEncoding !== 'undefined') {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }
            this.container.appendChild(this.renderer.domElement);

            // Orbit Controls
            if (typeof THREE.OrbitControls !== 'undefined') {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.target.set(0, 0.45, 0);
                this.controls.minDistance = 1.4;
                this.controls.maxDistance = 4.2;
                this.controls.maxPolarAngle = Math.PI / 1.75;
            }

            // Balanced Studio Lighting with defined contrast and no blown-out highlights
            const hemiLight = new THREE.HemisphereLight('#CBD5E1', '#0F172A', 0.65);
            this.scene.add(hemiLight);

            const keyLight = new THREE.DirectionalLight('#FFFFFF', 1.15);
            keyLight.position.set(2.5, 4.0, 3.0);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.width = 1024;
            keyLight.shadow.mapSize.height = 1024;
            this.scene.add(keyLight);

            const fillLight = new THREE.DirectionalLight('#64748B', 0.45);
            fillLight.position.set(-2.5, 2.0, 2.5);
            this.scene.add(fillLight);

            // Subtle Seafoam Rim Accent
            const seafoamRim = new THREE.PointLight('#38BDF8', 1.6, 12);
            seafoamRim.position.set(2.0, 2.0, 2.0);
            this.scene.add(seafoamRim);

            // Subtle Emerald Studio Rim Accent
            const emeraldRim = new THREE.PointLight('#10B981', 1.3, 12);
            emeraldRim.position.set(-2.0, 2.0, 1.5);
            this.scene.add(emeraldRim);

            // Ground Shadow Plane
            const shadowGeo = new THREE.PlaneGeometry(8, 8);
            const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
            const floor = new THREE.Mesh(shadowGeo, shadowMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.85;
            floor.receiveShadow = true;
            this.scene.add(floor);

            // Load 3D Model
            this.loadAvatarModel();

            // Resize Observer
            const resize = () => {
                const w = this.container.clientWidth;
                const h = this.container.clientHeight;
                if (!w || !h) return;
                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(w, h);
            };
            window.addEventListener('resize', resize);

            // Animation Loop
            const clock = new THREE.Clock();
            const tick = (now) => {
                requestAnimationFrame(tick);
                if (this.controls) this.controls.update();

                this.updateSigningQueue(now);
                this.renderer.render(this.scene, this.camera);
            };
            requestAnimationFrame(tick);
        }

        loadAvatarModel() {
            const loader = new THREE.GLTFLoader();
            const loadingOverlay = document.getElementById('avatar-loading-overlay');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';

            loader.load(
                'models/ybot.glb',
                (gltf) => {
                    this.avatar = gltf.scene;
                    this.avatar.position.y = -0.85;
                    this.avatar.traverse((child) => {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.frustumCulled = false;
                        if (child.isBone) {
                            child.userData.restQuaternion = child.quaternion.clone();
                            child.userData.gestureRestQuaternion = child.quaternion.clone();
                            child.userData.delta = { x: 0, y: 0, z: 0 };
                        }
                    });

                    this.applyModelStyle(this.currentModelStyle);
                    this.scene.add(this.avatar);
                    this.isLoaded = true;

                    if (loadingOverlay) loadingOverlay.style.display = 'none';
                    this.updateStatusBadge('Avatar Ready', 'connected');

                    // Set initial resting pose
                    this.resetAvatarToRest();

                    // Initial demonstration sign
                    setTimeout(() => {
                        this.signPhrase("Hello, how are you?");
                    }, 500);
                },
                (progress) => {
                    if (progress.total > 0 && loadingOverlay) {
                        const pct = Math.round((progress.loaded / progress.total) * 100);
                        const txt = loadingOverlay.querySelector('.loader-text');
                        if (txt) txt.textContent = `Loading 3D ASL Avatar (${pct}%)…`;
                    }
                },
                (err) => {
                    console.error('[ASL Studio] Error loading avatar model:', err);
                    if (loadingOverlay) {
                        loadingOverlay.innerHTML = `
                            <div style="color: var(--accent-rose); font-size: 0.9rem; text-align: center;">
                                ⚠️ Failed to load 3D Avatar (models/ybot.glb).<br>
                                Please ensure local server is running.
                            </div>
                        `;
                    }
                }
            );
        }

        applyModelStyle(styleName) {
            this.currentModelStyle = styleName;
            if (!this.avatar) return;

            // Remove previous face layer if switching away from human
            const existingFace = this.avatar.getObjectByName('HumanHeadLayer');
            if (existingFace && styleName !== 'human') {
                existingFace.parent.remove(existingFace);
            }

            if (styleName === 'turquoise') {
                applyTurquoiseRobotColors(this.avatar);
            } else if (styleName === 'stealth') {
                applyCyberStealthColors(this.avatar);
            } else if (styleName === 'titanium') {
                applyClassicTitaniumColors(this.avatar);
            } else if (styleName === 'human') {
                applyWarmArmorColors(this.avatar);
                const headBone = getAvatarBone(this.avatar, 'mixamorigHead');
                if (headBone && !this.avatar.getObjectByName('HumanHeadLayer')) {
                    const faceLayer = createHumanFaceLayer();
                    faceLayer.scale.set(13.5, 13.5, 13.5);
                    faceLayer.position.set(0, 2, 1);
                    headBone.add(faceLayer);
                }
            }
        }

        resetAvatarToRest() {
            if (!this.avatar) return;
            this.animationQueue = [];
            this.isSigning = false;
            this.isPaused = false;

            this.avatar.traverse((child) => {
                if (child.isBone && child.userData.restQuaternion) {
                    child.quaternion.copy(child.userData.restQuaternion);
                    child.userData.delta = { x: 0, y: 0, z: 0 };
                }
            });

            // Apply default baseline pose
            const runtime = { characters: [], animations: [] };
            defaultPose(runtime);
            for (const frame of runtime.animations) {
                for (const [boneName, , axis, target] of frame) {
                    const bone = getAvatarBone(this.avatar, boneName);
                    if (!bone) continue;
                    const delta = bone.userData.delta || (bone.userData.delta = { x: 0, y: 0, z: 0 });
                    delta[axis] = target;
                    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(delta.x, delta.y, delta.z));
                    bone.quaternion.copy(bone.userData.restQuaternion.clone().multiply(q));
                }
            }
        }

        updateSigningQueue(now) {
            if (!this.avatar || !this.animationQueue.length || this.isPaused) {
                if (this.isSigning && !this.animationQueue.length) {
                    this.isSigning = false;
                    this.updateStatusBadge('Signing Complete', 'connected');
                    this.highlightActiveChip(-1);
                    const hud = document.getElementById('avatar-active-hud');
                    if (hud) hud.classList.remove('active');
                }
                return;
            }

            if (now < this.nextFrameTime) return;

            this.isSigning = true;
            const frame = this.animationQueue[0];

            // Notify UI of active token
            if (frame._meta && frame._meta.tokenIndex !== this.currentSignIndex) {
                this.currentSignIndex = frame._meta.tokenIndex;
                this.highlightActiveChip(this.currentSignIndex);
                this.updateActiveHUD(frame._meta);
            }

            for (let i = 0; i < frame.length;) {
                const [boneName, , axis, target, direction] = frame[i];
                const bone = getAvatarBone(this.avatar, boneName);
                if (!bone) {
                    frame.splice(i, 1);
                    continue;
                }

                const delta = bone.userData.delta || (bone.userData.delta = { x: 0, y: 0, z: 0 });
                const current = delta[axis];
                const step = 0.055 * this.speed;
                const inProgress = direction === '+' ? current < target : current > target;

                if (inProgress) {
                    delta[axis] = direction === '+'
                        ? Math.min(current + step, target)
                        : Math.max(current - step, target);
                    const deltaQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(delta.x, delta.y, delta.z));
                    const baseQ = bone.userData.restQuaternion;
                    bone.quaternion.copy(baseQ.clone().multiply(deltaQ));
                    i++;
                } else {
                    frame.splice(i, 1);
                }
            }

            if (frame.length === 0) {
                const finished = this.animationQueue.shift();
                const isFingerspell = finished?._meta?.isFingerspelling ?? false;
                const baseHold = isFingerspell ? 130 : 180;
                this.nextFrameTime = now + (baseHold / this.speed);
            }
        }

        signPhrase(text, fingerspellOnly = false) {
            if (!this.isLoaded || !this.avatar) return;

            const tokens = textToASLGloss(text, fingerspellOnly);
            if (tokens.length === 0) return;

            this.resetAvatarToRest();
            this.currentTokens = tokens;
            this.renderGlossTimeline(tokens);
            this.updateStatusBadge(`Signing (${tokens.length} signs)...`, 'active');

            const queue = [];

            for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
                const item = tokens[tokenIndex];
                const word = item.token;

                if (!item.isFingerspelling && ASL_WORD_SIGNS[word]) {
                    // Whole-word sign
                    const tempRuntime = { animations: [], characters: [] };
                    ASL_WORD_SIGNS[word](tempRuntime);

                    for (const frame of tempRuntime.animations) {
                        const tagged = [...frame];
                        tagged._meta = {
                            tokenIndex,
                            token: word,
                            label: word,
                            isFingerspelling: false
                        };
                        queue.push(tagged);
                    }
                } else {
                    // Fingerspell letter-by-letter
                    const letters = item.letters || word.split('');
                    for (const letter of letters) {
                        const charAnim = ASL_ALPHABET[letter];
                        if (charAnim) {
                            const tempRuntime = { animations: [], characters: [] };
                            charAnim(tempRuntime);

                            for (const frame of tempRuntime.animations) {
                                const tagged = [...frame];
                                tagged._meta = {
                                    tokenIndex,
                                    token: word,
                                    label: `Letter ${letter}`,
                                    letter: letter,
                                    isFingerspelling: true
                                };
                                queue.push(tagged);
                            }
                        }
                    }
                }
            }

            this.animationQueue = queue;
            this.isSigning = true;
            this.isPaused = false;
            this.nextFrameTime = 0;
            this.updatePlayPauseButtonUI();
        }

        signSingleToken(token) {
            this.signPhrase(token, false);
        }

        renderGlossTimeline(tokens) {
            const timelineEl = document.getElementById('gloss-timeline-chips');
            const tokenCountEl = document.getElementById('gloss-token-count');
            if (!timelineEl) return;

            timelineEl.innerHTML = '';
            if (tokenCountEl) tokenCountEl.textContent = `${tokens.length} signs`;

            tokens.forEach((item, idx) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = `gloss-chip ${item.isFingerspelling ? 'fingerspell' : 'word-sign'}`;
                chip.setAttribute('data-token-idx', idx);
                chip.title = `Click to jump & replay: ${item.token}`;

                chip.innerHTML = `
                    <span class="chip-badge">${item.isFingerspelling ? 'Fingerspell' : 'ASL Sign'}</span>
                    <span class="chip-text">${item.token}</span>
                `;

                chip.addEventListener('click', () => {
                    this.signSingleToken(item.token);
                });

                timelineEl.appendChild(chip);
            });
        }

        highlightActiveChip(index) {
            const chips = document.querySelectorAll('.gloss-chip');
            chips.forEach((c) => {
                const idx = parseInt(c.getAttribute('data-token-idx'), 10);
                if (idx === index) {
                    c.classList.add('active');
                    c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else {
                    c.classList.remove('active');
                }
            });
        }

        updateActiveHUD(meta) {
            const hud = document.getElementById('avatar-active-hud');
            const glyphEl = document.getElementById('hud-active-glyph');
            const nameEl = document.getElementById('hud-active-name');
            const badgeEl = document.getElementById('hud-active-badge');
            const hintEl = document.getElementById('hud-active-hint');

            if (!hud) return;
            hud.classList.add('active');

            if (glyphEl) glyphEl.textContent = meta.letter || meta.token.charAt(0);
            if (nameEl) nameEl.textContent = meta.label || meta.token;
            if (badgeEl) badgeEl.textContent = meta.isFingerspelling ? 'ASL Fingerspell' : 'ASL Whole Sign';

            if (hintEl) {
                if (meta.isFingerspelling && meta.letter) {
                    hintEl.textContent = `One-handed ASL alphabet gesture for letter '${meta.letter}'`;
                } else {
                    hintEl.textContent = `Coordinated ASL gesture for '${meta.token}'`;
                }
            }
        }

        updateStatusBadge(text, stateClass = 'connected') {
            const badge = document.getElementById('avatar-status-badge');
            if (badge) {
                badge.className = `status-badge ${stateClass}`;
                badge.innerHTML = `<span class="dot"></span><span>${text}</span>`;
            }
        }

        updatePlayPauseButtonUI() {
            const btn = document.getElementById('btn-avatar-play-pause');
            if (!btn) return;
            if (this.isPaused) {
                btn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Resume</span>
                `;
            } else {
                btn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    <span>Pause</span>
                `;
            }
        }

        initSpeechRecognition() {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRec) {
                console.warn('[ASL Studio] Web Speech API not supported in this browser.');
                return;
            }

            this.recognition = new SpeechRec();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            const voiceBtn = document.getElementById('btn-voice-mic');
            const voicePulse = document.getElementById('voice-pulse-ring');
            const interimDisplay = document.getElementById('voice-interim-display');
            const inputArea = document.getElementById('avatar-input-text');

            this.recognition.onstart = () => {
                this.isListening = true;
                if (voiceBtn) voiceBtn.classList.add('listening');
                if (voicePulse) voicePulse.classList.add('pulsing');
                if (interimDisplay) interimDisplay.textContent = 'Listening... Speak clearly into your microphone.';
            };

            this.recognition.onresult = (e) => {
                let interim = '';
                let final = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const transcript = e.results[i][0].transcript;
                    if (e.results[i].isFinal) {
                        final += transcript;
                    } else {
                        interim += transcript;
                    }
                }

                if (interimDisplay && interim) {
                    interimDisplay.textContent = `"${interim}"`;
                }

                if (final) {
                    if (inputArea) inputArea.value = final;
                    if (interimDisplay) interimDisplay.textContent = `Captured: "${final}"`;
                    this.signPhrase(final);
                }
            };

            this.recognition.onerror = (e) => {
                console.warn('[ASL Studio] Speech recognition error:', e.error);
                this.isListening = false;
                if (voiceBtn) voiceBtn.classList.remove('listening');
                if (voicePulse) voicePulse.classList.remove('pulsing');
                if (interimDisplay) interimDisplay.textContent = `Mic Error (${e.error}). Click to retry.`;
            };

            this.recognition.onend = () => {
                this.isListening = false;
                if (voiceBtn) voiceBtn.classList.remove('listening');
                if (voicePulse) voicePulse.classList.remove('pulsing');
            };
        }

        initDOM() {
            // Textarea & Translate Button
            const inputArea = document.getElementById('avatar-input-text');
            const charCount = document.getElementById('input-char-count');
            const translateBtn = document.getElementById('btn-translate-sign');
            const fingerspellToggle = document.getElementById('toggle-fingerspell-only');
            const clearInputBtn = document.getElementById('btn-clear-input');

            if (inputArea && charCount) {
                inputArea.addEventListener('input', () => {
                    charCount.textContent = `${inputArea.value.length} / 250`;
                });
            }

            if (clearInputBtn && inputArea) {
                clearInputBtn.addEventListener('click', () => {
                    inputArea.value = '';
                    if (charCount) charCount.textContent = '0 / 250';
                    inputArea.focus();
                });
            }

            if (translateBtn && inputArea) {
                translateBtn.addEventListener('click', () => {
                    const text = inputArea.value.trim();
                    const fsOnly = fingerspellToggle ? fingerspellToggle.checked : false;
                    if (text) this.signPhrase(text, fsOnly);
                });

                // Ctrl+Enter / Cmd+Enter shortcut
                inputArea.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        translateBtn.click();
                    }
                });
            }

            // Input Tabs (Text vs Voice)
            const tabTextBtn = document.getElementById('tab-btn-text');
            const tabVoiceBtn = document.getElementById('tab-btn-voice');
            const textPanel = document.getElementById('panel-input-text');
            const voicePanel = document.getElementById('panel-input-voice');

            if (tabTextBtn && tabVoiceBtn && textPanel && voicePanel) {
                tabTextBtn.addEventListener('click', () => {
                    tabTextBtn.classList.add('active');
                    tabVoiceBtn.classList.remove('active');
                    textPanel.style.display = 'block';
                    voicePanel.style.display = 'none';
                });

                tabVoiceBtn.addEventListener('click', () => {
                    tabVoiceBtn.classList.add('active');
                    tabTextBtn.classList.remove('active');
                    voicePanel.style.display = 'flex';
                    textPanel.style.display = 'none';
                });
            }

            // Mic button
            const micBtn = document.getElementById('btn-voice-mic');
            if (micBtn) {
                micBtn.addEventListener('click', () => {
                    if (!this.recognition) {
                        alert('Voice speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
                        return;
                    }
                    if (this.isListening) {
                        this.recognition.stop();
                    } else {
                        try {
                            this.recognition.start();
                        } catch (err) {
                            console.warn('[ASL Studio] Mic start error:', err);
                        }
                    }
                });
            }

            // Quick Example Chips
            document.querySelectorAll('.example-chip').forEach((chip) => {
                chip.addEventListener('click', () => {
                    const text = chip.getAttribute('data-phrase');
                    if (inputArea) inputArea.value = text;
                    if (charCount) charCount.textContent = `${text.length} / 250`;
                    const fsOnly = fingerspellToggle ? fingerspellToggle.checked : false;
                    this.signPhrase(text, fsOnly);
                });
            });

            // Transport Controls (Play/Pause, Stop, Replay, Speed)
            const playPauseBtn = document.getElementById('btn-avatar-play-pause');
            if (playPauseBtn) {
                playPauseBtn.addEventListener('click', () => {
                    if (!this.animationQueue.length && !this.isSigning) {
                        // Re-trigger current text
                        if (inputArea && inputArea.value.trim()) {
                            this.signPhrase(inputArea.value.trim());
                        }
                        return;
                    }
                    this.isPaused = !this.isPaused;
                    this.updatePlayPauseButtonUI();
                    this.updateStatusBadge(this.isPaused ? 'Paused' : 'Signing...', this.isPaused ? 'disconnected' : 'active');
                });
            }

            const stopBtn = document.getElementById('btn-avatar-stop');
            if (stopBtn) {
                stopBtn.addEventListener('click', () => {
                    this.resetAvatarToRest();
                    this.updateStatusBadge('Avatar Resting', 'connected');
                    this.highlightActiveChip(-1);
                    const hud = document.getElementById('avatar-active-hud');
                    if (hud) hud.classList.remove('active');
                });
            }

            const replayBtn = document.getElementById('btn-avatar-replay');
            if (replayBtn) {
                replayBtn.addEventListener('click', () => {
                    if (inputArea && inputArea.value.trim()) {
                        this.signPhrase(inputArea.value.trim());
                    }
                });
            }

            const speedSelect = document.getElementById('avatar-speed-select');
            if (speedSelect) {
                speedSelect.addEventListener('change', (e) => {
                    this.speed = parseFloat(e.target.value) || 1.0;
                });
            }

            // Avatar Model Style Switcher
            const styleSelect = document.getElementById('avatar-model-select');
            if (styleSelect) {
                styleSelect.addEventListener('change', (e) => {
                    this.applyModelStyle(e.target.value);
                });
            }

            // Camera Controls
            const resetCamBtn = document.getElementById('btn-cam-reset');
            if (resetCamBtn && this.camera && this.controls) {
                resetCamBtn.addEventListener('click', () => {
                    this.camera.position.set(0, 0.55, 2.75);
                    this.controls.target.set(0, 0.45, 0);
                    this.controls.update();
                });
            }

            // Timeline Controls
            const copyGlossBtn = document.getElementById('btn-copy-gloss');
            if (copyGlossBtn) {
                copyGlossBtn.addEventListener('click', () => {
                    const glossStr = this.currentTokens.map(t => t.token).join(' ');
                    if (glossStr && navigator.clipboard) {
                        navigator.clipboard.writeText(glossStr).then(() => {
                            const original = copyGlossBtn.innerHTML;
                            copyGlossBtn.innerHTML = `<span>Copied!</span>`;
                            setTimeout(() => { copyGlossBtn.innerHTML = original; }, 1500);
                        });
                    }
                });
            }

            // Quick Vocabulary Drawer Click Events
            document.querySelectorAll('.vocab-card-chip').forEach((chip) => {
                chip.addEventListener('click', () => {
                    const token = chip.getAttribute('data-token');
                    if (token) this.signSingleToken(token);
                });
            });

            // Keyboard Shortcuts
            window.addEventListener('keydown', (e) => {
                if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

                if (e.code === 'Space') {
                    e.preventDefault();
                    if (playPauseBtn) playPauseBtn.click();
                } else if (e.code === 'Escape') {
                    if (stopBtn) stopBtn.click();
                } else if (e.key === 'r' || e.key === 'R') {
                    if (replayBtn) replayBtn.click();
                }
            });
        }
    }

    // Expose class globally
    window.ASLAvatarStudio = ASLAvatarStudio;

    // Initialize once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.aslAvatarStudio = new ASLAvatarStudio();
        });
    } else {
        window.aslAvatarStudio = new ASLAvatarStudio();
    }

})();
