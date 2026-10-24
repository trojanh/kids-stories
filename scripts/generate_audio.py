#!/usr/bin/env python3
"""
generate_audio.py
-----------------
Batch generates high-fidelity neural audio files for kids storybooks using open-source Edge-TTS.

Outputs:
  - src/ui/audio/<story_id>/sentence_<idx>.mp3
  - src/ui/audio/<story_id>/moral.mp3
  - src/ui/audio/<story_id>/full_story.mp3
  - src/ui/data/audio_manifest.json (and copies to docs/)

Usage:
  # Generate audio for default 5 popular fables:
  python3 scripts/generate_audio.py

  # Generate for a specific fable:
  python3 scripts/generate_audio.py --stories tiger_and_mice

  # Generate for first 10 fables:
  python3 scripts/generate_audio.py --limit 10

  # Generate for all 150+ fables:
  python3 scripts/generate_audio.py --stories all
"""

import argparse
import asyncio
import json
import os
import shutil
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("Error: edge-tts is not installed. Run: pip3 install edge-tts", file=sys.stderr)
    sys.exit(1)

ROOT_DIR = Path(__file__).resolve().parent.parent
STORIES_FILE = ROOT_DIR / "src" / "data" / "stories.json"
SRC_AUDIO_DIR = ROOT_DIR / "src" / "ui" / "audio"
DOCS_AUDIO_DIR = ROOT_DIR / "docs" / "audio"
SRC_UI_MANIFEST_FILE = ROOT_DIR / "src" / "ui" / "data" / "audio_manifest.json"
SRC_DATA_MANIFEST_FILE = ROOT_DIR / "src" / "data" / "audio_manifest.json"
DOCS_MANIFEST_FILE = ROOT_DIR / "docs" / "data" / "audio_manifest.json"

DEFAULT_VOICE = "en-US-AnaNeural" # Friendly, warm children's narrator voice
DEFAULT_RATE = "-4%" # Gentle cadence for young readers
DEFAULT_PITCH = "+2Hz" # Warm, cheerful inflection

DEFAULT_STORIES = [
    "tiger_and_mice",
    "crow_and_water_pot",
    "fox_and_grapes",
    "tortoise_and_hare",
    "the_lion_and_the_mouse",
]


async def generate_file(text: str, output_path: Path, voice: str, rate: str, pitch: str, overwrite: bool = False, capture_words: bool = False):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_suffix(".tmp.mp3")

    words = []
    need_audio_gen = not output_path.exists() or overwrite or output_path.stat().st_size == 0

    communicate = edge_tts.Communicate(
        text.strip(),
        voice,
        rate=rate,
        pitch=pitch,
        boundary="WordBoundary" if capture_words else "SentenceBoundary"
    )

    if need_audio_gen:
        with open(temp_path, "wb") as f:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "WordBoundary" and capture_words:
                    words.append({
                        "w": chunk["text"],
                        "s": round(chunk["offset"] / 10_000_000, 3),
                        "e": round((chunk["offset"] + chunk["duration"]) / 10_000_000, 3)
                    })
        if temp_path.exists() and temp_path.stat().st_size > 0:
            temp_path.replace(output_path)
            return True, words
        return False, []
    else:
        # File exists; if words are requested, stream boundary metadata quickly
        if capture_words:
            async for chunk in communicate.stream():
                if chunk["type"] == "WordBoundary":
                    words.append({
                        "w": chunk["text"],
                        "s": round(chunk["offset"] / 10_000_000, 3),
                        "e": round((chunk["offset"] + chunk["duration"]) / 10_000_000, 3)
                    })
        return False, words


