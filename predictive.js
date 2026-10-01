/**
 * Smart Predictive Text & Autocomplete Engine
 * Real-time Trie-based word completion & N-gram next-word prediction for ASL Interpreting.
 * Operates 100% offline with zero network latency.
 */

(function () {
    'use strict';

    // --- Data Structures ---

    class TrieNode {
        constructor() {
            this.children = Object.create(null);
            this.isEnd = false;
            this.freq = 0;
            this.word = '';
        }
    }

    class WordTrie {
        constructor() {
            this.root = new TrieNode();
            this.wordCount = 0;
        }

        insert(rawWord, freq) {
            if (!rawWord || typeof rawWord !== 'string') return;
            const word = rawWord.trim().toLowerCase();
            if (word.length < 1) return;

            let node = this.root;
            for (let i = 0; i < word.length; i++) {
                const char = word[i];
                if (!node.children[char]) {
                    node.children[char] = new TrieNode();
                }
                node = node.children[char];
            }
            node.isEnd = true;
            node.freq = Math.max(node.freq, Number(freq) || 10);
            node.word = word;
            this.wordCount++;
        }

        search(rawPrefix, maxResults = 5) {
            if (!rawPrefix || typeof rawPrefix !== 'string') return [];
            const prefix = rawPrefix.trim().toLowerCase();
            if (prefix.length === 0) return [];

            let node = this.root;
            for (let i = 0; i < prefix.length; i++) {
                const char = prefix[i];
                if (!node.children[char]) {
                    return [];
                }
                node = node.children[char];
            }

            const results = [];
            this._collectWords(node, results);

            // Apply personalized user boost and sort by score descending
            const boostedResults = results.map(item => ({
                word: item.word.toUpperCase(),
                score: PredictiveEngine.scoreWithBoost(item.word, item.freq),
                type: 'completion',
                prefix: rawPrefix.toUpperCase()
            }));

            boostedResults.sort((a, b) => b.score - a.score);

            // Filter out exact duplicate if the prefix matches the whole word and we have other suggestions
            const filtered = boostedResults.filter((item, idx) => {
                if (boostedResults.length > 1 && item.word === rawPrefix.toUpperCase()) {
                    return false;
                }
                return true;
            });

            return filtered.slice(0, maxResults);
        }

        _collectWords(node, outList) {
            if (node.isEnd) {
                outList.push({ word: node.word, freq: node.freq });
            }
            const keys = Object.keys(node.children);
            for (let i = 0; i < keys.length; i++) {
                this._collectWords(node.children[keys[i]], outList);
            }
        }
    }

    class NgramPredictor {
        constructor(bigramData = {}) {
            this.bigrams = bigramData;
        }

        setBigrams(data) {
            this.bigrams = data || {};
        }

        predict(lastWord, maxResults = 5) {
            if (!lastWord || typeof lastWord !== 'string') return [];
            const key = lastWord.trim().toUpperCase();
            const candidates = this.bigrams[key];
            if (!Array.isArray(candidates) || candidates.length === 0) return [];

            const formatted = candidates.map(([nextWord, score]) => ({
                word: String(nextWord).toUpperCase(),
                score: PredictiveEngine.scoreWithBoost(nextWord, score),
                type: 'nextword',
                context: key
            }));

            formatted.sort((a, b) => b.score - a.score);
            return formatted.slice(0, maxResults);
        }
    }

    // --- Embedded Fallback (used if offline file:// CORS prevents JSON fetch) ---
    const FALLBACK_WORDS = [
        ["you", 100], ["the", 99], ["to", 99], ["it", 99], ["and", 99], ["that", 98],
        ["hello", 95], ["yes", 95], ["help", 95], ["how", 95], ["are", 95], ["what", 95],
        ["please", 95], ["thank", 95], ["thanks", 95], ["sorry", 95], ["good", 95],
        ["name", 95], ["sign", 95], ["language", 95], ["time", 95], ["where", 95],
        ["when", 95], ["why", 95], ["who", 95], ["can", 95], ["want", 95], ["need", 95],
        ["like", 95], ["love", 95], ["friend", 95], ["family", 95], ["water", 95],
        ["food", 95], ["work", 95], ["home", 95], ["fine", 95], ["okay", 95],
        ["morning", 92], ["afternoon", 90], ["evening", 90], ["night", 90],
        ["welcome", 90], ["repeat", 90], ["understand", 90], ["learn", 90],
        ["practice", 90], ["again", 90], ["later", 88], ["today", 88], ["tomorrow", 85],
        ["great", 85], ["happy", 85], ["ready", 85], ["nice", 85], ["meet", 85],
        ["come", 82], ["stop", 82], ["wait", 82], ["minute", 82], ["moment", 80],
        ["have", 85], ["will", 85], ["with", 82], ["this", 84], ["there", 80]
    ];

    const FALLBACK_BIGRAMS = {
        "HOW": [["ARE", 98], ["DO", 88], ["IS", 82], ["CAN", 78], ["MUCH", 75], ["MANY", 70]],
        "ARE": [["YOU", 99], ["WE", 80], ["THEY", 75], ["THERE", 70]],
        "YOU": [["ARE", 95], ["CAN", 88], ["HAVE", 85], ["WANT", 82], ["NEED", 80], ["KNOW", 78]],
        "I": [["AM", 98], ["WANT", 90], ["NEED", 88], ["HAVE", 85], ["LIKE", 84], ["LOVE", 82]],
        "AM": [["FINE", 90], ["GOOD", 88], ["READY", 85], ["HERE", 80], ["TIRED", 75], ["SORRY", 75]],
        "WHAT": [["IS", 95], ["ARE", 88], ["DO", 85], ["TIME", 68]],
        "WHERE": [["IS", 95], ["ARE", 88], ["DO", 78], ["CAN", 75]],
        "WHEN": [["WILL", 90], ["IS", 85], ["ARE", 80]],
        "WHY": [["ARE", 90], ["DID", 85], ["DO", 80], ["IS", 75]],
        "CAN": [["YOU", 98], ["I", 95], ["WE", 85], ["HELP", 70]],
        "COULD": [["YOU", 98], ["I", 92]],
        "WOULD": [["YOU", 98], ["LIKE", 90]],
        "THANK": [["YOU", 99]],
        "THANKS": [["FOR", 95], ["A", 85], ["AGAIN", 80]],
        "GOOD": [["MORNING", 95], ["AFTERNOON", 90], ["EVENING", 88], ["NIGHT", 86], ["JOB", 82]],
        "NICE": [["TO", 98], ["MEETING", 90], ["DAY", 80]],
        "TO": [["MEET", 95], ["SEE", 90], ["GO", 85], ["DO", 82], ["HELP", 80]],
        "SEE": [["YOU", 98], ["LATER", 70]],
        "PLEASE": [["HELP", 95], ["REPEAT", 90], ["SIGN", 88], ["WAIT", 82]],
        "MY": [["NAME", 98], ["FRIEND", 85], ["FAMILY", 80]],
        "DO": [["YOU", 98], ["NOT", 88]],
        "IT": [["IS", 98], ["WAS", 90], ["WORKS", 75]],
        "THAT": [["IS", 98], ["WAS", 90]],
        "THIS": [["IS", 98], ["ONE", 80]],
        "SIGN": [["LANGUAGE", 99], ["AGAIN", 85]]
    };

    // --- Main Predictive Engine Class ---

    class PredictiveEngine {
        constructor() {
            this.trie = new WordTrie();
            this.ngram = new NgramPredictor(FALLBACK_BIGRAMS);
            this.currentSuggestions = [];
            this.isLoaded = false;
            this.isDismissed = false;
            this.dropdownEl = null;
            this.audioCtx = null;
            this.userBoosts = this._loadUserBoosts();

            // Populate fallback initially so engine is instantly usable
            for (let i = 0; i < FALLBACK_WORDS.length; i++) {
                this.trie.insert(FALLBACK_WORDS[i][0], FALLBACK_WORDS[i][1]);
            }
        }

        static scoreWithBoost(rawWord, baseScore) {
            if (!rawWord) return baseScore || 0;
            const word = String(rawWord).toUpperCase();
            try {
                const boosts = JSON.parse(localStorage.getItem('asl_word_boosts') || '{}');
                const boostCount = boosts[word] || 0;
                return (Number(baseScore) || 0) + (boostCount * 12);
            } catch (e) {
                return Number(baseScore) || 0;
            }
        }

        static boostWord(rawWord) {
            if (!rawWord) return;
            const word = String(rawWord).toUpperCase();
            try {
                const boosts = JSON.parse(localStorage.getItem('asl_word_boosts') || '{}');
                boosts[word] = (boosts[word] || 0) + 1;
                localStorage.setItem('asl_word_boosts', JSON.stringify(boosts));
            } catch (e) {
                console.warn('[PredictiveEngine] Unable to save boost:', e);
            }
        }

        _loadUserBoosts() {
            try {
                return JSON.parse(localStorage.getItem('asl_word_boosts') || '{}');
            } catch (e) {
                return {};
            }
        }

        async init() {
            this.dropdownEl = document.getElementById('autocomplete-dropdown');
            this._setupKeyboardListeners();

            // Load rich JSON data files asynchronously
            try {
                const [corpusResp, bigramResp] = await Promise.allSettled([
                    fetch('assets/data/word_corpus.json').then(r => r.json()),
                    fetch('assets/data/bigrams.json').then(r => r.json())
                ]);

                if (corpusResp.status === 'fulfilled' && Array.isArray(corpusResp.value)) {
                    console.log(`[PredictiveEngine] Loading ${corpusResp.value.length} words into Trie...`);
                    const words = corpusResp.value;
                    for (let i = 0; i < words.length; i++) {
                        this.trie.insert(words[i].w, words[i].f);
                    }
                    console.log(`[PredictiveEngine] Trie loaded successfully. Total words: ${this.trie.wordCount}`);
                }

                if (bigramResp.status === 'fulfilled' && typeof bigramResp.value === 'object') {
                    console.log(`[PredictiveEngine] Loading bigrams table...`);
                    this.ngram.setBigrams(bigramResp.value);
                    console.log(`[PredictiveEngine] Bigrams loaded successfully.`);
                }

                this.isLoaded = true;
            } catch (err) {
                console.warn('[PredictiveEngine] Failed to load remote JSON corpus (using built-in offline dictionary):', err);
            }
        }

        _setupKeyboardListeners() {
            document.addEventListener('keydown', (e) => {
                // Ignore if user is inside an input or textarea
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                if (!this.hasSuggestions()) return;

                // Number keys 1-5 to accept suggestion
                if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
                    const index = parseInt(e.code.replace('Digit', ''), 10) - 1;
                    if (index >= 0 && index < this.currentSuggestions.length) {
                        e.preventDefault();
                        this.acceptSuggestion(index);
                    }
                } else if (e.code === 'Tab') {
                    // Tab accepts the top (first) suggestion
                    e.preventDefault();
                    this.acceptSuggestion(0);
                } else if (e.code === 'Escape') {
                    // Escape dismisses the suggestions until next typed character
                    e.preventDefault();
                    this.dismiss();
                }
            });
        }

        getAutocompleteContext(sentence) {
            const raw = sentence || '';
            const endsWithSpace = raw.endsWith(' ');
            const trimmed = raw.trimEnd();

            if (trimmed.length === 0) {
                return { lastToken: '', endsWithSpace: false, lastWord: '', isEmpty: true };
            }

            const tokens = trimmed.split(/\s+/);
            const lastWord = tokens[tokens.length - 1] || '';

            if (endsWithSpace) {
                // Next-word mode: context is the last completed word
                return {
                    lastToken: '',
                    endsWithSpace: true,
                    lastWord: lastWord.toUpperCase(),
                    isEmpty: false
                };
            } else {
                // Completion mode: context is the partial token being spelled
                return {
                    lastToken: lastWord.toUpperCase(),
                    endsWithSpace: false,
                    lastWord: tokens.length > 1 ? tokens[tokens.length - 2].toUpperCase() : '',
                    isEmpty: false
                };
            }
        }

        updateSuggestions(sentence) {
            if (!this.dropdownEl) {
                this.dropdownEl = document.getElementById('autocomplete-dropdown');
            }

            if (!sentence || sentence.length === 0) {
                this.clearSuggestions();
                return;
            }

            // Reset dismissed state on new character
            this.isDismissed = false;

            const ctx = this.getAutocompleteContext(sentence);

            let suggestions = [];

            if (ctx.endsWithSpace) {
                // Predict next word based on last completed word
                if (ctx.lastWord) {
                    suggestions = this.ngram.predict(ctx.lastWord, 5);
                }
            } else {
                // Complete current token if user typed at least 1 character
                if (ctx.lastToken && ctx.lastToken.length >= 1) {
                    // Ignore numeric tokens
                    if (!/^\d+$/.test(ctx.lastToken)) {
                        suggestions = this.trie.search(ctx.lastToken, 5);
                    }
                }
            }

            this.currentSuggestions = suggestions;
            this.renderAutocompleteSuggestions(suggestions, ctx);
        }

        renderAutocompleteSuggestions(suggestions, ctx) {
            if (!this.dropdownEl) return;

            if (this.isDismissed || !suggestions || suggestions.length === 0) {
                this.dropdownEl.style.display = 'none';
                this.dropdownEl.innerHTML = '';
                return;
            }

            this.dropdownEl.innerHTML = '';
            this.dropdownEl.style.display = 'flex';

            // Category badge indicator (Completion vs Next Word)
            const isNextWord = ctx && ctx.endsWithSpace;
            const categoryBadge = document.createElement('div');
            categoryBadge.className = 'autocomplete-indicator';
            categoryBadge.setAttribute('aria-hidden', 'true');
            categoryBadge.innerHTML = isNextWord
                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg><span>Next</span>`
                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span>Complete</span>`;
            this.dropdownEl.appendChild(categoryBadge);

            suggestions.forEach((s, idx) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'autocomplete-chip';
                chip.setAttribute('role', 'option');
                chip.setAttribute('data-word', s.word);
                chip.setAttribute('title', `Accept "${s.word}" (Shortcut: ${idx + 1} or Click)`);

                if (s.type === 'completion' && s.prefix) {
                    const prefix = s.prefix;
                    const suffix = s.word.startsWith(prefix) ? s.word.slice(prefix.length) : s.word;
                    chip.innerHTML = `<span class="chip-match">${prefix}</span><span class="chip-suffix">${suffix}</span>`;
                } else {
                    chip.textContent = s.word;
                }

                // Keyboard shortcut hint
                if (idx < 5) {
                    const kbd = document.createElement('kbd');
                    kbd.textContent = `${idx + 1}`;
                    chip.appendChild(kbd);
                }

                chip.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.acceptSuggestion(idx);
                });

                this.dropdownEl.appendChild(chip);
            });

            // Dismiss close button
            const dismissBtn = document.createElement('button');
            dismissBtn.type = 'button';
            dismissBtn.className = 'autocomplete-dismiss-btn';
            dismissBtn.title = 'Dismiss suggestions (Esc)';
            dismissBtn.setAttribute('aria-label', 'Dismiss suggestions');
            dismissBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            dismissBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismiss();
            });
            this.dropdownEl.appendChild(dismissBtn);
        }

        acceptSuggestion(suggestionIndexOrObject) {
            let suggestion = null;
            if (typeof suggestionIndexOrObject === 'number') {
                suggestion = this.currentSuggestions[suggestionIndexOrObject];
            } else if (typeof suggestionIndexOrObject === 'object') {
                suggestion = suggestionIndexOrObject;
            }

            if (!suggestion || !suggestion.word) return false;

            const current = typeof window.getCurrentSentence === 'function'
                ? window.getCurrentSentence()
                : (window.currentSentence || '');

            let newSentence = '';

            if (suggestion.type === 'completion') {
                const ctx = this.getAutocompleteContext(current);
                const tokenLen = ctx.lastToken ? ctx.lastToken.length : 0;
                const prefixSentence = current.slice(0, current.length - tokenLen);
                newSentence = prefixSentence + suggestion.word + ' ';
            } else {
                // Next word
                if (current.endsWith(' ')) {
                    newSentence = current + suggestion.word + ' ';
                } else {
                    newSentence = current + ' ' + suggestion.word + ' ';
                }
            }

            // Boost word usage in localStorage
            PredictiveEngine.boostWord(suggestion.word);

            // Play tactile audio click feedback
            this._playChime();

            // Update app sentence state
            if (typeof window.setSentence === 'function') {
                window.setSentence(newSentence);
            } else {
                window.currentSentence = newSentence;
                if (typeof window.updateSentenceDisplay === 'function') {
                    window.updateSentenceDisplay();
                }
            }

            // Sync with Two-Way Room interim channel if connected
            if (window.twoWayManager && window.twoWayManager.isConnected) {
                window.twoWayManager.sendInterim(newSentence.trim(), 'signing');
            }

            // Immediately offer next-word predictions for the accepted word
            this.updateSuggestions(newSentence);

            return true;
        }

        tryGestureAccept(gestureName) {
            if (gestureName === 'THUMBS_UP' && this.hasSuggestions()) {
                console.log('[PredictiveEngine] Accepting top suggestion via THUMBS_UP gesture!');
                const accepted = this.acceptSuggestion(0);
                if (accepted) {
                    // Flash dropdown border to green for visual feedback
                    if (this.dropdownEl) {
                        this.dropdownEl.classList.add('gesture-accepted');
                        setTimeout(() => this.dropdownEl.classList.remove('gesture-accepted'), 500);
                    }
                    return true;
                }
            }
            return false;
        }

        hasSuggestions() {
            return !this.isDismissed && this.currentSuggestions && this.currentSuggestions.length > 0;
        }

        dismiss() {
            this.isDismissed = true;
            if (this.dropdownEl) {
                this.dropdownEl.style.display = 'none';
                this.dropdownEl.innerHTML = '';
            }
        }

        clearSuggestions() {
            this.currentSuggestions = [];
            if (this.dropdownEl) {
                this.dropdownEl.style.display = 'none';
                this.dropdownEl.innerHTML = '';
            }
        }

        _playChime() {
            try {
                if (!this.audioCtx) {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    if (AudioContextClass) {
                        this.audioCtx = new AudioContextClass();
                    }
                }
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
                if (!this.audioCtx) return;

                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
                osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.08); // A5

                gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.12);
            } catch (err) {
                // AudioContext not allowed or unsupported
            }
        }
    }

    // Instantiate and expose globally
    window.predictiveEngine = new PredictiveEngine();

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.predictiveEngine.init());
    } else {
        window.predictiveEngine.init();
    }
})();
