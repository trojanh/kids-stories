#!/usr/bin/env python3
"""
generate_audio.py
-----------------
Batch generates single continuous neural audio files for kids storybooks using open-source Edge-TTS.
Extracts millisecond-exact sentence start/end timestamps and word-level karaoke boundaries.

Architecture (Approach 2):
  - Each fable is synthesized as a single continuous narrative: src/ui/audio/<story_id>/story.mp3
  - Natural storytelling flow and voice inflection across panel boundaries
  - Exact sentence cue points: [start, end] and word boundaries [{w, s, e}] in audio_manifest.json
  - 152 total audio files instead of 1,500+ micro-files

Usage:
  # Generate continuous neural audio for all remaining incomplete stories:
  python3 scripts/generate_audio.py --stories all

  # Generate for a specific fable:
  python3 scripts/generate_audio.py --story tiger_and_mice

  # Process next 5 stories:
  python3 scripts/generate_audio.py --limit 5

  # Re-index existing audio files into audio_manifest.json:
  python3 scripts/generate_audio.py --reindex-only
"""

import argparse
import asyncio
import json
import os
import re
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
SRC_UI_MANIFEST_FILE = ROOT_DIR / "src" / "ui" / "data" / "audio_manifest.json"
SRC_DATA_MANIFEST_FILE = ROOT_DIR / "src" / "data" / "audio_manifest.json"

DEFAULT_VOICE = "en-US-AnaNeural" # Warm, engaging children's narrator voice
DEFAULT_RATE = "-4%" # Gentle cadence for young readers
DEFAULT_PITCH = "+2Hz" # Cheerful, friendly inflection


def normalize_word(w: str) -> str:
    return re.sub(r"[^\w]", "", w).lower()


def load_manifest(default_voice: str) -> dict:
    for m_path in [SRC_UI_MANIFEST_FILE, SRC_DATA_MANIFEST_FILE]:
        if m_path.exists():
            try:
                with open(m_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "stories" in data:
                        return data
            except Exception:
                pass
    return {"version": "2.0", "default_voice": default_voice, "stories": {}}


def save_manifest_to_disk(manifest: dict):
    manifest["version"] = "2.0"
    SRC_UI_MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    SRC_DATA_MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)

    manifest_json = json.dumps(manifest, indent=2, ensure_ascii=False)
    SRC_UI_MANIFEST_FILE.write_text(manifest_json, encoding="utf-8")
    SRC_DATA_MANIFEST_FILE.write_text(manifest_json, encoding="utf-8")


def is_story_complete(story: dict, manifest: dict) -> bool:
    story_id = story.get("id")
    if not story_id:
        return False
    story_file = SRC_AUDIO_DIR / story_id / "story.mp3"
    if not story_file.exists() or story_file.stat().st_size == 0:
        return False
    # Verify manifest entry has timestamp cues
    entry = manifest.get("stories", {}).get(story_id)
    if not entry or not entry.get("sentences") or not isinstance(entry["sentences"], list):
        return False
    first_sent = entry["sentences"][0]
    return isinstance(first_sent, dict) and "start" in first_sent and "end" in first_sent


