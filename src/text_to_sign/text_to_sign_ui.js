/**
 * Text-to-Sign UI Controller
 * 
 * Coordinates the DOM interface, sentence input, validation,
 * interactive timeline chips, playback controls, and 3D AvatarEngine.
 */

import { AvatarEngine } from './avatar_engine.js';
import { translateSentenceToSign, MAX_SENTENCE_LENGTH } from './text_to_sign_service.js';

export class TextToSignUI {
  constructor() {
    this.engine = null;
    this.currentData = null;
    this.isPracticeMode = false;
    this.selectedSpeed = 1.0;
    this.sentences = [];
    this.filteredSentences = [];
    this.browserPage = 1;
    this.browserPageSize = 8;
    this.currentSentenceIndex = 0;
    this.activeSentenceId = null;

    this._cacheDOM();
    this._initEngine();
    this._bindEvents();
    this._loadSentenceLibrary();
    this._handleInitialRoute();
  }

  _cacheDOM() {
    // Top-level tabs
    this.tabPracticeBtn = document.getElementById('tab-mode-practice');
    this.tabSpeedBtn = document.getElementById('tab-mode-speed');
    this.tabT2SBtn = document.getElementById('tab-mode-t2s');
    this.quizWorkspace = document.getElementById('quiz-workspace');
    this.t2sWorkspace = document.getElementById('text-to-sign-workspace');

    // Input elements
    this.inputForm = document.getElementById('t2s-form');
    this.inputField = document.getElementById('t2s-input');
    this.charCountEl = document.getElementById('t2s-char-count');
    this.translateBtn = document.getElementById('t2s-translate-btn');
    this.errorAlert = document.getElementById('t2s-error-alert');
    this.errorText = document.getElementById('t2s-error-text');
    this.exampleChips = document.querySelectorAll('.t2s-example-chip');

    // Avatar viewport & HUD
    this.avatarContainer = document.getElementById('t2s-avatar-container');
    this.avatarLoading = document.getElementById('t2s-avatar-loading');
    this.activeSignCaption = document.getElementById('t2s-caption-text');
    this.captionTypeBadge = document.getElementById('t2s-caption-type');
    this.practiceBanner = document.getElementById('t2s-practice-banner');
    this.practiceNextBtn = document.getElementById('t2s-practice-next-btn');

    // Controls
    this.playPauseBtn = document.getElementById('t2s-play-pause-btn');
    this.playPauseText = document.getElementById('t2s-play-pause-text');
    this.replayBtn = document.getElementById('t2s-replay-btn');
    this.prevSignBtn = document.getElementById('t2s-prev-sign-btn');
    this.nextSignBtn = document.getElementById('t2s-next-sign-btn');
    this.speedSelect = document.getElementById('t2s-speed-select');
    this.practiceModeToggle = document.getElementById('t2s-practice-toggle');

    // Timeline & Sign List
    this.timelineContainer = document.getElementById('t2s-timeline');
    this.timelinePlaceholder = document.getElementById('t2s-timeline-placeholder');
    this.signsListContainer = document.getElementById('t2s-signs-list');
    this.signsListCount = document.getElementById('t2s-signs-count');
    this.translationModeBadge = document.getElementById('t2s-mode-badge');

    // Sentence Browser DOM elements
    this.browserCard = document.getElementById('t2s-browser-card');
    this.browserSearch = document.getElementById('t2s-browser-search');
    this.browserCategory = document.getElementById('t2s-browser-category');
    this.browserDifficulty = document.getElementById('t2s-browser-difficulty');
    this.browserList = document.getElementById('t2s-browser-list');
    this.browserShowingCount = document.getElementById('t2s-browser-showing-count');
    this.browserTotalBadge = document.getElementById('t2s-browser-total-badge');
    this.browserRandomBtn = document.getElementById('t2s-browser-random-btn');
    this.browserNextBtn = document.getElementById('t2s-browser-next-btn');
    this.browserPrevPageBtn = document.getElementById('t2s-browser-prev-page');
    this.browserNextPageBtn = document.getElementById('t2s-browser-next-page');
    this.browserPageInfo = document.getElementById('t2s-browser-page-info');
  }

