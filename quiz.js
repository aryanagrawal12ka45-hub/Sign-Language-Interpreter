// ASL Academy & Practice Engine v2.5.0
// Real-time gesture pose validation powered by MediaPipe Hands & TensorFlow.js

// --- DOM References ---
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusOverlay = document.getElementById('status-overlay');
const statusText = document.getElementById('status-text');
const fpsBadgeEl = document.getElementById('fps-badge');
const footerCameraStatus = document.getElementById('footer-camera-status');
const footerCameraDot = document.getElementById('footer-camera-dot');
const footerModelStatus = document.getElementById('footer-model-status');
const footerModelDot = document.getElementById('footer-model-dot');
const footerFps = document.getElementById('footer-fps');
const footerHighScore = document.getElementById('footer-high-score');
const cameraContainer = document.getElementById('camera-container');

// Target HUD
const quizTargetCard = document.getElementById('quiz-target-card');
const targetGlyphEl = document.getElementById('target-glyph');
const targetSubtextEl = document.getElementById('target-subtext');
const targetHintEl = document.getElementById('target-hint');
const targetCategoryBadge = document.getElementById('target-category-badge');
const targetHoldStatusEl = document.getElementById('target-hold-status');
const holdRingProgress = document.getElementById('hold-ring-progress');

// Stats HUD
const quizScoreEl = document.getElementById('quiz-score');
const quizStreakEl = document.getElementById('quiz-streak');
const quizAccuracyEl = document.getElementById('quiz-accuracy');
const quizStatusBadge = document.getElementById('quiz-status-badge');
const quizTimerContainer = document.getElementById('quiz-timer-container');
const quizTimerText = document.getElementById('quiz-timer-text');
const quizTimerFill = document.getElementById('quiz-timer-fill');
const primaryActionBtn = document.getElementById('primary-action-btn');
const primaryActionText = document.getElementById('primary-action-text');
const skipTargetBtn = document.getElementById('skip-target-btn');

// Records HUD
const recordHighScoreEl = document.getElementById('record-high-score');
const recordBestStreakEl = document.getElementById('record-best-streak');
const recordTotalSignsEl = document.getElementById('record-total-signs');
const recordTotalRoundsEl = document.getElementById('record-total-rounds');

// Summary Modal
const summaryModal = document.getElementById('quiz-summary-modal');
const modalScoreEl = document.getElementById('modal-metric-score');
const modalStreakEl = document.getElementById('modal-metric-streak');
const modalSolvedEl = document.getElementById('modal-metric-solved');
const modalAccuracyEl = document.getElementById('modal-metric-accuracy');
const modalPlayAgainBtn = document.getElementById('modal-play-again-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

// --- Audio Synthesizer (Web Audio API) ---
let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone(freq, duration, type = 'sine', gainVal = 0.2) {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        console.warn('Audio tone failed:', e);
    }
}

function playSuccessChime() {
    // Rising major triad arpeggio (C5 - E5 - G5)
    setTimeout(() => playTone(523.25, 0.12, 'triangle', 0.25), 0);
    setTimeout(() => playTone(659.25, 0.12, 'triangle', 0.25), 80);
    setTimeout(() => playTone(783.99, 0.22, 'sine', 0.3), 160);
}

function playStreakFanfare() {
    // Triumphant streak sound
    setTimeout(() => playTone(659.25, 0.12, 'triangle', 0.3), 0);
    setTimeout(() => playTone(783.99, 0.12, 'triangle', 0.3), 100);
    setTimeout(() => playTone(1046.50, 0.35, 'sine', 0.35), 200);
}

function playErrorTone() {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
        console.warn('Audio tone failed:', e);
    }
}

function playTickTone() {
    playTone(440, 0.05, 'sine', 0.1);
}