def segment_story_words(sentences: list, moral: str, captured_words: list):
    """
    Partitions the continuous stream of WordBoundary events from Edge-TTS
    into individual panel sentences and the concluding moral.
    """
    total_words = len(captured_words)
    word_idx = 0
    sentence_entries = []

    for idx, sentence in enumerate(sentences):
        sent_words = [w for w in sentence.split() if normalize_word(w)]
        matched = []
        for _ in sent_words:
            if word_idx < total_words:
                matched.append(captured_words[word_idx])
                word_idx += 1

        if matched:
            start_sec = matched[0]["s"]
            end_sec = matched[-1]["e"]
        else:
            start_sec = 0.0
            end_sec = 0.0

        sentence_entries.append({
            "index": idx,
            "start": round(start_sec, 3),
            "end": round(end_sec, 3),
            "words": matched
        })

    # Segment the concluding moral
    moral_prefix_words = [w for w in "In the end, the story reminds us:".split() if normalize_word(w)]
    prefix_matched = []
    for _ in moral_prefix_words:
        if word_idx < total_words:
            prefix_matched.append(captured_words[word_idx])
            word_idx += 1

    moral_words = [w for w in moral.split() if normalize_word(w)]
    moral_matched = []
    for _ in moral_words:
        if word_idx < total_words:
            moral_matched.append(captured_words[word_idx])
            word_idx += 1

    all_moral_words = prefix_matched + moral_matched
    if all_moral_words:
        moral_start = all_moral_words[0]["s"]
        moral_end = all_moral_words[-1]["e"]
    else:
        moral_start = sentence_entries[-1]["end"] if sentence_entries else 0.0
        moral_end = moral_start

    moral_entry = {
        "start": round(moral_start, 3),
        "end": round(moral_end, 3),
        "words": all_moral_words
    }

    return sentence_entries, moral_entry


