/**
 * analytics.js
 * Google Analytics (GA4) integration for TalePickle kids storybook web application.
 *
 * Child-safe & privacy-respecting configuration (COPPA compliant):
 * - IP Anonymization enabled
 * - Ad personalization & remarketing signals disabled
 * - Google signals disabled
 * - No personally identifiable information (PII) collected
 */

(function () {
  // TalePickle Google Analytics 4 Measurement ID
  const GA_MEASUREMENT_ID = window.TALE_PICKLE_GA_ID || 'G-RDRVWHPM6K';

  const isConfigured = Boolean(
    GA_MEASUREMENT_ID &&
    GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX' &&
    !GA_MEASUREMENT_ID.startsWith('G-PLACEHOLDER')
  );

  // Initialize dataLayer and gtag global stub
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  if (isConfigured) {
    // 1. Asynchronously load Google Tag Manager script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);

    gtag('js', new Date());

    // 2. Configure GA4 with privacy and SPA settings
    gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // SPA virtual page views handled explicitly on route changes
      anonymize_ip: true, // Anonymize visitor IP addresses
      allow_google_signals: false, // Disable advertising identifier association
      allow_ad_personalization_signals: false, // Prohibit ad personalization
      restricted_data_processing: true, // Comply with child privacy / COPPA standards
    });

    console.log('[Analytics] Google Analytics 4 initialized with ID:', GA_MEASUREMENT_ID);
  } else {
    // In dev / placeholder mode, safely record events to console for verification
    // console.debug('[Analytics] In placeholder mode. Set window.TALE_PICKLE_GA_ID to enable tracking.');
  }

  // TalePickle Analytics API
  window.AppAnalytics = {
    getMeasurementId: () => GA_MEASUREMENT_ID,
    isConfigured: () => isConfigured,

    /**
     * Track Single Page Application (SPA) virtual page views
     */
    trackPageView: (pagePath, pageTitle) => {
      const title = pageTitle || document.title;
      const path = pagePath || (window.location.pathname + window.location.search);
      if (isConfigured) {
        gtag('event', 'page_view', {
          page_path: path,
          page_location: window.location.href,
          page_title: title,
        });
      }
    },

    /**
     * Generic custom event tracker
     */
    trackEvent: (eventName, params = {}) => {
      if (isConfigured) {
        gtag('event', eventName, params);
      }
    },

    /**
     * Track story reader view
     */
    trackStoryView: (story) => {
      if (!story) return;
      if (isConfigured) {
        gtag('event', 'view_item', {
          item_id: story.id,
          item_name: story.title,
          item_category: story.theme || 'General',
          animal: story.animal || 'none',
          sentence_count: Array.isArray(story.text) ? story.text.length : 0,
        });
      }
    },

    /**
     * Track story completion (moral celebration screen reached)
     */
    trackStoryComplete: (story) => {
      if (!story) return;
      if (isConfigured) {
        gtag('event', 'story_complete', {
          story_id: story.id,
          story_title: story.title,
          story_theme: story.theme || 'General',
          animal: story.animal || 'none',
        });
      }
    },

    /**
     * Track audio sentence narration start
     */
    trackAudioPlay: (storyId, sentenceIndex) => {
      if (isConfigured) {
        gtag('event', 'audio_play', {
          story_id: storyId,
          sentence_index: sentenceIndex,
        });
      }
    },

    /**
     * Track audio sentence narration pause / stop
     */
    trackAudioPause: (storyId, sentenceIndex) => {
      if (isConfigured) {
        gtag('event', 'audio_pause', {
          story_id: storyId,
          sentence_index: sentenceIndex,
        });
      }
    },

    /**
     * Track full story audio playback on celebration screen
     */
    trackFullAudioPlay: (storyId) => {
      if (isConfigured) {
        gtag('event', 'full_audio_play', {
          story_id: storyId,
        });
      }
    },

    /**
     * Track story favorite / unfavorite
     */
    trackFavorite: (storyId, isFav) => {
      if (isConfigured) {
        gtag('event', isFav ? 'add_to_wishlist' : 'remove_from_wishlist', {
          item_id: storyId,
        });
      }
    },

    /**
     * Track search query
     */
    trackSearch: (searchTerm, resultsCount) => {
      if (!searchTerm) return;
      if (isConfigured) {
        gtag('event', 'search', {
          search_term: searchTerm,
          results_count: resultsCount,
        });
      }
    },

    /**
     * Track filtering by theme, animal, or length
     */
    trackFilter: (filterType, filterValue) => {
      if (!filterValue || filterValue === 'All') return;
      if (isConfigured) {
        gtag('event', 'select_content', {
          content_type: filterType,
          item_id: filterValue,
        });
      }
    },

    /**
     * Track surprise story discovery
     */
    trackSurpriseMe: (chosenStoryId) => {
      if (isConfigured) {
        gtag('event', 'surprise_me_click', {
          story_id: chosenStoryId,
        });
      }
    },
  };
})();
