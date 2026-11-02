/**
 * Sign Language Studio - AI Gesture Assistant
 * Completely unauthenticated, privacy-preserving AI assistant (No login/sign-out required).
 * Direct zero-auth inference with Netlify serverless proxy & local dictionary fallback.
 */

const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const attachBtn = document.getElementById('attach-btn');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

let currentImageFile = null;
let currentImageBase64 = null;

// System Prompt tailored for American Sign Language & Gesture Linguistics
const SYSTEM_PROMPT = `You are the Sign Language Studio AI Gesture Assistant — an authoritative, welcoming expert in American Sign Language (ASL), deaf culture, and manual linguistics.
Key responsibilities:
1. Explain ASL signs, vocabulary, idioms, grammar (Topic-Comment syntax, Non-Manual Markers/NMMs), and finger-spelling with precision.
2. Clearly describe the 5 core parameters of each sign: Handshape (e.g. Flat-B, Index/1, 5-handshape, C, A, O), Palm Orientation, Location (forehead, chin, chest, neutral space), Movement (circular, tapping, outward), and Facial Expressions/NMMs.
3. Guide users through fingerspelling (A-Z) and numbers (1-100).
4. If the user attaches an image or asks about recognizing a gesture, guide them step-by-step on how to verify and hold the shape, and recommend using the real-time on-device Live Camera Detector for automatic 21-landmark neural tracking.
5. Format your answers cleanly with markdown: use bold text for sign names, bullet points for steps, and keep instructions concise and encouraging.`;

// Conversation memory for multi-turn dialogue
const conversationHistory = [
    { role: 'system', content: SYSTEM_PROMPT }
];

// Handle textarea auto-resize
chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Trigger file input when attach is clicked
attachBtn.addEventListener('click', () => {
    imageUpload.click();
});

// Handle image selection
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentImageFile = file;

        const reader = new FileReader();
        reader.onload = (event) => {
            currentImageBase64 = event.target.result;
            imagePreview.src = currentImageBase64;
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Remove attached image
removeImageBtn.addEventListener('click', () => {
    currentImageFile = null;
    currentImageBase64 = null;
    imageUpload.value = '';
    imagePreviewContainer.classList.add('hidden');
});

// Send message triggers
sendBtn.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Quick suggestion chips handler
document.querySelectorAll('.chip-suggestion').forEach(chip => {
    chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) {
            chatInput.value = prompt;
            handleSendMessage();
        }
    });
});

/**
 * Basic safe markdown formatter for AI responses
 */
