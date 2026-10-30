#!/usr/bin/env python3
"""
batch_generate_story_images.py
-------------------------------
Generates high-fidelity watercolor/gouache picture-book illustrations
for all stories in `stories.json` using local Apple Silicon GPU inference
via `draw-things-cli` and automatically vectorizes them into publication-ready SVGs.

Usage:
  python3 scripts/batch_generate_story_images.py --limit 5
  python3 scripts/batch_generate_story_images.py --story monkey_and_coconut
  python3 scripts/batch_generate_story_images.py --all
"""

import sys
import os
import json
import time
import argparse
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORIES_FILE = os.path.join(ROOT_DIR, 'src', 'data', 'stories.json')
OUTPUT_DIR = os.path.join(ROOT_DIR, 'src', 'ui', 'data', 'story_images')
VECTORIZE_SCRIPT = os.path.join(ROOT_DIR, 'scripts', 'vectorize_story_panel.py')
MODEL_NAME = "dreamshaper_xl_v2.1_turbo_q6p_q8p.ckpt"

STYLE_PROMPT_PREFIX = (
    "Children's picture book illustration in warm watercolor and soft gouache style. "
    "Gentle pencil and fine ink line art, rich transparent watercolor washes, textured storybook rag paper finish. "
    "Whimsical, cozy, heartwarming daylight."
)

NEGATIVE_PROMPT = (
    "photorealistic, 3d render, CGI, glossy, typography, text, subtitles, watermark, signature, "
    "modern furniture, desks, books, human teachers, classroom, deformed, extra limbs, bad anatomy, oversaturated"
)

def build_story_prompt(story):
    title = story.get('title', '')
    text_list = story.get('text', [])
    opening_sentence = text_list[0] if text_list else ''
    characters = story.get('character', [])
    char_str = ", ".join(characters) if isinstance(characters, list) else str(characters)

    # Clean sentence
    opening_clean = opening_sentence.replace('"', '').replace("'", "").strip()

    prompt = (
        f"{STYLE_PROMPT_PREFIX} "
        f"Story: '{title}'. "
        f"Characters: cute {char_str}. "
        f"Scene: {opening_clean}. "
        f"Grounded natural storybook environment, vibrant watercolor washes, expressive friendly faces."
    )
    return prompt

def generate_and_vectorize(story, steps=8, skip_existing=True):
    story_id = story.get('id')
    title = story.get('title', story_id)

    png_path = os.path.join(OUTPUT_DIR, f"{story_id}.png")
    svg_path = os.path.join(OUTPUT_DIR, f"{story_id}.svg")

    if skip_existing and os.path.exists(svg_path) and os.path.getsize(svg_path) > 10000:
        print(f"⏩ [Skip] {title} ({story_id}) already exists -> {os.path.basename(svg_path)}")
        return True

    prompt = build_story_prompt(story)
    print(f"\n🎨 Generating illustration for: {title} ({story_id})")
    print(f"   Prompt: {prompt[:120]}...")

    start_time = time.time()

    # Step 1: Generate PNG via draw-things-cli
    cmd = [
        "draw-things-cli", "generate",
        "--local",
        "--model", MODEL_NAME,
        "--steps", str(steps),
        "--prompt", prompt,
        "--negative-prompt", NEGATIVE_PROMPT,
        "--output", png_path
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"❌ Error generating image for {story_id}:\n{res.stderr or res.stdout}")
        return False

    gen_duration = round(time.time() - start_time, 1)
    png_size_mb = round(os.path.getsize(png_path) / (1024 * 1024), 2)
    print(f"   ✓ Generated PNG in {gen_duration}s ({png_size_mb} MB)")

    # Step 2: Vectorize to SVG
    vec_start = time.time()
    vec_cmd = [
        "/usr/bin/python3", VECTORIZE_SCRIPT,
        png_path, svg_path
    ]
    vec_res = subprocess.run(vec_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if vec_res.returncode != 0:
        print(f"⚠️ Vectorization warning for {story_id}:\n{vec_res.stderr or vec_res.stdout}")
        return False

    vec_duration = round(time.time() - vec_start, 1)
    svg_size_kb = round(os.path.getsize(svg_path) / 1024, 1)
    print(f"   ✓ Vectorized to SVG in {vec_duration}s ({svg_size_kb} KB)")
    print(f"   🎉 Total: {round(gen_duration + vec_duration, 1)}s -> {svg_path}")

    return True

def update_manifest(stories):
    manifest_path = os.path.join(OUTPUT_DIR, 'manifest.json')
    tmp_path = manifest_path + f'.tmp.{os.getpid()}'
    records = []
    for s in stories:
        sid = s.get('id')
        png_path = os.path.join(OUTPUT_DIR, f"{sid}.png")
        svg_path = os.path.join(OUTPUT_DIR, f"{sid}.svg")
        has_svg = os.path.exists(svg_path) and os.path.getsize(svg_path) > 10000
        records.append({
            "id": sid,
            "title": s.get('title'),
            "has_image": os.path.exists(png_path),
            "has_svg": has_svg,
            "png_file": f"{sid}.png" if os.path.exists(png_path) else None,
            "svg_file": f"{sid}.svg" if has_svg else None,
            "svg_size_kb": round(os.path.getsize(svg_path) / 1024, 1) if has_svg else 0
        })

    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2)
    os.replace(tmp_path, manifest_path)

    total_svgs = sum(1 for r in records if r['has_svg'])
    print(f"\n📋 Manifest updated: {total_svgs}/{len(stories)} stories have vector illustrations.")

