/**
 * ASL Sign Dictionary & Visual Reference Library
 * Shared component across index.html, quiz.html, and chat.html
 */

const SIGN_DICTIONARY_DATA = [
    // Alphabet A - Z (26)
    { id: 'A', category: 'alphabet', name: 'Letter A', badge: 'Alphabet', image: 'assets/signs/A.png', desc: 'Closed fist with thumb held upright and resting against the side of the index finger.', tips: 'Fingers should be firmly curled with thumb resting beside index.' },
    { id: 'B', category: 'alphabet', name: 'Letter B', badge: 'Alphabet', image: 'assets/signs/B.png', desc: 'Flat open hand with four fingers pointing straight up and thumb folded across the palm.', tips: 'Keep fingers tight together and upright.' },
    { id: 'C', category: 'alphabet', name: 'Letter C', badge: 'Alphabet', image: 'assets/signs/C.png', desc: 'Curved fingers and thumb forming an open "C" shape facing outward to the side.', tips: 'Curve naturally as if holding a cup.' },
    { id: 'D', category: 'alphabet', name: 'Letter D', badge: 'Alphabet', image: 'assets/signs/D.png', desc: 'Index finger pointing straight up; thumb touches middle, ring, and pinky tips in a ring.', tips: 'Keep index finger completely vertical.' },
    { id: 'E', category: 'alphabet', name: 'Letter E', badge: 'Alphabet', image: 'assets/signs/E.png', desc: 'All fingertips curled tightly inward, resting on top of the thumb folded underneath.', tips: 'Do not curl into a fist; curl fingertips down against thumb.' },
    { id: 'F', category: 'alphabet', name: 'Letter F', badge: 'Alphabet', image: 'assets/signs/F.png', desc: 'Index finger and thumb touch tips forming an "O"; middle, ring, and pinky point straight up.', tips: 'Three outer fingers spread slightly upward.' },
    { id: 'G', category: 'alphabet', name: 'Letter G', badge: 'Alphabet', image: 'assets/signs/G.png', desc: 'Index finger and thumb extend horizontally in parallel; other fingers closed into palm.', tips: 'Point index and thumb sideways horizontally.' },
    { id: 'H', category: 'alphabet', name: 'Letter H', badge: 'Alphabet', image: 'assets/signs/H.png', desc: 'Index and middle fingers extend horizontally together; thumb tucked under fingers.', tips: 'Hold both fingers parallel and close together.' },
    { id: 'I', category: 'alphabet', name: 'Letter I', badge: 'Alphabet', image: 'assets/signs/I.png', desc: 'Pinky finger points straight up; remaining fingers curled into fist with thumb across.', tips: 'Keep pinky straight and erect.' },
    { id: 'J', category: 'alphabet', name: 'Letter J', badge: 'Alphabet', image: 'assets/signs/J.png', desc: 'Start with pinky up (like I), then trace a downward hook curve in the air.', tips: 'Dynamic sign: scoop pinky down and inward.' },
    { id: 'K', category: 'alphabet', name: 'Letter K', badge: 'Alphabet', image: 'assets/signs/K.png', desc: 'Index finger straight up, middle finger pointed forward, thumb resting between them.', tips: 'Thumb touches the knuckle joint of middle finger.' },
    { id: 'L', category: 'alphabet', name: 'Letter L', badge: 'Alphabet', image: 'assets/signs/L.png', desc: 'Index finger points straight up and thumb extends wide horizontally at 90 degrees.', tips: 'Forms a crisp right-angle "L" shape.' },
    { id: 'M', category: 'alphabet', name: 'Letter M', badge: 'Alphabet', image: 'assets/signs/M.png', desc: 'Fist with thumb tucked underneath the first three folded fingers (index, middle, ring).', tips: 'Thumb tip peeks out beneath ring finger.' },
    { id: 'N', category: 'alphabet', name: 'Letter N', badge: 'Alphabet', image: 'assets/signs/N.png', desc: 'Fist with thumb tucked underneath the first two folded fingers (index and middle).', tips: 'Thumb tip peeks out between middle and ring.' },
    { id: 'O', category: 'alphabet', name: 'Letter O', badge: 'Alphabet', image: 'assets/signs/O.png', desc: 'All fingertips touch the thumb tip to form a rounded, open "O" shape.', tips: 'Make a full circle visible from the front.' },
    { id: 'P', category: 'alphabet', name: 'Letter P', badge: 'Alphabet', image: 'assets/signs/P.png', desc: 'Like letter K, but hand is inverted pointing downward toward the ground.', tips: 'Index points down, middle points forward-down.' },
    { id: 'Q', category: 'alphabet', name: 'Letter Q', badge: 'Alphabet', image: 'assets/signs/Q.png', desc: 'Like letter G, but index and thumb point downward toward the floor.', tips: 'Keep fingers parallel pointing downwards.' },
    { id: 'R', category: 'alphabet', name: 'Letter R', badge: 'Alphabet', image: 'assets/signs/R.png', desc: 'Index and middle fingers extended straight up and crossed over each other.', tips: 'Middle finger crosses in front of index finger.' },
    { id: 'S', category: 'alphabet', name: 'Letter S', badge: 'Alphabet', image: 'assets/signs/S.png', desc: 'Tight closed fist with thumb folded horizontally across the front of all curled fingers.', tips: 'Thumb wraps over index, middle, and ring.' },
    { id: 'T', category: 'alphabet', name: 'Letter T', badge: 'Alphabet', image: 'assets/signs/T.png', desc: 'Fist with thumb tucked between the index finger and middle finger.', tips: 'Thumb tip peeks upward between index and middle.' },
    { id: 'U', category: 'alphabet', name: 'Letter U', badge: 'Alphabet', image: 'assets/signs/U.png', desc: 'Index and middle fingers extended straight up and held tightly together.', tips: 'Keep both fingers parallel and touching.' },
    { id: 'V', category: 'alphabet', name: 'Letter V', badge: 'Alphabet', image: 'assets/signs/V.png', desc: 'Index and middle fingers extended in a spread "V" shape; other fingers closed.', tips: 'Spread index and middle apart with palm forward.' },
    { id: 'W', category: 'alphabet', name: 'Letter W', badge: 'Alphabet', image: 'assets/signs/W.png', desc: 'Index, middle, and ring fingers extended upward in a "W" shape; thumb holds pinky down.', tips: 'Keep the 3 fingers spread evenly.' },
    { id: 'X', category: 'alphabet', name: 'Letter X', badge: 'Alphabet', image: 'assets/signs/X.png', desc: 'Fist with index finger raised and bent into a curled hook shape.', tips: 'Looks like a small hook or talon.' },
    { id: 'Y', category: 'alphabet', name: 'Letter Y', badge: 'Alphabet', image: 'assets/signs/Y.png', desc: 'Thumb and pinky extended wide outwards while three middle fingers remain curled.', tips: 'Classic "hang loose" or phone silhouette.' },
    { id: 'Z', category: 'alphabet', name: 'Letter Z', badge: 'Alphabet', image: 'assets/signs/Z.png', desc: 'Index finger extended pointing forward; trace a "Z" pattern in the air.', tips: 'Dynamic sign: draw top bar, diagonal, and bottom bar.' },

    // Numbers 0 - 9 (10)
    { id: '0', category: 'numbers', name: 'Number 0', badge: 'Number', image: 'assets/signs/0.png', desc: 'All fingertips touch thumb tip forming an "O" shape.', tips: 'Identical to letter O in hand shape.' },
    { id: '1', category: 'numbers', name: 'Number 1', badge: 'Number', image: 'assets/signs/1.png', desc: 'Index finger extended straight up; other fingers closed into palm with thumb over them.', tips: 'Keep index finger vertical and palm facing outward.' },
    { id: '2', category: 'numbers', name: 'Number 2', badge: 'Number', image: 'assets/signs/2.png', desc: 'Index and middle fingers extended in a "V" shape; other fingers curled.', tips: 'Palm faces outward towards the viewer.' },
    { id: '3', category: 'numbers', name: 'Number 3', badge: 'Number', image: 'assets/signs/3.png', desc: 'Thumb, index, and middle fingers extended outward; ring and pinky curled into palm.', tips: 'In ASL, 3 uses thumb + index + middle.' },
    { id: '4', category: 'numbers', name: 'Number 4', badge: 'Number', image: 'assets/signs/4.png', desc: 'Four fingers extended straight up together; thumb folded across the palm.', tips: 'Keep four fingers spread slightly or together, thumb in.' },
    { id: '5', category: 'numbers', name: 'Number 5', badge: 'Number', image: 'assets/signs/5.png', desc: 'All five fingers extended open and spread wide facing the viewer.', tips: 'Fully open hand, palm forward.' },
    { id: '6', category: 'numbers', name: 'Number 6', badge: 'Number', image: 'assets/signs/6.png', desc: 'Thumb tip touches pinky tip; index, middle, and ring fingers stand upright.', tips: 'Pinky touches thumb; 3 fingers up.' },
    { id: '7', category: 'numbers', name: 'Number 7', badge: 'Number', image: 'assets/signs/7.png', desc: 'Thumb tip touches ring finger tip; index, middle, and pinky fingers stand upright.', tips: 'Ring finger touches thumb.' },
    { id: '8', category: 'numbers', name: 'Number 8', badge: 'Number', image: 'assets/signs/8.png', desc: 'Thumb tip touches middle finger tip; index, ring, and pinky fingers stand upright.', tips: 'Middle finger touches thumb.' },
    { id: '9', category: 'numbers', name: 'Number 9', badge: 'Number', image: 'assets/signs/9.png', desc: 'Thumb tip touches index finger tip forming circle; middle, ring, pinky upright.', tips: 'Middle, ring, and pinky stand upright.' },

    // Common Static Signs (10)
    { id: 'PEACE', category: 'signs', name: 'Peace / Victory', badge: 'Sign', image: 'assets/signs/PEACE.png', desc: 'Index and middle fingers extended in a wide V shape, palm facing forward.', tips: 'Universal peace gesture.' },
    { id: 'OK', category: 'signs', name: 'OK Sign', badge: 'Sign', image: 'assets/signs/OK.svg', desc: 'Thumb and index form circle; other three fingers straight up.', tips: 'Universal sign of approval or confirmation.' },
    { id: 'THUMBS_UP', category: 'signs', name: 'Thumbs Up', badge: 'Sign', image: 'assets/signs/THUMBS_UP.svg', desc: 'Closed fist with thumb extended straight up vertically.', tips: 'Indicates approval, agreement, or good.' },
    { id: 'THUMBS_DOWN', category: 'signs', name: 'Thumbs Down', badge: 'Sign', image: 'assets/signs/THUMBS_DOWN.svg', desc: 'Closed fist with thumb extended straight down vertically.', tips: 'Indicates disapproval or negative response.' },
    { id: 'I_LOVE_YOU', category: 'signs', name: 'I Love You (ILY)', badge: 'Sign', image: 'assets/signs/I_LOVE_YOU.svg', desc: 'Thumb, index, and pinky fingers extended; middle and ring fingers curled.', tips: 'Combines letters I, L, and Y into one universal sign.' },
    { id: 'ROCK_ON', category: 'signs', name: 'Rock On (Horns)', badge: 'Sign', image: 'assets/signs/ROCK_ON.svg', desc: 'Index and pinky fingers extended straight; thumb folds down middle and ring.', tips: 'Hold for 2 seconds to switch detection modes hands-free.' },
    { id: 'OPEN_PALM', category: 'signs', name: 'Open Palm (Stop)', badge: 'Sign', image: 'assets/signs/OPEN_PALM.png', desc: 'All five fingers straight and extended flat facing forward towards camera.', tips: 'Used for stop, wait, or open greetings.' },
    { id: 'FIST', category: 'signs', name: 'Closed Fist', badge: 'Sign', image: 'assets/signs/FIST.png', desc: 'All fingers curled firmly into palm with thumb wrapped across front.', tips: 'Solid resting baseline hand shape.' },
    { id: 'YES', category: 'signs', name: 'Yes (Nodding Fist)', badge: 'Sign', image: 'assets/signs/YES.svg', desc: 'Closed fist in "S" shape gently nodding up and down from the wrist.', tips: 'Simulates a nodding head.' },
    { id: 'HELLO', category: 'signs', name: 'Hello (Salute)', badge: 'Sign', image: 'assets/signs/HELLO.svg', desc: 'Flat open hand near brow moving slightly forward and outward.', tips: 'Traditional ASL greeting.' }
];

