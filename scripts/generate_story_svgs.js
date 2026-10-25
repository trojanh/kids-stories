#!/usr/bin/env node
/**
 * generate_story_svgs.js
 * -----------------------
 * CLI tool to analyze story text and generate standalone SVG illustrations locally on disk.
 *
 * Providers:
 *   - ollama     : Local AI (via Ollama CLI) acts as AI Scene Director, analyzing narrative
 *                  semantics, actions, character states & props, rendered via Rough.js/Clean engine.
 *   - ollama-raw : Local AI (via Ollama CLI) generates raw standalone SVG XML markup from scratch.
 *   - local      : Fast native rule-based semantic scene engine (instant, zero dependencies).
 *
 * Usage:
 *   node scripts/generate_story_svgs.js --story tiger_and_mice --provider ollama
 *   node scripts/generate_story_svgs.js --story crow_and_water_pot --provider ollama-raw
 *   node scripts/generate_story_svgs.js --story fox_and_grapes --provider local --style clean
 *   node scripts/generate_story_svgs.js --list tiger_and_mice,tortoise_and_hare,fox_and_grapes --provider ollama
 *   node scripts/generate_story_svgs.js --all --provider local
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const STORIES_PATH = path.join(ROOT_DIR, 'src', 'data', 'stories.json');

const DEFAULT_OUT_DIRS = [path.join(ROOT_DIR, 'src', 'ui', 'data', 'svgs')];
const DOCS_DIR = path.join(ROOT_DIR, 'docs', 'data', 'svgs');
if (fs.existsSync(path.join(ROOT_DIR, 'docs'))) {
  DEFAULT_OUT_DIRS.push(DOCS_DIR);
}

// Browser-like global context for svg-art.js & rough.js
global.window = global;

function showHelp() {
  console.log(`
Storybook SVG CLI Generator (Local AI via Ollama)
=================================================
Generates standalone SVG illustrations on disk by analyzing story narratives.

Options:
  --story <id>             Generate SVGs for a single story ID (e.g., tiger_and_mice)
  --list <id1,id2,...>     Generate SVGs for a comma-separated list of story IDs
  --all                    Generate SVGs for all 152 stories
  --provider <name>        Illustration engine: "ollama" (AI directed, default),
                           "ollama-raw" (pure AI SVG), or "local" (instant offline)
  --model <name>           Ollama model to use (default: "qwen2.5-coder:1.5b")
  --style <rough|clean>    Illustration style (default: "rough" hand-drawn sketch)
  --out <dir>              Custom output directory (default: src/ui/data/svgs)
  --force                  Overwrite existing SVG files
  --help, -h               Show this help message

Examples:
  # 1. Analyze and generate SVGs using local Ollama AI
  node scripts/generate_story_svgs.js --story tiger_and_mice --provider ollama

  # 2. Generate with clean vector style
  node scripts/generate_story_svgs.js --story crow_and_water_pot --style clean

  # 3. Batch generate selected stories with Ollama
  node scripts/generate_story_svgs.js --list tiger_and_mice,tortoise_and_hare,fox_and_grapes --provider ollama

  # 4. Instant local offline generation
  node scripts/generate_story_svgs.js --story monkey_and_coconut --provider local
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
let provider = 'ollama';
let modelName = 'qwen2.5-coder:1.5b';
let style = 'rough';
let customOutDir = null;
let forceOverwrite = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--story' && args[i + 1]) {
    storyId = args[++i];
  } else if (args[i] === '--all') {
    isAll = true;
  } else if (args[i] === '--list' && args[i + 1]) {
    storyList = args[++i].split(',').map((s) => s.trim());
  } else if (args[i] === '--provider' && args[i + 1]) {
    provider = args[++i].toLowerCase();
  } else if (args[i] === '--model' && args[i + 1]) {
    modelName = args[++i];
  } else if (args[i] === '--style' && args[i + 1]) {
    style = args[++i] === 'clean' ? 'clean' : 'rough';
  } else if (args[i] === '--out' && args[i + 1]) {
    customOutDir = path.resolve(args[++i]);
  } else if (args[i] === '--force') {
    forceOverwrite = true;
  }
}

global.localStorage = {
  getItem: () => style,
  setItem: () => {},
};

// Check Ollama daemon and model availability
async function checkOllama(model) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/tags',
        method: 'GET',
        timeout: 2500,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const models = (data.models || []).map((m) => m.name);
            const hasModel = models.some((m) => m === model || m.startsWith(model + ':') || model.startsWith(m.split(':')[0]));
            resolve({ online: true, models, hasModel });
          } catch {
            resolve({ online: false, models: [], hasModel: false });
          }
        });
      }
    );
    req.on('error', () => resolve({ online: false, models: [], hasModel: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ online: false, models: [], hasModel: false });
    });
    req.end();
  });
}

// Ollama Semantic Scene Director (analyzes sentence and extracts scene parameters)
async function analyzeSentenceWithOllama(model, story, sentence, panelIndex, totalPanels) {
  const chars = (story.character || [story.animal || 'fox']).join(', ');
  const prompt = `You are an AI visual scene director for a children's storybook.
Story Title: "${story.title}"
Characters: ${chars}
Panel ${panelIndex + 1} of ${totalPanels}
Sentence: "${sentence}"

Analyze this sentence and output a JSON scene descriptor:
{
  "character1": {"name": "${chars.split(',')[0].trim()}", "action": "resting|sleeping|running|eating|talking|walking|chewing|flying", "side": "left|right", "state": "normal|sleeping"},
  "character2": {"name": "${chars.split(',')[1] ? chars.split(',')[1].trim() : ''}", "action": "resting|sleeping|trapped|watching|talking", "side": "left|right", "state": "normal|sleeping"} or null,
  "props": ["..."],
  "setting": "meadow|jungle|river|courtyard|night|sunset",
  "mood": "happy|calm|tense|excited"
}
Output ONLY raw JSON adhering to this schema. No markdown formatting.`;

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1,
        num_predict: 260,
      },
    });

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 25000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const resp = JSON.parse(body);
            const parsed = JSON.parse(resp.response);
            resolve(parsed);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.write(postData);
    req.end();
  });
}

// Ollama Raw SVG generation
async function generateRawSvgWithOllama(model, story, sentence, panelIndex, totalPanels) {
  const prompt = `You are a children's book SVG artist.
Create a standalone SVG illustration (viewBox="0 0 400 240") for Panel ${panelIndex + 1} of "${story.title}":
"${sentence}"

Requirements:
- Sky and ground backdrop with soft vibrant colors.
- Stylized, cute vector characters matching the story.
- Clean shapes, gradients, and appropriate props.
- Output ONLY valid XML starting with <svg> and ending with </svg>. No markdown backticks.`;

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.2,
        num_predict: 1200,
      },
    });

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 45000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            let out = JSON.parse(body).response.trim();
            out = out.replace(/^```(xml|svg)?/i, '').replace(/```$/i, '').trim();
            const svgMatch = out.match(/<svg[\s\S]*<\/svg>/i);
            if (svgMatch) {
              resolve(svgMatch[0]);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.write(postData);
    req.end();
  });
}

async function main() {
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

  // Check Ollama if needed
  if (provider === 'ollama' || provider === 'ollama-raw') {
    process.stdout.write(`🔍 Checking local Ollama service... `);
    const ollamaStatus = await checkOllama(modelName);
    if (!ollamaStatus.online) {
      console.log(`\n⚠️  Ollama server is not running on http://127.0.0.1:11434.`);
      console.log(`   Falling back to high-speed local semantic engine.\n`);
      provider = 'local';
    } else {
      console.log(`✓ Online (models: ${ollamaStatus.models.join(', ') || 'none'})`);
      if (!ollamaStatus.hasModel) {
        console.log(`⚠️  Model "${modelName}" not found in Ollama.`);
        if (ollamaStatus.models.length > 0) {
          modelName = ollamaStatus.models[0];
          console.log(`   Using installed model "${modelName}" instead.\n`);
        } else {
          console.log(`   Run 'ollama pull ${modelName}' to download it.`);
          console.log(`   Falling back to high-speed local engine.\n`);
          provider = 'local';
        }
      }
    }
  }

  const outDirs = customOutDir ? [customOutDir] : DEFAULT_OUT_DIRS;

  console.log(`\n======================================================`);
  console.log(`🎨 Storybook SVG CLI Generator`);
  console.log(`======================================================`);
  console.log(`Stories to process : ${targetStories.length}`);
  console.log(`Engine provider    : ${provider.toUpperCase()}${provider !== 'local' ? ` (${modelName})` : ''}`);
  console.log(`Illustration style : ${style.toUpperCase()}`);
  console.log(`Output directories :`);
  outDirs.forEach((d) => console.log(`  📁 ${d}`));
  console.log(`------------------------------------------------------\n`);

  const startTime = Date.now();
  let totalFilesGenerated = 0;

  for (let sIdx = 0; sIdx < targetStories.length; sIdx++) {
    const story = targetStories[sIdx];
    const sid = story.id;
    const sentenceCount = (story.text && story.text.length) || 0;
    console.log(`[${sIdx + 1}/${targetStories.length}] ▶ "${story.title}" (${sid}): ${sentenceCount} panels...`);

    // Ensure output directories exist
    for (const baseOutDir of outDirs) {
      const storyDir = path.join(baseOutDir, sid);
      if (!fs.existsSync(storyDir)) {
        fs.mkdirSync(storyDir, { recursive: true });
      }
    }

    // 1. Generate thumbnail SVG
    const thumbSvg = global.SvgArt.generateThumbnailSvg(story);
    for (const baseOutDir of outDirs) {
      fs.writeFileSync(path.join(baseOutDir, sid, 'thumbnail.svg'), thumbSvg, 'utf8');
      totalFilesGenerated++;
    }

    // 2. Generate each panel SVG
    for (let i = 0; i < sentenceCount; i++) {
      const sentence = story.text[i];
      const panelFilename = `panel_${i + 1}.svg`;
      const panelStart = Date.now();
      let panelSvg = null;
      let usedMethod = provider;

      if (provider === 'ollama') {
        process.stdout.write(`   Panel ${i + 1}/${sentenceCount}: analyzing with Ollama... `);
        const aiParams = await analyzeSentenceWithOllama(modelName, story, sentence, i, sentenceCount);
        if (aiParams) {
          panelSvg = global.SvgArt.generatePanelSvg(story, i, aiParams);
          usedMethod = 'ollama-semantic';
        } else {
          panelSvg = global.SvgArt.generatePanelSvg(story, i);
          usedMethod = 'local-fallback';
        }
      } else if (provider === 'ollama-raw') {
        process.stdout.write(`   Panel ${i + 1}/${sentenceCount}: generating raw SVG via Ollama... `);
        const rawSvg = await generateRawSvgWithOllama(modelName, story, sentence, i, sentenceCount);
        if (rawSvg) {
          panelSvg = rawSvg;
          usedMethod = 'ollama-raw';
        } else {
          panelSvg = global.SvgArt.generatePanelSvg(story, i);
          usedMethod = 'local-fallback';
        }
      } else {
        process.stdout.write(`   Panel ${i + 1}/${sentenceCount}: rendering local vector... `);
        panelSvg = global.SvgArt.generatePanelSvg(story, i);
        usedMethod = 'local';
      }

      for (const baseOutDir of outDirs) {
        fs.writeFileSync(path.join(baseOutDir, sid, panelFilename), panelSvg, 'utf8');
        totalFilesGenerated++;
      }

      const panelElapsed = ((Date.now() - panelStart) / 1000).toFixed(2);
      console.log(`✓ (${usedMethod}, ${panelElapsed}s)`);
    }

    console.log(`  ✓ Complete for "${story.title}"\n`);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`======================================================`);
  console.log(`✨ Done! Generated ${totalFilesGenerated} SVG files across ${targetStories.length} stories in ${totalElapsed}s.`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