def main():
    parser = argparse.ArgumentParser(description="Batch generate story illustrations using local Draw Things CLI")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of stories to process")
    parser.add_argument("--story", type=str, default=None, help="Generate for a specific story ID")
    parser.add_argument("--steps", type=int, default=8, help="Sampling steps for turbo model (default: 8)")
    parser.add_argument("--worker-id", type=int, default=0, help="Worker ID (0-based) for parallel sessions")
    parser.add_argument("--num-workers", type=int, default=1, help="Total number of parallel worker sessions")
    parser.add_argument("--force", action="store_true", help="Force regeneration of existing images")
    parser.add_argument("--all", action="store_true", help="Process all stories in stories.json")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(STORIES_FILE, 'r', encoding='utf-8') as f:
        all_stories = json.load(f)

    if args.story:
        target = [s for s in all_stories if s.get('id') == args.story]
        if not target:
            print(f"Error: Story '{args.story}' not found.")
            sys.exit(1)
        queue = target
    elif args.limit:
        queue = all_stories[:args.limit]
    elif args.all:
        queue = all_stories
    else:
        # Default: process first 5 stories as an initial batch
        queue = all_stories[:5]

    if args.num_workers > 1:
        queue = [s for i, s in enumerate(queue) if i % args.num_workers == args.worker_id]

    print(f"================================================================================")
    print(f"🚀 TalePickle Local Story Illustrator (Draw Things + DreamShaper XL Turbo)")
    print(f"================================================================================")
    print(f"Worker session  : {args.worker_id + 1} of {args.num_workers}")
    print(f"Stories in queue: {len(queue)}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Steps per image : {args.steps}")
    print(f"Skip existing   : {not args.force}")
    print(f"--------------------------------------------------------------------------------")

    success_count = 0
    start_batch_time = time.time()
    for idx, story in enumerate(queue, start=1):
        elapsed = round(time.time() - start_batch_time, 1)
        print(f"\n[Worker {args.worker_id + 1}/{args.num_workers}] [{idx}/{len(queue)}] Processing: {story.get('title')} ({story.get('id')}) [Elapsed: {elapsed}s]")
        try:
            ok = generate_and_vectorize(story, steps=args.steps, skip_existing=not args.force)
            if ok:
                success_count += 1
                # Real-time manifest update so web UI gallery live-updates
                update_manifest(all_stories)
        except Exception as e:
            print(f"⚠️ Exception processing {story.get('id')}: {e}")

    total_batch_time = round((time.time() - start_batch_time) / 60, 1)
    print(f"\n================================================================================")
    print(f"✅ Batch complete: {success_count}/{len(queue)} stories successfully illustrated & vectorized in {total_batch_time} mins!")
    print(f"================================================================================")

if __name__ == '__main__':
    main()
