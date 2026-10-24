# Storybook SVG Relevance & Scene Layout Enhancement Plan

## Executive Summary
This document outlines the comprehensive strategy to transform the vector illustration system in the Kids Storybook application. The goal is to make every illustration narratives-relevant, position characters contextually based on the story sentence, support multi-character scenes, and expand character definitions to cover all 152 stories and 95 distinct characters.

---

## 1. Audit Findings: Current Issues in `stories.json` & `svg-art.js`

### A. Single Character Limitation
* Over **70% of stories (107 of 152)** feature 2 or more characters interacting (e.g., *The Lion and the Mouse*, *The Tortoise and the Hare*, *The Fox and the Stork*, *The Monkey and the Coconut*).
* `svg-art.js` only draws a single character (`story.animal`). The secondary character listed in `story.character` is completely ignored and never rendered.

### B. Blind Arithmetic Character Positioning
* Currently, character coordinates follow a static modulo formula:
  `xOffset = 50 + ((panelIndex * 40) % 180)`
  `yOffset = 130 + (panelIndex % 2 === 0 ? 10 : 22)`
* Characters shift arbitrarily between 4 fixed points (`50, 90, 130, 170`) regardless of the story action.
* Sleeping characters stand upright; perched birds stay on the ground; characters never face each other in dialogue.

### C. Missing Character Avatars (76 of 95 Characters Default to Rodent)
* Only 19 animal avatars are defined in `ANIMAL_AVATARS`.
* The remaining 76 character types fall back to `default_animal` (a brown generic rodent):
  * **Animals:** Elephant, Stork, Crane, Heron, Sheep, Lamb, Ox, Bull, Cow, Boar, Pig, Snake, Stag, Peacock, Owl, Ant, Bee, Grasshopper, Camel, Bat, Dolphin, Mole, Swan, Goose, Dove, Swallow.
  * **Humans:** Farmer, Boy, Shepherd, Milkmaid, Woodman, Father, Sons, Miser, Astrologer, Traveler.
  * **Allegorical/Nature:** Sun, North Wind, Oak Tree, Reeds, Brass/Clay Pots.

### D. Uniform Scaling
* All characters share the same `scale(0.85)` or `scale(0.9)`. An elephant, lion, hare, mouse, and ant all share roughly the same physical size.

### E. Mislabeled Stories in `stories.json`
* `the_rat_and_the_elephant`: Mislabeled as `animal: "dog"` with characters `['dog', 'cat', 'elephant']`.
* `the_vain_jackdaw_and_his_borrowed_feathers`: Mislabeled as `animal: "fly"`.
* `the_heron`: Mislabeled as `animal: "fish"`.
* `the_owl_and_the_grasshopper`: Mislabeled as `animal: "mice"`.
* `the_monkey_and_the_cat`: Mislabeled as `animal: "mice"`.
* `the_bees_and_wasps_and_the_hornet`: Mislabeled as `animal: "ant"`.
* `the_gnat_and_the_bull`: Mislabeled as `animal: "fly"`.
* `the_serpent_and_the_eagle`: Missing `"serpent"` in `character`.
* `the_eagle_and_the_beetle`: Missing `"beetle"` in `character`.
* `the_swallow_and_the_crow`: Missing `"swallow"` in `character`.
* 14 human/allegorical fables marked with `animal: "unknown"`.

---

## 2. Detailed Technical Plan

### Plan 1: Metadata Cleanup in `stories.json`
1. Fix all mislabeled animals and character lists identified above.
2. Replace `animal: "unknown"` in the 14 human/allegorical stories with distinct protagonist keys (`boy`, `father`, `farmer`, `woodman`, `sun`, `oak`, `pots`, `miser`) to eliminate the "Animal: unknown" label in the UI.

### Plan 2: Character Library Expansion in `svg-art.js`
Expand the vector avatar library to cover all 95 storybook characters:
* **Large Animals:** Elephant (tusks, curved trunk), Ox/Bull (horns, hooves), Camel (hump, desert legs), Stag/Deer (antlers), Horse/Mule.
* **Birds:** Crane/Stork/Heron (long legs, slender bill), Peacock (iridescent fan feathers), Owl (large forward-facing eyes, tufts), Swan/Goose (graceful neck), Dove/Swallow (spread wings), Jackdaw/Raven.
* **Forest & Farm:** Sheep/Lamb (fluffy curly fleece), Pig/Boar (snout, curled tail), Mole (digging claws), Snake (undulating coils, tongue), Bat (webbed wings), Dolphin (curved leaping body with water splash).
* **Insects:** Ant, Bee, Grasshopper (long leaping hind legs), Spider, Beetle/Fly.
* **Humans:** Boy/Child, Farmer/Shepherd/Woodman, Mother/Milkmaid, Miser, Astrologer.
* **Nature & Elements:** Sun (smiling radiant face), North Wind (gusting cloud face), Oak Tree, Bending Reeds, Floating Brass & Clay Pots.

### Plan 3: Multi-Character Stage Orchestration & Natural Scaling
* Detect both **Character 1** (protagonist) and **Character 2** (secondary actor/companion) for the active sentence.
* **Positioning & Facing:**
  * Character 1 on the Left ($x \approx 80$), facing right.
  * Character 2 on the Right ($x \approx 280$), facing left (`transform="scale(-1, 1)"`).
  * In dialogue or confrontation scenes, characters face each other.
* **Natural Size Scaling:**
  * Tiny (Ant, Bee, Fly, Frog, Crab, Mouse): `scale(0.55 - 0.65)`
  * Medium (Hare, Fox, Dog, Cat, Monkey, Rooster, Crow): `scale(0.85 - 0.95)`
  * Large (Lion, Tiger, Wolf, Sheep, Goat, Donkey, Stag, Human adult): `scale(1.05 - 1.15)`
  * Giant (Elephant, Ox/Bull, Camel): `scale(1.35 - 1.45)`

### Plan 4: Sentence-Aware Dynamic Action & Scene Solver
Instead of blind arithmetic modulo loops, dynamically inspect sentence keywords:
1. **Sleeping/Resting:** Detect keywords (*sleeping, asleep, rest, nap*) $\to$ display floating animated `zZz` sleep bubbles above the character.
2. **Trapped/Net:** Detect keywords (*net, trap, caught, ropes*) $\to$ position Hunter's Net directly draped over the trapped animal, with chewed fibers when the helper arrives.
3. **Perched/Flying:** Detect keywords (*tree, branch, flew, flying, sky, perched*) $\to$ place birds up on tree branches or in the sky rather than on the grass.
4. **Interactive Props Positioning:**
   * *Crow and Water Pot:* Crow moves from courtyard to perched on the pot rim, dropping pebbles, watching water rise, drinking.
   * *Fox and Grapes:* High grape trellis; Fox leaps upwards on the jump sentence, sits panting on the ground, walks away left.
   * *Dog and Reflection:* Dog on center wooden footbridge, water ripples and inverted reflection below.
   * *Fox and Stork:* Flat plate with Fox lapping; tall narrow vase with Stork drinking.

### Plan 5: Hand-Drawn Children's Book Visual Enhancement with Rough.js
* Integrate **Rough.js** to give SVGs organic, hand-drawn sketch lines and watercolor-like hatching/fills for a warm, storybook visual aesthetic.
* Run on a dedicated feature branch for validation and side-by-side comparison.

---

## 3. Verification & Validation
1. Verify static site build via `scripts/build_docs.py`.
2. Run `test_stories.py` to ensure all 152 stories pass validations.
3. Serve on local port to test visual rendering, animation, and TTS coordination across devices.
