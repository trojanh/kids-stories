#!/usr/bin/env python3
"""
link_story_panels.py
--------------------
Links all 160 stories in stories.json directly with their generated
vector panel SVGs and hero cover images:
  - story['cover_image'] = 'data/story_images/{story_id}.svg'
  - story['cover_png'] = 'data/story_images/{story_id}.png'
  - story['panels'] = ['data/svgs/{story_id}/panel_1.svg', 'panel_2.svg', ...]
Maintains exact 1:1 length parity with story['text'] to pass test_stories.py.
"""

import os
import json
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_STORIES = os.path.join(ROOT_DIR, 'src', 'data', 'stories.json')
UI_STORIES = os.path.join(ROOT_DIR, 'src', 'ui', 'data', 'stories.json')
SVGS_DIR = os.path.join(ROOT_DIR, 'src', 'ui', 'data', 'svgs')
HERO_DIR = os.path.join(ROOT_DIR, 'src', 'ui', 'data', 'story_images')

def link_stories():
    with open(DATA_STORIES, 'r', encoding='utf-8') as f:
        stories = json.load(f)

    linked_count = 0
    total_panels_linked = 0

    for s in stories:
        sid = s['id']
        n_sentences = len(s.get('text', []))

        # 1. Link hero cover image (SVG and PNG)
        s['cover_image'] = f"data/story_images/{sid}.svg"
        s['cover_png'] = f"data/story_images/{sid}.png"

        # 2. Link sequential story panels
        # Each index i in text corresponds to panel_{i+1}.svg
        panel_paths = []
        for i in range(n_sentences):
            p_num = i + 1
            panel_rel_path = f"data/svgs/{sid}/panel_{p_num}.svg"
            panel_paths.append(panel_rel_path)

        s['panels'] = panel_paths
        linked_count += 1
        total_panels_linked += len(panel_paths)

    # Save to src/data/stories.json
    with open(DATA_STORIES, 'w', encoding='utf-8') as f:
        json.dump(stories, f, indent=2, ensure_ascii=False)
        f.write('\n')

    # Save to src/ui/data/stories.json
    with open(UI_STORIES, 'w', encoding='utf-8') as f:
        json.dump(stories, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"✓ Successfully linked {linked_count} stories with {total_panels_linked} panel SVGs and cover images!")
    print(f"  Updated: {DATA_STORIES}")
    print(f"  Updated: {UI_STORIES}")

    # Run verification test
    test_script = os.path.join(ROOT_DIR, 'src', 'data', 'test_stories.py')
    res = subprocess.run(["python3", test_script], capture_output=True, text=True)
    if res.returncode == 0:
        print("✓ All story validation and integrity tests PASSED!")
    else:
        print("❌ Test failure:", res.stderr or res.stdout)

if __name__ == '__main__':
    link_stories()
