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
| **21** | Add new stories to collection (expanding to 160 total) | ✅ Completed | Removed duplicate hedgehog story; added 8 distinct animal stories (animal names only) with custom vector SVGs | `src/data/stories.json`, `src/ui/data/stories.json` |
| **22** | Add full PWA support (Manifest, Service Worker, Offline) | ✅ Completed | Created `manifest.webmanifest`, SVG app icons, and network-first Service Worker with offline caching | `src/ui/manifest.webmanifest`, `src/ui/sw.js` |
| **23** | Show additional animal tags when themes are selected | ✅ Completed | Rendered dynamic animal tags when a theme (e.g. Animals) is selected; strictly single-row with top 8 frequent animals + dropdown | `src/ui/main.js`, `src/ui/style.css` |
| **24** | Compact animal filter UI & exclude non-animals | ✅ Completed | Replaced multi-row clutter with 38px horizontal pill bar + "More Animals (N) ▾" select; excluded non-animals (Farmer, Wheel, etc.); mapped Ass → Donkey | `src/ui/main.js`, `src/ui/style.css` |
| **25** | Title & story text terminology consistency audit | ✅ Completed | Harmonized 34 story titles with their modernised story texts: "The Donkey Carrying The Statue", "The Sick Stag" (fixed typo), "Rooster" instead of "Cock", "Donkey" instead of "Ass", etc. | `src/data/stories.json`, `src/data/audio_manifest.json`, `src/ui/data/` |
| **26** | Story ID alignment with updated titles & alias redirects | ✅ Completed | Renamed 31 story IDs to match their titles exactly (e.g. `the_donkey_carrying_the_statue`), renamed audio asset directories, updated manifest, and added seamless router `ID_ALIASES` | `src/data/stories.json`, `src/data/audio_manifest.json`, `src/ui/audio/`, `src/ui/main.js` |

---

## 2. Animal-Only Fable Localization, Custom Vector SVGs & Audio Pipeline

All proper human-like character names were removed to embrace the authentic, timeless style of Aesop's fables where characters are known strictly by their animal identities. In addition, the duplicate hedgehog story was replaced with distinct new animal fables (`firefly`, `beaver`, `pelican`, `kangaroo`), each paired with custom vector SVG artwork in `svg-art.js` and studio narration audio:

| Story ID | Fable Title | Animal Characters | Setting & Moral | Audio Duration |
|---|---|---|---|---|
| `the_brave_little_hedgehog` | **The Brave Little Hedgehog** | Hedgehog, Rabbit, Squirrel, Fox | Green Forest • *"The very things that make us different are often our greatest strengths."* | 61.8s (142 words) |
| `the_tortoise_and_the_shield_shell` | **The Tortoise and the Shield Shell** | Tortoise, Deer, Rabbit, Wildcat | Lakeside Meadow • *"Slowness and patience carry quiet, unbreakable strength."* | 59.7s (134 words) |
| `the_clever_chameleon` | **The Clever Chameleon** | Chameleon, Parrot, Eagle | Forest Canopy • *"True worth lies not in flashy looks, but in how we use our natural abilities."* | 60.2s (139 words) |
| `the_cuckoo_and_the_elephant` | **The Cuckoo and the Elephant** | Cuckoo, Elephant | Deep Woods • *"When different talents join forces, no challenge is too big to overcome."* | 64.6s (156 words) |
| `the_little_firefly` | **The Little Firefly** | Firefly, Butterfly, Mouse | Flowering Meadow • *"Even the quietest gift can shine with great purpose when needed most."* | 61.7s (143 words) |
| `the_beaver_and_the_rising_river` | **The Beaver and the Rising River** | Beaver, Rabbit, Deer | Riverbank • *"What makes us different can be the very gift that saves the day."* | 60.7s (138 words) |
| `the_pelican_and_the_rapids` | **The Pelican and the Rapids** | Pelican, Duck, Swan | Wide River • *"True worth is found not in fancy looks, but in how we help others."* | 64.7s (147 words) |
| `the_kangaroos_cozy_pouch` | **The Kangaroo's Cozy Pouch** | Kangaroo, Rabbit, Fox | Sunlit Valley • *"Every unique trait is a strength waiting for the right moment to shine."* | 60.0s (139 words) |

### Custom Vector SVG Avatars
Implemented dedicated handcrafted vector SVG avatar renderers in `src/ui/svg-art.js` for all newly introduced animals:
- `hedgehog`: Spiky fan coat, warm snout, black nose, little paws
- `chameleon`: Vibrant body, head crest, swivel eye, curly tail
- `cuckoo`: Streamlined songbird body, wing feathers, singing beak
- `firefly`: Translucent wings, dark thorax, glowing lantern belly with aura
- `beaver`: Paddle tail with cross-hatch texture, rich brown body, white buck teeth
- `pelican`: Silver-grey feathers, neck curve, famous yellow scoop beak pouch
- `kangaroo`: Muscular tail, alert ears, deep pouch, powerful jumping feet
- `wildcat`: Spotted tawny coat, sharp ears, fierce green eyes

### Audio Generation
- Synthesized single continuous high-fidelity audio tracks using Edge-TTS (`en-US-AnaNeural`) with rate `-4%` and pitch `+2Hz`.
- Generated word-level timestamp boundaries (`words.json`) for millimeter-exact karaoke sync.
- Updated `data/audio_manifest.json` — all **160 / 160 stories** now have complete studio narration coverage.

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
   - `python3 src/data/test_stories.py` passed across all 160 stories.
2. **Build Pipeline (`npm run build`)**:
   - Synchronized static data bundles to `src/ui/data/`.
   - Regenerated `sitemap.xml` with 161 canonical URLs.
   - Verified 160 narrated story audios in `src/ui/audio/`.
3. **Headless Chrome Automation (`scripts/test_ui_chrome.js`)**:
   - Validated initial 24-card library render with 0 console errors.
   - Tested interactive pagination to page 2 (`?page=2`).
   - Verified 0 `.theme-badge` elements on cards across all themes.
   - Tested compact single-row animal filter UI (height ≤ 38px, top 8 pills + dropdown, zero non-animal leakage, toggle & clear actions).
   - Tested reader view navigation, sticky stage SVG, moral display, and studio narration badges.
