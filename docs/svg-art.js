/**
 * svg-art.js
 * Comprehensive storybook illustration engine with:
 * 1. Full character support for all 95 storybook characters.
 * 2. Multi-character interactive stage composition (facing dialogue, realistic sizing).
 * 3. Narrative sentence-aware action solver (sleeping zZz, perched birds, hunter's nets, racing).
 * 4. Rich interactive story props (pitchers with rising water, grapes, cheese, banners, bridges).
 * 5. Rough.js hand-drawn sketch mode for authentic storybook crayon/watercolor texture.
 */

(function (global) {
  // Render mode: 'rough' (hand-drawn sketch via Rough.js) or 'clean' (sharp vector)
  let currentRenderMode = localStorage.getItem('storybook_art_style') || 'rough';

  function getRenderMode() {
    return currentRenderMode;
  }

  function setRenderMode(mode) {
    currentRenderMode = mode === 'clean' ? 'clean' : 'rough';
    localStorage.setItem('storybook_art_style', currentRenderMode);
  }

  // Scenery themes & color palettes
  const SCENERIES = {
    meadow: {
      sky: ['#87CEEB', '#E0F6FF'],
      ground: '#7BC676',
      groundDark: '#5EAA59',
      sun: '#FFD700',
      cloud: '#FFFFFF',
    },
    jungle: {
      sky: ['#56ab2f', '#a8e063'],
      ground: '#3B7A32',
      groundDark: '#2B5B24',
      sun: '#FFE600',
      cloud: '#E8F5E9',
    },
    river: {
      sky: ['#4facfe', '#00f2fe'],
      ground: '#66bb6a',
      groundDark: '#43a047',
      water: '#29b6f6',
      waterDeep: '#0288d1',
      sun: '#FFCA28',
      cloud: '#FFFFFF',
    },
    village: {
      sky: ['#fbc2eb', '#a6c1ee'],
      ground: '#c5e1a5',
      groundDark: '#9ccc65',
      sun: '#FFA726',
      cloud: '#FFF8E1',
    },
    sunset: {
      sky: ['#fa709a', '#fee140'],
      ground: '#8d6e63',
      groundDark: '#6d4c41',
      sun: '#FF5722',
      cloud: '#FFECB3',
    },
    night: {
      sky: ['#0f2027', '#203a43', '#2c5364'],
      ground: '#1f3a2c',
      groundDark: '#12251c',
      moon: '#FFF9C4',
      star: '#FFFDE7',
    },
    courtyard: {
      sky: ['#fef3c7', '#fed7aa'],
      ground: '#d97706',
      groundDark: '#b45309',
      sun: '#f59e0b',
      cloud: '#FFFBEB',
    },
  };

  // Comprehensive vector character avatar drawings
  const AVATARS = {
    // 1. TIGER
    tiger: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="60" cy="50" rx="35" ry="25" fill="#FF9800" />
        <ellipse cx="60" cy="54" rx="26" ry="18" fill="#FFE0B2" />
        <path d="M50 30 Q53 45 48 55 M60 28 Q63 42 58 55 M70 30 Q73 45 68 55" stroke="#3E2723" stroke-width="3" stroke-linecap="round" fill="none" />
        <circle cx="28" cy="35" r="24" fill="#FF9800" />
        <circle cx="12" cy="18" r="8" fill="#FF9800" /><circle cx="12" cy="18" r="4" fill="#3E2723" />
        <circle cx="44" cy="18" r="8" fill="#FF9800" /><circle cx="44" cy="18" r="4" fill="#3E2723" />
        <ellipse cx="20" cy="42" rx="9" ry="7" fill="#FFE0B2" /><ellipse cx="36" cy="42" rx="9" ry="7" fill="#FFE0B2" />
        <circle cx="20" cy="32" r="3.5" fill="#3E2723" /><circle cx="21" cy="31" r="1.2" fill="#FFFFFF" />
        <circle cx="36" cy="32" r="3.5" fill="#3E2723" /><circle cx="37" cy="31" r="1.2" fill="#FFFFFF" />
        <polygon points="25,38 31,38 28,42" fill="#D84315" />
        <path d="M28 42 Q24 47 20 44 M28 42 Q32 47 36 44" stroke="#3E2723" stroke-width="2" fill="none" />
        <path d="M92 45 Q115 40 110 20" stroke="#FF9800" stroke-width="7" stroke-linecap="round" fill="none" />
        <circle cx="45" cy="70" r="7" fill="#FF9800" /><circle cx="75" cy="70" r="7" fill="#FF9800" />
      </g>
    `,

    // 2. LION
    lion: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <circle cx="45" cy="45" r="38" fill="#D84315" />
        <ellipse cx="85" cy="60" rx="35" ry="24" fill="#FFA726" />
        <circle cx="45" cy="45" r="25" fill="#FFA726" />
        <circle cx="28" cy="24" r="7" fill="#FFA726" /><circle cx="28" cy="24" r="4" fill="#D84315" />
        <circle cx="62" cy="24" r="7" fill="#FFA726" /><circle cx="62" cy="24" r="4" fill="#D84315" />
        <circle cx="37" cy="42" r="3.5" fill="#3E2723" /><circle cx="38" cy="41" r="1.2" fill="#FFFFFF" />
        <circle cx="53" cy="42" r="3.5" fill="#3E2723" /><circle cx="54" cy="41" r="1.2" fill="#FFFFFF" />
        <polygon points="41,49 49,49 45,54" fill="#4E342E" />
        <path d="M45 54 Q40 59 36 56 M45 54 Q50 59 54 56" stroke="#3E2723" stroke-width="2" fill="none" />
        <path d="M118 55 Q135 50 130 35" stroke="#FFA726" stroke-width="5" fill="none" stroke-linecap="round" />
        <circle cx="130" cy="35" r="7" fill="#BF360C" />
        <circle cx="65" cy="80" r="7" fill="#FFA726" /><circle cx="105" cy="80" r="7" fill="#FFA726" />
      </g>
    `,

    // 3. ELEPHANT
    elephant: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <!-- Elephant Body -->
        <ellipse cx="70" cy="55" rx="42" ry="32" fill="#78909C" />
        <!-- Head -->
        <circle cx="32" cy="42" r="26" fill="#78909C" />
        <!-- Floppy Ear -->
        <ellipse cx="48" cy="40" rx="14" ry="20" fill="#90A4AE" transform="rotate(-10 48 40)" />
        <ellipse cx="48" cy="40" rx="9" ry="14" fill="#CFD8DC" transform="rotate(-10 48 40)" />
        <!-- Eye -->
        <circle cx="25" cy="34" r="3.5" fill="#263238" /><circle cx="26" cy="33" r="1" fill="#FFFFFF" />
        <!-- Curved Trunk -->
        <path d="M14 44 Q-8 55 -6 75 Q-2 88 10 82 Q12 76 4 72 Q2 58 16 52 Z" fill="#78909C" />
        <!-- Ivory Tusk -->
        <path d="M18 54 Q8 62 14 68 Q20 62 20 54 Z" fill="#FFFBEB" stroke="#E2E8F0" stroke-width="1" />
        <!-- Sturdy Legs -->
        <rect x="42" y="75" width="14" height="22" rx="6" fill="#607D8B" />
        <rect x="74" y="75" width="14" height="22" rx="6" fill="#607D8B" />
        <!-- Little Tail -->
        <path d="M110 55 Q120 65 116 78" stroke="#78909C" stroke-width="3" fill="none" stroke-linecap="round" />
        <circle cx="116" cy="78" r="3" fill="#455A64" />
      </g>
    `,

    // 4. MOUSE / RAT
    mouse: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <path d="M60 48 Q85 45 80 25" stroke="#F48FB1" stroke-width="3" fill="none" stroke-linecap="round" />
        <ellipse cx="38" cy="48" rx="24" ry="18" fill="#B0BEC5" />
        <ellipse cx="34" cy="50" rx="16" ry="12" fill="#ECEFF1" />
        <circle cx="20" cy="24" r="12" fill="#B0BEC5" /><circle cx="20" cy="24" r="7" fill="#F48FB1" />
        <circle cx="38" cy="22" r="11" fill="#B0BEC5" /><circle cx="38" cy="22" r="6" fill="#F48FB1" />
        <circle cx="22" cy="42" r="14" fill="#B0BEC5" />
        <circle cx="16" cy="38" r="3" fill="#263238" /><circle cx="17" cy="37" r="1" fill="#FFFFFF" />
        <circle cx="9" cy="45" r="3" fill="#E91E63" />
        <path d="M10 46 L2 43 M10 48 L2 50" stroke="#546E7A" stroke-width="1.5" />
        <ellipse cx="28" cy="64" rx="6" ry="3.5" fill="#90A4AE" /><ellipse cx="48" cy="64" rx="6" ry="3.5" fill="#90A4AE" />
      </g>
    `,

    // 5. FOX
    fox: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <!-- Bushy Tail with white tip -->
        <path d="M75 50 Q110 40 100 20 Q85 30 70 42 Z" fill="#E65100" />
        <circle cx="98" cy="22" r="7" fill="#FFFFFF" />
        <!-- Body -->
        <ellipse cx="50" cy="50" rx="28" ry="18" fill="#F57C00" />
        <ellipse cx="45" cy="52" rx="18" ry="12" fill="#FFF3E0" />
        <!-- Head -->
        <polygon points="12,42 38,25 38,55" fill="#F57C00" />
        <polygon points="18,42 36,33 36,50" fill="#FFF3E0" />
        <!-- Ears -->
        <polygon points="34,26 40,8 46,26" fill="#F57C00" /><polygon points="36,24 40,14 44,24" fill="#3E2723" />
        <polygon points="26,27 28,10 34,26" fill="#F57C00" />
        <!-- Eye & Nose -->
        <ellipse cx="28" cy="37" rx="3.5" ry="2" fill="#3E2723" transform="rotate(-15 28 37)" />
        <circle cx="12" cy="42" r="2.5" fill="#212121" />
        <circle cx="35" cy="66" r="5" fill="#3E2723" /><circle cx="60" cy="66" r="5" fill="#3E2723" />
      </g>
    `,

    // 6. WOLF
    wolf: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <path d="M78 50 Q105 45 95 30" stroke="#546E7A" stroke-width="6" fill="none" stroke-linecap="round" />
        <ellipse cx="50" cy="50" rx="30" ry="19" fill="#607D8B" />
        <polygon points="12,38 38,24 38,52" fill="#607D8B" />
        <polygon points="20,40 36,32 36,48" fill="#CFD8DC" />
        <polygon points="34,24 38,6 44,24" fill="#455A64" />
        <polygon points="26,25 28,8 34,25" fill="#455A64" />
        <polygon points="27,33 33,35 28,37" fill="#FFD54F" /><circle cx="29" cy="35" r="1.5" fill="#263238" />
        <circle cx="12" cy="38" r="2.5" fill="#212121" />
        <rect x="34" y="66" width="6" height="14" rx="3" fill="#455A64" /><rect x="62" y="66" width="6" height="14" rx="3" fill="#455A64" />
      </g>
    `,

    // 7. TORTOISE
    tortoise: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <path d="M20 50 Q50 15 80 50 Z" fill="#388E3C" />
        <path d="M25 50 Q50 20 75 50 Z" fill="#4CAF50" />
        <polygon points="40,32 60,32 66,45 50,50 34,45" fill="#2E7D32" stroke="#81C784" stroke-width="1.5" />
        <ellipse cx="14" cy="46" rx="11" ry="8" fill="#81C784" />
        <circle cx="10" cy="44" r="2.5" fill="#1B5E20" /><circle cx="10" cy="43" r="0.8" fill="#FFFFFF" />
        <ellipse cx="28" cy="54" rx="7" ry="5" fill="#81C784" /><ellipse cx="72" cy="54" rx="7" ry="5" fill="#81C784" />
      </g>
    `,

    // 8. HARE / RABBIT
    hare: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="50" cy="52" rx="25" ry="18" fill="#BCAAA4" />
        <circle cx="30" cy="40" r="15" fill="#BCAAA4" />
        <!-- Long Ears -->
        <ellipse cx="25" cy="16" rx="5" ry="16" fill="#BCAAA4" transform="rotate(-10 25 16)" />
        <ellipse cx="25" cy="16" rx="2.5" ry="11" fill="#F8BBD0" transform="rotate(-10 25 16)" />
        <ellipse cx="36" cy="18" rx="5" ry="16" fill="#BCAAA4" transform="rotate(10 36 18)" />
        <ellipse cx="36" cy="18" rx="2.5" ry="11" fill="#F8BBD0" transform="rotate(10 36 18)" />
        <circle cx="25" cy="38" r="3" fill="#4E342E" /><circle cx="26" cy="37" r="1" fill="#FFFFFF" />
        <circle cx="18" cy="44" r="2" fill="#E91E63" />
        <circle cx="75" cy="50" r="7" fill="#EFEBE9" />
        <ellipse cx="32" cy="68" rx="8" ry="4" fill="#8D6E63" /><ellipse cx="60" cy="68" rx="8" ry="4" fill="#8D6E63" />
      </g>
    `,

    // 9. CROW / RAVEN / JACKDAW
    crow: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="50" cy="45" rx="26" ry="20" fill="#263238" />
        <circle cx="30" cy="30" r="16" fill="#263238" />
        <polygon points="18,28 3,33 18,36" fill="#FFA000" />
        <circle cx="27" cy="27" r="3.5" fill="#FFFFFF" /><circle cx="26" cy="27" r="2" fill="#000000" />
        <path d="M45 35 Q70 30 65 55 Q45 55 45 35 Z" fill="#1C2833" />
        <polygon points="72,45 92,42 90,52 70,50" fill="#263238" />
        <line x1="42" y1="62" x2="40" y2="75" stroke="#FFA000" stroke-width="2.5" />
        <line x1="55" y1="62" x2="55" y2="75" stroke="#FFA000" stroke-width="2.5" />
      </g>
    `,

    // 10. CRANE / STORK / HERON
    crane: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <!-- Body -->
        <ellipse cx="55" cy="45" rx="24" ry="16" fill="#ECEFF1" />
        <!-- Graceful Long Neck -->
        <path d="M40 45 Q32 25 35 15 Q38 5 44 8" stroke="#ECEFF1" stroke-width="7" fill="none" stroke-linecap="round" />
        <!-- Head -->
        <circle cx="44" cy="8" r="9" fill="#ECEFF1" />
        <circle cx="44" cy="4" r="4" fill="#E53935" />
        <!-- Eye -->
        <circle cx="42" cy="7" r="2" fill="#212121" />
        <!-- Long Sharp Orange Beak -->
        <polygon points="48,7 80,10 48,12" fill="#FB8C00" />
        <!-- Wing Feathers -->
        <path d="M48 40 Q65 35 75 48 Q60 52 48 40 Z" fill="#B0BEC5" />
        <!-- Long Legs -->
        <line x1="48" y1="60" x2="46" y2="92" stroke="#FB8C00" stroke-width="3" />
        <line x1="60" y1="60" x2="62" y2="92" stroke="#FB8C00" stroke-width="3" />
      </g>
    `,

    // 11. MONKEY
    monkey: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <path d="M75 50 Q110 65 95 30 Q85 10 75 25" stroke="#795548" stroke-width="4.5" fill="none" stroke-linecap="round" />
        <ellipse cx="50" cy="52" rx="24" ry="20" fill="#795548" />
        <ellipse cx="48" cy="53" rx="15" ry="13" fill="#D7CCC8" />
        <circle cx="34" cy="34" r="18" fill="#795548" />
        <circle cx="18" cy="34" r="7" fill="#D7CCC8" /><circle cx="50" cy="34" r="7" fill="#D7CCC8" />
        <ellipse cx="32" cy="38" rx="12" ry="9" fill="#D7CCC8" />
        <circle cx="28" cy="33" r="3" fill="#3E2723" /><circle cx="38" cy="33" r="3" fill="#3E2723" />
        <path d="M30 42 Q34 46 38 42" stroke="#5D4037" stroke-width="2" fill="none" stroke-linecap="round" />
      </g>
    `,

    // 12. DOG
    dog: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="55" cy="50" rx="28" ry="20" fill="#8D6E63" />
        <circle cx="30" cy="36" r="18" fill="#8D6E63" />
        <ellipse cx="18" cy="38" rx="6" ry="14" fill="#5D4037" transform="rotate(-15 18 38)" />
        <ellipse cx="42" cy="38" rx="6" ry="14" fill="#5D4037" transform="rotate(15 42 38)" />
        <ellipse cx="30" cy="44" rx="9" ry="7" fill="#D7CCC8" />
        <circle cx="30" cy="41" r="3" fill="#212121" />
        <circle cx="24" cy="32" r="3" fill="#212121" /><circle cx="25" cy="31" r="1" fill="#FFFFFF" />
        <circle cx="36" cy="32" r="3" fill="#212121" /><circle cx="37" cy="31" r="1" fill="#FFFFFF" />
        <path d="M80 48 Q98 35 92 20" stroke="#8D6E63" stroke-width="5" stroke-linecap="round" fill="none" />
        <circle cx="42" cy="68" r="6" fill="#5D4037" /><circle cx="68" cy="68" r="6" fill="#5D4037" />
      </g>
    `,

    // 13. CAT
    cat: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="50" cy="50" rx="25" ry="18" fill="#FFB74D" />
        <circle cx="30" cy="34" r="16" fill="#FFB74D" />
        <polygon points="20,24 22,8 30,22" fill="#FFB74D" /><polygon points="22,22 23,12 28,21" fill="#FF8A65" />
        <polygon points="32,22 40,8 42,24" fill="#FFB74D" /><polygon points="34,21 39,12 40,22" fill="#FF8A65" />
        <ellipse cx="24" cy="34" rx="3" ry="4" fill="#43A047" /><ellipse cx="36" cy="34" rx="3" ry="4" fill="#43A047" />
        <circle cx="30" cy="40" r="2" fill="#E91E63" />
        <line x1="16" y1="40" x2="6" y2="38" stroke="#424242" stroke-width="1.5" />
        <line x1="44" y1="40" x2="54" y2="38" stroke="#424242" stroke-width="1.5" />
        <path d="M72 48 Q92 40 85 22" stroke="#FFB74D" stroke-width="4.5" fill="none" stroke-linecap="round" />
      </g>
    `,

    // 14. SHEEP / LAMB
    sheep: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <!-- Fluffy Cloud Body -->
        <circle cx="45" cy="45" r="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
        <circle cx="65" cy="45" r="18" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
        <circle cx="55" cy="35" r="15" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
        <circle cx="55" cy="55" r="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
        <!-- Head -->
        <ellipse cx="28" cy="40" rx="14" ry="12" fill="#F1F5F9" />
        <ellipse cx="18" cy="42" rx="6" ry="3.5" fill="#FDA4AF" transform="rotate(-20 18 42)" />
        <ellipse cx="36" cy="32" rx="6" ry="3.5" fill="#FDA4AF" transform="rotate(20 36 32)" />
        <circle cx="24" cy="38" r="2.5" fill="#1E293B" /><circle cx="32" cy="38" r="2.5" fill="#1E293B" />
        <ellipse cx="28" cy="45" rx="3" ry="2" fill="#F43F5E" />
        <!-- Legs -->
        <rect x="42" y="62" width="6" height="15" rx="2" fill="#64748B" />
        <rect x="62" y="62" width="6" height="15" rx="2" fill="#64748B" />
      </g>
    `,

    // 15. OX / BULL / COW
    ox: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="65" cy="52" rx="36" ry="24" fill="#5D4037" />
        <circle cx="30" cy="38" r="18" fill="#5D4037" />
        <!-- Strong Curved Horns -->
        <path d="M26 24 Q15 6 32 10" stroke="#ECEFF1" stroke-width="4.5" fill="none" stroke-linecap="round" />
        <path d="M34 24 Q45 6 28 10" stroke="#ECEFF1" stroke-width="4.5" fill="none" stroke-linecap="round" />
        <ellipse cx="22" cy="46" rx="11" ry="8" fill="#D7CCC8" />
        <circle cx="18" cy="46" r="2" fill="#3E2723" /><circle cx="26" cy="46" r="2" fill="#3E2723" />
        <circle cx="24" cy="34" r="3" fill="#212121" />
        <rect x="42" y="72" width="8" height="18" rx="3" fill="#3E2723" />
        <rect x="76" y="72" width="8" height="18" rx="3" fill="#3E2723" />
        <path d="M98 50 Q110 65 106 80" stroke="#5D4037" stroke-width="3.5" fill="none" />
      </g>
    `,

    // 16. GOAT
    goat: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="50" cy="52" rx="26" ry="19" fill="#ECEFF1" />
        <circle cx="26" cy="38" r="15" fill="#ECEFF1" />
        <path d="M25 24 Q30 8 40 12" stroke="#78909C" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <path d="M20 25 Q23 10 32 14" stroke="#78909C" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <polygon points="16,48 20,60 24,48" fill="#CFD8DC" />
        <circle cx="22" cy="34" r="2.5" fill="#263238" />
        <rect x="34" y="68" width="5" height="12" rx="2" fill="#90A4AE" /><rect x="62" y="68" width="5" height="12" rx="2" fill="#90A4AE" />
      </g>
    `,

    // 17. DONKEY / ASS / MULE
    donkey: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="55" cy="52" rx="30" ry="20" fill="#78909C" />
        <ellipse cx="25" cy="38" rx="15" ry="18" fill="#78909C" transform="rotate(-20 25 38)" />
        <ellipse cx="16" cy="46" rx="9" ry="7" fill="#ECEFF1" />
        <!-- Long Ears -->
        <ellipse cx="26" cy="14" rx="4.5" ry="15" fill="#78909C" transform="rotate(-15 26 14)" />
        <ellipse cx="35" cy="16" rx="4.5" ry="15" fill="#78909C" transform="rotate(10 35 16)" />
        <circle cx="24" cy="34" r="3" fill="#263238" /><circle cx="12" cy="46" r="1.5" fill="#37474F" />
        <rect x="36" y="68" width="6" height="15" rx="3" fill="#607D8B" /><rect x="68" y="68" width="6" height="15" rx="3" fill="#607D8B" />
      </g>
    `,

    // 18. ROOSTER / COCK / HEN
    rooster: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <path d="M65 45 Q85 15 95 35 Q80 40 68 50 Z" fill="#00897B" />
        <circle cx="50" cy="48" r="18" fill="#FF8F00" />
        <circle cx="34" cy="30" r="12" fill="#FF8F00" />
        <!-- Red Comb -->
        <path d="M28 20 Q34 10 40 20 Z" fill="#E53935" />
        <polygon points="24,28 14,32 24,35" fill="#FDD835" />
        <circle cx="30" cy="28" r="2.5" fill="#000000" />
        <line x1="44" y1="64" x2="42" y2="76" stroke="#F57F17" stroke-width="2.5" />
        <line x1="54" y1="64" x2="54" y2="76" stroke="#F57F17" stroke-width="2.5" />
      </g>
    `,

    // 19. FROG
    frog: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="45" cy="48" rx="25" ry="20" fill="#4CAF50" />
        <ellipse cx="45" cy="52" rx="18" ry="13" fill="#C8E6C9" />
        <circle cx="30" cy="28" r="10" fill="#4CAF50" /><circle cx="30" cy="28" r="6" fill="#FFFFFF" /><circle cx="30" cy="28" r="3.5" fill="#1B5E20" />
        <circle cx="60" cy="28" r="10" fill="#4CAF50" /><circle cx="60" cy="28" r="6" fill="#FFFFFF" /><circle cx="60" cy="28" r="3.5" fill="#1B5E20" />
        <path d="M25 45 Q45 58 65 45" stroke="#2E7D32" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <ellipse cx="18" cy="55" rx="8" ry="5" fill="#4CAF50" /><ellipse cx="72" cy="55" rx="8" ry="5" fill="#4CAF50" />
      </g>
    `,

    // 20. PEACOCK
    peacock: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <!-- Fan of iridescence -->
        <path d="M40 50 Q60 -10 90 20 Q110 5 115 50 Z" fill="#0284C7" opacity="0.85" />
        <circle cx="75" cy="22" r="5" fill="#22C55E" /><circle cx="75" cy="22" r="2.5" fill="#FACC15" />
        <circle cx="95" cy="28" r="5" fill="#22C55E" /><circle cx="95" cy="28" r="2.5" fill="#FACC15" />
        <!-- Body -->
        <ellipse cx="40" cy="48" rx="18" ry="14" fill="#0369A1" />
        <path d="M30 45 Q25 25 32 18" stroke="#0284C7" stroke-width="6" fill="none" />
        <circle cx="34" cy="16" r="8" fill="#0369A1" />
        <polygon points="28,16 20,18 28,21" fill="#F59E0B" />
        <circle cx="32" cy="14" r="2" fill="#FFFFFF" /><circle cx="31" cy="14" r="1" fill="#000" />
      </g>
    `,

    // 21. OWl
    owl: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="40" cy="45" rx="22" ry="26" fill="#78350F" />
        <!-- Big Eyes -->
        <circle cx="30" cy="32" r="9" fill="#FEF08A" stroke="#CA8A04" stroke-width="1.5" />
        <circle cx="30" cy="32" r="4.5" fill="#18181B" /><circle cx="32" cy="30" r="1.5" fill="#FFF" />
        <circle cx="50" cy="32" r="9" fill="#FEF08A" stroke="#CA8A04" stroke-width="1.5" />
        <circle cx="50" cy="32" r="4.5" fill="#18181B" /><circle cx="52" cy="30" r="1.5" fill="#FFF" />
        <polygon points="37,38 43,38 40,45" fill="#F59E0B" />
        <!-- Ear tufts -->
        <polygon points="24,24 20,10 30,20" fill="#78350F" /><polygon points="56,24 60,10 50,20" fill="#78350F" />
      </g>
    `,

    // 22. STAG / DEER
    stag: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <ellipse cx="55" cy="50" rx="28" ry="18" fill="#A16207" />
        <path d="M35 45 Q30 25 35 18" stroke="#A16207" stroke-width="6" fill="none" />
        <circle cx="36" cy="16" r="10" fill="#A16207" />
        <!-- Majestic Antlers -->
        <path d="M36 10 L32 -6 M32 -2 L24 -8 M36 10 L44 -6 M40 -2 L48 -8" stroke="#78350F" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <circle cx="32" cy="14" r="2.5" fill="#000" /><polygon points="26,18 20,20 26,22" fill="#451A03" />
        <rect x="40" y="65" width="5" height="18" rx="2" fill="#78350F" /><rect x="65" y="65" width="5" height="18" rx="2" fill="#78350F" />
      </g>
    `,

    // 23. INSECT (ANT / BEE / GRASSHOPPER / FLY)
    insect: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <!-- 3-Segmented Body -->
        <ellipse cx="25" cy="35" rx="8" ry="7" fill="#15803D" />
        <ellipse cx="40" cy="38" rx="7" ry="6" fill="#16A34A" />
        <ellipse cx="58" cy="40" rx="12" ry="9" fill="#22C55E" />
        <!-- Eye & Antennae -->
        <circle cx="22" cy="33" r="2.5" fill="#FFFFFF" /><circle cx="21" cy="33" r="1.5" fill="#000" />
        <path d="M22 28 Q18 16 12 18 M24 28 Q24 16 30 18" stroke="#14532D" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <!-- Springing Legs -->
        <path d="M38 42 L34 56 L28 58 M44 42 L46 56 L52 58 M52 42 L65 30 L68 58" stroke="#14532D" stroke-width="2" fill="none" stroke-linecap="round" />
      </g>
    `,

    // 24. HUMAN - BOY / CHILD
    boy: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <!-- Head -->
        <circle cx="35" cy="24" r="14" fill="#FFEDD5" />
        <!-- Hair / Cap -->
        <path d="M22 22 Q35 10 48 20" stroke="#0284C7" stroke-width="6" fill="none" stroke-linecap="round" />
        <!-- Cheerful Face -->
        <circle cx="30" cy="22" r="2" fill="#1E293B" /><circle cx="40" cy="22" r="2" fill="#1E293B" />
        <path d="M32 28 Q35 32 38 28" stroke="#EA580C" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <!-- Tunic Shirt -->
        <rect x="24" y="38" width="22" height="24" rx="4" fill="#38BDF8" />
        <!-- Legs & Boots -->
        <rect x="26" y="60" width="6" height="15" rx="2" fill="#1E293B" />
        <rect x="38" y="60" width="6" height="15" rx="2" fill="#1E293B" />
      </g>
    `,

    // 25. HUMAN - MAN (FARMER / SHEPHERD / WOODMAN / FATHER)
    man: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <!-- Head -->
        <circle cx="35" cy="22" r="13" fill="#FED7AA" />
        <!-- Farmer/Shepherd Hat -->
        <ellipse cx="35" cy="14" rx="18" ry="4" fill="#A16207" />
        <path d="M24 14 Q35 2 46 14" fill="#CA8A04" />
        <!-- Face & Beard -->
        <circle cx="30" cy="20" r="2" fill="#1E293B" /><circle cx="40" cy="20" r="2" fill="#1E293B" />
        <path d="M26 26 Q35 36 44 26" fill="#78350F" />
        <!-- Tunic / Robe -->
        <path d="M22 35 L48 35 L52 68 L18 68 Z" fill="#2563EB" />
        <rect x="22" y="48" width="26" height="4" fill="#78350F" />
        <!-- Boots -->
        <rect x="25" y="68" width="7" height="15" rx="3" fill="#1E293B" />
        <rect x="38" y="68" width="7" height="15" rx="3" fill="#1E293B" />
        <!-- Walking Staff / Tool -->
        <line x1="52" y1="12" x2="52" y2="82" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
      </g>
    `,

    // 26. HUMAN - WOMAN (MOTHER / MILKMAID)
    woman: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${isFlipped ? -scale : scale}, ${scale})">
        <circle cx="35" cy="22" r="13" fill="#FFEDD5" />
        <!-- Hair / Kerchief -->
        <path d="M20 20 Q35 8 50 20 L48 30 L22 30 Z" fill="#F43F5E" />
        <circle cx="30" cy="22" r="2" fill="#1E293B" /><circle cx="40" cy="22" r="2" fill="#1E293B" />
        <path d="M32 28 Q35 32 38 28" stroke="#E11D48" stroke-width="1.5" fill="none" />
        <!-- Dress & Apron -->
        <path d="M22 34 L48 34 L54 70 L16 70 Z" fill="#EC4899" />
        <path d="M26 38 L44 38 L42 66 L28 66 Z" fill="#FFFFFF" opacity="0.9" />
      </g>
    `,

    // 27. SUN CHARACTER (for North Wind & Sun)
    sun_char: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${scale})">
        <circle cx="40" cy="40" r="24" fill="#FBBF24" />
        <!-- Radiant rays -->
        <path d="M40 8 L40 0 M40 72 L40 80 M8 40 L0 40 M72 40 L80 40 M16 16 L10 10 M64 64 L70 70 M64 16 L70 10 M16 64 L10 70" stroke="#F59E0B" stroke-width="4" stroke-linecap="round" />
        <!-- Cheerful Smile -->
        <circle cx="32" cy="36" r="3" fill="#78350F" /><circle cx="48" cy="36" r="3" fill="#78350F" />
        <circle cx="28" cy="42" r="3" fill="#F87171" opacity="0.6" /><circle cx="52" cy="42" r="3" fill="#F87171" opacity="0.6" />
        <path d="M32 44 Q40 54 48 44" stroke="#78350F" stroke-width="2.5" fill="none" stroke-linecap="round" />
      </g>
    `,

    // 28. WIND CHARACTER
    wind_char: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${scale})">
        <!-- Puffy cloud face -->
        <path d="M20 40 Q25 20 45 25 Q60 15 75 30 Q85 45 70 55 Q50 65 20 50 Z" fill="#BAE6FD" />
        <!-- Blowing mouth -->
        <ellipse cx="25" cy="45" rx="6" ry="8" fill="#0284C7" />
        <!-- Whirling gust lines -->
        <path d="M20 45 Q-20 40 -40 50 M15 48 Q-30 52 -60 45" stroke="#E0F2FE" stroke-width="4" stroke-linecap="round" fill="none" />
      </g>
    `,

    // 29. POTS (Brass & Clay)
    pots: (x, y, scale = 1, isFlipped = false) => `
      <g transform="translate(${x}, ${y}) scale(${scale})">
        <!-- Brass Pot (Gold) -->
        <ellipse cx="25" cy="45" rx="20" ry="16" fill="#F59E0B" stroke="#D97706" stroke-width="2" />
        <ellipse cx="25" cy="32" rx="12" ry="4" fill="#FDE68A" />
        <!-- Clay Pot (Terracotta) -->
        <ellipse cx="65" cy="48" rx="18" ry="15" fill="#C2410C" stroke="#9A3412" stroke-width="2" />
        <ellipse cx="65" cy="35" rx="10" ry="3.5" fill="#EA580C" />
      </g>
    `,
  };

  // Map any character name to its drawer and relative scale
  function getCharacterConfig(rawName) {
    const k = (rawName || '').toLowerCase().trim();
    if (k.includes('tiger')) return { drawer: AVATARS.tiger, scale: 1.1 };
    if (k.includes('lion')) return { drawer: AVATARS.lion, scale: 1.15 };
    if (k.includes('elephant')) return { drawer: AVATARS.elephant, scale: 1.35 };
    if (k.includes('wolf')) return { drawer: AVATARS.wolf, scale: 1.0 };
    if (k.includes('fox')) return { drawer: AVATARS.fox, scale: 0.9 };
    if (k.includes('mouse') || k.includes('rat') || k.includes('mice')) return { drawer: AVATARS.mouse, scale: 0.65 };
    if (k.includes('tortoise') || k.includes('turtle')) return { drawer: AVATARS.tortoise, scale: 0.85 };
    if (k.includes('hare') || k.includes('rabbit')) return { drawer: AVATARS.hare, scale: 0.9 };
    if (k.includes('crane') || k.includes('stork') || k.includes('heron')) return { drawer: AVATARS.crane, scale: 1.05 };
    if (k.includes('crow') || k.includes('raven') || k.includes('jackdaw') || k.includes('eagle')) return { drawer: AVATARS.crow, scale: 0.85 };
    if (k.includes('monkey')) return { drawer: AVATARS.monkey, scale: 0.85 };
    if (k.includes('dog')) return { drawer: AVATARS.dog, scale: 0.95 };
    if (k.includes('cat')) return { drawer: AVATARS.cat, scale: 0.85 };
    if (k.includes('sheep') || k.includes('lamb')) return { drawer: AVATARS.sheep, scale: 0.95 };
    if (k.includes('ox') || k.includes('bull') || k.includes('cow') || k.includes('bullock')) return { drawer: AVATARS.ox, scale: 1.25 };
    if (k.includes('goat') || k.includes('kid')) return { drawer: AVATARS.goat, scale: 0.95 };
    if (k.includes('donkey') || k.includes('ass') || k.includes('mule') || k.includes('horse')) return { drawer: AVATARS.donkey, scale: 1.05 };
    if (k.includes('rooster') || k.includes('cock') || k.includes('hen')) return { drawer: AVATARS.rooster, scale: 0.85 };
    if (k.includes('frog') || k.includes('toad')) return { drawer: AVATARS.frog, scale: 0.7 };
    if (k.includes('peacock')) return { drawer: AVATARS.peacock, scale: 1.05 };
    if (k.includes('owl')) return { drawer: AVATARS.owl, scale: 0.85 };
    if (k.includes('stag') || k.includes('deer')) return { drawer: AVATARS.stag, scale: 1.1 };
    if (k.includes('ant') || k.includes('bee') || k.includes('wasp') || k.includes('fly') || k.includes('gnat') || k.includes('grasshopper') || k.includes('beetle')) return { drawer: AVATARS.insect, scale: 0.6 };
    if (k.includes('boy') || k.includes('child')) return { drawer: AVATARS.boy, scale: 0.85 };
    if (k.includes('mother') || k.includes('milkmaid') || k.includes('woman')) return { drawer: AVATARS.woman, scale: 1.05 };
    if (k.includes('man') || k.includes('farmer') || k.includes('shepherd') || k.includes('woodman') || k.includes('father') || k.includes('traveller') || k.includes('miser') || k.includes('astrologer') || k.includes('boaster')) return { drawer: AVATARS.man, scale: 1.1 };
    if (k.includes('sun')) return { drawer: AVATARS.sun_char, scale: 1.0 };
    if (k.includes('wind')) return { drawer: AVATARS.wind_char, scale: 1.0 };
    if (k.includes('pot')) return { drawer: AVATARS.pots, scale: 0.9 };

    return { drawer: AVATARS.fox, scale: 0.9 }; // sensible fallback
  }

  // Interactive Story Props (Pitchers with rising water, Grapes, Nets, Finish Flags, etc.)
  function getStoryProps(story, isThumbnail = false, panelIndex = 0, totalPanels = 1) {
    const sid = (story.id || '').toLowerCase();
    const title = (story.title || '').toLowerCase();
    const scale = isThumbnail ? 0.65 : 1.0;

    // 1. CROW & PITCHER / WATER POT
    if (sid.includes('pitcher') || sid.includes('water_pot') || (title.includes('crow') && (title.includes('pot') || title.includes('pitcher')))) {
      const potX = isThumbnail ? 175 : 270;
      const potY = isThumbnail ? 70 : 130;
      const progress = isThumbnail ? 0.75 : panelIndex / Math.max(1, totalPanels - 1);
      const waterRise = Math.round(progress * 20);

      return `
        <g transform="translate(${potX}, ${potY}) scale(${scale})">
          <!-- Earthen Clay Pitcher Body -->
          <ellipse cx="35" cy="55" rx="22" ry="24" fill="#C2410C" />
          <ellipse cx="35" cy="55" rx="19" ry="21" fill="#EA580C" />
          <!-- Neck & Rim -->
          <path d="M22 36 L25 18 L45 18 L48 36 Z" fill="#C2410C" />
          <ellipse cx="35" cy="18" rx="10" ry="4" fill="#9A3412" />
          <ellipse cx="35" cy="19" rx="8" ry="3" fill="#EA580C" />
          
          <!-- Water inside pitcher (rising with pebbles!) -->
          <rect x="26" y="${36 - waterRise}" width="18" height="${18 + waterRise}" fill="#38BDF8" opacity="0.85" rx="3" />
          <ellipse cx="35" cy="${36 - waterRise}" rx="8" ry="2" fill="#7DD3FC" opacity="0.9" />

          <!-- Pebbles on the ground -->
          <ellipse cx="10" cy="72" rx="6" ry="4" fill="#475569" />
          <ellipse cx="20" cy="74" rx="5" ry="3.5" fill="#64748B" />
          <ellipse cx="60" cy="72" rx="6" ry="4" fill="#64748B" />
          
          ${progress > 0.2 ? `<ellipse cx="35" cy="${26 - waterRise}" rx="3.5" ry="2.5" fill="#334155" />` : ''}
        </g>
      `;
    }

    // 2. FOX & GRAPES
    if (sid.includes('grapes') || title.includes('grapes')) {
      const x = isThumbnail ? 150 : 250;
      const y = isThumbnail ? 8 : 15;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale * 1.1})">
          <path d="M-10 15 Q40 5 100 12" stroke="#78350F" stroke-width="5" stroke-linecap="round" fill="none" />
          <path d="M15 15 Q25 0 35 15 Q30 25 15 15 Z" fill="#22C55E" />
          <path d="M60 12 Q72 0 85 14 Q78 24 60 12 Z" fill="#16A34A" />
          <g transform="translate(25, 20)">
            <circle cx="0" cy="0" r="5" fill="#7E22CE" /><circle cx="8" cy="0" r="5" fill="#9333EA" />
            <circle cx="16" cy="0" r="5" fill="#7E22CE" /><circle cx="4" cy="7" r="5" fill="#A855F7" />
            <circle cx="12" cy="7" r="5" fill="#7E22CE" /><circle cx="8" cy="14" r="5" fill="#9333EA" />
            <circle cx="8" cy="20" r="4" fill="#6B21A8" />
          </g>
        </g>
      `;
    }

    // 3. TORTOISE & HARE (Race Finish Flag & Shady Leaf)
    if (sid.includes('tortoise') && sid.includes('hare')) {
      const x = isThumbnail ? 190 : 310;
      const y = isThumbnail ? 45 : 95;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <rect x="0" y="0" width="6" height="85" rx="2" fill="#78350F" />
          <polygon points="6,5 50,5 42,22 50,38 6,38" fill="#EF4444" />
          <polygon points="6,5 26,5 22,22 6,22" fill="#FFFFFF" />
          <text x="12" y="28" font-family="'Nunito', sans-serif" font-size="8" font-weight="900" fill="#B91C1C">GO!</text>
        </g>
      `;
    }

    // 4. LION / TIGER & MOUSE (Hunter's Net)
    if (sid.includes('mouse') && (sid.includes('lion') || sid.includes('tiger'))) {
      const x = isThumbnail ? 30 : 65;
      const y = isThumbnail ? 85 : 135;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})" opacity="0.85">
          <path d="M-10 10 L90 10 M-10 24 L90 24 M-10 38 L90 38 M-10 52 L90 52" stroke="#D97706" stroke-width="2.5" stroke-dasharray="4,4" />
          <path d="M10 0 L10 65 M30 0 L30 65 M50 0 L50 65 M70 0 L70 65" stroke="#D97706" stroke-width="2.5" stroke-dasharray="4,4" />
          ${panelIndex >= 4 ? `<line x1="30" y1="24" x2="25" y2="32" stroke="#B45309" stroke-width="2.5" /><line x1="50" y1="24" x2="55" y2="32" stroke="#B45309" stroke-width="2.5" />` : ''}
        </g>
      `;
    }

    // 5. DOG & SHADOW / REFLECTION (Bridge & Bone)
    if (sid.includes('shadow') || sid.includes('reflection')) {
      const x = isThumbnail ? 160 : 180;
      const y = isThumbnail ? 85 : 160;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <rect x="-40" y="0" width="120" height="12" rx="3" fill="#854D0E" />
          <path d="M-20 22 Q20 18 60 22 T100 21" stroke="#0284C7" stroke-width="2" fill="none" opacity="0.7" />
        </g>
      `;
    }

    // 6. FOX & CROW (Tree Branch & Yellow Cheese Wedge)
    if (sid.includes('fox_and_the_crow') || title.includes('fox and the crow')) {
      const x = isThumbnail ? 180 : 270;
      const y = isThumbnail ? 45 : 70;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <path d="M-30 40 Q20 30 60 35" stroke="#5D4037" stroke-width="8" stroke-linecap="round" fill="none" />
          ${
            panelIndex < 4
              ? `
            <g transform="translate(15, 10) rotate(-15)">
              <polygon points="0,20 28,0 35,20" fill="#FACC15" stroke="#EAB308" stroke-width="1.5" />
              <circle cx="15" cy="12" r="2.5" fill="#CA8A04" opacity="0.7" />
            </g>
          `
              : ''
          }
        </g>
      `;
    }

    // Default flowers & grass tufts
    const defX = isThumbnail ? 195 : 305;
    const defY = isThumbnail ? 75 : 145;
    return `
      <g transform="translate(${defX}, ${defY}) scale(${scale * 0.95})">
        <path d="M0 20 Q5 5 10 20 M12 20 Q16 2 20 20 M22 20 Q28 8 32 20" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <circle cx="10" cy="5" r="4" fill="#F43F5E" /><circle cx="20" cy="2" r="3.5" fill="#38BDF8" />
      </g>
    `;
  }

  // Rough.js Hand-Drawn Sketch Transformer
  function roughenSvg(svgString) {
    if (!global.rough) return svgString;
    const gen = global.rough.generator();

    return svgString.replace(/<(circle|rect|ellipse|polygon|line)\s+([^>]+)\/>/gi, (match, tag, attrsStr) => {
      const attrs = {};
      const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
      let m;
      while ((m = attrRegex.exec(attrsStr)) !== null) {
        attrs[m[1]] = m[2];
      }

      // Preserve background gradient rects and panel badges
      if (attrs.id && attrs.id.startsWith('skyGrad')) return match;
      if (attrs.width === '400' && attrs.height === '240') return match;
      if (attrs.width === '280' && attrs.height === '140') return match;
      if (attrs.fill && attrs.fill.startsWith('url(')) return match;
      if (attrs.rx === '12' && attrs.width === '70') return match; // badge

      const fill = attrs.fill && attrs.fill !== 'none' ? attrs.fill : undefined;
      const stroke = attrs.stroke && attrs.stroke !== 'none' ? attrs.stroke : fill ? '#374151' : undefined;
      const strokeWidth = parseFloat(attrs['stroke-width'] || (stroke ? '1.5' : '0'));

      const opt = {
        roughness: 0.85,
        bowing: 0.9,
        fill: fill,
        fillStyle: 'solid',
        stroke: stroke,
        strokeWidth: Math.max(1, strokeWidth),
      };

      let shape;
      if (tag === 'circle') {
        const cx = parseFloat(attrs.cx || 0);
        const cy = parseFloat(attrs.cy || 0);
        const r = parseFloat(attrs.r || 0);
        if (r <= 2.2) return match; // keep small eyes crisp
        shape = gen.circle(cx, cy, r * 2, opt);
      } else if (tag === 'ellipse') {
        const cx = parseFloat(attrs.cx || 0);
        const cy = parseFloat(attrs.cy || 0);
        const rx = parseFloat(attrs.rx || 0);
        const ry = parseFloat(attrs.ry || 0);
        shape = gen.ellipse(cx, cy, rx * 2, ry * 2, opt);
      } else if (tag === 'rect') {
        const x = parseFloat(attrs.x || 0);
        const y = parseFloat(attrs.y || 0);
        const w = parseFloat(attrs.width || 0);
        const h = parseFloat(attrs.height || 0);
        shape = gen.rectangle(x, y, w, h, opt);
      } else if (tag === 'line') {
        const x1 = parseFloat(attrs.x1 || 0);
        const y1 = parseFloat(attrs.y1 || 0);
        const x2 = parseFloat(attrs.x2 || 0);
        const y2 = parseFloat(attrs.y2 || 0);
        shape = gen.line(x1, y1, x2, y2, opt);
      }

      if (!shape) return match;
      const paths = gen.toPaths(shape);
      const transform = attrs.transform ? ` transform="${attrs.transform}"` : '';
      const opacity = attrs.opacity ? ` opacity="${attrs.opacity}"` : '';
      return `<g${transform}${opacity}>` + paths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" fill="${p.fill}" stroke-width="${p.strokeWidth}" />`).join('') + '</g>';
    });
  }

  // Generate complete story panel SVG
  function generatePanelSvg(story, panelIndex) {
    const totalPanels = (story.text && story.text.length) || 1;
    const sentence = (story.text && story.text[panelIndex]) || '';
    const sLower = sentence.toLowerCase();

    // Pick scenery
    let scenery = SCENERIES.meadow;
    if (story.theme === 'Nature' || sLower.includes('tree') || sLower.includes('forest')) scenery = SCENERIES.meadow;
    if (sLower.includes('river') || sLower.includes('water') || sLower.includes('stream') || sLower.includes('bridge')) scenery = SCENERIES.river;
    if (sLower.includes('courtyard') || sLower.includes('pot') || sLower.includes('pitcher')) scenery = SCENERIES.courtyard;
    if (story.theme === 'Mythology') scenery = SCENERIES.night;
    if (panelIndex === totalPanels - 1) scenery = SCENERIES.sunset;

    // Detect characters for stage layout
    const charList = story.character || [story.animal || 'fox'];
    const pCharName = charList[0] || story.animal || 'fox';
    const sCharName = charList[1] || null;

    const pConfig = getCharacterConfig(pCharName);
    const sConfig = sCharName ? getCharacterConfig(sCharName) : null;

    // Action detection
    const isSleeping = sLower.includes('sleep') || sLower.includes('asleep') || sLower.includes('nap');
    const isTrapped = sLower.includes('net') || sLower.includes('trap') || sLower.includes('caught');
    const isFlyingOrPerched = sLower.includes('flew') || sLower.includes('flying') || sLower.includes('perched') || sLower.includes('branch');
    const isJumping = sLower.includes('jump') || sLower.includes('leap');

    // Positions
    let pX = 85;
    let pY = 135;
    let pFlipped = false;

    let sX = 285;
    let sY = 135;
    let sFlipped = true; // face left toward character 1

    if (isJumping) {
      pY = 85;
    } else if (isFlyingOrPerched) {
      pY = 55;
    }

    // If solo character story
    const hasTwoCharacters = sConfig !== null && charList.length > 1;
    if (!hasTwoCharacters) {
      pX = 180;
      pY = isFlyingOrPerched ? 60 : 135;
    }

    const storyProps = getStoryProps(story, false, panelIndex, totalPanels);

    let cleanSvg = `
      <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" class="story-svg-canvas">
        <defs>
          <linearGradient id="skyGrad_${panelIndex}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${scenery.sky[0]}" />
            <stop offset="100%" stop-color="${scenery.sky[1] || scenery.sky[0]}" />
          </linearGradient>
        </defs>

        <!-- Sky Backdrop -->
        <rect width="400" height="240" fill="url(#skyGrad_${panelIndex})" />

        <!-- Celestial Body -->
        <circle cx="340" cy="45" r="24" fill="${scenery.sun || '#FFD54F'}" opacity="0.9" />

        <!-- Distant Hills -->
        <path d="M 0 160 Q 110 110 220 155 T 400 150 L 400 240 L 0 240 Z" fill="${scenery.groundDark}" opacity="0.75" />

        <!-- Foreground Ground -->
        <path d="M 0 175 Q 100 160 200 170 T 400 165 L 400 240 L 0 240 Z" fill="${scenery.ground}" />

        <!-- Story Narrative Props (pitcher, grapes, net, finish banner, bridge) -->
        ${storyProps}

        <!-- Character 1 (Protagonist, facing right) -->
        <g class="anim-character">
          ${pConfig.drawer(pX, pY, pConfig.scale, pFlipped)}
        </g>

        <!-- Character 2 (Companion/Antagonist, facing left) -->
        ${
          hasTwoCharacters
            ? `
          <g class="anim-character">
            ${sConfig.drawer(sX, sY, sConfig.scale, sFlipped)}
          </g>
        `
            : ''
        }

        <!-- Sleeping zZz Animation -->
        ${
          isSleeping
            ? `
          <g transform="translate(${pX + 20}, ${pY - 20})" fill="#9333EA" font-family="'Nunito', sans-serif" font-weight="900">
            <text x="0" y="0" font-size="14">z</text>
            <text x="8" y="-10" font-size="18">Z</text>
            <text x="18" y="-22" font-size="22">Z</text>
          </g>
        `
            : ''
        }

        <!-- Panel Badge -->
        <g transform="translate(10, 15)">
          <rect width="70" height="24" rx="12" fill="rgba(0,0,0,0.4)" />
          <text x="35" y="16" fill="#FFFFFF" font-family="'Nunito', sans-serif" font-size="11" font-weight="700" text-anchor="middle">
            Panel ${panelIndex + 1}/${totalPanels}
          </text>
        </g>
      </svg>
    `;

    return currentRenderMode === 'rough' ? roughenSvg(cleanSvg) : cleanSvg;
  }

  // Generate thumbnail SVG for story cards
  function generateThumbnailSvg(story) {
    const pConfig = getCharacterConfig(story.animal || (story.character && story.character[0]) || 'fox');
    const storyProps = getStoryProps(story, true, 0, 1);
    const uniqueId = (story.id || 'thumb').replace(/[^\w-]/g, '_');

    let cleanSvg = `
      <svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg" class="card-thumbnail-svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="thumbSky_${uniqueId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#87CEEB" />
            <stop offset="100%" stop-color="#E0F6FF" />
          </linearGradient>
        </defs>

        <rect width="280" height="140" fill="url(#thumbSky_${uniqueId})" />
        <circle cx="240" cy="26" r="16" fill="#FFD700" opacity="0.9" />
        <path d="M 0 95 Q 80 65 160 90 T 280 85 L 280 140 L 0 140 Z" fill="#5EAA59" opacity="0.75" />
        <path d="M 0 105 Q 90 90 190 100 T 280 95 L 280 140 L 0 140 Z" fill="#7BC676" />

        ${storyProps}

        <g transform="translate(45, 48)">
          ${pConfig.drawer(0, 0, pConfig.scale * 0.9, false)}
        </g>
      </svg>
    `;

    return currentRenderMode === 'rough' ? roughenSvg(cleanSvg) : cleanSvg;
  }

  global.SvgArt = {
    generatePanelSvg,
    generateThumbnailSvg,
    getStoryProps,
    getRenderMode,
    setRenderMode,
  };
})(window);
