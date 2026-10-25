# Implementation Plan: TalePickle UI Enhancements & Feature Suite

**Project:** TalePickle — Interactive Illustrated Kids Storybook  
**Branch:** `feature/storybook-ui-enhancements`  
**Location:** `plans/storybook_ui_enhancements_plan.md`  
**Status:** Completed & Verified (157 Stories, 100% Studio Narration Audio, PWA Offline, Interactive Quiz, Mobile Responsive)  
**Date:** October 2026  

---

## 1. Executive Summary & Traceability Matrix

This document details the architecture, file modifications, international localization, testing protocols, and verification for the requested feature suite on **TalePickle**.

| # | Feature Request | Status | Implementation Details | Core Files Affected |
|:---|:---|:---:|:---|:---|
| **1** | Make video / illustration section sticky for mobile view | ✅ Completed | Applied `position: sticky; top: 0; z-index: 30;` to `.reader-stage` on mobile breakpoints, with `.reader-card { overflow: visible }` breakout | `src/ui/style.css` |
| **2** | Remove theme type counts from filter pills | ✅ Completed | Cleaned theme filter chips to `${getThemeEmoji(theme)} ${theme}` without numeric count badges | `src/ui/main.js` |
| **3** | Improve SVG images (Hedgehog, Chameleon, Deer, etc.) | ⏸️ Parked | Explicitly parked for later phase; tracked in `BACKLOG.md` | `BACKLOG.md` |
| **4** | Fallback to browser audio when downloaded audio is not available | ✅ Completed | Triple-layer fallback: `audio.onerror`, 2.5s network timeout, and `.catch()` fallback to Web Speech API | `src/ui/tts.js` |
| **5** | Remove theme badge from story cards for all themes | ✅ Completed | Stripped theme badges from story card thumbnail overlays; right-aligned favorite button | `src/ui/main.js`, `src/ui/style.css` |
| **6** | Improve landing description and remove "English" | ✅ Completed | Updated landing copy to "Fun Stories & Moral Tales for Curious Minds" with child-friendly phrasing | `src/ui/main.js`, `src/ui/index.html` |
| **7** | Remove total story counts from results header | ✅ Completed | Cleaned `.results-header` to display active search/filters without total counts | `src/ui/main.js` |
| **8** | Auto audio pipeline with Cloudflare (R2 + CDN) | ⏸️ Parked | Explicitly parked for later phase; tracked in `BACKLOG.md` | `BACKLOG.md` |
| **9** | Start story listing with random stories instead of fixed order | ✅ Completed | Implemented Fisher-Yates shuffle `shuffleArray()` on boot so users discover fresh stories on each visit | `src/ui/main.js` |
| **10** | Clean up audio controls under collapsible CTA | ✅ Completed | Grouped speed slider, voice select, auto-advance, and style toggle into collapsible narration drawer | `src/ui/main.js`, `src/ui/style.css` |
| **11** | Format "Reading Sentence.." & "Tap any sentence.." for mobile | ✅ Completed | Replaced desktop text with compact sentence counter pill and `💡 Tap sentence to jump` hint | `src/ui/main.js`, `src/ui/style.css` |
| **12** | Improve animal & character styling on story page | ✅ Completed | Added `.story-character-pills`, primary `.story-animal-pill`, and secondary `.story-char-chip` | `src/ui/main.js`, `src/ui/style.css` |
| **13** | Show moral at the end of the story in the reader view | ✅ Completed | Inserted prominent `.reader-story-moral-card` directly following the final paragraph sentence | `src/ui/main.js`, `src/ui/style.css` |
| **14** | Add interactive comprehension quiz on post-completion screen | ✅ Completed | Created 2-question interactive quiz testing story moral and animal recall with instant feedback | `src/ui/main.js`, `src/ui/style.css` |
| **15** | Add prominent Play button on story page | ✅ Completed | Added high-contrast `#heroPlayStoryBtn` in reader header with speaking wave animation | `src/ui/main.js`, `src/ui/style.css` |
| **16** | Use AI generated SVG images | ⏸️ Parked | Handled in parallel diffusion / Ollama pipeline; tracked in `BACKLOG.md` | `BACKLOG.md` |
| **17** | Improve footer across all pages (center-aligned, uniform) | ✅ Completed | Centralized `renderFooter()` component with TalePickle title, tagline, and removed speech note | `src/ui/main.js`, `src/ui/style.css` |
| **18** | Add pagination with query params (`?page=1`) | ✅ Completed | Implemented 24 stories/page pagination with `?page=X` synchronization, popstate history, and scroll-to-top | `src/ui/main.js`, `src/ui/style.css` |
| **19** | Add SEO / AI discovery text & structured metadata | ✅ Completed | Added `.seo-discovery-card` on catalog, updated JSON-LD Schema.org, Open Graph, and meta tags | `src/ui/index.html`, `src/ui/main.js` |
| **20** | Make theme & length filters concise for mobile view | ✅ Completed | Horizontal smooth touch-scrolling row with compact chips and hidden scrollbars on mobile | `src/ui/style.css` |
| **21** | Add 5 new stories from Gemini share link to collection | ✅ Completed | Localized character names for international audience, added to collection (now 157 stories total) | `src/data/stories.json`, `src/ui/data/stories.json` |
| **22** | Add full PWA support (Manifest, Service Worker, Offline) | ✅ Completed | Created `manifest.webmanifest`, SVG app icons, and network-first Service Worker with offline caching | `src/ui/manifest.webmanifest`, `src/ui/sw.js` |

