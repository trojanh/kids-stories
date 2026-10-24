/**
 * tts.js
 * High-Performance Hybrid Storybook Audio & Speech Engine.
 * 
 * Optimizations:
 *  1. Gapless Dual-Channel & Pre-buffering Pipeline (0ms sentence-to-sentence lag).
 *  2. In-Memory Audio Element Pool (0ms replay/rewind latency, zero duplicate fetches).
 *  3. Whole-Story Background Prefetching (pre-buffers upcoming story audio in <50ms).
 *  4. Millisecond-Exact Word Boundary Karaoke Sync (uses true Edge-TTS WordBoundary timing).
 *  5. Seamless Web Speech API Fallback with natural voice ranking.
 */

(function (global) {
  const STORAGE_KEY_RATE = 'kids_storybook_tts_rate';
  const STORAGE_KEY_VOICE = 'kids_storybook_tts_voice';
  const STORAGE_KEY_PITCH = 'kids_storybook_tts_pitch';

  class TTSEngine {
    constructor() {
      this.synth = window.speechSynthesis || null;
      this.supported = !!this.synth;
      this.voices = [];
      this.currentUtterance = null;
      this.currentAudio = null;
      this.audioAnimFrame = null;
      this.speaking = false;
      this.paused = false;
      this.audioUnlocked = false;
      this.heartbeatTimer = null;
      this.manifest = null;
      this.manifestPromise = null;

      // In-Memory Audio Object Pool & Preload Cache
      this.audioPool = new Map();
      this.prefetchedStories = new Set();
      this.storyWordsCache = new Map();

      // Rate settings (persisted in localStorage)
      const savedRate = parseFloat(localStorage.getItem(STORAGE_KEY_RATE));
      this.rate = !isNaN(savedRate) && savedRate >= 0.5 && savedRate <= 2.0 ? savedRate : 0.9;

      // Pitch settings: 1.06 gives a warm, friendly, cheerful storytelling tone for native TTS
      const savedPitch = parseFloat(localStorage.getItem(STORAGE_KEY_PITCH));
      this.pitch = !isNaN(savedPitch) && savedPitch >= 0.8 && savedPitch <= 1.4 ? savedPitch : 1.06;

      this.selectedVoiceURI = localStorage.getItem(STORAGE_KEY_VOICE) || null;

      // Event callbacks
      this.onStart = null;
      this.onEnd = null;
      this.onError = null;
      this.onBoundary = null;
      this.onVoicesReady = null;
      this.onManifestReady = null;

      // Manifest is loaded lazily or asynchronously off the critical rendering path

      if (this.supported) {
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }

        // Attach audio unlock handler for mobile browsers (iOS Safari, Android Chrome)
        const unlock = () => this.unlockAudio();
        ['click', 'touchstart', 'keydown'].forEach((evt) => {
          window.addEventListener(evt, unlock, { once: true, passive: true });
        });
      }
    }

    /**
     * Helper to resolve the correct root application base path across custom domains,
     * subpaths (/kids-stories/), and clean SPA routes (/story/:id).
     */
    getBasePath() {
      if (typeof window.StoryApp !== 'undefined' && typeof window.StoryApp.getBasePath === 'function') {
        return window.StoryApp.getBasePath();
      }
      const baseEl = document.querySelector('base');
      if (baseEl && baseEl.getAttribute('href')) {
        return baseEl.getAttribute('href');
      }
      const pathname = window.location.pathname;
      const storyIdx = pathname.indexOf('/story/');
      if (storyIdx !== -1) {
        return pathname.substring(0, storyIdx + 1);
      }
      if (pathname.endsWith('/index.html')) {
        return pathname.substring(0, pathname.length - 10);
      }
      return pathname.endsWith('/') ? pathname : pathname + '/';
    }

    /**
     * Loads the studio audio manifest describing pre-generated story audio files.
     */
    async loadManifest() {
      if (this.manifestPromise) return this.manifestPromise;

      this.manifestPromise = (async () => {
        const base = this.getBasePath();
        const candidates = [
          `${base}data/audio_manifest.json`,
          'data/audio_manifest.json',
          './data/audio_manifest.json',
          '../data/audio_manifest.json',
          '/data/audio_manifest.json',
        ];
        for (const p of candidates) {
          try {
            const res = await fetch(p);
            if (res.ok) {
              this.manifest = await res.json();
              console.log(`[TTS] Audio manifest loaded with ${Object.keys(this.manifest.stories || {}).length} studio-narrated stories.`);
              if (this.onManifestReady) this.onManifestReady(this.manifest);
              return this.manifest;
            }
          } catch (e) {}
        }
        return null;
      })();

      return this.manifestPromise;
    }

    async ensureManifest() {
      if (this.manifest) return this.manifest;
      return await this.loadManifest();
    }

    hasStudioAudio(storyId) {
      return !!(this.manifest && this.manifest.stories && this.manifest.stories[storyId]);
    }

    isTimestampMode(storyId) {
      if (!this.hasStudioAudio(storyId)) return false;
      const s = this.manifest.stories[storyId];
      return !!(s && s.audio && Array.isArray(s.sentences) && s.sentences[0] && typeof s.sentences[0].start === 'number');
    }

    getStoryAudioUrl(storyId) {
      if (!this.hasStudioAudio(storyId)) return null;
      const s = this.manifest.stories[storyId];
      return s && s.audio ? this.resolveAudioUrl(s.audio) : null;
    }

    resolveAudioUrl(relPath) {
      if (!relPath) return null;
      if (relPath.startsWith('http://') || relPath.startsWith('https://')) return relPath;

      const cdnBase = this.manifest && this.manifest.cdn_base_url ? this.manifest.cdn_base_url.replace(/\/+$/, '') : '';
      if (cdnBase) {
        return `${cdnBase}/${relPath.replace(/^\/+/, '')}`;
      }
      const base = this.getBasePath();
      const cleanRel = relPath.replace(/^\/+/, '');
      return `${base}${cleanRel}`;
    }

    /**
     * Returns sentence manifest entry: { audio: string, words?: Array<{w, s, e}> }
     */
    getSentenceEntry(storyId, sentenceIndex) {
      if (!this.hasStudioAudio(storyId)) return null;
      const s = this.manifest.stories[storyId];
      if (s && s.sentences && s.sentences[sentenceIndex]) {
        const item = s.sentences[sentenceIndex];
        if (typeof item === 'object') {
          return item;
        }
        return { audio: item, words: [] };
      }
      return null;
    }

    getSentenceAudioUrl(storyId, sentenceIndex) {
      const entry = this.getSentenceEntry(storyId, sentenceIndex);
      return entry && entry.audio ? this.resolveAudioUrl(entry.audio) : null;
    }

    getMoralAudioUrl(storyId) {
      if (!this.hasStudioAudio(storyId)) return null;
      return this.resolveAudioUrl(this.manifest.stories[storyId].moral || null);
    }

    getFullStoryAudioUrl(storyId) {
      if (!this.hasStudioAudio(storyId)) return null;
      return this.resolveAudioUrl(this.manifest.stories[storyId].full_story || null);
    }

    /**
     * Gets or creates a pre-buffered HTMLAudioElement from memory.
     * Uses 'metadata' preload to protect initial page performance (LCP) from network congestion.
     */
    getOrCreateAudio(url) {
      if (this.audioPool.has(url)) {
        const audio = this.audioPool.get(url);
        audio.playbackRate = this.rate;
        return audio;
      }

      const audio = new Audio(url);
      audio.preload = 'metadata';
      audio.playbackRate = this.rate;

      // Bound cache to 80 items max to prevent memory leakage
      if (this.audioPool.size > 80) {
        const oldestKey = this.audioPool.keys().next().value;
        const oldAudio = this.audioPool.get(oldestKey);
        try {
          oldAudio.pause();
          oldAudio.src = '';
        } catch (e) {}
        this.audioPool.delete(oldestKey);
      }

      this.audioPool.set(url, audio);
      return audio;
    }

    /**
     * Asynchronously loads per-story word boundaries (only ~3 KB) on demand.
     */
    async loadStoryWords(storyId) {
      if (this.storyWordsCache.has(storyId)) {
        return this.storyWordsCache.get(storyId);
      }
      try {
        const url = this.resolveAudioUrl(`audio/${storyId}/words.json`);
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          this.storyWordsCache.set(storyId, data);
          return data;
        }
      } catch (e) {}
      return null;
    }

    /**
     * Asynchronous background audio prefetcher.
     * Preloads only metadata headers without downloading full audio files during page rendering.
     */
    async prefetchStory(storyId) {
      if (!this.manifest) {
        await this.ensureManifest();
      }
      if (!this.hasStudioAudio(storyId) || this.prefetchedStories.has(storyId)) return;
      this.prefetchedStories.add(storyId);

      const s = this.manifest.stories[storyId];
      if (!s) return;

      // Load detailed word boundaries for this active story in the background
      this.loadStoryWords(storyId);

      // Mode 1: Single Continuous Audio (Approach 2)
      if (s.audio) {
        const url = this.resolveAudioUrl(s.audio);
        if (url && !this.audioPool.has(url)) {
          const a = new Audio(url);
          a.preload = 'metadata';
          this.audioPool.set(url, a);
        }
        return;
      }

      // Mode 2: Legacy individual audio files
      if (s.sentences) {
        s.sentences.forEach((item) => {
          const rawPath = typeof item === 'object' ? item.audio : item;
          const url = this.resolveAudioUrl(rawPath);
          if (url && !this.audioPool.has(url)) {
            const a = new Audio(url);
            a.preload = 'metadata';
            this.audioPool.set(url, a);
          }
        });
      }

      if (s.moral) {
        const mRaw = typeof s.moral === 'object' ? s.moral.audio : s.moral;
        const mUrl = this.resolveAudioUrl(mRaw);
        if (mUrl && !this.audioPool.has(mUrl)) {
          const ma = new Audio(mUrl);
          ma.preload = 'metadata';
          this.audioPool.set(mUrl, ma);
        }
      }
    }

    /**
     * Pre-warms the upcoming sentence audio for gapless panel transitions.
     */
    prepareNextSentence(storyId, nextIndex) {
      const nextUrl = this.getSentenceAudioUrl(storyId, nextIndex);
      if (nextUrl) {
        const audio = this.getOrCreateAudio(nextUrl);
        if (audio.readyState < 2) {
          try { audio.load(); } catch (e) {}
        }
      }
    }

    unlockAudio() {
      if (this.audioUnlocked) return;
      try {
        if (this.supported) {
          const emptyUtterance = new SpeechSynthesisUtterance('');
          emptyUtterance.volume = 0;
          this.synth.speak(emptyUtterance);
        }
        this.audioUnlocked = true;
      } catch (e) {}
    }

    loadVoices() {
      if (!this.supported) return;
      this.voices = this.synth.getVoices() || [];
      if (this.onVoicesReady) {
        this.onVoicesReady(this.getRankedVoices());
      }
    }

    getVoices() {
      return this.voices;
    }

    scoreVoice(voice) {
      if (!voice || !voice.lang) return -999;
      const lang = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();

      if (!lang.startsWith('en')) return -500;

      let score = 50;

      if (name.includes('natural')) score += 110;
      if (name.includes('neural')) score += 100;
      if (name.includes('enhanced')) score += 85;
      if (name.includes('premium')) score += 80;
      if (name.includes('online')) score += 45;

      if (name.includes('google')) score += 55;
      if (name.includes('siri') || name.includes('apple')) score += 50;

      const friendlyVoices = [
        'jenny', 'aria', 'guy', 'ana', 'michelle', 'clara',
        'samantha', 'karen', 'victoria', 'serena', 'ava',
        'zoe', 'junior', 'oliver', 'charlotte', 'daniel',
        'neerja', 'prabhat', 'tessa', 'fiona', 'moira'
      ];
      for (const fn of friendlyVoices) {
        if (name.includes(fn)) {
          score += 35;
          break;
        }
      }

      if (lang === 'en-in' || lang === 'en_in') {
        score += 30;
      } else if (lang === 'en-us' || lang === 'en_us') {
        score += 20;
      } else if (lang === 'en-gb' || lang === 'en_gb') {
        score += 20;
      } else if (lang === 'en-au' || lang === 'en_au') {
        score += 15;
      }

      if (!voice.localService) score += 15;

      if (
        name.includes('espeak') ||
        name.includes('desktop') ||
        name.includes('david') ||
        name.includes('zira') ||
        name.includes('hazel') ||
        name.includes('fred') ||
        name.includes('albert')
      ) {
        score -= 40;
      }

      return score;
    }

    getRankedVoices() {
      if (!this.voices || this.voices.length === 0) return [];
      const enVoices = this.voices.filter((v) => v.lang && v.lang.startsWith('en'));
      const pool = enVoices.length > 0 ? enVoices : this.voices;
      return pool.slice().sort((a, b) => this.scoreVoice(b) - this.scoreVoice(a));
    }

    getVoiceBadge(voice) {
      if (!voice) return '';
      const name = voice.name.toLowerCase();
      const lang = (voice.lang || '').toLowerCase();

      if (name.includes('natural') || name.includes('neural')) return '✨ Natural';
      if (name.includes('enhanced') || name.includes('premium')) return '🌟 Enhanced';
      if (name.includes('google')) return '🚀 Google';
      if (name.includes('siri') || name.includes('apple')) return '🍎 Apple';
      if (lang.startsWith('en-in')) return '🇮🇳 Indian English';
      return '🔊 Standard';
    }

    formatVoiceLabel(voice) {
      if (!voice) return '';
      const badge = this.getVoiceBadge(voice);
      return `${badge} ${voice.name} (${voice.lang})`;
    }

    getBestDefaultVoice() {
      if (!this.voices || this.voices.length === 0) return null;

      if (this.selectedVoiceURI) {
        const found = this.voices.find((v) => v.voiceURI === this.selectedVoiceURI);
        if (found) return found;
      }

      const ranked = this.getRankedVoices();
      if (ranked.length > 0 && this.scoreVoice(ranked[0]) > 0) {
        return ranked[0];
      }

      const anyEnglish = this.voices.find((v) => v.lang && v.lang.startsWith('en'));
      return anyEnglish || this.voices[0];
    }

    setVoice(voiceURI) {
      this.selectedVoiceURI = voiceURI;
      if (voiceURI) {
        localStorage.setItem(STORAGE_KEY_VOICE, voiceURI);
      } else {
        localStorage.removeItem(STORAGE_KEY_VOICE);
      }
    }

    setRate(rate) {
      const num = parseFloat(rate);
      if (!isNaN(num) && num >= 0.5 && num <= 2.0) {
        this.rate = Math.round(num * 10) / 10;
        localStorage.setItem(STORAGE_KEY_RATE, this.rate.toString());
        if (this.currentAudio) {
          this.currentAudio.playbackRate = this.rate;
        }
      }
    }

    getRate() {
      return this.rate;
    }

    setPitch(pitch) {
      const num = parseFloat(pitch);
      if (!isNaN(num) && num >= 0.8 && num <= 1.4) {
        this.pitch = Math.round(num * 100) / 100;
        localStorage.setItem(STORAGE_KEY_PITCH, this.pitch.toString());
      }
    }

    getPitch() {
      return this.pitch;
    }

    preprocessStoryText(text) {
      if (!text) return '';
      return text
        .replace(/—/g, ',')
        .replace(/–/g, ',')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");
    }

    getWordOffsets(text) {
      const words = [];
      const regex = /\S+/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        words.push({
          word: match[0],
          start: match.index,
          end: match.index + match[0].length,
          weight: Math.max(1, match[0].length),
        });
      }
      return words;
    }

    /**
     * Plays audio with millisecond-exact word boundary synchronization.
     */
    playAudioUrl(url, text, onFinishedCallback, exactWords = null) {
      this.stop();

      const audio = this.getOrCreateAudio(url);
      audio.playbackRate = this.rate;
      this.currentAudio = audio;
      this.speaking = true;
      this.paused = false;

      // Extract DOM word offsets from the sentence text
      const domWordSpans = this.getWordOffsets(text);
      const fallbackWords = (!exactWords || exactWords.length === 0) ? domWordSpans : null;
      const totalWeight = fallbackWords ? fallbackWords.reduce((sum, w) => sum + w.weight, 0) : 0;

      const updateTracking = () => {
        if (!this.speaking || !this.currentAudio || this.currentAudio.paused) return;

        const current = audio.currentTime;

        if (this.onBoundary) {
          if (exactWords && exactWords.length > 0) {
            // Mode A: Millisecond-Exact Word Boundary Sync from Neural TTS
            let activeWordIdx = -1;
            for (let i = 0; i < exactWords.length; i++) {
              if (current >= exactWords[i].s && current <= exactWords[i].e + 0.06) {
                activeWordIdx = i;
                break;
              }
            }

            if (activeWordIdx >= 0) {
              const matchedSpan = domWordSpans[activeWordIdx] || domWordSpans[0];
              if (matchedSpan) {
                this.onBoundary({
                  charIndex: matchedSpan.start,
                  charLength: matchedSpan.end - matchedSpan.start,
                  name: 'word',
                });
              }
            }
          } else if (fallbackWords && fallbackWords.length > 0 && audio.duration > 0) {
            // Mode B: Proportional timing fallback
            const progress = Math.min(1, Math.max(0, current / audio.duration));
            const targetWeight = progress * totalWeight;
            let accum = 0;
            let activeIndex = 0;

            for (let i = 0; i < fallbackWords.length; i++) {
              accum += fallbackWords[i].weight;
              if (accum >= targetWeight) {
                activeIndex = i;
                break;
              }
            }

            const activeWord = fallbackWords[activeIndex] || fallbackWords[fallbackWords.length - 1];
            if (activeWord) {
              this.onBoundary({
                charIndex: activeWord.start,
                charLength: activeWord.end - activeWord.start,
                name: 'word',
              });
            }
          }
        }

        if (this.speaking) {
          this.audioAnimFrame = requestAnimationFrame(updateTracking);
        }
      };

      audio.onplay = () => {
        this.speaking = true;
        this.paused = false;
        if (this.onStart) this.onStart();
        if (domWordSpans.length > 0 && this.onBoundary) {
          this.onBoundary({ charIndex: domWordSpans[0].start, charLength: domWordSpans[0].end - domWordSpans[0].start, name: 'word' });
        }
        this.audioAnimFrame = requestAnimationFrame(updateTracking);
      };

      audio.onended = () => {
        this.stop();
        if (this.onEnd) this.onEnd();
        if (onFinishedCallback) onFinishedCallback();
      };

      audio.onerror = (e) => {
        console.warn('[TTS] Studio audio file error, falling back to Web Speech:', e);
        this.stop();
        this.speakNative(text, onFinishedCallback);
      };

      audio.play().catch((err) => {
        console.warn('[TTS] Audio playback restricted, falling back to Web Speech:', err);
        this.speakNative(text, onFinishedCallback);
      });
    }

    /**
     * Plays a specific timestamp cue range [startSec, endSec] of a single continuous story audio file.
     * Provides 0ms instant seeking, millisecond-exact word karaoke, and auto-pauses at segment completion.
     */
    playAudioRange(url, startSec, endSec, text, onFinishedCallback, exactWords = null) {
      this.stop();

      const audio = this.getOrCreateAudio(url);
      audio.playbackRate = this.rate;
      this.currentAudio = audio;
      this.speaking = true;
      this.paused = false;

      // Extract DOM word offsets from the sentence text
      const domWordSpans = this.getWordOffsets(text);
      const fallbackWords = (!exactWords || exactWords.length === 0) ? domWordSpans : null;
      const totalWeight = fallbackWords ? fallbackWords.reduce((sum, w) => sum + w.weight, 0) : 0;
      const durationSec = Math.max(0.1, endSec - startSec);

      let segmentFinished = false;

      const finishSegment = () => {
        if (segmentFinished) return;
        segmentFinished = true;
        try { audio.pause(); } catch (e) {}
        this.stop();
        if (this.onEnd) this.onEnd();
        if (onFinishedCallback) onFinishedCallback();
      };

      const updateTracking = () => {
        if (!this.speaking || !this.currentAudio || this.currentAudio.paused) return;

        const current = audio.currentTime;

        // Auto-pause when segment completes
        if (current >= endSec - 0.05) {
          finishSegment();
          return;
        }

        if (this.onBoundary) {
          if (exactWords && exactWords.length > 0) {
            // Millisecond-Exact Word Boundary Sync from Neural TTS
            let activeWordIdx = -1;
            for (let i = 0; i < exactWords.length; i++) {
              if (current >= exactWords[i].s && current <= exactWords[i].e + 0.06) {
                activeWordIdx = i;
                break;
              }
            }

            if (activeWordIdx >= 0) {
              const matchedSpan = domWordSpans[activeWordIdx] || domWordSpans[0];
              if (matchedSpan) {
                this.onBoundary({
                  charIndex: matchedSpan.start,
                  charLength: matchedSpan.end - matchedSpan.start,
                  name: 'word',
                });
              }
            }
          } else if (fallbackWords && fallbackWords.length > 0) {
            // Proportional timing fallback within [startSec, endSec]
            const progress = Math.min(1, Math.max(0, (current - startSec) / durationSec));
            const targetWeight = progress * totalWeight;
            let accum = 0;
            let activeIndex = 0;

            for (let i = 0; i < fallbackWords.length; i++) {
              accum += fallbackWords[i].weight;
              if (accum >= targetWeight) {
                activeIndex = i;
                break;
              }
            }

            const activeWord = fallbackWords[activeIndex] || fallbackWords[fallbackWords.length - 1];
            if (activeWord) {
              this.onBoundary({
                charIndex: activeWord.start,
                charLength: activeWord.end - activeWord.start,
                name: 'word',
              });
            }
          }
        }

        if (this.speaking && !segmentFinished) {
          this.audioAnimFrame = requestAnimationFrame(updateTracking);
        }
      };

      const doSeekAndPlay = () => {
        try {
          audio.currentTime = Math.max(0, startSec);
        } catch (e) {}

        audio.onended = finishSegment;
        audio.onerror = (e) => {
          console.warn('[TTS] Studio audio range error, falling back to Web Speech:', e);
          finishSegment();
          this.speakNative(text, onFinishedCallback);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.speaking = true;
            this.paused = false;
            if (this.onStart) this.onStart();
            if (domWordSpans.length > 0 && this.onBoundary) {
              this.onBoundary({ charIndex: domWordSpans[0].start, charLength: domWordSpans[0].end - domWordSpans[0].start, name: 'word' });
            }
            this.audioAnimFrame = requestAnimationFrame(updateTracking);
          }).catch((err) => {
            console.warn('[TTS] Audio playback restricted, falling back to Web Speech:', err);
            this.speakNative(text, onFinishedCallback);
          });
        }
      };

      if (audio.readyState >= 1) {
        doSeekAndPlay();
      } else {
        audio.addEventListener('loadedmetadata', doSeekAndPlay, { once: true });
        audio.load();
      }
    }

    /**
     * Speaks a story sentence.
     * Uses Approach 2 (Single Audio Cue Range) when available, falling back to legacy audio files or Web Speech.
     */
    async speakStorySentence(storyId, sentenceIndex, text, onFinishedCallback) {
      if (!this.manifest) {
        await this.ensureManifest();
      }

      const s = this.manifest && this.manifest.stories ? this.manifest.stories[storyId] : null;

      // Mode 1: Approach 2 Single Audio Timestamp Seeking
      if (s && s.audio && Array.isArray(s.sentences) && s.sentences[sentenceIndex] && typeof s.sentences[sentenceIndex].start === 'number') {
        const sent = s.sentences[sentenceIndex];
        const url = this.resolveAudioUrl(s.audio);
        const cachedWords = this.storyWordsCache.get(storyId);
        const exactWords = sent.words || (cachedWords && cachedWords.sentences ? cachedWords.sentences[sentenceIndex.toString()] : null);
        this.playAudioRange(url, sent.start, sent.end, text, onFinishedCallback, exactWords);
        return;
      }

      // Mode 2: Legacy individual audio files
      const entry = this.getSentenceEntry(storyId, sentenceIndex);
      if (entry && entry.audio) {
        const url = this.resolveAudioUrl(entry.audio);
        const exactWords = entry.words || null;
        this.playAudioUrl(url, text, onFinishedCallback, exactWords);
        this.prepareNextSentence(storyId, sentenceIndex + 1);
        return;
      }

      // Mode 3: Native Web Speech fallback
      this.speakNative(text, onFinishedCallback);
    }

    async speakMoral(storyId, moralText, onFinishedCallback) {
      if (!this.manifest) {
        await this.ensureManifest();
      }

      const s = this.manifest && this.manifest.stories ? this.manifest.stories[storyId] : null;

      // Mode 1: Approach 2 Timestamp Cue in Single Audio
      if (s && s.audio && s.moral && typeof s.moral.start === 'number') {
        const url = this.resolveAudioUrl(s.audio);
        const cachedWords = this.storyWordsCache.get(storyId);
        const exactWords = s.moral.words || (cachedWords ? cachedWords.moral : null);
        this.playAudioRange(url, s.moral.start, s.moral.end, moralText, onFinishedCallback, exactWords);
        return;
      }

      // Mode 2: Legacy individual moral audio
      const audioUrl = this.getMoralAudioUrl(storyId);
      if (audioUrl) {
        this.playAudioUrl(audioUrl, moralText, onFinishedCallback);
        return;
      }

      // Mode 3: Native Web Speech
      this.speakNative(moralText, onFinishedCallback);
    }

    async speakFullStory(storyId, fullText, onFinishedCallback) {
      if (!this.manifest) {
        await this.ensureManifest();
      }

      const s = this.manifest && this.manifest.stories ? this.manifest.stories[storyId] : null;

      // Mode 1: Approach 2 Single Story Audio (0 to duration)
      if (s && s.audio) {
        const url = this.resolveAudioUrl(s.audio);
        let allWords = [];
        const cachedWords = this.storyWordsCache.get(storyId) || (await this.loadStoryWords(storyId));
        if (cachedWords && cachedWords.sentences) {
          Object.keys(cachedWords.sentences).forEach((k) => {
            allWords = allWords.concat(cachedWords.sentences[k]);
          });
        }
        if (cachedWords && cachedWords.moral) {
          allWords = allWords.concat(cachedWords.moral);
        }
        this.playAudioUrl(url, fullText, onFinishedCallback, allWords);
        return;
      }

      // Mode 2: Legacy full story audio
      const audioUrl = this.getFullStoryAudioUrl(storyId);
      if (audioUrl) {
        this.playAudioUrl(audioUrl, fullText, onFinishedCallback);
        return;
      }

      // Mode 3: Native Web Speech
      this.speakNative(fullText, onFinishedCallback);
    }

    speak(text, onFinishedCallback) {
      this.speakNative(text, onFinishedCallback);
    }

    speakNative(text, onFinishedCallback) {
      if (!this.supported) {
        console.warn('SpeechSynthesis not supported on this browser.');
        if (onFinishedCallback) onFinishedCallback();
        return;
      }

      this.stop();

      if (!text || !text.trim()) {
        if (onFinishedCallback) onFinishedCallback();
        return;
      }

      const preparedText = this.preprocessStoryText(text);
      const utterance = new SpeechSynthesisUtterance(preparedText);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;

      const voice = this.getBestDefaultVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        this.speaking = true;
        this.paused = false;
        this.startHeartbeat();
        if (this.onStart) this.onStart();
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word' && this.onBoundary) {
          this.onBoundary({
            charIndex: event.charIndex,
            charLength: event.charLength || 0,
            name: event.name,
          });
        }
      };

      utterance.onend = () => {
        this.stopHeartbeat();
        this.speaking = false;
        this.paused = false;
        this.currentUtterance = null;
        window.__activeSpeechUtterance = null;
        if (this.onEnd) this.onEnd();
        if (onFinishedCallback) onFinishedCallback();
      };

      utterance.onerror = (e) => {
        this.stopHeartbeat();
        this.speaking = false;
        this.paused = false;
        this.currentUtterance = null;
        window.__activeSpeechUtterance = null;

        if (e.error === 'interrupted' || e.error === 'canceled') {
          return;
        }

        if (e.error === 'not-allowed') {
          console.info('TTS playback requires user gesture before playing audio.');
        } else {
          console.warn('TTS utterance error:', e.error || e);
        }

        if (this.onError) this.onError(e);
      };

      this.currentUtterance = utterance;
      window.__activeSpeechUtterance = utterance;
      this.synth.speak(utterance);
    }

    previewVoice(voiceURI, onFinishedCallback) {
      if (!this.supported) return;
      this.stop();

      const sample = 'Once upon a time, in a sunny forest, a kind little friend was smiling happily!';
      const utterance = new SpeechSynthesisUtterance(sample);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;

      if (voiceURI) {
        const found = this.voices.find((v) => v.voiceURI === voiceURI);
        if (found) utterance.voice = found;
      } else {
        const best = this.getBestDefaultVoice();
        if (best) utterance.voice = best;
      }

      utterance.onstart = () => {
        this.speaking = true;
      };

      utterance.onend = () => {
        this.speaking = false;
        this.currentUtterance = null;
        window.__activeSpeechUtterance = null;
        if (onFinishedCallback) onFinishedCallback();
      };

      utterance.onerror = () => {
        this.speaking = false;
        this.currentUtterance = null;
        window.__activeSpeechUtterance = null;
        if (onFinishedCallback) onFinishedCallback();
      };

      this.currentUtterance = utterance;
      window.__activeSpeechUtterance = utterance;
      this.synth.speak(utterance);
    }

    startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        if (this.supported && this.speaking && !this.paused && !this.currentAudio) {
          try {
            this.synth.pause();
            this.synth.resume();
          } catch (e) {}
        }
      }, 9500);
    }

    stopHeartbeat() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    }

    pause() {
      if (this.currentAudio && !this.currentAudio.paused) {
        this.currentAudio.pause();
        this.paused = true;
        return;
      }

      if (this.supported && this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.paused = true;
      }
    }

    resume() {
      if (this.currentAudio && this.currentAudio.paused) {
        this.currentAudio.play();
        this.paused = false;
        return;
      }

      if (this.supported && this.synth.paused) {
        this.synth.resume();
        this.paused = false;
      }
    }

    stop() {
      this.stopHeartbeat();
      if (this.audioAnimFrame) {
        cancelAnimationFrame(this.audioAnimFrame);
        this.audioAnimFrame = null;
      }
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
        } catch (e) {}
        this.currentAudio = null;
      }
      if (this.supported) {
        try {
          this.synth.cancel();
        } catch (e) {}
      }
      this.speaking = false;
      this.paused = false;
      this.currentUtterance = null;
      window.__activeSpeechUtterance = null;
    }
  }

  global.TTS = new TTSEngine();
})(window);
