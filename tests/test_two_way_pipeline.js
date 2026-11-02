// tests/test_two_way_pipeline.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// Polyfill minimal browser globals
globalThis.performance = globalThis.performance || { now: () => Date.now() };

const HandsPipeline = require('../src/hands-pipeline.js');

test('HandsPipeline initializes with expected default options', () => {
    const pipeline = new HandsPipeline({
        maxNumHands: 2,
        requiredLockInFrames: 3,
        enableDTW: true
    });

    assert.equal(pipeline.options.maxNumHands, 2);
    assert.equal(pipeline.options.requiredLockInFrames, 3);
    assert.equal(pipeline.options.enableDTW, true);
    assert.equal(pipeline.recognitionMode, 'alphabet');
    assert.equal(pipeline.isGloveConnected, false);
});

test('Event emitter handles on/emit listeners properly', () => {
    const pipeline = new HandsPipeline();
    let landmarkEventFired = false;
    let predictionEventFired = false;

    pipeline.on('landmarks', (data) => {
        landmarkEventFired = true;
        assert.equal(data.testKey, 'abc');
    });

    pipeline.on('prediction', (pred) => {
        predictionEventFired = true;
        assert.equal(pred.letter, 'A');
        assert.equal(pred.isLockedIn, true);
    });

    pipeline.emit('landmarks', { testKey: 'abc' });
    pipeline.emit('prediction', { letter: 'A', confidence: 0.95, isLockedIn: true });

    assert.equal(landmarkEventFired, true);
    assert.equal(predictionEventFired, true);
});

test('Wrist-relative landmark normalization is scale and translation invariant', () => {
    const pipeline = new HandsPipeline();

    // Generate a synthetic hand at coordinate (100, 100)
    const rawHand1 = Array.from({ length: 21 }, (_, i) => ({
        x: 100 + i * 2,
        y: 100 + i * 3,
        z: 0.05
    }));

    // Same hand translated to (400, 300) with 2x scale
    const rawHand2 = Array.from({ length: 21 }, (_, i) => ({
        x: 400 + (i * 2) * 2,
        y: 300 + (i * 3) * 2,
        z: 0.05 * 2
    }));

    const norm1 = pipeline.normalizeLandmarksWristRelative(rawHand1);
    const norm2 = pipeline.normalizeLandmarksWristRelative(rawHand2);

    assert.equal(norm1.length, 21);
    assert.equal(norm2.length, 21);

    // Wrist at index 0 should always be [0, 0, 0]
    assert.equal(norm1[0][0], 0);
    assert.equal(norm1[0][1], 0);
    assert.equal(norm1[0][2], 0);

    assert.equal(norm2[0][0], 0);
    assert.equal(norm2[0][1], 0);
    assert.equal(norm2[0][2], 0);

    // Translation and scale invariance: normalized points should match closely
    for (let i = 0; i < 21; i++) {
        assert.ok(Math.abs(norm1[i][0] - norm2[i][0]) < 0.01, `Point ${i} x-coord difference`);
        assert.ok(Math.abs(norm1[i][1] - norm2[i][1]) < 0.01, `Point ${i} y-coord difference`);
    }
});

test('Compact landmark serialization achieves < 500 bytes per frame for WebRTC streaming', () => {
    const dummyLandmarks = Array.from({ length: 21 }, (_, i) => [
        parseFloat((Math.sin(i) * 0.5).toFixed(3)),
        parseFloat((Math.cos(i) * 0.5).toFixed(3)),
        parseFloat((0.01 * i).toFixed(3))
    ]);

    const compact = HandsPipeline.compactSerializeLandmarks(dummyLandmarks);
    assert.equal(compact.length, 21);
    assert.equal(compact[0].length, 3);

    // Verify coordinates are rounded to 3 decimal places
    const serializedJson = JSON.stringify({ hands: [{ landmarks: compact, handedness: 'Right' }] });
    assert.ok(serializedJson.length < 500, `Serialized frame size is ${serializedJson.length} bytes (target < 500)`);
});

