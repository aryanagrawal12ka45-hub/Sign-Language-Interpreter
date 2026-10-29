/**
 * AvatarEngine: Vanilla Three.js SkinnedMesh Player for ISL Sign Animations
 *
 * Adapted from Sign-Flow (https://github.com/maddyroxx/Sign-Flow)
 * License: MIT (Copyright (c) 2026 Madhav Mullick)
 *
 * Drives Adobe Mixamo Y-Bot skeletal rig using procedural bone quaternion keyframes.
 * Supports play/pause, replay, variable speed, step-through, single-sign replay,
 * and learner "Practice Mode" (pausing after each sign for imitation).
 */

import * as THREE from './libs/three.module.js';
import { GLTFLoader } from './libs/GLTFLoader.js';
import * as wordAnimations from './animations/words.js';
import * as alphabetAnimations from './animations/alphabets.js';
import { defaultPose } from './animations/defaultPose.js';

const BONE_ALIASES = {
  mixamorigNeck: ['neck_1_def', 'neck_1_fk', 'neck', 'Neck', 'DEF-neck'],
  mixamorigHead: ['head_def_1', 'head_fk', 'head', 'Head', 'DEF-head'],
  mixamorigLeftShoulder: ['shoulder_L', 'clavicle_L', 'LeftShoulder', 'DEF-shoulder.L'],
  mixamorigRightShoulder: ['shoulder_R', 'clavicle_R', 'RightShoulder', 'DEF-shoulder.R'],
  mixamorigLeftArm: ['arm_fk_L', 'arm_def_L', 'arm_L', 'UpperArm_L', 'LeftArm', 'DEF-upper_arm.L'],
  mixamorigRightArm: ['arm_fk_R', 'arm_def_R', 'arm_R', 'UpperArm_R', 'RightArm', 'DEF-upper_arm.R'],
  mixamorigLeftForeArm: ['forearm_fk_L', 'forearm_def_L', 'forearm_L', 'LeftForeArm', 'DEF-forearm.L'],
  mixamorigRightForeArm: ['forearm_fk_R', 'forearm_def_R', 'forearm_R', 'RightForeArm', 'DEF-forearm.R'],
  mixamorigLeftHand: ['hand_fk_L', 'hand_def_L', 'hand_L', 'LeftHand', 'DEF-hand.L'],
  mixamorigRightHand: ['hand_fk_R', 'hand_def_R', 'hand_R', 'RightHand', 'DEF-hand.R'],

  // Left Hand Fingers
  mixamorigLeftHandThumb1: ['thumb_01_L', 'LeftHandThumb1', 'DEF-thumb.01.L'],
  mixamorigLeftHandThumb2: ['thumb_02_L', 'LeftHandThumb2', 'DEF-thumb.02.L'],
  mixamorigLeftHandThumb3: ['thumb_03_L', 'LeftHandThumb3', 'DEF-thumb.03.L'],
  mixamorigLeftHandIndex1: ['fing_ind_1_L', 'LeftHandIndex1', 'DEF-f_index.01.L'],
  mixamorigLeftHandIndex2: ['fing_ind_2_L', 'LeftHandIndex2', 'DEF-f_index.02.L'],
  mixamorigLeftHandIndex3: ['fing_ind_3_L', 'LeftHandIndex3', 'DEF-f_index.03.L'],
  mixamorigLeftHandMiddle1: ['fing_mid_1_L', 'LeftHandMiddle1', 'DEF-f_middle.01.L'],
  mixamorigLeftHandMiddle2: ['fing_mid_2_L', 'LeftHandMiddle2', 'DEF-f_middle.02.L'],
  mixamorigLeftHandMiddle3: ['fing_mid_3_L', 'LeftHandMiddle3', 'DEF-f_middle.03.L'],
  mixamorigLeftHandRing1: ['fing_ring_1_L', 'LeftHandRing1', 'DEF-f_ring.01.L'],
  mixamorigLeftHandRing2: ['fing_ring_2_L', 'LeftHandRing2', 'DEF-f_ring.02.L'],
  mixamorigLeftHandRing3: ['fing_ring_3_L', 'LeftHandRing3', 'DEF-f_ring.03.L'],
  mixamorigLeftHandPinky1: ['fing_lit_1_L', 'LeftHandPinky1', 'DEF-f_pinky.01.L'],
  mixamorigLeftHandPinky2: ['fing_lit_2_L', 'LeftHandPinky2', 'DEF-f_pinky.02.L'],
  mixamorigLeftHandPinky3: ['fing_lit_3_L', 'LeftHandPinky3', 'DEF-f_pinky.03.L'],

  // Right Hand Fingers
  mixamorigRightHandThumb1: ['thumb_01_R', 'RightHandThumb1', 'DEF-thumb.01.R'],
  mixamorigRightHandThumb2: ['thumb_02_R', 'RightHandThumb2', 'DEF-thumb.02.R'],
  mixamorigRightHandThumb3: ['thumb_03_R', 'RightHandThumb3', 'DEF-thumb.03.R'],
  mixamorigRightHandIndex1: ['fing_ind_1_R', 'RightHandIndex1', 'DEF-f_index.01.R'],
  mixamorigRightHandIndex2: ['fing_ind_2_R', 'RightHandIndex2', 'DEF-f_index.02.R'],
  mixamorigRightHandIndex3: ['fing_ind_3_R', 'RightHandIndex3', 'DEF-f_index.03.R'],
  mixamorigRightHandMiddle1: ['fing_mid_1_R', 'RightHandMiddle1', 'DEF-f_middle.01.R'],
  mixamorigRightHandMiddle2: ['fing_mid_2_R', 'RightHandMiddle2', 'DEF-f_middle.02.R'],
  mixamorigRightHandMiddle3: ['fing_mid_3_R', 'RightHandMiddle3', 'DEF-f_middle.03.R'],
  mixamorigRightHandRing1: ['fing_ring_1_R', 'RightHandRing1', 'DEF-f_ring.01.R'],
  mixamorigRightHandRing2: ['fing_ring_2_R', 'RightHandRing2', 'DEF-f_ring.02.R'],
  mixamorigRightHandRing3: ['fing_ring_3_R', 'RightHandRing3', 'DEF-f_ring.03.R'],
  mixamorigRightHandPinky1: ['fing_lit_1_R', 'RightHandPinky1', 'DEF-f_pinky.01.R'],
  mixamorigRightHandPinky2: ['fing_lit_2_R', 'RightHandPinky2', 'DEF-f_pinky.02.R'],
  mixamorigRightHandPinky3: ['fing_lit_3_R', 'RightHandPinky3', 'DEF-f_pinky.03.R'],
};