// --- Target Vocabulary Database (All 26 Letters, 10 Numbers, 8 Common Signs) ---
const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const VOCABULARY = [
    // --- LETTERS A - Z (26) ---
    { id: 'A', glyph: 'A', label: 'Letter A', category: 'alphabet', hint: 'Closed fist with thumb upright along side of index finger.' },
    { id: 'B', glyph: 'B', label: 'Letter B', category: 'alphabet', hint: 'Flat open palm with 4 fingers pointing up and thumb folded across palm.' },
    { id: 'C', glyph: 'C', label: 'Letter C', category: 'alphabet', hint: 'Curve fingers and thumb naturally to form an open "C" arc.' },
    { id: 'D', glyph: 'D', label: 'Letter D', category: 'alphabet', hint: 'Index finger straight up; thumb touches middle, ring, and pinky tips in a ring.' },
    { id: 'E', glyph: 'E', label: 'Letter E', category: 'alphabet', hint: 'All fingertips curled tightly down resting on top of thumb tucked underneath.' },
    { id: 'F', glyph: 'F', label: 'Letter F', category: 'alphabet', hint: 'Touch index tip to thumb tip in a circle; middle, ring, and pinky straight up.' },
    { id: 'G', glyph: 'G', label: 'Letter G', category: 'alphabet', hint: 'Index and thumb extend horizontally sideways in parallel; others closed.' },
    { id: 'H', glyph: 'H', label: 'Letter H', category: 'alphabet', hint: 'Index and middle fingers extend horizontally together; thumb tucked under.' },
    { id: 'I', glyph: 'I', label: 'Letter I', category: 'alphabet', hint: 'Pinky finger straight up; curling thumb and other three fingers into a fist.' },
    { id: 'J', glyph: 'J', label: 'Letter J', category: 'alphabet', hint: 'Start with pinky upright, then swoop pinky in a curve like a "J".' },
    { id: 'K', glyph: 'K', label: 'Letter K', category: 'alphabet', hint: 'Index straight up, middle pointed forward, thumb between them.' },
    { id: 'L', glyph: 'L', label: 'Letter L', category: 'alphabet', hint: 'Index finger straight up and thumb extended horizontal at 90 degrees ("L").' },
    { id: 'M', glyph: 'M', label: 'Letter M', category: 'alphabet', hint: 'Fist with thumb tucked under the first three folded fingers.' },
    { id: 'N', glyph: 'N', label: 'Letter N', category: 'alphabet', hint: 'Fist with thumb tucked under the first two folded fingers.' },
    { id: 'O', glyph: 'O', label: 'Letter O', category: 'alphabet', hint: 'All four fingertips touch thumb tip forming a complete open circle.' },
    { id: 'P', glyph: 'P', label: 'Letter P', category: 'alphabet', hint: 'Like letter K, but inverted pointing downward towards ground.' },
    { id: 'Q', glyph: 'Q', label: 'Letter Q', category: 'alphabet', hint: 'Like letter G, but index and thumb point downward toward floor.' },
    { id: 'R', glyph: 'R', label: 'Letter R', category: 'alphabet', hint: 'Index and middle fingers extended straight up and crossed over.' },
    { id: 'S', glyph: 'S', label: 'Letter S', category: 'alphabet', hint: 'Solid closed fist with thumb wrapped across front of fingers.' },
    { id: 'T', glyph: 'T', label: 'Letter T', category: 'alphabet', hint: 'Fist with thumb tucked between index and middle finger.' },
    { id: 'U', glyph: 'U', label: 'Letter U', category: 'alphabet', hint: 'Index and middle fingers upright together touching; other fingers folded.' },
    { id: 'V', glyph: 'V', label: 'Letter V', category: 'alphabet', hint: 'Index and middle fingers upright spread into a separated "V" shape.' },
    { id: 'W', glyph: 'W', label: 'Letter W', category: 'alphabet', hint: 'Index, middle, and ring fingers spread upright in a "W" shape.' },
    { id: 'X', glyph: 'X', label: 'Letter X', category: 'alphabet', hint: 'Fist with index finger raised and bent into a curled hook.' },
    { id: 'Y', glyph: 'Y', label: 'Letter Y', category: 'alphabet', hint: 'Extend thumb and pinky outward (shaka sign) with 3 middle fingers curled.' },
    { id: 'Z', glyph: 'Z', label: 'Letter Z', category: 'alphabet', hint: 'Index finger extended tracing a Z pattern in the air.' },

    // --- NUMBERS 0 - 9 (10) ---
    { id: '0', glyph: '0', label: 'Number 0', category: 'numbers', hint: 'All fingertips touch thumb tip forming an "O" shape.' },
    { id: '1', glyph: '1', label: 'Number 1', category: 'numbers', hint: 'Index finger extended straight up; other fingers curled with thumb.' },
    { id: '2', glyph: '2', label: 'Number 2', category: 'numbers', hint: 'Index and middle fingers extended upright; other fingers closed.' },
    { id: '3', glyph: '3', label: 'Number 3', category: 'numbers', hint: 'Thumb, index, and middle fingers extended outward (standard ASL 3).' },
    { id: '4', glyph: '4', label: 'Number 4', category: 'numbers', hint: 'Four fingers upright spread slightly; thumb folded across palm.' },
    { id: '5', glyph: '5', label: 'Number 5', category: 'numbers', hint: 'All five fingers extended and spread wide facing camera.' },
    { id: '6', glyph: '6', label: 'Number 6', category: 'numbers', hint: 'Index, middle, and ring upright; pinky touches thumb tip.' },
    { id: '7', glyph: '7', label: 'Number 7', category: 'numbers', hint: 'Index, middle, and pinky upright; ring finger touches thumb tip.' },
    { id: '8', glyph: '8', label: 'Number 8', category: 'numbers', hint: 'Index, ring, and pinky upright; middle finger touches thumb tip.' },
    { id: '9', glyph: '9', label: 'Number 9', category: 'numbers', hint: 'Middle, ring, and pinky upright; index finger touches thumb tip.' },

    // --- COMMON SIGNS (8) ---
    { id: 'PEACE', glyph: 'PEACE', label: 'Peace / Victory', category: 'signs', hint: 'Index and middle fingers spread in a wide "V", palm forward.' },
    { id: 'THUMBS_UP', glyph: 'THUMBS UP', label: 'Thumbs Up', category: 'signs', hint: 'Closed fist with thumb extended straight up vertically.' },
    { id: 'THUMBS_DOWN', glyph: 'THUMBS DOWN', label: 'Thumbs Down', category: 'signs', hint: 'Closed fist with thumb extended straight down vertically.' },
    { id: 'OK', glyph: 'OK', label: 'OK Sign', category: 'signs', hint: 'Thumb and index form a circle; 3 other fingers straight up.' },
    { id: 'I_LOVE_YOU', glyph: 'I LOVE YOU', label: 'I Love You (ILY)', category: 'signs', hint: 'Thumb, index, and pinky extended with middle and ring curled.' },
    { id: 'ROCK_ON', glyph: 'HORNS', label: 'Rock On / Horns', category: 'signs', hint: 'Index and pinky fingers upright; thumb holds middle and ring.' },
    { id: 'OPEN_PALM', glyph: 'OPEN PALM', label: 'Open Palm', category: 'signs', hint: 'All five fingers straight and extended flat towards camera.' },
    { id: 'FIST', glyph: 'FIST', label: 'Closed Fist', category: 'signs', hint: 'All fingers and thumb curled firmly into a solid fist.' }
];

// --- Deep Learning Engine (TensorFlow.js) ---
let mlModel = null;
let isModelReady = false;
let isModelInferenceBusy = false;

async function buildAndLoadModel() {
    try {
        console.log("[Quiz] Loading pre-trained neural network from ./models/model.json...");
        const model = await tf.loadLayersModel('./models/model.json');
        model.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        mlModel = model;
        isModelReady = true;
        console.log("[Quiz] Pre-trained Neural Network Loaded Successfully!");
        if (footerModelStatus) footerModelStatus.textContent = 'Active (Deep Learning)';
        if (footerModelDot) {
            footerModelDot.style.background = 'var(--accent-color)';
            footerModelDot.style.boxShadow = '0 0 6px var(--accent-glow)';
        }
    } catch (e) {
        console.warn("[Quiz] Local model.json load failed, checking IndexedDB cache...", e);
        try {
            const cachedModel = await tf.loadLayersModel('indexeddb://asl-alphabet-model');
            cachedModel.compile({
                optimizer: 'adam',
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });
            mlModel = cachedModel;
            isModelReady = true;
            console.log("[Quiz] Loaded cached model from IndexedDB!");
            if (footerModelStatus) footerModelStatus.textContent = 'Active (Cached)';
            if (footerModelDot) {
                footerModelDot.style.background = 'var(--accent-color)';
                footerModelDot.style.boxShadow = '0 0 6px var(--accent-glow)';
            }
        } catch (err2) {
            console.warn("[Quiz] Deep learning model unavailable. Geometric analyzer active.", err2);
            if (footerModelStatus) footerModelStatus.textContent = 'Active (Geometric)';
            if (footerModelDot) {
                footerModelDot.style.background = 'var(--accent-emerald)';
            }
        }
    }
}

// Start loading the ML model
buildAndLoadModel();

// Standard Keypoint Normalization (Wrist-relative, scaled to [-1, 1], matches training pipeline)
function extractNormalizedFeatures(landmarks) {
    const features = [];
    const wristX = landmarks[0].x;
    const wristY = landmarks[0].y;

    for (let i = 0; i < landmarks.length; i++) {
        features.push(landmarks[i].x - wristX);
        features.push(landmarks[i].y - wristY);
    }

    let maxVal = 0;
    for (let i = 0; i < features.length; i++) {
        if (Math.abs(features[i]) > maxVal) {
            maxVal = Math.abs(features[i]);
        }
    }

    if (maxVal === 0) maxVal = 1;

    for (let i = 0; i < features.length; i++) {
        features[i] = features[i] / maxVal;
    }

    return features;
}

