"""
build_docs.py
-------------
Prepares the static web application in src/ui/ for direct GitHub Pages deployment
and maximum SEO performance. Generates sitemap.xml, robots.txt, and .nojekyll.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_UI = ROOT_DIR / "src" / "ui"
SRC_DATA = ROOT_DIR / "src" / "data"

BASE_URL = "https://talepickle.com"
CUSTOM_DOMAIN = "talepickle.com"


def generate_seo_files(stories):
    today = datetime.now().strftime("%Y-%m-%d")

    # 1. Sitemap.xml
    sitemap_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        f'    <loc>{BASE_URL}/</loc>',
        f'    <lastmod>{today}</lastmod>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
    ]

    for s in stories:
        sid = s.get("id")
        if sid:
            sitemap_lines.extend([
                '  <url>',
                f'    <loc>{BASE_URL}/story/{sid}</loc>',
                f'    <lastmod>{today}</lastmod>',
                '    <changefreq>monthly</changefreq>',
                '    <priority>0.8</priority>',
                '  </url>',
            ])

    sitemap_lines.append('</urlset>')
    sitemap_xml = "\n".join(sitemap_lines)

    (SRC_UI / "sitemap.xml").write_text(sitemap_xml, encoding="utf-8")
    print(f"Generated sitemap.xml with {len(stories) + 1} URLs in src/ui/")

    # 2. Robots.txt
    robots_txt = (
        "User-agent: *\n"
        "Allow: /\n\n"
        f"Sitemap: {BASE_URL}/sitemap.xml\n"
    )
    (SRC_UI / "robots.txt").write_text(robots_txt, encoding="utf-8")
    print("Generated robots.txt in src/ui/")


def build():
    print("Preparing static bundle in src/ui/ for GitHub Pages deployment...")

    (SRC_UI / "data").mkdir(parents=True, exist_ok=True)

    # 1. Ensure master stories.json is synced to src/ui/data/
    stories_src = SRC_DATA / "stories.json"
    stories_ui = SRC_UI / "data" / "stories.json"
    if stories_src.resolve() != stories_ui.resolve():
        shutil.copy2(stories_src, stories_ui)
        print("Synced stories.json -> src/ui/data/stories.json")

    # 2. Ensure audio_manifest.json is synced to src/ui/data/
    manifest_src = SRC_DATA / "audio_manifest.json"
    manifest_ui = SRC_UI / "data" / "audio_manifest.json"
    if manifest_src.exists() and manifest_src.resolve() != manifest_ui.resolve():
        shutil.copy2(manifest_src, manifest_ui)
        print("Synced audio_manifest.json -> src/ui/data/audio_manifest.json")

    # 3. Create .nojekyll in src/ui/ to ensure GitHub Pages serves all assets without Jekyll filtering
    nojekyll = SRC_UI / ".nojekyll"
    nojekyll.write_text("", encoding="utf-8")
    print("Ensured src/ui/.nojekyll exists for GitHub Pages")

    # 4. Create CNAME in src/ui/ and root for custom domain talepickle.com
    (SRC_UI / "CNAME").write_text(f"{CUSTOM_DOMAIN}\n", encoding="utf-8")
    (ROOT_DIR / "CNAME").write_text(f"{CUSTOM_DOMAIN}\n", encoding="utf-8")
    print(f"Created CNAME ({CUSTOM_DOMAIN}) in src/ui/ and root")

    # 5. Generate SEO sitemap.xml and robots.txt
    with stories_src.open("r", encoding="utf-8") as f:
        stories = json.load(f)
    generate_seo_files(stories)

    # 5. Verify audio assets
    audio_dir = SRC_UI / "audio"
    if audio_dir.exists():
        count = len([d for d in audio_dir.iterdir() if d.is_dir()])
        print(f"Verified {count} narrated story audios in src/ui/audio/")

    print("Static build complete! src/ui/ is ready for GitHub Pages deployment.")


if __name__ == "__main__":
    build()
