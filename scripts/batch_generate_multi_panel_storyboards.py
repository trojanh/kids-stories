#!/usr/bin/env python3
"""
batch_generate_multi_panel_storyboards.py
-----------------------------------------
Generates complete multi-panel sequential storyboards for stories
using local Apple Silicon GPU inference (Draw Things + DreamShaper XL Turbo)
and automatically vectorizes all panels into scalable SVGs via vtracer.

Preserves character invariants, master stage locking, problem solution tableaus,
and grounded moral resolutions without hallucinations.

Usage:
  python3 scripts/batch_generate_multi_panel_storyboards.py --story tiger_and_mice
  python3 scripts/batch_generate_multi_panel_storyboards.py --batch core
  python3 scripts/batch_generate_multi_panel_storyboards.py --limit 5
"""

import sys
import os
import json
import time
import shutil
import argparse
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORIES_FILE = os.path.join(ROOT_DIR, 'src', 'data', 'stories.json')
SVGS_DIR = os.path.join(ROOT_DIR, 'src', 'ui', 'data', 'svgs')
HERO_IMAGES_DIR = os.path.join(ROOT_DIR, 'src', 'ui', 'data', 'story_images')
VECTORIZE_SCRIPT = os.path.join(ROOT_DIR, 'scripts', 'vectorize_story_panel.py')
MODEL_NAME = "dreamshaper_xl_v2.1_turbo_q6p_q8p.ckpt"

from scripts.generate_story_prompts import load_stories, generate_story_prompt_suite

UNIVERSAL_NEGATIVE_PROMPT = (
    "photorealistic, 3d render, CGI, glossy plastic finish, floating text, typography, subtitles, "
    "open books on modern tables, classroom desks, chalkboards, human teachers, floating yellow cartoon stars, "
    "disco sparkles, magical laser beams, glowing fantasy auras, material morphing, "
    "changing camera angle abruptly, deformed wings, extra limbs, extra beaks, watermark, signature, blurry, oversaturated neon."
)

CORE_STORIES = [
    'tiger_and_mice',
    'monkey_and_coconut',
    'tortoise_and_hare',
    'fox_and_grapes'
]

