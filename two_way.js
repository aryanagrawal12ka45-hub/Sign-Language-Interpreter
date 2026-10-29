/**
 * ASL Interpreter — Two-Way Communication Engine (Universal Tri-Transport Architecture)
 * Enables real-time Speech-to-Sign & Sign-to-Speech communication between two users.
 * 
 * Transport Layers:
 *   1. BroadcastChannel: Instant, zero-latency local tab & window pairing (same machine / browser)
 *   2. Local WebSocket Bridge: Real-time LAN / Wi-Fi signaling and streaming (ws://127.0.0.1:8765)
 *   3. WebRTC DataChannel & MediaStream: Peer-to-peer data and video channels
 *   4. PeerJS Cloud Relay: Public internet P2P broker fallback
 */

class TwoWaySessionManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.mediaCall = null;
        this.localStream = null;
        this.remoteStream = null;

        // Transport Layers
        this.bc = null;               // BroadcastChannel for instant local tab pairing
        this.ws = null;               // WebSocket bridge client
        this.wsReconnectTimer = null;
        this.pc = null;               // RTCPeerConnection for WebRTC
        this.dataChannel = null;      // WebRTC RTCDataChannel
        this.pendingIceCandidates = [];
        this.processedPacketIds = new Set();

        this.role = 'both';           // 'signing' | 'speaking' | 'both'
        this.isHost = false;
        this.roomCode = null;
        this.partnerName = 'Partner';
        this.partnerRole = 'both';
        this.isConnected = false;
        this.pendingRoomCode = null;
        this.joinTimeout = null;

        // Callbacks
        this.callbacks = {
            onStateChange: [],
            onSpeechReceived: [],
            onSignReceived: [],
            onInterimReceived: [],
            onRemoteStream: [],
            onError: []
        };

        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ];

        this.initURLParams();
        this.initBridgeWebSocket();
    }

    // Generate unique, human-friendly 4-character room code (e.g. ASL-7K2P)
    static generateRoomCode() {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `ASL-${code}`;
    }

    // Normalize any user input (e.g., "7k2p", "asl-7k2p", "asl7k2p", "7K2P") into "ASL-7K2P"
    static sanitizeRoomCode(raw) {
        if (!raw) return '';
        let str = String(raw).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (str.startsWith('ASL')) {
            str = str.substring(3);
        }
        return str ? `ASL-${str}` : '';
    }

    initURLParams() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const roomParam = urlParams.get('room') || urlParams.get('code');
            if (roomParam) {
                this.pendingRoomCode = TwoWaySessionManager.sanitizeRoomCode(roomParam);
            }
        } catch (e) {
            console.warn('[TwoWay] Could not parse URL params:', e);
        }
    }

    // =========================================================================
    // 1. BROADCASTCHANNEL ENGINE (Zero-Latency Local Multi-Tab / Window Pairing)
    // =========================================================================

    _initBroadcastChannel(roomCode) {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            if (this.bc) {
                try { this.bc.close(); } catch (e) {}
                this.bc = null;
            }
            const clean = TwoWaySessionManager.sanitizeRoomCode(roomCode).toLowerCase().replace(/[^a-z0-9]/g, '');
            const chanName = `asl_room_${clean}`;
            this.bc = new BroadcastChannel(chanName);

            this.bc.onmessage = (event) => {
                const data = event.data;
                if (!data || typeof data !== 'object') return;

                // Tab discovery handshake
                if (data.type === 'BC_PING') {
                    if (this.isHost && this.roomCode === data.roomCode) {
                        console.log('[TwoWay BC] Host received join request from guest tab');
                        this.partnerRole = data.role || 'both';
                        this.partnerName = data.peerName || 'Guest';
                        this.isConnected = true;

                        // Send acceptance back to guest tab
                        this.bc.postMessage({
                            type: 'BC_PONG',
                            roomCode: this.roomCode,
                            role: this.role,
                            peerName: 'Host',
                            timestamp: Date.now()
                        });

                        this._initWebRTC(false);
                        this._notifyState('connected', `Connected with ${this.partnerName} in room ${this.roomCode}`);
                    }
                } else if (data.type === 'BC_PONG') {
                    if (!this.isHost && this.roomCode === data.roomCode) {
                        console.log('[TwoWay BC] Guest received acceptance from host tab');
                        if (this.joinTimeout) {
                            clearTimeout(this.joinTimeout);
                            this.joinTimeout = null;
                        }
                        this.partnerRole = data.role || 'both';
                        this.partnerName = data.peerName || 'Host';
                        this.isConnected = true;

                        this._initWebRTC(true);
                        this._notifyState('connected', `Connected with ${this.partnerName} in room ${this.roomCode}`);
                    }
                } else if (data.type === 'BC_LEAVE') {
                    if (data.roomCode === this.roomCode) {
                        console.log('[TwoWay BC] Partner tab left room.');
                        this.isConnected = false;
                        this._notifyState('partner_left', 'Partner left the room.');
                    }
                } else if (data.type === 'WEBRTC_SIGNAL') {
                    if (data.roomCode === this.roomCode && data.signal) {
                        this._handleWebRTCSignal(data.signal);
                    }
                } else {
                    this._handleIncomingPacket(data);
                }
            };
        } catch (e) {
            console.warn('[TwoWay BC] BroadcastChannel unavailable:', e);
        }
    }

    // =========================================================================
    // 2. LOCAL WEBSOCKET BRIDGE (Localhost & LAN Wi-Fi Pairing on port 8765)
    // =========================================================================

    initBridgeWebSocket() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const host = window.location.hostname || '127.0.0.1';
        const port = 8765;
        const wsUrl = `ws://${host}:${port}`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[TwoWay Bridge] Connected to WebSocket bridge broker at', wsUrl);
                if (this.wsReconnectTimer) {
                    clearInterval(this.wsReconnectTimer);
                    this.wsReconnectTimer = null;
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._handleBridgeMessage(data);
                } catch (e) {
                    console.warn('[TwoWay Bridge] Malformed message from bridge:', e);
                }
            };

            this.ws.onerror = () => {
                // Silently fallback if bridge server isn't running
            };

            this.ws.onclose = () => {
                if (!this.wsReconnectTimer) {
                    this.wsReconnectTimer = setInterval(() => this.initBridgeWebSocket(), 5000);
                }
            };
        } catch (err) {
            console.warn('[TwoWay Bridge] WebSocket initialization error:', err);
        }
    }

    _handleBridgeMessage(data) {
        if (!data || !data.type) return;

        switch (data.type) {
            case 'room_created':
                if (this.isHost && data.roomCode === this.roomCode) {
                    console.log(`[TwoWay Bridge] Room ${this.roomCode} registered on bridge.`);
                }
                break;

            case 'room_joined':
                if (!this.isHost && data.roomCode === this.roomCode) {
                    console.log(`[TwoWay Bridge] Joined room ${this.roomCode}`);
                    if (this.joinTimeout) {
                        clearTimeout(this.joinTimeout);
                        this.joinTimeout = null;
                    }
                    this.partnerRole = data.partnerRole || 'both';
                    this.partnerName = data.peerName || 'Host';
                    this.isConnected = true;

                    this._initWebRTC(true);
                    this._notifyState('connected', `Connected with ${this.partnerName} in room ${this.roomCode}`);

                    this.send({
                        type: 'HANDSHAKE',
                        roomCode: this.roomCode,
                        role: this.role,
                        peerName: 'Guest',
                        timestamp: Date.now()
                    });
                }
                break;

            case 'room_partner_joined':
                if (this.isHost && data.roomCode === this.roomCode) {
                    console.log(`[TwoWay Bridge] Partner joined room ${this.roomCode}`);
                    this.partnerRole = data.partnerRole || 'both';
                    this.partnerName = data.peerName || 'Guest';
                    this.isConnected = true;

                    this._initWebRTC(false);
                    this._notifyState('connected', `Connected with ${this.partnerName} in room ${this.roomCode}`);

                    this.send({
                        type: 'HANDSHAKE',
                        roomCode: this.roomCode,
                        role: this.role,
                        peerName: 'Host',
                        timestamp: Date.now()
                    });
                }
                break;

            case 'room_message':
                if (data.roomCode === this.roomCode && data.payload) {
                    const payload = data.payload;
                    if (payload.type === 'WEBRTC_SIGNAL') {
                        this._handleWebRTCSignal(payload.signal);
                    } else {
                        this._handleIncomingPacket(payload);
                    }
                }
                break;

            case 'room_partner_left':
                if (data.roomCode === this.roomCode) {
                    console.log('[TwoWay Bridge] Partner left room.');
                    this.isConnected = false;
                    this._notifyState('partner_left', 'Partner left the room.');
                }
                break;

            case 'room_error':
                console.warn('[TwoWay Bridge] Room error:', data.message);
                if (!this.isConnected) {
                    this._notifyError(data.message || 'Room error occurred.');
                }
                break;
        }
    }

    // =========================================================================
    // 3. NATIVE WEBRTC ENGINE (DataChannel + Video Streaming)
    // =========================================================================

    _initWebRTC(isInitiator) {
        try {
            if (this.pc) {
                try { this.pc.close(); } catch (e) {}
                this.pc = null;
            }

            this.pc = new RTCPeerConnection({ iceServers: this.iceServers });

            this.pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this._sendWebRTCSignal({
                        type: 'candidate',
                        candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
                    });
                }
            };

            this.pc.ontrack = (event) => {
                console.log('[TwoWay WebRTC] Received remote media stream track:', event.track.kind);
                if (event.streams && event.streams[0]) {
                    this.remoteStream = event.streams[0];
                    this._notifyRemoteStream(this.remoteStream);
                }
            };

            if (isInitiator) {
                this.dataChannel = this.pc.createDataChannel('asl_p2p_channel', { ordered: true });
                this._setupDataChannel(this.dataChannel);

                this.pc.createOffer().then((offer) => {
                    return this.pc.setLocalDescription(offer);
                }).then(() => {
                    this._sendWebRTCSignal({
                        type: 'offer',
                        sdp: this.pc.localDescription.toJSON ? this.pc.localDescription.toJSON() : { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp }
                    });
                }).catch((err) => {
                    console.warn('[TwoWay WebRTC] Offer error:', err);
                });
            } else {
                this.pc.ondatachannel = (event) => {
                    console.log('[TwoWay WebRTC] Incoming DataChannel connected');
                    this.dataChannel = event.channel;
                    this._setupDataChannel(this.dataChannel);
                };
            }
        } catch (e) {
            console.error('[TwoWay WebRTC] Error initializing RTCPeerConnection:', e);
        }
    }

    _flushPendingIce() {
        if (!this.pc) return;
        while (this.pendingIceCandidates.length > 0) {
            const c = this.pendingIceCandidates.shift();
            try {
                this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            } catch (e) {}
        }
    }

    _sendWebRTCSignal(signal) {
        const payload = {
            type: 'WEBRTC_SIGNAL',
            roomCode: this.roomCode,
            signal: signal
        };

        if (this.bc && this.roomCode) {
            try {
                this.bc.postMessage(payload);
            } catch (e) {}
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.roomCode) {
            try {
                this.ws.send(JSON.stringify({
                    type: 'room_message',
                    roomCode: this.roomCode,
                    payload: payload
                }));
            } catch (e) {}
        }
    }

    _handleWebRTCSignal(signal) {
        if (!signal || !this.pc) return;

        if (signal.type === 'offer') {
            const desc = signal.sdp ? new RTCSessionDescription(signal.sdp) : new RTCSessionDescription(signal);
            this.pc.setRemoteDescription(desc).then(() => {
                this._flushPendingIce();
                return this.pc.createAnswer();
            }).then((answer) => {
                return this.pc.setLocalDescription(answer);
            }).then(() => {
                this._sendWebRTCSignal({
                    type: 'answer',
                    sdp: this.pc.localDescription.toJSON ? this.pc.localDescription.toJSON() : { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp }
                });
            }).catch(console.warn);
        } else if (signal.type === 'answer') {
            const desc = signal.sdp ? new RTCSessionDescription(signal.sdp) : new RTCSessionDescription(signal);
            this.pc.setRemoteDescription(desc).then(() => {
                this._flushPendingIce();
            }).catch(console.warn);
        } else if (signal.type === 'candidate' && signal.candidate) {
            if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
                this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
            } else {
                this.pendingIceCandidates.push(signal.candidate);
            }
        }
    }

    _setupDataChannel(dc) {
        dc.onopen = () => {
            console.log('[TwoWay WebRTC] Native DataChannel OPEN & READY');
        };

        dc.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this._handleIncomingPacket(data);
            } catch (e) {
                console.warn('[TwoWay WebRTC] DataChannel payload error:', e);
            }
        };

        dc.onclose = () => {
            console.log('[TwoWay WebRTC] DataChannel closed.');
        };

        dc.onerror = (err) => {
            console.warn('[TwoWay WebRTC] DataChannel error:', err);
        };
    }

    // =========================================================================
    // 4. PEERJS CLOUD P2P (Public Internet Relay Fallback)
    // =========================================================================

    _buildHostPeerId(code) {
        const clean = TwoWaySessionManager.sanitizeRoomCode(code).toLowerCase().replace(/[^a-z0-9]/g, '');
        return `asl-p2p-${clean}-host`;
    }

    _buildGuestPeerId(code) {
        const clean = TwoWaySessionManager.sanitizeRoomCode(code).toLowerCase().replace(/[^a-z0-9]/g, '');
        const rand = Math.random().toString(36).substring(2, 6);
        return `asl-p2p-${clean}-guest-${rand}`;
    }

    _initializePeer(peerId, isHosting) {
        if (typeof Peer === 'undefined') {
            console.log('[TwoWay PeerJS] PeerJS library not loaded, relying on BroadcastChannel/Bridge.');
            return;
        }

        try {
            if (this.peer) {
                try { this.peer.destroy(); } catch (e) {}
                this.peer = null;
            }

            this.peer = new Peer(peerId, {
                debug: 1,
                config: { iceServers: this.iceServers }
            });

            this.peer.on('open', (id) => {
                console.log(`[TwoWay PeerJS] Peer registered: ${id}`);
                if (!isHosting && !this.isConnected) {
                    const hostId = this._buildHostPeerId(this.roomCode);
                    console.log(`[TwoWay PeerJS] Guest connecting to host ID: ${hostId}`);
                    const conn = this.peer.connect(hostId, {
                        reliable: true,
                        metadata: { role: this.role }
                    });
                    this._setupPeerConnection(conn);
                }
            });

            this.peer.on('connection', (conn) => {
                console.log(`[TwoWay PeerJS] Incoming connection from: ${conn.peer}`);
                this._setupPeerConnection(conn);
            });

            this.peer.on('call', (call) => {
                this.mediaCall = call;
                call.answer(this.localStream || undefined);
                call.on('stream', (stream) => {
                    this.remoteStream = stream;
                    this._notifyRemoteStream(stream);
                });
            });

            this.peer.on('error', (err) => {
                console.log('[TwoWay PeerJS] Notice:', err.type);
                if (err.type === 'unavailable-id') {
                    if (isHosting) {
                        const newCode = TwoWaySessionManager.generateRoomCode();
                        this.roomCode = newCode;
                        const newId = this._buildHostPeerId(newCode);
                        this._initializePeer(newId, true);
                    }
                }
            });
        } catch (e) {
            console.warn('[TwoWay PeerJS] Init error:', e);
        }
    }

    _setupPeerConnection(conn) {
        this.connection = conn;

        conn.on('open', () => {
            console.log(`[TwoWay PeerJS] DataConnection OPEN with ${conn.peer}`);
            if (this.joinTimeout) {
                clearTimeout(this.joinTimeout);
                this.joinTimeout = null;
            }
            this.isConnected = true;

            this.send({
                type: 'HANDSHAKE',
                roomCode: this.roomCode,
                role: this.role,
                peerName: this.isHost ? 'Host' : 'Guest',
                timestamp: Date.now()
            });

            this._notifyState('connected', `Connected with partner in room ${this.roomCode}`);
        });

        conn.on('data', (data) => {
            this._handleIncomingPacket(data);
        });

        conn.on('close', () => {
            console.log('[TwoWay PeerJS] Partner disconnected.');
            this.isConnected = false;
            this.connection = null;
            this._notifyState('partner_left', 'Partner left the room.');
        });
    }

    // =========================================================================
    // 5. PACKET INGESTION & DISPATCH
    // =========================================================================

    _handleIncomingPacket(data) {
        if (!data || typeof data !== 'object') return;

        // Deduplicate packets received over multiple transports
        if (data.msgId) {
            if (this.processedPacketIds.has(data.msgId)) return;
            this.processedPacketIds.add(data.msgId);
            if (this.processedPacketIds.size > 300) {
                const first = this.processedPacketIds.values().next().value;
                this.processedPacketIds.delete(first);
            }
        }

        switch (data.type) {
            case 'HANDSHAKE':
                this.partnerRole = data.role || 'both';
                this.partnerName = data.peerName || 'Partner';
                this.isConnected = true;
                if (this.joinTimeout) {
                    clearTimeout(this.joinTimeout);
                    this.joinTimeout = null;
                }
                console.log(`[TwoWay] Handshake accepted. Role: ${this.partnerRole}`);
                this._notifyState('connected', `Connected with ${this.partnerName} (${this.partnerRole})`);
                break;

            case 'SPEECH_TRANSCRIBED':
                console.log('[TwoWay] Received speech transcript:', data.transcript);
                this._notifySpeech(data);
                break;

            case 'SIGN_COMMITTED':
                console.log('[TwoWay] Received sign sentence:', data.sentence);
                this._notifySign(data);
                break;

            case 'INTERIM_STREAM':
                this._notifyInterim(data);
                break;

            case 'QUICK_PHRASE':
                console.log('[TwoWay] Received quick phrase:', data.phrase);
                this._notifySign({
                    sentence: data.phrase,
                    tokens: [data.phrase],
                    isQuickPhrase: true,
                    autoSpeak: true,
                    timestamp: Date.now()
                });
                break;

            case 'PARTNER_LEAVE':
                console.log('[TwoWay] Partner notified leave.');
                this.isConnected = false;
                this._notifyState('partner_left', 'Partner has left the room.');
                break;
        }
    }

    // High-level multi-transport send method
    send(packet) {
        if (!packet.msgId) {
            packet.msgId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        }
        if (!packet.roomCode && this.roomCode) {
            packet.roomCode = this.roomCode;
        }

        let sent = false;

        // 1. BroadcastChannel (same machine multi-tab)
        if (this.bc) {
            try {
                this.bc.postMessage(packet);
                sent = true;
            } catch (e) {}
        }

        // 2. WebRTC Native DataChannel
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try {
                this.dataChannel.send(JSON.stringify(packet));
                sent = true;
            } catch (e) {}
        }

        // 3. Local WebSocket Bridge
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.roomCode) {
            try {
                this.ws.send(JSON.stringify({
                    type: 'room_message',
                    roomCode: this.roomCode,
                    payload: packet
                }));
                sent = true;
            } catch (e) {}
        }

        // 4. PeerJS DataConnection
        if (this.connection && this.connection.open) {
            try {
                this.connection.send(packet);
                sent = true;
            } catch (e) {}
        }

        return sent;
    }

    // Communication API
    sendSpeech(transcript, tokens) {
        return this.send({
            type: 'SPEECH_TRANSCRIBED',
            transcript: transcript,
            tokens: tokens || this.tokenizeTranscript(transcript),
            timestamp: Date.now()
        });
    }

    sendSign(sentence, tokens = [], autoSpeak = true) {
        return this.send({
            type: 'SIGN_COMMITTED',
            sentence: sentence,
            tokens: tokens.length ? tokens : sentence.split(' '),
            autoSpeak: autoSpeak,
            timestamp: Date.now()
        });
    }

    sendInterim(text, mode = 'signing') {
        return this.send({
            type: 'INTERIM_STREAM',
            text: text,
            mode: mode,
            timestamp: Date.now()
        });
    }

    sendQuickPhrase(phrase) {
        return this.send({
            type: 'QUICK_PHRASE',
            phrase: phrase,
            timestamp: Date.now()
        });
    }

    // Tokenize English text into visual ASL signs and finger-spelled letters
    tokenizeTranscript(text) {
        if (!text) return [];
        const clean = text.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
        const words = clean.split(/\s+/).filter(Boolean);
        const tokens = [];

        const WORD_MAP = {
            'HELLO': { id: 'HELLO', name: 'Hello (Salute)', desc: 'Open flat hand near forehead moving outward.' },
            'HI': { id: 'HELLO', name: 'Hello (Salute)', desc: 'Open flat hand near forehead moving outward.' },
            'YES': { id: 'YES', name: 'Yes (Nodding Fist)', desc: 'Closed fist nodding up and down from the wrist.' },
            'OK': { id: 'OK', name: 'OK Sign', desc: 'Thumb and index form circle, other 3 fingers upright.' },
            'OKAY': { id: 'OK', name: 'OK Sign', desc: 'Thumb and index form circle, other 3 fingers upright.' },
            'PEACE': { id: 'PEACE', name: 'Peace / Victory', desc: 'Index and middle fingers extended in a wide V shape.' },
            'VICTORY': { id: 'PEACE', name: 'Peace / Victory', desc: 'Index and middle fingers extended in a wide V shape.' },
            'LOVE': { id: 'I_LOVE_YOU', name: 'I Love You', desc: 'Thumb, index, and pinky fingers extended; middle and ring curled.' },
            'ROCK': { id: 'ROCK_ON', name: 'Rock On', desc: 'Index and pinky fingers extended; thumb holds middle and ring.' },
            'STOP': { id: 'OPEN_PALM', name: 'Open Palm (Stop)', desc: 'All five fingers straight and extended flat facing forward.' },
            'GOOD': { id: 'THUMBS_UP', name: 'Thumbs Up', desc: 'Closed fist with thumb extended straight up vertically.' },
            'LIKE': { id: 'THUMBS_UP', name: 'Thumbs Up', desc: 'Closed fist with thumb extended straight up vertically.' },
            'BAD': { id: 'THUMBS_DOWN', name: 'Thumbs Down', desc: 'Closed fist with thumb extended straight down vertically.' },
            'NO': { id: 'THUMBS_DOWN', name: 'Thumbs Down', desc: 'Disapproval or negative response.' }
        };

        words.forEach((w, wIdx) => {
            if (WORD_MAP[w]) {
                tokens.push({
                    type: 'SIGN',
                    id: WORD_MAP[w].id,
                    glyph: WORD_MAP[w].id,
                    name: WORD_MAP[w].name,
                    desc: WORD_MAP[w].desc
                });
            } else {
                for (let i = 0; i < w.length; i++) {
                    const char = w[i];
                    tokens.push({
                        type: 'CHAR',
                        id: char,
                        glyph: char,
                        name: `Letter ${char}`,
                        desc: `Finger-spell letter ${char}`
                    });
                }
            }

            if (wIdx < words.length - 1) {
                tokens.push({
                    type: 'SPACE',
                    id: 'SPACE',
                    glyph: 'SPACE',
                    name: 'Word Space',
                    desc: 'Brief pause between words'
                });
            }
        });

        return tokens;
    }

    // Video Streaming
    startVideoCall(localMediaStream) {
        if (!this.isConnected || !localMediaStream) return;
        this.localStream = localMediaStream;

        if (this.pc) {
            localMediaStream.getTracks().forEach((track) => {
                this.pc.addTrack(track, localMediaStream);
            });
            this.pc.createOffer().then((offer) => {
                return this.pc.setLocalDescription(offer);
            }).then(() => {
                this._sendWebRTCSignal({
                    type: 'offer',
                    sdp: this.pc.localDescription.toJSON ? this.pc.localDescription.toJSON() : { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp }
                });
            }).catch(console.warn);
        } else if (this.peer && this.connection) {
            const partnerPeerId = this.connection.peer;
            const call = this.peer.call(partnerPeerId, localMediaStream);
            this.mediaCall = call;

            call.on('stream', (stream) => {
                this.remoteStream = stream;
                this._notifyRemoteStream(stream);
            });

            call.on('close', () => {
                this.remoteStream = null;
                this._notifyRemoteStream(null);
            });
        }
    }

    stopVideoCall() {
        if (this.mediaCall) {
            try { this.mediaCall.close(); } catch (e) {}
            this.mediaCall = null;
        }
        if (this.localStream) {
            this.localStream = null;
        }
        this.remoteStream = null;
        this._notifyRemoteStream(null);
    }

    // =========================================================================
    // 6. ROOM CREATION, JOINING & LIFECYCLE
    // =========================================================================

    createRoom(customCode = null, role = 'both') {
        this.disconnect(false);
        this.role = role;
        this.isHost = true;
        this.roomCode = TwoWaySessionManager.sanitizeRoomCode(customCode) || TwoWaySessionManager.generateRoomCode();

        // 1. Initialize local BroadcastChannel
        this._initBroadcastChannel(this.roomCode);

        // 2. Register with Local WebSocket Bridge if running
        const doWsCreate = () => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'room_create',
                    roomCode: this.roomCode,
                    role: this.role
                }));
            }
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            doWsCreate();
        } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.addEventListener('open', doWsCreate, { once: true });
        }

        // 3. Register with PeerJS Cloud Broker
        const peerId = this._buildHostPeerId(this.roomCode);
        this._initializePeer(peerId, true);

        // 4. Immediately notify waiting state with the active room code
        this._notifyState('waiting', `Room ${this.roomCode} is active and ready for partner.`);
    }

    joinRoom(roomCode, role = 'both') {
        this.disconnect(false);
        this.role = role;
        this.isHost = false;
        this.roomCode = TwoWaySessionManager.sanitizeRoomCode(roomCode);

        if (!this.roomCode) {
            this._notifyError('Please enter a valid room code (e.g. ASL-7K2P).');
            return;
        }

        this._notifyState('connecting', `Connecting to room ${this.roomCode}...`);

        // 1. Immediate BroadcastChannel discovery for local tabs
        this._initBroadcastChannel(this.roomCode);
        if (this.bc) {
            this.bc.postMessage({
                type: 'BC_PING',
                roomCode: this.roomCode,
                role: this.role,
                peerName: 'Guest',
                timestamp: Date.now()
            });

            // Re-ping after 300ms
            setTimeout(() => {
                if (!this.isConnected && this.bc) {
                    this.bc.postMessage({
                        type: 'BC_PING',
                        roomCode: this.roomCode,
                        role: this.role,
                        peerName: 'Guest',
                        timestamp: Date.now()
                    });
                }
            }, 300);
        }

        // 2. Join via Local WebSocket Bridge
        const doWsJoin = () => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                console.log(`[TwoWay] Joining room ${this.roomCode} via WebSocket Bridge`);
                this.ws.send(JSON.stringify({
                    type: 'room_join',
                    roomCode: this.roomCode,
                    role: this.role
                }));
            }
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            doWsJoin();
        } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.addEventListener('open', doWsJoin, { once: true });
        }

        // 3. Join via PeerJS Cloud
        const guestId = this._buildGuestPeerId(this.roomCode);
        this._initializePeer(guestId, false);

        // 4. Timeout fallback
        if (this.joinTimeout) clearTimeout(this.joinTimeout);
        this.joinTimeout = setTimeout(() => {
            if (!this.isConnected) {
                this._notifyError(`Room ${this.roomCode} was not found. Please verify the code with the host.`);
                this._notifyState('error', `Room ${this.roomCode} not found.`);
            }
        }, 12000);
    }

    disconnect(notifyServer = true) {
        if (this.joinTimeout) {
            clearTimeout(this.joinTimeout);
            this.joinTimeout = null;
        }

        if (notifyServer && this.roomCode) {
            this.send({ type: 'PARTNER_LEAVE', roomCode: this.roomCode });
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.send(JSON.stringify({
                        type: 'room_leave',
                        roomCode: this.roomCode
                    }));
                } catch (e) {}
            }
        }

        this.stopVideoCall();

        if (this.bc) {
            try { this.bc.close(); } catch (e) {}
            this.bc = null;
        }

        if (this.dataChannel) {
            try { this.dataChannel.close(); } catch (e) {}
            this.dataChannel = null;
        }

        if (this.pc) {
            try { this.pc.close(); } catch (e) {}
            this.pc = null;
        }

        if (this.connection) {
            try { this.connection.close(); } catch (e) {}
            this.connection = null;
        }

        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }

        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.roomCode = null;
        this.remoteStream = null;

        if (notifyServer || wasConnected) {
            this._notifyState('disconnected', 'Session disconnected.');
        }
    }

    // Event Subscriptions
    onStateChange(cb) { this.callbacks.onStateChange.push(cb); }
    onSpeechReceived(cb) { this.callbacks.onSpeechReceived.push(cb); }
    onSignReceived(cb) { this.callbacks.onSignReceived.push(cb); }
    onInterimReceived(cb) { this.callbacks.onInterimReceived.push(cb); }
    onRemoteStream(cb) { this.callbacks.onRemoteStream.push(cb); }
    onError(cb) { this.callbacks.onError.push(cb); }

    _notifyState(state, message) {
        this.callbacks.onStateChange.forEach(cb => {
            try { cb(state, message, this); } catch (e) { console.error(e); }
        });
    }
    _notifySpeech(data) {
        this.callbacks.onSpeechReceived.forEach(cb => {
            try { cb(data); } catch (e) { console.error(e); }
        });
    }
    _notifySign(data) {
        this.callbacks.onSignReceived.forEach(cb => {
            try { cb(data); } catch (e) { console.error(e); }
        });
    }
    _notifyInterim(data) {
        this.callbacks.onInterimReceived.forEach(cb => {
            try { cb(data); } catch (e) { console.error(e); }
        });
    }
    _notifyRemoteStream(stream) {
        this.callbacks.onRemoteStream.forEach(cb => {
            try { cb(stream); } catch (e) { console.error(e); }
        });
    }
    _notifyError(err) {
        this.callbacks.onError.forEach(cb => {
            try { cb(err); } catch (e) { console.error(e); }
        });
    }
}