  _initEngine() {
    if (!this.avatarContainer) return;

    this.engine = new AvatarEngine(this.avatarContainer, {
      modelUrl: 'assets/models/ybot.glb',
      speed: this.selectedSpeed,
      practiceMode: this.isPracticeMode,
      onStateChange: (state) => this._onEngineStateChange(state),
      onProgress: (progress) => this._onEngineProgress(progress),
    });
  }

  _bindEvents() {
    // Mode Switcher Tabs
    if (this.tabQuizBtn && this.tabT2SBtn) {
      this.tabQuizBtn.addEventListener('click', () => this.switchTab('quiz'));
      this.tabT2SBtn.addEventListener('click', () => this.switchTab('t2s'));
    }

    window.addEventListener('t2s-tab-activated', () => {
      this.switchTab('t2s');
    });

    // Input character counter & Enter submission
    if (this.inputField) {
      this.inputField.addEventListener('input', () => {
        const len = this.inputField.value.length;
        if (this.charCountEl) {
          this.charCountEl.textContent = `${len} / ${MAX_SENTENCE_LENGTH}`;
          this.charCountEl.style.color = len > MAX_SENTENCE_LENGTH ? 'var(--accent-rose)' : 'var(--text-tertiary)';
        }
        this._hideError();
      });

      this.inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleTranslate();
        }
      });
    }

    if (this.inputForm) {
      this.inputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTranslate();
      });
    }

    if (this.translateBtn) {
      this.translateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleTranslate();
      });
    }

    // Clickable Example Sentence Pills
    this.exampleChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-text') || chip.textContent.trim();
        if (this.inputField) {
          this.inputField.value = text;
          if (this.charCountEl) this.charCountEl.textContent = `${text.length} / ${MAX_SENTENCE_LENGTH}`;
          this.handleTranslate();
        }
      });
    });

    // Controls
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => {
        if (this.engine) this.engine.togglePlayPause();
      });
    }

    if (this.replayBtn) {
      this.replayBtn.addEventListener('click', () => {
        if (this.engine) this.engine.replay();
      });
    }

    if (this.prevSignBtn) {
      this.prevSignBtn.addEventListener('click', () => {
        if (this.engine) this.engine.stepPrevious();
      });
    }

    if (this.nextSignBtn) {
      this.nextSignBtn.addEventListener('click', () => {
        if (this.engine) this.engine.stepNext();
      });
    }

    if (this.speedSelect) {
      this.speedSelect.addEventListener('change', (e) => {
        this.selectedSpeed = parseFloat(e.target.value) || 1.0;
        if (this.engine) this.engine.setSpeed(this.selectedSpeed);
      });
    }

    if (this.practiceModeToggle) {
      this.practiceModeToggle.addEventListener('change', (e) => {
        this.isPracticeMode = !!e.target.checked;
        if (this.engine) this.engine.setPracticeMode(this.isPracticeMode);
        if (this.practiceBanner && !this.isPracticeMode) {
          this.practiceBanner.classList.add('hidden');
        }
      });
    }

    if (this.practiceNextBtn) {
      this.practiceNextBtn.addEventListener('click', () => {
        if (this.practiceBanner) this.practiceBanner.classList.add('hidden');
        if (this.engine) this.engine.stepNext();
      });
    }

    // Sentence Browser Filters & Navigation
    if (this.browserSearch) {
      this.browserSearch.addEventListener('input', () => this._applyBrowserFilters());
    }
    if (this.browserCategory) {
      this.browserCategory.addEventListener('change', () => this._applyBrowserFilters());
    }
    if (this.browserDifficulty) {
      this.browserDifficulty.addEventListener('change', () => this._applyBrowserFilters());
    }
    if (this.browserRandomBtn) {
      this.browserRandomBtn.addEventListener('click', () => this.playRandomSentence());
    }
    if (this.browserNextBtn) {
      this.browserNextBtn.addEventListener('click', () => this.playNextSentence());
    }
    if (this.browserPrevPageBtn) {
      this.browserPrevPageBtn.addEventListener('click', () => {
        if (this.browserPage > 1) {
          this.browserPage--;
          this._renderBrowserList();
        }
      });
    }
    if (this.browserNextPageBtn) {
      this.browserNextPageBtn.addEventListener('click', () => {
        const maxPage = Math.max(1, Math.ceil(this.filteredSentences.length / this.browserPageSize));
        if (this.browserPage < maxPage) {
          this.browserPage++;
          this._renderBrowserList();
        }
      });
    }
  }

  _handleInitialRoute() {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') || params.get('tool');
    if (tabParam === 'text-to-sign' || tabParam === 't2s') {
      this.switchTab('t2s');
    }
    const initialText = params.get('text');
    if (initialText && this.inputField) {
      this.inputField.value = initialText;
      setTimeout(() => this.handleTranslate(), 300);
    }
  }

  switchTab(tab) {
    if (typeof window.switchPracticeLabTab === 'function') {
      window.switchPracticeLabTab(tab);
    }
    if (tab === 't2s' && this.engine && this.engine._resize) {
      setTimeout(() => this.engine._resize(), 50);
    }
  }

  async handleTranslate() {
    const rawText = this.inputField ? this.inputField.value : '';
    this._hideError();

    if (!rawText.trim()) {
      this._showError('Please enter a sentence to translate.');
      return;
    }

    this._setTranslatingState(true);

    try {
      const data = await translateSentenceToSign(rawText);
      this.currentData = data;
      this._renderTimeline(data);
      this._renderSignsList(data);

      if (this.translationModeBadge) {
        this.translationModeBadge.textContent = data.mode === 'online' ? 'Gemini AI' : 'Offline ISL NLP';
        this.translationModeBadge.className = `status-badge ${data.mode === 'online' ? 'connected' : 'calibrated'}`;
      }

      if (data.warnings && data.warnings.length > 0) {
        this._showWarning(data.warnings.join(' '));
      }

      if (this.engine) {
        this.engine.setTokens(data.tokens);
        this.engine.play();
      }
    } catch (err) {
      this._showError(err.message || 'Translation failed.');
    } finally {
      this._setTranslatingState(false);
    }
  }

  _renderTimeline(data) {
    if (!this.timelineContainer) return;
    this.timelineContainer.innerHTML = '';

    if (this.timelinePlaceholder) {
      this.timelinePlaceholder.style.display = 'none';
    }

    data.tokens.forEach((tokenObj, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `t2s-token-chip ${tokenObj.type === 'fingerspell' ? 'is-fingerspell' : 'is-word'}`;
      chip.id = `t2s-token-chip-${idx}`;
      chip.setAttribute('data-index', idx);
      chip.title = `Click to replay ${tokenObj.word} (${tokenObj.type})`;

      const badge = tokenObj.type === 'fingerspell' ? 'abc' : 'sign';
      chip.innerHTML = `
        <span class="chip-type-tag">${badge}</span>
        <span class="chip-word">${tokenObj.word}</span>
      `;

      chip.addEventListener('click', () => {
        if (this.engine) {
          this.engine.replaySingleSign(idx);
        }
      });

      this.timelineContainer.appendChild(chip);
    });
  }

  _renderSignsList(data) {
    if (!this.signsListContainer) return;
    this.signsListContainer.innerHTML = '';

    if (this.signsListCount) {
      this.signsListCount.textContent = `${data.tokens.length} signs`;
    }

    data.tokens.forEach((tokenObj, idx) => {
      const row = document.createElement('div');
      row.className = 't2s-sign-card glass-panel-sm';
      row.id = `t2s-sign-row-${idx}`;

      const isFingerspell = tokenObj.type === 'fingerspell';
      const badgeClass = isFingerspell ? 'badge-amber' : 'badge-emerald';
      const badgeText = isFingerspell ? 'Fingerspell (A-Z)' : 'Whole Sign';

      row.innerHTML = `
        <div class="sign-meta-left">
          <span class="sign-index-num">#${idx + 1}</span>
          <span class="sign-token-name">${tokenObj.word}</span>
          <span class="sign-type-pill ${badgeClass}">${badgeText}</span>
        </div>
        <div class="sign-meta-right">
          <span class="sign-duration">${tokenObj.duration}ms</span>
          <button type="button" class="btn-mini-play" title="Play ${tokenObj.word}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
        </div>
      `;

      const playBtn = row.querySelector('.btn-mini-play');
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.engine) this.engine.replaySingleSign(idx);
        });
      }

      this.signsListContainer.appendChild(row);
    });
  }

  _onEngineStateChange(state) {
    if (state === 'loading') {
      if (this.avatarLoading) this.avatarLoading.style.display = 'flex';
      if (this.translateBtn) this.translateBtn.disabled = true;
    } else if (state === 'ready') {
      if (this.avatarLoading) this.avatarLoading.style.display = 'none';
      if (this.translateBtn) this.translateBtn.disabled = false;
      this._updatePlayButton(false);
      if (this.practiceBanner) this.practiceBanner.classList.add('hidden');
    } else if (state === 'signing') {
      if (this.avatarLoading) this.avatarLoading.style.display = 'none';
      this._updatePlayButton(true);
      if (this.practiceBanner) this.practiceBanner.classList.add('hidden');
    } else if (state === 'paused') {
      this._updatePlayButton(false);
    } else if (state === 'practice_pause') {
      this._updatePlayButton(false);
      if (this.practiceBanner) {
        this.practiceBanner.classList.remove('hidden');
      }
    } else if (state === 'completed') {
      this._updatePlayButton(false);
      if (this.practiceBanner) this.practiceBanner.classList.add('hidden');
      this._clearActiveChips();
      if (this.activeSignCaption) {
        this.activeSignCaption.textContent = 'Playback Complete';
      }
      if (this.captionTypeBadge) {
        this.captionTypeBadge.textContent = 'Done';
      }
    } else if (state === 'error') {
      if (this.avatarLoading) this.avatarLoading.style.display = 'none';
      this._showError('Failed to initialize 3D avatar canvas.');
    }
  }

  _onEngineProgress(progress) {
    const { currentSignIndex, currentToken, isFingerspelling, letter } = progress;

    if (currentSignIndex < 0 || !currentToken) {
      if (this.activeSignCaption) this.activeSignCaption.textContent = 'Ready';
      if (this.captionTypeBadge) this.captionTypeBadge.textContent = 'Idle';
      this._clearActiveChips();
      return;
    }

    // Update Caption HUD
    if (this.activeSignCaption) {
      this.activeSignCaption.textContent = isFingerspelling && letter
        ? `Letter: ${letter}`
        : currentToken;
    }
    if (this.captionTypeBadge) {
      this.captionTypeBadge.textContent = isFingerspelling ? 'Fingerspelling' : 'ISL Sign';
      this.captionTypeBadge.className = `t2s-caption-badge ${isFingerspelling ? 'badge-amber' : 'badge-emerald'}`;
    }

    // Highlight timeline chips
    this._highlightActiveChip(currentSignIndex);
  }

  _highlightActiveChip(index) {
    if (!this.timelineContainer) return;
    const chips = this.timelineContainer.querySelectorAll('.t2s-token-chip');
    chips.forEach((c, idx) => {
      if (idx === index) {
        c.classList.add('active-chip');
        c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        c.classList.remove('active-chip');
      }
      if (idx < index) {
        c.classList.add('passed-chip');
      } else {
        c.classList.remove('passed-chip');
      }
    });

    // Also highlight row in Signs Used list
    if (this.signsListContainer) {
      const rows = this.signsListContainer.querySelectorAll('.t2s-sign-card');
      rows.forEach((r, idx) => {
        if (idx === index) {
          r.classList.add('active-row');
          r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          r.classList.remove('active-row');
        }
      });
    }
  }

  _clearActiveChips() {
    if (this.timelineContainer) {
      this.timelineContainer.querySelectorAll('.t2s-token-chip').forEach((c) => {
        c.classList.remove('active-chip');
      });
    }
    if (this.signsListContainer) {
      this.signsListContainer.querySelectorAll('.t2s-sign-card').forEach((r) => {
        r.classList.remove('active-row');
      });
    }
  }

  _updatePlayButton(isPlaying) {
    if (!this.playPauseBtn) return;
    if (isPlaying) {
      this.playPauseBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        <span>Pause</span>
      `;
    } else {
      this.playPauseBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Play</span>
      `;
    }
  }

  async _loadSentenceLibrary() {
    try {
      let res = await fetch('assets/data/practice_sentences.json');
      if (!res.ok) {
        res = await fetch('sentences.json');
      }
      if (res.ok) {
        this.sentences = await res.json();
        if (this.browserTotalBadge) {
          this.browserTotalBadge.textContent = `${this.sentences.length} Sentences`;
        }
        this._applyBrowserFilters();
      }
    } catch (e) {
      console.warn('Could not load sentence library:', e);
      if (this.browserShowingCount) {
        this.browserShowingCount.textContent = 'Unable to load sentence library';
      }
    }
  }

  _applyBrowserFilters() {
    const query = (this.browserSearch ? this.browserSearch.value : '').toLowerCase().trim();
    const cat = this.browserCategory ? this.browserCategory.value : 'all';
    const diff = this.browserDifficulty ? this.browserDifficulty.value : 'all';

    this.filteredSentences = this.sentences.filter((s) => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (diff !== 'all' && s.difficulty !== diff) return false;
      if (query) {
        const textMatch = s.text.toLowerCase().includes(query);
        const catMatch = s.category.toLowerCase().includes(query);
        const glossMatch = s.gloss ? s.gloss.toLowerCase().includes(query) : false;
        if (!textMatch && !catMatch && !glossMatch) return false;
      }
      return true;
    });

    this.browserPage = 1;
    this._renderBrowserList();
  }

  _renderBrowserList() {
    if (!this.browserList) return;
    this.browserList.innerHTML = '';

    const total = this.filteredSentences.length;
    const totalPages = Math.max(1, Math.ceil(total / this.browserPageSize));
    this.browserPage = Math.min(this.browserPage, totalPages);

    if (this.browserShowingCount) {
      const start = total === 0 ? 0 : (this.browserPage - 1) * this.browserPageSize + 1;
      const end = Math.min(start + this.browserPageSize - 1, total);
      this.browserShowingCount.textContent = `Showing ${start}–${end} of ${total} practice sentences`;
    }

    if (this.browserPageInfo) {
      this.browserPageInfo.textContent = `Page ${this.browserPage} of ${totalPages}`;
    }
    if (this.browserPrevPageBtn) {
      this.browserPrevPageBtn.disabled = this.browserPage <= 1;
    }
    if (this.browserNextPageBtn) {
      this.browserNextPageBtn.disabled = this.browserPage >= totalPages;
    }

    if (total === 0) {
      this.browserList.innerHTML = '<div class="t2s-empty-list-notice">No practice sentences match the filters.</div>';
      return;
    }

    const startIdx = (this.browserPage - 1) * this.browserPageSize;
    const pageItems = this.filteredSentences.slice(startIdx, startIdx + this.browserPageSize);

    pageItems.forEach((s) => {
      const itemEl = document.createElement('div');
      itemEl.className = `t2s-sentence-item ${s.id === this.activeSentenceId ? 'is-active' : ''}`;
      itemEl.setAttribute('role', 'listitem');
      itemEl.setAttribute('tabindex', '0');
      itemEl.setAttribute('aria-label', `Practice sentence: ${s.text}, difficulty: ${s.difficulty}`);

      const signCount = (s.signs && s.signs.length) || s.word_count || 1;

      itemEl.innerHTML = `
        <div class="t2s-sentence-info">
          <div class="t2s-sentence-text">${s.text}</div>
          <div class="t2s-sentence-tags">
            <span class="t2s-diff-badge ${s.difficulty}">${s.difficulty}</span>
            <span class="t2s-cat-tag">${s.category}</span>
            <span class="t2s-sign-count-tag">${signCount} signs</span>
          </div>
        </div>
        <button type="button" class="t2s-sentence-play-btn" aria-label="Play ${s.text}" title="Play on 3D avatar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
      `;

      const selectSentence = () => {
        this.selectAndPlaySentence(s);
      };

      itemEl.addEventListener('click', selectSentence);
      itemEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectSentence();
        }
      });

      this.browserList.appendChild(itemEl);
    });
  }

  selectAndPlaySentence(sentenceObj) {
    if (!sentenceObj) return;
    this.activeSentenceId = sentenceObj.id;
    const globalIdx = this.filteredSentences.findIndex((s) => s.id === sentenceObj.id);
    if (globalIdx !== -1) this.currentSentenceIndex = globalIdx;

    if (this.inputField) {
      this.inputField.value = sentenceObj.text;
      if (this.charCountEl) {
        this.charCountEl.textContent = `${sentenceObj.text.length} / ${MAX_SENTENCE_LENGTH}`;
      }
    }

    if (this.browserList) {
      const items = this.browserList.querySelectorAll('.t2s-sentence-item');
      items.forEach((el) => {
        const text = el.querySelector('.t2s-sentence-text')?.textContent;
        if (text === sentenceObj.text) {
          el.classList.add('is-active');
        } else {
          el.classList.remove('is-active');
        }
      });
    }

    this.handleTranslate();

    if (window.innerWidth < 900 && this.avatarContainer) {
      this.avatarContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  playRandomSentence() {
    const pool = this.filteredSentences.length > 0 ? this.filteredSentences : this.sentences;
    if (!pool || pool.length === 0) return;
    const randIdx = Math.floor(Math.random() * pool.length);
    this.selectAndPlaySentence(pool[randIdx]);
  }

  playNextSentence() {
    const pool = this.filteredSentences.length > 0 ? this.filteredSentences : this.sentences;
    if (!pool || pool.length === 0) return;
    this.currentSentenceIndex = (this.currentSentenceIndex + 1) % pool.length;
    this.selectAndPlaySentence(pool[this.currentSentenceIndex]);
  }

  _setTranslatingState(isLoading) {
    if (this.translateBtn) {
      this.translateBtn.disabled = isLoading;
      const span = this.translateBtn.querySelector('span');
      if (span) span.textContent = isLoading ? 'Translating…' : 'Translate & Sign';
    }
  }

  _showError(msg) {
    if (this.errorAlert && this.errorText) {
      this.errorText.textContent = msg;
      this.errorAlert.style.display = 'flex';
    }
  }

  _showWarning(msg) {
    if (this.errorAlert && this.errorText) {
      this.errorText.textContent = msg;
      this.errorAlert.style.display = 'flex';
    }
  }

  _hideError() {
    if (this.errorAlert) {
      this.errorAlert.style.display = 'none';
    }
  }
}

// Auto-instantiate when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TextToSignUI());
  } else {
    new TextToSignUI();
  }
}