// --- Game State ---
let gameMode = 'practice'; // 'practice' | 'speed'
let activeCategory = 'all'; // 'all' | 'alphabet' | 'numbers' | 'signs'
let isSpeedRunActive = false;
let speedRunTimer = null;
let speedRunSecondsLeft = 60;

let currentTarget = null;
let currentScore = 0;
let currentStreak = 0;
let maxStreakInSession = 0;
let totalAttempts = 0;
let successfulAttempts = 0;

let consecutiveHoldFrames = 0;
const REQUIRED_HOLD_FRAMES = 8; // ~350-400ms at ~20-25 FPS
const RING_CIRCUMFERENCE = 402.12; // 2 * PI * 64

let consecutiveWrongFrames = 0;
const WRONG_HOLD_THRESHOLD = 14; // ~600ms of sustained wrong sign
let wrongCooldownUntil = 0;

// --- Career Records & Persistence ---
function loadCareerRecords() {
    const high = parseInt(localStorage.getItem('asl_quiz_high_score') || '0', 10);
    const bestStreak = parseInt(localStorage.getItem('asl_quiz_best_streak') || '0', 10);
    const totalSigns = parseInt(localStorage.getItem('asl_quiz_total_signs') || '0', 10);
    const totalRounds = parseInt(localStorage.getItem('asl_quiz_total_rounds') || '0', 10);

    if (recordHighScoreEl) recordHighScoreEl.textContent = high;
    if (recordBestStreakEl) recordBestStreakEl.textContent = bestStreak;
    if (recordTotalSignsEl) recordTotalSignsEl.textContent = totalSigns;
    if (recordTotalRoundsEl) recordTotalRoundsEl.textContent = totalRounds;
    if (footerHighScore) footerHighScore.textContent = high;
}

function checkAndRecordHighScore(score) {
    const prevHigh = parseInt(localStorage.getItem('asl_quiz_high_score') || '0', 10);
    if (score > prevHigh) {
        localStorage.setItem('asl_quiz_high_score', score);
        if (recordHighScoreEl) recordHighScoreEl.textContent = score;
        if (footerHighScore) footerHighScore.textContent = score;
    }
}

function checkAndRecordBestStreak(streak) {
    const prevStreak = parseInt(localStorage.getItem('asl_quiz_best_streak') || '0', 10);
    if (streak > prevStreak) {
        localStorage.setItem('asl_quiz_best_streak', streak);
        if (recordBestStreakEl) recordBestStreakEl.textContent = streak;
    }
}

function recordCareerSignSolved() {
    const prevSigns = parseInt(localStorage.getItem('asl_quiz_total_signs') || '0', 10);
    const newSigns = prevSigns + 1;
    localStorage.setItem('asl_quiz_total_signs', newSigns);
    if (recordTotalSignsEl) recordTotalSignsEl.textContent = newSigns;

    const prevAttempts = parseInt(localStorage.getItem('asl_quiz_total_attempts') || '0', 10);
    localStorage.setItem('asl_quiz_total_attempts', prevAttempts + 1);
}

function recordCareerAttemptFailed() {
    const prevAttempts = parseInt(localStorage.getItem('asl_quiz_total_attempts') || '0', 10);
    localStorage.setItem('asl_quiz_total_attempts', prevAttempts + 1);
}

// --- Target Generation ---
function getFilteredVocabulary() {
    if (activeCategory === 'all') return VOCABULARY;
    return VOCABULARY.filter(v => v.category === activeCategory);
}

function pickNextTarget() {
    const list = getFilteredVocabulary();
    if (list.length === 0) return;

    let next = list[Math.floor(Math.random() * list.length)];
    // Ensure we don't pick the exact same sign back to back if list > 1
    if (currentTarget && list.length > 1) {
        let attempts = 0;
        while (next.id === currentTarget.id && attempts < 10) {
            next = list[Math.floor(Math.random() * list.length)];
            attempts++;
        }
    }
    currentTarget = next;
    consecutiveHoldFrames = 0;
    consecutiveWrongFrames = 0;
    updateHoldRing(0, false);

    if (quizTargetCard) {
        quizTargetCard.classList.remove('matched', 'mismatched');
    }
    if (targetGlyphEl) {
        targetGlyphEl.textContent = currentTarget.glyph;
        targetGlyphEl.style.fontSize = currentTarget.glyph.length > 2 ? '2.4rem' : '3.8rem';
    }
    if (targetSubtextEl) targetSubtextEl.textContent = currentTarget.label;
    if (targetHintEl) targetHintEl.textContent = currentTarget.hint;
    if (targetCategoryBadge) {
        targetCategoryBadge.textContent = `Category: ${currentTarget.category.toUpperCase()}`;
    }
    if (targetHoldStatusEl) {
        targetHoldStatusEl.textContent = 'Hold pose for 0.4s';
    }
}

function updateHoldRing(pct, isMismatched = false) {
    if (!holdRingProgress) return;
    const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
    holdRingProgress.style.strokeDashoffset = offset;
    if (isMismatched) {
        holdRingProgress.classList.add('mismatched');
    } else {
        holdRingProgress.classList.remove('mismatched');
    }
}

function updateStatsHUD() {
    if (quizScoreEl) quizScoreEl.textContent = currentScore;
    if (quizStreakEl) quizStreakEl.textContent = currentStreak;

    // Accurate accuracy calculation based on actual attempts
    const acc = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 100;
    if (quizAccuracyEl) {
        quizAccuracyEl.textContent = acc + '%';
        quizAccuracyEl.classList.remove('acc-high', 'acc-mid', 'acc-low');
        if (acc >= 90) quizAccuracyEl.classList.add('acc-high');
        else if (acc >= 70) quizAccuracyEl.classList.add('acc-mid');
        else quizAccuracyEl.classList.add('acc-low');
    }

    // Real-time career record synchronization
    checkAndRecordHighScore(currentScore);
    checkAndRecordBestStreak(currentStreak);
}

