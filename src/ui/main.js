/**
 * main.js
 * Rich interactive controller for the Kids Storybook application.
 * Fully compatible with GitHub Pages static hosting.
 */

(function () {
  function getPossibleStoryPaths() {
    const base = getAppBasePath();
    return [
      `${base}data/stories.json`,
      './data/stories.json',
      '../data/stories.json',
      'data/stories.json',
    ];
  }

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

  // Routing & Path resolution helpers for clean URLs (/story/:storyId)
  function getAppBasePath() {
    const pathname = window.location.pathname;
    const storyIdx = pathname.indexOf('/story/');
    if (storyIdx !== -1) {
      return pathname.substring(0, storyIdx + 1);
    }
    if (pathname.endsWith('/index.html')) {
      return pathname.substring(0, pathname.length - 10);
    }
    return pathname.endsWith('/') ? pathname : pathname + '/';
  }

  function getStoryUrl(storyId) {
    const base = getAppBasePath();
    return `${base}story/${encodeURIComponent(storyId)}`;
  }

  function getLibraryUrl() {
    return getAppBasePath();
  }

  function navigateToStory(storyId, replace = false) {
    const url = getStoryUrl(storyId);
    if (replace) {
      history.replaceState({ storyId }, '', url);
    } else {
      history.pushState({ storyId }, '', url);
    }
    renderReader(storyId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateToLibrary(replace = false) {
    const url = getLibraryUrl();
    if (replace) {
      history.replaceState({}, '', url);
    } else {
      history.pushState({}, '', url);
    }
    renderList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Animal display formatting
  function formatAnimalLabel(animal) {
    if (!animal || animal === 'None' || animal === 'none') return 'None';
    return animal.charAt(0).toUpperCase() + animal.slice(1);
  }

  function formatAnimalBadge(animal) {
    if (!animal || animal === 'None' || animal === 'none') return '📖 Fable';
    return `🐾 ${animal.charAt(0).toUpperCase() + animal.slice(1)}`;
  }

  // Safe HTML escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Pre-split sentence into words with character indices for real-time karaoke tracking
  function renderSentenceWithWords(sentence, sentenceIdx) {
    if (!sentence) return '';
    const regex = /\S+/g;
    let html = '';
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(sentence)) !== null) {
      if (match.index > lastIndex) {
        html += escapeHtml(sentence.substring(lastIndex, match.index));
      }
      const word = match[0];
      const start = match.index;
      const end = start + word.length;
      html += `<span class="story-word" data-sent-idx="${sentenceIdx}" data-start="${start}" data-end="${end}">${escapeHtml(word)}</span>`;
      lastIndex = match.index + word.length;
    }
    if (lastIndex < sentence.length) {
      html += escapeHtml(sentence.substring(lastIndex));
    }
    return html;
  }

  // Karaoke word boundary highlighter
  function highlightSpeakingWord(sentIdx, charIndex) {
    const sentenceEl = document.getElementById(`storySent_${sentIdx}`);
    if (!sentenceEl) return;

    const words = sentenceEl.querySelectorAll('.story-word');
    if (!words || words.length === 0) return;

    let activeWord = null;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const start = parseInt(w.getAttribute('data-start'), 10);
      const end = parseInt(w.getAttribute('data-end'), 10);
      if (charIndex >= start && charIndex < end) {
        activeWord = w;
        break;
      }
    }

    if (!activeWord) {
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const end = parseInt(w.getAttribute('data-end'), 10);
        if (charIndex <= end) {
          activeWord = w;
          break;
        }
      }
    }

    words.forEach((w) => {
      if (w === activeWord) {
        w.classList.add('word-speaking');
      } else {
        w.classList.remove('word-speaking');
      }
    });
  }

  function clearSpeakingWords() {
    document.querySelectorAll('.story-word.word-speaking').forEach((w) => {
      w.classList.remove('word-speaking');
    });
  }

  function updateVoiceSelectOptions() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect || !window.TTS) return;

    const rankedVoices = TTS.getRankedVoices();
    if (rankedVoices.length === 0) return;

    const bestVoice = TTS.getBestDefaultVoice();
    const currentVal = voiceSelect.value || (bestVoice ? bestVoice.voiceURI : '');

    voiceSelect.innerHTML = rankedVoices
      .map(
        (v) => `
      <option value="${v.voiceURI}" ${v.voiceURI === currentVal ? 'selected' : ''}>
        ${TTS.formatVoiceLabel(v)}
      </option>
    `
      )
      .join('');
  }

  // Global TTS lifecycle and boundary handling
  if (window.TTS) {
    TTS.onError = () => {
      isSpeaking = false;
      clearSpeakingWords();
      updateSpeakingStateUI(false);
    };

    TTS.onBoundary = (boundary) => {
      if (boundary.name === 'word') {
        highlightSpeakingWord(currentSentenceIndex, boundary.charIndex);
      }
    };

    TTS.onVoicesReady = () => {
      updateVoiceSelectOptions();
    };

    TTS.onManifestReady = () => {
      if (currentStory) {
        const badgeContainer = document.getElementById('narrationBadgeContainer');
        if (badgeContainer) {
          badgeContainer.innerHTML = TTS.hasStudioAudio(currentStory.id)
            ? `<span class="badge-studio-audio" title="High-fidelity pre-generated studio narration">🎙️ Studio Narration (HQ)</span>`
            : `<span class="badge-browser-audio" title="Browser-synthesized voice">🔊 Browser Voice</span>`;
        }
      }
    };
  }

  // Load dataset
  async function fetchStories() {
    const paths = getPossibleStoryPaths();
    for (const p of paths) {
      try {
        const res = await fetch(p);
        if (res.ok) {
          stories = await res.json();
          randomizedStories = shuffleArray(stories);
          console.log(`Loaded ${stories.length} stories from ${p} (randomized listing order)`);
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
    const source = randomizedStories && randomizedStories.length > 0 ? randomizedStories : stories;
    return source.filter((s) => {
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

  function renderPaginationControls(totalPages, currPage) {
    if (totalPages <= 1) return '';
    let buttonsHtml = '';

    buttonsHtml += `<button class="pagination-btn" data-page="${currPage - 1}" ${currPage <= 1 ? 'disabled' : ''}>« Prev</button>`;

    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= currPage - 2 && p <= currPage + 2)) {
        buttonsHtml += `<button class="pagination-btn ${p === currPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      } else if (p === currPage - 3 || p === currPage + 3) {
        buttonsHtml += `<span class="pagination-ellipsis">…</span>`;
      }
    }

    buttonsHtml += `<button class="pagination-btn" data-page="${currPage + 1}" ${currPage >= totalPages ? 'disabled' : ''}>Next »</button>`;

    return `<div class="pagination-container">${buttonsHtml}</div>`;
  }

  function renderList() {
    currentStory = null;
    TTS.stop();
    clearSpeakingWords();
    resetCatalogSEO();

    const filtered = getFilteredStories();
    const totalPages = Math.ceil(filtered.length / STORIES_PER_PAGE);
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
    }
    const startIndex = (currentPage - 1) * STORIES_PER_PAGE;
    const paginatedStories = filtered.slice(startIndex, startIndex + STORIES_PER_PAGE);

    appContainer.innerHTML = `
      <div class="site-header">
        <a class="logo-group" href="${getLibraryUrl()}" onclick="event.preventDefault(); window.StoryApp.goToLibrary()" title="TalePickle - Home">
          <span class="logo-icon">🥒📚</span>
          <div class="logo-text">
            <h1>TalePickle</h1>
            <p>Illustrated Fables with Voice Narration</p>
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
          <h2 class="hero-title">Fun Stories & Moral Tales for Curious Minds</h2>
          <p class="hero-desc">
            Explore timeless illustrated fables and bedtime stories brought to life. Tap any story to enjoy word-by-word read-aloud voice narration and delightful animations!
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
              ${getThemeEmoji(theme)} ${theme}
            </button>
          `
            )
            .join('')}
        </div>

        <div class="filter-pills-row">
          <span class="filter-label">Length:</span>
          ${[
            { key: 'All', label: 'All Lengths' },
            { key: 'short', label: '⚡ Short (≤7)' },
            { key: 'medium', label: '📖 Medium (8–14)' },
            { key: 'long', label: '🌟 Long (15+)' },
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
          <strong>Explore Stories</strong>
          ${activeTheme !== 'All' ? `• Theme: ${activeTheme}` : ''}
          ${activeLength !== 'All' ? `• Length: ${activeLength}` : ''}
          ${showFavoritesOnly ? `• Favorites only` : ''}
          ${searchQuery.trim() ? `• Matching "${escapeHtml(searchQuery)}"` : ''}
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
            : paginatedStories
                .map((s) => {
                  const themeCls = 'theme-' + (s.theme || 'Animals').replace(/\s+/g, '');
                  const isFav = favorites.has(s.id);
                  const firstSentence = (s.text && s.text[0]) || '';
                  const totalSentences = (s.text && s.text.length) || 0;
                  const thumbSvg = SvgArt.generateThumbnailSvg(s);
                  const isAnimalsTheme = !s.theme || s.theme === 'Animals';

                  return `
            <a class="story-card" href="${getStoryUrl(s.id)}" onclick="event.preventDefault(); window.StoryApp.goToStory('${encodeURIComponent(s.id)}')">
              <div>
                <!-- Image Thumbnail of the Animal -->
                <div class="card-thumbnail-wrapper">
                  ${thumbSvg}
                  <div class="thumb-overlay-top">
                    ${!isAnimalsTheme ? `<span class="theme-badge ${themeCls}">${getThemeEmoji(s.theme)} ${s.theme}</span>` : ''}
                    <button class="fav-btn" data-id="${s.id}" title="Save Favorite" onclick="window.StoryApp.toggleFav('${s.id}', event)">
                      ${isFav ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <span class="card-animal-tag">${formatAnimalBadge(s.animal)}</span>
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
            </a>
          `;
                })
                .join('')
        }
      </div>

      <!-- Pagination Controls -->
      ${renderPaginationControls(totalPages, currentPage)}

      <!-- SEO Discovery Text -->
      <div class="seo-discovery-card">
        <p>
          🌟 <strong>Ad-Free Kids Stories & Bedtime Fables:</strong> TalePickle brings classic moral stories, animal adventures, and night time tales to life with sentence-by-sentence read-aloud voice narration, speech speed control, and colorful animated panels for children.
        </p>
      </div>

      ${renderFooter()}
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
        currentPage = 1;
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
        currentPage = 1;
        renderList();
      });
    });

    // Length filter chips
    document.querySelectorAll('.chip[data-length]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeLength = btn.getAttribute('data-length');
        currentPage = 1;
        renderList();
      });
    });

    // Pagination buttons
    document.querySelectorAll('.pagination-btn[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(p) && p >= 1 && p !== currentPage) {
          currentPage = p;
          const url = getLibraryUrlWithPage(p);
          history.pushState({ page: p }, '', url);
          renderList();
          window.scrollTo({ top: 320, behavior: 'smooth' });
        }
      });
    });

    // Surprise me button
    const surpriseBtn = document.getElementById('surpriseBtn');
    if (surpriseBtn) {
      surpriseBtn.addEventListener('click', () => {
        if (stories.length === 0) return;
        const rand = stories[Math.floor(Math.random() * stories.length)];
        navigateToStory(rand.id);
      });
    }

    // Favorites toggle button
    const favFilterBtn = document.getElementById('favFilterBtn');
    if (favFilterBtn) {
      favFilterBtn.addEventListener('click', () => {
        showFavoritesOnly = !showFavoritesOnly;
        currentPage = 1;
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
        currentPage = 1;
        renderList();
      });
    }
  }

  // ==========================================================
  // STORY READER VIEW
  // ==========================================================

  function updateStorySEO(story) {
    if (!story) return;
    document.title = `${story.title} — Aesop's Fables for Kids | TalePickle`;

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
    document.title = "Aesop's Fables for Kids — 150+ Illustrated Stories with Audio Narration | TalePickle";

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

  // Cache of disk-loaded SVGs to prevent duplicate network fetches
  const diskSvgCache = new Map();

  async function loadDiskSvgIfAvailable(storyId, panelIndex) {
    const key = `${storyId}_${panelIndex}`;
    if (diskSvgCache.has(key)) return diskSvgCache.get(key);

    const url = `data/svgs/${storyId}/panel_${panelIndex + 1}.svg`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const svgText = await res.text();
        if (svgText.includes('<svg')) {
          diskSvgCache.set(key, svgText);
          return svgText;
        }
      }
    } catch {}
    diskSvgCache.set(key, null);
    return null;
  }

  function renderReader(storyId) {
    const story = stories.find((s) => s.id === storyId);
    if (!story) {
      appContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <h2>Story not found!</h2>
          <p style="margin: 1rem 0;">We couldn't find the requested fable.</p>
          <a class="btn-pill primary" href="${getLibraryUrl()}" onclick="event.preventDefault(); window.StoryApp.goToLibrary()">← Back to Story List</a>
        </div>
      `;
      return;
    }

    currentStory = story;
    currentSentenceIndex = 0;
    isSpeaking = false;
    TTS.stop();
    updateStorySEO(story);

    // 1. Render DOM & SVG illustration immediately for optimal FCP / LCP
    renderReaderUI();

    // 2. Prefetch audio and word boundaries asynchronously in idle time
    const schedulePrefetch = () => {
      if (window.TTS && window.TTS.prefetchStory) {
        window.TTS.prefetchStory(story.id);
      }
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(schedulePrefetch, { timeout: 1500 });
    } else {
      setTimeout(schedulePrefetch, 50);
    }
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
    const rankedVoices = TTS.getRankedVoices();
    const bestVoice = TTS.getBestDefaultVoice();
    const currentRate = TTS.getRate();

    appContainer.innerHTML = `
      <div class="reader-wrapper">
        <div class="reader-navbar">
          <a class="btn-pill" href="${getLibraryUrl()}" onclick="event.preventDefault(); window.StoryApp.goToLibrary()">← Library</a>
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
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
                <h2>${story.title}</h2>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <button class="hero-story-play-btn ${isSpeaking ? 'speaking' : ''}" id="heroPlayStoryBtn" type="button">
                    ${isSpeaking ? '⏸️ Pause Story' : '▶️ Play Story'}
                  </button>
                  <div id="narrationBadgeContainer">
                    ${
                      TTS.hasStudioAudio(story.id)
                        ? `<span class="badge-studio-audio" title="High-fidelity pre-generated studio narration">🎙️ Studio Narration (HQ)</span>`
                        : `<span class="badge-browser-audio" title="Browser-synthesized voice">🔊 Browser Voice</span>`
                    }
                  </div>
                  <a href="audio/${story.id}/story.mp3" target="_blank" rel="noopener" class="btn-pill" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; text-decoration: none;" title="Download or open full story MP3 directly">🎧 MP3</a>
                </div>
              </div>
              <div class="story-character-pills">
                <span class="story-animal-pill">🐾 ${formatAnimalLabel(story.animal)}</span>
                ${story.character.map((c) => `<span class="story-char-chip">${formatAnimalLabel(c)}</span>`).join('')}
              </div>
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
                Sentence ${currentSentenceIndex + 1} of ${totalSentences}
              </span>
              <span class="click-hint">💡 Tap sentence to jump</span>
            </div>
            <div class="story-full-paragraphs" id="fullStoryParagraphs">
              ${story.text
                .map(
                  (sentence, idx) => `
                <span
                  class="story-read-sentence ${idx === currentSentenceIndex ? 'active-reading' : ''}"
                  id="storySent_${idx}"
                  data-index="${idx}"
                >${renderSentenceWithWords(sentence, idx)} </span>
              `
                )
                .join('')}

              <!-- Moral at the End of Story -->
              <div class="reader-story-moral-card" id="readerStoryMoral">
                <span style="font-size: 1.6rem;">🌟</span>
                <div>
                  <div class="reader-moral-header">Moral of the Story</div>
                  <div class="reader-moral-text">"${escapeHtml(story.moral)}"</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Audio & Playback Controls -->
          <div class="reader-controls-bar">
            <!-- Primary Playback Buttons -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
              <button class="circle-btn" id="prevSentenceBtn" title="Previous Sentence" ${currentSentenceIndex === 0 ? 'disabled' : ''}>
                ⏮️
              </button>

              <div class="playback-buttons">
                <button class="circle-btn play-btn" id="playTtsBtn" title="Play / Pause Sentence">
                  ${isSpeaking ? '⏸️' : '▶️'}
                </button>
                <button class="circle-btn" id="repeatSentenceBtn" title="Replay Sentence">
                  🔄
                </button>
              </div>

              <button class="circle-btn" id="nextSentenceBtn" title="Next Sentence">
                ⏭️
              </button>

              <button class="settings-toggle-btn" id="audioSettingsToggleBtn" type="button" title="Audio & Narration Settings">
                ⚙️ Narration Settings ▾
              </button>
            </div>

            <!-- Collapsible Secondary Settings Drawer -->
            <div class="audio-settings-drawer" id="audioSettingsDrawer" hidden>
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

                <!-- Voice Selector with quality badges and preview button -->
                ${
                  rankedVoices.length > 0
                    ? `
                  <div class="voice-select-group">
                    <select id="voiceSelect" title="Select Voice Narration">
                      ${rankedVoices
                        .map(
                          (v) => `
                        <option value="${v.voiceURI}" ${bestVoice && v.voiceURI === bestVoice.voiceURI ? 'selected' : ''}>
                          ${TTS.formatVoiceLabel(v)}
                        </option>
                      `
                        )
                        .join('')}
                    </select>
                    <button type="button" class="voice-preview-btn" id="previewVoiceBtn" title="Test this voice">
                      🔊 Preview
                    </button>
                  </div>
                `
                    : ''
                }

                <!-- Auto-read toggle -->
                <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                  <input type="checkbox" id="autoAdvanceToggle" ${autoAdvance ? 'checked' : ''} />
                  <span>Auto-Advance</span>
                </label>

                <!-- Art Style Toggle: Rough.js Sketch vs Clean Vector -->
                <button id="artStyleToggleBtn" class="art-style-btn" title="Toggle Illustration Style (Rough.js vs Vector)" onclick="window.StoryApp.toggleArtStyle()">
                  ${SvgArt.getRenderMode() === 'rough' ? '✏️ Style: Rough Sketch' : '✨ Style: Clean Vector'}
                </button>
              </div>
            </div>
          </div>
        </div>

        ${renderFooter()}
      </div>
    `;

    attachReaderEvents();
  }

  function updateSentenceHighlight(index, speaking) {
    if (!currentStory) return;
    clearSpeakingWords();
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
      counter.innerText = `Sentence ${index + 1} of ${currentStory.text.length}`;
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

    TTS.speakStorySentence(currentStory.id, currentSentenceIndex, sentence, () => {
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
    if (playBtn) playBtn.innerHTML = speaking ? '⏸️' : '▶️';

    const heroPlayBtn = document.getElementById('heroPlayStoryBtn');
    if (heroPlayBtn) {
      heroPlayBtn.innerHTML = speaking ? '⏸️ Pause Story' : '▶️ Play Story';
      if (speaking) heroPlayBtn.classList.add('speaking');
      else heroPlayBtn.classList.remove('speaking');
    }

    const activeSentenceEl = document.getElementById(`storySent_${currentSentenceIndex}`);
    if (activeSentenceEl) {
      if (speaking) {
        activeSentenceEl.classList.add('speaking');
      } else {
        activeSentenceEl.classList.remove('speaking');
        clearSpeakingWords();
      }
    } else if (!speaking) {
      clearSpeakingWords();
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

    const heroPlayBtn = document.getElementById('heroPlayStoryBtn');
    if (heroPlayBtn) {
      heroPlayBtn.addEventListener('click', () => {
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

    const settingsToggleBtn = document.getElementById('audioSettingsToggleBtn');
    const settingsDrawer = document.getElementById('audioSettingsDrawer');
    if (settingsToggleBtn && settingsDrawer) {
      settingsToggleBtn.addEventListener('click', () => {
        const isHidden = settingsDrawer.hidden;
        settingsDrawer.hidden = !isHidden;
        settingsToggleBtn.innerHTML = !isHidden
          ? '⚙️ Narration Settings ▾'
          : '⚙️ Close Settings ▴';
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

    const previewBtn = document.getElementById('previewVoiceBtn');
    if (previewBtn) {
      previewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (autoAdvanceTimeout) {
          clearTimeout(autoAdvanceTimeout);
          autoAdvanceTimeout = null;
        }
        clearSpeakingWords();
        updateSpeakingStateUI(false);
        const select = document.getElementById('voiceSelect');
        const uri = select ? select.value : null;
        previewBtn.disabled = true;
        previewBtn.innerText = '⏳ Playing...';
        TTS.previewVoice(uri, () => {
          if (previewBtn) {
            previewBtn.disabled = false;
            previewBtn.innerText = '🔊 Preview';
          }
        });
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

  function handleQuizAnswer(qNum, optIdx, isCorrect) {
    const card = document.getElementById(`quizQ${qNum}`);
    const feedback = document.getElementById(`quizFeedback${qNum}`);
    if (!card || !feedback) return;

    const btns = card.querySelectorAll('.quiz-option-btn');
    btns.forEach((btn, idx) => {
      if (idx === optIdx) {
        if (isCorrect) {
          btn.classList.add('correct');
          btn.classList.remove('incorrect');
        } else {
          btn.classList.add('incorrect');
          btn.classList.remove('correct');
        }
      }
    });

    feedback.hidden = false;
    if (isCorrect) {
      feedback.className = 'quiz-feedback success';
      feedback.innerText = '🌟 Super star! That is completely right!';
    } else {
      feedback.className = 'quiz-feedback retry';
      feedback.innerText = '🤔 Not quite, pick another answer to try again!';
    }
  }

  // ==========================================================
  // MORAL CELEBRATION SCREEN
  // ==========================================================

  function renderMoralScreen() {
    const story = currentStory;
    TTS.stop();
    clearSpeakingWords();

    // Trigger celebratory confetti
    triggerConfetti();

    // Read out the moral
    TTS.speakMoral(story.id, `In the end, the story reminds us: ${story.moral}`);

    // Generate story thumbnail as the background illustration
    const thumbSvg = SvgArt.generateThumbnailSvg(story);

    // Find next story in order
    const currentIndex = stories.findIndex((s) => s.id === story.id);
    const nextStory = currentIndex >= 0 && currentIndex < stories.length - 1 ? stories[currentIndex + 1] : stories[0];

    appContainer.innerHTML = `
      <canvas id="confettiCanvas"></canvas>
      <div class="reader-wrapper">
        <div class="reader-navbar">
          <a class="btn-pill" href="${getLibraryUrl()}" onclick="event.preventDefault(); window.StoryApp.goToLibrary()">← Library</a>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="theme-badge theme-${(story.theme || 'Animals').replace(/\s+/g, '')}">
              ${getThemeEmoji(story.theme)} ${story.theme || 'Animals'}
            </span>
            <span class="card-animal-tag" style="position: static; background: #334155;">${formatAnimalBadge(story.animal)}</span>
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
                  ${story.text.length} sentences • Animal: <strong>${formatAnimalLabel(story.animal)}</strong>
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

            <!-- Interactive Comprehension Quiz -->
            <div class="quiz-section">
              <div class="quiz-title">
                <span>🧠 Fun Story Quiz</span>
              </div>

              <!-- Question 1: Moral Lesson -->
              <div class="quiz-question-card" id="quizQ1">
                <div class="quiz-question-text">1. What important lesson does this story teach us?</div>
                <div class="quiz-options">
                  <button type="button" class="quiz-option-btn" onclick="window.StoryApp.answerQuiz(1, 0, true)">
                    A. "${escapeHtml(story.moral)}"
                  </button>
                  <button type="button" class="quiz-option-btn" onclick="window.StoryApp.answerQuiz(1, 1, false)">
                    B. "Never share or play with friends in the woods."
                  </button>
                  <button type="button" class="quiz-option-btn" onclick="window.StoryApp.answerQuiz(1, 2, false)">
                    C. "Only big, noisy animals can be brave."
                  </button>
                </div>
                <div class="quiz-feedback" id="quizFeedback1" hidden></div>
              </div>

              <!-- Question 2: Character / Detail -->
              <div class="quiz-question-card" id="quizQ2">
                <div class="quiz-question-text">2. Who is the featured animal in this fable?</div>
                <div class="quiz-options">
                  <button type="button" class="quiz-option-btn" onclick="window.StoryApp.answerQuiz(2, 0, false)">
                    A. 🐲 A mythical fire dragon
                  </button>
                  <button type="button" class="quiz-option-btn" onclick="window.StoryApp.answerQuiz(2, 1, true)">
                    B. 🐾 ${formatAnimalLabel(story.animal)} (${escapeHtml(story.title)})
                  </button>
                  <button type="button" class="quiz-option-btn" onclick="window.StoryApp.answerQuiz(2, 2, false)">
                    C. 🤖 A silver space robot
                  </button>
                </div>
                <div class="quiz-feedback" id="quizFeedback2" hidden></div>
              </div>
            </div>

            <!-- Actions -->
            <div class="celebration-actions">
              <button class="btn-pill" id="replayStoryBtn">
                🔄 Read Panel-by-Panel Again
              </button>
              <a class="btn-pill primary" href="${getStoryUrl(nextStory.id)}" onclick="event.preventDefault(); window.StoryApp.goToStory('${encodeURIComponent(nextStory.id)}')">
                Next Story: ${nextStory.title} ➡️
              </a>
              <a class="btn-pill" href="${getLibraryUrl()}" onclick="event.preventDefault(); window.StoryApp.goToLibrary()">
                📚 Back to Library
              </a>
            </div>
          </div>
        </div>

        ${renderFooter()}
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
          TTS.speakFullStory(story.id, fullText, () => {
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
    // 1. Check clean path route: /story/:storyId
    const pathname = window.location.pathname;
    const matchPath = pathname.match(/\/story\/([^/?#]+)/);
    if (matchPath) {
      const id = decodeURIComponent(matchPath[1]);
      renderReader(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Check legacy hash route: #story=:storyId or #/story/:storyId
    const hash = window.location.hash;
    const matchHash = hash.match(/#(?:story=|\/story\/)([^&?]+)/);
    if (matchHash) {
      const id = decodeURIComponent(matchHash[1]);
      // Upgrade smoothly to clean path route without reload
      navigateToStory(id, true);
      return;
    }

    // 3. Default to library list
    currentPage = readPageFromUrl();
    renderList();
  }

  function toggleArtStyle() {
    const current = SvgArt.getRenderMode();
    const next = current === 'rough' ? 'clean' : 'rough';
    SvgArt.setRenderMode(next);

    const btn = document.getElementById('artStyleToggleBtn');
    if (btn) {
      btn.innerText = next === 'rough' ? '✏️ Style: Rough Sketch' : '✨ Style: Clean Vector';
    }

    const stage = document.querySelector('.reader-stage');
    if (stage && currentStory) {
      stage.innerHTML = SvgArt.generatePanelSvg(currentStory, currentSentenceIndex);
    }
  }

  // Global namespace for inline event hooks
  window.StoryApp = {
    toggleFav: toggleFavorite,
    toggleArtStyle: toggleArtStyle,
    goToStory: navigateToStory,
    goToLibrary: navigateToLibrary,
    getBasePath: getAppBasePath,
    answerQuiz: handleQuizAnswer,
  };

  window.addEventListener('popstate', router);
  window.addEventListener('hashchange', router);

  document.addEventListener('DOMContentLoaded', () => {
    fetchStories().then(() => {
      // 1. Immediately render current route (FCP / LCP in < 800ms)
      router();

      // 2. Load audio manifest asynchronously in idle time off the critical path
      const loadAudioAsync = () => {
        if (window.TTS && window.TTS.loadManifest) {
          window.TTS.loadManifest();
        }
      };

      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(loadAudioAsync, { timeout: 1500 });
      } else {
        setTimeout(loadAudioAsync, 50);
      }
    });
  });
})();
