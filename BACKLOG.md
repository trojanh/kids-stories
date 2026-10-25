# 📋 TalePickle Feature Backlog & Parked Items Tracker

This tracker documents features and optimizations that have been planned, architected, and parked for upcoming implementation phases.

---

## ⏸️ Parked Items (Pending Next Iteration)

### 1. 🎨 Improve SVG Images (Hedgehog, Chameleon, Deer, etc.)
* **Status:** Parked for later session
* **Target Files:** `src/ui/svg-art.js`
* **Description:** 
  - Add dedicated vector avatars centered at (50, 50) for newly added animal characters:
    - **Hedgehog (Pip & Chintu):** Adorable rounded body with defined soft spines, curious snout, sparkling eye, and curled defensive ball state for combat/rescue sentences.
    - **Chameleon (Rangoli):** Curled spiral tail, ridged crest, adaptive color-shifting tones (green leaves vs. tree bark).
    - **Deer / Fawn:** Graceful curved antlers and delicate ear posture.
    - **Cuckoo / Forest Birds:** Perched and flying wings with plumage.
    - **Wildcat / Feline:** Pointed ears, whisker details, and sleek tail.
    - **Squirrel:** Bushy curled tail and seed-holding posture.
  - Update `getCharacterConfig()` in `src/ui/svg-art.js` to eliminate fallback to generic human avatars (`AVATARS.man`).
  - Enhance scenery lighting, gradients, and subtle motion dynamics for Clean Vector and Rough.js modes.

---

### 2. 🎙️ Auto Audio Pipeline with Cloudflare (R2 + CDN)
* **Status:** Parked for later session
* **Target Files:** `scripts/cloudflare_audio_pipeline.py`, `src/ui/tts.js`, `scripts/cloudflare_config.json.example`
* **Description:**
  - Automated batch audio generation pipeline using Edge-TTS (`en-US-AnaNeural`) with millisecond timestamp extraction for new stories.
  - Generates continuous `story.mp3`, sentence `[start, end]` ranges, and `words.json`.
  - Directly uploads audio and boundary manifests to a Cloudflare R2 bucket using S3-compatible APIs.
  - Configurable CDN base URL in `tts.js` (e.g. `https://audio.talepickle.com/`) with zero egress bandwidth costs and local fallback.

---

### 3. 🤖 Use AI Generated SVG Images
* **Status:** Parked for later session (Being executed in dedicated parallel artwork generation session)
* **Target Files:** `src/ui/data/svgs/`, `src/ui/svg-art.js`
* **Description:**
  - Ingestion of high-fidelity AI-generated comic SVG panels for all stories and scenes.
  - Replace procedural vector panels with scene-specific AI artwork while retaining fast inline rendering.

---

*Last Updated: October 2026*
