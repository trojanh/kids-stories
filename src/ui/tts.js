/**
 * tts.js
 * Enhanced Browser-native Text-To-Speech engine using the Web Speech API.
 * Features:
 *  - Intelligent Neural/Natural voice scoring & ranking (prefers Google, Microsoft Natural, Apple Siri/Enhanced)
 *  - Real-time karaoke word boundary tracking (SpeechSynthesisUtterance.onboundary)
 *  - Storyteller cadence tuning (inflection, natural pause preprocessing, kid-friendly pitch & rate)
 *  - Chromium 15-second speech freeze fix (watchdog heartbeat timer)
 *  - V8 Garbage Collection protection (prevent premature utterance disposal)
 *  - Mobile audio autoplay unlock handler
 *  - Instant voice audition / preview
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
      this.speaking = false;
      this.paused = false;
      this.audioUnlocked = false;
      this.heartbeatTimer = null;

      // Rate settings (persisted in localStorage)
      // 0.88 - 0.90 is the optimal cadence for young children learning English
      const savedRate = parseFloat(localStorage.getItem(STORAGE_KEY_RATE));
      this.rate = !isNaN(savedRate) && savedRate >= 0.5 && savedRate <= 2.0 ? savedRate : 0.9;

      // Pitch settings: 1.06 gives a warm, friendly, cheerful storytelling tone
      const savedPitch = parseFloat(localStorage.getItem(STORAGE_KEY_PITCH));
      this.pitch = !isNaN(savedPitch) && savedPitch >= 0.8 && savedPitch <= 1.4 ? savedPitch : 1.06;

      this.selectedVoiceURI = localStorage.getItem(STORAGE_KEY_VOICE) || null;

      // Event callbacks
      this.onStart = null;
      this.onEnd = null;
      this.onError = null;
      this.onBoundary = null;
      this.onVoicesReady = null;

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
     * Unlocks speech synthesis on mobile browsers that restrict autoplay.
     */
    unlockAudio() {
      if (this.audioUnlocked || !this.supported) return;
      try {
        const emptyUtterance = new SpeechSynthesisUtterance('');
        emptyUtterance.volume = 0;
        this.synth.speak(emptyUtterance);
        this.audioUnlocked = true;
      } catch (e) {
        // Ignore silent failure
      }
    }

    loadVoices() {
      if (!this.supported) return;
      this.voices = this.synth.getVoices() || [];
      if (this.onVoicesReady) {
        this.onVoicesReady(this.voices);
      }
    }

    getVoices() {
      return this.voices;
    }

    /**
     * Scores a voice based on quality, neural/natural synthesis, and storytelling suitability.
     * Higher score = better audio fidelity for children's fables.
     */
    scoreVoice(voice) {
      if (!voice || !voice.lang) return -999;
      const lang = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();

      // Only score English voices for this storybook
      if (!lang.startsWith('en')) {
        return -500;
      }

      let score = 50; // base score for English

      // 1. Natural / Neural / Enhanced / Premium voices (Top tier cloud & system voices)
      if (name.includes('natural')) score += 110;
      if (name.includes('neural')) score += 100;
      if (name.includes('enhanced')) score += 85;
      if (name.includes('premium')) score += 80;
      if (name.includes('online')) score += 45;

      // 2. High quality cloud synthesizers
      if (name.includes('google')) score += 55;
      if (name.includes('siri') || name.includes('apple')) score += 50;

      // 3. Known warm, friendly storyteller voices for children
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

      // 4. Dialect priority (Indian English en-IN preferred, followed by en-US, en-GB, en-AU)
      if (lang === 'en-in' || lang === 'en_in') {
        score += 30;
      } else if (lang === 'en-us' || lang === 'en_us') {
        score += 20;
      } else if (lang === 'en-gb' || lang === 'en_gb') {
        score += 20;
      } else if (lang === 'en-au' || lang === 'en_au') {
        score += 15;
      }

      // 5. Remote / Cloud service voices often use neural server models in Chrome/Edge
      if (!voice.localService) {
        score += 15;
      }

      // 6. Demote robotic or dated legacy synthesizers
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

    /**
     * Returns all available English voices sorted from highest quality to lowest.
     */
    getRankedVoices() {
      if (!this.voices || this.voices.length === 0) return [];

      const enVoices = this.voices.filter((v) => v.lang && v.lang.startsWith('en'));
      const pool = enVoices.length > 0 ? enVoices : this.voices;

      return pool.slice().sort((a, b) => this.scoreVoice(b) - this.scoreVoice(a));
    }

    /**
     * Returns a user-friendly badge indicating voice category/quality.
     */
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

    /**
     * Formats voice name for user select dropdowns.
     */
    formatVoiceLabel(voice) {
      if (!voice) return '';
      const badge = this.getVoiceBadge(voice);
      return `${badge} ${voice.name} (${voice.lang})`;
    }

    /**
     * Picks the best available storyteller voice.
     */
    getBestDefaultVoice() {
      if (!this.voices || this.voices.length === 0) return null;

      // 1. Saved user preference
      if (this.selectedVoiceURI) {
        const found = this.voices.find((v) => v.voiceURI === this.selectedVoiceURI);
        if (found) return found;
      }

      // 2. Highest-ranking English voice based on quality scoring
      const ranked = this.getRankedVoices();
      if (ranked.length > 0 && this.scoreVoice(ranked[0]) > 0) {
        return ranked[0];
      }

      // 3. Fallback to any English or first voice
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

    /**
     * Preprocesses text to improve natural pauses and dialogue pacing.
     * CRITICAL: Uses strictly 1-to-1 character replacements to guarantee that
     * SpeechSynthesisUtterance.onboundary charIndex matches the DOM word spans exactly.
     */
    preprocessStoryText(text) {
      if (!text) return '';
      return text
        .replace(/—/g, ',') // em-dash replaced with comma for breath pause
        .replace(/–/g, ',') // en-dash replaced with comma
        .replace(/[“”]/g, '"') // Normalize curly quotes to straight quotes
        .replace(/[‘’]/g, "'"); // Normalize curly apostrophes
    }

    /**
     * Watchdog timer to prevent Chromium from freezing long utterances (>15 seconds).
     */
    startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        if (this.supported && this.speaking && !this.paused) {
          try {
            this.synth.pause();
            this.synth.resume();
          } catch (e) {
            // Safe guard against browser quirk
          }
        }
      }, 9500);
    }

    stopHeartbeat() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    }

    /**
     * Speaks the given text with word-by-word boundary callbacks and full auto-recovery.
     */
    speak(text, onFinishedCallback) {
      if (!this.supported) {
        console.warn('SpeechSynthesis not supported on this browser.');
        if (onFinishedCallback) onFinishedCallback();
        return;
      }

      this.stop(); // Stop any pending speech and reset state

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

      // Real-time word boundary events (Karaoke highlighting)
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

        // Normal cancellation when user skips or navigates
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

      // Prevent V8 garbage collection bug in Chromium
      this.currentUtterance = utterance;
      window.__activeSpeechUtterance = utterance;

      this.synth.speak(utterance);
    }

    /**
     * Audition/preview a voice with a cheerful kid-friendly sentence.
     */
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

    pause() {
      if (this.supported && this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.paused = true;
      }
    }

    resume() {
      if (this.supported && this.synth.paused) {
        this.synth.resume();
        this.paused = false;
      }
    }

    stop() {
      this.stopHeartbeat();
      if (this.supported) {
        try {
          this.synth.cancel();
        } catch (e) {
          // Safe guard against cancel errors
        }
        this.speaking = false;
        this.paused = false;
        this.currentUtterance = null;
        window.__activeSpeechUtterance = null;
      }
    }
  }

  global.TTS = new TTSEngine();
})(window);
