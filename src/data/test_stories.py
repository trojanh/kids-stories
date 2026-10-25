import json
from pathlib import Path

try:
    import pytest
except ImportError:
    pytest = None

STORIES_PATH = Path(__file__).with_name("stories.json")

REQUIRED_FIELDS = {
    "id",
    "title",
    "theme",
    "animal",
    "character",
    "tags",
    "length",
    "text",
    "panels",
    "moral",
}


def load_stories():
    with STORIES_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def test_story_fields_present():
    stories = load_stories()
    assert isinstance(stories, list), "stories.json should contain a list of story objects"
    for story in stories:
        missing = REQUIRED_FIELDS - story.keys()
        assert not missing, f"Story {story.get('id', '<unknown>')} is missing fields: {missing}"
        # Additional type checks
        assert isinstance(story["character"], list), "'character' should be a list"
        assert isinstance(story["tags"], list), "'tags' should be a list"
        assert isinstance(story["text"], list), "'text' should be a list"
        assert isinstance(story["panels"], list), "'panels' should be a list"
        # Ensure non‑empty strings for simple fields
        for key in ["id", "title", "theme", "animal", "length", "moral"]:
            assert isinstance(story[key], str) and story[key].strip(), f"Field '{key}' must be a non‑empty string"


def test_unique_story_ids():
    stories = load_stories()
    ids = [s.get("id") for s in stories]
    assert len(ids) == len(set(ids)), "Duplicate story IDs found"


def test_story_lengths_and_panels_are_accurate():
    stories = load_stories()
    for story in stories:
        n = len(story["text"])
        expected_length = "short" if n <= 7 else ("medium" if n <= 14 else "long")
        assert (
            story["length"] == expected_length
        ), f"Story {story['id']} marked as '{story['length']}' but has {n} sentences (expected '{expected_length}')"
        assert (
            len(story["panels"]) == n
        ), f"Story {story['id']} has {len(story['panels'])} panels for {n} text sentences"


if __name__ == "__main__":
    test_story_fields_present()
    test_unique_story_ids()
    test_story_lengths_and_panels_are_accurate()
    stories = load_stories()
    print(f"All {len(stories)} stories passed integrity validation successfully!")

