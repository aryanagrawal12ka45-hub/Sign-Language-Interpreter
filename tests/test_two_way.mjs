// tests/test_two_way.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Mock browser globals for Node test environment
globalThis.window = {
    location: { search: '', origin: 'http://localhost:8000', pathname: '/detector.html', hash: '' },
    addEventListener: () => {}
};

// Polyfill BroadcastChannel in Node environment
class MockBroadcastChannel {
    static channels = new Map();

    constructor(name) {
        this.name = name;
        this.onmessage = null;
        if (!MockBroadcastChannel.channels.has(name)) {
            MockBroadcastChannel.channels.set(name, new Set());
        }
        MockBroadcastChannel.channels.get(name).add(this);
    }

    postMessage(data) {
        const set = MockBroadcastChannel.channels.get(this.name);
        if (set) {
            set.forEach(ch => {
                if (ch !== this && ch.onmessage) {
                    ch.onmessage({ data });
                }
            });
        }
    }

    close() {
        const set = MockBroadcastChannel.channels.get(this.name);
        if (set) set.delete(this);
    }
}

globalThis.BroadcastChannel = MockBroadcastChannel;

// Load dependencies and two_way.js code
const handsPipelineCode = fs.readFileSync('src/hands-pipeline.js', 'utf-8');
const lexiconCode = fs.readFileSync('src/lexicon_service.js', 'utf-8');
const code = fs.readFileSync('two_way.js', 'utf-8');
const vm = await import('node:vm');
const context = vm.createContext({
    window: globalThis.window,
    console: console,
    Date: Date,
    Math: Math,
    Set: Set,
    Map: Map,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    URLSearchParams: URLSearchParams,
    BroadcastChannel: MockBroadcastChannel,
    document: {
        readyState: 'complete',
        addEventListener: () => {},
        getElementById: () => null,
        querySelectorAll: () => []
    }
});

vm.runInContext(handsPipelineCode, context);
vm.runInContext(lexiconCode, context);
vm.runInContext(code, context);
const TwoWaySessionManager = context.window.twoWayManager.constructor;

test('Room Code generation and normalization', () => {
    const code = TwoWaySessionManager.generateRoomCode();
    assert.match(code, /^ASL-[2-9A-Z]{3}$/);

    assert.equal(TwoWaySessionManager.normalizeRoomCode('482'), 'ASL-482');
    assert.equal(TwoWaySessionManager.normalizeRoomCode('asl-482'), 'ASL-482');
    assert.equal(TwoWaySessionManager.normalizeRoomCode('ASL482'), 'ASL-482');
    assert.equal(TwoWaySessionManager.getCanonicalRoomToken('ASL-482'), 'asl482');
    assert.equal(TwoWaySessionManager.normalizeRoomCode(''), '');
});

test('Tokenize transcript converts words, letters and pauses', () => {
    const mgr = new TwoWaySessionManager();
    const tokens = mgr.tokenizeTranscript('Hello yes ok');
    
    assert.ok(tokens.length >= 3);
    assert.equal(tokens[0].glyph, 'HELLO');
    assert.equal(tokens[0].type, 'SIGN');
    
    // Space pause token
    assert.equal(tokens[1].type, 'SPACE');
    assert.equal(tokens[2].glyph, 'YES');
});

test('Tokenize falls back to finger-spelling for unknown words', () => {
    const mgr = new TwoWaySessionManager();
    const tokens = mgr.tokenizeTranscript('CAT');
    
    assert.equal(tokens.length, 3);
    assert.equal(tokens[0].glyph, 'C');
    assert.equal(tokens[1].glyph, 'A');
    assert.equal(tokens[2].glyph, 'T');
    assert.equal(tokens[0].type, 'CHAR');
});

test('Packet Deduplication prevents processing duplicate packet IDs', () => {
    const mgr = new TwoWaySessionManager();
    let speechCalls = 0;
    mgr.onSpeechReceived(() => { speechCalls++; });

    const pkt = {
        id: 'dup_pkt_123',
        type: 'SPEECH_TRANSCRIBED',
        transcript: 'Testing duplication',
        timestamp: Date.now()
    };

    mgr._handleIncomingPacket(pkt);
    assert.equal(speechCalls, 1);

    // Send duplicate packet
    mgr._handleIncomingPacket(pkt);
    assert.equal(speechCalls, 1, 'Duplicate packet was not ignored');
});

test('End-to-end Local Pairing: Signer (Host) and Speaker (Guest) communication', (t, done) => {
    const host = new TwoWaySessionManager();
    const guest = new TwoWaySessionManager();

    const roomCode = 'ASL-777';

    host.onStateChange((state) => {
        if (state === 'connected') {
            assert.equal(host.isConnected, true);
            assert.equal(host.partnerRole, 'speaking');

            // Host (Signer) sends recognized sign sentence
            host.sendSign('THANK YOU');
        }
    });

    guest.onSignReceived((data) => {
        assert.equal(data.sentence, 'THANK YOU');
        assert.equal(guest.conversationLog.length, 1);
        assert.equal(guest.conversationLog[0].text, 'THANK YOU');

        // Guest (Speaker) replies with speech
        guest.sendSpeech('HELLO');
    });

    host.onSpeechReceived((data) => {
        assert.equal(data.transcript, 'HELLO');
        assert.ok(data.tokens.length > 0);
        assert.equal(data.tokens[0].glyph, 'HELLO');

        // Verify transcript texts
        const hostTranscript = host.getTranscriptText();
        assert.match(hostTranscript, /THANK YOU/);
        assert.match(hostTranscript, /HELLO/);

        // Teardown
        host.disconnect();
        guest.disconnect();
        assert.equal(host.isConnected, false);
        assert.equal(guest.isConnected, false);
        done();
    });

    host.createRoom(roomCode, 'signing');
    guest.joinRoom(roomCode, 'speaking');
});

test('Quick Phrase transmission and transcript recording', (t, done) => {
    const host = new TwoWaySessionManager();
    const guest = new TwoWaySessionManager();
    const roomCode = 'ASL-888';

    host.onStateChange((state) => {
        if (state === 'connected') {
            guest.sendQuickPhrase('Please Repeat');
        }
    });

    host.onSignReceived((data) => {
        assert.equal(data.sentence, 'Please Repeat');
        assert.equal(data.isQuickPhrase, true);
        assert.equal(host.conversationLog.length, 1);

        host.disconnect();
        guest.disconnect();
        done();
    });

    host.createRoom(roomCode, 'signing');
    guest.joinRoom(roomCode, 'speaking');
});