function injectDictionaryModalHTML() {
    if (document.getElementById('dictionary-modal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.className = 'dictionary-modal';
    modalDiv.id = 'dictionary-modal';
    modalDiv.setAttribute('role', 'dialog');
    modalDiv.setAttribute('aria-modal', 'true');
    modalDiv.setAttribute('aria-labelledby', 'dict-modal-title');

    modalDiv.innerHTML = `
        <div class="dictionary-card glass-panel">
            <div class="dict-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="brand-badge">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 class="dict-title" id="dict-modal-title">Visual Sign Dictionary &amp; Reference Guide</h2>
                        <p class="dict-subtitle">Illustrated guide for all 26 Letters, 10 Numbers, and Common Signs</p>
                    </div>
                </div>
                <button type="button" class="btn-close-dict" id="close-dictionary-btn" aria-label="Close Dictionary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <!-- Category Filters & Search -->
            <div class="dict-toolbar">
                <div class="dict-tabs" id="dict-category-tabs" role="tablist">
                    <button type="button" class="dict-tab active" data-dict-cat="all" role="tab" aria-selected="true">All (46)</button>
                    <button type="button" class="dict-tab" data-dict-cat="alphabet" role="tab" aria-selected="false">Letters A–Z (26)</button>
                    <button type="button" class="dict-tab" data-dict-cat="numbers" role="tab" aria-selected="false">Numbers 0–9 (10)</button>
                    <button type="button" class="dict-tab" data-dict-cat="signs" role="tab" aria-selected="false">Common Signs (10)</button>
                    <button type="button" class="dict-tab" data-dict-cat="chart" role="tab" aria-selected="false">Reference Chart</button>
                </div>
                <div class="dict-search-box" id="dict-search-container">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="dict-search-input" placeholder="Search letters, numbers, signs..." aria-label="Search dictionary">
                </div>
            </div>

            <!-- Dictionary Grid of Cards -->
            <div class="dict-grid scroll-container" id="dict-cards-grid">
                <!-- Cards injected dynamically -->
            </div>

            <!-- Reference Chart View -->
            <div class="dict-chart-view scroll-container" id="dict-chart-view" style="display: none; padding: 20px; overflow-y: auto;">
                <!-- Full Alphabet Chart -->
                <div style="max-width: 940px; margin: 0 auto 24px; background: var(--bg-surface-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <h3 style="font-size: 1.15rem; color: var(--text-primary); margin: 0; font-weight: 700;">American Sign Language Alphabet Chart (A–Z)</h3>
                            <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 3px 0 0;">Visual finger-spelling formation reference for all 26 manual alphabet letters.</p>
                        </div>
                        <a href="assets/signs/asl_alphabet_reference.jpg" target="_blank" class="btn secondary" style="font-size: 0.75rem; text-decoration: none; padding: 6px 14px;">
                            Open Full Size
                        </a>
                    </div>
                    <div style="background: #ffffff; border-radius: var(--radius-md); padding: 10px; display: flex; justify-content: center;">
                        <img src="assets/signs/asl_alphabet_reference.jpg" alt="ASL Full Alphabet Reference Chart" style="max-width: 100%; height: auto; display: block; border-radius: 4px;" />
                    </div>
                </div>

                <!-- Full Numbers Chart -->
                <div style="max-width: 940px; margin: 0 auto; background: var(--bg-surface-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <h3 style="font-size: 1.15rem; color: var(--text-primary); margin: 0; font-weight: 700;">American Sign Language Numbers Chart (0–9)</h3>
                            <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 3px 0 0;">Standard manual counting hand shapes from 0 through 9.</p>
                        </div>
                        <a href="assets/signs/asl_numbers_reference.png" target="_blank" class="btn secondary" style="font-size: 0.75rem; text-decoration: none; padding: 6px 14px;">
                            Open Full Size
                        </a>
                    </div>
                    <div style="background: #ffffff; border-radius: var(--radius-md); padding: 10px; display: flex; justify-content: center;">
                        <img src="assets/signs/asl_numbers_reference.png" alt="ASL Numbers Reference Chart" style="max-width: 100%; height: auto; display: block; border-radius: 4px;" />
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);
}

function initSignDictionary() {
    injectDictionaryModalHTML();

    const modal = document.getElementById('dictionary-modal');
    const openBtns = document.querySelectorAll('#open-dictionary-btn');
    const closeBtn = document.getElementById('close-dictionary-btn');
    const gridEl = document.getElementById('dict-cards-grid');
    const chartView = document.getElementById('dict-chart-view');
    const searchContainer = document.getElementById('dict-search-container');
    const tabsContainer = document.getElementById('dict-category-tabs');
    const searchInput = document.getElementById('dict-search-input');

    if (!modal || !gridEl) return;

    let activeCategory = 'all';
    let searchQuery = '';

    // In-page Lightbox modal for enlarged high-res sign inspection
    let lightboxEl = document.getElementById('dict-lightbox-modal');
    if (!lightboxEl) {
        lightboxEl = document.createElement('div');
        lightboxEl.id = 'dict-lightbox-modal';
        lightboxEl.className = 'dict-lightbox-modal';
        lightboxEl.style.display = 'none'; // Guard against any flash or unstyled render
        lightboxEl.innerHTML = `
            <div class="dict-lightbox-card">
                <button type="button" class="dict-lightbox-close" id="dict-lightbox-close-btn" aria-label="Close Preview">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span class="dict-badge" id="dict-lightbox-badge">Alphabet</span>
                    <span class="dict-token-id" id="dict-lightbox-id" style="font-size: 1.15rem;">ID</span>
                </div>
                <div class="dict-lightbox-img-wrap">
                    <img id="dict-lightbox-img" src="" alt="Sign preview" />
                </div>
                <div style="text-align: center; width: 100%;">
                    <div id="dict-lightbox-name" style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;"></div>
                    <div id="dict-lightbox-desc" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 8px;"></div>
                    <div id="dict-lightbox-tip" class="dict-card-tip"></div>
                </div>
            </div>
        `;
        document.body.appendChild(lightboxEl);

        const closeLightbox = () => {
            lightboxEl.classList.remove('open');
            lightboxEl.style.display = 'none';
        };
        lightboxEl.querySelector('#dict-lightbox-close-btn').addEventListener('click', closeLightbox);
        lightboxEl.addEventListener('click', (e) => {
            if (e.target === lightboxEl) closeLightbox();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightboxEl.classList.contains('open')) {
                closeLightbox();
            }
        });
    }

    function openLightbox(item) {
        const img = document.getElementById('dict-lightbox-img');
        const name = document.getElementById('dict-lightbox-name');
        const desc = document.getElementById('dict-lightbox-desc');
        const tip = document.getElementById('dict-lightbox-tip');
        const badge = document.getElementById('dict-lightbox-badge');
        const id = document.getElementById('dict-lightbox-id');
        const imgUrl = item.image.includes('?') ? item.image : `${item.image}?v=3.2.0`;

        if (img) {
            img.src = imgUrl;
            img.alt = item.name;
        }
        if (name) name.textContent = item.name;
        if (desc) desc.textContent = item.desc;
        if (tip) tip.textContent = `Tip: ${item.tips}`;
        if (badge) badge.textContent = item.badge;
        if (id) id.textContent = item.id;

        lightboxEl.style.display = 'flex';
        lightboxEl.classList.add('open');
    }

    function renderCards() {
        if (activeCategory === 'chart') {
            gridEl.style.display = 'none';
            if (chartView) chartView.style.display = 'block';
            if (searchContainer) searchContainer.style.visibility = 'hidden';
            return;
        }

        gridEl.style.display = 'grid';
        if (chartView) chartView.style.display = 'none';
        if (searchContainer) searchContainer.style.visibility = 'visible';

        gridEl.innerHTML = '';

        const filtered = SIGN_DICTIONARY_DATA.filter(item => {
            const matchesCat = activeCategory === 'all' || item.category === activeCategory;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q ||
                item.name.toLowerCase().includes(q) ||
                item.id.toLowerCase().includes(q) ||
                item.desc.toLowerCase().includes(q) ||
                item.tips.toLowerCase().includes(q);
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            gridEl.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-tertiary);">
                    <p style="font-size: 0.95rem; margin-bottom: 6px;">No signs found matching "${searchQuery}"</p>
                    <span style="font-size: 0.78rem;">Try searching for a letter, number, or word like "peace" or "hello"</span>
                </div>
            `;
            return;
        }

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'dict-sign-card';
            const imgUrl = item.image.includes('?') ? item.image : `${item.image}?v=3.2.0`;

            card.innerHTML = `
                <div class="dict-card-top">
                    <div class="dict-card-header">
                        <span class="dict-badge">${item.badge}</span>
                        <span class="dict-token-id">${item.id}</span>
                    </div>
                    <div class="dict-card-visual" title="Click to enlarge ${item.name}" role="button" tabindex="0">
                        <img src="${imgUrl}" alt="${item.name}" loading="lazy" />
                    </div>
                </div>
                <div class="dict-card-name">${item.name}</div>
                <div class="dict-card-desc">${item.desc}</div>
                <div class="dict-card-tip">Tip: ${item.tips}</div>
                <button type="button" class="btn secondary btn-try-sign" data-id="${item.id}" data-cat="${item.category}">
                    Practice Sign
                </button>
            `;

            // Lightbox zoom on clicking visual
            const visualEl = card.querySelector('.dict-card-visual');
            if (visualEl) {
                const triggerLightbox = (e) => {
                    e.stopPropagation();
                    openLightbox(item);
                };
                visualEl.addEventListener('click', triggerLightbox);
                visualEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        triggerLightbox(e);
                    }
                });
            }

            // Practice Sign Button Action
            const tryBtn = card.querySelector('.btn-try-sign');
            if (tryBtn) {
                tryBtn.addEventListener('click', () => {
                    const targetMode = item.category === 'alphabet' ? 'alphabet'
                        : item.category === 'numbers' ? 'numbers'
                        : 'signs';

                    // If on index.html: trigger mode button
                    const modeBtn = document.getElementById('mode-btn-' + targetMode);
                    if (modeBtn) {
                        modeBtn.click();
                        closeModal();
                    } else {
                        // If on quiz.html or chat.html: redirect to index.html with target mode
                        window.location.href = `index.html?mode=${targetMode}&sign=${encodeURIComponent(item.id)}`;
                    }
                });
            }

            gridEl.appendChild(card);
        });
    }

    function openModal() {
        modal.classList.add('open');
        renderCards();
        if (searchInput && activeCategory !== 'chart') searchInput.focus();
    }

    function closeModal() {
        modal.classList.remove('open');
    }

    openBtns.forEach(btn => btn.addEventListener('click', openModal));
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            if (lightboxEl && lightboxEl.classList.contains('open')) {
                return; // Let lightbox close first
            }
            closeModal();
        }
    });

    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.dict-tab');
            if (!tab) return;

            tabsContainer.querySelectorAll('.dict-tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            activeCategory = tab.dataset.dictCat || 'all';
            renderCards();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderCards();
        });
    }

    // Initial render
    renderCards();
}

// Auto-run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSignDictionary);
} else {
    initSignDictionary();
}
