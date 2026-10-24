# Implementation Plan – Kids Storybook (Optimised Rendering & TTS Speed Control)

## 1. Core Vision
- Short, themed stories (5‑10 sentences each).
- Comic‑style SVG panel animations that sync with narration.
- Browser‑only Text‑to‑Speech with user‑controllable speed.
- Free hosting on **GitHub Pages** (static export).
- Minimal cost, privacy‑first analytics (Google Analytics or Plausible).

## 2. Tech Stack (static, low‑overhead)
| Layer | Choice |
|-------|--------|
| Front‑end | Next.js (React) + TypeScript |
| Styling | Tailwind CSS (purged) |
| Animations | Framer Motion **or** pure CSS keyframes |
| TTS | Web Speech API (`speechSynthesis`) |
| Data | JSON files in `src/data/` |
| Hosting | GitHub Pages (`gh‑pages` branch) |
| Analytics | GA or Plausible script tag |
| CI/CD | GitHub Actions → `npm run export` → push to `gh‑pages` |

## 3. Rendering Optimisations
- Pre‑compressed SVGs (SVGO) and `preload` next panel.
- Lazy‑load panels via `IntersectionObserver`.
- Sentence‑by‑sentence rendering; only active line animated.
- Custom `useTTS` hook that respects a `rate` state (speed control).
- Critical CSS inlined; bundle ≈ 70 KB (JS) + 45 KB Tailwind (purged).
- All assets cached for offline usage.

## 4. UI/UX Flow
```
Header (logo + TTS toggle)
└─ Theme Grid (icons → animal sub‑list)
   └─ Story Reader (full‑screen)
       ├─ Animated SVG panel
       ├─ Speed control slider (0.5‑2.0×)
       ├─ Current sentence (large, highlighted while speaking)
       └─ Bottom bar: Play/Pause, Next, Volume, Like, Home
```
- Touch‑first, large hit targets (≥44 px).
- Speed persisted in `localStorage`.
- Disclaimer banner if `speechSynthesis` unsupported.

## 5. Component Overview (React)
- `Header`, `ThemeGrid`, `ThemeCard`, `AnimalModal`.
- `StoryReader` → `AnimatedPanel`, `TextLine`, `SpeedControl`, `Controls`.
- `useTTS` hook (creates utterance with dynamic `rate`).
- All components memoised for minimal re‑renders.

## 6. Development Sprints (14 days)
| Sprint | Goal |
|-------|------|
| 0‑3   | Scaffold repo, add Tailwind, sample stories JSON. |
| 4‑6   | Render first story, lazy‑load next panel, TTS with speed control. |
| 7‑9   | UI polish (buttons, speed slider, disclaimer). |
| 10‑12 | Theme grid, analytics injection, CI Action for GitHub Pages. |
| 13‑14 | Deploy, share URL, collect first‑round feedback. |

## 7. Risks & Mitigations
- No server‑side functions → rely on client‑side APIs. Use external form services for feedback.
- Browser TTS not universal → clear disclaimer; no fallback needed per spec.
- Asset size → SVGO + lazy loading keeps first‑paint < 1 s even on 3G.

---

### Next Topic: Sourcing the Stories
We’ll now discuss how to obtain short, kid‑friendly stories suitable for the app (themes, animals, copyright, tone, etc.).