export class AvatarEngine {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.modelUrl = options.modelUrl || 'assets/models/ybot.glb';
    this.speed = options.speed || 1.0;
    this.practiceMode = !!options.practiceMode; // When true, pauses after each sign for imitation

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onProgress = options.onProgress || (() => {});

    // State
    this.isReady = false;
    this.isPaused = false;
    this.activeTokens = [];
    this.tokenAnimationMap = []; // Array of { tokenIndex, token, isFingerspelling, letter, frames: [...] }
    this.currentSignIndex = -1;
    this.lastReportedTokenIndex = -1;

    this.runtime = {
      animations: [],
      characters: [],
      pending: true,
      avatar: null,
    };

    this.nextFrameAt = 0;
    this.wasSigning = false;
    this.animationFrameId = null;

    this._initScene();
    this._loadModel();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    // Neutral dark studio background matching website's glassmorphic palette
    this.scene.background = new THREE.Color('#0b101b');

    // Camera framed on upper body, chest, and arms
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
    this.camera.position.set(0, 0.62, 2.75);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight('#FFFFFF', '#334155', 1.2);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFFFFF', 2.2);
    keyLight.position.set(2.5, 4.5, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#94A3B8', 1.1);
    fillLight.position.set(-2.5, 2.0, 2.5);
    this.scene.add(fillLight);

    // Turquoise accent rim light
    const turquoiseRim = new THREE.PointLight('#8DC1C2', 6.0, 10);
    turquoiseRim.position.set(2.2, 1.8, 1.8);
    this.scene.add(turquoiseRim);

    // Royal blue accent rim light matching site theme
    const blueRim = new THREE.PointLight('#3B82F6', 5.0, 10);
    blueRim.position.set(-2.2, 1.8, 1.8);
    this.scene.add(blueRim);

    // Soft grounded shadow floor
    const shadowGeo = new THREE.PlaneGeometry(8, 8);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const floor = new THREE.Mesh(shadowGeo, shadowMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.85;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this._resize = () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (!width || !height) return;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    };

    this.resizeObserver = new ResizeObserver(this._resize);
    this.resizeObserver.observe(this.container);
    this._resize();
  }