async def process_story(story: dict, voice: str, rate: str, pitch: str, overwrite: bool = False):
    story_id = story.get("id")
    title = story.get("title", story_id)
    sentences = story.get("text", [])
    moral = story.get("moral", "")

    story_src_dir = SRC_AUDIO_DIR / story_id
    story_docs_dir = DOCS_AUDIO_DIR / story_id
    story_src_dir.mkdir(parents=True, exist_ok=True)
    story_docs_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n🎙️  Processing Story: '{title}' ({story_id}) — {len(sentences)} sentences")

    manifest_entry = {
        "title": title,
        "voice": voice,
        "sentences": [],
        "moral": f"audio/{story_id}/moral.mp3",
        "full_story": f"audio/{story_id}/full_story.mp3",
    }

    generated_count = 0

    # 1. Generate sentence audio files with millisecond word timestamps
    for idx, sentence in enumerate(sentences):
        filename = f"sentence_{idx}.mp3"
        dest_src = story_src_dir / filename
        dest_docs = story_docs_dir / filename

        was_generated, words = await generate_file(sentence, dest_src, voice, rate, pitch, overwrite, capture_words=True)
        if was_generated:
            generated_count += 1
            shutil.copy2(dest_src, dest_docs)
            print(f"   ✓ Generated sentence {idx + 1}/{len(sentences)} ({dest_src.stat().st_size // 1024} KB, {len(words)} words)")
        else:
            if not dest_docs.exists() and dest_src.exists():
                shutil.copy2(dest_src, dest_docs)
            print(f"   • Existing sentence {idx + 1}/{len(sentences)} (cached, {len(words)} words)")

        manifest_entry["sentences"].append({
            "audio": f"audio/{story_id}/{filename}",
            "words": words
        })

    # 2. Generate moral audio file
    moral_text = f"In the end, the story reminds us: {moral}"
    moral_src = story_src_dir / "moral.mp3"
    moral_docs = story_docs_dir / "moral.mp3"
    was_moral_gen, _ = await generate_file(moral_text, moral_src, voice, rate, pitch, overwrite)
    if was_moral_gen:
        generated_count += 1
        shutil.copy2(moral_src, moral_docs)
        print(f"   ✓ Generated moral audio ({moral_src.stat().st_size // 1024} KB)")
    else:
        if not moral_docs.exists() and moral_src.exists():
            shutil.copy2(moral_src, moral_docs)

    # 3. Generate full story audio file
    full_text = " ".join(sentences) + " " + moral_text
    full_src = story_src_dir / "full_story.mp3"
    full_docs = story_docs_dir / "full_story.mp3"
    was_full_gen, _ = await generate_file(full_text, full_src, voice, rate, pitch, overwrite)
    if was_full_gen:
        generated_count += 1
        shutil.copy2(full_src, full_docs)
        print(f"   ✓ Generated full story audio ({full_src.stat().st_size // 1024} KB)")
    else:
        if not full_docs.exists() and full_src.exists():
            shutil.copy2(full_src, full_docs)

    return manifest_entry, generated_count


async def list_voices():
    voices = await edge_tts.list_voices()
    print(f"Total available voices: {len(voices)}")
    print(f"{'Short Name':<30} {'Gender':<10} {'Locale':<12}")
    print("-" * 55)
    for v in sorted(voices, key=lambda x: x["ShortName"]):
        if "en-" in v["Locale"].lower():
            print(f"{v['ShortName']:<30} {v['Gender']:<10} {v['Locale']:<12}")