// --- Geometric Hand Landmark Analyzer ---
function lmDist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function detectGeometricPoses(landmarks) {
    if (!landmarks || landmarks.length < 21) return { detected: [], primary: null, conf: 0 };

    const wrist = landmarks[0];
    const palmSize = lmDist(wrist, landmarks[9]) || 0.1;

    // Finger extensions
    const isIndexExt = lmDist(landmarks[8], wrist) > lmDist(landmarks[6], wrist) * 1.15 &&
                       lmDist(landmarks[8], landmarks[5]) > palmSize * 0.70;
    const isMiddleExt = lmDist(landmarks[12], wrist) > lmDist(landmarks[10], wrist) * 1.15 &&
                        lmDist(landmarks[12], landmarks[9]) > palmSize * 0.70;
    const isRingExt = lmDist(landmarks[16], wrist) > lmDist(landmarks[14], wrist) * 1.15 &&
                      lmDist(landmarks[16], landmarks[13]) > palmSize * 0.70;
    const isPinkyExt = lmDist(landmarks[20], wrist) > lmDist(landmarks[18], wrist) * 1.15 &&
                       lmDist(landmarks[20], landmarks[17]) > palmSize * 0.70;
    const isThumbExt = lmDist(landmarks[4], landmarks[9]) > palmSize * 0.85;

    // Finger curls
    const isIndexCurled = lmDist(landmarks[8], wrist) < lmDist(landmarks[6], wrist) * 1.08;
    const isMiddleCurled = lmDist(landmarks[12], wrist) < lmDist(landmarks[10], wrist) * 1.08;
    const isRingCurled = lmDist(landmarks[16], wrist) < lmDist(landmarks[14], wrist) * 1.08;
    const isPinkyCurled = lmDist(landmarks[20], wrist) < lmDist(landmarks[18], wrist) * 1.08;

    // Thumb pinches / touches with fingertips
    const touchThumbIndex = lmDist(landmarks[4], landmarks[8]) < palmSize * 0.42;
    const touchThumbMiddle = lmDist(landmarks[4], landmarks[12]) < palmSize * 0.42;
    const touchThumbRing = lmDist(landmarks[4], landmarks[16]) < palmSize * 0.42;
    const touchThumbPinky = lmDist(landmarks[4], landmarks[20]) < palmSize * 0.42;

    const isThumbUp = (landmarks[4].y < landmarks[3].y) && (landmarks[4].y < landmarks[5].y);
    const isThumbDown = (landmarks[4].y > landmarks[3].y) && (landmarks[4].y > landmarks[0].y);
    const isIndexMiddleSpread = lmDist(landmarks[8], landmarks[12]) > palmSize * 0.32;

    const detected = [];
    let primary = null;
    let conf = 0;

    // --- COMMON SIGNS ---
    if (isThumbUp && isThumbExt && isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled) {
        detected.push('THUMBS_UP'); primary = 'THUMBS_UP'; conf = 0.92;
    }
    if (isThumbDown && isThumbExt && isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled) {
        detected.push('THUMBS_DOWN'); primary = 'THUMBS_DOWN'; conf = 0.90;
    }
    if (touchThumbIndex && isMiddleExt && isRingExt && isPinkyExt) {
        detected.push('OK'); primary = 'OK'; conf = 0.91;
    }
    if (isThumbExt && isIndexExt && isPinkyExt && isMiddleCurled && isRingCurled) {
        detected.push('I_LOVE_YOU'); primary = 'I_LOVE_YOU'; conf = 0.93;
    }
    if (isIndexExt && isPinkyExt && isMiddleCurled && isRingCurled && !isThumbExt) {
        detected.push('ROCK_ON'); primary = 'ROCK_ON'; conf = 0.90;
    }
    if (isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled && isIndexMiddleSpread) {
        detected.push('PEACE'); primary = 'PEACE'; conf = 0.90;
    }
    if (isThumbExt && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
        detected.push('OPEN_PALM'); primary = 'OPEN_PALM'; conf = 0.89;
    }
    if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && !isThumbExt) {
        detected.push('FIST'); primary = 'FIST'; conf = 0.88;
    }

    // --- ASL NUMBERS (0 - 9) ---
    if (touchThumbIndex && touchThumbMiddle) {
        detected.push('0'); if (!primary) { primary = '0'; conf = 0.88; }
    }
    if (isIndexExt && isMiddleCurled && isRingCurled && isPinkyCurled && !isThumbExt) {
        detected.push('1'); if (!primary) { primary = '1'; conf = 0.90; }
    }
    if (isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled && !isThumbExt && !isIndexMiddleSpread) {
        detected.push('2'); if (!primary) { primary = '2'; conf = 0.89; }
    }
    if (isThumbExt && isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled) {
        detected.push('3'); if (!primary) { primary = '3'; conf = 0.92; }
    }
    if (!isThumbExt && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
        detected.push('4'); if (!primary) { primary = '4'; conf = 0.91; }
    }
    if (isThumbExt && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
        detected.push('5'); if (!primary) { primary = '5'; conf = 0.90; }
    }
    if (isIndexExt && isMiddleExt && isRingExt && touchThumbPinky) {
        detected.push('6'); if (!primary) { primary = '6'; conf = 0.87; }
    }
    if (isIndexExt && isMiddleExt && isPinkyExt && touchThumbRing) {
        detected.push('7'); if (!primary) { primary = '7'; conf = 0.87; }
    }
    if (isIndexExt && isRingExt && isPinkyExt && touchThumbMiddle) {
        detected.push('8'); if (!primary) { primary = '8'; conf = 0.87; }
    }
    if (isMiddleExt && isRingExt && isPinkyExt && touchThumbIndex) {
        detected.push('9'); if (!primary) { primary = '9'; conf = 0.88; }
    }

    // --- GEOMETRIC HEURISTIC FALLBACK FOR LETTERS ---
    if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && isThumbExt) detected.push('A');
    if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt && !isThumbExt) detected.push('B');
    // Letter C: Curved fingers and thumb forming arc
    const arcDist = lmDist(landmarks[8], landmarks[4]);
    if (arcDist > palmSize * 0.35 && arcDist < palmSize * 0.95 && !isIndexExt && !isIndexCurled) detected.push('C');
    if (isIndexExt && isMiddleCurled && isRingCurled && isPinkyCurled && touchThumbMiddle) detected.push('D');
    // Letter E: All curled down resting on thumb
    if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && !isThumbExt) detected.push('E');
    if (touchThumbIndex && isMiddleExt && isRingExt && isPinkyExt) detected.push('F');
    if (isPinkyExt && isIndexCurled && isMiddleCurled && isRingCurled) detected.push('I');
    if (isIndexExt && isThumbExt && isMiddleCurled && isRingCurled && isPinkyCurled) detected.push('L');
    if (touchThumbIndex && touchThumbMiddle && isRingCurled && isPinkyCurled) detected.push('O');
    if (isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled && isIndexMiddleSpread) detected.push('V');
    if (isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled && !isIndexMiddleSpread) detected.push('U');
    if (isIndexExt && isMiddleExt && isRingExt && isPinkyCurled) detected.push('W');
    if (isThumbExt && isPinkyExt && isIndexCurled && isMiddleCurled && isRingCurled) detected.push('Y');

    return { detected, primary, conf };
}

