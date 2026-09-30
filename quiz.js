// ASL Academy & Quiz Engine
// Continuous UI/UX and gesture pose validation powered by MediaPipe and TensorFlow.js

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

function playTickTone() {
    playTone(440, 0.05, 'sine', 0.1);
}

// --- Target Vocabulary Database ---
const VOCABULARY = [
    // --- LETTERS ---
    { id: 'A', glyph: 'A', label: 'Letter A', category: 'alphabet', hint: 'Make a closed fist with thumb resting on the side of your index finger.' },
    { id: 'B', glyph: 'B', label: 'Letter B', category: 'alphabet', hint: 'Hold your palm flat with all 4 fingers pointing up and thumb folded across palm.' },
    { id: 'C', glyph: 'C', label: 'Letter C', category: 'alphabet', hint: 'Curve fingers and thumb together to form the shape of a C.' },
    { id: 'D', glyph: 'D', label: 'Letter D', category: 'alphabet', hint: 'Extend your index finger straight up, while thumb touches your other 3 fingertips.' },
    { id: 'E', glyph: 'E', label: 'Letter E', category: 'alphabet', hint: 'Curl all fingertips tightly down into your palm with thumb folded beneath them.' },
    { id: 'F', glyph: 'F', label: 'Letter F', category: 'alphabet', hint: 'Touch index tip to thumb tip in a circle, with other 3 fingers extended upright.' },
    { id: 'I', glyph: 'I', label: 'Letter I', category: 'alphabet', hint: 'Point pinky finger straight up, curling thumb and other three fingers into a fist.' },
    { id: 'L', glyph: 'L', label: 'Letter L', category: 'alphabet', hint: 'Extend index finger up and thumb outward horizontally to form an L shape.' },
    { id: 'O', glyph: 'O', label: 'Letter O', category: 'alphabet', hint: 'Touch all four fingertips to your thumb tip to form an open circle.' },
    { id: 'V', glyph: 'V', label: 'Letter V', category: 'alphabet', hint: 'Extend index and middle fingers upward in a separated V shape.' },
    { id: 'W', glyph: 'W', label: 'Letter W', category: 'alphabet', hint: 'Extend index, middle, and ring fingers spread upward in a W shape.' },
    { id: 'Y', glyph: 'Y', label: 'Letter Y', category: 'alphabet', hint: 'Extend your thumb and pinky outward (shaka sign) while keeping middle 3 fingers curled.' },

    // --- NUMBERS ---
    { id: '0', glyph: '0', label: 'Number 0', category: 'numbers', hint: 'Form an O with your fingers curving to touch the thumb tip.' },
    { id: '1', glyph: '1', label: 'Number 1', category: 'numbers', hint: 'Extend only your index finger straight up with other fingers curled.' },
    { id: '2', glyph: '2', label: 'Number 2', category: 'numbers', hint: 'Extend index and middle fingers straight up.' },
    { id: '3', glyph: '3', label: 'Number 3', category: 'numbers', hint: 'Extend thumb, index, and middle fingers outward (standard ASL 3).' },
    { id: '4', glyph: '4', label: 'Number 4', category: 'numbers', hint: 'Extend all four fingers up, folding thumb tightly across your palm.' },
    { id: '5', glyph: '5', label: 'Number 5', category: 'numbers', hint: 'Open all five fingers wide and spread them out.' },
    { id: '6', glyph: '6', label: 'Number 6', category: 'numbers', hint: 'Extend index, middle, and ring fingers while pinky touches thumb tip.' },
    { id: '7', glyph: '7', label: 'Number 7', category: 'numbers', hint: 'Extend index, middle, and pinky fingers while ring finger touches thumb tip.' },
    { id: '8', glyph: '8', label: 'Number 8', category: 'numbers', hint: 'Extend index, ring, and pinky fingers while middle finger touches thumb tip.' },
    { id: '9', glyph: '9', label: 'Number 9', category: 'numbers', hint: 'Extend middle, ring, and pinky fingers while index touches thumb tip.' },

    // --- COMMON SIGNS ---
    { id: 'PEACE', glyph: 'PEACE', label: 'Peace / Victory', category: 'signs', hint: 'Extend index and middle fingers in a spread V shape.' },
    { id: 'THUMBS_UP', glyph: 'THUMBS UP', label: 'Thumbs Up', category: 'signs', hint: 'Make a fist with thumb pointing straight upward.' },
    { id: 'THUMBS_DOWN', glyph: 'THUMBS DOWN', label: 'Thumbs Down', category: 'signs', hint: 'Make a fist with thumb pointing straight downward.' },
    { id: 'OK', glyph: 'OK', label: 'OK Sign', category: 'signs', hint: 'Form a ring with thumb and index tips, keeping 3 other fingers upright.' },
    { id: 'I_LOVE_YOU', glyph: 'I LOVE YOU', label: 'I Love You (ILY)', category: 'signs', hint: 'Extend thumb, index, and pinky fingers with middle and ring fingers curled.' },
    { id: 'ROCK_ON', glyph: 'HORNS', label: 'Rock On / Horns', category: 'signs', hint: 'Extend index and pinky fingers with thumb folded over middle and ring.' },
    { id: 'OPEN_PALM', glyph: 'OPEN PALM', label: 'Open Palm', category: 'signs', hint: 'Extend all five fingers flat toward the camera.' },
    { id: 'FIST', glyph: 'FIST', label: 'Fist', category: 'signs', hint: 'Curl all fingers and thumb tightly into a solid fist.' }
];

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
const REQUIRED_HOLD_FRAMES = 8; // ~350-400ms at ~20 FPS
const RING_CIRCUMFERENCE = 402.12; // 2 * PI * 64

