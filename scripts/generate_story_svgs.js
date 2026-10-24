#!/usr/bin/env node
/**
 * generate_story_svgs.js
 * -----------------------
 * CLI tool to analyze story text and generate standalone SVG illustrations locally on disk.
 * Supports:
 *   - Local semantic scene engine (instant, zero dependencies, offline)
 *   - Rough.js hand-drawn storybook sketch or clean vector styles
 *   - Optional integration with local Ollama or cloud AI providers
 *
 * Usage:
 *   node scripts/generate_story_svgs.js --story tiger_and_mice
 *   node scripts/generate_story_svgs.js --story crow_and_water_pot --style clean
 *   node scripts/generate_story_svgs.js --all
 *   node scripts/generate_story_svgs.js --list tiger_and_mice,tortoise_and_hare,fox_and_grapes
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STORIES_PATH = path.join(ROOT_DIR, 'src', 'data', 'stories.json');
const DEFAULT_OUT_DIRS = [
  path.join(ROOT_DIR, 'src', 'ui', 'data', 'svgs'),
  path.join(ROOT_DIR, 'docs', 'data', 'svgs'),
];

// Initialize global browser-like environment for svg-art.js & rough.js
global.window = global;

function showHelp() {
  console.log(`
Storybook SVG CLI Generator
===========================
Generates standalone SVG illustrations on disk by analyzing story narratives.

Options:
  --story <id>           Generate SVGs for a single story ID (e.g., tiger_and_mice)
  --all                  Generate SVGs for all 152 stories
  --list <id1,id2,...>   Generate SVGs for a comma-separated list of story IDs
  --style <rough|clean>  Illustration style (default: "rough" for Rough.js sketch)
  --out <dir>            Custom output directory (default: src/ui/data/svgs and docs/data/svgs)
  --help                 Show this help menu

Examples:
  node scripts/generate_story_svgs.js --story tiger_and_mice
  node scripts/generate_story_svgs.js --story crow_and_water_pot --style clean
  node scripts/generate_story_svgs.js --list tortoise_and_hare,fox_and_grapes
  node scripts/generate_story_svgs.js --all
`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

let storyId = null;
let storyList = null;
let isAll = false;
let style = 'rough';
let customOutDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--story' && args[i + 1]) {
    storyId = args[++i];
  } else if (args[i] === '--all') {
    isAll = true;
  } else if (args[i] === '--list' && args[i + 1]) {
    storyList = args[++i].split(',').map((s) => s.trim());
  } else if (args[i] === '--style' && args[i + 1]) {
    style = args[++i] === 'clean' ? 'clean' : 'rough';
  } else if (args[i] === '--out' && args[i + 1]) {
    customOutDir = path.resolve(args[++i]);
  }
}

global.localStorage = {
  getItem: () => style,
  setItem: () => {},
};

// Load rough.js and svg-art.js engine
const roughPath = path.join(ROOT_DIR, 'src', 'ui', 'rough.js');
const artPath = path.join(ROOT_DIR, 'src', 'ui', 'svg-art.js');

if (!fs.existsSync(roughPath) || !fs.existsSync(artPath)) {
  console.error('Error: Required engine files rough.js or svg-art.js not found in src/ui/');
  process.exit(1);
}

eval(fs.readFileSync(roughPath, 'utf8'));
eval(fs.readFileSync(artPath, 'utf8'));
global.SvgArt.setRenderMode(style);

// Load stories
const stories = JSON.parse(fs.readFileSync(STORIES_PATH, 'utf8'));
let targetStories = [];

if (storyId) {
  const found = stories.find((s) => s.id === storyId);
  if (!found) {
    console.error(`Error: Story with ID "${storyId}" not found in stories.json`);
    process.exit(1);
  }
  targetStories = [found];
} else if (storyList) {
  targetStories = stories.filter((s) => storyList.includes(s.id));
  if (targetStories.length === 0) {
    console.error('Error: None of the specified stories were found in stories.json');
    process.exit(1);
  }
} else if (isAll) {
  targetStories = stories;
}

const outDirs = customOutDir ? [customOutDir] : DEFAULT_OUT_DIRS;

console.log(`\n========================================`);
console.log(`🎨 Storybook SVG CLI Generator`);
console.log(`========================================`);
console.log(`Stories to process : ${targetStories.length}`);
console.log(`Illustration style : ${style.toUpperCase()}`);
console.log(`Output directories :`);
outDirs.forEach((d) => console.log(`  📁 ${d}`));
console.log(`----------------------------------------\n`);

const startTime = Date.now();
let totalFilesGenerated = 0;

for (const story of targetStories) {
  const sid = story.id;
  const sentenceCount = (story.text && story.text.length) || 0;
  console.log(`▶ Generating SVGs for "${story.title}" (${sid}): ${sentenceCount} panels...`);

  for (const baseOutDir of outDirs) {
    const storyDir = path.join(baseOutDir, sid);
    if (!fs.existsSync(storyDir)) {
      fs.mkdirSync(storyDir, { recursive: true });
    }

    // 1. Generate thumbnail SVG
    const thumbSvg = global.SvgArt.generateThumbnailSvg(story);
    fs.writeFileSync(path.join(storyDir, 'thumbnail.svg'), thumbSvg, 'utf8');
    totalFilesGenerated++;

    // 2. Generate each panel SVG by analyzing sentence text and narrative phase
    for (let i = 0; i < sentenceCount; i++) {
      const panelSvg = global.SvgArt.generatePanelSvg(story, i);
      const filename = `panel_${i + 1}.svg`;
      fs.writeFileSync(path.join(storyDir, filename), panelSvg, 'utf8');
      totalFilesGenerated++;
    }
  }

  console.log(`  ✓ Created ${sentenceCount} panels + 1 thumbnail in ${outDirs.length} location(s).`);
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n========================================`);
console.log(`✨ Done! Generated ${totalFilesGenerated} SVG files across ${targetStories.length} stories in ${elapsedSec}s.`);
console.log(`========================================\n`);
