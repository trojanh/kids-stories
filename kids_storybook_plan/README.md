# Kids Storybook

An online _kids storybook_ that presents short, themed stories with comic‑style visual panels and browser‑only Text‑to‑Speech (TTS).  

## Features
- **Short stories** (5‑10 sentences) grouped by **theme** and **animal**.
- **Comic‑style SVG panel animations** that sync with narration.
- **TTS speed control** (0.5 × – 2 ×).
- **Length filter** – users can choose short, medium or long stories.
- **Tags** for quick lookup of animal, moral and other keywords.
- **Free hosting** on GitHub Pages (static export).
- **Analytics** via Google Analytics or Plausible (script tag).

## Getting Started
```bash
# Clone the repo
git clone https://github.com/trojanh/kids-stories.git
cd kids-stories

# Install dependencies
npm ci

# Run locally (development)
npm run dev

# Build for production and export static site
npm run build && npm run export

# Deploy to GitHub Pages (gh‑pages branch)
npm run deploy   # defined in package.json → pushes `out/` to gh‑pages
```

## Project Structure
```
├─ public/            # static assets (SVG panels, images)
├─ src/
│   ├─ data/
│   │   └─ stories.json   # story catalogue with tags & length
│   └─ pages/            # Next.js pages (theme grid, story reader)
├─ scripts/
│   └─ generateStories.js  # script that generated the 50 placeholder stories
├─ README.md
└─ package.json
```

## Contributing
Feel free to add real public‑domain Indian fables, replace placeholder SVGs, or improve the UI/UX.  Open a PR or issue on GitHub.
