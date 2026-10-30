#!/usr/bin/env python3
"""
generate_story_svgs_ollama.py
-----------------------------
Generates unique standalone SVG illustrations directly from story narrative text using
local Ollama LLM (llama3.2:3b).

Completely bypasses all predefined SVG templates and hardcoded animal drawings.
Every scene is generated directly from the narrative beats of the story.

Usage:
  python3 scripts/generate_story_svgs_ollama.py --story tiger_and_mice
  python3 scripts/generate_story_svgs_ollama.py --story crow_and_water_pot
"""

import os
import sys
import json
import argparse
import urllib.request
import re
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORIES_PATH = os.path.join(ROOT_DIR, "src", "data", "stories.json")
RULES_PATH = os.path.join(ROOT_DIR, "src", "data", "story_continuity_rules.json")
OUTPUT_SVGS_DIR = os.path.join(ROOT_DIR, "src", "ui", "data", "svgs")

def get_scene_instructions(sid, sentence, panel_idx, total_panels):
    """Provides scene-specific visual composition guidance for the LLM."""
    if sid == "tiger_and_mice":
        scenes = [
            # P1
            "Composition: Shady mango grove. Big lush green tree on the left. A large, friendly golden-orange tiger lying peacefully curled up asleep under the tree on soft grass. Dappled sunlight sky.",
            # P2
            "Composition: The giant tiger is resting on the grass. A tiny grey-brown mouse with pink ears approaches on two paws near the tiger's front paw, looking up respectfully with paws together to whisper. Shady trees around.",
            # P3
            "Composition: The tiger opens warm amber eyes, smiling gently down at the tiny mouse. The tiger gently lifts his large paw to give the little mouse a clear path through the grass.",
            # P4
            "Composition: Shady grove later in the day. A hunter's thick rope trap net made of brown crosshatched ropes (<path>) is spread on the ground. The tiger's large front paw is caught and tangled in the knotted ropes.",
            # P5
            "Composition: PROBLEM SOLUTION CLIMAX. The brave tiny mouse is actively gnawing the thick ropes with sharp teeth, frayed rope fibers breaking apart (<line>, <path>), and the tiger's paw pulling free from the net with relief.",
            # P6
            "Composition: The tiger and the tiny mouse sitting side-by-side peacefully on the grassy forest floor, both smiling with joyful friendship, looking at each other warmly beside the broken rope net.",
            # P7
            "Composition: GROUNDED MORAL RESOLUTION. Peaceful golden hour in the mango grove. The majestic kind tiger resting proudly with the tiny mouse sitting happily on a nearby mossy stone. Warm sunbeams. Pure scenery, no floating books or desks."
        ]
        if panel_idx < len(scenes):
            return scenes[panel_idx]
            
    elif sid == "crow_and_water_pot":
        scenes = [
            # P1
            "Composition: Rustic stone courtyard on a bright sunny day. An unglazed terracotta clay amphora water pitcher stands on ground cobblestones. A cute black crow with glossy feathers flies down noticing the pitcher.",
            # P2
            "Composition: The crow perches on the cobblestones beside the tall terracotta pitcher, stretching its neck and peering down into the deep circular opening, seeing the water far down at the bottom.",
            # P3
            "Composition: The thoughtful crow stands on the cobblestones looking down at several smooth grey pebbles scattered on the ground, holding its chin in thought.",
            # P4
            "Composition: The crow holding a small smooth grey pebble in its yellow beak, dropping it directly into the circular mouth opening of the tall clay pitcher. Pebbles resting at the bottom.",
            # P5
            "Composition: Cutaway/translucent view of the terracotta pitcher. Smooth pebbles filling the bottom half, and fresh clear blue water rising noticeably higher up towards the neck.",
            # P6
            "Composition: PROBLEM SOLUTION TABLEAU. The pebbles visibly fill the bottom half of the pitcher, and fresh water reaches all the way to the circular top brim. The crow is perched on the rim dipping its beak into the water drinking contentedly.",
            # P7
            "Composition: GROUNDED MORAL RESOLUTION. In the same stone courtyard, the pitcher stands full of water and pebbles. The crow perches proudly on the stone garden wall with climbing vines, smiling warmly in victory. No floating desks or books."
        ]
        if panel_idx < len(scenes):
            return scenes[panel_idx]
    
    return f"Composition: Storybook scene representing '{sentence}'. Clear focal character, environment backdrop, and appropriate props."

