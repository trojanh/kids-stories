#!/usr/bin/env python3
"""
update_storyboard_manifest.py
-----------------------------
Scans `src/ui/data/svgs/` and creates/updates `src/ui/data/storyboard_manifest.json`.
Maps every story ID to its available vector SVG panels, enabling the UI to dynamically
load sequential multi-panel storyboards with zero manual configuration.
"""

import os
import json
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVGS_DIR = os.path.join(ROOT_DIR, 'src', 'ui', 'data', 'svgs')
MANIFEST_PATH = os.path.join(ROOT_DIR, 'src', 'ui', 'data', 'storyboard_manifest.json')
STORIES_PATH = os.path.join(ROOT_DIR, 'src', 'data', 'stories.json')

try:
    from scripts.link_story_panels import link_stories
except ImportError:
    link_stories = None

def update_manifest():
    story_lengths = {}
    if os.path.exists(STORIES_PATH):
        with open(STORIES_PATH, 'r', encoding='utf-8') as f:
            stories = json.load(f)
            for s in stories:
                story_lengths[s['id']] = len(s.get('text', []))

    manifest = {}

    if not os.path.exists(SVGS_DIR):
        print(f"SVGS_DIR not found: {SVGS_DIR}")
        return manifest

    for entry in sorted(os.listdir(SVGS_DIR)):
        story_dir = os.path.join(SVGS_DIR, entry)
        if not os.path.isdir(story_dir):
            continue

        panels = {}
        for f in os.listdir(story_dir):
            if f.startswith('panel_') and f.endswith('.svg'):
                full_path = os.path.join(story_dir, f)
                size = os.path.getsize(full_path)
                if size > 10000:  # authentic vector illustration (>10 KB)
                    match = re.match(r'panel_(\d+)\.svg', f)
                    if match:
                        panel_num = int(match.group(1))
                        panels[panel_num] = {
                            "file": f,
                            "size_kb": round(size / 1024, 1)
                        }

        if panels:
            expected_total = story_lengths.get(entry, len(panels))
            sorted_nums = sorted(panels.keys())
            has_full = len(panels) >= expected_total

            manifest[entry] = {
                "story_id": entry,
                "panel_count": len(panels),
                "expected_total": expected_total,
                "is_complete": has_full,
                "available_panels": sorted_nums,
                "panels": {str(k): panels[k]["file"] for k in sorted_nums}
            }

    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    complete_count = sum(1 for v in manifest.values() if v["is_complete"])
    print(f"✓ Storyboard manifest updated: {len(manifest)} stories registered ({complete_count} fully complete).")
    print(f"  Saved to: {MANIFEST_PATH}")

    if link_stories:
        try:
            link_stories()
        except Exception as e:
            print(f"Story panels link warning: {e}")

    return manifest

if __name__ == '__main__':
    update_manifest()