// Unified Pose Evaluator: Combines Deep Learning Model (A-Z) and Geometric Analyzers
function evaluateAllPoses(landmarks) {
    const geo = detectGeometricPoses(landmarks);
    const detectedList = [...geo.detected];
    let topLabel = geo.primary;
    let topConfidence = geo.conf;

    // Deep Learning inference for Alphabet
    if (isModelReady && mlModel && !isModelInferenceBusy && landmarks && landmarks.length >= 21) {
        isModelInferenceBusy = true;
        try {
            const features = extractNormalizedFeatures(landmarks);
            const dlTensor = tf.tensor2d([features]);
            const prediction = mlModel.predict(dlTensor);
            const probabilities = prediction.dataSync();

            let bestClass = 0;
            let maxProb = probabilities[0];
            for (let i = 1; i < probabilities.length; i++) {
                if (probabilities[i] > maxProb) {
                    maxProb = probabilities[i];
                    bestClass = i;
                }
            }

            const predictedLetter = ALPHABET[bestClass];
            if (maxProb >= 0.48 && predictedLetter) {
                if (!detectedList.includes(predictedLetter)) {
                    detectedList.push(predictedLetter);
                }
                if (maxProb > topConfidence) {
                    topLabel = predictedLetter;
                    topConfidence = maxProb;
                }
            }

            // Also check second top prediction if close
            let secondClass = -1;
            let secondProb = 0;
            for (let i = 0; i < probabilities.length; i++) {
                if (i !== bestClass && probabilities[i] > secondProb) {
                    secondProb = probabilities[i];
                    secondClass = i;
                }
            }
            if (secondProb >= 0.38 && secondClass >= 0) {
                const secondLetter = ALPHABET[secondClass];
                if (secondLetter && !detectedList.includes(secondLetter)) {
                    detectedList.push(secondLetter);
                }
            }

            prediction.dispose();
            dlTensor.dispose();
        } catch (err) {
            console.warn('[Quiz] DL Inference warning:', err);
        } finally {
            isModelInferenceBusy = false;
        }
    }

    return { detectedList, topLabel, topConfidence };
}

// --- Frame Evaluation & Pose Verification Loop ---
function evaluateFrame(landmarks) {
    if (!currentTarget || !landmarks) {
        if (consecutiveHoldFrames > 0) {
            consecutiveHoldFrames = Math.max(0, consecutiveHoldFrames - 2);
            const pct = Math.round((consecutiveHoldFrames / REQUIRED_HOLD_FRAMES) * 100);
            updateHoldRing(pct, false);
            if (consecutiveHoldFrames === 0 && quizTargetCard) {
                quizTargetCard.classList.remove('matched');
            }
        }
        consecutiveWrongFrames = 0;
        if (targetHoldStatusEl) targetHoldStatusEl.textContent = 'Position hand in camera frame';
        return;
    }

    const { detectedList, topLabel, topConfidence } = evaluateAllPoses(landmarks);
    const isMatched = detectedList && detectedList.includes(currentTarget.id);

    if (isMatched) {
        // Correct pose actively detected!
        consecutiveWrongFrames = 0;
        consecutiveHoldFrames++;
        if (quizTargetCard) {
            quizTargetCard.classList.remove('mismatched');
            quizTargetCard.classList.add('matched');
        }

        const pct = Math.min(100, Math.round((consecutiveHoldFrames / REQUIRED_HOLD_FRAMES) * 100));
        updateHoldRing(pct, false);
        if (targetHoldStatusEl) {
            targetHoldStatusEl.textContent = `Holding ${currentTarget.label}... ${pct}%`;
        }

        if (consecutiveHoldFrames >= REQUIRED_HOLD_FRAMES) {
            // SUCCESS: Lock in sign, update streak, score, accuracy, and career records
            onSignSolved();
        }
    } else {
        // Not matching current target
        if (consecutiveHoldFrames > 0) {
            consecutiveHoldFrames = Math.max(0, consecutiveHoldFrames - 1);
            const pct = Math.round((consecutiveHoldFrames / REQUIRED_HOLD_FRAMES) * 100);
            updateHoldRing(pct, false);
            if (consecutiveHoldFrames === 0 && quizTargetCard) {
                quizTargetCard.classList.remove('matched');
            }
        }

        // Check if user is sustaining a definite WRONG sign
        const now = Date.now();
        if (topLabel && topLabel !== currentTarget.id && topConfidence >= 0.70 && now > wrongCooldownUntil) {
            consecutiveWrongFrames++;
            if (targetHoldStatusEl) {
                targetHoldStatusEl.textContent = `Detected: ${topLabel} (Need: ${currentTarget.glyph})`;
            }

            if (consecutiveWrongFrames >= WRONG_HOLD_THRESHOLD) {
                // Definite incorrect attempt triggered
                onIncorrectAttempt(topLabel);
            }
        } else {
            consecutiveWrongFrames = Math.max(0, consecutiveWrongFrames - 1);
            if (targetHoldStatusEl && consecutiveHoldFrames === 0) {
                targetHoldStatusEl.textContent = 'Hold pose for 0.4s';
            }
        }
    }
}

// --- Action & Resolution Handlers ---
function onSignSolved() {
    successfulAttempts++;
    totalAttempts++;
    currentStreak++;
    if (currentStreak > maxStreakInSession) maxStreakInSession = currentStreak;

    // Calculate score with streak combo multiplier: 1.0x -> 1.2x -> 1.4x ... up to 3.0x max
    const multiplier = Math.min(3.0, 1 + (currentStreak - 1) * 0.2);
    const basePoints = 100;
    const earned = Math.round(basePoints * multiplier);
    currentScore += earned;

    // Persist career solved signs & check records
    recordCareerSignSolved();
    updateStatsHUD();

    // Sound feedback
    if (currentStreak > 0 && currentStreak % 5 === 0) {
        playStreakFanfare();
    } else {
        playSuccessChime();
    }

    if (targetHoldStatusEl) {
        targetHoldStatusEl.textContent = `Matched! +${earned} pts (${multiplier.toFixed(1)}x)`;
    }

    // Flash animation on target card
    if (quizTargetCard) {
        quizTargetCard.classList.add('matched');
        quizTargetCard.style.transform = 'scale(1.08)';
        setTimeout(() => {
            if (quizTargetCard) quizTargetCard.style.transform = '';
        }, 220);
    }

    // Advance to next target after brief celebration pause
    setTimeout(() => {
        consecutiveHoldFrames = 0;
        updateHoldRing(0, false);
        pickNextTarget();
    }, 280);
}

function onIncorrectAttempt(detectedLabel) {
    totalAttempts++;
    currentStreak = 0; // Reset streak on incorrect attempt
    recordCareerAttemptFailed();
    wrongCooldownUntil = Date.now() + 1400; // 1.4s cooldown to prevent repeated penalty
    consecutiveWrongFrames = 0;

    updateStatsHUD();
    playErrorTone();

    // Visual shake feedback on card
    if (quizTargetCard) {
        quizTargetCard.classList.remove('matched');
        quizTargetCard.classList.add('mismatched');
        setTimeout(() => {
            if (quizTargetCard) quizTargetCard.classList.remove('mismatched');
        }, 400);
    }

    updateHoldRing(100, true);
    setTimeout(() => {
        updateHoldRing(0, false);
    }, 320);

    if (targetHoldStatusEl) {
        targetHoldStatusEl.textContent = `Incorrect sign (${detectedLabel}). Try again!`;
    }
}