---

## 2. International Story Localization & Audio Pipeline

The 5 newly added stories were revised with internationally identifiable, warm, and memorable character names while keeping the text accessible and easy for early readers:

| Story ID | Final Title | Characters | Setting & Moral | Audio Duration |
|---|---|---|---|---|
| `pip_the_prickly_hero` | **Pip the Prickly Hero** | **Pip** (hedgehog), **Bramble** (rabbit), **Squeak** (squirrel), fox | Whispering Woods • *"The very things that make us different are often our greatest strengths."* | 59.7s (132 words) |
| `spike_the_brave_hedgehog` | **Spike and His Spiky Armor** | **Spike** (hedgehog), **Clover** (rabbit), **Rusty** (fox) | Pinecone Woods • *"Everyone is built with a special quality that becomes their greatest power."* | 60.0s (137 words) |
| `toby_the_strong_shell` | **Toby and the Shield Shell** | **Toby** (tortoise), **Willow** (deer), **Benny** (bunny), **Shadow** (wildcat) | Lakeside Meadow • *"Slowness and patience carry quiet, unbreakable strength."* | 58.3s (126 words) |
| `cam_the_clever_chameleon` | **Cam's Camouflage Magic** | **Cam** (chameleon), **Polly** (parrot), eagle | Forest Canopy • *"True worth lies not in flashy looks, but in how we use our natural abilities."* | 58.0s (132 words) |
| `piper_and_barnaby` | **Piper and Barnaby Save the Forest** | **Piper** (cuckoo), **Barnaby** (elephant) | Green Forest • *"When different talents join forces, no challenge is too big to overcome."* | 61.3s (140 words) |

### Audio Generation
- Synthesized single continuous high-fidelity audio tracks using Edge-TTS (`en-US-AnaNeural`) with rate `-4%` and pitch `+2Hz`.
- Generated word-level timestamp boundaries (`words.json`) for millimeter-exact karaoke sync.
- Updated `data/audio_manifest.json` — all **157 / 157 stories** now have complete studio narration coverage.

---

## 3. Architecture & Key Technical Fixes

### 3.1 Mobile Sticky Illustration Breakdown
To allow `position: sticky; top: 0` on `.reader-stage` without breaking inside parent wrappers, `.reader-card` has `overflow: visible` explicitly applied within mobile media queries (`max-width: 768px`).

### 3.2 Service Worker Cross-World Preload Handling
Resolved Chromium cross-world service worker preload mismatches by routing `data/*.json` requests through a network-first strategy with cache fallback in `sw.js` and aligning `<link rel="preload">` configurations.

### 3.3 State & URL Synchronization
- Page query parameters (`?page=2`) synchronize seamlessly with browser history through `history.pushState` and `window.addEventListener('popstate', router)`.
- Navigating between catalog and reader restores page positions naturally.

---

## 4. Verification & Quality Assurance

1. **Schema & Integrity Validation (`npm test`)**:
   - `python3 src/data/test_stories.py` passed across all 157 stories.
2. **Build Pipeline (`npm run build`)**:
   - Synchronized static data bundles to `src/ui/data/`.
   - Regenerated `sitemap.xml` with 158 canonical URLs.
   - Verified 157 narrated story audios in `src/ui/audio/`.
3. **Headless Chrome Automation (`scripts/test_ui_chrome.js`)**:
   - Validated initial 24-card library render with 0 console errors.
   - Tested interactive pagination to page 2 (`?page=2`).
   - Verified 0 `.theme-badge` elements on cards across all themes.
   - Tested reader view navigation, sticky stage SVG, moral display, and studio narration badges.