// --- Local Storage Records ---
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

function saveCareerRecords() {
    const prevHigh = parseInt(localStorage.getItem('asl_quiz_high_score') || '0', 10);
    const prevStreak = parseInt(localStorage.getItem('asl_quiz_best_streak') || '0', 10);
    const prevSigns = parseInt(localStorage.getItem('asl_quiz_total_signs') || '0', 10);
    const prevRounds = parseInt(localStorage.getItem('asl_quiz_total_rounds') || '0', 10);

    if (currentScore > prevHigh) localStorage.setItem('asl_quiz_high_score', currentScore);
    if (maxStreakInSession > prevStreak) localStorage.setItem('asl_quiz_best_streak', maxStreakInSession);
    localStorage.setItem('asl_quiz_total_signs', prevSigns + successfulAttempts);
    if (gameMode === 'speed') localStorage.setItem('asl_quiz_total_rounds', prevRounds + 1);

    loadCareerRecords();
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
    // Ensure we don't immediately pick the exact same sign
    if (currentTarget && list.length > 1) {
        while (next.id === currentTarget.id) {
            next = list[Math.floor(Math.random() * list.length)];
        }
    }
    currentTarget = next;
    consecutiveHoldFrames = 0;
    updateHoldRing(0);

    if (quizTargetCard) quizTargetCard.classList.remove('matched');
    if (targetGlyphEl) {
        targetGlyphEl.textContent = currentTarget.glyph;
        targetGlyphEl.style.fontSize = currentTarget.glyph.length > 2 ? '2.4rem' : '3.8rem';
    }
    if (targetSubtextEl) targetSubtextEl.textContent = currentTarget.label;
    if (targetHintEl) targetHintEl.textContent = currentTarget.hint;
    if (targetCategoryBadge) {
        targetCategoryBadge.textContent = `Category: ${currentTarget.category.toUpperCase()}`;
    }
}

function updateHoldRing(pct) {
    if (!holdRingProgress) return;
    const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
    holdRingProgress.style.strokeDashoffset = offset;
}

function updateStatsHUD() {
    if (quizScoreEl) quizScoreEl.textContent = currentScore;
    if (quizStreakEl) quizStreakEl.textContent = currentStreak;
    const acc = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 100;
    if (quizAccuracyEl) quizAccuracyEl.textContent = acc + '%';
}

// --- Geometric Hand Analyzer ---
function lmDist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function detectPose(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;

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

    // Evaluated list of matching poses
    const detected = [];

    // Signs
    if (isThumbUp && isThumbExt && isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled) detected.push('THUMBS_UP');
    if (isThumbDown && isThumbExt && isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled) detected.push('THUMBS_DOWN');
    if (touchThumbIndex && isMiddleExt && isRingExt && isPinkyExt) detected.push('OK');
    if (isThumbExt && isIndexExt && isPinkyExt && isMiddleCurled && isRingCurled) detected.push('I_LOVE_YOU');
    if (isIndexExt && isPinkyExt && isMiddleCurled && isRingCurled && !isThumbExt) detected.push('ROCK_ON');
    if (isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled && isIndexMiddleSpread) detected.push('PEACE');
    if (isThumbExt && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) detected.push('OPEN_PALM');
    if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && !isThumbExt) detected.push('FIST');

    // Numbers
    if (touchThumbIndex && touchThumbMiddle) detected.push('0');
    if (isIndexExt && isMiddleCurled && isRingCurled && isPinkyCurled && !isThumbExt) detected.push('1');
    if (isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled && !isThumbExt) detected.push('2');
    if (isThumbExt && isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled) detected.push('3');
    if (!isThumbExt && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) detected.push('4');
    if (isThumbExt && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) detected.push('5');
    if (isIndexExt && isMiddleExt && isRingExt && touchThumbPinky) detected.push('6');
    if (isIndexExt && isMiddleExt && isPinkyExt && touchThumbRing) detected.push('7');
    if (isIndexExt && isRingExt && isPinkyExt && touchThumbMiddle) detected.push('8');
    if (isMiddleExt && isRingExt && isPinkyExt && touchThumbIndex) detected.push('9');

    // Also support letters mapped through geometry
    if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && isThumbExt) detected.push('A');
    if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt && !isThumbExt) detected.push('B');
    if (isIndexExt && isMiddleCurled && isRingCurled && isPinkyCurled && touchThumbMiddle) detected.push('D');
    if (touchThumbIndex && isMiddleExt && isRingExt && isPinkyExt) detected.push('F');
    if (isPinkyExt && isIndexCurled && isMiddleCurled && isRingCurled) detected.push('I');
    if (isIndexExt && isThumbExt && isMiddleCurled && isRingCurled && isPinkyCurled) detected.push('L');
    if (isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled && isIndexMiddleSpread) detected.push('V');
    if (isIndexExt && isMiddleExt && isRingExt && isPinkyCurled) detected.push('W');
    if (isThumbExt && isPinkyExt && isIndexCurled && isMiddleCurled && isRingCurled) detected.push('Y');

    return detected;
}

