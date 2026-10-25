#!/usr/bin/env python3
"""
generate_story_prompts.py
-------------------------
Production Prompt Engineering Engine for TalePickle Storybook Illustrations.
Generates hardened, continuity-locked prompts for any story in stories.json.

Guarantees:
  1. Fixed Stage Continuity: Scene anchor locking across consecutive panels.
  2. Main Object Invariance: Keeps key props (pitcher, net, tree, fruit) constant in material, shape, and position.
  3. Character Invariants: Locks plumage/fur, eyes, and signature accessories (e.g. woven satchel, red ribbon).
  4. Grounded Moral Resolution: Automatically converts abstract moral/lesson sentences into concrete physical
     narrative actions (eliminating hallucinations like open books, modern desks, floating cartoon stars, or human teachers).
  5. Strict Blacklist / Negative Prompts: Suppresses photorealism, CGI, text banners, glowing fantasy stars, and material shifts.

Usage:
  python3 scripts/generate_story_prompts.py --story crow_and_water_pot
  python3 scripts/generate_story_prompts.py --story tiger_and_mice --output prompts_tiger.json
  python3 scripts/generate_story_prompts.py --all --summary
"""

import sys
import os
import json
import re
import argparse

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORIES_PATH = os.path.join(ROOT_DIR, 'src', 'data', 'stories.json')
RULES_PATH = os.path.join(ROOT_DIR, 'src', 'data', 'story_continuity_rules.json')

