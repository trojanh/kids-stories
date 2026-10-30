/**
 * playlist.js - TalePickle Story Playlist & Continuous Autoplay Engine
 * Enables children and parents to curate a queue of illustrated fables
 * and listen to them hands-free back-to-back with seamless auto-advance.
 */

(function (global) {
  'use strict';

  const STORAGE_KEY_PLAYLIST = 'talepickle_playlist_v1';
  const STORAGE_KEY_SETTINGS = 'talepickle_playlist_settings';

  class PlaylistEngine {
    constructor() {
      this.items = []; // Array of story IDs in order
      this.currentIndex = -1;
      this.isPlaylistMode = false;
      this.isLooping = false;
      this.sleepTimerMinutes = null;
      this.sleepTimerExpiresAt = null;
      this.sleepTimerInterval = null;
      this.countdownTimer = null;
      this.countdownProgressInterval = null;
      this.listeners = new Set();

      this.loadFromStorage();
      this.initSleepTimerMonitor();
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PLAYLIST);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.items = parsed;
          }
        }
        const settingsRaw = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (settingsRaw) {
          const s = JSON.parse(settingsRaw);
          this.isLooping = Boolean(s.isLooping);
          if (s.sleepTimerExpiresAt && s.sleepTimerExpiresAt > Date.now()) {
            this.sleepTimerExpiresAt = s.sleepTimerExpiresAt;
            this.sleepTimerMinutes = s.sleepTimerMinutes;
          }
        }
      } catch (e) {
        console.warn('[Playlist] Error loading from storage:', e);
        this.items = [];
      }
    }

    saveToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(this.items));
        localStorage.setItem(
          STORAGE_KEY_SETTINGS,
          JSON.stringify({
            isLooping: this.isLooping,
            sleepTimerMinutes: this.sleepTimerMinutes,
            sleepTimerExpiresAt: this.sleepTimerExpiresAt,
          })
        );
      } catch (e) {
        console.warn('[Playlist] Error saving to storage:', e);
      }
    }

    notifyChange() {
      this.saveToStorage();
      this.updateHeaderBadge();
      this.renderDrawer();
      this.updateCardButtons();
      this.listeners.forEach((fn) => {
        try {
          fn(this.getState());
        } catch (err) {}
      });
    }

    onChange(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    getState() {
      return {
        items: [...this.items],
        currentIndex: this.currentIndex,
        isPlaylistMode: this.isPlaylistMode,
        isLooping: this.isLooping,
        sleepTimerMinutes: this.sleepTimerMinutes,
        sleepTimerExpiresAt: this.sleepTimerExpiresAt,
        count: this.items.length,
      };
    }

    has(storyId) {
      return this.items.includes(storyId);
    }

    getPosition(storyId) {
      const idx = this.items.indexOf(storyId);
      return idx >= 0 ? idx + 1 : 0;
    }

    add(storyId, silent = false, event = null) {
      if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
      }
      if (!storyId || this.has(storyId)) return;
      this.items.push(storyId);
      this.notifyChange();
      if (!silent) {
        const title = this.getStoryTitle(storyId);
        this.showToast(`🎵 Added "${title}" to playlist (${this.items.length})`);
      }
    }

    remove(storyId, silent = false, event = null) {
      if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
      }
      const idx = this.items.indexOf(storyId);
      if (idx === -1) return;
      this.items.splice(idx, 1);
      if (this.currentIndex >= this.items.length) {
        this.currentIndex = Math.max(0, this.items.length - 1);
      }
      this.notifyChange();
      if (!silent) {
        const title = this.getStoryTitle(storyId);
        this.showToast(`Removed "${title}" from playlist`);
      }
    }

    toggle(storyId, event = null) {
      if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      }
      if (this.has(storyId)) {
        this.remove(storyId, false, event);
      } else {
        this.add(storyId, false, event);
      }
    }

    moveUp(index) {
      if (index <= 0 || index >= this.items.length) return;
      const tmp = this.items[index - 1];
      this.items[index - 1] = this.items[index];
      this.items[index] = tmp;
      if (this.currentIndex === index) this.currentIndex = index - 1;
      else if (this.currentIndex === index - 1) this.currentIndex = index;
      this.notifyChange();
    }

    moveDown(index) {
      if (index < 0 || index >= this.items.length - 1) return;
      const tmp = this.items[index + 1];
      this.items[index + 1] = this.items[index];
      this.items[index] = tmp;
      if (this.currentIndex === index) this.currentIndex = index + 1;
      else if (this.currentIndex === index + 1) this.currentIndex = index;
      this.notifyChange();
    }

    shuffle() {
      if (this.items.length <= 1) return;
      // Fisher-Yates shuffle
      const currentStoryId = this.items[this.currentIndex];
      for (let i = this.items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
      }
      if (currentStoryId) {
        this.currentIndex = this.items.indexOf(currentStoryId);
      }
      this.notifyChange();
      this.showToast('🔀 Playlist shuffled');
    }

    clear() {
      this.items = [];
      this.currentIndex = -1;
      this.isPlaylistMode = false;
      this.notifyChange();
      this.showToast('🗑️ Playlist cleared');
    }

    addBedtimePreset(allStories) {
      if (!allStories || allStories.length === 0) return;
      // Pick 4 gentle, highly rated animal fables
      const candidates = [
        'the_tortoise_and_the_hare',
        'the_lion_and_the_mouse',
        'the_ant_and_the_dove',
        'the_little_firefly',
        'crow_and_water_pot',
        'belling_the_cat',
      ];
      let added = 0;
      candidates.forEach((id) => {
        if (!this.has(id)) {
          const match = allStories.find((s) => s.id === id);
          if (match) {
            this.items.push(match.id);
            added++;
          }
        }
      });
      // Fallback: pick any 3 stories if none matched
      if (added === 0) {
        allStories.slice(0, 3).forEach((s) => {
          if (!this.has(s.id)) {
            this.items.push(s.id);
            added++;
          }
        });
      }
      this.notifyChange();
      this.showToast(`🌙 Added ${added} bedtime stories to queue!`);
    }

    getStory(storyId) {
      const stories = (global.StoryApp && global.StoryApp.getStories && global.StoryApp.getStories()) || [];
      return stories.find((s) => s.id === storyId) || null;
    }

    getStoryTitle(storyId) {
      const s = this.getStory(storyId);
      return s ? s.title : storyId.replace(/_/g, ' ');
    }

    calculateTotalDurationMinutes() {
      let totalSentences = 0;
      this.items.forEach((id) => {
        const s = this.getStory(id);
        totalSentences += (s && s.text ? s.text.length : 6);
      });
      // Average 10 seconds per sentence + 10s moral pause
      const totalSeconds = totalSentences * 10 + this.items.length * 10;
      return Math.max(1, Math.round(totalSeconds / 60));
    }

    // ==========================================================
    // PLAYBACK ORCHESTRATION
    // ==========================================================

    playAll(startIndex = 0) {
      if (this.items.length === 0) {
        this.showToast('⚠️ Playlist is empty. Add stories first!');
        return;
      }
      const idx = Math.max(0, Math.min(startIndex, this.items.length - 1));
      this.isPlaylistMode = true;
      this.currentIndex = idx;
      this.closeDrawer();

      const storyId = this.items[idx];
      this.navigateToStoryInPlaylistMode(storyId);
    }

    navigateToStoryInPlaylistMode(storyId) {
      this.cancelCountdown();
      if (global.StoryApp && global.StoryApp.goToStory) {
        global.StoryApp.goToStory(storyId);
      } else {
        window.location.hash = `story=${encodeURIComponent(storyId)}`;
      }

      // Ensure auto-advance is enabled so sentences sequence automatically
      if (global.StoryApp && global.StoryApp.setAutoAdvance) {
        global.StoryApp.setAutoAdvance(true);
      }

      // Wait for reader DOM to render, then auto-start audio narration
      setTimeout(() => {
        if (this.isPlaylistMode && global.StoryApp && global.StoryApp.startNarration) {
          global.StoryApp.startNarration();
        }
      }, 700);

      this.updateHeaderBadge();
    }

    playNext() {
      this.cancelCountdown();
      if (!this.isPlaylistMode || this.items.length === 0) return;

      const nextIndex = this.currentIndex + 1;
      if (nextIndex < this.items.length) {
        this.currentIndex = nextIndex;
        this.navigateToStoryInPlaylistMode(this.items[nextIndex]);
      } else if (this.isLooping) {
        this.currentIndex = 0;
        this.navigateToStoryInPlaylistMode(this.items[0]);
      } else {
        this.isPlaylistMode = false;
        this.showPlaylistCompleteCelebration();
      }
    }

    playPrev() {
      this.cancelCountdown();
      if (!this.isPlaylistMode || this.items.length === 0) return;
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.navigateToStoryInPlaylistMode(this.items[this.currentIndex]);
      }
    }

    stopPlaylistMode() {
      this.isPlaylistMode = false;
      this.cancelCountdown();
      this.updateHeaderBadge();
    }

    isPlaylistModeActive() {
      return this.isPlaylistMode;
    }

    getCurrentItemInfo() {
      if (!this.isPlaylistMode || this.currentIndex < 0 || this.currentIndex >= this.items.length) {
        return null;
      }
      const curId = this.items[this.currentIndex];
      const nextId = this.currentIndex + 1 < this.items.length ? this.items[this.currentIndex + 1] : (this.isLooping ? this.items[0] : null);
      return {
        currentIndex: this.currentIndex,
        total: this.items.length,
        currentStory: this.getStory(curId),
        nextStory: nextId ? this.getStory(nextId) : null,
      };
    }

    // Called when a story finishes reading and moral is presented
    handleStoryCompleted() {
      if (!this.isPlaylistMode || this.items.length === 0) return;

      const nextIndex = this.currentIndex + 1;
      const hasNext = nextIndex < this.items.length;
      const nextStoryId = hasNext ? this.items[nextIndex] : (this.isLooping ? this.items[0] : null);

      if (!nextStoryId) {
        // Reached end of playlist without looping
        this.isPlaylistMode = false;
        this.showPlaylistCompleteCelebration();
        return;
      }

      const nextStory = this.getStory(nextStoryId);
      this.renderMoralAutoplayCountdown(nextStory, 4);
    }

    renderMoralAutoplayCountdown(nextStory, countdownSeconds = 4) {
      this.cancelCountdown();
      const moralContainer =
        document.querySelector('.completed-story-content') ||
        document.querySelector('.completed-story-container') ||
        document.getElementById('app');
      if (!moralContainer) return;

      const card = document.createElement('div');
      card.className = 'playlist-countdown-card';
      card.id = 'playlistCountdownCard';
      card.innerHTML = `
        <div class="playlist-countdown-header">
          <span class="playlist-pulse-badge">🌙 Bedtime Autoplay</span>
          <span class="playlist-countdown-step">Story ${this.currentIndex + 2} of ${this.items.length}</span>
        </div>
        <div class="playlist-countdown-body">
          <div class="playlist-countdown-title">Up Next: <strong>${escapeHtml(nextStory ? nextStory.title : '')}</strong></div>
          <div class="playlist-countdown-bar">
            <div class="playlist-countdown-fill" id="playlistCountdownFill"></div>
          </div>
        </div>
        <div class="playlist-countdown-actions">
          <button class="btn-pill primary" id="playlistPlayNowBtn">Play Now ⏭️</button>
          <button class="btn-pill" id="playlistPauseBtn">Pause Autoplay ⏸️</button>
        </div>
      `;

      // Insert right before celebration actions if present
      const actions = moralContainer.querySelector('.celebration-actions');
      if (actions) {
        moralContainer.insertBefore(card, actions);
      } else {
        moralContainer.appendChild(card);
      }

      // Smooth countdown progress bar
      const fill = document.getElementById('playlistCountdownFill');
      let remainingMs = countdownSeconds * 1000;
      const stepMs = 50;

      this.countdownProgressInterval = setInterval(() => {
        remainingMs -= stepMs;
        const pct = Math.max(0, (remainingMs / (countdownSeconds * 1000)) * 100);
        if (fill) fill.style.width = `${100 - pct}%`;
        if (remainingMs <= 0) {
          clearInterval(this.countdownProgressInterval);
          this.countdownProgressInterval = null;
          this.playNext();
        }
      }, stepMs);

      // Buttons hooks
      const playNowBtn = document.getElementById('playlistPlayNowBtn');
      if (playNowBtn) {
        playNowBtn.onclick = () => {
          this.cancelCountdown();
          this.playNext();
        };
      }

      const pauseBtn = document.getElementById('playlistPauseBtn');
      if (pauseBtn) {
        pauseBtn.onclick = () => {
          this.cancelCountdown();
          this.stopPlaylistMode();
          card.innerHTML = `
            <div style="font-weight: 700; color: var(--text-color); margin-bottom: 0.35rem;">⏸️ Autoplay Paused</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">Next in queue: ${escapeHtml(nextStory.title)}</div>
            <button class="btn-pill primary" onclick="window.PlaylistManager.playNext()">Resume Playlist ⏭️</button>
          `;
        };
      }
    }

    cancelCountdown() {
      if (this.countdownProgressInterval) {
        clearInterval(this.countdownProgressInterval);
        this.countdownProgressInterval = null;
      }
      const existing = document.getElementById('playlistCountdownCard');
      if (existing) existing.remove();
    }

    showPlaylistCompleteCelebration() {
      this.cancelCountdown();
      const moralContainer =
        document.querySelector('.completed-story-content') ||
        document.querySelector('.completed-story-container') ||
        document.getElementById('app');
      if (!moralContainer) return;

      const card = document.createElement('div');
      card.className = 'playlist-countdown-card complete-celebration';
      card.innerHTML = `
        <div style="font-size: 2.2rem; margin-bottom: 0.25rem;">🌙✨😴</div>
        <div style="font-weight: 800; font-size: 1.25rem; color: #4338ca; margin-bottom: 0.35rem;">
          Playlist Finished!
        </div>
        <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
          You listened through all ${this.items.length} stories in your queue. Sweet dreams!
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn-pill primary" onclick="window.PlaylistManager.playAll(0)">Replay Playlist 🔄</button>
          <button class="btn-pill" onclick="window.StoryApp.goToLibrary()">Browse Stories 📚</button>
        </div>
      `;

      const actions = moralContainer.querySelector('.celebration-actions');
      if (actions) {
        moralContainer.insertBefore(card, actions);
      } else {
        moralContainer.appendChild(card);
      }
    }

    // ==========================================================
    // BEDTIME SLEEP TIMER
    // ==========================================================

    setSleepTimer(minutes) {
      if (!minutes || minutes <= 0) {
        this.sleepTimerMinutes = null;
        this.sleepTimerExpiresAt = null;
        this.saveToStorage();
        this.renderDrawer();
        this.showToast('🌙 Sleep timer turned off');
        return;
      }
      this.sleepTimerMinutes = minutes;
      this.sleepTimerExpiresAt = Date.now() + minutes * 60 * 1000;
      this.saveToStorage();
      this.renderDrawer();
      this.showToast(`🌙 Sleep timer set for ${minutes} minutes`);
    }

    initSleepTimerMonitor() {
      if (this.sleepTimerInterval) clearInterval(this.sleepTimerInterval);
      this.sleepTimerInterval = setInterval(() => {
        if (this.sleepTimerExpiresAt && Date.now() >= this.sleepTimerExpiresAt) {
          this.triggerSleepTimerShutdown();
        }
      }, 5000);
    }

    triggerSleepTimerShutdown() {
      this.sleepTimerMinutes = null;
      this.sleepTimerExpiresAt = null;
      this.isPlaylistMode = false;
      this.cancelCountdown();
      this.saveToStorage();

      // Gracefully stop audio
      if (global.TTS && global.TTS.stop) {
        global.TTS.stop();
      }

      this.showToast('🌙 Sleep timer ended. Goodnight & sweet dreams! ✨', 5000);
      this.updateHeaderBadge();
      this.renderDrawer();
    }

    getSleepTimerRemainingString() {
      if (!this.sleepTimerExpiresAt) return null;
      const diff = Math.max(0, this.sleepTimerExpiresAt - Date.now());
      if (diff === 0) return null;
      const mins = Math.ceil(diff / 60000);
      return `${mins}m left`;
    }

    // ==========================================================
    // UI: HEADER PILL, CARDS, DRAWER & TOASTS
    // ==========================================================

    updateHeaderBadge() {
      const badges = document.querySelectorAll('.playlist-pill-count');
      badges.forEach((b) => {
        b.innerText = String(this.items.length);
        b.style.display = this.items.length > 0 ? 'inline-block' : 'none';
      });

      const headerBtns = document.querySelectorAll('.playlist-header-btn');
      headerBtns.forEach((btn) => {
        if (this.isPlaylistMode) {
          btn.classList.add('playing-active');
        } else {
          btn.classList.remove('playing-active');
        }
      });
    }

    updateCardButtons() {
      document.querySelectorAll('.card-playlist-btn').forEach((btn) => {
        const sid = btn.getAttribute('data-id');
        if (!sid) return;
        const pos = this.getPosition(sid);
        if (pos > 0) {
          btn.classList.add('in-playlist');
          btn.innerHTML = `🎵 #${pos}`;
          btn.setAttribute('title', `In Playlist (#${pos}) - Click to remove`);
        } else {
          btn.classList.remove('in-playlist');
          btn.innerHTML = `➕ Playlist`;
          btn.setAttribute('title', `Add to Story Playlist`);
        }
      });

      const readerBtn = document.getElementById('readerPlaylistToggleBtn');
      if (readerBtn && global.StoryApp && global.StoryApp.getCurrentStory) {
        const cur = global.StoryApp.getCurrentStory();
        if (cur) {
          const pos = this.getPosition(cur.id);
          if (pos > 0) {
            readerBtn.classList.add('primary');
            readerBtn.innerHTML = `🎵 In Playlist (#${pos})`;
            readerBtn.title = `In Playlist (#${pos}) - Click to remove`;
          } else {
            readerBtn.classList.remove('primary');
            readerBtn.innerHTML = `➕ Add to Playlist`;
            readerBtn.title = `Add to Bedtime Story Playlist`;
          }
        }
      }
    }

    openDrawer() {
      let drawer = document.getElementById('playlistDrawer');
      if (!drawer) {
        this.createDrawerDOM();
        drawer = document.getElementById('playlistDrawer');
      }
      this.renderDrawer();
      drawer.classList.add('open');
      const backdrop = document.getElementById('playlistDrawerBackdrop');
      if (backdrop) backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    closeDrawer() {
      const drawer = document.getElementById('playlistDrawer');
      if (drawer) drawer.classList.remove('open');
      const backdrop = document.getElementById('playlistDrawerBackdrop');
      if (backdrop) backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }

    toggleDrawer() {
      const drawer = document.getElementById('playlistDrawer');
      if (drawer && drawer.classList.contains('open')) {
        this.closeDrawer();
      } else {
        this.openDrawer();
      }
    }

    createDrawerDOM() {
      if (document.getElementById('playlistDrawer')) return;

      const backdrop = document.createElement('div');
      backdrop.id = 'playlistDrawerBackdrop';
      backdrop.className = 'playlist-drawer-backdrop';
      backdrop.onclick = () => this.closeDrawer();
      document.body.appendChild(backdrop);

      const drawer = document.createElement('div');
      drawer.id = 'playlistDrawer';
      drawer.className = 'playlist-drawer';
      document.body.appendChild(drawer);
    }

    renderDrawer() {
      let drawer = document.getElementById('playlistDrawer');
      if (!drawer) {
        this.createDrawerDOM();
        drawer = document.getElementById('playlistDrawer');
      }

      const totalStories = this.items.length;
      const totalMinutes = this.calculateTotalDurationMinutes();
      const timerRemaining = this.getSleepTimerRemainingString();

      const itemsHtml =
        totalStories === 0
          ? `
        <div class="playlist-empty-state">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">🌙🎵</div>
          <h3>Your Playlist is Empty</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0.5rem 0 1.25rem;">
            Add stories to build a bedtime continuous listening queue.
          </p>
          <button class="btn-pill primary" id="quickBedtimePresetBtn">
            ✨ Add 4 Bedtime Fables
          </button>
        </div>
      `
          : `
        <div class="playlist-items-list" id="playlistItemsList">
          ${this.items
            .map((id, index) => {
              const story = this.getStory(id);
              const isCurrent = this.isPlaylistMode && this.currentIndex === index;
              const title = story ? story.title : id.replace(/_/g, ' ');
              const animal = story ? story.animal : 'Story';
              const sentences = story && story.text ? story.text.length : 6;
              const thumbUrl = global.StoryApp && global.StoryApp.getAssetUrl
                ? global.StoryApp.getAssetUrl(`data/story_images/${encodeURIComponent(id)}.svg`)
                : `data/story_images/${encodeURIComponent(id)}.svg`;
              const thumbPng = global.StoryApp && global.StoryApp.getAssetUrl
                ? global.StoryApp.getAssetUrl(`data/story_images/${encodeURIComponent(id)}.png`)
                : `data/story_images/${encodeURIComponent(id)}.png`;

              return `
              <div class="playlist-item-card ${isCurrent ? 'now-playing' : ''}" data-index="${index}">
                <div class="playlist-item-drag-order">
                  <button class="playlist-arrow-btn" title="Move Up" ${index === 0 ? 'disabled' : ''} onclick="window.PlaylistManager.moveUp(${index})">▲</button>
                  <span class="playlist-order-num">#${index + 1}</span>
                  <button class="playlist-arrow-btn" title="Move Down" ${index === totalStories - 1 ? 'disabled' : ''} onclick="window.PlaylistManager.moveDown(${index})">▼</button>
                </div>

                <div class="playlist-item-thumb-wrapper" onclick="window.PlaylistManager.playAll(${index})">
                  <img src="${thumbUrl}" alt="${escapeHtml(title)}" class="playlist-item-thumb" onerror="this.onerror=null; this.src='${thumbPng}';" />
                  ${isCurrent ? '<div class="playlist-playing-indicator">▶</div>' : ''}
                </div>

                <div class="playlist-item-meta" onclick="window.PlaylistManager.playAll(${index})">
                  <div class="playlist-item-title">${escapeHtml(title)}</div>
                  <div class="playlist-item-sub">
                    <span class="playlist-item-badge">🐾 ${escapeHtml(animal)}</span>
                    <span>• ${sentences} scenes</span>
                  </div>
                </div>

                <div class="playlist-item-actions">
                  <button class="playlist-play-single-btn" title="Play from here" onclick="window.PlaylistManager.playAll(${index})">▶</button>
                  <button class="playlist-delete-btn" title="Remove" onclick="window.PlaylistManager.remove('${id}')">✕</button>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      `;

      drawer.innerHTML = `
        <div class="playlist-drawer-header">
          <div>
            <div class="playlist-drawer-title">
              🎵 Bedtime Playlist
              ${this.isPlaylistMode ? '<span class="playlist-live-badge">PLAYING</span>' : ''}
            </div>
            <div class="playlist-drawer-subtitle">
              ${totalStories} ${totalStories === 1 ? 'story' : 'stories'} • ~${totalMinutes} mins listening
              ${timerRemaining ? ` • <span style="color: #ec4899; font-weight: 700;">🌙 Timer: ${timerRemaining}</span>` : ''}
            </div>
          </div>
          <button class="playlist-drawer-close" onclick="window.PlaylistManager.closeDrawer()" title="Close">✕</button>
        </div>

        <div class="playlist-drawer-body">
          ${itemsHtml}
        </div>

        ${
          totalStories > 0
            ? `
          <div class="playlist-drawer-footer">
            <button class="btn-pill primary playlist-main-play-btn" onclick="window.PlaylistManager.playAll(0)">
              ${this.isPlaylistMode ? '🔄 Restart Playlist' : '▶ Play Bedtime Playlist'}
            </button>

            <div class="playlist-footer-tools">
              <button class="btn-pill-sm" onclick="window.PlaylistManager.shuffle()" title="Shuffle Queue">
                🔀 Shuffle
              </button>

              <!-- Sleep Timer Dropdown -->
              <div class="playlist-sleep-timer-menu">
                <select id="playlistSleepTimerSelect" onchange="window.PlaylistManager.setSleepTimer(parseInt(this.value, 10))" title="Bedtime Sleep Timer">
                  <option value="0" ${!this.sleepTimerMinutes ? 'selected' : ''}>🌙 Sleep Timer: Off</option>
                  <option value="15" ${this.sleepTimerMinutes === 15 ? 'selected' : ''}>🌙 Sleep Timer: 15 min</option>
                  <option value="30" ${this.sleepTimerMinutes === 30 ? 'selected' : ''}>🌙 Sleep Timer: 30 min</option>
                  <option value="45" ${this.sleepTimerMinutes === 45 ? 'selected' : ''}>🌙 Sleep Timer: 45 min</option>
                </select>
              </div>

              <button class="btn-pill-sm text-danger" onclick="window.PlaylistManager.clear()" title="Clear All">
                🗑️ Clear
              </button>
            </div>
          </div>
        `
            : ''
        }
      `;

      // Hook quick preset button if empty
      const presetBtn = document.getElementById('quickBedtimePresetBtn');
      if (presetBtn) {
        presetBtn.onclick = () => {
          const stories = (global.StoryApp && global.StoryApp.getStories && global.StoryApp.getStories()) || [];
          this.addBedtimePreset(stories);
        };
      }
    }

    showToast(message, duration = 2400) {
      let toast = document.getElementById('playlistToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'playlistToast';
        toast.className = 'playlist-toast';
        document.body.appendChild(toast);
      }
      toast.innerText = message;
      toast.classList.add('show');
      clearTimeout(this._toastTimeout);
      this._toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
      }, duration);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Export singleton to global
  global.PlaylistManager = new PlaylistEngine();
})(window);
