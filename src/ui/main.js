/**
 * main.js
 * Rich interactive controller for the Kids Storybook application.
 * Fully compatible with GitHub Pages static hosting.
 */

(function () {
  // Relative URL that works on both localhost and GitHub Pages (e.g. /kids-stories/)
  const POSSIBLE_PATHS = ['./data/stories.json', '../data/stories.json', 'data/stories.json'];

  const STORAGE_KEY_FAVS = 'kids_storybook_favorites';

  let stories = [];
  let currentStory = null;
  let currentSentenceIndex = 0;
  let autoAdvance = true;
  let autoAdvanceTimeout = null;
  let isSpeaking = false;
  let favorites = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_FAVS) || '[]'));

  // Filtering state
  let searchQuery = '';
  let activeTheme = 'All';
  let activeLength = 'All';
  let showFavoritesOnly = false;

  // DOM Elements cache
  const appContainer = document.getElementById('app');

  // Global TTS error handling to prevent state desync
  if (window.TTS) {
    TTS.onError = () => {
      isSpeaking = false;
      updateSpeakingStateUI(false);
    };
  }

  // Load dataset
  async function fetchStories() {
    for (const p of POSSIBLE_PATHS) {
      try {
        const res = await fetch(p);
        if (res.ok) {
          stories = await res.json();
          console.log(`Loaded ${stories.length} stories from ${p}`);
          return;
        }
      } catch (e) {
        // try next path
      }
    }
    console.error('Could not load stories.json from any known path.');
  }

  function toggleFavorite(id, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const isNowFav = !favorites.has(id);
    if (isNowFav) {
      favorites.add(id);
    } else {
      favorites.delete(id);
    }
    localStorage.setItem(STORAGE_KEY_FAVS, JSON.stringify(Array.from(favorites)));

    // In reader mode: update navbar heart button
    if (currentStory) {
      renderReaderHeaderFav();
      return;
    }

    // In list mode with "Favorites Only" active: re-render to update the filtered list
    if (showFavoritesOnly) {
      renderList();
      return;
    }

    // Smooth inline update without scroll jump or full list re-render
    if (event && event.currentTarget) {
      event.currentTarget.innerHTML = isNowFav ? '❤️' : '🤍';
    }
    document.querySelectorAll(`.fav-btn[data-id="${id}"]`).forEach((btn) => {
      btn.innerHTML = isNowFav ? '❤️' : '🤍';
    });
  }

  function renderReaderHeaderFav() {
    const btn = document.getElementById('readerFavBtn');
    if (btn && currentStory) {
      const isFav = favorites.has(currentStory.id);
      btn.innerHTML = isFav ? '❤️' : '🤍';
    }
  }

  function getFilteredStories() {
    return stories.filter((s) => {
      // Theme filter
      if (activeTheme !== 'All') {
        const t = s.theme || 'Animals';
        if (activeTheme === 'Animals' && t !== 'Animals') return false;
        if (activeTheme === 'Life Lessons' && t !== 'Life Lessons') return false;
        if (activeTheme === 'Family' && t !== 'Family') return false;
        if (activeTheme === 'Nature' && t !== 'Nature') return false;
        if (activeTheme === 'Mythology' && t !== 'Mythology') return false;
      }

      // Length filter
      if (activeLength !== 'All' && s.length !== activeLength) {
        return false;
      }

      // Favorites filter
      if (showFavoritesOnly && !favorites.has(s.id)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (s.title || '').toLowerCase().includes(q);
        const inMoral = (s.moral || '').toLowerCase().includes(q);
        const inAnimal = (s.animal || '').toLowerCase().includes(q);
        const inTags = (s.tags || []).some((t) => t.toLowerCase().includes(q));
        const inText = (s.text || []).some((line) => line.toLowerCase().includes(q));
        if (!inTitle && !inMoral && !inAnimal && !inTags && !inText) return false;
      }

      return true;
    });
  }

  function renderList() {
    currentStory = null;
    TTS.stop();
    resetCatalogSEO();

    const filtered = getFilteredStories();

    const themeCounts = {
      All: stories.length,
      Animals: stories.filter((s) => s.theme === 'Animals').length,
      'Life Lessons': stories.filter((s) => s.theme === 'Life Lessons').length,
      Family: stories.filter((s) => s.theme === 'Family').length,
      Nature: stories.filter((s) => s.theme === 'Nature').length,
      Mythology: stories.filter((s) => s.theme === 'Mythology').length,
    };

    appContainer.innerHTML = `
      <div class="site-header">
        <a class="logo-group" href="#">
          <span class="logo-icon">📚</span>
          <div class="logo-text">
            <h1>Magic Kids Storybook</h1>
            <p>150+ Illustrated Tales with Voice Narration</p>
          </div>
        </a>
        <div class="header-actions">
          <button class="btn-pill" id="surpriseBtn">🎲 Surprise Me!</button>
          <button class="btn-pill ${showFavoritesOnly ? 'primary' : ''}" id="favFilterBtn">
            ${showFavoritesOnly ? '❤️ Favorites Only' : '🤍 Favorites (' + favorites.size + ')'}
          </button>
        </div>
      </div>

      <!-- Hero Banner -->
      <div class="hero-card">
        <div class="hero-content">
          <span class="hero-tag">🌟 Read, Listen & Learn</span>
          <h2 class="hero-title">Fun Stories with Sweet Lessons for Little Minds</h2>
          <p class="hero-desc">
            Explore beautiful fables rewritten in simple, kid-friendly English. Tap any story to listen with speech narration and animated comic panels!
          </p>
          <button class="btn-pill primary" id="heroStartBtn">Start Exploring Tales ✨</button>
        </div>
        <div class="hero-illustration">🦁📖✨</div>
      </div>

      <!-- Search & Filters -->
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            id="searchInput"
            placeholder="Search by animal (tiger, crow...), title, or moral lesson..."
            value="${searchQuery}"
          />
        </div>

        <div class="filter-pills-row">
          <span class="filter-label">Themes:</span>
          ${['All', 'Animals', 'Life Lessons', 'Family', 'Nature', 'Mythology']
            .map(
              (theme) => `
            <button class="chip ${activeTheme === theme ? 'active' : ''}" data-theme="${theme}">
              ${getThemeEmoji(theme)} ${theme} (${themeCounts[theme] || 0})
            </button>
          `
            )
            .join('')}
        </div>

        <div class="filter-pills-row">
          <span class="filter-label">Length:</span>
          ${[
            { key: 'All', label: 'All Lengths' },
            { key: 'short', label: '⚡ Short (≤7 sentences)' },
            { key: 'medium', label: '📖 Medium (8–14 sentences)' },
            { key: 'long', label: '🌟 Long (15+ sentences)' },
          ]
            .map(
              (l) => `
            <button class="chip ${activeLength === l.key ? 'active' : ''}" data-length="${l.key}">
              ${l.label}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Results Header -->
      <div class="results-header">
        <div class="results-count">
          Showing <strong>${filtered.length}</strong> of ${stories.length} stories
          ${activeTheme !== 'All' ? `• Theme: ${activeTheme}` : ''}
          ${activeLength !== 'All' ? `• Length: ${activeLength}` : ''}
          ${showFavoritesOnly ? `• Favorites only` : ''}
        </div>
      </div>

      <!-- Stories Grid -->
      <div class="story-grid">
        ${
          filtered.length === 0
            ? `
          <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: white; border-radius: var(--radius-lg);">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔍🐾</div>
            <h3>No stories found</h3>
            <p style="color: var(--text-muted); margin-top: 0.5rem;">Try adjusting your search words or clearing filters.</p>
            <button class="btn-pill primary" style="margin-top: 1rem;" id="resetFiltersBtn">Reset All Filters</button>
          </div>
        `
            : filtered
                .map((s) => {
                  const themeCls = 'theme-' + (s.theme || 'Animals').replace(/\s+/g, '');
                  const isFav = favorites.has(s.id);
                  const firstSentence = (s.text && s.text[0]) || '';
                  const totalSentences = (s.text && s.text.length) || 0;
                  const thumbSvg = SvgArt.generateThumbnailSvg(s);

                  return `
            <div class="story-card" onclick="location.hash='#story=${encodeURIComponent(s.id)}'">
              <div>
                <!-- Image Thumbnail of the Animal -->
                <div class="card-thumbnail-wrapper">
                  ${thumbSvg}
                  <div class="thumb-overlay-top">
                    <span class="theme-badge ${themeCls}">${getThemeEmoji(s.theme)} ${s.theme || 'Animals'}</span>
                    <button class="fav-btn" data-id="${s.id}" title="Save Favorite" onclick="window.StoryApp.toggleFav('${s.id}', event)">
                      ${isFav ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <span class="card-animal-tag">🐾 ${s.animal || 'Fable'}</span>
                </div>

                <h3 class="story-title">${s.title}</h3>
                <p class="story-preview">${firstSentence}</p>
                <div class="story-moral-chip">
                  💡 <strong>Moral:</strong> ${s.moral}
                </div>
              </div>

              <div class="card-bottom">
                <span class="length-badge">
                  ${getLengthIcon(s.length)} ${totalSentences} sentences
                </span>
                <span class="read-action">
                  Read & Listen →
                </span>
              </div>
            </div>
          `;
                })
                .join('')
        }
      </div>

      <footer class="site-footer">
        <p>✨ Magic Kids Storybook • Crafted with ❤️ for Curious Young Readers</p>
        <p style="margin-top: 0.25rem; font-size: 0.8rem; opacity: 0.8;">Speech powered by Web Speech API • Works offline</p>
      </footer>
    `;

    attachListEvents();
  }

  function getThemeEmoji(theme) {
    switch (theme) {
      case 'Animals':
        return '🦁';
      case 'Life Lessons':
        return '💡';
      case 'Family':
        return '👨‍👩‍👧‍👦';
      case 'Nature':
        return '🌿';
      case 'Mythology':
        return '⚡';
      default:
        return '📖';
    }
  }

  function getLengthIcon(len) {
    if (len === 'short') return '⚡';
    if (len === 'medium') return '📖';
    return '🌟';
  }

  function attachListEvents() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderList();
        // keep focus in input
        const newInp = document.getElementById('searchInput');
        if (newInp) {
          newInp.focus();
          newInp.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    // Theme filter chips
    document.querySelectorAll('.chip[data-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTheme = btn.getAttribute('data-theme');
        renderList();
      });
    });

    // Length filter chips
    document.querySelectorAll('.chip[data-length]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeLength = btn.getAttribute('data-length');
        renderList();
      });
    });

    // Surprise me button
    const surpriseBtn = document.getElementById('surpriseBtn');
    if (surpriseBtn) {
      surpriseBtn.addEventListener('click', () => {
        if (stories.length === 0) return;
        const rand = stories[Math.floor(Math.random() * stories.length)];
        location.hash = `#story=${encodeURIComponent(rand.id)}`;
      });
    }

    // Favorites toggle button
    const favFilterBtn = document.getElementById('favFilterBtn');
    if (favFilterBtn) {
      favFilterBtn.addEventListener('click', () => {
        showFavoritesOnly = !showFavoritesOnly;
        renderList();
      });
    }

    const heroStartBtn = document.getElementById('heroStartBtn');
    if (heroStartBtn) {
      heroStartBtn.addEventListener('click', () => {
        const filterBar = document.querySelector('.filter-bar');
        if (filterBar) filterBar.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchQuery = '';
        activeTheme = 'All';
        activeLength = 'All';
        showFavoritesOnly = false;
        renderList();
      });
    }
  }

  // ==========================================================
  // STORY READER VIEW
  // ==========================================================

  function updateStorySEO(story) {
    if (!story) return;
    document.title = `${story.title} — Aesop's Fables for Kids | Magic Storybook`;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Read & listen to the classic fable "${story.title}". Moral: ${story.moral}. Featuring colorful illustrations and voice narration for kids.`
      );
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${story.title} — Illustrated Fable for Kids`);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', `Moral: ${story.moral}. Read and listen with voice narration.`);

    // Inject / update Schema.org JSON-LD for this story
    let storyScript = document.getElementById('story-jsonld');
    if (!storyScript) {
      storyScript = document.createElement('script');
      storyScript.type = 'application/ld+json';
      storyScript.id = 'story-jsonld';
      document.head.appendChild(storyScript);
    }
    storyScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ShortStory',
      name: story.title,
      description: `A classic fable teaching: ${story.moral}`,
      genre: ["Children's Literature", 'Fable', story.theme || 'Animals'],
      teaches: story.moral,
      inLanguage: 'en',
      character: story.character || [story.animal],
      author: {
        '@type': 'Person',
        name: 'Aesop',
      },
    });
  }

  function resetCatalogSEO() {
    document.title = "Aesop's Fables for Kids — 150+ Illustrated Stories with Audio Narration | Magic Storybook";

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        "Explore 150+ interactive, illustrated Aesop's fables and moral tales for children aged 4-10. Features word-by-sentence text-to-speech voice narration, reading speed controls, and colorful animal animations."
      );
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', "Aesop's Fables for Kids — 150+ Illustrated Stories with Audio Narration");

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', "150+ classic illustrated fables with sentence-by-sentence audio narration, morals, and speed control for kids.");

    const storyScript = document.getElementById('story-jsonld');
    if (storyScript) {
      storyScript.remove();
    }
  }

  function renderReader(storyId) {
    const story = stories.find((s) => s.id === storyId);
    if (!story) {
      appContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <h2>Story not found!</h2>
          <p style="margin: 1rem 0;">We couldn't find the requested fable.</p>
          <a class="btn-pill primary" href="#">← Back to Story List</a>
        </div>
      `;
      return;
    }

    currentStory = story;
    currentSentenceIndex = 0;
    isSpeaking = false;
    TTS.stop();
    updateStorySEO(story);

    renderReaderUI();
  }

  function renderReaderUI() {
    const story = currentStory;
    const totalSentences = story.text.length;
    const isCompleted = currentSentenceIndex >= totalSentences;
    const isFav = favorites.has(story.id);

    // If completed all sentences, show Moral Celebration Screen
    if (isCompleted) {
      renderMoralScreen();
      return;
    }

    const currentSentence = story.text[currentSentenceIndex];
    const progressPercent = Math.round(((currentSentenceIndex + 1) / totalSentences) * 100);

    // SVG panel illustration
    const panelSvg = SvgArt.generatePanelSvg(story, currentSentenceIndex);

    // Voices for selection
    const voices = TTS.getVoices();
    const currentRate = TTS.getRate();

    appContainer.innerHTML = `
      <div class="reader-wrapper">
        <div class="reader-navbar">
          <a class="btn-pill" href="#">← Library</a>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="btn-pill" id="readerFavBtn" onclick="window.StoryApp.toggleFav('${story.id}', event)">
              ${isFav ? '❤️' : '🤍'}
            </button>
            <span class="theme-badge theme-${(story.theme || 'Animals').replace(/\s+/g, '')}">
              ${getThemeEmoji(story.theme)} ${story.theme || 'Animals'}
            </span>
          </div>
        </div>

        <div class="reader-card">
          <!-- Story Header -->
          <div class="reader-header">
            <div class="reader-title-area">
              <h2>${story.title}</h2>
              <p style="font-size: 0.85rem; color: var(--text-muted);">
                Animal: <strong>${story.animal}</strong> • Characters: ${story.character.join(', ')}
              </p>
            </div>
          </div>

          <!-- Animated Comic Panel SVG -->
          <div class="reader-stage">
            ${panelSvg}
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar-container">
            <div class="progress-bar-fill" id="progressBarFill" style="width: ${progressPercent}%;"></div>
          </div>

          <!-- Full Story Text Area with Sentence Highlighting -->
          <div class="story-reader-text-container">
            <div class="narration-counter-row">
              <span class="narration-counter" id="sentenceCounter">
                Reading Sentence ${currentSentenceIndex + 1} of ${totalSentences}
              </span>
              <span class="click-hint">💡 Tap any sentence to listen</span>
            </div>
            <div class="story-full-paragraphs" id="fullStoryParagraphs">
              ${story.text
                .map(
                  (sentence, idx) => `
                <span
                  class="story-read-sentence ${idx === currentSentenceIndex ? 'active-reading' : ''}"
                  id="storySent_${idx}"
                  data-index="${idx}"
                >${sentence} </span>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Audio & Playback Controls -->
          <div class="reader-controls-bar">
            <div class="controls-row-top">
              <!-- Speed Slider -->
              <div class="speed-control-group">
                <span>⚡ Speed:</span>
                <input
                  type="range"
                  class="speed-slider"
                  id="ttsSpeedSlider"
                  min="0.5"
                  max="1.8"
                  step="0.1"
                  value="${currentRate}"
                />
                <span class="speed-value-badge" id="speedDisplay">${currentRate.toFixed(1)}×</span>
              </div>

              <!-- Voice Selector (if multiple available) -->
              ${
                voices.length > 1
                  ? `
                <div class="voice-select-group">
                  <select id="voiceSelect" title="Select Voice">
                    ${voices
                      .filter((v) => v.lang && v.lang.startsWith('en'))
                      .map(
                        (v) => `
                      <option value="${v.voiceURI}" ${v === TTS.getBestDefaultVoice() ? 'selected' : ''}>
                        ${v.name} (${v.lang})
                      </option>
                    `
                      )
                      .join('')}
                  </select>
                </div>
              `
                  : ''
              }

              <!-- Auto-read toggle -->
              <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                <input type="checkbox" id="autoAdvanceToggle" ${autoAdvance ? 'checked' : ''} />
                <span>Auto-Advance</span>
              </label>
            </div>

            <!-- Primary Playback Buttons -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
              <button class="circle-btn" id="prevSentenceBtn" title="Previous Sentence" ${currentSentenceIndex === 0 ? 'disabled' : ''}>
                ⏮️
              </button>

              <div class="playback-buttons">
                <button class="circle-btn play-btn" id="playTtsBtn" title="Listen to Sentence">
                  ${isSpeaking ? '⏸️' : '🔊'}
                </button>
                <button class="circle-btn" id="repeatSentenceBtn" title="Replay Sentence">
                  🔄
                </button>
              </div>

              <button class="circle-btn" id="nextSentenceBtn" title="Next Sentence">
                ⏭️
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    attachReaderEvents();
  }

  function updateSentenceHighlight(index, speaking) {
    if (!currentStory) return;
    document.querySelectorAll('.story-read-sentence').forEach((el, i) => {
      if (i === index) {
        el.classList.add('active-reading');
        if (speaking) el.classList.add('speaking');
        else el.classList.remove('speaking');
      } else {
        el.classList.remove('active-reading', 'speaking');
      }
    });

    const activeEl = document.getElementById(`storySent_${index}`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Update progress bar
    const progressFill = document.getElementById('progressBarFill');
    if (progressFill) {
      const pct = Math.round(((index + 1) / currentStory.text.length) * 100);
      progressFill.style.width = `${pct}%`;
    }

    // Update counter
    const counter = document.getElementById('sentenceCounter');
    if (counter) {
      counter.innerText = `Reading Sentence ${index + 1} of ${currentStory.text.length}`;
    }

    // Update SVG stage panel
    const stage = document.querySelector('.reader-stage');
    if (stage) {
      stage.innerHTML = SvgArt.generatePanelSvg(currentStory, index);
    }

    // Update prev / next button disabled states
    const prevBtn = document.getElementById('prevSentenceBtn');
    if (prevBtn) prevBtn.disabled = index === 0;
  }

  function speakCurrentSentence() {
    if (autoAdvanceTimeout) {
      clearTimeout(autoAdvanceTimeout);
      autoAdvanceTimeout = null;
    }
    if (!currentStory) return;
    const sentence = currentStory.text[currentSentenceIndex];
    if (!sentence) return;

    isSpeaking = true;
    updateSpeakingStateUI(true);

    TTS.speak(sentence, () => {
      isSpeaking = false;
      updateSpeakingStateUI(false);

      if (autoAdvance && currentStory) {
        // Auto-advance to next sentence with a small natural pause
        autoAdvanceTimeout = setTimeout(() => {
          if (currentStory && autoAdvance && !isSpeaking) {
            nextSentence();
          }
        }, 700);
      }
    });
  }

  function updateSpeakingStateUI(speaking) {
    const playBtn = document.getElementById('playTtsBtn');
    if (playBtn) playBtn.innerHTML = speaking ? '⏸️' : '🔊';

    const activeSentenceEl = document.getElementById(`storySent_${currentSentenceIndex}`);
    if (activeSentenceEl) {
      if (speaking) {
        activeSentenceEl.classList.add('speaking');
      } else {
        activeSentenceEl.classList.remove('speaking');
      }
    }
  }

  function nextSentence() {
    if (autoAdvanceTimeout) {
      clearTimeout(autoAdvanceTimeout);
      autoAdvanceTimeout = null;
    }
    TTS.stop();
    if (!currentStory) return;
    if (currentSentenceIndex < currentStory.text.length - 1) {
      currentSentenceIndex++;
      updateSentenceHighlight(currentSentenceIndex, false);
      speakCurrentSentence();
    } else {
      currentSentenceIndex = currentStory.text.length;
      renderMoralScreen();
    }
  }

  function prevSentence() {
    if (autoAdvanceTimeout) {
      clearTimeout(autoAdvanceTimeout);
      autoAdvanceTimeout = null;
    }
    TTS.stop();
    if (currentSentenceIndex > 0) {
      currentSentenceIndex--;
      updateSentenceHighlight(currentSentenceIndex, false);
      speakCurrentSentence();
    }
  }

  function attachReaderEvents() {
    // Tap on any sentence to jump directly there and resume continuous reading
    document.querySelectorAll('.story-read-sentence').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        if (!isNaN(idx) && idx >= 0 && idx < currentStory.text.length) {
          if (autoAdvanceTimeout) {
            clearTimeout(autoAdvanceTimeout);
            autoAdvanceTimeout = null;
          }
          TTS.stop();
          currentSentenceIndex = idx;

          // Resume reading continuously from this sentence
          autoAdvance = true;
          const autoToggle = document.getElementById('autoAdvanceToggle');
          if (autoToggle) autoToggle.checked = true;

          updateSentenceHighlight(currentSentenceIndex, false);
          speakCurrentSentence();
        }
      });
    });

    const playBtn = document.getElementById('playTtsBtn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (isSpeaking) {
          if (autoAdvanceTimeout) {
            clearTimeout(autoAdvanceTimeout);
            autoAdvanceTimeout = null;
          }
          TTS.stop();
          isSpeaking = false;
          updateSpeakingStateUI(false);
        } else {
          autoAdvance = true;
          const autoToggle = document.getElementById('autoAdvanceToggle');
          if (autoToggle) autoToggle.checked = true;
          speakCurrentSentence();
        }
      });
    }

    const repeatBtn = document.getElementById('repeatSentenceBtn');
    if (repeatBtn) {
      repeatBtn.addEventListener('click', () => {
        if (autoAdvanceTimeout) {
          clearTimeout(autoAdvanceTimeout);
          autoAdvanceTimeout = null;
        }
        TTS.stop();
        speakCurrentSentence();
      });
    }

    const nextBtn = document.getElementById('nextSentenceBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSentence();
      });
    }

    const prevBtn = document.getElementById('prevSentenceBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSentence();
      });
    }

    const speedSlider = document.getElementById('ttsSpeedSlider');
    const speedDisplay = document.getElementById('speedDisplay');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        TTS.setRate(val);
        if (speedDisplay) speedDisplay.innerText = val.toFixed(1) + '×';
      });
    }

    const voiceSelect = document.getElementById('voiceSelect');
    if (voiceSelect) {
      voiceSelect.addEventListener('change', (e) => {
        TTS.setVoice(e.target.value);
      });
    }

    const autoToggle = document.getElementById('autoAdvanceToggle');
    if (autoToggle) {
      autoToggle.addEventListener('change', (e) => {
        autoAdvance = e.target.checked;
      });
    }
  }

  // ==========================================================
  // MORAL CELEBRATION SCREEN
  // ==========================================================

  function renderMoralScreen() {
    const story = currentStory;
    TTS.stop();

    // Trigger celebratory confetti
    triggerConfetti();

    // Read out the moral
    TTS.speak(`In the end, the story reminds us: ${story.moral}`);

    // Generate story thumbnail as the background illustration
    const thumbSvg = SvgArt.generateThumbnailSvg(story);

    // Find next story in order
    const currentIndex = stories.findIndex((s) => s.id === story.id);
    const nextStory = currentIndex >= 0 && currentIndex < stories.length - 1 ? stories[currentIndex + 1] : stories[0];

    appContainer.innerHTML = `
      <canvas id="confettiCanvas"></canvas>
      <div class="reader-wrapper">
        <div class="reader-navbar">
          <a class="btn-pill" href="#">← Library</a>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="theme-badge theme-${(story.theme || 'Animals').replace(/\s+/g, '')}">
              ${getThemeEmoji(story.theme)} ${story.theme || 'Animals'}
            </span>
            <span class="card-animal-tag" style="position: static; background: #334155;">🐾 ${story.animal}</span>
          </div>
        </div>

        <!-- Completed Story Container with Story Thumbnail as Background -->
        <div class="completed-story-container">
          <!-- Background Animal Thumbnail Illustration -->
          <div class="completed-story-backdrop">
            ${thumbSvg}
          </div>

          <!-- Full Story & Moral Content Overlay -->
          <div class="completed-story-content">
            <div class="full-story-header">
              <div class="trophy-icon">🏆✨</div>
              <h2 class="celebration-title">Story Completed!</h2>
              <div class="full-story-pill-row">
                <span style="font-size: 0.9rem; font-weight: 700; color: #475569;">
                  ${story.text.length} sentences • Animal: <strong>${story.animal}</strong>
                </span>
              </div>
              <h1 class="full-story-title">${story.title}</h1>
            </div>

            <!-- Full Story Text Shown at Once -->
            <div class="full-story-body">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px dashed #cbd5e1; padding-bottom: 0.75rem;">
                <span style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--primary);">
                  📖 Complete Story
                </span>
                <button class="btn-pill" id="readFullAloudBtn" style="padding: 0.35rem 0.85rem; min-height: 34px; font-size: 0.8rem;">
                  🔊 Listen to Full Story
                </button>
              </div>
              ${story.text.map((sentence, idx) => `<span class="full-story-sentence" id="fullStorySent_${idx}">${sentence}</span>`).join('')}
            </div>

            <!-- Moral of the Story Card -->
            <div class="celebration-moral-box">
              <div class="moral-label">🌟 The Moral of the Story</div>
              <div class="moral-quote">"${story.moral}"</div>
            </div>

            <!-- Actions -->
            <div class="celebration-actions">
              <button class="btn-pill" id="replayStoryBtn">
                🔄 Read Panel-by-Panel Again
              </button>
              <a class="btn-pill primary" href="#story=${encodeURIComponent(nextStory.id)}">
                Next Story: ${nextStory.title} ➡️
              </a>
              <a class="btn-pill" href="#">
                📚 Back to Library
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    const replayBtn = document.getElementById('replayStoryBtn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        currentSentenceIndex = 0;
        renderReaderUI();
      });
    }

    const readFullBtn = document.getElementById('readFullAloudBtn');
    if (readFullBtn) {
      let fullStorySpeaking = false;
      readFullBtn.addEventListener('click', () => {
        if (fullStorySpeaking) {
          TTS.stop();
          fullStorySpeaking = false;
          readFullBtn.innerHTML = '🔊 Listen to Full Story';
        } else {
          fullStorySpeaking = true;
          readFullBtn.innerHTML = '⏸️ Stop Narration';
          const fullText = story.text.join(' ') + ` In the end, the story reminds us: ${story.moral}`;
          TTS.speak(fullText, () => {
            fullStorySpeaking = false;
            if (readFullBtn) readFullBtn.innerHTML = '🔊 Listen to Full Story';
          });
        }
      });
    }
  }

  // ==========================================================
  // CONFETTI EFFECT
  // ==========================================================

  function triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas') || document.createElement('canvas');
    canvas.id = 'confettiCanvas';
    if (!canvas.parentNode) document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: canvas.width / 2,
        y: canvas.height / 2 - 50,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        alpha: 1,
      });
    }

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (let p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.rotationSpeed;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (frame < 100) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    }
    requestAnimationFrame(animate);
  }

  // ==========================================================
  // ROUTER
  // ==========================================================

  function router() {
    const hash = location.hash;
    if (!hash || hash === '#' || hash === '#/') {
      renderList();
      return;
    }
    const match = hash.match(/#story=([^&]+)/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      renderReader(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    renderList();
  }

  // Global namespace for inline event hooks
  window.StoryApp = {
    toggleFav: toggleFavorite,
  };

  window.addEventListener('hashchange', router);

  document.addEventListener('DOMContentLoaded', () => {
    fetchStories().then(router);
  });
})();