def generate_story_panels(story, steps=8, force=False):
    story_id = story.get('id')
    title = story.get('title', story_id)
    out_dir = os.path.join(SVGS_DIR, story_id)
    os.makedirs(out_dir, exist_ok=True)

    suite = generate_story_prompt_suite(story)
    total_panels = suite['total_panels']

    print(f"\n{'='*80}")
    print(f"📖 STORYBOARD GENERATION: {title} ({story_id}) — {total_panels} Panels")
    print(f"   Stage: {suite['master_stage']}")
    print(f"   Destination: {out_dir}")
    print(f"{'='*80}")

    # Panel 1: Check if hero image already exists
    hero_png = os.path.join(HERO_IMAGES_DIR, f"{story_id}.png")
    hero_svg = os.path.join(HERO_IMAGES_DIR, f"{story_id}.svg")
    p1_png = os.path.join(out_dir, "panel_1.png")
    p1_svg = os.path.join(out_dir, "panel_1.svg")
    thumb_svg = os.path.join(out_dir, "thumbnail.svg")

    if not force and os.path.exists(hero_svg) and os.path.getsize(hero_svg) > 10000:
        if not os.path.exists(p1_svg) or force:
            shutil.copy2(hero_svg, p1_svg)
        if os.path.exists(hero_png) and (not os.path.exists(p1_png) or force):
            shutil.copy2(hero_png, p1_png)
        if not os.path.exists(thumb_svg) or force:
            shutil.copy2(hero_svg, thumb_svg)
        print(f"  ✓ Panel 1/7 [Cover]: Copied from existing hero vector ({round(os.path.getsize(p1_svg)/1024, 1)} KB)")

    story_start = time.time()
    generated_count = 0

    for panel in suite['panels']:
        p_num = panel['panel_number']
        svg_name = f"panel_{p_num}.svg"
        png_name = f"panel_{p_num}.png"
        target_svg = os.path.join(out_dir, svg_name)
        target_png = os.path.join(out_dir, png_name)

        if not force and os.path.exists(target_svg) and os.path.getsize(target_svg) > 10000:
            print(f"  ⏩ Panel {p_num}/{total_panels}: Already exists ({round(os.path.getsize(target_svg)/1024, 1)} KB)")
            continue

        prompt = panel['full_prompt']
        label = "⭐ MORAL/RESOLUTION" if panel['is_moral_panel'] else ("🔧 SOLUTION TABLEAU" if p_num == total_panels - 1 else "📖 ACTION")
        print(f"\n  🎨 Panel {p_num}/{total_panels} [{label}]:")
        print(f"     Sentence: \"{panel['sentence']}\"")

        p_start = time.time()

        # Step 1: Render with draw-things-cli
        cmd = [
            "draw-things-cli", "generate",
            "--local",
            "--model", MODEL_NAME,
            "--steps", str(steps),
            "--prompt", prompt,
            "--negative-prompt", UNIVERSAL_NEGATIVE_PROMPT,
            "--output", target_png
        ]

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"     ❌ Render error for panel {p_num}:\n{res.stderr or res.stdout}")
            continue

        render_time = round(time.time() - p_start, 1)

        # Step 2: Vectorize to SVG
        v_start = time.time()
        v_cmd = ["/usr/bin/python3", VECTORIZE_SCRIPT, target_png, target_svg]
        v_res = subprocess.run(v_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        v_time = round(time.time() - v_start, 1)
        svg_size_kb = round(os.path.getsize(target_svg) / 1024, 1)
        print(f"     ✓ Rendered: {render_time}s | Vectorized: {v_time}s -> {svg_name} ({svg_size_kb} KB)")
        generated_count += 1

    total_time = round((time.time() - story_start) / 60, 1)
    print(f"\n✓ Completed storyboard for '{title}' in {total_time} mins ({generated_count} new panels generated)")
    return True

def main():
    parser = argparse.ArgumentParser(description="Generate complete multi-panel storyboards in batches")
    parser.add_argument("--story", type=str, default=None, help="Generate for a specific story ID")
    parser.add_argument("--batch", type=str, default=None, choices=['core', 'seven_panel', 'all'], help="Batch selection")
    parser.add_argument("--limit", type=int, default=None, help="Number of stories to process")
    parser.add_argument("--steps", type=int, default=8, help="Sampling steps (default: 8)")
    parser.add_argument("--force", action="store_true", help="Force regeneration of existing panels")
    args = parser.parse_args()

    all_stories = load_stories()
    story_map = {s['id']: s for s in all_stories}

    if args.story:
        target = story_map.get(args.story)
        if not target:
            print(f"Error: Story '{args.story}' not found.")
            sys.exit(1)
        queue = [target]
    elif args.batch == 'core':
        queue = [story_map[sid] for sid in CORE_STORIES if sid in story_map]
    elif args.batch == 'seven_panel':
        queue = [s for s in all_stories if len(s.get('text', [])) == 7]
    elif args.limit:
        queue = all_stories[:args.limit]
    elif args.batch == 'all':
        queue = all_stories
    else:
        # Default: Core batch of top fables
        queue = [story_map[sid] for sid in CORE_STORIES if sid in story_map]

    print(f"================================================================================")
    print(f"🚀 TalePickle Multi-Panel Storyboard Engine")
    print(f"================================================================================")
    print(f"Stories in queue: {len(queue)} ({', '.join(s['id'] for s in queue[:5])}...)")
    print(f"Total panels to check: {sum(len(s.get('text', [])) for s in queue)}")
    print(f"Engine: Draw Things ({MODEL_NAME}, {args.steps} steps) + vtracer")
    print(f"================================================================================")

    start_all = time.time()
    for idx, s in enumerate(queue, start=1):
        print(f"\n>>> [{idx}/{len(queue)}] Processing story: {s.get('title')}")
        generate_story_panels(s, steps=args.steps, force=args.force)

    total_duration = round((time.time() - start_all) / 60, 1)
    print(f"\n{'='*80}")
    print(f"🎉 All {len(queue)} storyboards successfully processed in {total_duration} mins!")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