function renderMarkdown(text) {
    if (!text) return '';

    // HTML escape
    let safe = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Images ![alt](url)
    safe = safe.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 140px; border-radius: 8px; margin: 0.5rem 0; display: block; border: 1px solid rgba(255,255,255,0.15);" />');

    // Code blocks ```code```
    safe = safe.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0.8rem; overflow-x: auto; font-family: monospace; font-size: 0.85rem; margin: 0.5rem 0;"><code>$1</code></pre>');

    // Inline code `code`
    safe = safe.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 0.85rem;">$1</code>');

    // Headings ### Heading
    safe = safe.replace(/^###\s*(.*)$/gm, '<h4 style="margin: 0.6rem 0 0.3rem 0; font-size: 1rem; color: #10b981;">$1</h4>');
    safe = safe.replace(/^##\s*(.*)$/gm, '<h3 style="margin: 0.8rem 0 0.4rem 0; font-size: 1.1rem; color: #10b981;">$1</h3>');

    // Links [text](url)
    safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #10b981; text-decoration: underline;">$1</a>');

    // Bold **text** or __text__
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic *text* or _text_
    safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet lists
    safe = safe.replace(/^\s*[-*]\s+(.*)$/gm, '<li style="margin-left: 1.2rem; margin-bottom: 0.25rem;">$1</li>');

    // Numbered lists
    safe = safe.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<li style="margin-left: 1.2rem; margin-bottom: 0.25rem;" value="$1">$2</li>');

    // Double line breaks into paragraphs
    safe = safe.replace(/\n\n+/g, '</p><p style="margin: 0.6rem 0;">');
    // Single line break into <br/>
    safe = safe.replace(/\n/g, '<br/>');

    return `<p style="margin: 0;">${safe}</p>`;
}

function appendMessage(role, text, imageUrl = null) {
    const isUser = role === 'user';
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message slide-in ${isUser ? 'user-message' : 'ai-message'}`;

    const userAvatarIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    const aiAvatarIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;

    const avatarIcon = isUser ? userAvatarIcon : aiAvatarIcon;
    const avatarClass = isUser ? 'user-avatar-minimal' : 'ai-avatar-minimal';

    let contentHtml = isUser
        ? `<p style="margin: 0; white-space: pre-wrap;">${text}</p>`
        : renderMarkdown(text);

    if (imageUrl) {
        contentHtml = `<img src="${imageUrl}" style="max-width: 250px; border-radius: 8px; margin-bottom: 0.8rem; display: block; border: 1px solid rgba(255,255,255,0.15);" alt="Attached gesture image">` + contentHtml;
    }

    messageDiv.innerHTML = `
        <div class="avatar-minimal ${avatarClass}">${avatarIcon}</div>
        <div class="bubble-minimal">
            ${contentHtml}
        </div>
    `;

    chatHistory.appendChild(messageDiv);

    chatHistory.scrollTo({
        top: chatHistory.scrollHeight,
        behavior: 'smooth'
    });

    return messageDiv;
}

/**
 * Built-in ASL Knowledge Fallback (works offline and on localhost)
 */
function searchLocalKnowledgeBase(query) {
    const q = (query || '').toLowerCase().trim();

    // 1. Check loaded SIGN_DICTIONARY_DATA from dictionary.js
    if (typeof SIGN_DICTIONARY_DATA !== 'undefined' && Array.isArray(SIGN_DICTIONARY_DATA)) {
        // Look for letter match (e.g., "letter a", "how to sign a", "a")
        const singleLetterMatch = q.match(/\b([a-z0-9])\b/);
        const targetId = singleLetterMatch ? singleLetterMatch[1].toUpperCase() : null;

        for (const item of SIGN_DICTIONARY_DATA) {
            const idUpper = item.id.toUpperCase();
            const nameLower = item.name.toLowerCase();
            if ((targetId && idUpper === targetId) || q.includes(nameLower) || (item.keywords && item.keywords.some(k => q.includes(k.toLowerCase())))) {
                return `### ${item.name} (${item.badge || 'ASL Sign'})\n\n` +
                       `**How to form this sign:**\n${item.desc || 'Hold handshape clearly in neutral signing space.'}\n\n` +
                       (item.image ? `![${item.name}](${item.image})\n\n` : '') +
                       `*Tip: You can practice this pose in our [Practice Lab](quiz.html) or verify it live on the [Camera Detector](detector.html).*`;
            }
        }
    }

    // 2. Common ASL Grammar & Structural Queries
    if (q.includes('grammar') || q.includes('nmm') || q.includes('facial')) {
        return `### ASL Grammar & Non-Manual Markers (NMMs)\n\n` +
               `* **Word Order:** ASL predominantly uses **Topic-Comment** structure rather than English Subject-Verb-Object.\n` +
               `* **Non-Manual Markers (NMMs):** Facial expressions are grammatical components in ASL:\n` +
               `  - **Yes/No Questions:** Eyebrows raised, head tilted forward.\n` +
               `  - **WH-Questions (Who, What, Where, When, Why):** Eyebrows furrowed/lowered.\n` +
               `  - **Negation:** Shaking head subtly side-to-side while signing.\n\n` +
               `*Practice facial grammar alongside hand gestures in the [Live Camera Detector](detector.html).*`;
    }

    if (q.includes('parameter') || q.includes('5 parameter') || q.includes('five')) {
        return `### The 5 Universal Parameters of ASL Signs\n\n` +
               `Every American Sign Language sign is constructed from 5 fundamental parameters:\n` +
               `1. **Handshape:** Configuration of your fingers (e.g., Flat-B, Index/1, 5-handshape, C, A, O).\n` +
               `2. **Palm Orientation:** Direction your palm faces (inward, outward, upward, downward, or toward partner).\n` +
               `3. **Location:** Where the sign is executed on the body or neutral space (forehead, chin, chest, neutral space).\n` +
               `4. **Movement:** Trajectory and tempo (straight, circular, tapping, repeated, bouncing).\n` +
               `5. **Non-Manual Markers (NMMs):** Eyebrow posture, mouth morphemes, head tilts, and body shifts.\n\n` +
               `Changing any one parameter creates an entirely different sign!`;
    }

    if (q.includes('fingerspell') || q.includes('alphabet')) {
        return `### ASL Fingerspelling Rules & Technique\n\n` +
               `* **Hand Position:** Keep your elbow resting comfortably near your ribs and your hand at shoulder height, facing outward toward your conversation partner.\n` +
               `* **Clarity Over Speed:** Do not bounce or pump your hand forward for each letter. Keep hand movements smooth and steady.\n` +
               `* **Double Letters:** For letters like 'LL' or 'EE', slightly slide the hand outward or give a subtle double tap.\n` +
               `* **Word Breaks:** Pause briefly between words rather than dropping your hand.\n\n` +
               `*Explore every letter (A-Z) in our [Sign Library](detector.html) or test your speed in the [Practice Lab](quiz.html).*`;
    }

    if (q.includes('hello') || q.includes('hi')) {
        return `### How to Sign 'Hello' in ASL\n\n` +
               `* **Handshape:** Open Flat-B hand with fingers together and thumb beside the index finger.\n` +
               `* **Starting Position:** Touch or bring your fingertips near your forehead/temple.\n` +
               `* **Movement:** Move your hand forward and outward in a gentle salute motion with a welcoming facial expression.\n\n` +
               `*You can see the animated signing avatar demonstrate this in [Text to Sign](avatar.html).*`;
    }

    if (q.includes('thank') || q.includes('thanks')) {
        return `### How to Sign 'Thank You' in ASL\n\n` +
               `* **Handshape:** Open Flat-B hand with fingers together, palm facing toward yourself.\n` +
               `* **Starting Position:** Touch the fingertips of your dominant hand to your chin or lips.\n` +
               `* **Movement:** Move your hand outward and slightly downward toward the person you are thanking with a pleasant nod.\n\n` +
               `*(Note: Make sure your palm does not start at your forehead — that would be 'Hello' or 'Good')*`;
    }

    return null;
}

