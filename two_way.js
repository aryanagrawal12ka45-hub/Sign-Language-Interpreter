/**
 * Sign Language Studio - Rebuilt Two-Way Communication Engine
 * ============================================================
 * Powered by:
 * 1. Shared MediaPipe Hands Pipeline (HandsPipeline) - Zero duplicate tracking code
 * 2. Real-time Live Skeleton Avatar Streaming (wrist-relative, downsampled ~18 FPS, 0 video leak)
 * 3. Neural Classifier + Smart Glove Fusion + DTW Whole-Word Recognition
 * 4. Practice Lab Lexicon & Smart NLP Text-to-Sign Synthesizer for Speaker
 * 5. Robust Hybrid WebRTC Transport (BroadcastChannel + /api/signal LAN relay + PeerJS)
 * 6. Standardized Protocol: { type: "landmarks"|"letter"|"word"|"text"|"signs"|"presence"|"ping", ts, payload }
 */

(function () {
    // -------------------------------------------------------------------------
    // Session State Machine & Transport Manager
    // -------------------------------------------------------------------------
    class TwoWaySessionManager {
        constructor() {
            this.peer = null;
            this.connection = null;
            this.localChannel = null;
            this.broadcastChannelName = null;
            this.pollTimer = null;
            this.pingTimer = null;
            this.lastPingReceived = Date.now();

            this.role = 'signing'; // 'signing' | 'speaking' | 'both'
            this.isHost = false;
            this.roomCode = null;
            this.peerId = 'peer_' + Math.random().toString(36).substring(2, 8);
            this.partnerName = 'Partner';
            this.partnerRole = 'speaking';
            this.isConnected = false;

            this.seenPacketIds = new Set();
            this.lastLandmarkSentTime = 0;
            this.conversationLog = [];

            // Callbacks
            this.callbacks = {
                onStateChange: [],
                onLandmarksReceived: [],
                onLetterReceived: [],
                onWordReceived: [],
                onTextReceived: [],
                onSignsReceived: [],
                onSignReceived: [],
                onSpeechReceived: [],
                onTranscriptUpdated: [],
                onError: []
            };

            this.initURLParams();
        }

        static generateRoomCode() {
            const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
            let code = '';
            for (let i = 0; i < 3; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return `ASL-${code}`;
        }

        static getCanonicalRoomToken(code) {
            if (!code) return '';
            let clean = code.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!clean.startsWith('asl')) clean = 'asl' + clean;
            return clean;
        }

        static normalizeRoomCode(raw) {
            if (!raw) return '';
            const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (!cleaned) return '';
            if (cleaned.startsWith('ASL')) {
                const suffix = cleaned.slice(3);
                return suffix ? `ASL-${suffix}` : 'ASL';
            }
            return `ASL-${cleaned}`;
        }

        initURLParams() {
            const urlParams = new URLSearchParams(window.location.search);
            const roomParam = urlParams.get('room') || urlParams.get('code');
            if (roomParam) {
                this.pendingRoomCode = TwoWaySessionManager.normalizeRoomCode(roomParam);
            }
        }

        // ---------------------------------------------------------------------
        // Session Lifecycle
        // ---------------------------------------------------------------------

        createRoom(customCode = null, role = 'signing') {
            this.disconnect();
            this.role = role;
            this.isHost = true;
            this.roomCode = customCode ? TwoWaySessionManager.normalizeRoomCode(customCode) : TwoWaySessionManager.generateRoomCode();
            this._notifyState('initializing', `Registering room ${this.roomCode}...`);

            this._setupTransports();
            this._startHeartbeat();
            this._notifyState('waiting', `Room ${this.roomCode} ready. Share code with your partner.`);
        }

        joinRoom(roomCode, role = 'speaking') {
            this.disconnect();
            this.role = role;
            this.isHost = false;
            this.roomCode = TwoWaySessionManager.normalizeRoomCode(roomCode);

            if (!this.roomCode) {
                this._notifyError('Please enter a valid room code.');
                return;
            }

            this._notifyState('connecting', `Connecting to room ${this.roomCode}...`);
            this._setupTransports();
            this._startHeartbeat();

            // Broadcast presence join request
            this.send({
                type: 'presence',
                ts: Date.now(),
                payload: {
                    action: 'join',
                    roomCode: this.roomCode,
                    role: this.role,
                    senderId: this.peerId,
                    peerName: 'Guest'
                }
            });
        }

        _setupTransports() {
            const token = TwoWaySessionManager.getCanonicalRoomToken(this.roomCode);

            // 1. Local BroadcastChannel
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    this.broadcastChannelName = `asl_room_${token}`;
                    this.localChannel = new BroadcastChannel(this.broadcastChannelName);
                    this.localChannel.onmessage = (event) => {
                        if (event && event.data) {
                            this._handleIncomingPacket(event.data, 'broadcast');
                        }
                    };
                } catch (e) {
                    console.warn('[TwoWay] BroadcastChannel setup:', e);
                }
            }

            // 2. Local HTTP Relay Poller (/api/signal)
            this._startSignalRelayPolling();

            // 3. WebRTC via PeerJS
            this._initPeerJS();
        }

        _initPeerJS() {
            if (typeof Peer === 'undefined') return;

            const token = TwoWaySessionManager.getCanonicalRoomToken(this.roomCode);
            const myPeerId = this.isHost ? `asl-p2p-${token}-host` : `asl-p2p-${token}-guest-${this.peerId}`;

            try {
                this.peer = new Peer(myPeerId, { debug: 1 });

                this.peer.on('open', (id) => {
                    console.log(`[TwoWay P2P] Registered peer id: ${id}`);
                    if (!this.isHost) {
                        const hostPeerId = `asl-p2p-${token}-host`;
                        const conn = this.peer.connect(hostPeerId, { reliable: true });
                        this._bindConnection(conn);
                    }
                });

                this.peer.on('connection', (conn) => {
                    console.log(`[TwoWay P2P] Incoming connection from: ${conn.peer}`);
                    this._bindConnection(conn);
                });

                this.peer.on('error', (err) => {
                    console.warn('[TwoWay P2P] PeerJS notice:', err);
                });
            } catch (err) {
                console.warn('[TwoWay P2P] PeerJS init failed, using relay/broadcast:', err);
            }
        }

        _bindConnection(conn) {
            this.connection = conn;
            conn.on('open', () => {
                this.isConnected = true;
                this._notifyState('connected', `Connected with ${this.partnerName} (${this.partnerRole})`);
                this.send({
                    type: 'presence',
                    ts: Date.now(),
                    payload: { action: 'handshake', role: this.role, peerId: this.peerId }
                });
            });

            conn.on('data', (data) => {
                this._handleIncomingPacket(data, 'webrtc');
            });

            conn.on('close', () => {
                this.isConnected = false;
                this._notifyState('disconnected', 'WebRTC connection closed.');
            });
        }

        _startSignalRelayPolling() {
            if (typeof fetch === 'undefined') return;
            let lastServerTime = 0;
            const poll = async () => {
                if (!this.roomCode || typeof fetch === 'undefined') return;
                try {
                    const res = await fetch(`/api/signal?room=${encodeURIComponent(this.roomCode)}&peerId=${encodeURIComponent(this.peerId)}&since=${lastServerTime}`);
                    if (res.ok) {
                        const json = await res.json();
                        lastServerTime = json.serverTime || (Date.now() / 1000);
                        if (json.signals && Array.isArray(json.signals)) {
                            for (const sig of json.signals) {
                                if (sig.packet) this._handleIncomingPacket(sig.packet, 'relay');
                            }
                        }
                    }
                } catch {
                    // silent fallback
                }
            };
            this.pollTimer = setInterval(poll, 600);
        }

        _startHeartbeat() {
            if (this.pingTimer) clearInterval(this.pingTimer);
            this.pingTimer = setInterval(() => {
                if (this.isConnected) {
                    this.send({ type: 'ping', ts: Date.now(), payload: {} });
                    if (Date.now() - this.lastPingReceived > 9000) {
                        this._notifyState('reconnecting', 'Connection lagging, attempting reconnect...');
                    }
                }
            }, 3000);
        }

        // ---------------------------------------------------------------------
        // Packet Transmission & Reception
        // ---------------------------------------------------------------------

        send(packet) {
            if (!packet.id) {
                packet.id = 'pkt_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
            }
            if (!packet.ts) packet.ts = Date.now();
            if (!packet.senderId) packet.senderId = this.peerId;
            if (!packet.senderRole) packet.senderRole = this.role === 'signing' ? 'Signer' : (this.role === 'speaking' ? 'Speaker' : 'Both');

            // Send via WebRTC DataChannel if open
            if (this.connection && this.connection.open) {
                try {
                    // Check buffer amount to prevent flooding on slow networks
                    if (packet.type === 'landmarks' && this.connection.dataChannel && this.connection.dataChannel.bufferedAmount > 65536) {
                        return false;
                    }
                    this.connection.send(packet);
                } catch (e) {
                    console.warn('[TwoWay] WebRTC send failed:', e);
                }
            }

            // Send via local BroadcastChannel
            if (this.localChannel) {
                try {
                    this.localChannel.postMessage(packet);
                } catch (e) {
                    // ignore
                }
            }

            // Ephemeral HTTP relay for non-landmark packets or when connection not yet direct
            if (packet.type !== 'landmarks' && this.roomCode && typeof fetch !== 'undefined') {
                fetch('/api/signal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ room: this.roomCode, senderId: this.peerId, packet: packet })
                }).catch(() => {});
            }

            return true;
        }

        _handleIncomingPacket(packet, transport = 'unknown') {
            if (!packet || typeof packet !== 'object') return;
            if (packet.senderId === this.peerId) return; // Ignore own echoes

            // Deduplication
            if (packet.id) {
                if (this.seenPacketIds.has(packet.id)) return;
                this.seenPacketIds.add(packet.id);
                if (this.seenPacketIds.size > 200) {
                    const it = this.seenPacketIds.values();
                    for (let i = 0; i < 50; i++) this.seenPacketIds.delete(it.next().value);
                }
            }

            this.lastPingReceived = Date.now();

            switch (packet.type) {
                case 'ping':
                    this.send({ type: 'pong', ts: Date.now(), payload: {} });
                    break;

                case 'pong':
                    if (!this.isConnected) {
                        this.isConnected = true;
                        this._notifyState('connected', `Connected with ${this.partnerName}`);
                    }
                    break;

                case 'presence':
                    this._handlePresence(packet.payload, packet.senderRole);
                    break;

                case 'landmarks':
                    this.callbacks.onLandmarksReceived.forEach(cb => cb(packet.payload, packet.ts));
                    break;

                case 'letter':
                    this._recordTranscriptEntry({
                        sender: 'partner',
                        role: packet.senderRole || 'Signer',
                        type: 'letter',
                        text: packet.payload.text || packet.payload.char,
                        confidence: packet.payload.confidence,
                        timestamp: packet.ts
                    });
                    this.callbacks.onLetterReceived.forEach(cb => cb(packet.payload));
                    break;

                case 'word':
                    this._recordTranscriptEntry({
                        sender: 'partner',
                        role: packet.senderRole || 'Signer',
                        type: 'word',
                        text: packet.payload.text || packet.payload.word,
                        confidence: packet.payload.confidence,
                        timestamp: packet.ts
                    });
                    this.callbacks.onWordReceived.forEach(cb => cb(packet.payload));
                    break;

                case 'text':
                case 'SPEECH_TRANSCRIBED': {
                    const txt = packet.payload?.transcript || packet.transcript || packet.payload?.text || packet.text;
                    const tokens = packet.payload?.tokens || packet.tokens || this.tokenizeTranscript(txt);
                    this._recordTranscriptEntry({
                        sender: 'partner',
                        role: packet.senderRole || 'Speaker',
                        type: 'text',
                        text: txt,
                        transcript: txt,
                        tokens: tokens,
                        timestamp: packet.ts || Date.now()
                    });
                    const eventData = { transcript: txt, text: txt, tokens: tokens, ...(packet.payload || {}) };
                    this.callbacks.onTextReceived.forEach(cb => cb(eventData));
                    if (this.callbacks.onSpeechReceived) {
                        this.callbacks.onSpeechReceived.forEach(cb => cb(eventData));
                    }
                    break;
                }

                case 'signs':
                case 'SIGN_COMMITTED': {
                    const signText = packet.payload?.sentence || packet.sentence || packet.payload?.text || packet.text;
                    const units = packet.payload?.units || packet.tokens || [];
                    const isQuickPhrase = !!(packet.isQuickPhrase || packet.payload?.isQuickPhrase);
                    this._recordTranscriptEntry({
                        sender: 'partner',
                        role: packet.senderRole || 'Signer',
                        type: 'signs',
                        text: signText,
                        sentence: signText,
                        tokens: units,
                        isQuickPhrase: isQuickPhrase,
                        timestamp: packet.ts || Date.now()
                    });
                    const eventData = { sentence: signText, text: signText, units, isQuickPhrase, ...(packet.payload || {}) };
                    this.callbacks.onSignsReceived.forEach(cb => cb(eventData));
                    if (this.callbacks.onSignReceived) {
                        this.callbacks.onSignReceived.forEach(cb => cb(eventData));
                    }
                    break;
                }

                default:
                    break;
            }
        }

        _handlePresence(payload, senderRole) {
            if (!payload) return;

            if (payload.action === 'join' && this.isHost) {
                this.partnerRole = payload.role || 'speaking';
                this.partnerName = payload.peerName || 'Guest';
                this.isConnected = true;
                this._notifyState('connected', `Connected with Guest (${this.partnerRole})`);
                this.send({
                    type: 'presence',
                    ts: Date.now(),
                    payload: { action: 'accept', role: this.role, peerName: 'Host' }
                });
            } else if (payload.action === 'accept' && !this.isHost) {
                this.partnerRole = payload.role || 'signing';
                this.partnerName = payload.peerName || 'Host';
                this.isConnected = true;
                this._notifyState('connected', `Connected with Host (${this.partnerRole})`);
            } else if (payload.action === 'handshake') {
                this.partnerRole = payload.role || 'speaking';
                this.isConnected = true;
                this._notifyState('connected', `Connected with ${this.partnerName} (${this.partnerRole})`);
            } else if (payload.action === 'leave') {
                this.isConnected = false;
                this._notifyState('partner_left', 'Partner left the room.');
            }
        }

        // ---------------------------------------------------------------------
        // High-Level Communication Methods
        // ---------------------------------------------------------------------

        sendLandmarks(compactHands) {
            const now = performance.now();
            if (now - this.lastLandmarkSentTime < 55) return false;
            this.lastLandmarkSentTime = now;

            return this.send({
                type: 'landmarks',
                ts: Date.now(),
                payload: { hands: compactHands }
            });
        }

        sendLetter(char, confidence = 0.9) {
            this._recordTranscriptEntry({
                sender: 'self',
                role: this.role === 'signing' ? 'Signer' : 'Speaker',
                type: 'letter',
                text: char,
                confidence: confidence,
                timestamp: Date.now()
            });

            return this.send({
                type: 'letter',
                ts: Date.now(),
                payload: { text: char, confidence: confidence }
            });
        }

        sendWord(word, confidence = 0.95) {
            this._recordTranscriptEntry({
                sender: 'self',
                role: this.role === 'signing' ? 'Signer' : 'Speaker',
                type: 'word',
                text: word,
                confidence: confidence,
                timestamp: Date.now()
            });

            return this.send({
                type: 'word',
                ts: Date.now(),
                payload: { text: word, confidence: confidence }
            });
        }

        sendSpeakerText(text, units = []) {
            this._recordTranscriptEntry({
                sender: 'self',
                role: 'Speaker',
                type: 'signs',
                text: text,
                tokens: units,
                timestamp: Date.now()
            });

            return this.send({
                type: 'signs',
                ts: Date.now(),
                payload: { text: text, units: units }
            });
        }

        sendSign(sentence) {
            this._recordTranscriptEntry({
                sender: 'self',
                role: this.role === 'signing' ? 'Signer' : 'Speaker',
                type: 'signs',
                text: sentence,
                sentence: sentence,
                timestamp: Date.now()
            });

            return this.send({
                type: 'SIGN_COMMITTED',
                sentence: sentence,
                text: sentence,
                ts: Date.now(),
                payload: { sentence: sentence, text: sentence }
            });
        }

        sendSpeech(transcript) {
            const tokens = this.tokenizeTranscript(transcript);
            this._recordTranscriptEntry({
                sender: 'self',
                role: 'Speaker',
                type: 'speech',
                text: transcript,
                transcript: transcript,
                tokens: tokens,
                timestamp: Date.now()
            });

            return this.send({
                type: 'SPEECH_TRANSCRIBED',
                transcript: transcript,
                tokens: tokens,
                ts: Date.now(),
                payload: { transcript: transcript, tokens: tokens }
            });
        }

        sendQuickPhrase(phrase) {
            this._recordTranscriptEntry({
                sender: 'self',
                role: this.role === 'signing' ? 'Signer' : 'Speaker',
                type: 'signs',
                text: phrase,
                sentence: phrase,
                isQuickPhrase: true,
                timestamp: Date.now()
            });

            return this.send({
                type: 'SIGN_COMMITTED',
                sentence: phrase,
                text: phrase,
                isQuickPhrase: true,
                ts: Date.now(),
                payload: { sentence: phrase, text: phrase, isQuickPhrase: true }
            });
        }

        tokenizeTranscript(text) {
            if (!text) return [];
            const KNOWN_SIGNS = new Set(['HELLO', 'YES', 'NO', 'THANK YOU', 'PLEASE', 'HELP', 'OK', 'LOVE', 'STOP', 'GOOD', 'BAD']);
            const upper = text.trim().toUpperCase();
            const words = upper.split(/\s+/);
            const tokens = [];

            for (let w = 0; w < words.length; w++) {
                if (w > 0) {
                    tokens.push({ type: 'SPACE', glyph: ' ' });
                }
                const word = words[w].replace(/[^A-Z]/g, '');
                if (!word) continue;

                if (KNOWN_SIGNS.has(word)) {
                    tokens.push({ type: 'SIGN', glyph: word });
                } else {
                    for (const ch of word) {
                        tokens.push({ type: 'CHAR', glyph: ch });
                    }
                }
            }
            return tokens;
        }

        disconnect() {
            if (this.isConnected) {
                this.send({ type: 'presence', ts: Date.now(), payload: { action: 'leave' } });
            }
            this.isConnected = false;
            if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
            if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }

            if (this.connection) {
                try { this.connection.close(); } catch {}
                this.connection = null;
            }
            if (this.peer) {
                try { this.peer.destroy(); } catch {}
                this.peer = null;
            }
            if (this.localChannel) {
                try { this.localChannel.close(); } catch {}
                this.localChannel = null;
            }
            this._notifyState('disconnected', 'Disconnected from room.');
        }

        // ---------------------------------------------------------------------
        // Transcript Logging & Export
        // ---------------------------------------------------------------------

        _recordTranscriptEntry(entry) {
            this.conversationLog.push(entry);
            this.callbacks.onTranscriptUpdated.forEach(cb => cb(entry, this.conversationLog));
        }

        getTranscriptText() {
            if (!this.conversationLog.length) return 'No messages recorded in session.';
            return this.conversationLog.map(m => {
                const time = new Date(m.timestamp).toLocaleTimeString();
                const sender = m.sender === 'self' ? 'You' : this.partnerName;
                const typeTag = m.type ? `[${m.type.toUpperCase()}] ` : '';
                return `[${time}] ${sender} (${m.role}): ${typeTag}${m.text}`;
            }).join('\n');
        }

        downloadTranscript() {
            const text = this.getTranscriptText();
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `two-way-transcript-${this.roomCode || 'session'}-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // ---------------------------------------------------------------------
        // Events
        // ---------------------------------------------------------------------

        on(event, cb) {
            if (this.callbacks[event]) this.callbacks[event].push(cb);
        }

        onStateChange(cb) {
            this.callbacks.onStateChange.push(cb);
            return () => {
                this.callbacks.onStateChange = this.callbacks.onStateChange.filter(c => c !== cb);
            };
        }

        onSignReceived(cb) {
            this.callbacks.onSignReceived.push(cb);
            return () => {
                this.callbacks.onSignReceived = this.callbacks.onSignReceived.filter(c => c !== cb);
            };
        }

        onSpeechReceived(cb) {
            this.callbacks.onSpeechReceived.push(cb);
            return () => {
                this.callbacks.onSpeechReceived = this.callbacks.onSpeechReceived.filter(c => c !== cb);
            };
        }

        _notifyState(state, message) {
            this.callbacks.onStateChange.forEach(cb => cb(state, message));
        }

        _notifyError(err) {
            this.callbacks.onError.forEach(cb => cb(err));
        }
    }

    // -------------------------------------------------------------------------
    // Two-Way UI Orchestration & Shared Pipeline Integration
    // -------------------------------------------------------------------------

    let twoWayManager = null;
    let lexiconService = null;
    let handsPipeline = null;

    function initTwoWayUI() {
        twoWayManager = new TwoWaySessionManager();
        window.twoWayManager = twoWayManager;

        // Obtain shared hands pipeline & lexicon service
        handsPipeline = window.sharedHandsPipeline || (window.sharedHandsPipeline = new HandsPipeline());
        lexiconService = window.sharedLexiconService || (typeof LexiconService !== 'undefined' ? new LexiconService() : null);

        if (lexiconService) {
            lexiconService.init().then(() => {
                if (handsPipeline && lexiconService.index) {
                    handsPipeline.loadLexiconTemplates(lexiconService.index);
                }
            }).catch(() => {});
        }

        // DOM elements
        const modal = document.getElementById('two-way-modal');
        const openBtn = document.getElementById('open-two-way-btn');
        const closeBtn = document.getElementById('two-way-close-btn');

        const rolePills = document.getElementById('two-way-role-pills');
        const signerSection = document.getElementById('two-way-signer-section');
        const speakerSection = document.getElementById('two-way-speaker-section');

        const createRoomBtn = document.getElementById('two-way-create-room-btn');
        const hostIdle = document.getElementById('two-way-host-idle');
        const hostActive = document.getElementById('two-way-host-active');
        const hostCodeDisplay = document.getElementById('two-way-host-code-display');
        const copyCodeBtn = document.getElementById('two-way-copy-code-btn');
        const copyCodeText = document.getElementById('two-way-copy-code-text');
        const copyLinkBtn = document.getElementById('two-way-copy-link-btn');
        const copyLinkText = document.getElementById('two-way-copy-link-text');

        const joinInput = document.getElementById('two-way-join-code-input');
        const joinBtn = document.getElementById('two-way-join-btn');
        const joinFeedback = document.getElementById('two-way-join-feedback');

        const connBanner = document.getElementById('two-way-conn-banner');
        const connStatusText = document.getElementById('two-way-conn-status-text');
        const leaveRoomBtn = document.getElementById('two-way-leave-room-btn');

        const skeletonCanvas = document.getElementById('two-way-skeleton-canvas');
        const skeletonCtx = skeletonCanvas ? skeletonCanvas.getContext('2d') : null;
        const activeTitle = document.getElementById('two-way-active-title');
        const activeDesc = document.getElementById('two-way-active-desc');
        const activeGlyph = document.getElementById('two-way-active-glyph');

        const handIndicator = document.getElementById('two-way-hand-indicator');
        const handDot = document.getElementById('two-way-hand-dot');
        const handText = document.getElementById('two-way-hand-text');
        const framingTip = document.getElementById('two-way-framing-tip');

        const toggleLocalHands = document.getElementById('two-way-toggle-local-hands');
        const toggleWordMode = document.getElementById('two-way-toggle-word-mode');
        const toggleTextOnly = document.getElementById('two-way-toggle-text-only');
        const wordCandidatesBox = document.getElementById('two-way-word-candidates');
        const candidateButtons = document.getElementById('two-way-candidate-buttons');
        const streamTokensBox = document.getElementById('two-way-stream-tokens');

        const transcriptBox = document.getElementById('two-way-chat-transcript');
        const msgCountEl = document.getElementById('two-way-msg-count');
        const emptyStateEl = document.getElementById('transcript-empty-state');
        const copyTranscriptBtn = document.getElementById('two-way-copy-transcript-btn');
        const dlTranscriptBtn = document.getElementById('two-way-download-transcript-btn');

        const textInput = document.getElementById('two-way-text-input');
        const sendTextBtn = document.getElementById('two-way-send-text-btn');
        const micBtn = document.getElementById('two-way-speak-mic-btn');
        const autoSpeakToggle = document.getElementById('two-way-auto-speak-toggle');

        let currentRole = 'signing';
        let lastHandTrackedTime = Date.now();

        // Open/Close Modal
        if (openBtn && modal) {
            openBtn.addEventListener('click', () => {
                modal.classList.add('open');
                applyRoleVisibility(currentRole);
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('open');
            });
        }

        // Role Selection
        function applyRoleVisibility(role) {
            currentRole = role;
            twoWayManager.role = role;
            if (signerSection) {
                signerSection.style.display = (role === 'signing' || role === 'both') ? 'block' : 'none';
            }
            if (speakerSection) {
                speakerSection.style.display = (role === 'speaking' || role === 'both') ? 'block' : 'none';
            }
        }

        if (rolePills) {
            rolePills.addEventListener('click', (e) => {
                const btn = e.target.closest('.two-way-role-btn');
                if (btn) {
                    rolePills.querySelectorAll('.two-way-role-btn').forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-checked', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-checked', 'true');
                    applyRoleVisibility(btn.getAttribute('data-role') || 'signing');
                }
            });
        }

        // Create Room
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                twoWayManager.createRoom(null, currentRole);
                if (hostIdle && hostActive) {
                    hostIdle.style.display = 'none';
                    hostActive.style.display = 'block';
                }
                if (hostCodeDisplay) hostCodeDisplay.textContent = twoWayManager.roomCode;
            });
        }

        // Copy Code / Link
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => {
                if (twoWayManager.roomCode && navigator.clipboard) {
                    navigator.clipboard.writeText(twoWayManager.roomCode).then(() => {
                        if (copyCodeText) copyCodeText.textContent = 'Copied!';
                        setTimeout(() => { if (copyCodeText) copyCodeText.textContent = 'Copy Code'; }, 1800);
                    });
                }
            });
        }

        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                if (twoWayManager.roomCode && navigator.clipboard) {
                    const link = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(twoWayManager.roomCode)}`;
                    navigator.clipboard.writeText(link).then(() => {
                        if (copyLinkText) copyLinkText.textContent = 'Link Copied!';
                        setTimeout(() => { if (copyLinkText) copyLinkText.textContent = 'Copy Link'; }, 1800);
                    });
                }
            });
        }

        // Join Room
        if (joinBtn && joinInput) {
            joinBtn.addEventListener('click', () => {
                const code = joinInput.value.trim();
                if (!code) {
                    showJoinFeedback('error', 'Please enter a 3-character room code.');
                    return;
                }
                twoWayManager.joinRoom(code, currentRole);
            });
        }

        function showJoinFeedback(type, msg) {
            if (!joinFeedback) return;
            if (!msg) { joinFeedback.style.display = 'none'; return; }
            joinFeedback.style.display = 'block';
            joinFeedback.textContent = msg;
            joinFeedback.style.color = type === 'error' ? '#f43f5e' : '#10b981';
        }

        // Leave Room
        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', () => {
                twoWayManager.disconnect();
                if (hostIdle && hostActive) {
                    hostIdle.style.display = 'block';
                    hostActive.style.display = 'none';
                }
                if (connBanner) connBanner.style.display = 'none';
            });
        }

        // State Change Listener
        twoWayManager.on('onStateChange', (state, msg) => {
            console.log(`[TwoWay UI] State: ${state} - ${msg}`);
            if (connBanner && connStatusText) {
                connBanner.style.display = 'flex';
                connStatusText.textContent = msg;
            }
            if (state === 'connected') {
                showJoinFeedback('success', 'Connected successfully!');
            } else if (state === 'disconnected') {
                showJoinFeedback(null, null);
            }
        });

        twoWayManager.on('onError', (err) => {
            showJoinFeedback('error', err);
        });

        // =====================================================================
        // Step 2: Signer Side - MediaPipe Shared Pipeline Integration
        // =====================================================================

        if (handsPipeline) {
            // 1. Landmarks Streaming & Local Avatar
            handsPipeline.on('landmarks', (data) => {
                const isSignerActive = (currentRole === 'signing' || currentRole === 'both') && modal && modal.classList.contains('open');
                const hasHands = data.hands && data.hands.length > 0;

                if (hasHands) {
                    lastHandTrackedTime = Date.now();
                    if (handDot) handDot.style.background = '#10b981';
                    if (handText) handText.textContent = `Hand tracked (${data.hands.length === 1 ? '1 hand' : '2 hands'})`;
                    if (framingTip) framingTip.style.display = 'none';

                    // Local skeleton preview if enabled and signer active
                    if (isSignerActive && toggleLocalHands && toggleLocalHands.checked && skeletonCtx) {
                        renderSkeletonOnCanvas(skeletonCtx, data.hands[0].normalized);
                    }

                    // Stream to partner (downsampled ~18 FPS, wrist-relative, rounded 3 decimals)
                    if (twoWayManager.isConnected && (!toggleTextOnly || !toggleTextOnly.checked)) {
                        const compact = data.hands.map(h => ({
                            h: h.handedness,
                            lms: h.normalized
                        }));
                        twoWayManager.sendLandmarks(compact);
                    }
                } else {
                    if (handDot) handDot.style.background = '#64748b';
                    if (handText) handText.textContent = 'Waiting for hand in camera...';

                    // Framing tip if lost for >3.5s
                    if (Date.now() - lastHandTrackedTime > 3500 && isSignerActive) {
                        if (framingTip) framingTip.style.display = 'flex';
                    }
                }
            });

            // 2. Recognition Prediction Lock-in (Letters & Words)
            handsPipeline.on('prediction', (pred) => {
                const isSignerActive = (currentRole === 'signing' || currentRole === 'both') && modal && modal.classList.contains('open');
                if (!isSignerActive || !pred.isLockedIn || pred.label === '-') return;

                const isWord = pred.type === 'SIGN' || pred.type === 'GLOVE' || pred.label.length > 1;

                if (twoWayManager.isConnected) {
                    if (isWord) {
                        twoWayManager.sendWord(pred.label, pred.confidence);
                    } else {
                        twoWayManager.sendLetter(pred.label, pred.confidence);
                    }
                }

                // Render token badge locally in outgoing container
                appendStreamToken(pred.label, isWord ? 'word' : 'letter');
            });

            // 3. Word Mode (DTW Candidate Confirmation)
            handsPipeline.on('wordCandidate', (cand) => {
                if (!toggleWordMode || !toggleWordMode.checked || !wordCandidatesBox || !candidateButtons) return;
                wordCandidatesBox.style.display = 'block';
                candidateButtons.innerHTML = '';

                cand.all.forEach(c => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'btn secondary xs';
                    btn.style.cssText = 'font-family: var(--font-mono); font-size: 0.72rem; color: #10b981; border-color: rgba(16, 185, 129, 0.4);';
                    btn.textContent = `${c.gloss} (${Math.round(c.confidence * 100)}%)`;
                    btn.addEventListener('click', () => {
                        twoWayManager.sendWord(c.gloss, c.confidence);
                        appendStreamToken(c.gloss, 'word');
                        wordCandidatesBox.style.display = 'none';
                    });
                    candidateButtons.appendChild(btn);
                });
            });
        }

        // Word Mode Toggle Handler
        if (toggleWordMode) {
            toggleWordMode.addEventListener('change', (e) => {
                if (handsPipeline) {
                    handsPipeline.recognitionMode = e.target.checked ? 'word' : 'alphabet';
                }
                if (wordCandidatesBox) wordCandidatesBox.style.display = 'none';
            });
        }

        function appendStreamToken(text, type) {
            if (!streamTokensBox) return;
            const span = document.createElement('span');
            span.style.cssText = `
                padding: 2px 7px;
                border-radius: 4px;
                font-family: var(--font-mono);
                font-size: 0.7rem;
                font-weight: 700;
                background: ${type === 'word' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)'};
                color: ${type === 'word' ? '#10b981' : '#38bdf8'};
                border: 1px solid ${type === 'word' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(56, 189, 248, 0.35)'};
            `;
            span.textContent = type === 'word' ? `[Word: ${text}]` : text;
            streamTokensBox.appendChild(span);

            const preview = document.getElementById('two-way-outgoing-preview');
            if (preview) preview.scrollTop = preview.scrollHeight;
        }

        // =====================================================================
        // Step 3: Speaker Side - Receiving Skeleton & Synthesizing Text-to-Sign
        // =====================================================================

        // 1. Live Hand Skeleton Avatar (Incoming from Signer)
        twoWayManager.on('onLandmarksReceived', (payload) => {
            if (!skeletonCtx || !payload || !payload.hands || payload.hands.length === 0) return;
            const primary = payload.hands[0];
            renderSkeletonOnCanvas(skeletonCtx, primary.lms);
        });

        function renderSkeletonOnCanvas(ctx, normalizedLandmarks) {
            if (!ctx || !normalizedLandmarks) return;
            const w = ctx.canvas.width;
            const h = ctx.canvas.height;

            ctx.clearRect(0, 0, w, h);

            // Subtle dark background grid
            ctx.fillStyle = '#070d18';
            ctx.fillRect(0, 0, w, h);

            // Centering offset: wrist-relative coordinates are normalized around (0,0)
            ctx.save();
            ctx.translate(w / 2, h / 2 + 30);
            ctx.scale(w * 0.7, -h * 0.7);

            HandsPipeline.drawHandSkeleton(ctx, normalizedLandmarks, {
                color: '#10b981',
                jointColor: '#ffffff',
                lineWidth: 0.02,
                radius: 0.025,
                width: 1,
                height: 1
            });

            ctx.restore();
        }

        // 2. Incoming Letters & Words from Signer
        twoWayManager.on('onLetterReceived', (payload) => {
            if (activeTitle) activeTitle.innerHTML = `<span style="color:#38bdf8;">[Letter] ${payload.text}</span>`;
            if (activeGlyph) activeGlyph.textContent = payload.text;
        });

        twoWayManager.on('onWordReceived', (payload) => {
            if (activeTitle) activeTitle.innerHTML = `<span style="color:#10b981;">[Word] ${payload.text}</span>`;
            if (activeGlyph) activeGlyph.textContent = payload.text;
            maybeAutoSpeak(payload.text);
        });

        // 3. Speaker Outgoing Text / Speech Synthesis
        if (sendTextBtn && textInput) {
            sendTextBtn.addEventListener('click', () => {
                const text = textInput.value.trim();
                if (!text) return;

                let units = [];
                if (lexiconService) {
                    units = lexiconService.resolveSentence(text);
                }
                twoWayManager.sendSpeakerText(text, units);
                textInput.value = '';

                // Play signs on local canvas too
                playSynthesizedSigns(units, text);
            });

            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') sendTextBtn.click();
            });
        }

        // Voice Dictation (Speech-to-Text)
        if (micBtn) {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                const rec = new SpeechRec();
                rec.continuous = false;
                rec.interimResults = false;
                rec.lang = 'en-US';

                rec.onresult = (e) => {
                    const transcript = e.results[0][0].transcript;
                    if (textInput) textInput.value = transcript;
                    if (sendTextBtn) sendTextBtn.click();
                    micBtn.classList.remove('active');
                };

                rec.onerror = () => micBtn.classList.remove('active');
                rec.onend = () => micBtn.classList.remove('active');

                micBtn.addEventListener('click', () => {
                    micBtn.classList.add('active');
                    try { rec.start(); } catch {}
                });
            }
        }

        // Quick Phrases
        document.querySelectorAll('.quick-phrase-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const phrase = chip.getAttribute('data-phrase');
                if (phrase) {
                    let units = [];
                    if (lexiconService) units = lexiconService.resolveSentence(phrase);
                    twoWayManager.sendSpeakerText(phrase, units);
                    playSynthesizedSigns(units, phrase);
                }
            });
        });

        // Replay Synthesized Signs
        function playSynthesizedSigns(units, label) {
            if (activeTitle) activeTitle.textContent = `Signing: "${label}"`;
            if (activeDesc) activeDesc.textContent = `${units.length} sign tokens synthesized via lexicon.`;

            const timeline = document.getElementById('two-way-active-timeline');
            if (timeline) {
                timeline.innerHTML = '';
                units.forEach(u => {
                    const span = document.createElement('span');
                    span.className = 'sign-sequence-token';
                    span.style.cssText = 'padding:3px 8px; border-radius:4px; font-family:var(--font-mono); font-size:0.7rem; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3);';
                    span.textContent = u.unit || u.text;
                    timeline.appendChild(span);
                });
            }
        }

        twoWayManager.on('onSignsReceived', (payload) => {
            playSynthesizedSigns(payload.units || [], payload.text);
            maybeAutoSpeak(payload.text);
        });

        function maybeAutoSpeak(text) {
            if (autoSpeakToggle && !autoSpeakToggle.checked) return;
            if ('speechSynthesis' in window && text) {
                const utterance = new SpeechSynthesisUtterance(text);
                window.speechSynthesis.speak(utterance);
            }
        }

        // =====================================================================
        // Step 5: Live Transcript UI
        // =====================================================================

        twoWayManager.on('onTranscriptUpdated', (entry, fullLog) => {
            if (emptyStateEl) emptyStateEl.style.display = 'none';
            if (msgCountEl) msgCountEl.textContent = `${fullLog.length} ${fullLog.length === 1 ? 'message' : 'messages'}`;

            if (transcriptBox) {
                const row = document.createElement('div');
                const isSelf = entry.sender === 'self';
                row.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: ${isSelf ? 'flex-end' : 'flex-start'};
                    margin-bottom: 8px;
                `;

                const timeStr = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const typeColor = entry.type === 'word' ? '#10b981' : (entry.type === 'letter' ? '#38bdf8' : '#e2e8f0');

                row.innerHTML = `
                    <div style="font-size: 0.65rem; color: var(--text-tertiary); margin-bottom: 2px;">
                        <span>${isSelf ? 'You' : twoWayManager.partnerName} (${entry.role})</span> &bull; <span>${timeStr}</span>
                    </div>
                    <div style="
                        padding: 7px 12px;
                        border-radius: 8px;
                        font-size: 0.82rem;
                        background: ${isSelf ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.05)'};
                        border: 1px solid ${isSelf ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
                        color: ${typeColor};
                    ">
                        ${entry.type === 'word' ? `<strong>[Word]</strong> ${entry.text}` : (entry.type === 'letter' ? `<strong>[Letter]</strong> ${entry.text}` : entry.text)}
                    </div>
                `;
                transcriptBox.appendChild(row);
                transcriptBox.scrollTop = transcriptBox.scrollHeight;
            }
        });

        if (copyTranscriptBtn) {
            copyTranscriptBtn.addEventListener('click', () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(twoWayManager.getTranscriptText()).then(() => {
                        const orig = copyTranscriptBtn.textContent;
                        copyTranscriptBtn.textContent = 'Copied!';
                        setTimeout(() => copyTranscriptBtn.textContent = orig, 1800);
                    });
                }
            });
        }

        if (dlTranscriptBtn) {
            dlTranscriptBtn.addEventListener('click', () => {
                twoWayManager.downloadTranscript();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTwoWayUI);
    } else {
        initTwoWayUI();
    }
})();
