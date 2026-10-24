# 📚 Magic Kids Storybook

An interactive, illustrated children's storybook app featuring **150+ classic fables** rewritten in simple, engaging English for young children (ages 5–10). Built for zero-cost, high-performance static hosting on **GitHub Pages** (`github.io`).

🌐 **Live GitHub Pages URL**: [https://trojanh.github.io/kids-stories/](https://trojanh.github.io/kids-stories/)

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
- **Web Speech API Narration & Speed Control**:
  - Browser-native speech synthesis with natural voice selection (prefers Indian English `en-IN` or friendly children's voices).
  - Fine-grained speed slider ($0.5\times$ to $2.0\times$) persisted in `localStorage`.
  - Sentence-by-sentence reading with glowing visual highlight and auto-advance.
- **Child-Friendly UI/UX**:
  - Touch-first design with large hit targets ($\ge 44\text{px}$).
  - Live search by story title, animal, characters, or moral keywords.
  - Filter chips for theme and length (⚡ Short, 📖 Medium, 🌟 Long).
  - Favorites bookmarking ("❤️") saved in `localStorage`.
  - "🎲 Surprise Me!" random tale picker.
  - End-of-story moral celebration card with animated confetti burst.
- **GitHub Pages Ready**:
  - Pure client-side static deployment (`docs/` folder & GitHub Actions automated pipeline).
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
python3 -m http.server 8080 --directory docs
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

Run the build script to update the distribution bundle in `docs/`:

```bash
npm run build
```

---

## 🌐 Deploying to GitHub Pages (`github.io`)

### Option A: Automated GitHub Actions (Recommended)
This repository includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
1. Go to your repository on GitHub: `https://github.com/trojanh/kids-stories/settings/pages`
2. Under **Build and deployment** $\rightarrow$ **Source**, choose **GitHub Actions**.
3. Push to `main` branch: GitHub Actions will automatically verify tests, package `docs/`, and deploy the live site to `https://trojanh.github.io/kids-stories/`.

### Option B: Deploy from `/docs` folder
1. In repository settings $\rightarrow$ **Pages**:
2. Set **Source** to **Deploy from a branch**.
3. Set **Branch** to `main` and **Folder** to `/docs`.
4. Click **Save**. Your site will be published at `https://trojanh.github.io/kids-stories/`.

---

## 📁 Project Structure

```
├── docs/                        # Static distribution bundle for GitHub Pages
│   ├── index.html               # Main entry HTML
│   ├── style.css                # Polished responsive stylesheet
│   ├── main.js                  # App router, search, filter, and reader controller
│   ├── tts.js                   # Web Speech API engine with speed controls
│   ├── svg-art.js               # Procedural animated SVG comic illustration engine
│   ├── .nojekyll                # GitHub Pages Jekyll bypass flag
│   └── data/
│       └── stories.json         # 152 verified and simplified stories
├── src/
│   ├── ui/                      # Source UI components & styles
│   └── data/
│       ├── stories.json         # Master dataset of stories
│       └── test_stories.py      # Pytest schema and length validation suite
├── scripts/
│   ├── build_docs.py            # Bundler script for docs/ folder
│   ├── serveUi.js               # Zero-dependency local Node server
│   ├── transform_aesop.py       # Source transformer for fables
│   └── apply_enrichments.py     # Enrichment patcher for characters and tags
├── .github/
│   └── workflows/
│       └── deploy.yml           # Automated GitHub Pages CI/CD workflow
├── implementation_plan.md       # Architectural specification
└── package.json                 # Scripts and metadata
```