// Global Two-Way Session Manager Instance
window.twoWayManager = new TwoWaySessionManager();

// =========================================================================
// UI CONTROLLER & EVENT WIRING
// =========================================================================

function initTwoWayUI() {
    const modal = document.getElementById('two-way-modal');
    const openBtn = document.getElementById('open-two-way-btn');
    const closeBtn = document.getElementById('close-two-way-btn');

    const setupView = document.getElementById('two-way-setup-view');
    const activeView = document.getElementById('two-way-active-view');

    const rolePills = document.getElementById('two-way-role-pills');
    const createRoomBtn = document.getElementById('two-way-create-room-btn');
    const hostIdle = document.getElementById('two-way-host-idle');
    const hostActive = document.getElementById('two-way-host-active');
    const hostCodeDisplay = document.getElementById('host-room-code-display');
    const hostWaitText = document.getElementById('host-wait-text');
    const copyCodeBtn = document.getElementById('copy-room-code-btn');
    const copyCodeText = document.getElementById('copy-code-text');
    const copyRoomLinkBtn = document.getElementById('copy-room-link-btn');
    const copyLinkText = document.getElementById('copy-link-text');

    const joinInput = document.getElementById('two-way-join-input');
    const joinBtn = document.getElementById('two-way-join-btn');

    const sessionCodeDisplay = document.getElementById('two-way-session-code');
    const partnerBadge = document.getElementById('two-way-partner-badge');
    const videoToggleBtn = document.getElementById('two-way-video-toggle-btn');
    const videoBtnText = document.getElementById('two-way-video-btn-text');
    const videoDrawer = document.getElementById('two-way-video-drawer');
    const remoteVideo = document.getElementById('two-way-remote-video');
    const disconnectBtn = document.getElementById('two-way-disconnect-btn');

    const remoteTextDisplay = document.getElementById('two-way-remote-text');
    const vocalizeBtn = document.getElementById('two-way-vocalize-btn');
    const signStage = document.getElementById('two-way-sign-stage');
    const activeVisual = document.getElementById('two-way-active-visual');
    const activeGlyph = document.getElementById('two-way-active-glyph');
    const activeTitle = document.getElementById('two-way-active-title');
    const activeDesc = document.getElementById('two-way-active-desc');
    const timelineEl = document.getElementById('two-way-active-timeline');

    const speakMicBtn = document.getElementById('two-way-speak-mic-btn');
    const speakMicText = document.getElementById('two-way-speak-mic-text');
    const outgoingPreview = document.getElementById('two-way-outgoing-preview');

    let currentRole = 'both';
    let isVideoActive = false;
    let signPlayTimeout = null;
    let localRecognition = null;
    let isLocalListening = false;

    // Helper: show feedback alert inside setup cards
    function showInlineStatus(message, type = 'error') {
        let alertEl = document.getElementById('two-way-inline-alert');
        if (!alertEl) {
            alertEl = document.createElement('div');
            alertEl.id = 'two-way-inline-alert';
            alertEl.className = `two-way-status-alert ${type}`;
            if (setupView) setupView.prepend(alertEl);
        } else {
            alertEl.className = `two-way-status-alert ${type}`;
        }
        alertEl.textContent = message;
        alertEl.style.display = 'flex';
        setTimeout(() => {
            if (alertEl) alertEl.style.display = 'none';
        }, 6000);
    }

    function clearInlineStatus() {
        const alertEl = document.getElementById('two-way-inline-alert');
        if (alertEl) alertEl.style.display = 'none';
    }

    // Open & Close Modal
    function openModal() {
        if (!modal) return;
        modal.classList.add('open');
        clearInlineStatus();
        if (joinInput && !twoWayManager.isConnected) {
            joinInput.focus();
        }
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('open');
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
            closeModal();
        }
    });

    // Role Picker
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
                currentRole = btn.getAttribute('data-role') || 'both';
                twoWayManager.role = currentRole;
            }
        });
    }

    // Host: Create Room Button
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            clearInlineStatus();
            twoWayManager.createRoom(null, currentRole);
        });
    }

    // Host: Copy Code
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            if (twoWayManager.roomCode) {
                navigator.clipboard.writeText(twoWayManager.roomCode).then(() => {
                    if (copyCodeText) copyCodeText.textContent = 'Copied!';
                    setTimeout(() => {
                        if (copyCodeText) copyCodeText.textContent = 'Copy Code';
                    }, 2000);
                }).catch(() => {
                    prompt('Room Code:', twoWayManager.roomCode);
                });
            }
        });
    }

    // Host: Copy Link
    if (copyRoomLinkBtn) {
        copyRoomLinkBtn.addEventListener('click', () => {
            if (twoWayManager.roomCode) {
                const origin = window.location.origin;
                const path = window.location.pathname;
                const link = `${origin}${path}?room=${encodeURIComponent(twoWayManager.roomCode)}`;
                navigator.clipboard.writeText(link).then(() => {
                    if (copyLinkText) copyLinkText.textContent = 'Link Copied!';
                    setTimeout(() => {
                        if (copyLinkText) copyLinkText.textContent = 'Copy Link';
                    }, 2000);
                }).catch(() => {
                    prompt('Shareable Room Link:', link);
                });
            }
        });
    }

    // Guest: Format Join Input (Auto-uppercase & auto-format)
    if (joinInput) {
        joinInput.addEventListener('input', (e) => {
            const raw = e.target.value;
            e.target.value = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        });

        joinInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (joinBtn) joinBtn.click();
            }
        });
    }

    // Guest: Join Room Button
    if (joinBtn && joinInput) {
        joinBtn.addEventListener('click', () => {
            clearInlineStatus();
            const rawVal = joinInput.value.trim();
            const code = TwoWaySessionManager.sanitizeRoomCode(rawVal);

            if (!code) {
                showInlineStatus('Please enter a valid room code (e.g. ASL-7K2P).', 'error');
                joinInput.focus();
                return;
            }

            joinBtn.disabled = true;
            joinInput.disabled = true;
            joinBtn.innerHTML = `
                <span class="dot-indicator pulse" style="display:inline-block; margin-right:8px;"></span>
                <span>Connecting to ${code}...</span>
            `;

            twoWayManager.joinRoom(code, currentRole);
        });
    }

    // State Transitions
    twoWayManager.onStateChange((state, msg) => {
        console.log(`[TwoWay UI State] ${state}: ${msg}`);

        if (state === 'waiting') {
            if (hostIdle && hostActive) {
                hostIdle.style.display = 'none';
                hostActive.style.display = 'block';
            }
            if (hostCodeDisplay) {
                hostCodeDisplay.textContent = twoWayManager.roomCode;
            }
            if (hostWaitText) {
                hostWaitText.textContent = 'Waiting for partner to join...';
            }
            if (createRoomBtn) {
                createRoomBtn.disabled = false;
                createRoomBtn.innerHTML = `<span>Create New Session</span>`;
            }
        } else if (state === 'connected') {
            if (setupView && activeView) {
                setupView.style.display = 'none';
                activeView.style.display = 'flex';
            }
            if (joinBtn && joinInput) {
                joinBtn.disabled = false;
                joinInput.disabled = false;
                joinBtn.innerHTML = `<span>Connect to Room</span>`;
            }
            if (sessionCodeDisplay) sessionCodeDisplay.textContent = `Room: ${twoWayManager.roomCode}`;
            if (partnerBadge) {
                partnerBadge.textContent = `Partner: ${twoWayManager.partnerName} (${twoWayManager.partnerRole})`;
            }
            if (remoteTextDisplay) {
                remoteTextDisplay.innerHTML = `<span class="transcript-placeholder" style="color: var(--accent-emerald);">Connected! Partner is ready.</span>`;
            }
            if (typeof playDetectionSound === 'function') playDetectionSound();
        } else if (state === 'disconnected' || state === 'partner_left' || state === 'error') {
            if (setupView && activeView) {
                setupView.style.display = 'flex';
                activeView.style.display = 'none';
            }
            if (hostIdle && hostActive) {
                hostIdle.style.display = 'block';
                hostActive.style.display = 'none';
            }
            if (createRoomBtn) {
                createRoomBtn.disabled = false;
                createRoomBtn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Create New Session</span>
                `;
            }
            if (joinBtn && joinInput) {
                joinBtn.disabled = false;
                joinInput.disabled = false;
                joinBtn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <span>Connect to Room</span>
                `;
            }
            if (videoDrawer) videoDrawer.style.display = 'none';
            isVideoActive = false;
            if (state === 'partner_left') {
                showInlineStatus('Your partner has disconnected from the room.', 'info');
            }
        }
    });

    twoWayManager.onError((err) => {
        console.warn('[TwoWay UI Error]', err);
        showInlineStatus(typeof err === 'string' ? err : 'Connection error occurred.', 'error');
        if (createRoomBtn) {
            createRoomBtn.disabled = false;
            createRoomBtn.innerHTML = `<span>Create New Session</span>`;
        }
        if (joinBtn && joinInput) {
            joinBtn.disabled = false;
            joinInput.disabled = false;
            joinBtn.innerHTML = `<span>Connect to Room</span>`;
        }
    });

    // Leave Room Button
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            if (confirm('Leave this two-way communication room?')) {
                twoWayManager.disconnect(true);
            }
        });
    }

    // Play Received ASL Sign Sequence (Speech-to-Sign)
    function playReceivedSignSequence(tokens) {
        if (!tokens || !tokens.length) return;
        if (!signStage || !timelineEl) return;

        signStage.style.display = 'block';
        timelineEl.innerHTML = '';
        if (signPlayTimeout) clearTimeout(signPlayTimeout);

        tokens.forEach((tok, idx) => {
            const chip = document.createElement('span');
            chip.className = 'sign-token';
            chip.id = `two-way-tok-${idx}`;
            chip.textContent = tok.glyph === 'SPACE' ? '⎵' : tok.glyph;
            timelineEl.appendChild(chip);
        });

        let currentIdx = 0;
        const speed = 750;

        function step() {
            if (currentIdx >= tokens.length) {
                timelineEl.querySelectorAll('.sign-token').forEach(c => c.classList.remove('active-token'));
                if (activeGlyph) {
                    activeGlyph.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                }
                if (activeTitle) activeTitle.textContent = 'Sequence Complete';
                if (activeDesc) activeDesc.textContent = 'Finished playing spoken phrase.';
                return;
            }

            const current = tokens[currentIdx];

            timelineEl.querySelectorAll('.sign-token').forEach(c => c.classList.remove('active-token'));
            const activeChip = document.getElementById(`two-way-tok-${currentIdx}`);
            if (activeChip) {
                activeChip.classList.add('active-token');
                activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }

            if (activeGlyph) {
                if (current.type === 'SPACE') {
                    activeGlyph.innerHTML = `<span style="font-size: 0.8rem; font-weight: 700; color: var(--text-tertiary);">PAUSE</span>`;
                } else {
                    const imgPath = `assets/signs/${current.glyph}.png?v=3.2.0`;
                    activeGlyph.innerHTML = `
                        <img src="${imgPath}" alt="${current.name}" onerror="this.onerror=null; this.src='assets/signs/${current.glyph}.svg'; if(!this.complete){this.style.display='none'; this.nextElementSibling.style.display='block';}" style="width:100%; height:100%; object-fit:contain; display:block;" />
                        <span style="display:none; font-size:1.1rem; font-weight:800; color:var(--text-primary); text-align:center;">${current.glyph}</span>
                    `;
                }
            }
            if (activeTitle) activeTitle.textContent = current.name || current.glyph;
            if (activeDesc) activeDesc.textContent = current.desc || '';

            currentIdx++;
            signPlayTimeout = setTimeout(step, current.type === 'SPACE' ? speed * 0.5 : speed);
        }

        step();
    }

    // Inbound: Partner Speaks (Hearing -> Deaf: Speech-to-Sign)
    twoWayManager.onSpeechReceived((data) => {
        if (remoteTextDisplay) {
            remoteTextDisplay.innerHTML = `<span class="transcript-text" style="color: var(--accent-primary-light);">"${data.transcript}"</span>`;
        }
        playReceivedSignSequence(data.tokens);
    });

    // Inbound: Partner Signs (Deaf -> Hearing: Sign-to-Speech)
    twoWayManager.onSignReceived((data) => {
        if (remoteTextDisplay) {
            remoteTextDisplay.innerHTML = `<span class="transcript-text" style="color: var(--accent-emerald);">${data.sentence}</span>`;
        }
        if (signStage) signStage.style.display = 'none';

        if (data.autoSpeak && data.sentence) {
            speakText(data.sentence);
        }
    });

    // Inbound: Partner Live Interim Stream
    twoWayManager.onInterimReceived((data) => {
        if (remoteTextDisplay && data && data.text) {
            remoteTextDisplay.innerHTML = `<span class="transcript-text" style="color: var(--text-secondary); font-style: italic;">${data.text} <span style="opacity: 0.6; animation: pulse 1s infinite;">&bull;&bull;&bull;</span></span>`;
        }
    });

    // Vocalize Button (Manual Speak)
    function speakText(text) {
        if (!text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    if (vocalizeBtn) {
        vocalizeBtn.addEventListener('click', () => {
            const rawText = remoteTextDisplay ? remoteTextDisplay.textContent.replace(/"/g, '').trim() : '';
            if (rawText && !rawText.includes('Waiting for partner') && !rawText.includes('Connected!')) {
                speakText(rawText);
            }
        });
    }

    // Local Voice Speaking Button (Speech-to-Sign Transmission)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && speakMicBtn) {
        localRecognition = new SpeechRecognition();
        localRecognition.continuous = false;
        localRecognition.interimResults = false;
        localRecognition.lang = 'en-US';

        localRecognition.onstart = () => {
            isLocalListening = true;
            speakMicBtn.classList.add('listening');
            if (speakMicText) speakMicText.textContent = 'Listening... Speak now';
        };

        localRecognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript.trim();
            if (transcript) {
                if (outgoingPreview) {
                    outgoingPreview.innerHTML = `<span style="color: var(--text-primary); font-weight: 600;">Spoken: "${transcript}"</span>`;
                }
                const tokens = twoWayManager.tokenizeTranscript(transcript);
                twoWayManager.sendSpeech(transcript, tokens);
                console.log(`[TwoWay UI] Sent speech transcript to partner: "${transcript}"`);
            }
        };

        localRecognition.onerror = (e) => {
            console.warn('[TwoWay Voice] Speech recognition error:', e.error);
            stopLocalListening();
        };

        localRecognition.onend = () => {
            stopLocalListening();
        };

        function stopLocalListening() {
            isLocalListening = false;
            speakMicBtn.classList.remove('listening');
            if (speakMicText) speakMicText.textContent = 'Speak to Partner';
        }

        speakMicBtn.addEventListener('click', () => {
            if (isLocalListening) {
                localRecognition.stop();
                stopLocalListening();
            } else {
                try {
                    localRecognition.start();
                } catch (err) {
                    console.warn(err);
                }
            }
        });
    } else if (speakMicBtn) {
        speakMicBtn.disabled = true;
        if (speakMicText) speakMicText.textContent = 'Voice Not Supported';
    }

    // Text Input -> Translate to ASL Sign Sequence
    const twoWayTextInput = document.getElementById('two-way-text-input');
    const twoWaySendTextBtn = document.getElementById('two-way-send-text-btn');

    function sendTypedSpeechMessage() {
        if (!twoWayTextInput) return;
        const text = twoWayTextInput.value.trim();
        if (!text) return;
        if (!twoWayManager.isConnected) {
            showInlineStatus('Please connect to a room first.', 'error');
            return;
        }

        const tokens = twoWayManager.tokenizeTranscript(text);
        twoWayManager.sendSpeech(text, tokens);
        if (outgoingPreview) {
            outgoingPreview.innerHTML = `<span style="color: var(--text-primary); font-weight: 600;">Sent Spoken Message: "${text}"</span>`;
        }
        twoWayTextInput.value = '';
    }

    if (twoWaySendTextBtn) {
        twoWaySendTextBtn.addEventListener('click', sendTypedSpeechMessage);
    }
    if (twoWayTextInput) {
        twoWayTextInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendTypedSpeechMessage();
            }
        });
    }

    // Send Current Camera Signed Sentence Button
    const sendCurrentSignBtn = document.getElementById('two-way-send-current-sign-btn');
    if (sendCurrentSignBtn) {
        sendCurrentSignBtn.addEventListener('click', () => {
            const rawSentence = (typeof window.currentSentence === 'string' ? window.currentSentence : (window.getCurrentSentence ? window.getCurrentSentence() : '')).trim();
            if (!rawSentence) {
                showInlineStatus('No camera sign sentence detected yet. Form signs in front of the camera first.', 'info');
                return;
            }
            if (!twoWayManager.isConnected) {
                showInlineStatus('Please connect to a room first.', 'error');
                return;
            }
            twoWayManager.sendSign(rawSentence);
            if (outgoingPreview) {
                outgoingPreview.innerHTML = `<span style="color: var(--accent-emerald); font-weight: 600;">Sent Signed Sentence: "${rawSentence}"</span>`;
            }
        });
    }

    // Quick Phrases Click Handlers
    document.querySelectorAll('.quick-phrase-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const phrase = chip.getAttribute('data-phrase');
            if (phrase) {
                if (!twoWayManager.isConnected) {
                    showInlineStatus('Please connect to a room first.', 'error');
                    return;
                }
                twoWayManager.sendQuickPhrase(phrase);
                if (outgoingPreview) {
                    outgoingPreview.innerHTML = `<span style="color: var(--accent-emerald); font-weight: 600;">Quick Response Sent: "${phrase}"</span>`;
                }
            }
        });
    });

    // Video Call Toggle
    if (videoToggleBtn) {
        videoToggleBtn.addEventListener('click', async () => {
            if (!twoWayManager.isConnected) return;

            if (isVideoActive) {
                twoWayManager.stopVideoCall();
                if (videoDrawer) videoDrawer.style.display = 'none';
                if (videoBtnText) videoBtnText.textContent = 'Video Call';
                isVideoActive = false;
            } else {
                try {
                    const videoEl = document.getElementById('webcam');
                    let stream = null;
                    if (videoEl && videoEl.srcObject) {
                        stream = videoEl.srcObject;
                    } else {
                        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    }

                    twoWayManager.startVideoCall(stream);
                    if (videoBtnText) videoBtnText.textContent = 'Hide Video';
                    isVideoActive = true;
                } catch (e) {
                    showInlineStatus('Camera access needed to start video call.', 'error');
                }
            }
        });
    }

    twoWayManager.onRemoteStream((stream) => {
        if (remoteVideo && videoDrawer) {
            if (stream) {
                remoteVideo.srcObject = stream;
                videoDrawer.style.display = 'flex';
                if (videoBtnText) videoBtnText.textContent = 'Hide Video';
                isVideoActive = true;
            } else {
                remoteVideo.srcObject = null;
                videoDrawer.style.display = 'none';
                if (videoBtnText) videoBtnText.textContent = 'Video Call';
                isVideoActive = false;
            }
        }
    });

    // Auto-Join if URL contained ?room=CODE
    if (twoWayManager.pendingRoomCode) {
        console.log(`[TwoWay UI] Detected pending room parameter: ${twoWayManager.pendingRoomCode}`);
        openModal();
        if (joinInput) {
            joinInput.value = twoWayManager.pendingRoomCode;
        }
        setTimeout(() => {
            if (!twoWayManager.isConnected && joinBtn) {
                joinBtn.click();
            }
        }, 500);
    }
}

// Initialize on DOM load or immediately if DOM is ready
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initTwoWayUI);
} else {
    initTwoWayUI();
}