function skipCurrentSign() {
    totalAttempts++;
    currentStreak = 0; // Reset streak on skip
    recordCareerAttemptFailed();
    updateStatsHUD();
    playErrorTone();

    if (quizTargetCard) {
        quizTargetCard.classList.add('mismatched');
        setTimeout(() => {
            if (quizTargetCard) quizTargetCard.classList.remove('mismatched');
        }, 300);
    }

    consecutiveHoldFrames = 0;
    consecutiveWrongFrames = 0;
    updateHoldRing(0, false);

    if (targetHoldStatusEl) {
        targetHoldStatusEl.textContent = 'Sign skipped. Streak reset!';
    }

    pickNextTarget();
}

// --- Speed Run Timer Loop ---
function startSpeedRun() {
    if (isSpeedRunActive) return;
    isSpeedRunActive = true;
    speedRunSecondsLeft = 60;
    currentScore = 0;
    currentStreak = 0;
    successfulAttempts = 0;
    totalAttempts = 0;

    updateStatsHUD();
    if (quizTimerContainer) quizTimerContainer.style.display = 'block';
    if (quizStatusBadge) {
        quizStatusBadge.textContent = '60s Speed Run Active';
        quizStatusBadge.classList.add('connected');
    }
    if (primaryActionText) primaryActionText.textContent = 'End Round';

    pickNextTarget();

    speedRunTimer = setInterval(() => {
        speedRunSecondsLeft--;
        if (quizTimerText) quizTimerText.textContent = speedRunSecondsLeft + 's';
        if (quizTimerFill) {
            const pct = Math.max(0, (speedRunSecondsLeft / 60) * 100);
            quizTimerFill.style.width = pct + '%';
            if (speedRunSecondsLeft <= 10) {
                quizTimerFill.classList.add('urgent');
                playTickTone();
            } else {
                quizTimerFill.classList.remove('urgent');
            }
        }

        if (speedRunSecondsLeft <= 0) {
            endSpeedRun();
        }
    }, 1000);
}

function endSpeedRun() {
    clearInterval(speedRunTimer);
    isSpeedRunActive = false;
    if (quizStatusBadge) quizStatusBadge.textContent = 'Round Finished';
    if (primaryActionText) primaryActionText.textContent = 'Start Speed Run';
    if (quizTimerContainer) quizTimerContainer.style.display = 'none';

    // Record Speed Run round count
    const prevRounds = parseInt(localStorage.getItem('asl_quiz_total_rounds') || '0', 10);
    localStorage.setItem('asl_quiz_total_rounds', prevRounds + 1);
    if (recordTotalRoundsEl) recordTotalRoundsEl.textContent = prevRounds + 1;

    // Show completion summary modal
    if (modalScoreEl) modalScoreEl.textContent = currentScore;
    if (modalStreakEl) modalStreakEl.textContent = maxStreakInSession;
    if (modalSolvedEl) modalSolvedEl.textContent = successfulAttempts;
    const acc = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 100;
    if (modalAccuracyEl) modalAccuracyEl.textContent = acc + '%';
    if (summaryModal) summaryModal.classList.add('open');

    playStreakFanfare();
}

// --- UI Event Listeners ---
if (primaryActionBtn) {
    primaryActionBtn.addEventListener('click', () => {
        if (gameMode === 'speed') {
            if (isSpeedRunActive) {
                endSpeedRun();
            } else {
                startSpeedRun();
            }
        } else {
            // In free practice mode, clicking primary button starts speed run
            setGameMode('speed');
            startSpeedRun();
        }
    });
}

if (skipTargetBtn) {
    skipTargetBtn.addEventListener('click', skipCurrentSign);
}

// Practice Mode vs Speed Run Mode pills
function setGameMode(mode) {
    gameMode = mode;
    document.querySelectorAll('#quiz-mode-pills .pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-qmode') === mode);
    });

    if (mode === 'speed') {
        if (primaryActionText) primaryActionText.textContent = 'Start Speed Run';
        if (quizStatusBadge) quizStatusBadge.textContent = 'Ready for Speed Run';
    } else {
        if (isSpeedRunActive) clearInterval(speedRunTimer);
        isSpeedRunActive = false;
        if (quizTimerContainer) quizTimerContainer.style.display = 'none';
        if (primaryActionText) primaryActionText.textContent = 'Switch to Speed Run';
        if (quizStatusBadge) quizStatusBadge.textContent = 'Practice Mode';
    }
}

document.getElementById('quiz-mode-pills')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (btn) {
        const mode = btn.getAttribute('data-qmode');
        if (mode) setGameMode(mode);
    }
});

// Category pills
document.getElementById('quiz-category-pills')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (btn) {
        const cat = btn.getAttribute('data-qcat');
        if (cat) {
            activeCategory = cat;
            document.querySelectorAll('#quiz-category-pills .pill-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-qcat') === cat);
            });
            pickNextTarget();
        }
    }
});

// Summary Modal buttons
if (modalPlayAgainBtn) {
    modalPlayAgainBtn.addEventListener('click', () => {
        if (summaryModal) summaryModal.classList.remove('open');
        setGameMode('speed');
        startSpeedRun();
    });
}

if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
        if (summaryModal) summaryModal.classList.remove('open');
        setGameMode('practice');
    });
}

// --- Camera-Free Simulation & Practice Testing Suite ---
let isSimulatingHold = false;

function simulateSignMatch() {
    if (isSimulatingHold) return;
    isSimulatingHold = true;

    // Simulate the 0.4s hold ring progress filling up smoothly
    let p = 0;
    const interval = setInterval(() => {
        p += 25;
        updateHoldRing(p, false);
        if (p >= 100) {
            clearInterval(interval);
            isSimulatingHold = false;
            onSignSolved();
        }
    }, 70);
}

function simulateSignWrong() {
    if (isSimulatingHold) return;
    onIncorrectAttempt('Simulated Wrong Pose');
}

// Wire up Simulation UI Buttons
const simCorrectBtn = document.getElementById('sim-correct-btn');
if (simCorrectBtn) {
    simCorrectBtn.addEventListener('click', simulateSignMatch);
}

const simWrongBtn = document.getElementById('sim-wrong-btn');
if (simWrongBtn) {
    simWrongBtn.addEventListener('click', simulateSignWrong);
}

