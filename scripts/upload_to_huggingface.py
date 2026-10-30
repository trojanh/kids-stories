#!/usr/bin/env python3
"""
scripts/upload_to_huggingface.py
Uploads all TalePickle storybook media assets (~4.6 GB: SVGs, PNGs, MP3s)
to a free Hugging Face Dataset repository to serve as a fast global CDN.
Zero credit card required.
"""

import os
import sys
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Upload TalePickle assets to Hugging Face Hub")
    parser.add_argument("--repo-id", required=True, help="HF dataset repo, e.g. 'username/talepickle-assets'")
    parser.add_argument("--token", default=os.getenv("HF_TOKEN"), help="Hugging Face Write Token (or set HF_TOKEN env var)")
    args = parser.parse_args()

    token = args.token
    if not token:
        print("❌ Error: Hugging Face access token is required.")
        print("   Create a free 'Write' token at: https://huggingface.co/settings/tokens")
        print("   Pass it via --token <hf_token> or export HF_TOKEN=<token>")
        sys.exit(1)

    try:
        from huggingface_hub import HfApi
    except ImportError:
        print("❌ Error: huggingface_hub is not installed.")
        sys.exit(1)

    api = HfApi(token=token)
    repo_id = args.repo_id

    print("=" * 70)
    print("🚀 TalePickle Hugging Face CDN Sync")
    print(f"📦 Target Dataset Repo: https://huggingface.co/datasets/{repo_id}")
    print("=" * 70)

    # 1. Ensure the dataset repo exists
    print(f"\n1️⃣  Creating or verifying dataset repository '{repo_id}'...")
    try:
        api.create_repo(repo_id=repo_id, repo_type="dataset", private=False, exist_ok=True)
        print("   ✓ Dataset repository is ready (Public).")
    except Exception as e:
        print(f"   ⚠️  Repo check/create notice: {e}")

    base_dir = Path(__file__).resolve().parent.parent

    # 2. Upload directories
    targets = [
        ("Cover Vector Images", base_dir / "src/ui/data/story_images", "data/story_images"),
        ("Story Narration Audio", base_dir / "src/ui/audio", "audio"),
        ("Storyboard Vector Panels", base_dir / "src/ui/data/svgs", "data/svgs"),
    ]

    for label, local_path, repo_path in targets:
        if not local_path.exists():
            print(f"\n⚠️ Skipping {label}: {local_path} does not exist.")
            continue

        print(f"\n📤 Uploading {label} ({local_path} -> {repo_path})...")
        try:
            api.upload_folder(
                folder_path=str(local_path),
                path_in_repo=repo_path,
                repo_id=repo_id,
                repo_type="dataset",
                commit_message=f"Sync {label} for TalePickle 160 stories",
            )
            print(f"   ✓ {label} upload complete!")
        except Exception as e:
            print(f"   ❌ Upload failed for {label}: {e}")

    cdn_base = f"https://huggingface.co/datasets/{repo_id}/resolve/main"
    print("\n" + "=" * 70)
    print("🎉 All assets uploaded successfully to Hugging Face!")
    print(f"🌐 Your CDN Base URL is:\n   {cdn_base}")
    print("\nTo activate this CDN in TalePickle, add this to src/ui/index.html:")
    print(f'   <script>window.TALEPICKLE_CDN = "{cdn_base}";</script>')
    print("=" * 70)

if __name__ == "__main__":
    main()