def generate_svg_with_ollama(model, story_title, sid, sentence, panel_idx, total_panels):
    scene_comp = get_scene_instructions(sid, sentence, panel_idx, total_panels)

    prompt = f"""Act as an expert vector graphic designer and children's storybook SVG illustrator.
Generate a clean, vibrant, scalable SVG illustration for this story scene:
Story: "{story_title}"
Sentence: "{sentence}"

### Scene Guidance:
{scene_comp}

### Design Specifications:
- Style: Warm children's storybook vector art with soft gradients, clean shapes, and emotional character poses.
- Palette: Natural storybook colors (warm amber/orange #F59E0B for tiger, warm grey/brown #6B7280 for mouse, rich greens #10B981, #047857 for foliage, earthy brown #78350F for tree/ropes, soft warm sky #FEF3C7).
- Technical Rules:
  - Use viewBox="0 0 800 500" with width="100%" height="100%".
  - Group layers logically with <g id="background">, <g id="scenery">, <g id="characters">, <g id="foreground">.
  - Draw recognizable, cute characters and objects using clean shapes (<rect>, <circle>, <ellipse>, <path d="...">, <polygon>).
  - Use Bezier curves (<path d="M... C...">) for organic shapes like ears, tails, stripes, and tree branches.
  - Keep the SVG concise and well-structured (between 50 and 120 lines).
  - ZERO text or <text> elements in the graphic. Pure visual art only!
  - Output ONLY valid SVG code starting with <svg> and ending with </svg>. No markdown text before or after.
"""

    data = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.25,
            "num_predict": 2200
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        "http://127.0.0.1:11434/api/generate",
        data=data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            out = res.get("response", "").strip()
            # Clean markdown code blocks if present
            out = re.sub(r"^```(xml|svg)?\s*", "", out, flags=re.IGNORECASE)
            out = re.sub(r"\s*```$", "", out)
            match = re.search(r"<svg[\s\S]*?<\/svg>", out)
            if match:
                return match.group(0)
            # If closing tag was cut off, close it cleanly
            if "<svg" in out:
                svg_start = out[out.find("<svg"):]
                if "</svg>" not in svg_start:
                    svg_start += "\n</svg>"
                return svg_start
            return None
    except Exception as e:
        print(f"   [Ollama API Error]: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Generate pure SVGs from story text via Ollama")
    parser.add_argument("--story", type=str, default="tiger_and_mice", help="Story ID (default: tiger_and_mice)")
    parser.add_argument("--model", type=str, default="llama3.2:3b", help="Ollama model (default: llama3.2:3b)")
    args = parser.parse_args()

    with open(STORIES_PATH, "r", encoding="utf-8") as f:
        stories = json.load(f)

    story = next((s for s in stories if s["id"] == args.story), None)
    if not story:
        print(f"Story '{args.story}' not found.")
        sys.exit(1)

    sid = story["id"]
    title = story["title"]
    sentences = story.get("text", [])
    total = len(sentences)

    out_dir = os.path.join(OUTPUT_SVGS_DIR, sid)
    os.makedirs(out_dir, exist_ok=True)

    print(f"\n=======================================================")
    print(f"🎨 Direct Story Narrative SVG Generator (Ollama: {args.model})")
    print(f"=======================================================")
    print(f"Story: \"{title}\" ({sid})")
    print(f"Panels: {total}")
    print(f"Predefined SVG Templates: DISABLED (Pure narrative generation)")
    print(f"Output: {out_dir}")
    print(f"-------------------------------------------------------\n")

    for idx, sentence in enumerate(sentences):
        print(f"▶ [{idx + 1}/{total}] Generating Panel {idx + 1}: \"{sentence[:45]}...\"")
        svg = generate_svg_with_ollama(args.model, title, sid, sentence, idx, total)
        if svg:
            out_file = os.path.join(out_dir, f"panel_{idx + 1}.svg")
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(svg)
            print(f"  ✓ Saved {len(svg)} bytes to panel_{idx + 1}.svg")
        else:
            print(f"  ⚠️  Failed to generate SVG for panel {idx + 1}")

    # Generate a cover thumbnail
    print(f"\n▶ Generating Storybook Cover Thumbnail...")
    thumb_sentence = f"A gentle friendship between a giant tiger and a tiny mouse in a lush mango grove."
    thumb_svg = generate_svg_with_ollama(args.model, title, sid, thumb_sentence, 0, 1)
    if thumb_svg:
        thumb_file = os.path.join(out_dir, "thumbnail.svg")
        with open(thumb_file, "w", encoding="utf-8") as f:
            f.write(thumb_svg)
        print(f"  ✓ Saved thumbnail.svg")

    print("\n✨ Done! All panels generated directly from story narrative via Ollama.")

    # Automatically sync to UI worktree if present
    ui_worktree_dir = "/Users/rajantiwari/Desktop/projects/kids_storybook_plan-ui-worktree/src/ui/data/svgs"
    if os.path.exists(ui_worktree_dir):
        target_dir = os.path.join(ui_worktree_dir, sid)
        os.makedirs(target_dir, exist_ok=True)
        for f in os.listdir(out_dir):
            if f.endswith('.svg'):
                shutil.copy(os.path.join(out_dir, f), os.path.join(target_dir, f))
        print(f"  ✓ Automatically synced to UI preview server ({target_dir})")

if __name__ == "__main__":
    main()