  _loadModel() {
    this.onStateChange('loading');
    const loader = new GLTFLoader();

    loader.load(
      this.modelUrl,
      (gltf) => {
        const avatar = gltf.scene;
        avatar.position.y = -0.85;
        avatar.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
          }
        });

        this.applyTurquoiseColors(avatar);
        this.scene.add(avatar);
        this.runtime.avatar = avatar;

        this._captureRestQuaternions(avatar);
        this.resetAvatar();

        this.isReady = true;
        this.onStateChange('ready');

        this._startRenderLoop();
      },
      undefined,
      (err) => {
        console.error('[AvatarEngine] Failed to load avatar mesh:', err);
        this.onStateChange('error');
      }
    );
  }

  _captureRestQuaternions(avatar) {
    avatar.traverse((child) => {
      if (child.type !== 'Bone') return;
      child.userData.restQuaternion = child.quaternion.clone();
      child.userData.gestureRestQuaternion = child.userData.restQuaternion.clone();
      child.userData.restPosition = child.position.clone();
      child.userData.restScale = child.scale.clone();
      child.userData.delta = { x: 0, y: 0, z: 0 };
    });
  }

  getBone(boneName) {
    if (!this.runtime.avatar) return null;
    const compact = boneName.replace(/^mixamorig:?/, '');
    const aliases = BONE_ALIASES[boneName] || BONE_ALIASES[`mixamorig${compact}`] || [];
    const candidates = [boneName, `mixamorig:${compact}`, `mixamorig${compact}`, compact, ...aliases];

    for (const c of candidates) {
      const bone = this.runtime.avatar.getObjectByName(c);
      if (bone) return bone;
    }

    const lower = candidates.map((c) => c.toLowerCase());
    let found = null;
    this.runtime.avatar.traverse((child) => {
      if (found || child.type !== 'Bone') return;
      const norm = (child.name.split('|').pop() || child.name).replace(/^mixamorig:?/, '').toLowerCase();
      if (lower.includes(norm)) {
        found = child;
      }
    });
    return found;
  }

  resetAvatar() {
    const avatar = this.runtime.avatar;
    if (!avatar) return;

    this.runtime.animations = [];
    this.runtime.characters = [];

    avatar.traverse((child) => {
      if (child.type !== 'Bone') return;
      const ud = child.userData;
      if (ud.gestureRestQuaternion) child.quaternion.copy(ud.gestureRestQuaternion);
      if (ud.restPosition) child.position.copy(ud.restPosition);
      if (ud.restScale) child.scale.copy(ud.restScale);
      ud.delta = { x: 0, y: 0, z: 0 };
    });

    defaultPose(this.runtime);

    for (const frame of this.runtime.animations) {
      for (const [boneName, , axis, target] of frame) {
        const bone = this.getBone(boneName);
        if (!bone) continue;
        const ud = bone.userData;
        const delta = ud.delta || (ud.delta = { x: 0, y: 0, z: 0 });
        delta[axis] = target;
        const deltaQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(delta.x, delta.y, delta.z));
        const rest = ud.gestureRestQuaternion || ud.restQuaternion;
        bone.quaternion.copy(rest ? rest.clone().multiply(deltaQuat) : deltaQuat);
      }
    }

    this.runtime.animations = [];
    this.runtime.characters = [];
  }

  /**
   * Applies the luminous seafoam-turquoise armor vertex colors from Sign-Flow.
   */
  applyTurquoiseColors(avatar) {
    const seafoamPrimary = new THREE.Color('#8DC1C2');
    const armorTitanium = new THREE.Color('#D8E0EB');
    const darkContour = new THREE.Color('#1E293B');
    const jointCharcoal = new THREE.Color('#0F172A');

    avatar.traverse((child) => {
      if (!child.isMesh) return;
      const positions = child.geometry?.attributes.position;
      if (!positions) return;

      if (child.name === 'Alpha_Surface') {
        const colors = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          const z = positions.getZ(i);
          let color = armorTitanium;

          if (y > 1.52 && z > 0.02) {
            // Front Visor
            color = seafoamPrimary;
          } else if (y > 0.95 && y < 1.45 && Math.abs(x) < 0.18) {
            // Chest / Core
            color = (z > 0.04) ? seafoamPrimary : darkContour;
          } else if (y < 1.05 && Math.abs(x) > 0.35) {
            // Forearms & Hands: bright seafoam highlight for maximum gesture readability
            color = seafoamPrimary;
          }

          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }

        child.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        child.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.38,
          metalness: 0.18,
        });
      }

      if (child.name === 'Alpha_Joints') {
        const colors = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
          colors[i * 3] = jointCharcoal.r;
          colors[i * 3 + 1] = jointCharcoal.g;
          colors[i * 3 + 2] = jointCharcoal.b;
        }
        child.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        child.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.65,
          metalness: 0.05,
        });
      }
    });
  }

  /**
   * Enqueue a structured sequence of tokens.
   * tokens: Array of { word, sign_id, type } or string tokens
   */
  setTokens(tokens) {
    if (!this.isReady) return;
    this.stop();
    this.resetAvatar();

    const normalizedTokens = tokens.map((t) => (typeof t === 'string' ? { word: t.toUpperCase() } : t));
    this.activeTokens = normalizedTokens;
    this.tokenAnimationMap = [];
    this.currentSignIndex = 0;
    this.lastReportedTokenIndex = -1;

    for (let index = 0; index < normalizedTokens.length; index++) {
      const item = normalizedTokens[index];
      const word = item.word.toUpperCase();
      const isFingerspell = item.type === 'fingerspell';
      const signAnim = !isFingerspell && wordAnimations[word];
      const frames = [];

      if (signAnim) {
        const tempRuntime = { animations: [], characters: [], pending: true };
        signAnim(tempRuntime);
        for (const frame of tempRuntime.animations) {
          const tagged = [...frame];
          tagged._meta = {
            tokenIndex: index,
            token: word,
            isFingerspelling: false,
          };
          frames.push(tagged);
        }
      } else {
        // A-Z Fingerspelling fallback
        for (const letter of word) {
          const letterAnim = alphabetAnimations[letter];
          if (letterAnim) {
            const tempRuntime = { animations: [], characters: [], pending: true };
            letterAnim(tempRuntime);
            for (const frame of tempRuntime.animations) {
              const tagged = [...frame];
              tagged._meta = {
                tokenIndex: index,
                token: word,
                isFingerspelling: true,
                letter,
              };
              frames.push(tagged);
            }
          }
        }
      }

      this.tokenAnimationMap.push({
        tokenIndex: index,
        item,
        frames,
      });
    }

    this._loadSignQueueFromIndex(0);
  }

  _loadSignQueueFromIndex(startIndex) {
    this.runtime.animations = [];
    for (let i = startIndex; i < this.tokenAnimationMap.length; i++) {
      const group = this.tokenAnimationMap[i];
      for (const frame of group.frames) {
        // Deep clone frame so it can be re-run
        const clonedFrame = frame.map((ins) => [...ins]);
        clonedFrame._meta = frame._meta;
        this.runtime.animations.push(clonedFrame);
      }
    }
  }

  play() {
    if (!this.isReady) return;
    if (this.runtime.animations.length === 0 && this.tokenAnimationMap.length > 0) {
      this._loadSignQueueFromIndex(0);
    }
    this.isPaused = false;
    this.onStateChange('signing');
  }

  pause() {
    this.isPaused = true;
    this.onStateChange('paused');
  }

  togglePlayPause() {
    if (this.isPaused || this.runtime.animations.length === 0) {
      this.play();
    } else {
      this.pause();
    }
  }

  replay() {
    if (!this.isReady || this.tokenAnimationMap.length === 0) return;
    this.resetAvatar();
    this.currentSignIndex = 0;
    this.lastReportedTokenIndex = -1;
    this._loadSignQueueFromIndex(0);
    this.play();
  }

  replaySingleSign(index) {
    if (!this.isReady || index < 0 || index >= this.tokenAnimationMap.length) return;
    this.resetAvatar();
    this.runtime.animations = [];
    const group = this.tokenAnimationMap[index];
    for (const frame of group.frames) {
      const cloned = frame.map((ins) => [...ins]);
      cloned._meta = frame._meta;
      this.runtime.animations.push(cloned);
    }
    this.currentSignIndex = index;
    this.lastReportedTokenIndex = -1;
    this.isPaused = false;
    this.onStateChange('signing');
  }

  stepNext() {
    const nextIdx = this.currentSignIndex + 1;
    if (nextIdx < this.tokenAnimationMap.length) {
      this.replaySingleSign(nextIdx);
    }
  }

  stepPrevious() {
    const prevIdx = Math.max(0, this.currentSignIndex - 1);
    this.replaySingleSign(prevIdx);
  }

  stop() {
    this.runtime.animations = [];
    this.lastReportedTokenIndex = -1;
    this.isPaused = false;
    this.resetAvatar();
    this.onStateChange('ready');
    this.onProgress({
      currentSignIndex: -1,
      currentToken: '',
      totalTokens: this.activeTokens.length,
      isFingerspelling: false,
    });
  }

  setSpeed(speedVal) {
    this.speed = Math.max(0.2, Math.min(3.0, Number(speedVal) || 1.0));
  }

  setPracticeMode(enabled) {
    this.practiceMode = !!enabled;
  }

  _startRenderLoop() {
    const animate = (now) => {
      this.animationFrameId = requestAnimationFrame(animate);

      // Dynamically sync renderer and camera aspect with container size
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width > 0 && height > 0) {
        const canvas = this.renderer.domElement;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const targetWidth = Math.floor(width * pixelRatio);
        const targetHeight = Math.floor(height * pixelRatio);
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height, false);
        }
      }

      if (this.isPaused) {
        this.renderer.render(this.scene, this.camera);
        return;
      }

      const queue = this.runtime.animations;
      if (this.runtime.avatar && queue.length > 0 && now >= this.nextFrameAt) {
        this.wasSigning = true;
        const frame = queue[0];

        // Notify UI about progress
        if (frame._meta && frame._meta.tokenIndex !== this.lastReportedTokenIndex) {
          this.lastReportedTokenIndex = frame._meta.tokenIndex;
          this.currentSignIndex = frame._meta.tokenIndex;
          this.onProgress({
            currentSignIndex: frame._meta.tokenIndex,
            currentToken: frame._meta.token,
            totalTokens: this.activeTokens.length,
            isFingerspelling: frame._meta.isFingerspelling,
            letter: frame._meta.letter,
          });
        }

        // Apply bone rotations
        for (let idx = 0; idx < frame.length; ) {
          const [boneName, , axis, target, direction] = frame[idx];
          const bone = this.getBone(boneName);
          if (!bone) {
            frame.splice(idx, 1);
            continue;
          }

          const ud = bone.userData;
          const delta = ud.delta || (ud.delta = { x: 0, y: 0, z: 0 });
          const val = delta[axis];
          const step = 0.05 * this.speed;
          const inProgress = direction === '+' ? val < target : val > target;

          if (inProgress) {
            delta[axis] = direction === '+' ? Math.min(val + step, target) : Math.max(val - step, target);
            const deltaQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(delta.x, delta.y, delta.z));
            const gestureRest = ud.gestureRestQuaternion || ud.restQuaternion;
            bone.quaternion.copy(gestureRest ? gestureRest.clone().multiply(deltaQuat) : deltaQuat);
            idx++;
          } else {
            frame.splice(idx, 1);
          }
        }

        if (frame.length === 0) {
          const finishedFrame = queue.shift();
          const nextFrame = queue[0];
          const finishedTokenIdx = finishedFrame?._meta?.tokenIndex;
          const nextTokenIdx = nextFrame?._meta?.tokenIndex;

          const isFingerspell = finishedFrame?._meta?.isFingerspelling ?? false;
          const baseHold = isFingerspell ? 130 : 160;
          this.nextFrameAt = now + baseHold / this.speed;

          // If learner Practice Mode is on and we just finished a sign token:
          // pause avatar and wait for learner imitation
          if (this.practiceMode && nextFrame && finishedTokenIdx !== undefined && nextTokenIdx !== undefined && finishedTokenIdx !== nextTokenIdx) {
            this.pause();
            this.onStateChange('practice_pause');
          }
        }
      }

      if (this.wasSigning && queue.length === 0) {
        this.wasSigning = false;
        this.lastReportedTokenIndex = -1;
        this.onStateChange('completed');
        this.onProgress({
          currentSignIndex: -1,
          currentToken: '',
          totalTokens: this.activeTokens.length,
          isFingerspelling: false,
        });
      }

      this.renderer.render(this.scene, this.camera);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