async def generate_single_story_audio(story: dict, voice: str, rate: str, pitch: str, overwrite: bool = False):
    story_id = story.get("id")
    title = story.get("title", story_id)
    sentences = story.get("text", [])
    moral = story.get("moral", "")

    story_src_dir = SRC_AUDIO_DIR / story_id
    story_src_dir.mkdir(parents=True, exist_ok=True)

    dest_file = story_src_dir / "story.mp3"
    temp_file = story_src_dir / "story.tmp.mp3"

    print(f"\n🎙️  Processing Story: '{title}' ({story_id}) — {len(sentences)} sentences")

    full_text = " ".join(sentences) + " In the end, the story reminds us: " + moral
    communicate = edge_tts.Communicate(full_text.strip(), voice, rate=rate, pitch=pitch, boundary="WordBoundary")

    audio_bytes = bytearray()
    captured_words = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            captured_words.append({
                "w": chunk["text"],
                "s": round(chunk["offset"] / 10_000_000, 3),
                "e": round((chunk["offset"] + chunk["duration"]) / 10_000_000, 3)
            })

    temp_file.write_bytes(audio_bytes)
    if temp_file.exists() and temp_file.stat().st_size > 0:
        temp_file.replace(dest_file)

    sentence_entries, moral_entry = segment_story_words(sentences, moral, captured_words)
    total_duration = round(captured_words[-1]["e"], 3) if captured_words else 0.0

    # Save per-story detailed word boundaries to words.json (loaded asynchronously on-demand)
    story_words = {
        "sentences": {str(sent["index"]): sent.get("words", []) for sent in sentence_entries},
        "moral": moral_entry.get("words", [])
    }
    words_json_str = json.dumps(story_words, separators=(",", ":"))
    (story_src_dir / "words.json").write_text(words_json_str, encoding="utf-8")

    # Lightweight manifest entry (without heavy word arrays)
    light_sentences = [{"index": s["index"], "start": s["start"], "end": s["end"]} for s in sentence_entries]
    manifest_entry = {
        "title": title,
        "voice": voice,
        "audio": f"audio/{story_id}/story.mp3",
        "duration": total_duration,
        "sentences": light_sentences,
        "moral": {
            "start": moral_entry["start"],
            "end": moral_entry["end"]
        }
    }

    # Clean up legacy micro sentence files if present to save disk space
    for old_file in list(story_src_dir.glob("sentence_*.mp3")) + [story_src_dir / "moral.mp3", story_src_dir / "full_story.mp3"]:
        try:
            if old_file.exists():
                old_file.unlink()
        except Exception:
            pass

    print(f"   ✓ Generated continuous story audio ({dest_file.stat().st_size // 1024} KB, {total_duration}s, {len(captured_words)} words)")
    for sent in sentence_entries:
        print(f"     Panel {sent['index'] + 1}/{len(sentences)}: [{sent['start']}s -> {sent['end']}s] ({len(sent['words'])} words)")
    print(f"     Moral: [{moral_entry['start']}s -> {moral_entry['end']}s]")

    return manifest_entry


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

    parser = argparse.ArgumentParser(description="Batch generate continuous single-audio files with timestamp cue points for kids storybooks.")
    parser.add_argument("--stories", default="all", help="Comma-separated story IDs or 'all' (default: all).")
    parser.add_argument("--story", default=None, help="Alias for --stories <single_story_id>.")
    parser.add_argument("--concurrency", type=int, default=5, help="Number of stories to generate concurrently in parallel (default: 5).")
    parser.add_argument("--batch-index", type=int, default=None, help="Batch index (0-based) for manual multi-process batching.")
    parser.add_argument("--total-batches", type=int, default=None, help="Total number of batches for manual multi-process batching.")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of stories to process.")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help=f"Edge-TTS voice (default: {DEFAULT_VOICE}).")
    parser.add_argument("--rate", default=DEFAULT_RATE, help=f"Speech rate (default: {rate_help}).")
    parser.add_argument("--pitch", default=DEFAULT_PITCH, help=f"Speech pitch (default: {pitch_help}).")
    parser.add_argument("--overwrite", action="store_true", help="Force re-generation of existing story.mp3 files.")
    parser.add_argument("--reindex-only", action="store_true", help="Re-scan and rebuild audio_manifest.json.")
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

    manifest = load_manifest(args.voice)

    target_stories = args.story if args.story else args.stories

    if args.reindex_only:
        selected_stories = []
    elif target_stories == "all":
        if args.overwrite:
            selected_stories = all_stories
        else:
            selected_stories = [s for s in all_stories if not is_story_complete(s, manifest)]
    else:
        story_ids = [x.strip() for x in target_stories.split(",") if x.strip()]
        candidates = [s for s in all_stories if s.get("id") in story_ids]
        if args.overwrite:
            selected_stories = candidates
        else:
            selected_stories = [s for s in candidates if not is_story_complete(s, manifest)]

    # Support batch slicing if requested
    if args.batch_index is not None and args.total_batches is not None:
        selected_stories = [s for idx, s in enumerate(selected_stories) if idx % args.total_batches == args.batch_index]

    if args.limit:
        selected_stories = selected_stories[:args.limit]

    batch_info = f" [Batch {args.batch_index + 1}/{args.total_batches}]" if args.batch_index is not None else ""
    print(f"Starting Single Continuous Audio Pipeline (Approach 2){batch_info}...")
    print(f"• Concurrency: {args.concurrency} parallel streams")
    print(f"• Voice: {args.voice} (Rate: {args.rate}, Pitch: {args.pitch})")
    print(f"• Stories to process: {len(selected_stories)} (out of {len(all_stories)} total)")

    sem = asyncio.Semaphore(args.concurrency)
    manifest_lock = asyncio.Lock()
    total_generated = 0
    completed_counter = 0

    async def worker(story):
        nonlocal total_generated, completed_counter
        async with sem:
            try:
                entry = await generate_single_story_audio(story, args.voice, args.rate, args.pitch, args.overwrite)
                async with manifest_lock:
                    m = load_manifest(args.voice)
                    m["stories"][story["id"]] = entry
                    save_manifest_to_disk(m)
                    total_generated += 1
                    completed_counter += 1
                    print(f"   📊 Progress: {completed_counter}/{len(selected_stories)} completed ({story['id']})")
                return entry
            except Exception as e:
                print(f"   ⚠️ Error processing '{story.get('id')}': {e}", file=sys.stderr)
                return None

    tasks = [worker(s) for s in selected_stories]
    await asyncio.gather(*tasks)

    # Final sync
    manifest = load_manifest(args.voice)
    save_manifest_to_disk(manifest)

    print("\n" + "=" * 60)
    print(f"✨ Single continuous audio pipeline run complete!{batch_info}")
    print(f"• Stories generated this run: {total_generated}")
    print(f"• Total narrated stories in manifest: {len(manifest.get('stories', {}))}")
    print(f"• Manifest synced to: {SRC_UI_MANIFEST_FILE}, {SRC_DATA_MANIFEST_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
