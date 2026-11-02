/**
 * Scalable ASL Lexicon & NLP Resolution Service
 * ==============================================
 * Handles:
 * 1. Fast indexed loading of ASL Lexicon (data/lexicon/index.json)
 * 2. Left-to-right longest-match smart resolution (Phrases -> Exact -> Lemmas -> Synonyms -> Compounds -> Numbers -> Fingerspell)
 * 3. Lazy fetching and caching in Memory + IndexedDB
 * 4. Preloading sentence signs ahead of playback
 * 5. Landmark-to-Bone solver mapping 21 wrist-relative 3D landmarks to Mixamo humanoid bone deltas.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.LexiconService = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const DB_NAME = 'asl_lexicon_cache';
    const DB_VERSION = 1;
    const STORE_NAME = 'signs';

    class LexiconService {
        constructor() {
            this.index = [];
            this.signMap = new Map(); // id -> index entry
            this.phraseMap = new Map(); // normalized multi-word phrase -> index entry
            this.glossMap = new Map(); // single word gloss / upper word -> index entry
            this.lemmas = new Map(); // word -> base lemma
            this.synonyms = new Map(); // word -> array of synonyms
            this.compounds = new Map(); // word -> array of sub-signs
            this.memoryCache = new Map(); // signId -> full sign JSON
            this.db = null;
            this.isInitialized = false;

            // Missing words log for analytics & expansion
            this.missingWordsMap = new Map();
            this.loadMissingWordsFromStorage();
        }

        async init(basePath = 'data/lexicon/') {
            if (this.isInitialized) return;

            // Normalize base path trailing slash
            if (!basePath.endsWith('/')) basePath += '/';
            this.basePath = basePath;

            // Open IndexedDB
            await this.initIndexedDB();

            // Load index, lemmas, synonyms, compounds concurrently
            try {
                const [indexRes, lemmasRes, synsRes, compsRes] = await Promise.all([
                    fetch(this.basePath + 'index.json').then(r => r.json()),
                    fetch(this.basePath + 'lemmas.json').then(r => r.json()).catch(() => ({ lemmas: {} })),
                    fetch(this.basePath + 'synonyms.json').then(r => r.json()).catch(() => ({ synonyms: {} })),
                    fetch(this.basePath + 'compounds.json').then(r => r.json()).catch(() => ({ compounds: {} }))
                ]);

                this.index = indexRes.signs || [];

                // Populate lemmas
                const rawLemmas = lemmasRes.lemmas || {};
                for (const [k, v] of Object.entries(rawLemmas)) {
                    this.lemmas.set(k.toLowerCase(), v.toLowerCase());
                }

                // Populate synonyms
                const rawSyns = synsRes.synonyms || {};
                for (const [k, v] of Object.entries(rawSyns)) {
                    const list = Array.isArray(v) ? v.map(s => s.toLowerCase()) : [String(v).toLowerCase()];
                    this.synonyms.set(k.toLowerCase(), list);
                }

                // Populate compounds
                const rawComps = compsRes.compounds || {};
                for (const [k, v] of Object.entries(rawComps)) {
                    const list = Array.isArray(v) ? v.map(c => c.toLowerCase()) : [String(v).toLowerCase()];
                    this.compounds.set(k.toLowerCase(), list);
                }

                this.buildLookups();

                this.isInitialized = true;
                console.log(`[LexiconService] Initialized with ${this.index.length} signs.`);
            } catch (err) {
                console.error('[LexiconService] Initialization failed:', err);
                throw err;
            }
        }

        buildLookups() {
            this.signMap.clear();
            this.phraseMap.clear();
            this.glossMap.clear();

            for (const sign of this.index) {
                this.signMap.set(sign.id, sign);

                // Register all primary glosses
                const glosses = sign.glosses || [sign.id];
                for (const g of glosses) {
                    const norm = this.normalizeWord(g);
                    if (norm.includes(' ')) {
                        this.phraseMap.set(norm, sign);
                    } else {
                        if (!this.glossMap.has(norm)) {
                            this.glossMap.set(norm, sign);
                        }
                    }
                }

                // Also map the sign ID directly
                const idNorm = this.normalizeWord(sign.id);
                if (!this.glossMap.has(idNorm)) {
                    this.glossMap.set(idNorm, sign);
                }

                // Register entry synonyms into synonym map (NOT into glossMap)
                if (sign.synonyms && Array.isArray(sign.synonyms)) {
                    for (const s of sign.synonyms) {
                        const norm = this.normalizeWord(s);
                        if (!this.synonyms.has(norm)) {
                            this.synonyms.set(norm, [sign.id]);
                        } else {
                            const list = this.synonyms.get(norm);
                            if (!list.includes(sign.id)) list.push(sign.id);
                        }
                    }
                }
            }
        }

        normalizeWord(w) {
            return String(w || '')
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .trim();
        }

        hasSign(word) {
            if (!word) return false;
            const norm = this.normalizeWord(word);
            return this.glossMap.has(norm) || this.signMap.has(norm) || this.synonyms.has(norm) || this.lemmas.has(norm) || this.compounds.has(norm);
        }

        // =====================================================================
        // IndexedDB Offline Cache
        // =====================================================================

        initIndexedDB() {
            return new Promise((resolve) => {
                if (typeof indexedDB === 'undefined') {
                    resolve(null);
                    return;
                }
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    }
                };
                req.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };
                req.onerror = () => {
                    console.warn('[LexiconService] IndexedDB unavailable, using memory cache only.');
                    resolve(null);
                };
            });
        }

        async getCachedSign(id) {
            if (this.memoryCache.has(id)) {
                return this.memoryCache.get(id);
            }
            if (!this.db) return null;

            return new Promise((resolve) => {
                try {
                    const tx = this.db.transaction(STORE_NAME, 'readonly');
                    const store = tx.objectStore(STORE_NAME);
                    const req = store.get(id);
                    req.onsuccess = () => {
                        if (req.result) {
                            this.memoryCache.set(id, req.result);
                            resolve(req.result);
                        } else {
                            resolve(null);
                        }
                    };
                    req.onerror = () => resolve(null);
                } catch {
                    resolve(null);
                }
            });
        }

        async putCachedSign(id, data) {
            this.memoryCache.set(id, data);
            if (!this.db) return;

            return new Promise((resolve) => {
                try {
                    const tx = this.db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    store.put({ id, ...data });
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => resolve();
                } catch {
                    resolve();
                }
            });
        }

        async fetchSignData(signId) {
            const cached = await this.getCachedSign(signId);
            if (cached) return cached;

            const entry = this.signMap.get(signId);
            const fileRel = entry ? entry.file : `signs/${signId}.json`;
            const url = this.basePath + fileRel;

            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                await this.putCachedSign(signId, data);
                return data;
            } catch (err) {
                console.warn(`[LexiconService] Could not fetch sign '${signId}':`, err);
                return null;
            }
        }

        /**
         * Preload all signs needed for a resolved sentence in parallel.
         */
        async preloadSentence(units) {
            const uniqueSignIds = [...new Set(units.map(u => u.signId).filter(Boolean))];
            const loadPromises = uniqueSignIds.map(id => this.fetchSignData(id));
            const results = await Promise.all(loadPromises);
            
            // Attach preloaded data to units
            const dataMap = new Map();
            uniqueSignIds.forEach((id, idx) => {
                if (results[idx]) dataMap.set(id, results[idx]);
            });

            for (const unit of units) {
                if (unit.signId && dataMap.has(unit.signId)) {
                    unit.signData = dataMap.get(unit.signId);
                }
            }
            return units;
        }

        // =====================================================================
        // Step 4: NLP Smart Resolution (Left-to-Right Longest-Match-First)
        // =====================================================================

        resolveSentence(rawText, options = {}) {
            const {
                onlyExact = false,
                simplifyASL = true,
                reorderGloss = false
            } = options;

            if (!rawText || typeof rawText !== 'string') return [];

            // Tokenize words while preserving basic sentence structure
            let cleaned = rawText.toLowerCase();

            // Punctuation & Contraction normalization
            const contractions = {
                "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is",
                "it's": "it is", "we're": "we are", "they're": "they are",
                "i've": "i have", "you've": "you have", "we've": "we have",
                "can't": "can not", "cannot": "can not", "don't": "do not",
                "doesn't": "does not", "didn't": "did not", "won't": "will not",
                "what's": "what is", "where's": "where is", "who's": "who is",
                "how's": "how is", "let's": "let us"
            };

            for (const [c, exp] of Object.entries(contractions)) {
                cleaned = cleaned.replace(new RegExp(`\\b${c}\\b`, 'gi'), exp);
            }

            // Split into tokens
            const rawTokens = cleaned
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(Boolean);

            if (rawTokens.length === 0) return [];

            const units = [];
            let i = 0;

            while (i < rawTokens.length) {
                let matched = false;

                // Priority 1: Multi-word phrase match (longest-match first, down to 4 words)
                if (!onlyExact) {
                    for (let len = Math.min(4, rawTokens.length - i); len >= 2; len--) {
                        const candidate = rawTokens.slice(i, i + len).join(' ');
                        const sign = this.phraseMap.get(candidate);
                        if (sign) {
                            units.push({
                                text: candidate,
                                unit: sign.id.toUpperCase(),
                                signId: sign.id,
                                matchedBy: 'phrase',
                                confidence: 1.0,
                                source: sign.source || 'Lexicon'
                            });
                            i += len;
                            matched = true;
                            break;
                        }
                    }
                }
                if (matched) continue;

                const word = rawTokens[i];

                // Priority 2: Exact gloss match
                if (!/^\d+$/.test(word)) {
                    const exactSign = this.glossMap.get(word) || this.signMap.get(word);
                    if (exactSign) {
                        units.push({
                            text: word,
                            unit: exactSign.id.toUpperCase(),
                            signId: exactSign.id,
                            matchedBy: 'exact',
                            confidence: 1.0,
                            source: exactSign.source || 'Lexicon'
                        });
                        i++;
                        continue;
                    }
                }

                // If user selected "Only exact matches", skip higher-level NLP
                if (onlyExact) {
                    this.recordMissingWord(word);
                    units.push({
                        text: word,
                        unit: word.toUpperCase(),
                        signId: null,
                        matchedBy: 'fingerspell',
                        confidence: 0.5,
                        source: 'Fingerspell Fallback'
                    });
                    i++;
                    continue;
                }

                // Priorities 3, 4, 5: NLP Expansion for words (skip purely numeric strings)
                if (!/^\d+$/.test(word)) {
                    // Priority 3: Lemma match (WordNet base form & irregular inflections)
                    const baseLemma = this.lemmas.get(word);
                    if (baseLemma) {
                        const lemmaSign = this.glossMap.get(baseLemma) || this.signMap.get(baseLemma);
                        if (lemmaSign) {
                            units.push({
                                text: word,
                                unit: lemmaSign.id.toUpperCase(),
                                signId: lemmaSign.id,
                                matchedBy: 'lemma',
                                confidence: 0.95,
                                source: lemmaSign.source || 'Lexicon',
                                lemma: baseLemma
                            });
                            i++;
                            continue;
                        }
                    }

                    // Priority 4: Synonym match
                    const synList = this.synonyms.get(word);
                    if (synList && synList.length > 0) {
                        let synSign = null;
                        for (const s of synList) {
                            synSign = this.glossMap.get(s) || this.signMap.get(s);
                            if (synSign) break;
                        }
                        if (synSign) {
                            units.push({
                                text: word,
                                unit: synSign.id.toUpperCase(),
                                signId: synSign.id,
                                matchedBy: 'synonym',
                                confidence: 0.85,
                                source: synSign.source || 'Lexicon'
                            });
                            i++;
                            continue;
                        }
                    }

                    // Priority 5: Composed / Derivation Hints (e.g. teacher -> teach + person)
                    const compoundParts = this.compounds.get(word);
                    if (compoundParts && compoundParts.length > 0) {
                        const partSigns = compoundParts.map(p => this.glossMap.get(p) || this.signMap.get(p));
                        if (partSigns.every(Boolean)) {
                            for (let pIdx = 0; pIdx < partSigns.length; pIdx++) {
                                const pSign = partSigns[pIdx];
                                units.push({
                                    text: pIdx === 0 ? word : `+${compoundParts[pIdx]}`,
                                    unit: pSign.id.toUpperCase(),
                                    signId: pSign.id,
                                    matchedBy: 'composed',
                                    confidence: 0.80,
                                    source: pSign.source || 'Lexicon'
                                });
                            }
                            i++;
                            continue;
                        }
                    }
                }

                // Priority 6: Number / digits translation
                if (/^\d+$/.test(word)) {
                    // Check if whole number sign exists (e.g., "5" -> five)
                    const numSign = this.glossMap.get(word) || this.signMap.get(`num_${word}`);
                    if (numSign) {
                        units.push({
                            text: word,
                            unit: numSign.id.toUpperCase(),
                            signId: numSign.id,
                            matchedBy: 'number',
                            confidence: 1.0,
                            source: numSign.source || 'Lexicon'
                        });
                    } else {
                        // Fingerspell/sign each digit individually
                        for (const digit of word) {
                            const dSign = this.glossMap.get(digit) || this.signMap.get(`num_${digit}`);
                            if (dSign) {
                                units.push({
                                    text: digit,
                                    unit: dSign.id.toUpperCase(),
                                    signId: dSign.id,
                                    matchedBy: 'number',
                                    confidence: 1.0,
                                    source: dSign.source || 'Lexicon'
                                });
                            } else {
                                units.push({
                                    text: digit,
                                    unit: digit,
                                    signId: null,
                                    matchedBy: 'fingerspell',
                                    confidence: 0.5,
                                    source: 'Fingerspell Fallback'
                                });
                            }
                        }
                    }
                    i++;
                    continue;
                }

                // Priority 7: Fingerspelled fallback with word pause
                this.recordMissingWord(word);
                units.push({
                    text: word,
                    unit: word.toUpperCase(),
                    signId: null,
                    matchedBy: 'fingerspell',
                    confidence: 0.5,
                    source: 'Fingerspell Fallback'
                });
                i++;
            }

            return units;
        }

        // =====================================================================
        // Missing Words Analytics & Logging
        // =====================================================================

        recordMissingWord(word) {
            const w = word.toLowerCase();
            const curr = this.missingWordsMap.get(w) || 0;
            this.missingWordsMap.set(w, curr + 1);
            this.saveMissingWordsToStorage();
        }

        loadMissingWordsFromStorage() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const saved = localStorage.getItem('asl_missing_words_log');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        for (const [k, v] of Object.entries(parsed)) {
                            this.missingWordsMap.set(k, v);
                        }
                    }
                }
            } catch (e) {
                console.warn('[LexiconService] Error loading missing words:', e);
            }
        }

        saveMissingWordsToStorage() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const obj = Object.fromEntries(this.missingWordsMap);
                    localStorage.setItem('asl_missing_words_log', JSON.stringify(obj));
                }
            } catch (e) {
                console.warn('[LexiconService] Error saving missing words:', e);
            }
        }

        getMissingWordsSummary() {
            const entries = Array.from(this.missingWordsMap.entries())
                .map(([word, count]) => ({ word, count }))
                .sort((a, b) => b.count - a.count);
            return {
                totalUnique: entries.length,
                totalOccurrences: entries.reduce((acc, curr) => acc + curr.count, 0),
                list: entries
            };
        }

        exportMissingWordsJSON() {
            const summary = this.getMissingWordsSummary();
            const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `asl_missing_words_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        clearMissingWords() {
            this.missingWordsMap.clear();
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('asl_missing_words_log');
            }
        }

        // =====================================================================
        // Landmark to Bone Translation Solver
        // =====================================================================

        /**
         * Translates a sign's landmark frames into bone rotation frames for the Mixamo rig.
         * Hand landmarks:
         * 0: Wrist
         * 1-4: Thumb (CMC, MCP, IP, Tip)
         * 5-8: Index (MCP, PIP, DIP, Tip)
         * 9-12: Middle (MCP, PIP, DIP, Tip)
         * 13-16: Ring (MCP, PIP, DIP, Tip)
         * 17-20: Pinky (MCP, PIP, DIP, Tip)
         */
        convertLandmarksToBoneFrames(signData) {
            if (!signData || !signData.frames || signData.frames.length === 0) {
                return [];
            }

            const queueFrames = [];

            for (const fr of signData.frames) {
                const boneDeltas = [];

                if (fr.right && fr.right.length === 21) {
                    const r = fr.right;

                    // Compute finger curls by measuring tip to MCP distance relative to extended distance
                    const fingerCurl = (tipIdx, mcpIdx, baseSpan = 0.12) => {
                        const tip = r[tipIdx];
                        const mcp = r[mcpIdx];
                        const dx = tip[0] - mcp[0];
                        const dy = tip[1] - mcp[1];
                        const dz = tip[2] - mcp[2];
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        // Smaller distance = higher curl
                        return Math.max(0.0, Math.min(1.5, (baseSpan - dist) * 12.0));
                    };

                    const indexCurl = fingerCurl(8, 5);
                    const middleCurl = fingerCurl(12, 9);
                    const ringCurl = fingerCurl(16, 13);
                    const pinkyCurl = fingerCurl(20, 17);

                    // Right hand finger bones
                    boneDeltas.push(["mixamorigRightHandIndex1", "rotation", "z", indexCurl * 0.7, indexCurl > 0.1 ? "+" : "-"]);
                    boneDeltas.push(["mixamorigRightHandMiddle1", "rotation", "z", middleCurl * 0.7, middleCurl > 0.1 ? "+" : "-"]);
                    boneDeltas.push(["mixamorigRightHandRing1", "rotation", "z", ringCurl * 0.7, ringCurl > 0.1 ? "+" : "-"]);
                    boneDeltas.push(["mixamorigRightHandPinky1", "rotation", "z", pinkyCurl * 0.7, pinkyCurl > 0.1 ? "+" : "-"]);

                    // Thumb curl
                    const thumbTip = r[4];
                    const thumbMCP = r[2];
                    const thumbDist = Math.sqrt((thumbTip[0]-thumbMCP[0])**2 + (thumbTip[1]-thumbMCP[1])**2);
                    const thumbCurl = Math.max(0.0, Math.min(1.2, (0.08 - thumbDist) * 14.0));
                    boneDeltas.push(["mixamorigRightHandThumb1", "rotation", "y", thumbCurl * 0.6, "+"]);

                    // Arm / Hand placement from wrist orientation
                    const wrist = r[0];
                    boneDeltas.push(["mixamorigRightArm", "rotation", "x", -0.45, "-"]);
                    boneDeltas.push(["mixamorigRightArm", "rotation", "z", 0.65, "+"]);
                    boneDeltas.push(["mixamorigRightForeArm", "rotation", "y", 1.85, "+"]);
                }

                if (fr.left && fr.left.length === 21) {
                    const l = fr.left;
                    const fingerCurlL = (tipIdx, mcpIdx, baseSpan = 0.12) => {
                        const tip = l[tipIdx];
                        const mcp = l[mcpIdx];
                        const dx = tip[0] - mcp[0];
                        const dy = tip[1] - mcp[1];
                        const dz = tip[2] - mcp[2];
                        return Math.max(0.0, Math.min(1.5, (baseSpan - Math.sqrt(dx*dx + dy*dy + dz*dz)) * 12.0));
                    };

                    const idxCurl = fingerCurlL(8, 5);
                    const midCurl = fingerCurlL(12, 9);
                    const rngCurl = fingerCurlL(16, 13);
                    const pnkCurl = fingerCurlL(20, 17);

                    boneDeltas.push(["mixamorigLeftHandIndex1", "rotation", "z", -idxCurl * 0.7, idxCurl > 0.1 ? "-" : "+"]);
                    boneDeltas.push(["mixamorigLeftHandMiddle1", "rotation", "z", -midCurl * 0.7, midCurl > 0.1 ? "-" : "+"]);
                    boneDeltas.push(["mixamorigLeftHandRing1", "rotation", "z", -rngCurl * 0.7, rngCurl > 0.1 ? "-" : "+"]);
                    boneDeltas.push(["mixamorigLeftHandPinky1", "rotation", "z", -pnkCurl * 0.7, pnkCurl > 0.1 ? "-" : "+"]);

                    boneDeltas.push(["mixamorigLeftArm", "rotation", "x", -0.45, "-"]);
                    boneDeltas.push(["mixamorigLeftArm", "rotation", "z", -0.65, "-"]);
                    boneDeltas.push(["mixamorigLeftForeArm", "rotation", "y", -1.85, "-"]);
                }

                if (boneDeltas.length > 0) {
                    queueFrames.push(boneDeltas);
                }
            }

            return queueFrames;
        }
    }

    return LexiconService;
}));
