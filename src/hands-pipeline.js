/**
 * Shared Unified MediaPipe Hands & ASL Neural Inference Pipeline
 * ==============================================================
 * Centralizes:
 * 1. Resilient camera capture (multi-device enumeration, resolution fallback)
 * 2. MediaPipe Hands tracking (both hands, 21 3D landmarks)
 * 3. Feature extraction & TF.js deep learning inference (alphabet A-Z)
 * 4. Geometric static sign & numbers (0-9, thumbs up/down, peace, ok, love)
 * 5. Hardware BLE Glove sensor fusion (J scoop, Z zig-zag, SPACE, YES, HELLO)
 * 6. Temporal 3-frame lock-in filter
 * 7. Dynamic Time Warping (DTW) whole-word sign matcher (experimental)
 * 8. Reusable skeleton drawing & compact landmark serialization for WebRTC
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.HandsPipeline = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    // Utility: Euclidean distance between two landmarks (3D)
    function lmDist3D(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z || 0) - (b.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Utility: Dynamic Time Warping (DTW) distance between two landmark sequences
    function computeDTWDistance(seqA, seqB) {
        const n = seqA.length;
        const m = seqB.length;
        if (n === 0 || m === 0) return Infinity;

        // DP table
        const dtw = Array.from({ length: n + 1 }, () => new Float32Array(m + 1).fill(Infinity));
        dtw[0][0] = 0;

        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                // Cost between frame i-1 and frame j-1 (average landmark distance)
                const frameA = seqA[i - 1];
                const frameB = seqB[j - 1];
                let cost = 0;
                const len = Math.min(frameA.length, frameB.length);
                for (let k = 0; k < len; k++) {
                    const dx = frameA[k][0] - frameB[k][0];
                    const dy = frameA[k][1] - frameB[k][1];
                    const dz = frameA[k][2] - frameB[k][2];
                    cost += Math.sqrt(dx * dx + dy * dy + dz * dz);
                }
                cost = cost / Math.max(1, len);
                dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
            }
        }

        return dtw[n][m] / Math.max(n, m);
    }

    class HandsPipeline {
        constructor(options = {}) {
            this.options = Object.assign({
                maxNumHands: 2,
                modelComplexity: 0,
                minDetectionConfidence: 0.65,
                minTrackingConfidence: 0.60,
                requiredLockInFrames: 3,
                lockInCooldownMs: 320,
                enableDTW: true,
                dtwThreshold: 0.18
            }, options);

            this.videoEl = null;
            this.stream = null;
            this.hands = null;
            this.mlModel = null;
            this.isModelReady = false;
            this.isModelBusy = false;
            this.isRunning = false;
            this.isMirrored = true;

            // Frame processing state
            this.animFrameId = null;
            this.lastFrameTime = 0;
            this.fps = 0;

            // Prediction & lock-in filter state
            this.currentCandidate = '-';
            this.consecutiveFrames = 0;
            this.lastLockedInPrediction = '-';
            this.lastLockedInTime = 0;
            this.recognitionMode = 'alphabet'; // 'alphabet' | 'numbers' | 'signs' | 'unified' | 'word'

            // Hardware BLE Glove State
            this.isGloveConnected = false;
            this.gloveRoll = 0.0;
            this.glovePitch = 0.0;
            this.imuRollHistory = [];
            this.imuPitchHistory = [];
            this.IMU_HISTORY_SIZE = 10;
            this.lastWordOutputTime = 0;
            this.lastDetectedWord = '';

            // Experimental DTW Gesture Segmenter
            this.recentLandmarkTrajectory = []; // Buffer of normalized wrist-relative frames
            this.MAX_TRAJECTORY_FRAMES = 35;
            this.lexiconSignTemplates = new Map(); // signId -> array of frames

            // Callbacks
            this.listeners = {
                landmarks: [],
                prediction: [],
                glove: [],
                wordCandidate: [],
                fps: [],
                error: []
            };

            this.initMediaPipe();
            this.loadDefaultModel();
        }

        // =====================================================================
        // 1. MediaPipe Setup
        // =====================================================================

        initMediaPipe() {
            if (typeof Hands === 'undefined') {
                console.warn('[HandsPipeline] MediaPipe Hands library not loaded on page.');
                return;
            }

            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            this.hands.setOptions({
                maxNumHands: this.options.maxNumHands,
                modelComplexity: this.options.modelComplexity,
                minDetectionConfidence: this.options.minDetectionConfidence,
                minTrackingConfidence: this.options.minTrackingConfidence
            });

            this.hands.onResults((results) => this.handleMediaPipeResults(results));
        }

        async loadDefaultModel(modelUrl = './models/model.json') {
            if (typeof tf === 'undefined') return;

            try {
                this.mlModel = await tf.loadLayersModel(modelUrl);
                this.mlModel.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy' });
                this.isModelReady = true;
                console.log('[HandsPipeline] Loaded TF.js model from', modelUrl);
            } catch (err) {
                // Try IndexedDB fallback
                try {
                    this.mlModel = await tf.loadLayersModel('indexeddb://asl-alphabet-model');
                    this.mlModel.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy' });
                    this.isModelReady = true;
                    console.log('[HandsPipeline] Loaded TF.js model from IndexedDB cache');
                } catch (e) {
                    console.warn('[HandsPipeline] Pre-trained classifier offline. Geometric mode active.');
                }
            }
        }

        // =====================================================================
        // 2. Camera Lifecycle
        // =====================================================================

        async start(videoEl, deviceId = null) {
            this.videoEl = videoEl;
            if (!this.videoEl) throw new Error('Video element must be provided');

            if (this.stream) {
                this.stop();
            }

            const constraints = {
                video: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30, max: 60 },
                    facingMode: 'user'
                },
                audio: false
            };

            try {
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
                this.videoEl.srcObject = this.stream;
                this.videoEl.setAttribute('playsinline', 'true');
                this.videoEl.muted = true;
                await this.videoEl.play();

                this.isRunning = true;
                this.scheduleProcessingLoop();
                return this.stream;
            } catch (err) {
                this.emit('error', err);
                throw err;
            }
        }

        stop() {
            this.isRunning = false;
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
            if (this.stream) {
                this.stream.getTracks().forEach(t => t.stop());
                this.stream = null;
            }
            if (this.videoEl) {
                this.videoEl.srcObject = null;
            }
        }

        scheduleProcessingLoop() {
            if (!this.isRunning || !this.videoEl || !this.hands) return;

            const processFrame = async () => {
                if (!this.isRunning) return;

                if (this.videoEl.readyState >= 2 && !this.videoEl.paused && !this.videoEl.ended) {
                    const now = performance.now();
                    if (this.lastFrameTime) {
                        const delta = now - this.lastFrameTime;
                        if (delta > 0) {
                            this.fps = Math.round(1000 / delta);
                            this.emit('fps', this.fps);
                        }
                    }
                    this.lastFrameTime = now;

                    try {
                        await this.hands.send({ image: this.videoEl });
                    } catch (e) {
                        // ignore dropped frames
                    }
                }

                if (this.isRunning) {
                    this.animFrameId = requestAnimationFrame(processFrame);
                }
            };

            this.animFrameId = requestAnimationFrame(processFrame);
        }

        // =====================================================================
        // 3. MediaPipe Results Processing & Event Emission
        // =====================================================================

        handleMediaPipeResults(results) {
            const multiLandmarks = results.multiHandLandmarks || [];
            const multiHandedness = results.multiHandedness || [];

            const parsedHands = [];

            for (let i = 0; i < multiLandmarks.length; i++) {
                const rawLms = multiLandmarks[i];
                const handedness = multiHandedness[i]?.label || (i === 0 ? 'Right' : 'Left');
                const score = multiHandedness[i]?.score || 0.9;

                // Normalize wrist-relative for streaming & DTW
                const normalizedLms = this.normalizeLandmarksWristRelative(rawLms);

                parsedHands.push({
                    raw: rawLms,
                    normalized: normalizedLms,
                    handedness: handedness,
                    confidence: score
                });
            }

            // Emit raw & normalized landmarks event
            this.emit('landmarks', {
                hands: parsedHands,
                rawResults: results,
                timestamp: Date.now()
            });

            // If no hand detected, reset lock-in state
            if (parsedHands.length === 0) {
                this.resetCandidate();
                return;
            }

            // Primary hand for classification
            const primaryHand = parsedHands[0];

            // Update DTW Trajectory Buffer
            this.updateTrajectoryBuffer(primaryHand.normalized);

            // Execute recognition pipeline
            this.evaluatePrediction(primaryHand.raw);
        }

        normalizeLandmarksWristRelative(landmarks) {
            if (!landmarks || landmarks.length !== 21) return [];

            const wrist = landmarks[0];
            const mcp = landmarks[9]; // Middle MCP
            const dx = mcp.x - wrist.x;
            const dy = mcp.y - wrist.y;
            const dz = (mcp.z || 0) - (wrist.z || 0);
            const scale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

            const res = [];
            for (let i = 0; i < landmarks.length; i++) {
                const lm = landmarks[i];
                res.push([
                    Math.round(((lm.x - wrist.x) / scale) * 1000) / 1000,
                    Math.round(((lm.y - wrist.y) / scale) * 1000) / 1000,
                    Math.round((((lm.z || 0) - (wrist.z || 0)) / scale) * 1000) / 1000
                ]);
            }
            return res;
        }

        // =====================================================================
        // 4. Feature Extraction & Classifier
        // =====================================================================

        extractFeaturesForModel(landmarks) {
            const features = [];
            const wristX = landmarks[0].x;
            const wristY = landmarks[0].y;

            for (let i = 0; i < landmarks.length; i++) {
                features.push(landmarks[i].x - wristX);
                features.push(landmarks[i].y - wristY);
            }

            let maxVal = 0;
            for (let i = 0; i < features.length; i++) {
                if (Math.abs(features[i]) > maxVal) maxVal = Math.abs(features[i]);
            }
            if (maxVal === 0) maxVal = 1;

            for (let i = 0; i < features.length; i++) {
                features[i] = features[i] / maxVal;
            }
            return features;
        }

        evaluatePrediction(landmarks) {
            // 1. Hardware Heuristics check (glove priority)
            const gloveCheck = this.applyHardwareHeuristics(this.currentCandidate);
            if (gloveCheck && gloveCheck !== this.currentCandidate && ['J', 'Z', 'YES', 'HELLO', 'SPACE'].includes(gloveCheck)) {
                this.commitPrediction(gloveCheck, 0.95, 'GLOVE');
                return;
            }

            // 2. Geometric Static Signs & Numbers
            const geoRes = this.detectStaticSignAndNumber(landmarks);
            if (this.recognitionMode === 'numbers' && geoRes && geoRes.type === 'NUMBER') {
                this.processLockIn(geoRes.label, geoRes.confidence, 'NUMBER');
                return;
            }
            if (this.recognitionMode === 'signs' && geoRes && geoRes.type === 'SIGN') {
                this.processLockIn(geoRes.label, geoRes.confidence, 'SIGN');
                return;
            }
            if (this.recognitionMode === 'unified' && geoRes && geoRes.confidence >= 0.90) {
                this.processLockIn(geoRes.label, geoRes.confidence, geoRes.type);
                return;
            }

            // 3. TF.js Deep Learning Classifier
            if (!this.isModelReady || !this.mlModel || this.isModelBusy) return;

            this.isModelBusy = true;
            try {
                const features = this.extractFeaturesForModel(landmarks);
                const tensor = tf.tensor2d([features]);
                const prediction = this.mlModel.predict(tensor);
                const probabilities = prediction.dataSync();

                let classId = 0;
                let maxProb = probabilities[0];
                for (let i = 1; i < probabilities.length; i++) {
                    if (probabilities[i] > maxProb) {
                        maxProb = probabilities[i];
                        classId = i;
                    }
                }

                tensor.dispose();
                prediction.dispose();

                if (maxProb > 0.58) {
                    const predictedChar = ALPHABET[classId] || '-';
                    // Check glove fusion
                    const fused = this.applyHardwareHeuristics(predictedChar);
                    this.processLockIn(fused || predictedChar, maxProb, 'ALPHABET');
                } else {
                    this.processLockIn('-', 0, 'ALPHABET');
                }
            } catch (err) {
                console.warn('[HandsPipeline] Inference error:', err);
            } finally {
                this.isModelBusy = false;
            }
        }

        // =====================================================================
        // 5. 3-Frame Lock-In Filter
        // =====================================================================

        processLockIn(candidate, confidence, type) {
            if (!candidate || candidate === '-') {
                this.resetCandidate();
                return;
            }

            if (candidate === this.currentCandidate) {
                this.consecutiveFrames++;
            } else {
                this.currentCandidate = candidate;
                this.consecutiveFrames = 1;
            }

            const isLockedIn = this.consecutiveFrames >= this.options.requiredLockInFrames;
            const now = Date.now();

            if (isLockedIn && (now - this.lastLockedInTime > this.options.lockInCooldownMs || candidate !== this.lastLockedInPrediction)) {
                this.commitPrediction(candidate, confidence, type);
                this.lastLockedInPrediction = candidate;
                this.lastLockedInTime = now;
            } else {
                // Emit interim preview (confidence tracking)
                this.emit('prediction', {
                    label: candidate,
                    confidence: confidence,
                    type: type,
                    isLockedIn: false
                });
            }
        }

        evaluateLockIn(candidate, confidence = 0.9, type = 'CHAR') {
            this.processLockIn(candidate, confidence, type);
        }

        commitPrediction(label, confidence, type) {
            this.emit('prediction', {
                label: label,
                letter: label,
                confidence: confidence,
                type: type,
                isLockedIn: true,
                timestamp: Date.now()
            });
        }

        resetCandidate() {
            this.currentCandidate = '-';
            this.consecutiveFrames = 0;
            this.emit('prediction', {
                label: '-',
                confidence: 0,
                type: 'NONE',
                isLockedIn: false
            });
        }

        // =====================================================================
        // 6. Geometric Analyzer (0-9, Peace, OK, Love, Thumbs)
        // =====================================================================

        detectStaticSignAndNumber(landmarks) {
            if (!landmarks || landmarks.length < 21) return null;
            const wrist = landmarks[0];
            const palmSize = lmDist3D(wrist, landmarks[9]) || 0.1;

            const isIndexExt = lmDist3D(landmarks[8], wrist) > lmDist3D(landmarks[6], wrist) * 1.15 &&
                               lmDist3D(landmarks[8], landmarks[5]) > palmSize * 0.70;
            const isMiddleExt = lmDist3D(landmarks[12], wrist) > lmDist3D(landmarks[10], wrist) * 1.15 &&
                                lmDist3D(landmarks[12], landmarks[9]) > palmSize * 0.70;
            const isRingExt = lmDist3D(landmarks[16], wrist) > lmDist3D(landmarks[14], wrist) * 1.15 &&
                              lmDist3D(landmarks[16], landmarks[13]) > palmSize * 0.70;
            const isPinkyExt = lmDist3D(landmarks[20], wrist) > lmDist3D(landmarks[18], wrist) * 1.15 &&
                               lmDist3D(landmarks[20], landmarks[17]) > palmSize * 0.70;
            const isThumbExt = lmDist3D(landmarks[4], landmarks[9]) > palmSize * 0.85;

            const isIndexCurled = lmDist3D(landmarks[8], wrist) < lmDist3D(landmarks[6], wrist) * 1.08;
            const isMiddleCurled = lmDist3D(landmarks[12], wrist) < lmDist3D(landmarks[10], wrist) * 1.08;
            const isRingCurled = lmDist3D(landmarks[16], wrist) < lmDist3D(landmarks[14], wrist) * 1.08;
            const isPinkyCurled = lmDist3D(landmarks[20], wrist) < lmDist3D(landmarks[18], wrist) * 1.08;

            const touchThumbIndex = lmDist3D(landmarks[4], landmarks[8]) < palmSize * 0.42;
            const touchThumbMiddle = lmDist3D(landmarks[4], landmarks[12]) < palmSize * 0.42;
            const touchThumbRing = lmDist3D(landmarks[4], landmarks[16]) < palmSize * 0.42;
            const touchThumbPinky = lmDist3D(landmarks[4], landmarks[20]) < palmSize * 0.42;

            const isThumbUp = (landmarks[4].y < landmarks[3].y) && (landmarks[4].y < landmarks[5].y);
            const isThumbDown = (landmarks[4].y > landmarks[3].y) && (landmarks[4].y > landmarks[0].y);
            const isIndexMiddleSpread = lmDist3D(landmarks[8], landmarks[12]) > palmSize * 0.32;

            // Signs
            if (isThumbUp && isThumbExt && isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled) {
                return { label: 'THUMBS_UP', type: 'SIGN', confidence: 0.92 };
            }
            if (isThumbDown && isThumbExt && isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled) {
                return { label: 'THUMBS_DOWN', type: 'SIGN', confidence: 0.90 };
            }
            if (touchThumbIndex && isMiddleExt && isRingExt && isPinkyExt) {
                return { label: 'OK', type: 'SIGN', confidence: 0.91 };
            }
            if (isThumbExt && isIndexExt && isPinkyExt && isMiddleCurled && isRingCurled) {
                return { label: 'I_LOVE_YOU', type: 'SIGN', confidence: 0.93 };
            }
            if (isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled && isIndexMiddleSpread) {
                return { label: 'PEACE', type: 'SIGN', confidence: 0.88 };
            }
            if (isThumbExt && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
                return { label: 'OPEN_PALM', type: 'SIGN', confidence: 0.89 };
            }
            if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && !isThumbExt) {
                return { label: 'FIST', type: 'SIGN', confidence: 0.86 };
            }

            // Numbers
            if (touchThumbIndex && touchThumbMiddle) return { label: '0', type: 'NUMBER', confidence: 0.88 };
            if (isIndexExt && isMiddleCurled && isRingCurled && isPinkyCurled && !isThumbExt) return { label: '1', type: 'NUMBER', confidence: 0.90 };
            if (isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled && !isThumbExt) return { label: '2', type: 'NUMBER', confidence: 0.89 };
            if (isThumbExt && isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled) return { label: '3', type: 'NUMBER', confidence: 0.92 };
            if (!isThumbExt && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) return { label: '4', type: 'NUMBER', confidence: 0.91 };
            if (isThumbExt && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) return { label: '5', type: 'NUMBER', confidence: 0.90 };
            if (isIndexExt && isMiddleExt && isRingExt && touchThumbPinky) return { label: '6', type: 'NUMBER', confidence: 0.87 };
            if (isIndexExt && isMiddleExt && isPinkyExt && touchThumbRing) return { label: '7', type: 'NUMBER', confidence: 0.87 };
            if (isIndexExt && isRingExt && isPinkyExt && touchThumbMiddle) return { label: '8', type: 'NUMBER', confidence: 0.87 };
            if (isMiddleExt && isRingExt && isPinkyExt && touchThumbIndex) return { label: '9', type: 'NUMBER', confidence: 0.88 };

            return null;
        }

        // =====================================================================
        // 7. Hardware Glove Sensor Fusion (J, Z, YES, HELLO, SPACE)
        // =====================================================================

        setGloveData(roll, pitch, isConnected = true) {
            this.gloveRoll = roll;
            this.glovePitch = pitch;
            this.isGloveConnected = isConnected;

            if (isConnected) {
                this.imuRollHistory.push(roll);
                if (this.imuRollHistory.length > this.IMU_HISTORY_SIZE) this.imuRollHistory.shift();

                this.imuPitchHistory.push(pitch);
                if (this.imuPitchHistory.length > this.IMU_HISTORY_SIZE) this.imuPitchHistory.shift();
            }

            this.emit('glove', {
                roll: this.gloveRoll,
                pitch: this.glovePitch,
                isConnected: this.isGloveConnected
            });
        }

        feedGloveOrientation(roll, pitch) {
            this.setGloveData(roll, pitch, true);
        }

        detectGloveMotion() {
            return {
                isScoop: Math.abs(this.gloveRoll) > 40,
                isNod: this.glovePitch < -20 || (Math.abs(this.glovePitch) > 25 && this.gloveRoll === 0)
            };
        }

        applyHardwareHeuristics(predictedChar) {
            if (!this.isGloveConnected) return predictedChar;

            // Spacebar: flat palm facing up
            if (Math.abs(this.glovePitch) < 20 && Math.abs(this.gloveRoll) > 150) {
                return 'SPACE';
            }

            // Word: "YES" (nodding 'S' fist)
            if (predictedChar === 'S') {
                if (this.lastDetectedWord === 'YES' && (Date.now() - this.lastWordOutputTime < 2000)) {
                    return 'YES';
                }
                if (this.imuPitchHistory.length === this.IMU_HISTORY_SIZE) {
                    const startP = this.imuPitchHistory[0];
                    const endP = this.imuPitchHistory[this.IMU_HISTORY_SIZE - 1];
                    let maxDev = 0;
                    for (let i = 1; i < this.IMU_HISTORY_SIZE - 1; i++) {
                        const dev = Math.abs(this.imuPitchHistory[i] - startP);
                        if (dev > maxDev) maxDev = dev;
                    }
                    if (maxDev > 25 && Math.abs(endP - startP) < 15) {
                        this.lastDetectedWord = 'YES';
                        this.lastWordOutputTime = Date.now();
                        return 'YES';
                    }
                }
            }

            // Word: "HELLO" (salute sweep on 'B' hand)
            if (predictedChar === 'B') {
                if (this.lastDetectedWord === 'HELLO' && (Date.now() - this.lastWordOutputTime < 2000)) {
                    return 'HELLO';
                }
                if (this.imuRollHistory.length === this.IMU_HISTORY_SIZE) {
                    const rollDelta = Math.abs(this.imuRollHistory[this.IMU_HISTORY_SIZE - 1] - this.imuRollHistory[0]);
                    if (rollDelta > 40) {
                        this.lastDetectedWord = 'HELLO';
                        this.lastWordOutputTime = Date.now();
                        return 'HELLO';
                    }
                }
            }

            // Letter: 'J' (scoop twist from 'I')
            if (predictedChar === 'I' && this.imuRollHistory.length === this.IMU_HISTORY_SIZE) {
                const mid = Math.floor(this.IMU_HISTORY_SIZE / 2);
                const pitchDelta = this.imuPitchHistory[mid] - this.imuPitchHistory[0];
                const rollDelta = this.imuRollHistory[this.IMU_HISTORY_SIZE - 1] - this.imuRollHistory[mid];
                if (pitchDelta > 40 && rollDelta > 40) {
                    return 'J';
                }
            }

            return predictedChar;
        }

        // =====================================================================
        // 8. Experimental Dynamic Time Warping (DTW) Whole-Word Recognition
        // =====================================================================

        loadLexiconTemplates(signsArray) {
            this.lexiconSignTemplates.clear();
            if (!Array.isArray(signsArray)) return;

            for (const sign of signsArray) {
                if (sign.frames && sign.frames.length >= 8) {
                    // Extract right-hand normalized sequence
                    const templateSeq = [];
                    for (const fr of sign.frames) {
                        if (fr.right && fr.right.length === 21) {
                            templateSeq.push(fr.right);
                        }
                    }
                    if (templateSeq.length >= 8) {
                        this.lexiconSignTemplates.set(sign.id, {
                            id: sign.id,
                            gloss: sign.gloss || sign.id.toUpperCase(),
                            category: sign.category || 'General',
                            sequence: templateSeq
                        });
                    }
                }
            }
            console.log(`[HandsPipeline] Loaded ${this.lexiconSignTemplates.size} DTW sign templates.`);
        }

        updateTrajectoryBuffer(normalizedLandmarks) {
            if (!normalizedLandmarks || normalizedLandmarks.length !== 21) return;

            this.recentLandmarkTrajectory.push(normalizedLandmarks);
            if (this.recentLandmarkTrajectory.length > this.MAX_TRAJECTORY_FRAMES) {
                this.recentLandmarkTrajectory.shift();
            }

            // In 'word' recognition mode: run DTW matching if sufficient motion detected
            if (this.recognitionMode === 'word' && this.options.enableDTW && this.recentLandmarkTrajectory.length >= 15) {
                this.evaluateDTWMatch();
            }
        }

        evaluateDTWMatch() {
            if (this.lexiconSignTemplates.size === 0) return;

            // Simple movement velocity trigger: check if hand actually moved in recent window
            const firstFrame = this.recentLandmarkTrajectory[0];
            const lastFrame = this.recentLandmarkTrajectory[this.recentLandmarkTrajectory.length - 1];
            let movement = 0;
            for (let i = 0; i < 21; i++) {
                const dx = lastFrame[i][0] - firstFrame[i][0];
                const dy = lastFrame[i][1] - firstFrame[i][1];
                movement += Math.sqrt(dx * dx + dy * dy);
            }
            movement /= 21;

            if (movement < 0.12) {
                // Hand is stationary; don't match dynamic words
                return;
            }

            const candidates = [];
            for (const [id, tpl] of this.lexiconSignTemplates.entries()) {
                const dist = computeDTWDistance(this.recentLandmarkTrajectory, tpl.sequence);
                if (dist < this.options.dtwThreshold) {
                    const conf = Math.max(0.5, Math.min(0.98, 1.0 - (dist / this.options.dtwThreshold) * 0.5));
                    candidates.push({
                        signId: id,
                        gloss: tpl.gloss,
                        confidence: Math.round(conf * 100) / 100,
                        dist: Math.round(dist * 1000) / 1000
                    });
                }
            }

            if (candidates.length > 0) {
                candidates.sort((a, b) => b.confidence - a.confidence);
                this.emit('wordCandidate', {
                    best: candidates[0],
                    all: candidates.slice(0, 3),
                    timestamp: Date.now()
                });
            }
        }

        // =====================================================================
        // 9. Reusable Skeleton Drawing
        // =====================================================================

        static drawHandSkeleton(ctx, landmarks, options = {}) {
            if (!ctx || !landmarks || landmarks.length !== 21) return;

            const {
                color = '#10b981',
                jointColor = '#ffffff',
                lineWidth = 3,
                radius = 3,
                width = ctx.canvas.width,
                height = ctx.canvas.height
            } = options;

            const HAND_CONNECTIONS = [
                [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
                [0, 5], [5, 6], [6, 7], [7, 8], // Index
                [5, 9], [9, 10], [10, 11], [11, 12], // Middle
                [9, 13], [13, 14], [14, 15], [15, 16], // Ring
                [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
                [0, 17] // Palm base
            ];

            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw connections
            for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
                const p1 = landmarks[startIdx];
                const p2 = landmarks[endIdx];
                const x1 = (p1.x !== undefined ? p1.x : p1[0]) * width;
                const y1 = (p1.y !== undefined ? p1.y : p1[1]) * height;
                const x2 = (p2.x !== undefined ? p2.x : p2[0]) * width;
                const y2 = (p2.y !== undefined ? p2.y : p2[1]) * height;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            // Draw joint dots
            ctx.fillStyle = jointColor;
            for (let i = 0; i < landmarks.length; i++) {
                const pt = landmarks[i];
                const x = (pt.x !== undefined ? pt.x : pt[0]) * width;
                const y = (pt.y !== undefined ? pt.y : pt[1]) * height;

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.fill();
            }

            ctx.restore();
        }

        static compactSerializeLandmarks(landmarks) {
            if (!landmarks) return [];
            return landmarks.map(pt => {
                const x = pt.x !== undefined ? pt.x : pt[0];
                const y = pt.y !== undefined ? pt.y : pt[1];
                const z = pt.z !== undefined ? pt.z : (pt[2] || 0);
                return [
                    parseFloat(Number(x).toFixed(3)),
                    parseFloat(Number(y).toFixed(3)),
                    parseFloat(Number(z).toFixed(3))
                ];
            });
        }

        static computeDTWDistance(seqA, seqB) {
            return computeDTWDistance(seqA, seqB);
        }

        // =====================================================================
        // 10. Event Subscription System
        // =====================================================================

        on(event, callback) {
            if (this.listeners[event]) {
                this.listeners[event].push(callback);
            }
            return () => this.off(event, callback);
        }

        off(event, callback) {
            if (this.listeners[event]) {
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            }
        }

        emit(event, data) {
            if (this.listeners[event]) {
                for (const cb of this.listeners[event]) {
                    try {
                        cb(data);
                    } catch (err) {
                        console.error(`[HandsPipeline] Listener error on '${event}':`, err);
                    }
                }
            }
        }
    }

    return HandsPipeline;
}));