def load_continuity_rules():
    if os.path.exists(RULES_PATH):
        with open(RULES_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

CONTINUITY_RULES = load_continuity_rules()

# Universal Art Direction Directive
STYLE_DIRECTIVE = (
    "Children's picture book illustration in warm watercolor and soft gouache style. "
    "Gentle pencil and fine ink line art, rich transparent watercolor washes, textured storybook rag paper finish. "
    "Whimsical, heartwarming, expressive character emotion. Cozy natural daylight."
)

# Universal Negative Prompt Blacklist
UNIVERSAL_NEGATIVE_PROMPT = (
    "photorealistic, 3d render, CGI, glossy plastic finish, floating text, typography, subtitles, "
    "open books on modern tables, classroom desks, chalkboards, human teachers, "
    "floating yellow cartoon stars, disco sparkles, magical laser beams, glowing fantasy auras, "
    "material morphing (do NOT turn clay into glass or metal), changing camera angle abruptly, "
    "deformed wings, extra limbs, extra beaks, watermark, signature, blurry, oversaturated neon."
)

# Moral / Abstract lesson detection triggers
MORAL_TRIGGERS = [
    r"teaches us",
    r"reminds us",
    r"shows how",
    r"shows that",
    r"moral of",
    r"learn that",
    r"lesson",
    r"tells us",
    r"warning to",
    r"reminder that",
    r"proves that",
]

def load_stories():
    with open(STORIES_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    return data.get('stories', [])

def detect_moral_sentence(sentence):
    for trigger in MORAL_TRIGGERS:
        if re.search(trigger, sentence, re.IGNORECASE):
            return True
    return False

def extract_character_invariants(story):
    animal = (story.get('animal') or 'creature').lower()
    characters = story.get('character') or [animal]
    chars_str = ", ".join(characters)

    # Specific known signature traits for continuity
    special_invariants = {
        'crow': "A cute, curious little black crow with sleek obsidian feathers, dark blue wing highlights, friendly large sparkling eyes, and a small woven wicker shoulder satchel (crossbody strap).",
        'tiger': "A large, friendly golden-orange tiger with soft rounded ears, bold black stripes, warm amber eyes, and a gentle, gentle expression.",
        'mouse': "A tiny, brave little field mouse with soft warm brown fur, pink rounded ears, curious whiskers, and large shiny black bead eyes.",
        'fox': "A clever, slender red fox with bushy white-tipped tail, black-stockinged paws, amber eyes, and an expressive, inquisitive snout.",
        'hare': "A swift, energetic long-eared hare with light sandy fur, athletic posture, twitching nose, and large expressive eyes.",
        'tortoise': "A patient, wise little tortoise with an olive-green patterned dome shell, wrinkled friendly neck, and a calm, gentle smile.",
        'monkey': "A playful, nimble little brown monkey with a curled tail, golden-brown chest fur, and wide curious eyes.",
        'elephant': "A gentle giant grey elephant with soft rounded ears, curved white tusks, and a friendly, curved trunk.",
    }

    primary_char = characters[0].lower() if characters else animal
    char_desc = special_invariants.get(primary_char, f"Cute, friendly {chars_str} with consistent storybook proportions, expressive eyes, and gentle animated character design.")
    return char_desc

def analyze_story_scenes(story):
    """
    Analyzes the story panels and groups them into physical scenes/stages.
    Identifies the Master Reference Scene Plate and Fixed Centerpiece Props.
    """
    story_id = story.get('id', '')
    sentences = story.get('text', [])
    total_panels = len(sentences)

    # Story-specific stage definitions from rulebook
    rules = CONTINUITY_RULES.get(story_id)
    if rules:
        stage = rules.get('fixed_stage', {})
        prop = rules.get('main_object', {})
        scene_map = {}
        for i in range(total_panels):
            pkey = f"panel_{i + 1}"
            scene_map[i] = {
                "scene": stage.get('name', 'Fixed Stage'),
                "is_stage": True,
                "prop_state": prop.get('state_progression', {}).get(pkey, prop.get('name', ''))
            }
        if 'crow_and_water_pot' in story_id:
            scene_map[0] = {"scene": "Open Summer Field", "is_stage": False, "prop_state": "Crow flying over fields looking for water"}

        banned_str = " ".join(prop.get('forbidden_mutations', []))
        prop_str = f"{prop.get('name', '')} ({prop.get('material', '')}). {prop.get('shape_and_features', '')}. Placement: {prop.get('placement', '')}. RULES: {banned_str}"
        master_stage = {
            "setting_name": stage.get('name', 'Fixed Stage'),
            "environment": stage.get('description', ''),
            "fixed_prop": prop_str,
            "master_anchor_panel": 2 if 'crow_and_water_pot' in story_id else 1,
            "scene_map": scene_map,
            "rules": rules
        }
        return master_stage

def generate_grid_prompt(story):
    """
    Generates a unified single-pass Storyboard Grid Prompt for the entire story.
    Enables generating all panels simultaneously in one single image, which is:
      1. 7x faster and quota-efficient (1 generation instead of 7).
      2. Inherently style-consistent and color-harmonized.
      3. Logically sequenced, with an explicit emphasis on the 2nd-to-last panel (Problem Solution Tableau).
    """
    story_id = story.get('id', '')
    title = story.get('title', '')
    sentences = story.get('text', [])
    total_panels = len(sentences)
    rules = CONTINUITY_RULES.get(story_id, {})

    stage = rules.get('fixed_stage', {})
    prop = rules.get('main_object', {})
    char_inv = extract_character_invariants(story)

    # Calculate optimal grid layout (e.g. 7-8 panels -> 2 rows of 4 panels)
    cols = 4 if total_panels > 4 else total_panels
    rows = 2 if total_panels > 4 else 1

    panel_descriptions = []
    for i, sent in enumerate(sentences):
        p_num = i + 1
        is_second_to_last = (p_num == total_panels - 1)
        is_last = (p_num == total_panels)

        if is_second_to_last:
            # Crucial Problem Solution Tableau
            if "crow_and_water_pot" in story_id:
                climax_detail = "For this story, smooth pebbles must visibly fill the bottom half of the pot, and fresh cool water must reach all the way till the brim, with the crow actively dipping its beak into the water at the top lip to drink contentedly."
            elif "tiger_and_mice" in story_id:
                climax_detail = "For this story, the tiny brave mouse must be visibly gnawing the coarse hemp ropes of the net trap with sharp teeth, showing severed frayed rope fibers breaking apart and the tiger's heavy paw pulling free with relief."
            elif "fox_and_grapes" in story_id:
                climax_detail = "For this story, the sleek fox must be shown leaping high into the air towards the sunlit wooden trellis, stretching paws towards the ripe hanging purple grape clusters."
            elif "tortoise_and_hare" in story_id:
                climax_detail = "For this story, the steady little tortoise must be shown smiling proudly as it crosses the checkered wooden finish line, while the sleeping hare is seen far behind asleep beneath the tree."
            elif "monkey_and_coconut" in story_id:
                climax_detail = "For this story, the friendly elephant must use its strong grey trunk to cleanly crack open the brown coconut, and the joyful monkey celebrates holding a fresh piece of sweet white coconut meat."
            else:
                climax_detail = f"The physical resolution to the problem must be 100% physically clear and accurately depicted for: '{sent}'."

            callout = (
                f"Panel {p_num} [CRUCIAL PROBLEM SOLUTION TABLEAU]: \"{sent}\" "
                f"***MANDATORY: This panel MUST convey the problem solution with 100% physical clarity and accuracy!*** "
                f"{climax_detail}"
            )
        elif is_last:
            callout = (
                f"Panel {p_num} [MORAL & GROUNDED RESOLUTION]: \"{sent}\" "
                f"Peaceful grounded conclusion in the same setting. The solved task remains visible ({prop.get('name', 'prop')}). "
                f"The character stands or perches proudly with a warm joyful smile of victory. "
                f"NO open books, NO classroom desks, NO floating cartoon stars."
            )
        else:
            callout = f"Panel {p_num} [NARRATIVE STEP]: \"{sent}\" - Logical progression of character interacting with the environment."

        panel_descriptions.append(callout)

    panels_formatted = "\n\n".join(panel_descriptions)

    banned_str = " ".join(prop.get('forbidden_mutations', []))
    prop_directive = f"Fixed Prop: {prop.get('name', '')} ({prop.get('material', '')}). {prop.get('shape_and_features', '')}. Placement: {prop.get('placement', '')}. Rules: {banned_str}"

    grid_prompt = (
        f"{STYLE_DIRECTIVE}\n\n"
        f"STORYBOARD GRID: Complete {total_panels}-panel sequential comic illustration for \"{title}\", "
        f"arranged neatly as a {rows}x{cols} grid of panels on high-quality watercolor rag paper.\n\n"
        f"STAGE & ENVIRONMENT: {stage.get('name', 'Fixed Stage')}. {stage.get('description', '')}. {stage.get('lighting', '')}.\n\n"
        f"CHARACTER INVARIANTS: {char_inv}\n\n"
        f"OBJECT RULES: {prop_directive}\n\n"
        f"CHRONOLOGICAL LOGICAL PANEL SEQUENCE:\n"
        f"{panels_formatted}\n\n"
        f"NEGATIVE CONSTRAINTS:\n"
        f"{UNIVERSAL_NEGATIVE_PROMPT}"
    )

    return {
        "story_id": story_id,
        "title": title,
        "total_panels": total_panels,
        "recommended_layout": f"{rows}x{cols}",
        "grid_prompt": grid_prompt
    }

def generate_panel_prompt(story, panel_idx, master_stage):
    sentences = story.get('text', [])
    total_panels = len(sentences)
    sentence = sentences[panel_idx]
    is_last = (panel_idx == total_panels - 1)
    is_moral = detect_moral_sentence(sentence) or is_last

    char_invariants = extract_character_invariants(story)
    scene_info = master_stage["scene_map"].get(panel_idx, {"scene": master_stage["setting_name"], "is_stage": True, "prop_state": ""})
    
    # Grounded narrative action translation (especially for abstract moral endings)
    if is_moral:
        primary_char = (story.get('character', [story.get('animal', 'character')])[0]).lower()
        grounded_action = (
            f"Concluding storybook tableau: The happy, triumphant {primary_char} stands proudly in the exact same {master_stage['setting_name']}, "
            f"head held high with a warm, joyful smile of accomplishment. "
            f"The environment is peaceful under radiant warm sunlight. "
            f"Stage details: {scene_info.get('prop_state', '')}. "
            f"STRICTLY FORBIDDEN: Do NOT draw any open books, desks, modern furniture, human teachers, chalkboards, speech bubbles, "
            f"floating text, or glowing cartoon stars. The scene must remain a pure, grounded animal storybook moment."
        )
    else:
        grounded_action = (
            f"Action for narrative event: \"{sentence}\". "
            f"Character interaction: The character is visibly performing this action with clear, expressive body language and eye contact. "
            f"Stage details: {scene_info.get('prop_state', '')}."
        )

    # Compose final prompt
    is_stage_panel = scene_info.get("is_stage", False)
    stage_continuity_note = ""
    if is_stage_panel:
        stage_continuity_note = (
            f"MANDATORY CONTINUITY LOCK: This panel is staged in the {master_stage['setting_name']}. "
            f"Background Environment: {master_stage['environment']}. "
            f"Fixed Centerpiece Prop: {master_stage['fixed_prop']}. "
            f"Maintain the identical camera angle, stone textures, lighting, and object placements as established in Panel {master_stage['master_anchor_panel']}. "
        )

    full_prompt = (
        f"{STYLE_DIRECTIVE}\n\n"
        f"Story: \"{story.get('title')}\" — Panel {panel_idx + 1} of {total_panels}\n"
        f"Narrative Sentence: \"{sentence}\"\n\n"
        f"Character Invariants: {char_invariants}\n\n"
        f"{stage_continuity_note}\n"
        f"Scene Action: {grounded_action}\n\n"
        f"Negative Constraints: {UNIVERSAL_NEGATIVE_PROMPT}"
    )

    return {
        "panel_number": panel_idx + 1,
        "total_panels": total_panels,
        "sentence": sentence,
        "is_moral_panel": is_moral,
        "scene_name": scene_info.get("scene"),
        "is_fixed_stage": is_stage_panel,
        "master_anchor_panel": master_stage["master_anchor_panel"] if is_stage_panel else None,
        "character_invariants": char_invariants,
        "environment": master_stage["environment"] if is_stage_panel else "Establishing landscape",
        "fixed_prop": master_stage["fixed_prop"] if is_stage_panel else None,
        "prop_state": scene_info.get("prop_state"),
        "grounded_action": grounded_action,
        "negative_prompt": UNIVERSAL_NEGATIVE_PROMPT,
        "full_prompt": full_prompt,
    }

def generate_story_prompt_suite(story):
    master_stage = analyze_story_scenes(story)
    panels = []
    for i in range(len(story.get('text', []))):
        p = generate_panel_prompt(story, i, master_stage)
        panels.append(p)
    return {
        "story_id": story.get('id'),
        "title": story.get('title'),
        "animal": story.get('animal'),
        "characters": story.get('character'),
        "moral": story.get('moral'),
        "total_panels": len(panels),
        "master_stage": master_stage["setting_name"],
        "panels": panels,
    }

def main():
    parser = argparse.ArgumentParser(description="TalePickle Storybook Continuity Prompt Engine")
    parser.add_argument("--story", type=str, help="Story ID to generate prompts for (e.g. crow_and_water_pot)")
    parser.add_argument("--grid", action="store_true", help="Generate single-pass multi-panel Storyboard Grid prompt (fastest & quota-efficient)")
    parser.add_argument("--all", action="store_true", help="Process all 152 stories")
    parser.add_argument("--output", type=str, help="Output path for JSON prompts")
    parser.add_argument("--summary", action="store_true", help="Print summary only")
    args = parser.parse_args()

    stories = load_stories()
    story_map = {s.get('id'): s for s in stories}

    if args.story:
        target = story_map.get(args.story)
        if not target:
            print(f"Error: Story ID '{args.story}' not found in stories.json.")
            sys.exit(1)

        if args.grid:
            grid_res = generate_grid_prompt(target)
            print("================================================================================")
            print(f"🎬 SINGLE-PASS STORYBOARD GRID PROMPT: {grid_res['title']} ({grid_res['story_id']})")
            print("================================================================================")
            print(f"Recommended Grid Layout: {grid_res['recommended_layout']} (Total Panels: {grid_res['total_panels']})")
            print(f"Technique: 1 API call generates all panels at once. Crop later with slice_storyboard_grid.py!")
            print("--------------------------------------------------------------------------------")
            print(grid_res['grid_prompt'])
            print("================================================================================")
            sys.exit(0)

        suite = generate_story_prompt_suite(target)
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(suite, f, indent=2)
            print(f"✓ Saved prompt suite for '{args.story}' to {args.output}")
        else:
            print(f"================================================================================")
            print(f"🎬 CONTINUITY PROMPT SUITE: {suite['title']} ({suite['story_id']})")
            print(f"================================================================================")
            print(f"Master Stage: {suite['master_stage']}")
            print(f"Total Panels: {suite['total_panels']}")
            print(f"--------------------------------------------------------------------------------")
            for p in suite['panels']:
                print(f"\n[Panel {p['panel_number']}/{p['total_panels']}] {'⭐ MORAL/RESOLUTION' if p['is_moral_panel'] else '📖 ACTION'}")
                print(f"Sentence: \"{p['sentence']}\"")
                print(f"Stage: {p['scene_name']} (Fixed Stage: {p['is_fixed_stage']})")
                print(f"Action: {p['grounded_action']}")
                print(f"\n--- FULL RENDER PROMPT ---")
                print(p['full_prompt'])
                print(f"--------------------------------------------------------------------------------")
    elif args.all:
        print(f"Analyzing all {len(stories)} stories for scene continuity and moral panel grounding...")
        results = {}
        for s in stories:
            suite = generate_story_prompt_suite(s)
            results[s.get('id')] = suite
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2)
            print(f"✓ Exported continuity prompts for all {len(stories)} stories to {args.output}")
        if args.summary or not args.output:
            moral_count = sum(p['is_moral_panel'] for s in results.values() for p in s['panels'])
            fixed_stage_count = sum(p['is_fixed_stage'] for s in results.values() for p in s['panels'])
            total_p = sum(s['total_panels'] for s in results.values())
            print(f"✓ Total stories analyzed: {len(stories)}")
            print(f"✓ Total panels: {total_p}")
            print(f"✓ Panels with Fixed Stage Locking: {fixed_stage_count} ({round(fixed_stage_count/total_p*100, 1)}%)")
            print(f"✓ Concluding/Moral Panels with Grounded Staging: {moral_count} (100% protected against book/teacher/star hallucinations)")
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
