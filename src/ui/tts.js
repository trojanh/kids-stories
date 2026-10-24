/**
 * tts.js
 * Browser-only Text-To-Speech engine using the Web Speech API.
 * Supports speed adjustment (0.5x - 2.0x), voice detection, sentence progress, and auto-advance.
 */

(function (global) {
  const STORAGE_KEY_RATE = 'kids_storybook_tts_rate';
  const STORAGE_KEY_VOICE = 'kids_storybook_tts_voice';

  class TTSEngine {
    constructor() {
      this.synth = window.speechSynthesis || null;
      this.supported = !!this.synth;
      this.voices = [];
      this.currentUtterance = null;
      this.speaking = false;
      this.paused = false;

      // Rate settings (persisted in localStorage)
      const savedRate = parseFloat(localStorage.getItem(STORAGE_KEY_RATE));
      this.rate = !isNaN(savedRate) && savedRate >= 0.5 && savedRate <= 2.0 ? savedRate : 0.9; // 0.9 is great for kids

      this.selectedVoiceURI = localStorage.getItem(STORAGE_KEY_VOICE) || null;

      // Event callbacks
      this.onStart = null;
      this.onEnd = null;
      this.onError = null;
      this.onVoicesReady = null;

      if (this.supported) {
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }
    }

    loadVoices() {
      if (!this.supported) return;
      this.voices = this.synth.getVoices();
      if (this.onVoicesReady) {
        this.onVoicesReady(this.voices);
      }
    }

    getVoices() {
      return this.voices;
    }

    getBestDefaultVoice() {
      if (!this.voices || this.voices.length === 0) return null;

      // 1. Check if user previously saved a voice
      if (this.selectedVoiceURI) {
        const found = this.voices.find(v => v.voiceURI === this.selectedVoiceURI);
        if (found) return found;
      }

      // 2. Prefer Indian English voice if available (en-IN)
      const indianVoice = this.voices.find(v => v.lang && (v.lang === 'en-IN' || v.lang.startsWith('en-IN')));
      if (indianVoice) return indianVoice;

      // 3. Prefer natural, friendly English voice
      const friendlyVoices = this.voices.filter(
        v =>
          v.lang &&
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Google') || v.name.includes('Junior'))
      );
      if (friendlyVoices.length > 0) return friendlyVoices[0];

      // 4. Default to any English voice
      const anyEnglish = this.voices.find(v => v.lang && v.lang.startsWith('en'));
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

    speak(text, onFinishedCallback) {
      if (!this.supported) {
        console.warn('SpeechSynthesis not supported on this browser.');
        if (onFinishedCallback) onFinishedCallback();
        return;
      }

      this.stop(); // Stop any pending speech

      if (!text || !text.trim()) {
        if (onFinishedCallback) onFinishedCallback();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.rate;
      utterance.pitch = 1.05; // Slightly cheerful pitch for children

      const voice = this.getBestDefaultVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        this.speaking = true;
        this.paused = false;
        if (this.onStart) this.onStart();
      };

      utterance.onend = () => {
        this.speaking = false;
        this.paused = false;
        if (this.onEnd) this.onEnd();
        if (onFinishedCallback) onFinishedCallback();
      };

      utterance.onerror = (e) => {
        this.speaking = false;
        this.paused = false;
        // Interrupted or canceled occurs normally when user pauses or skips
        if (e.error === 'interrupted' || e.error === 'canceled') {
          return;
        }
        if (e.error === 'not-allowed') {
          console.info('TTS playback requires user interaction before audio can play.');
        } else {
          console.warn('TTS utterance error:', e.error || e);
        }
        if (this.onError) this.onError(e);
        // Do NOT call onFinishedCallback on error to avoid runaway loops
      };

      this.currentUtterance = utterance;
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
      if (this.supported) {
        this.synth.cancel();
        this.speaking = false;
        this.paused = false;
      }
    }
  }

  global.TTS = new TTSEngine();
})(window);
