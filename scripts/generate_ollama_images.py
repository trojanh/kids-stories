#!/usr/bin/env python3
"""
generate_ollama_images.py
-------------------------
Generates rich storybook illustrations directly from story narrative text using
Ollama's local text-to-image models (e.g. x/flux2-klein:4b).

Bypasses all existing predefined SVG templates and generates completely new images
derived directly from the story title, characters, setting, and sentence beats.

Usage:
  python3 scripts/generate_ollama_images.py --story tiger_and_mice
  python3 scripts/generate_ollama_images.py --story tiger_and_mice --vectorize
  python3 scripts/generate_ollama_images.py --list tiger_and_mice,fox_and_grapes
"""

import os
import sys
import json
import argparse
import subprocess
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORIES_PATH = os.path.join(ROOT_DIR, "src", "data", "stories.json")
RULES_PATH = os.path.join(ROOT_DIR, "src", "data", "story_continuity_rules.json")
OUTPUT_IMAGES_DIR = os.path.join(ROOT_DIR, "src", "ui", "data", "images")
OUTPUT_SVGS_DIR = os.path.join(ROOT_DIR, "src", "ui", "data", "svgs")

def load_continuity_rules():
    if os.path.exists(RULES_PATH):
        try:
            with open(RULES_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def build_scene_prompt(story, sentence, panel_idx, total_panels, rules_data):
    """Crafts a rich children's book illustration prompt directly from story narrative."""
    sid = story.get("id", "")
    title = story.get("title", "")
    rule = rules_data.get(sid, {})

    # Stage context
    stage = rule.get("fixed_stage", {})
    stage_desc = stage.get("description", "A warm, natural storybook environment with soft lighting.")
    
    # Character invariants
    char_inv = rule.get("character_invariants", {})
    primary_char_details = char_inv.get("details", {})
    tiger_desc = primary_char_details.get("silhouette", "A friendly, big golden-orange tiger with gentle rounded ears and clean black stripes")
    mouse_desc = "a tiny, courageous little field mouse with warm grey-brown fur and pink ears"

    # Prop invariants
    prop = rule.get("main_object", {})
    prop_name = prop.get("name", "Hunter's Woven Rope Trap")
    prop_mat = prop.get("material", "Coarse twisted hemp rope with knotted mesh")

    # Climax / solution check for second-to-last panel
    is_solution_panel = (panel_idx == total_panels - 2)
    is_final_panel = (panel_idx == total_panels - 1)

    special_instruction = ""
    if is_solution_panel:
        special_instruction = (
            f"***PROBLEM SOLUTION TABLEAU: This panel MUST convey the problem solution with 100% physical accuracy!*** "
            f"The tiny mouse is actively gnawing and chewing the coarse hemp ropes of the {prop_name} with sharp little teeth, "
            f"frayed severed rope strands breaking apart, and the tiger's heavy paw slipping free."
        )
    elif is_final_panel:
        final_rule = rule.get("final_panel_rule", {})
        tableau = final_rule.get("grounded_tableau", "Grounded peaceful resolution in the same setting.")
        special_instruction = (
            f"***GROUNDED RESOLUTION: {tableau} "
            f"NO classroom desks, NO chalkboards, NO open books, NO floating cartoon stars.***"
        )

    prompt = (
        f"Children's picture book illustration in warm watercolor and soft gouache style. "
        f"Gentle fine pencil and ink line art, rich transparent watercolor washes, textured storybook rag paper finish. "
        f"Story: '{title}'. "
        f"Stage & Setting: {stage_desc}. "
        f"Characters: {tiger_desc}, and {mouse_desc}. "
        f"Key Prop: {prop_name} ({prop_mat}). "
        f"Narrative Action (Panel {panel_idx + 1} of {total_panels}): '{sentence}'. "
        f"{special_instruction} "
        f"Cozy, heartwarming, emotional character interaction, natural storybook daylight. "
        f"Negative constraints: photorealistic, 3D render, CGI, plastic, floating text, subtitles, words, typography, watermark, blurry."
    )
    return prompt

def generate_panel_image(model, prompt, output_path):
    """Executes Ollama text-to-image and saves the resulting image to output_path."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    temp_dir = os.path.join(os.path.dirname(output_path), "_temp")
    os.makedirs(temp_dir, exist_ok=True)

    print(f"   Executing Ollama ({model})...")
    cmd = ["ollama", "run", model, prompt]
    try:
        res = subprocess.run(cmd, cwd=temp_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=300)
        
        # Locate generated image in temp_dir
        files = [f for f in os.listdir(temp_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if files:
            src = os.path.join(temp_dir, sorted(files, key=lambda f: os.path.getmtime(os.path.join(temp_dir, f)))[-1])
            shutil.move(src, output_path)
            shutil.rmtree(temp_dir, ignore_errors=True)
            return True
        else:
            print(f"   [Notice]: Ollama command completed, but no image file was emitted.")
            if res.stderr:
                print(f"   [Stderr]: {res.stderr.strip()[:200]}")
            shutil.rmtree(temp_dir, ignore_errors=True)
            return False
    except Exception as e:
        print(f"   [Error]: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return False

def vectorize_image(image_path, svg_path):
    """Converts a generated raster image into an SVG using vtracer."""
    if not shutil.which("vtracer"):
        return False
    os.makedirs(os.path.dirname(svg_path), exist_ok=True)
    cmd = [
        "vtracer",
        "--input", image_path,
        "--output", svg_path,
        "--colormode", "color",
        "--hierarchical", "stacked",
        "--mode", "spline",
        "--filter_speckle", "4",
        "--color_precision", "6",
        "--layer_difference", "16"
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return res.returncode == 0

def main():
    parser = argparse.ArgumentParser(description="Generate storybook illustrations directly from story text via Ollama")
    parser.add_argument("--story", type=str, default="tiger_and_mice", help="Story ID (default: tiger_and_mice)")
    parser.add_argument("--list", type=str, help="Comma-separated list of story IDs")
    parser.add_argument("--model", type=str, default="x/flux2-klein:4b", help="Ollama image model")
    parser.add_argument("--vectorize", action="store_true", help="Convert generated images into SVGs via vtracer")
    args = parser.parse_args()

    with open(STORIES_PATH, "r", encoding="utf-8") as f:
        stories = json.load(f)

    rules_data = load_continuity_rules()

    stories_to_process = []
    if args.story:
        stories_to_process = [s for s in stories if s["id"] == args.story]
    elif args.list:
        wanted = [x.strip() for x in args.list.split(",")]
        stories_to_process = [s for s in stories if s["id"] in wanted]
    else:
        print("Please provide --story <id> or --list <id1,id2>")
        sys.exit(1)

    if not stories_to_process:
        print(f"No matching stories found.")
        sys.exit(1)

    print(f"\n=======================================================")
    print(f"🎨 Direct Story-to-Image Generator via Ollama ({args.model})")
    print(f"=======================================================")
    print(f"Stories to process: {len(stories_to_process)}")
    print(f"Predefined SVG templates: DISABLED (Pure narrative generation)")
    print(f"-------------------------------------------------------\n")

    for story in stories_to_process:
        sid = story["id"]
        title = story.get("title", sid)
        sentences = story.get("text", [])
        total = len(sentences)
        print(f"\n▶ [{sid}] \"{title}\" ({total} panels):")

        story_img_dir = os.path.join(OUTPUT_IMAGES_DIR, sid)
        story_svg_dir = os.path.join(OUTPUT_SVGS_DIR, sid)

        for idx, sentence in enumerate(sentences):
            panel_name = f"panel_{idx + 1}"
            img_path = os.path.join(story_img_dir, f"{panel_name}.png")
            svg_path = os.path.join(story_svg_dir, f"{panel_name}.svg")

            print(f"\n  [Panel {idx + 1}/{total}] \"{sentence}\"")
            prompt = build_scene_prompt(story, sentence, idx, total, rules_data)
            success = generate_panel_image(args.model, prompt, img_path)

            if success:
                print(f"  ✓ Saved image: {img_path}")
                if args.vectorize:
                    v_ok = vectorize_image(img_path, svg_path)
                    if v_ok:
                        print(f"  ✓ Vectorized SVG: {svg_path}")
            else:
                print(f"  ⚠️  Ollama image generation did not output file (check model status).")

    print("\n✨ Done!")

if __name__ == "__main__":
    main()
