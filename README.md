# 🥒 TalePickle — Kids Storybook

An interactive, illustrated children's storybook app featuring **150+ classic fables** rewritten in simple, engaging English for young children (ages 5–10). Built for zero-cost, high-performance static hosting on **GitHub Pages** with custom domain support.

🌐 **Live Website**: [https://talepickle.com/](https://talepickle.com/)

---

## ✨ Features

- **150+ Illustrated Tales**: Curated fables across 5 themes:
  - 🦁 **Animals**
  - 💡 **Life Lessons**
  - 👨‍👩‍👧‍👦 **Family**
  - 🌿 **Nature**
  - ⚡ **Mythology**
- **Dynamic Animated SVG Comic Panels**:
  - Procedural vector scenes with animated sun, drifting clouds, rolling hills, and cute bouncy animal avatars.
  - Vector-sharp on all screen sizes, instant load times, zero external image CDNs required.
- **Studio Neural Audio & Web Speech Narration**:
  - High-fidelity pre-generated Microsoft Neural TTS (`en-US-AnaNeural`) with millisecond-exact word karaoke synchronization.
  - High-performance streaming: HTTP 206 byte-ranges, whole-story background prefetching, in-memory audio pooling, and gapless next-sentence pre-warming.
  - Seamless fallback to browser Web Speech API when offline or for unindexed tales.
  - Fine-grained speed slider ($0.5\times$ to $2.0\times$) persisted in `localStorage`.
  - Sentence-by-sentence reading with glowing visual highlight and auto-advance.
  - Comprehensive guide: [Audio Streaming Optimization Plan](plans/audio_streaming_optimization_plan.md).
- **Child-Friendly UI/UX**:
  - Touch-first design with large hit targets ($\ge 44\text{px}$).
  - Live search by story title, animal, characters, or moral keywords.
  - Filter chips for theme and length (⚡ Short, 📖 Medium, 🌟 Long).
  - Favorites bookmarking ("❤️") saved in `localStorage`.
  - "🎲 Surprise Me!" random tale picker.
  - End-of-story moral celebration card with animated confetti burst.
- **GitHub Pages Ready**:
  - Pure client-side static deployment directly via GitHub Actions automated pipeline.
  - Uses relative paths so it functions properly whether served from root or subpaths like `/kids-stories/`.

---

## 🚀 Quick Start (Local Development)

### Run with Node.js
```bash
# Clone the repository
git clone https://github.com/trojanh/kids-stories.git
cd kids-stories

# Start the local development server (serves on http://localhost:8080)
npm start
```

### Run with Python (alternative)
```bash
# Serve static files directly
python3 -m http.server 8080 --directory src/ui
```

Open `http://localhost:8080` in your web browser.

---

## 🧪 Testing

Run the automated test suite verifying schema completeness, duplicate IDs, sentence counts, and panel parity:

```bash
pytest src/data/test_stories.py -v
```

---

## 📦 Building for GitHub Pages

Run the build script to update sitemaps, robots.txt, and verify audio assets:

```bash
npm run build
```

---

## 🌐 Deploying to GitHub Pages (`github.io`)

This repository uses automated deployment with [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) directly from `src/ui/`.
1. Go to your repository on GitHub: `https://github.com/trojanh/kids-stories/settings/pages`
2. Under **Build and deployment** $\rightarrow$ **Source**, select **GitHub Actions**.
3. Push to `main` branch: GitHub Actions will automatically verify tests, package `src/ui/`, and deploy the live site to `https://trojanh.github.io/kids-stories/`.

---

## 📁 Project Structure

```
├── src/
│   ├── ui/                      # Web application & static distribution
│   │   ├── index.html           # Main entry HTML
│   │   ├── 404.html             # Clean SPA routing fallback
│   │   ├── style.css            # Responsive stylesheet
│   │   ├── main.js              # App router, search, filter, and reader controller
│   │   ├── tts.js               # Neural continuous audio engine with karaoke sync
│   │   ├── svg-art.js           # Procedural animated SVG comic illustration engine
│   │   ├── rough.js             # Hand-drawn sketchy rendering library
│   │   ├── .nojekyll            # GitHub Pages Jekyll bypass flag
│   │   ├── audio/               # Single canonical continuous story audio (.mp3 & words.json)
│   │   └── data/
│   │       ├── stories.json     # 152 verified and simplified stories
│   │       └── audio_manifest.json # Audio duration & sentence cue-point index
│   └── data/
│       ├── stories.json         # Master dataset of stories
│       ├── audio_manifest.json  # Master audio cue-point manifest
│       └── test_stories.py      # Pytest schema and length validation suite
├── scripts/
│   ├── build.py                 # Static build & SEO generator
│   ├── build_docs.py            # Compatibility builder script
│   ├── generate_audio.py        # Edge-TTS continuous neural audio batch pipeline
│   ├── serveUi.js               # Zero-dependency local Node server with gzip & range streaming
│   ├── transform_aesop.py       # Source transformer for fables
│   └── apply_enrichments.py     # Enrichment patcher for characters and tags
├── .github/
│   └── workflows/
│       └── deploy.yml           # Automated GitHub Pages CI/CD workflow
├── plans/                       # Architectural & feature implementation plans
└── package.json                 # Scripts and metadata
```