/**
 * Call zero-auth AI service (Netlify serverless endpoint with local fallback)
 */
async function queryZeroAuthAI(messages, userQuestion) {
    // 1. Try serverless Netlify proxy first (Node runtime on production domains / netlify dev)
    try {
        const netlifyRes = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });
        if (netlifyRes.ok) {
            const data = await netlifyRes.json();
            if (data && data.reply) return data.reply;
        }
    } catch (_) {
        // Fallback if running on local static server (without Netlify Functions)
    }

    // 2. Try direct unauthenticated call
    try {
        const directRes = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: messages,
                seed: Math.floor(Math.random() * 1000000)
            })
        });

        if (directRes.ok) {
            const text = await directRes.text();
            if (text && text.trim()) return text.trim();
        }
    } catch (_) {
        // Cloudflare WAF block or network failure on direct browser call
    }

    // 3. Intelligent Local Knowledge Base Fallback
    const localAnswer = searchLocalKnowledgeBase(userQuestion);
    if (localAnswer) {
        return localAnswer;
    }

    // 4. Default helpful guide if question was not in local dictionary
    return `### ASL Gesture Assistant Guidance\n\n` +
           `I received your question: *"**${userQuestion}**"*\n\n` +
           `* **Live Cloud Inference:** When running on our production domain ([sign-language-studio.webdomain.live](https://sign-language-studio.webdomain.live/chat.html)), requests are processed via our serverless edge proxy with zero authentication required.\n` +
           `* **Local Mode:** For instant sign lookups on localhost, ask about any letter (**A-Z**), numbers (**0-9**), vocabulary words (**Hello, Thank You, Yes, No**), or topics like **ASL Grammar**, **5 Parameters**, or **Fingerspelling**.\n` +
           `* **Live Recognition:** For real-time visual feedback, open the [Live Camera Detector](detector.html) to track your hand pose using our 21-landmark on-device neural network.`;
}

async function handleSendMessage() {
    const text = chatInput.value.trim();

    // Don't send if fully empty
    if (!text && !currentImageBase64) return;

    const userDisplayText = text || 'Analyze this ASL gesture image';
    const payloadImage = currentImageBase64;
    const payloadFileName = currentImageFile ? currentImageFile.name : '';

    // 1. Add User Message to UI
    appendMessage('user', userDisplayText, payloadImage);

    // Build context-aware prompt for AI
    let promptForAI = text;
    if (payloadImage) {
        const fileInfo = payloadFileName ? ` (Image filename: "${payloadFileName}")` : '';
        if (text) {
            promptForAI = `[User attached a gesture photograph${fileInfo}]: ${text}`;
        } else {
            promptForAI = `[User attached a gesture photograph${fileInfo}]: What sign is this, how is it formed, and how can I verify my handshape?`;
        }
    }

    // Add to conversation history
    conversationHistory.push({ role: 'user', content: promptForAI });

    // Keep conversation history bounded to avoid oversized payloads (last 10 turns)
    if (conversationHistory.length > 12) {
        const system = conversationHistory[0];
        const recent = conversationHistory.slice(-10);
        conversationHistory.length = 0;
        conversationHistory.push(system, ...recent);
    }

    // Clear inputs
    chatInput.value = '';
    chatInput.style.height = 'auto';
    currentImageFile = null;
    currentImageBase64 = null;
    imageUpload.value = '';
    imagePreviewContainer.classList.add('hidden');

    // 2. Show typing indicator
    const typingMsg = appendMessage('ai', 'Analyzing gesture & formulating response...');

    try {
        const responseText = await queryZeroAuthAI(conversationHistory, text || payloadFileName);

        // Remove typing indicator and append response
        if (typingMsg && typingMsg.parentNode) {
            chatHistory.removeChild(typingMsg);
        }

        appendMessage('ai', responseText);

        // Record assistant response in memory
        conversationHistory.push({ role: 'assistant', content: responseText });

    } catch (err) {
        console.error('[Gesture AI Assistant Error]:', err);
        if (typingMsg && typingMsg.parentNode) {
            chatHistory.removeChild(typingMsg);
        }

        const fallback = searchLocalKnowledgeBase(text) ||
            `I had trouble communicating with the upstream AI service. You can practice signs directly with our real-time [Live Camera Detector](detector.html) or [Practice Lab](quiz.html).`;
        appendMessage('ai', fallback);
    }
}