// Wire up Virtual Camera Mode button on error overlay
const cameraSimulateBtn = document.getElementById('camera-simulate-btn');
if (cameraSimulateBtn) {
    cameraSimulateBtn.addEventListener('click', () => {
        if (cameraManager) {
            cameraManager.hideError();
        }
        if (statusOverlay) statusOverlay.style.display = 'none';
        
        // Draw virtual practice canvas backdrop
        const rect = canvasElement.getBoundingClientRect();
        canvasElement.width = rect.width || 640;
        canvasElement.height = rect.height || 480;
        canvasCtx.fillStyle = '#0b1017';
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.fillStyle = '#10b981';
        canvasCtx.font = '600 16px Inter, sans-serif';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText('🎮 Virtual Camera Simulator Mode Active', canvasElement.width / 2, canvasElement.height / 2 - 12);
        canvasCtx.fillStyle = '#94a3b8';
        canvasCtx.font = '13px Inter, sans-serif';
        canvasCtx.fillText('Use buttons or [Space] / [W] / [S] to practice and test signs!', canvasElement.width / 2, canvasElement.height / 2 + 16);
        
        if (footerCameraStatus) footerCameraStatus.textContent = 'Simulator (Active)';
        if (footerCameraDot) footerCameraDot.style.background = 'var(--accent-emerald)';
        if (fpsBadgeEl) fpsBadgeEl.textContent = 'FPS: Sim';
    });
}

// Global Keyboard Shortcuts for Camera-Free Practice
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        simulateSignMatch();
    } else if (e.key === 'w' || e.key === 'W') {
        simulateSignWrong();
    } else if (e.key === 's' || e.key === 'S') {
        skipCurrentSign();
    }
});

// Expose testing helpers to window for easy verification
window.simulateSignMatch = simulateSignMatch;
window.simulateSignWrong = simulateSignWrong;
window.testPracticeSession = function(steps = 6) {
    console.log(`[PracticeTest] Running ${steps} automated simulated practice steps...`);
    let count = 0;
    const interval = setInterval(() => {
        count++;
        if (count % 3 === 0) {
            console.log(`[PracticeTest] Step ${count}: Simulating Wrong sign`);
            simulateSignWrong();
        } else {
            console.log(`[PracticeTest] Step ${count}: Simulating Correct sign`);
            simulateSignMatch();
        }
        if (count >= steps) {
            clearInterval(interval);
            console.log(`[PracticeTest] Completed! Final Score: ${currentScore}, Streak: ${currentStreak}, Accuracy: ${quizAccuracyEl?.textContent}`);
        }
    }, 600);
};

// --- FPS Counter ---
let fpsFrameCount = 0;
let fpsLastTime = performance.now();
let currentFps = 0;

function updateFps() {
    fpsFrameCount++;
    const now = performance.now();
    if (now - fpsLastTime >= 1000) {
        currentFps = fpsFrameCount;
        fpsFrameCount = 0;
        fpsLastTime = now;
        if (fpsBadgeEl) fpsBadgeEl.textContent = 'FPS: ' + currentFps;
        if (footerFps) footerFps.textContent = currentFps;
    }
}

// --- MediaPipe Hands Setup ---
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

function onResults(results) {
    updateFps();

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Mirror feed if enabled
    if (cameraManager.isMirrored) {
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
    }

    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#8aa8ff', lineWidth: 4 });
            drawLandmarks(canvasCtx, landmarks, { color: '#76bd9b', lineWidth: 2, radius: 4 });

            // Evaluate hand pose against current target
            evaluateFrame(landmarks);
        }
        if (cameraContainer) cameraContainer.classList.add('detecting');
    } else {
        evaluateFrame(null);
        if (cameraContainer) cameraContainer.classList.remove('detecting');
    }

    canvasCtx.restore();
}