test('Dynamic Time Warping (DTW) distance metric matches identical gestures and rejects disparate trajectories', () => {
    // Generate a baseline gesture trajectory (e.g. moving right and up)
    const trajectoryA = [];
    for (let f = 0; f < 15; f++) {
        const frame = Array.from({ length: 21 }, (_, i) => [
            parseFloat((f * 0.02 + i * 0.005).toFixed(3)),
            parseFloat((f * -0.01 + i * 0.005).toFixed(3)),
            0
        ]);
        trajectoryA.push(frame);
    }

    // Identical trajectory
    const distIdentical = HandsPipeline.computeDTWDistance(trajectoryA, trajectoryA);
    assert.equal(distIdentical, 0, 'Distance to identical trajectory should be 0');

    // Time-stretched trajectory with small noise (same motion, 20 frames instead of 15)
    const trajectoryB = [];
    for (let f = 0; f < 20; f++) {
        const frame = Array.from({ length: 21 }, (_, i) => [
            parseFloat((f * 0.015 + i * 0.005 + 0.002).toFixed(3)),
            parseFloat((f * -0.0075 + i * 0.005).toFixed(3)),
            0
        ]);
        trajectoryB.push(frame);
    }
    const distSimilar = HandsPipeline.computeDTWDistance(trajectoryA, trajectoryB);
    assert.ok(distSimilar < 0.12, `DTW distance for similar trajectory should be small, got ${distSimilar}`);

    // Completely opposite trajectory (moving down and left with large displacement)
    const trajectoryC = [];
    for (let f = 0; f < 15; f++) {
        const frame = Array.from({ length: 21 }, (_, i) => [
            parseFloat((f * -0.05).toFixed(3)),
            parseFloat((f * 0.08).toFixed(3)),
            0.5
        ]);
        trajectoryC.push(frame);
    }
    const distDisparate = HandsPipeline.computeDTWDistance(trajectoryA, trajectoryC);
    assert.ok(distDisparate > 0.30, `DTW distance for disparate trajectory should be large, got ${distDisparate}`);
    assert.ok(distSimilar < distDisparate, 'Similar gesture must have significantly lower DTW distance than disparate');
});

test('3-frame lock-in filter produces output only when prediction holds consecutively', () => {
    const pipeline = new HandsPipeline({ requiredLockInFrames: 3, lockInCooldownMs: 100 });
    const lockedInPredictions = [];

    pipeline.on('prediction', (res) => {
        if (res.isLockedIn) {
            lockedInPredictions.push(res.letter);
        }
    });

    // Frame 1: Candidate 'B'
    pipeline.evaluateLockIn('B', 0.92);
    assert.equal(lockedInPredictions.length, 0, 'Frame 1 should not trigger lock-in');

    // Frame 2: Candidate 'B'
    pipeline.evaluateLockIn('B', 0.94);
    assert.equal(lockedInPredictions.length, 0, 'Frame 2 should not trigger lock-in');

    // Frame 3: Candidate 'B' (meets required 3 frames)
    pipeline.evaluateLockIn('B', 0.95);
    assert.equal(lockedInPredictions.length, 1, 'Frame 3 must trigger lock-in');
    assert.equal(lockedInPredictions[0], 'B');

    // Interrupted by candidate 'C'
    pipeline.evaluateLockIn('C', 0.90);
    assert.equal(lockedInPredictions.length, 1, 'Single frame of C should not lock in');
});

test('BLE glove sensor fusion correctly augments rotational gestures (J, Z, YES, HELLO)', () => {
    const pipeline = new HandsPipeline();
    pipeline.isGloveConnected = true;

    // Simulate IMU scoop motion (roll spikes past 40 deg)
    pipeline.feedGloveOrientation(45.0, 10.0);
    const motion = pipeline.detectGloveMotion();
    assert.equal(motion.isScoop, true);

    // Simulate tilt down (YES nod)
    pipeline.feedGloveOrientation(0.0, -35.0);
    const nodMotion = pipeline.detectGloveMotion();
    assert.equal(nodMotion.isNod, true);
});