async def main():
    rate_help = DEFAULT_RATE.replace("%", "%%")
    pitch_help = DEFAULT_PITCH.replace("%", "%%")

    parser = argparse.ArgumentParser(description="Batch generate neural audio files for kids storybooks.")
    parser.add_argument("--stories", default="default", help="Comma-separated story IDs, 'all', or 'default'.")
    parser.add_argument("--story", default=None, help="Alias for --stories <single_story_id>.")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of stories to process.")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help=f"Edge-TTS voice (default: {DEFAULT_VOICE}).")
    parser.add_argument("--rate", default=DEFAULT_RATE, help=f"Speech rate (default: {rate_help}).")
    parser.add_argument("--pitch", default=DEFAULT_PITCH, help=f"Speech pitch (default: {pitch_help}).")
    parser.add_argument("--overwrite", action="store_true", help="Force re-generation of existing audio files.")
    parser.add_argument("--reindex-only", action="store_true", help="Skip generation; scan and rebuild audio_manifest.json.")
    parser.add_argument("--list-voices", action="store_true", help="List available Edge-TTS English voices.")

    args = parser.parse_args()

    if args.list_voices:
        await list_voices()
        return

    if not STORIES_FILE.exists():
        print(f"Error: stories file not found at {STORIES_FILE}", file=sys.stderr)
        sys.exit(1)

    with open(STORIES_FILE, "r", encoding="utf-8") as f:
        all_stories = json.load(f)

    target_stories = args.story if args.story else args.stories

    # Filter stories to process
    if args.reindex_only:
        selected_stories = []
    elif target_stories == "all":
        selected_stories = all_stories
    elif target_stories == "default":
        selected_stories = [s for s in all_stories if s.get("id") in DEFAULT_STORIES]
    else:
        story_ids = [x.strip() for x in target_stories.split(",") if x.strip()]
        selected_stories = [s for s in all_stories if s.get("id") in story_ids]

    if args.limit:
        selected_stories = selected_stories[:args.limit]

    print(f"Starting Neural Audio Batch Generator...")
    print(f"• Voice: {args.voice} (Rate: {args.rate}, Pitch: {args.pitch})")
    print(f"• Stories to process: {len(selected_stories)}")

    # Load existing manifest if any
    manifest = {"version": "1.0", "default_voice": args.voice, "stories": {}}
    for m_path in [SRC_UI_MANIFEST_FILE, SRC_DATA_MANIFEST_FILE]:
        if m_path.exists():
            try:
                with open(m_path, "r", encoding="utf-8") as f:
                    manifest = json.load(f)
                    break
            except Exception:
                pass

    total_files_generated = 0
    for s in selected_stories:
        entry, count = await process_story(s, args.voice, args.rate, args.pitch, args.overwrite)
        manifest["stories"][s["id"]] = entry
        total_files_generated += count

    # Auto-index all existing audio directories in src/ui/audio
    stories_by_id = {s["id"]: s for s in all_stories}
    if SRC_AUDIO_DIR.exists():
        for story_dir in SRC_AUDIO_DIR.iterdir():
            if story_dir.is_dir() and story_dir.name in stories_by_id:
                sid = story_dir.name
                if sid not in manifest["stories"]:
                    s_obj = stories_by_id[sid]
                    s_text = s_obj.get("text", [])
                    if (story_dir / "sentence_0.mp3").exists():
                        manifest["stories"][sid] = {
                            "title": s_obj.get("title", sid),
                            "voice": args.voice,
                            "sentences": [f"audio/{sid}/sentence_{i}.mp3" for i in range(len(s_text))],
                            "moral": f"audio/{sid}/moral.mp3",
                            "full_story": f"audio/{sid}/full_story.mp3",
                        }

    # Save manifest across src/ui/data, src/data, and docs/data
    SRC_UI_MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    SRC_DATA_MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    DOCS_MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)

    manifest_json = json.dumps(manifest, indent=2, ensure_ascii=False)
    SRC_UI_MANIFEST_FILE.write_text(manifest_json, encoding="utf-8")
    SRC_DATA_MANIFEST_FILE.write_text(manifest_json, encoding="utf-8")
    DOCS_MANIFEST_FILE.write_text(manifest_json, encoding="utf-8")

    print("\n" + "=" * 60)
    print(f"✨ Batch generation complete!")
    print(f"• Total new files generated: {total_files_generated}")
    print(f"• Total narrated stories in manifest: {len(manifest['stories'])}")
    print(f"• Manifest written to: {SRC_UI_MANIFEST_FILE}, {SRC_DATA_MANIFEST_FILE}, {DOCS_MANIFEST_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