// ============================================================================
// Multi-Device Resilient Camera Manager (Progressive Fallback & Diagnostics)
// ============================================================================
class CameraManager {
    constructor(videoEl, onFrameCallback) {
        this.videoEl = videoEl;
        this.onFrameCallback = onFrameCallback;
        this.stream = null;
        this.activeDeviceId = null;
        this.isMirrored = true;
        this.isProcessing = false;
        this.isActive = false;
        this.perfMode = 'fast';
        this.frameCallbackId = null;
        this.animFrameId = null;
        this.deviceSelectEl = document.getElementById('camera-device-select');
        this.errorOverlay = document.getElementById('camera-error-overlay');
        this.errorTitle = document.getElementById('camera-error-title');
        this.errorDesc = document.getElementById('camera-error-desc');
        this.troubleshootList = document.getElementById('camera-troubleshoot-list');
        this.mirrorBtn = document.getElementById('camera-mirror-btn');

        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', () => this.populateDevices());
        }
    }

    async populateDevices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices || !this.deviceSelectEl) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            const currentVal = this.deviceSelectEl.value;
            this.deviceSelectEl.innerHTML = '';

            if (videoDevices.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'Default Camera';
                this.deviceSelectEl.appendChild(opt);
                return;
            }

            videoDevices.forEach((dev, idx) => {
                const opt = document.createElement('option');
                opt.value = dev.deviceId;
                opt.textContent = dev.label || `Camera ${idx + 1}`;
                if (dev.deviceId === this.activeDeviceId || (!this.activeDeviceId && idx === 0)) {
                    opt.selected = true;
                }
                this.deviceSelectEl.appendChild(opt);
            });

            if (currentVal && Array.from(this.deviceSelectEl.options).some(o => o.value === currentVal)) {
                this.deviceSelectEl.value = currentVal;
            }
        } catch (e) {
            console.warn('[CameraManager] Could not enumerate devices:', e);
        }
    }

    getConstraints(deviceId, fallbackLevel = 0) {
        const baseVideo = {};
        if (deviceId) {
            baseVideo.deviceId = { exact: deviceId };
        } else {
            baseVideo.facingMode = 'user';
        }

        switch (fallbackLevel) {
            case 0:
                baseVideo.width = { ideal: 640 };
                baseVideo.height = { ideal: 480 };
                baseVideo.frameRate = { ideal: 30, max: 30 };
                break;
            case 1:
                baseVideo.width = { ideal: 640 };
                baseVideo.height = { ideal: 480 };
                break;
            case 2:
                baseVideo.width = { ideal: 320 };
                baseVideo.height = { ideal: 240 };
                break;
            case 3:
            default:
                break;
        }

        return { video: Object.keys(baseVideo).length > 0 ? baseVideo : true, audio: false };
    }

    async start(deviceId = null) {
        if (this.isActive && this.activeDeviceId === deviceId && this.stream) {
            return;
        }

        this.stop();
        this.hideError();

        if (statusOverlay) {
            statusOverlay.classList.remove('hidden');
            if (statusText) statusText.textContent = 'Connecting to camera…';
        }

        let lastError = null;
        for (let level = 0; level <= 3; level++) {
            try {
                const constraints = this.getConstraints(deviceId, level);
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                this.stream = stream;
                this.videoEl.srcObject = stream;
                this.activeDeviceId = deviceId || (stream.getVideoTracks()[0]?.getSettings()?.deviceId) || null;

                await new Promise((resolve) => {
                    if (this.videoEl.readyState >= 2) {
                        resolve();
                    } else {
                        this.videoEl.onloadeddata = () => resolve();
                    }
                });

                await this.videoEl.play();
                this.isActive = true;

                await this.populateDevices();
                this.startProcessingLoop();

                if (footerCameraStatus) footerCameraStatus.textContent = 'Active';
                if (footerCameraDot) footerCameraDot.style.background = 'var(--accent-emerald)';
                if (statusOverlay) statusOverlay.classList.add('hidden');

                return stream;
            } catch (err) {
                lastError = err;
                console.warn(`[CameraManager] Attempt at level ${level} failed:`, err);
            }
        }

        this.showDiagnostics(lastError);
        throw lastError;
    }

    stop() {
        this.isActive = false;
        this.isProcessing = false;

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        if (this.frameCallbackId && this.videoEl.cancelVideoFrameCallback) {
            this.videoEl.cancelVideoFrameCallback(this.frameCallbackId);
            this.frameCallbackId = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }

        if (this.videoEl) {
            this.videoEl.srcObject = null;
        }

        if (footerCameraStatus) footerCameraStatus.textContent = 'Standby';
        if (footerCameraDot) footerCameraDot.style.background = 'var(--text-tertiary)';
    }

    startProcessingLoop() {
        const process = async () => {
            if (!this.isActive) return;

            if (!this.isProcessing && this.videoEl.readyState >= 2 && !this.videoEl.paused) {
                this.isProcessing = true;
                try {
                    await this.onFrameCallback();
                } catch (e) {
                    console.error('[CameraManager] Frame callback error:', e);
                } finally {
                    this.isProcessing = false;
                }
            }

            if (this.isActive) {
                if ('requestVideoFrameCallback' in this.videoEl) {
                    this.frameCallbackId = this.videoEl.requestVideoFrameCallback(process);
                } else {
                    this.animFrameId = requestAnimationFrame(process);
                }
            }
        };

        if ('requestVideoFrameCallback' in this.videoEl) {
            this.frameCallbackId = this.videoEl.requestVideoFrameCallback(process);
        } else {
            this.animFrameId = requestAnimationFrame(process);
        }
    }

    toggleMirror() {
        this.isMirrored = !this.isMirrored;
        if (this.mirrorBtn) {
            this.mirrorBtn.classList.toggle('active', this.isMirrored);
        }
    }

    restart() {
        return this.start(this.activeDeviceId);
    }

    showDiagnostics(err) {
        if (!this.errorOverlay) return;

        let title = 'Camera Connection Issue';
        let desc = err?.message || 'Unable to access video capture stream.';
        let tips = [];

        const errName = err?.name || '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
            title = 'Camera Permission Blocked';
            desc = 'The browser was denied permission to access your webcam.';
            tips = [
                'Click the lock or camera icon in the browser address bar to allow camera access.',
                'If prompted again, click "Allow" when the dialog appears.',
                'Check Windows Settings > Privacy & security > Camera > "Let desktop apps access your camera".'
            ];
        } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
            title = 'Camera Already in Use';
            desc = 'Another application or browser tab has locked the webcam.';
            tips = [
                'Close Zoom, Microsoft Teams, Discord, Skype, OBS, or other video chat apps.',
                'Close any other browser tabs that might be using the camera.',
                'Unplug and re-plug your USB webcam if using an external device.',
                'Click "Retry Camera" once other applications are closed.'
            ];
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
            title = 'No Webcam Detected';
            desc = 'Windows did not report any connected video capture devices.';
            tips = [
                'Ensure your webcam is securely plugged in or laptop camera privacy shutter is open.',
                'Check Windows Device Manager to ensure camera drivers are functioning.',
                'Restart your browser after connecting the camera.'
            ];
        } else {
            tips = [
                'Ensure camera permissions are allowed in your browser.',
                'Try selecting a different camera from the device list above.',
                'Check if your laptop has a physical webcam privacy slider or Fn key switch.'
            ];
        }

        if (this.errorTitle) this.errorTitle.textContent = title;
        if (this.errorDesc) this.errorDesc.textContent = desc;
        if (this.troubleshootList) {
            this.troubleshootList.innerHTML = tips.map(t => `<li>${t}</li>`).join('');
        }
        this.errorOverlay.classList.remove('hidden');
    }

    hideError() {
        if (this.errorOverlay) {
            this.errorOverlay.classList.add('hidden');
        }
    }
}

// Instantiate resilient Camera Manager for Quiz
const cameraManager = new CameraManager(videoElement, async () => {
    await hands.send({ image: videoElement });
});
window.cameraManager = cameraManager;
const camera = cameraManager;

function resizeCanvas() {
    const rect = canvasElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        canvasElement.width = rect.width;
        canvasElement.height = rect.height;
    } else {
        canvasElement.width = videoElement.videoWidth || 640;
        canvasElement.height = videoElement.videoHeight || 480;
    }
}

window.addEventListener('resize', resizeCanvas);
videoElement.addEventListener('loadedmetadata', resizeCanvas);
setTimeout(resizeCanvas, 500);

// Wire up Quiz Camera UI
const cameraDeviceSelect = document.getElementById('camera-device-select');
if (cameraDeviceSelect) {
    cameraDeviceSelect.addEventListener('change', (e) => {
        cameraManager.start(e.target.value);
    });
}

const cameraMirrorBtn = document.getElementById('camera-mirror-btn');
if (cameraMirrorBtn) {
    cameraMirrorBtn.addEventListener('click', () => {
        cameraManager.toggleMirror();
    });
}

const cameraRestartBtn = document.getElementById('camera-restart-btn');
if (cameraRestartBtn) {
    cameraRestartBtn.addEventListener('click', () => {
        cameraManager.restart();
    });
}

const cameraRetryActionBtn = document.getElementById('camera-retry-action-btn');
if (cameraRetryActionBtn) {
    cameraRetryActionBtn.addEventListener('click', () => {
        cameraManager.restart();
    });
}

const cameraDismissErrBtn = document.getElementById('camera-dismiss-err-btn');
if (cameraDismissErrBtn) {
    cameraDismissErrBtn.addEventListener('click', () => {
        cameraManager.hideError();
    });
}

// Startup sequence
cameraManager.start()
    .then(() => {
        console.log("Quiz Camera started successfully");
        if (footerCameraStatus) footerCameraStatus.textContent = 'Active';
        if (footerCameraDot) {
            footerCameraDot.style.background = 'var(--accent-color)';
        }
        if (statusOverlay) statusOverlay.classList.add('hidden');

        loadCareerRecords();
        updateStatsHUD();
        pickNextTarget();
    })
    .catch((err) => {
        console.error("Quiz Camera access error:", err);
    });
