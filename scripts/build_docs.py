"""
build_docs.py
-------------
Builds the static distribution bundle into docs/ and src/ui/
for zero-configuration GitHub Pages hosting and maximum SEO performance.
Generates sitemap.xml, robots.txt, and .nojekyll.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_UI = ROOT_DIR / "src" / "ui"
SRC_DATA = ROOT_DIR / "src" / "data"
DOCS_DIR = ROOT_DIR / "docs"

BASE_URL = "https://trojanh.github.io/kids-stories"


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
                f'    <loc>{BASE_URL}/#story={sid}</loc>',
                f'    <lastmod>{today}</lastmod>',
                '    <changefreq>monthly</changefreq>',
                '    <priority>0.8</priority>',
                '  </url>',
            ])

    sitemap_lines.append('</urlset>')
    sitemap_xml = "\n".join(sitemap_lines)

    (DOCS_DIR / "sitemap.xml").write_text(sitemap_xml, encoding="utf-8")
    (SRC_UI / "sitemap.xml").write_text(sitemap_xml, encoding="utf-8")
    print(f"Generated sitemap.xml with {len(stories) + 1} URLs in docs/ and src/ui/")

    # 2. Robots.txt
    robots_txt = (
        "User-agent: *\n"
        "Allow: /\n\n"
        f"Sitemap: {BASE_URL}/sitemap.xml\n"
    )
    (DOCS_DIR / "robots.txt").write_text(robots_txt, encoding="utf-8")
    (SRC_UI / "robots.txt").write_text(robots_txt, encoding="utf-8")
    print("Generated robots.txt in docs/ and src/ui/")


def build():
    print("Building static site for GitHub Pages...")

    # Ensure directories exist
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    (DOCS_DIR / "data").mkdir(parents=True, exist_ok=True)
    (SRC_UI / "data").mkdir(parents=True, exist_ok=True)

    # 1. Copy UI assets into docs/
    for file_name in ["index.html", "style.css", "main.js", "tts.js", "svg-art.js", "rough.js"]:
        src_file = SRC_UI / file_name
        dest_file = DOCS_DIR / file_name
        if src_file.exists():
            shutil.copy2(src_file, dest_file)
            print(f"Copied {file_name} -> docs/{file_name}")

    # 2. Copy stories.json into docs/data/ and src/ui/data/
    stories_src = SRC_DATA / "stories.json"
    shutil.copy2(stories_src, DOCS_DIR / "data" / "stories.json")
    shutil.copy2(stories_src, SRC_UI / "data" / "stories.json")
    print("Copied stories.json -> docs/data/stories.json and src/ui/data/stories.json")

    # 3. Copy audio_manifest.json and audio directory if present
    manifest_src = SRC_UI / "data" / "audio_manifest.json"
    if manifest_src.exists():
        shutil.copy2(manifest_src, DOCS_DIR / "data" / "audio_manifest.json")
        print("Copied audio_manifest.json -> docs/data/audio_manifest.json")

    audio_src = SRC_UI / "audio"
    if audio_src.exists():
        audio_dest = DOCS_DIR / "audio"
        if audio_dest.exists():
            shutil.rmtree(audio_dest)
        shutil.copytree(audio_src, audio_dest)
        print("Copied pre-generated audio tree -> docs/audio/")

    # 4. Create .nojekyll in docs/ to ensure GitHub Pages doesn't ignore any files or folders
    nojekyll = DOCS_DIR / ".nojekyll"
    nojekyll.write_text("", encoding="utf-8")
    print("Created docs/.nojekyll for GitHub Pages")

    # 4. Generate SEO sitemap.xml and robots.txt
    with stories_src.open("r", encoding="utf-8") as f:
        stories = json.load(f)
    generate_seo_files(stories)

    print("Build complete! Docs folder is ready for GitHub Pages deployment.")


if __name__ == "__main__":
    build()
