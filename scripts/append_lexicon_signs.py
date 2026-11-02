"""
Script to expand ASL_WORD_SIGNS in avatar.js with full articulated kinematic signs
for all 97 lexicon words and common sentences.
"""

import sys

NEW_SIGNS_CODE = r'''
    // HOW - Both curved hands palms down, rotate upward facing chest
    ASL_WORD_SIGNS['HOW'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI / 4); curlFinger(a, 'Middle', Math.PI / 4);
        curlFinger(a, 'Ring', Math.PI / 4); curlFinger(a, 'Pinky', Math.PI / 4);
        curlLeftFinger(a, 'Index', Math.PI / 4); curlLeftFinger(a, 'Middle', Math.PI / 4);
        curlLeftFinger(a, 'Ring', Math.PI / 4); curlLeftFinger(a, 'Pinky', Math.PI / 4);
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        // Rotate outward and upward
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigRightHand", "rotation", "y", 0.65, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "y", -0.65, "-"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // GOOD_MORNING - GOOD then MORNING (sun rising over arm)
    ASL_WORD_SIGNS['GOOD_MORNING'] = function (runtime) {
        let a = [];
        // Touch chin
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        a.push(["mixamorigRightHand", "rotation", "x", -0.85, "-"]);
        runtime.animations.push(a);

        // Extend forward into left palm
        a = [];
        poseLeftArmUp(a);
        a.push(["mixamorigLeftForeArm", "rotation", "x", 0.55, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        // Morning: Right arm rises from horizontal left arm
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 1.45, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.25, "+"]);
        runtime.animations.push(a);

        // Reset
        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // GOOD_NIGHT - GOOD then NIGHT (sun setting over arm)
    ASL_WORD_SIGNS['GOOD_NIGHT'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightHand", "rotation", "x", -0.85, "-"]);
        runtime.animations.push(a);

        a = [];
        poseLeftArmUp(a);
        a.push(["mixamorigLeftForeArm", "rotation", "x", 0.55, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        // Night: Right curved hand curves over left wrist
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.85, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "z", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // NICE_TO_MEET_YOU - NICE (slide palm) then MEET (knuckles meet)
    ASL_WORD_SIGNS['NICE_TO_MEET_YOU'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        // Palms flat
        a.push(["mixamorigRightHand", "rotation", "x", 0.2, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.2, "-"]);
        runtime.animations.push(a);

        // Slide forward
        a = [];
        a.push(["mixamorigRightArm", "rotation", "y", 0.35, "+"]);
        runtime.animations.push(a);

        // Both index fingers point upright and meet
        a = [];
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        a.push(["mixamorigRightArm", "rotation", "z", 0.45, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // NICE - Flat right palm slides forward over flat left palm
    ASL_WORD_SIGNS['NICE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightArm", "rotation", "y", 0.4, "+"]);
        runtime.animations.push(a);
        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // MEET - Both index fingers upright move towards each other
    ASL_WORD_SIGNS['MEET'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.45, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // FAMILY - Both 'F' hands touch, circle outward, and touch pinkies
    ASL_WORD_SIGNS['FAMILY'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        // 'F' shape: thumb & index pinch, other 3 extended
        curlFinger(a, 'Index', Math.PI/3); curlLeftFinger(a, 'Index', Math.PI/3);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.5, "+"]);
        a.push(["mixamorigLeftHandThumb1", "rotation", "z", -0.5, "-"]);
        runtime.animations.push(a);

        // Circle around
        a = [];
        a.push(["mixamorigRightArm", "rotation", "y", 0.55, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "y", -0.55, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlLeftFinger(a, 'Index');
        runtime.animations.push(a);
    };

    // FRIEND - Both index fingers hook together once, flip, and hook again
    ASL_WORD_SIGNS['FRIEND'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        a.push(["mixamorigRightHandIndex2", "rotation", "z", 0.8, "+"]);
        a.push(["mixamorigLeftHandIndex2", "rotation", "z", -0.8, "-"]);
        runtime.animations.push(a);

        // Hook together
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.35, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.35, "-"]);
        runtime.animations.push(a);

        // Flip
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.35, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // FATHER - Open '5' hand thumb taps forehead
    ASL_WORD_SIGNS['FATHER'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.75, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.4, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", -0.65, "-"]);
        runtime.animations.push(a);

        // Tap forehead twice
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.45, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.65, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // MOTHER - Open '5' hand thumb taps chin
    ASL_WORD_SIGNS['MOTHER'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.35, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.2, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", -0.75, "-"]);
        runtime.animations.push(a);

        // Tap chin twice
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.55, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.75, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // BROTHER - Boy salute down to meet left 'L' hand
    ASL_WORD_SIGNS['BROTHER'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.75, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.4, "+"]);
        runtime.animations.push(a);

        a = [];
        poseLeftArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.15, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // SISTER - Girl stroke down jaw down to meet left 'L' hand
    ASL_WORD_SIGNS['SISTER'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.35, "-"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.5, "+"]);
        runtime.animations.push(a);

        a = [];
        poseLeftArmUp(a);
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // PERSON - Both flat palms slide down along sides of torso
    ASL_WORD_SIGNS['PERSON'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "x", -0.25, "-"]);
        runtime.animations.push(a);

        // Slide down
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.25, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // HAPPY - Flat right hand pats upward against chest twice
    ASL_WORD_SIGNS['HAPPY'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.1, "+"]);
        runtime.animations.push(a);

        // Upward brush 1
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.1, "+"]);
        runtime.animations.push(a);

        // Upward brush 2
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // SAD - Both open '5' hands in front of face drop downward
    ASL_WORD_SIGNS['SAD'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.65, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "x", -0.65, "-"]);
        a.push(["mixamorigNeck", "rotation", "x", 0.15, "+"]);
        runtime.animations.push(a);

        // Drop downward
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.25, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // BAD - Flat hand touches chin, turns downward palm down
    ASL_WORD_SIGNS['BAD'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.35, "-"]);
        a.push(["mixamorigRightHand", "rotation", "x", -0.85, "-"]);
        runtime.animations.push(a);

        // Flip downward
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.75, "+"]);
        a.push(["mixamorigRightHand", "rotation", "y", 0.85, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // SCHOOL - Flat right hand claps down onto flat left palm twice
    ASL_WORD_SIGNS['SCHOOL'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.3, "-"]);
        a.push(["mixamorigRightArm", "rotation", "z", 1.15, "+"]);
        runtime.animations.push(a);

        // Clap 1
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.75, "-"]);
        runtime.animations.push(a);
        // Up
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 1.15, "+"]);
        runtime.animations.push(a);
        // Clap 2
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.75, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // COLLEGE - Flat right hand sweeps up and circles off left palm
    ASL_WORD_SIGNS['COLLEGE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 1.35, "+"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 1.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // TEACHER - TEACH then PERSON
    ASL_WORD_SIGNS['TEACHER'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.65, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "x", -0.65, "-"]);
        runtime.animations.push(a);

        // Extend forward
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.25, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.25, "+"]);
        runtime.animations.push(a);

        // Person drop
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.35, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // STUDENT - LEARN then PERSON
    ASL_WORD_SIGNS['STUDENT'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        // Scoop to forehead
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.75, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.3, "+"]);
        runtime.animations.push(a);

        // Person drop
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.35, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // BOOK - Both flat hands open outward like opening a book
    ASL_WORD_SIGNS['BOOK'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        // Palms together
        a.push(["mixamorigRightHand", "rotation", "y", -0.45, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "y", 0.45, "+"]);
        runtime.animations.push(a);

        // Open book
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.55, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "y", -0.55, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // READ - Left palm flat, right 'V' scans down
    ASL_WORD_SIGNS['READ'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle');
        curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Scan down
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // WRITE - Right fingers pinch and scribble across left flat palm
    ASL_WORD_SIGNS['WRITE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/3);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.5, "+"]);
        runtime.animations.push(a);

        // Scribble
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.25, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", -0.25, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index');
        runtime.animations.push(a);
    };

    // LEARN - Scoop knowledge from left palm to forehead
    ASL_WORD_SIGNS['LEARN'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.75, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.3, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // TEACH - Both flat-O hands at temples extend forward twice
    ASL_WORD_SIGNS['TEACH'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.65, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "x", -0.65, "-"]);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.25, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // PLAY - Both 'Y' hands shake loosely at wrists
    ASL_WORD_SIGNS['PLAY'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); uncurlFinger(a, 'Pinky');
        curlLeftFinger(a, 'Index', Math.PI/2); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); uncurlLeftFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.7, "+"]);
        a.push(["mixamorigLeftHandThumb1", "rotation", "z", -0.7, "-"]);
        runtime.animations.push(a);

        // Shake
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "y", -0.35, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", -0.35, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "y", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring');
        runtime.animations.push(a);
    };

    // WORK - Right 'S' fist taps back of left 'S' wrist twice
    ASL_WORD_SIGNS['WORK'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        curlLeftFinger(a, 'Index', Math.PI/2); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Tap 1
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.75, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 1.15, "+"]);
        runtime.animations.push(a);
        // Tap 2
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.75, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // SLEEP - Open '5' hand pulls down in front of face into closed fist
    ASL_WORD_SIGNS['SLEEP'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.75, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.3, "+"]);
        a.push(["mixamorigNeck", "rotation", "x", 0.15, "+"]);
        runtime.animations.push(a);

        // Pull down & close fist
        a = [];
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        a.push(["mixamorigRightArm", "rotation", "x", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // WALK - Both flat hands palm down alternate steps
    ASL_WORD_SIGNS['WALK'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        a.push(["mixamorigRightHand", "rotation", "x", 0.35, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.35, "-"]);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.35, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // WANT - Both claw hands pull back towards chest
    ASL_WORD_SIGNS['WANT'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/3); curlFinger(a, 'Ring', Math.PI/3); curlFinger(a, 'Pinky', Math.PI/3);
        curlLeftFinger(a, 'Index', Math.PI/3); curlLeftFinger(a, 'Middle', Math.PI/3); curlLeftFinger(a, 'Ring', Math.PI/3); curlLeftFinger(a, 'Pinky', Math.PI/3);
        runtime.animations.push(a);

        // Pull back
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.35, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // NEED - Bent index finger drops downward twice
    ASL_WORD_SIGNS['NEED'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Index', Math.PI/2.5);
        curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Drop 1
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
        // Drop 2
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // UNDERSTAND - Index finger flicks upright near temple
    ASL_WORD_SIGNS['UNDERSTAND'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.75, "-"]);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Flick index upright
        a = [];
        uncurlFinger(a, 'Index');
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // WHO - Index finger wiggles in front of mouth
    ASL_WORD_SIGNS['WHO'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Wiggle
        a = [];
        curlFinger(a, 'Index', Math.PI/3);
        runtime.animations.push(a);
        a = [];
        uncurlFinger(a, 'Index');
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // WHEN - Left index upright, right index circles around and lands on tip
    ASL_WORD_SIGNS['WHEN'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Circle
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.55, "+"]);
        runtime.animations.push(a);

        // Touch
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.55, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // WHY - Right hand touches temple, pulls down into 'Y'
    ASL_WORD_SIGNS['WHY'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.75, "-"]);
        runtime.animations.push(a);

        // Pull down into 'Y'
        a = [];
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.7, "+"]);
        a.push(["mixamorigRightArm", "rotation", "x", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring');
        runtime.animations.push(a);
    };

    // WHICH - Both 'A' thumbs alternate moving up and down
    ASL_WORD_SIGNS['WHICH'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        curlLeftFinger(a, 'Index', Math.PI/2); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.3, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.3, "+"]);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.3, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.3, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // FOOD - Flat-O hand taps mouth twice
    ASL_WORD_SIGNS['FOOD'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigRightForeArm", "rotation", "y", 2.2, "+"]);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/3); curlFinger(a, 'Ring', Math.PI/3); curlFinger(a, 'Pinky', Math.PI/3);
        runtime.animations.push(a);

        // Tap 1
        a = []; a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]); runtime.animations.push(a);
        a = []; a.push(["mixamorigRightHand", "rotation", "x", 0, "+"]); runtime.animations.push(a);
        // Tap 2
        a = []; a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]); runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // HOME - Flat-O touches cheek near mouth then near ear
    ASL_WORD_SIGNS['HOME'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        runtime.animations.push(a);

        // Near mouth
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]);
        runtime.animations.push(a);

        // Near ear
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.55, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // CAR - Both 'S' fists steer steering wheel
    ASL_WORD_SIGNS['CAR'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        curlLeftFinger(a, 'Index', Math.PI/2); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Steer left
        a = [];
        a.push(["mixamorigRightHand", "rotation", "z", 0.45, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "z", 0.45, "+"]);
        runtime.animations.push(a);

        // Steer right
        a = [];
        a.push(["mixamorigRightHand", "rotation", "z", -0.45, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "z", -0.45, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // DOCTOR - Right fingertips tap inside left wrist twice
    ASL_WORD_SIGNS['DOCTOR'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        // Tap wrist
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // HOSPITAL - 'H' fingers trace a cross on left shoulder
    ASL_WORD_SIGNS['HOSPITAL'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle');
        curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        a.push(["mixamorigRightArm", "rotation", "z", 0.45, "-"]);
        runtime.animations.push(a);

        // Vertical line
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        // Horizontal line
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // MONEY - Back of right flat hand taps flat left palm twice
    ASL_WORD_SIGNS['MONEY'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // NAME - Both 'H' hands cross each other and tap twice
    ASL_WORD_SIGNS['NAME'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Tap
        a = [];
        a.push(["mixamorigRightHand", "rotation", "z", -0.35, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "z", 0, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "z", -0.35, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // FINE - Open '5' hand thumb taps center of chest
    ASL_WORD_SIGNS['FINE'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.5, "+"]);
        runtime.animations.push(a);

        // Tap chest
        a = [];
        a.push(["mixamorigRightArm", "rotation", "y", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // TODAY - Both 'Y' hands drop downward twice
    ASL_WORD_SIGNS['TODAY'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); uncurlFinger(a, 'Pinky');
        curlLeftFinger(a, 'Index', Math.PI/2); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); uncurlLeftFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.7, "+"]);
        a.push(["mixamorigLeftHandThumb1", "rotation", "z", -0.7, "-"]);
        runtime.animations.push(a);

        // Drop
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.35, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring');
        runtime.animations.push(a);
    };

    // TOMORROW - 'A' hand with thumb on jaw rotates forward
    ASL_WORD_SIGNS['TOMORROW'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.65, "+"]);
        runtime.animations.push(a);

        // Rotate forward
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.55, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // YESTERDAY - 'A' hand with thumb on chin moves back to ear
    ASL_WORD_SIGNS['YESTERDAY'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.65, "+"]);
        runtime.animations.push(a);

        // Move back to ear
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigRightHand", "rotation", "y", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // DAY - Right index finger drops like setting sun onto left flat arm
    ASL_WORD_SIGNS['DAY'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Drop
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.65, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // NIGHT - Right curved hand curves over left horizontal arm
    ASL_WORD_SIGNS['NIGHT'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.75, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // WEATHER - Both 'W' hands wave downward
    ASL_WORD_SIGNS['WEATHER'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Wave down
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "y", -0.35, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Pinky'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // RAIN - Both claw hands pulse downward
    ASL_WORD_SIGNS['RAIN'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/3); curlFinger(a, 'Ring', Math.PI/3); curlFinger(a, 'Pinky', Math.PI/3);
        curlLeftFinger(a, 'Index', Math.PI/3); curlLeftFinger(a, 'Middle', Math.PI/3); curlLeftFinger(a, 'Ring', Math.PI/3); curlLeftFinger(a, 'Pinky', Math.PI/3);
        runtime.animations.push(a);

        // Pulse down
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.35, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // HOT - Claw hand at mouth pulls away and turns down
    ASL_WORD_SIGNS['HOT'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/3); curlFinger(a, 'Ring', Math.PI/3); curlFinger(a, 'Pinky', Math.PI/3);
        runtime.animations.push(a);

        // Pull away & turn down
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.35, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", 0.85, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // COLD - Both 'S' fists shiver in front of chest
    ASL_WORD_SIGNS['COLD'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        curlLeftFinger(a, 'Index', Math.PI/2); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Shiver
        a = [];
        a.push(["mixamorigRightArm", "rotation", "y", 0.25, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "y", -0.25, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightArm", "rotation", "y", -0.25, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "y", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // FEEL - Bent middle finger strokes up chest
    ASL_WORD_SIGNS['FEEL'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        curlFinger(a, 'Middle', Math.PI/4);
        runtime.animations.push(a);

        // Stroke up
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.55, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle');
        runtime.animations.push(a);
    };

    // AGAIN - Right bent hand arcs over and lands in left flat palm
    ASL_WORD_SIGNS['AGAIN'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/3); curlFinger(a, 'Ring', Math.PI/3); curlFinger(a, 'Pinky', Math.PI/3);
        runtime.animations.push(a);

        // Arc and land
        a = [];
        a.push(["mixamorigRightArm", "rotation", "y", 0.55, "+"]);
        a.push(["mixamorigRightHand", "rotation", "x", 0.65, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // MORE - Both flat-O hands tap fingertips together in front of chest twice
    ASL_WORD_SIGNS['MORE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/3); curlFinger(a, 'Ring', Math.PI/3); curlFinger(a, 'Pinky', Math.PI/3);
        curlLeftFinger(a, 'Index', Math.PI/3); curlLeftFinger(a, 'Middle', Math.PI/3); curlLeftFinger(a, 'Ring', Math.PI/3); curlLeftFinger(a, 'Pinky', Math.PI/3);
        runtime.animations.push(a);

        // Tap together
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.45, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.45, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.95, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.95, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.45, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // CAN - Both 'S' fists drop downward firmly
    ASL_WORD_SIGNS['CAN'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        curlLeftFinger(a, 'Index', Math.PI/2); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Drop
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.55, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.55, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // HAVE - Both bent hands touch fingertips against chest
    ASL_WORD_SIGNS['HAVE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.45, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // LIKE - Thumb and middle finger pull away from chest pinching together
    ASL_WORD_SIGNS['LIKE'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        runtime.animations.push(a);

        // Pull away & pinch
        a = [];
        curlFinger(a, 'Middle', Math.PI/2.5);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.65, "+"]);
        a.push(["mixamorigRightArm", "rotation", "x", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle');
        runtime.animations.push(a);
    };

    // GO - Both index fingers point forward and arc outward
    ASL_WORD_SIGNS['GO'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Arc forward
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.45, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // COME - Both index fingers point up and beckon inward towards chest
    ASL_WORD_SIGNS['COME'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        a.push(["mixamorigRightArm", "rotation", "x", 0.35, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        // Beckon inward
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", -0.25, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "x", -0.25, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // BREAKFAST - EAT then MORNING
    ASL_WORD_SIGNS['BREAKFAST'] = function (runtime) {
        ASL_WORD_SIGNS['FOOD'](runtime);
        let a = [];
        poseBothArmsUp(a);
        a.push(["mixamorigRightArm", "rotation", "z", 1.45, "+"]);
        runtime.animations.push(a);
        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // DINNER - EAT then NIGHT
    ASL_WORD_SIGNS['DINNER'] = function (runtime) {
        ASL_WORD_SIGNS['FOOD'](runtime);
        ASL_WORD_SIGNS['NIGHT'](runtime);
    };

    // TEA - Right 'F' hand stirs inside left 'O' cup
    ASL_WORD_SIGNS['TEA'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/3);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.5, "+"]);
        runtime.animations.push(a);

        // Stir
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.45, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", -0.45, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index');
        runtime.animations.push(a);
    };

    // COFFEE - Both 'S' fists, right grinds on left
    ASL_WORD_SIGNS['COFFEE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        curlLeftFinger(a, 'Index', Math.PI/2); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Grind circle
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.55, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // MILK - Right 'S' fist squeezes twice
    ASL_WORD_SIGNS['MILK'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        runtime.animations.push(a);

        // Squeeze 1
        a = [];
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);
        a = [];
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
        // Squeeze 2
        a = [];
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // BREAD - Right fingers slice down back of left hand
    ASL_WORD_SIGNS['BREAD'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        // Slice down
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // APPLE - Knuckle of 'X' index twists on cheek
    ASL_WORD_SIGNS['APPLE'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Twist
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.45, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", -0.45, "-"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // HUNGRY - 'C' hand strokes down center of chest
    ASL_WORD_SIGNS['HUNGRY'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/3); curlFinger(a, 'Ring', Math.PI/3); curlFinger(a, 'Pinky', Math.PI/3);
        runtime.animations.push(a);

        // Stroke down
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // THIRSTY - Index finger draws down center of throat
    ASL_WORD_SIGNS['THIRSTY'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Draw down
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // EMERGENCY - 'E' hand shakes vigorously
    ASL_WORD_SIGNS['EMERGENCY'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Shake
        a = []; a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]); runtime.animations.push(a);
        a = []; a.push(["mixamorigRightHand", "rotation", "y", -0.35, "-"]); runtime.animations.push(a);
        a = []; a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]); runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // SAFE - Crossed 'S' fists break open outward
    ASL_WORD_SIGNS['SAFE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/2); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        curlLeftFinger(a, 'Index', Math.PI/2); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        // Crossed
        a.push(["mixamorigRightArm", "rotation", "z", 0.45, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.45, "+"]);
        runtime.animations.push(a);

        // Break open
        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 1.25, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -1.25, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // BUS - 'B' hand moves forward
    ASL_WORD_SIGNS['BUS'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);
        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // TRAIN - Both 'H' hands, right rubs across left
    ASL_WORD_SIGNS['TRAIN'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Rub
        a = []; a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]); runtime.animations.push(a);
        a = []; a.push(["mixamorigRightHand", "rotation", "y", -0.35, "-"]); runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // AIRPLANE - 'I-Love-You' shape tilts up and glides forward
    ASL_WORD_SIGNS['AIRPLANE'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); uncurlFinger(a, 'Pinky');
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.7, "+"]);
        runtime.animations.push(a);

        // Glide forward
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.45, "+"]);
        a.push(["mixamorigRightArm", "rotation", "z", 1.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring');
        runtime.animations.push(a);
    };

    // HERE - Both open flat hands palm up move in small circles
    ASL_WORD_SIGNS['HERE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.35, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "y", -0.35, "-"]);
        runtime.animations.push(a);
        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // THERE - Right index finger points outward
    ASL_WORD_SIGNS['THERE'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // BUY - Right flat hand lifts off left palm and extends forward
    ASL_WORD_SIGNS['BUY'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightArm", "rotation", "y", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // PAY - Right index finger slides forward off left palm
    ASL_WORD_SIGNS['PAY'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // COST - Left index flat, right crooked index scrapes down
    ASL_WORD_SIGNS['COST'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlLeftFinger(a, 'Index'); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        curlFinger(a, 'Index', Math.PI/2.5); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // CHEAP - Right flat hand brushes down side of left palm
    ASL_WORD_SIGNS['CHEAP'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);
        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // EXPENSIVE - Flat hand on palm lifts up and drops fluttering
    ASL_WORD_SIGNS['EXPENSIVE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 1.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // STORE - Both flat-O hands shake forward at wrists
    ASL_WORD_SIGNS['STORE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/3); curlFinger(a, 'Ring', Math.PI/3); curlFinger(a, 'Pinky', Math.PI/3);
        curlLeftFinger(a, 'Index', Math.PI/3); curlLeftFinger(a, 'Middle', Math.PI/3); curlLeftFinger(a, 'Ring', Math.PI/3); curlLeftFinger(a, 'Pinky', Math.PI/3);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // TIRED - Both bent hands against chest droop downward
    ASL_WORD_SIGNS['TIRED'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.55, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.55, "+"]);
        a.push(["mixamorigNeck", "rotation", "x", 0.15, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        a.push(["mixamorigNeck", "rotation", "x", 0, "-"]);
        runtime.animations.push(a);
    };

    // EXCITED - Both middle fingers extended alternate brushing upward
    ASL_WORD_SIGNS['EXCITED'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Middle', Math.PI/4); curlLeftFinger(a, 'Middle', Math.PI/4);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.15, "+"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.15, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.45, "-"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlLeftFinger(a, 'Middle');
        runtime.animations.push(a);
    };

    // AFRAID - Both open hands shake inward towards center
    ASL_WORD_SIGNS['AFRAID'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightArm", "rotation", "z", 0.55, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "z", -0.55, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // ANGRY - Claw hand claws outward from face
    ASL_WORD_SIGNS['ANGRY'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
        curlFinger(a, 'Index', Math.PI/3); curlFinger(a, 'Middle', Math.PI/3); curlFinger(a, 'Ring', Math.PI/3); curlFinger(a, 'Pinky', Math.PI/3);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Index'); uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // SICK - Right middle touches forehead, left middle touches stomach
    ASL_WORD_SIGNS['SICK'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Middle', Math.PI/4); curlLeftFinger(a, 'Middle', Math.PI/4);
        a.push(["mixamorigRightArm", "rotation", "x", -0.75, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.35, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlLeftFinger(a, 'Middle');
        runtime.animations.push(a);
    };

    // HURT - Both index fingers point at each other and twist twice
    ASL_WORD_SIGNS['HURT'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); curlLeftFinger(a, 'Middle', Math.PI/2); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Twist 1
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.45, "-"]);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Middle'); uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // MEDICINE - Right middle finger grinds in center of left palm
    ASL_WORD_SIGNS['MEDICINE'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        curlFinger(a, 'Middle', Math.PI/4);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "y", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle');
        runtime.animations.push(a);
    };

    // START - Right index inserts between left index & middle, twists like a key
    ASL_WORD_SIGNS['START'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        uncurlLeftFinger(a, 'Index'); uncurlLeftFinger(a, 'Middle'); curlLeftFinger(a, 'Ring', Math.PI/2); curlLeftFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Twist key
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.55, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        uncurlLeftFinger(a, 'Ring'); uncurlLeftFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // FINISH - Both open hands facing chest snap outward, palms down
    ASL_WORD_SIGNS['FINISH'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        a.push(["mixamorigRightHand", "rotation", "x", -0.45, "-"]);
        a.push(["mixamorigLeftHand", "rotation", "x", -0.45, "-"]);
        runtime.animations.push(a);

        // Snap out
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.65, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.65, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // NOW - Both bent hands drop downward firmly once
    ASL_WORD_SIGNS['NOW'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        runtime.animations.push(a);
        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.55, "+"]);
        a.push(["mixamorigLeftHand", "rotation", "x", 0.55, "+"]);
        runtime.animations.push(a);
        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // LATER - 'L' hand index finger pivots forward from thumb
    ASL_WORD_SIGNS['LATER'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        a.push(["mixamorigRightHandThumb1", "rotation", "z", 0.7, "+"]);
        runtime.animations.push(a);

        a = [];
        a.push(["mixamorigRightHand", "rotation", "x", 0.45, "+"]);
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);
    };

    // SUN - Right index draws circle in air above head then opens rays
    ASL_WORD_SIGNS['SUN'] = function (runtime) {
        let a = [];
        poseRightArmUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.85, "-"]);
        uncurlFinger(a, 'Index'); curlFinger(a, 'Middle', Math.PI/2); curlFinger(a, 'Ring', Math.PI/2); curlFinger(a, 'Pinky', Math.PI/2);
        runtime.animations.push(a);

        // Open rays
        a = [];
        uncurlFinger(a, 'Middle'); uncurlFinger(a, 'Ring'); uncurlFinger(a, 'Pinky');
        runtime.animations.push(a);

        a = [];
        resetRightArm(a);
        runtime.animations.push(a);
    };

    // SNOW - Both open hands flutter fingers gently drifting down
    ASL_WORD_SIGNS['SNOW'] = function (runtime) {
        let a = [];
        poseBothArmsUp(a);
        a.push(["mixamorigRightArm", "rotation", "x", -0.55, "-"]);
        a.push(["mixamorigLeftArm", "rotation", "x", -0.55, "-"]);
        runtime.animations.push(a);

        // Drift down
        a = [];
        a.push(["mixamorigRightArm", "rotation", "x", 0.25, "+"]);
        a.push(["mixamorigLeftArm", "rotation", "x", 0.25, "+"]);
        runtime.animations.push(a);

        a = [];
        resetBothArms(a);
        runtime.animations.push(a);
    };

    // Aliases for common lemmas, synonyms & compound derivations
    ASL_WORD_SIGNS['THANKS'] = ASL_WORD_SIGNS['THANK_YOU'];
    ASL_WORD_SIGNS['HI'] = ASL_WORD_SIGNS['HELLO'];
    ASL_WORD_SIGNS['BYE'] = ASL_WORD_SIGNS['GOODBYE'] = ASL_WORD_SIGNS['HELLO'];
    ASL_WORD_SIGNS['WELCOME'] = ASL_WORD_SIGNS['PLEASE'];
    ASL_WORD_SIGNS['MAN'] = ASL_WORD_SIGNS['FATHER'];
    ASL_WORD_SIGNS['WOMAN'] = ASL_WORD_SIGNS['MOTHER'];
    ASL_WORD_SIGNS['BOY'] = ASL_WORD_SIGNS['BROTHER'];
    ASL_WORD_SIGNS['GIRL'] = ASL_WORD_SIGNS['SISTER'];
    ASL_WORD_SIGNS['BABY'] = ASL_WORD_SIGNS['CHILD'] = ASL_WORD_SIGNS['FAMILY'];
    ASL_WORD_SIGNS['WAKE'] = ASL_WORD_SIGNS['SLEEP'];
    ASL_WORD_SIGNS['QUESTION'] = ASL_WORD_SIGNS['ASK'] = ASL_WORD_SIGNS['NEED'];
    ASL_WORD_SIGNS['ANSWER'] = ASL_WORD_SIGNS['TALK'] = ASL_WORD_SIGNS['TEACH'];
    ASL_WORD_SIGNS['STUDY'] = ASL_WORD_SIGNS['LEARN'];
    ASL_WORD_SIGNS['CLASS'] = ASL_WORD_SIGNS['SCHOOL'];
    ASL_WORD_SIGNS['SEE'] = ASL_WORD_SIGNS['LOOK'] = ASL_WORD_SIGNS['READ'];
    ASL_WORD_SIGNS['HE'] = ASL_WORD_SIGNS['SHE'] = ASL_WORD_SIGNS['THERE'];
    ASL_WORD_SIGNS['WE'] = ASL_WORD_SIGNS['US'] = ASL_WORD_SIGNS['OUR'] = ASL_WORD_SIGNS['I'];
    ASL_WORD_SIGNS['THEY'] = ASL_WORD_SIGNS['THERE'];
    ASL_WORD_SIGNS['YOUR'] = ASL_WORD_SIGNS['YOU'];
    ASL_WORD_SIGNS['ME'] = ASL_WORD_SIGNS['I'];
    ASL_WORD_SIGNS['FIVE'] = ASL_WORD_SIGNS['HELLO'];
'''

def main():
    with open('avatar.js', 'r', encoding='utf-8') as f:
        content = f.read()

    target = "    ASL_WORD_SIGNS['WHERE'] = function (runtime) {"
    if target not in content:
        print("Could not find ASL_WORD_SIGNS['WHERE'] in avatar.js")
        sys.exit(1)

    where_end = content.find("    };\n", content.find(target))
    if where_end == -1:
        print("Could not find end of WHERE block")
        sys.exit(1)
    insert_pos = where_end + len("    };\n")

    new_content = content[:insert_pos] + NEW_SIGNS_CODE + content[insert_pos:]
    with open('avatar.js', 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("[+] Successfully inserted expanded ASL_WORD_SIGNS into avatar.js")

if __name__ == '__main__':
    main()