// --- Frame Evaluation & Pose Verification ---
function evaluateFrame(landmarks) {
    if (!currentTarget || !landmarks) {
        if (consecutiveHoldFrames > 0) {
            consecutiveHoldFrames = Math.max(0, consecutiveHoldFrames - 2);
            const pct = Math.round((consecutiveHoldFrames / REQUIRED_HOLD_FRAMES) * 100);
            updateHoldRing(pct);
            if (consecutiveHoldFrames === 0 && quizTargetCard) quizTargetCard.classList.remove('matched');
        }
        return;
    }

    const detectedList = detectPose(landmarks);
    const isMatched = detectedList && detectedList.includes(currentTarget.id);

    if (isMatched) {
        consecutiveHoldFrames++;
        if (quizTargetCard) quizTargetCard.classList.add('matched');
        const pct = Math.min(100, Math.round((consecutiveHoldFrames / REQUIRED_HOLD_FRAMES) * 100));
        updateHoldRing(pct);

        if (consecutiveHoldFrames >= REQUIRED_HOLD_FRAMES) {
            // SUCCESS! Sign locked in and verified
            onSignSolved();
        }
    } else {
        if (consecutiveHoldFrames > 0) {
            consecutiveHoldFrames = Math.max(0, consecutiveHoldFrames - 1);
            const pct = Math.round((consecutiveHoldFrames / REQUIRED_HOLD_FRAMES) * 100);
            updateHoldRing(pct);
            if (consecutiveHoldFrames === 0 && quizTargetCard) quizTargetCard.classList.remove('matched');
        }
    }
}

function onSignSolved() {
    successfulAttempts++;
    totalAttempts++;
    currentStreak++;
    if (currentStreak > maxStreakInSession) maxStreakInSession = currentStreak;

    // Calculate score with streak combo multiplier
    const multiplier = Math.min(3.0, 1 + (currentStreak - 1) * 0.2);
    const basePoints = 100;
    const earned = Math.round(basePoints * multiplier);
    currentScore += earned;

    updateStatsHUD();

    // Sound feedback
    if (currentStreak > 0 && currentStreak % 5 === 0) {
        playStreakFanfare();
    } else {
        playSuccessChime();
    }

    // Flash animation on card
    if (quizTargetCard) {
        quizTargetCard.style.transform = 'scale(1.08)';
        setTimeout(() => { quizTargetCard.style.transform = ''; }, 220);
    }

    // Pick next target with tiny delay
    setTimeout(() => {
        pickNextTarget();
    }, 250);
}

function skipCurrentSign() {
    totalAttempts++;
    currentStreak = 0; // reset streak on skip
    updateStatsHUD();
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

    saveCareerRecords();

    // Show completion modal
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
            // In free practice mode, clicking primary button switches to speed run
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

    // Mirror horizontal
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#8aa8ff', lineWidth: 4 });
            drawLandmarks(canvasCtx, landmarks, { color: '#76bd9b', lineWidth: 2, radius: 4 });

            // Evaluate hand pose against current target sign
            evaluateFrame(landmarks);
        }
        if (cameraContainer) cameraContainer.classList.add('detecting');
    } else {
        evaluateFrame(null);
        if (cameraContainer) cameraContainer.classList.remove('detecting');
    }

    canvasCtx.restore();
}

// Camera initialization
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

function resizeCanvas() {
    const rect = canvasElement.getBoundingClientRect();
    canvasElement.width = rect.width;
    canvasElement.height = rect.height;
}

window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 500);

// Startup sequence
camera.start()
    .then(() => {
        console.log("Quiz Camera started successfully");
        if (footerCameraStatus) footerCameraStatus.textContent = 'Active';
        if (footerCameraDot) {
            footerCameraDot.style.background = 'var(--accent-color)';
        }
        if (footerModelStatus) footerModelStatus.textContent = 'Ready';
        if (footerModelDot) {
            footerModelDot.style.background = 'var(--accent-color)';
        }
        if (statusOverlay) statusOverlay.classList.add('hidden');

        loadCareerRecords();
        pickNextTarget();
    })
    .catch((err) => {
        console.error("Camera access error:", err);
        if (statusText) statusText.textContent = 'Error accessing camera. Please grant permission.';
        if (footerCameraStatus) footerCameraStatus.textContent = 'Error';
    });
