/**
 * svg-art.js
 * Generates dynamic, animated, comic-style SVG illustrations and story-specific props.
 * Enriches every story with detailed visual items (e.g., Crow's water pot with pebbles,
 * Fox's hanging grapes, Tortoise & Hare finish flag, Lion & Mouse net, etc.).
 * Completely client-side, zero external dependencies, vector-sharp on any screen resolution.
 */

(function (global) {
  // Color palettes for backgrounds
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
  };

  // Comprehensive cute animal vector drawings
  const ANIMAL_AVATARS = {
    tiger: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.9)">
        <ellipse cx="60" cy="50" rx="35" ry="25" fill="#FF9800" />
        <ellipse cx="60" cy="54" rx="26" ry="18" fill="#FFE0B2" />
        <path d="M50 30 Q53 45 48 55 M60 28 Q63 42 58 55 M70 30 Q73 45 68 55" stroke="#3E2723" stroke-width="3" stroke-linecap="round" fill="none" />
        <circle cx="28" cy="35" r="24" fill="#FF9800" />
        <circle cx="12" cy="18" r="8" fill="#FF9800" />
        <circle cx="12" cy="18" r="4" fill="#3E2723" />
        <circle cx="44" cy="18" r="8" fill="#FF9800" />
        <circle cx="44" cy="18" r="4" fill="#3E2723" />
        <path d="M28 14 L28 24 M20 20 L26 23 M36 20 L30 23" stroke="#3E2723" stroke-width="2.5" stroke-linecap="round" />
        <ellipse cx="20" cy="42" rx="9" ry="7" fill="#FFE0B2" />
        <ellipse cx="36" cy="42" rx="9" ry="7" fill="#FFE0B2" />
        <circle cx="20" cy="32" r="3.5" fill="#3E2723" />
        <circle cx="21" cy="31" r="1.2" fill="#FFFFFF" />
        <circle cx="36" cy="32" r="3.5" fill="#3E2723" />
        <circle cx="37" cy="31" r="1.2" fill="#FFFFFF" />
        <polygon points="25,38 31,38 28,42" fill="#D84315" />
        <path d="M28 42 Q24 47 20 44 M28 42 Q32 47 36 44" stroke="#3E2723" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M92 45 Q115 40 110 20" stroke="#FF9800" stroke-width="7" stroke-linecap="round" fill="none" />
        <circle cx="45" cy="70" r="7" fill="#FF9800" />
        <circle cx="75" cy="70" r="7" fill="#FF9800" />
      </g>
    `,
    lion: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.9)">
        <circle cx="45" cy="45" r="38" fill="#D84315" />
        <path d="M20 20 Q10 45 25 70 Q45 90 70 75 Q90 55 80 25 Q60 5 45 10 Z" fill="#BF360C" opacity="0.4"/>
        <ellipse cx="85" cy="60" rx="35" ry="24" fill="#FFA726" />
        <circle cx="45" cy="45" r="25" fill="#FFA726" />
        <circle cx="28" cy="24" r="7" fill="#FFA726" />
        <circle cx="28" cy="24" r="4" fill="#D84315" />
        <circle cx="62" cy="24" r="7" fill="#FFA726" />
        <circle cx="62" cy="24" r="4" fill="#D84315" />
        <circle cx="37" cy="42" r="3.5" fill="#3E2723" />
        <circle cx="38" cy="41" r="1.2" fill="#FFFFFF" />
        <circle cx="53" cy="42" r="3.5" fill="#3E2723" />
        <circle cx="54" cy="41" r="1.2" fill="#FFFFFF" />
        <polygon points="41,49 49,49 45,54" fill="#4E342E" />
        <path d="M45 54 Q40 59 36 56 M45 54 Q50 59 54 56" stroke="#3E2723" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M118 55 Q135 50 130 35" stroke="#FFA726" stroke-width="5" fill="none" stroke-linecap="round" />
        <circle cx="130" cy="35" r="7" fill="#BF360C" />
      </g>
    `,
    wolf: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <path d="M78 50 Q105 45 95 30" stroke="#546E7A" stroke-width="6" fill="none" stroke-linecap="round" />
        <ellipse cx="50" cy="50" rx="30" ry="19" fill="#607D8B" />
        <polygon points="12,38 38,24 38,52" fill="#607D8B" />
        <polygon points="20,40 36,32 36,48" fill="#CFD8DC" />
        <polygon points="34,24 38,6 44,24" fill="#455A64" />
        <polygon points="26,25 28,8 34,25" fill="#455A64" />
        <polygon points="27,33 33,35 28,37" fill="#FFD54F" />
        <circle cx="29" cy="35" r="1.5" fill="#263238" />
        <circle cx="12" cy="38" r="2.5" fill="#212121" />
        <rect x="34" y="66" width="6" height="14" rx="3" fill="#455A64" />
        <rect x="62" y="66" width="6" height="14" rx="3" fill="#455A64" />
      </g>
    `,
    fox: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <path d="M75 50 Q110 40 100 20 Q85 30 70 42 Z" fill="#E65100" />
        <circle cx="98" cy="22" r="7" fill="#FFFFFF" />
        <ellipse cx="50" cy="50" rx="28" ry="18" fill="#F57C00" />
        <ellipse cx="45" cy="52" rx="18" ry="12" fill="#FFF3E0" />
        <polygon points="12,42 38,25 38,55" fill="#F57C00" />
        <polygon points="18,42 36,33 36,50" fill="#FFF3E0" />
        <polygon points="34,26 40,8 46,26" fill="#F57C00" />
        <polygon points="36,24 40,14 44,24" fill="#3E2723" />
        <polygon points="26,27 28,10 34,26" fill="#F57C00" />
        <ellipse cx="28" cy="37" rx="3.5" ry="2" fill="#3E2723" transform="rotate(-15 28 37)" />
        <circle cx="12" cy="42" r="2.5" fill="#212121" />
        <circle cx="35" cy="66" r="5" fill="#3E2723" />
        <circle cx="60" cy="66" r="5" fill="#3E2723" />
      </g>
    `,
    dog: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="55" cy="50" rx="28" ry="20" fill="#8D6E63" />
        <circle cx="30" cy="36" r="18" fill="#8D6E63" />
        <ellipse cx="18" cy="38" rx="6" ry="14" fill="#5D4037" transform="rotate(-15 18 38)" />
        <ellipse cx="42" cy="38" rx="6" ry="14" fill="#5D4037" transform="rotate(15 42 38)" />
        <ellipse cx="30" cy="44" rx="9" ry="7" fill="#D7CCC8" />
        <circle cx="30" cy="41" r="3" fill="#212121" />
        <circle cx="24" cy="32" r="3" fill="#212121" />
        <circle cx="25" cy="31" r="1" fill="#FFFFFF" />
        <circle cx="36" cy="32" r="3" fill="#212121" />
        <circle cx="37" cy="31" r="1" fill="#FFFFFF" />
        <path d="M80 48 Q98 35 92 20" stroke="#8D6E63" stroke-width="5" stroke-linecap="round" fill="none" />
        <circle cx="42" cy="68" r="6" fill="#5D4037" />
        <circle cx="68" cy="68" r="6" fill="#5D4037" />
      </g>
    `,
    cat: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="50" cy="50" rx="25" ry="18" fill="#FFB74D" />
        <circle cx="30" cy="34" r="16" fill="#FFB74D" />
        <polygon points="20,24 22,8 30,22" fill="#FFB74D" />
        <polygon points="22,22 23,12 28,21" fill="#FF8A65" />
        <polygon points="32,22 40,8 42,24" fill="#FFB74D" />
        <polygon points="34,21 39,12 40,22" fill="#FF8A65" />
        <ellipse cx="24" cy="34" rx="3" ry="4" fill="#43A047" />
        <ellipse cx="36" cy="34" rx="3" ry="4" fill="#43A047" />
        <circle cx="30" cy="40" r="2" fill="#E91E63" />
        <line x1="16" y1="40" x2="6" y2="38" stroke="#424242" stroke-width="1.5" />
        <line x1="16" y1="43" x2="6" y2="44" stroke="#424242" stroke-width="1.5" />
        <line x1="44" y1="40" x2="54" y2="38" stroke="#424242" stroke-width="1.5" />
        <line x1="44" y1="43" x2="54" y2="44" stroke="#424242" stroke-width="1.5" />
        <path d="M72 48 Q92 40 85 22" stroke="#FFB74D" stroke-width="4.5" fill="none" stroke-linecap="round" />
      </g>
    `,
    mouse: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <path d="M60 48 Q85 45 80 25" stroke="#F48FB1" stroke-width="3" fill="none" stroke-linecap="round" />
        <ellipse cx="38" cy="48" rx="24" ry="18" fill="#B0BEC5" />
        <ellipse cx="34" cy="50" rx="16" ry="12" fill="#ECEFF1" />
        <circle cx="20" cy="24" r="12" fill="#B0BEC5" />
        <circle cx="20" cy="24" r="7" fill="#F48FB1" />
        <circle cx="38" cy="22" r="11" fill="#B0BEC5" />
        <circle cx="38" cy="22" r="6" fill="#F48FB1" />
        <circle cx="22" cy="42" r="14" fill="#B0BEC5" />
        <circle cx="16" cy="38" r="3" fill="#263238" />
        <circle cx="17" cy="37" r="1" fill="#FFFFFF" />
        <circle cx="9" cy="45" r="3" fill="#E91E63" />
        <path d="M10 46 L2 43 M10 48 L2 50" stroke="#546E7A" stroke-width="1.5" />
      </g>
    `,
    donkey: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="55" cy="52" rx="30" ry="20" fill="#78909C" />
        <ellipse cx="25" cy="38" rx="15" ry="18" fill="#78909C" transform="rotate(-20 25 38)" />
        <ellipse cx="16" cy="46" rx="9" ry="7" fill="#ECEFF1" />
        <ellipse cx="26" cy="14" rx="4.5" ry="15" fill="#78909C" transform="rotate(-15 26 14)" />
        <ellipse cx="26" cy="14" rx="2.5" ry="10" fill="#CFD8DC" transform="rotate(-15 26 14)" />
        <ellipse cx="35" cy="16" rx="4.5" ry="15" fill="#78909C" transform="rotate(10 35 16)" />
        <circle cx="24" cy="34" r="3" fill="#263238" />
        <circle cx="25" cy="33" r="1" fill="#FFFFFF" />
        <circle cx="12" cy="46" r="1.5" fill="#37474F" />
        <rect x="36" y="68" width="6" height="15" rx="3" fill="#607D8B" />
        <rect x="68" y="68" width="6" height="15" rx="3" fill="#607D8B" />
        <path d="M85 52 Q95 62 90 75" stroke="#78909C" stroke-width="3" fill="none" />
      </g>
    `,
    crow: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="50" cy="45" rx="26" ry="20" fill="#263238" />
        <circle cx="30" cy="30" r="16" fill="#263238" />
        <polygon points="18,28 3,33 18,36" fill="#FFA000" />
        <circle cx="27" cy="27" r="3.5" fill="#FFFFFF" />
        <circle cx="26" cy="27" r="2" fill="#000000" />
        <path d="M45 35 Q70 30 65 55 Q45 55 45 35 Z" fill="#1C2833" />
        <polygon points="72,45 92,42 90,52 70,50" fill="#263238" />
        <line x1="42" y1="62" x2="40" y2="75" stroke="#FFA000" stroke-width="2.5" />
        <line x1="55" y1="62" x2="55" y2="75" stroke="#FFA000" stroke-width="2.5" />
      </g>
    `,
    eagle: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="50" cy="48" rx="24" ry="20" fill="#5D4037" />
        <circle cx="30" cy="30" r="16" fill="#FAFAFA" />
        <path d="M22 28 Q10 32 14 42 Q20 38 22 36 Z" fill="#FFB300" />
        <circle cx="28" cy="26" r="3" fill="#212121" />
        <circle cx="29" cy="25" r="1" fill="#FFFFFF" />
        <path d="M45 35 Q75 15 85 45 Q65 55 45 45 Z" fill="#4E342E" />
        <line x1="45" y1="65" x2="40" y2="76" stroke="#FFB300" stroke-width="3" />
        <line x1="55" y1="65" x2="55" y2="76" stroke="#FFB300" stroke-width="3" />
      </g>
    `,
    tortoise: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <path d="M20 50 Q50 15 80 50 Z" fill="#388E3C" />
        <path d="M25 50 Q50 20 75 50 Z" fill="#4CAF50" />
        <polygon points="40,32 60,32 66,45 50,50 34,45" fill="#2E7D32" stroke="#81C784" stroke-width="1.5" />
        <ellipse cx="14" cy="46" rx="11" ry="8" fill="#81C784" />
        <circle cx="10" cy="44" r="2.5" fill="#1B5E20" />
        <circle cx="10" cy="43" r="0.8" fill="#FFFFFF" />
        <ellipse cx="28" cy="54" rx="7" ry="5" fill="#81C784" />
        <ellipse cx="72" cy="54" rx="7" ry="5" fill="#81C784" />
      </g>
    `,
    hare: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="50" cy="52" rx="25" ry="18" fill="#BCAAA4" />
        <circle cx="30" cy="40" r="15" fill="#BCAAA4" />
        <ellipse cx="25" cy="16" rx="5" ry="16" fill="#BCAAA4" transform="rotate(-10 25 16)" />
        <ellipse cx="25" cy="16" rx="2.5" ry="11" fill="#F8BBD0" transform="rotate(-10 25 16)" />
        <ellipse cx="36" cy="18" rx="5" ry="16" fill="#BCAAA4" transform="rotate(10 36 18)" />
        <ellipse cx="36" cy="18" rx="2.5" ry="11" fill="#F8BBD0" transform="rotate(10 36 18)" />
        <circle cx="25" cy="38" r="3" fill="#4E342E" />
        <circle cx="18" cy="44" r="2" fill="#E91E63" />
        <circle cx="75" cy="50" r="7" fill="#EFEBE9" />
      </g>
    `,
    monkey: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <path d="M75 50 Q110 65 95 30 Q85 10 75 25" stroke="#795548" stroke-width="4.5" fill="none" stroke-linecap="round" />
        <ellipse cx="50" cy="52" rx="24" ry="20" fill="#795548" />
        <ellipse cx="48" cy="53" rx="15" ry="13" fill="#D7CCC8" />
        <circle cx="34" cy="34" r="18" fill="#795548" />
        <circle cx="18" cy="34" r="7" fill="#D7CCC8" />
        <circle cx="50" cy="34" r="7" fill="#D7CCC8" />
        <ellipse cx="32" cy="38" rx="12" ry="9" fill="#D7CCC8" />
        <circle cx="28" cy="33" r="3" fill="#3E2723" />
        <circle cx="38" cy="33" r="3" fill="#3E2723" />
        <path d="M30 42 Q34 46 38 42" stroke="#5D4037" stroke-width="2" fill="none" stroke-linecap="round" />
      </g>
    `,
    frog: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="45" cy="48" rx="25" ry="20" fill="#4CAF50" />
        <ellipse cx="45" cy="52" rx="18" ry="13" fill="#C8E6C9" />
        <circle cx="30" cy="28" r="10" fill="#4CAF50" />
        <circle cx="30" cy="28" r="6" fill="#FFFFFF" />
        <circle cx="30" cy="28" r="3.5" fill="#1B5E20" />
        <circle cx="60" cy="28" r="10" fill="#4CAF50" />
        <circle cx="60" cy="28" r="6" fill="#FFFFFF" />
        <circle cx="60" cy="28" r="3.5" fill="#1B5E20" />
        <path d="M25 45 Q45 58 65 45" stroke="#2E7D32" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <ellipse cx="18" cy="55" rx="8" ry="5" fill="#4CAF50" />
        <ellipse cx="72" cy="55" rx="8" ry="5" fill="#4CAF50" />
      </g>
    `,
    goat: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="50" cy="52" rx="26" ry="19" fill="#ECEFF1" />
        <circle cx="26" cy="38" r="15" fill="#ECEFF1" />
        <path d="M25 24 Q30 8 40 12" stroke="#78909C" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <path d="M20 25 Q23 10 32 14" stroke="#78909C" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <ellipse cx="36" cy="32" rx="7" ry="3" fill="#CFD8DC" transform="rotate(25 36 32)" />
        <polygon points="16,48 20,60 24,48" fill="#CFD8DC" />
        <circle cx="22" cy="34" r="2.5" fill="#263238" />
        <rect x="34" y="68" width="5" height="12" rx="2" fill="#90A4AE" />
        <rect x="62" y="68" width="5" height="12" rx="2" fill="#90A4AE" />
      </g>
    `,
    bear: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="55" cy="52" rx="32" ry="24" fill="#6D4C41" />
        <circle cx="32" cy="36" r="20" fill="#6D4C41" />
        <circle cx="18" cy="20" r="7" fill="#6D4C41" />
        <circle cx="18" cy="20" r="4" fill="#A1887F" />
        <circle cx="44" cy="20" r="7" fill="#6D4C41" />
        <circle cx="44" cy="20" r="4" fill="#A1887F" />
        <ellipse cx="28" cy="42" rx="10" ry="8" fill="#D7CCC8" />
        <polygon points="25,38 31,38 28,42" fill="#3E2723" />
        <circle cx="24" cy="32" r="3" fill="#212121" />
        <circle cx="36" cy="32" r="3" fill="#212121" />
        <rect x="38" y="70" width="8" height="14" rx="4" fill="#4E342E" />
        <rect x="68" y="70" width="8" height="14" rx="4" fill="#4E342E" />
      </g>
    `,
    fish: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.9)">
        <ellipse cx="50" cy="45" rx="28" ry="18" fill="#FF7043" />
        <polygon points="76,45 96,30 90,45 96,60" fill="#FF5722" />
        <path d="M40 27 Q55 15 65 27 Z" fill="#FF5722" />
        <circle cx="32" cy="40" r="5" fill="#FFFFFF" />
        <circle cx="31" cy="40" r="2.8" fill="#212121" />
        <circle cx="32" cy="39" r="1" fill="#FFFFFF" />
        <circle cx="16" cy="35" r="3" fill="#80D8FF" opacity="0.8" />
        <circle cx="10" cy="25" r="2" fill="#80D8FF" opacity="0.6" />
      </g>
    `,
    crab: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="50" cy="50" rx="25" ry="18" fill="#E53935" />
        <path d="M26 38 Q10 25 15 15 Q25 18 24 30" fill="#D32F2F" />
        <path d="M74 38 Q90 25 85 15 Q75 18 76 30" fill="#D32F2F" />
        <line x1="38" y1="35" x2="36" y2="22" stroke="#E53935" stroke-width="4" stroke-linecap="round" />
        <circle cx="36" cy="20" r="4.5" fill="#FFFFFF" />
        <circle cx="36" cy="20" r="2.5" fill="#000000" />
        <line x1="62" y1="35" x2="64" y2="22" stroke="#E53935" stroke-width="4" stroke-linecap="round" />
        <circle cx="64" cy="20" r="4.5" fill="#FFFFFF" />
        <circle cx="64" cy="20" r="2.5" fill="#000000" />
      </g>
    `,
    rooster: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <path d="M65 45 Q85 15 95 35 Q80 40 68 50 Z" fill="#00897B" />
        <circle cx="50" cy="48" r="18" fill="#FF8F00" />
        <circle cx="34" cy="30" r="12" fill="#FF8F00" />
        <path d="M28 20 Q34 10 40 20 Z" fill="#E53935" />
        <polygon points="24,28 14,32 24,35" fill="#FDD835" />
        <circle cx="30" cy="28" r="2.5" fill="#000000" />
        <line x1="44" y1="64" x2="42" y2="76" stroke="#F57F17" stroke-width="2.5" />
        <line x1="54" y1="64" x2="54" y2="76" stroke="#F57F17" stroke-width="2.5" />
      </g>
    `,
    default_animal: (x, y) => `
      <g transform="translate(${x}, ${y}) scale(0.85)">
        <ellipse cx="50" cy="50" rx="26" ry="20" fill="#8D6E63" />
        <circle cx="32" cy="35" r="16" fill="#A1887F" />
        <circle cx="22" cy="22" r="7" fill="#8D6E63" />
        <circle cx="42" cy="22" r="7" fill="#8D6E63" />
        <ellipse cx="30" cy="40" rx="8" ry="6" fill="#D7CCC8" />
        <circle cx="26" cy="34" r="3" fill="#3E2723" />
        <circle cx="27" cy="33" r="1" fill="#FFFFFF" />
        <circle cx="36" cy="34" r="3" fill="#3E2723" />
        <circle cx="37" cy="33" r="1" fill="#FFFFFF" />
        <circle cx="30" cy="39" r="2" fill="#5D4037" />
        <circle cx="75" cy="50" r="6" fill="#D7CCC8" />
      </g>
    `,
  };

  /**
   * Generates specific, rich visual props matching the exact narrative elements of a fable!
   * E.g. Clay water pitcher with pebbles for Crow, Grape vine for Fox, Racing banner for Tortoise & Hare,
   * Hunter's net for Lion/Tiger, Bridge reflection for Dog & Shadow, etc.
   */
  function getStoryProps(story, isThumbnail = false, panelIndex = 0, totalPanels = 1) {
    const sid = (story.id || '').toLowerCase();
    const title = (story.title || '').toLowerCase();
    const scale = isThumbnail ? 0.65 : 1.0;

    // 1. CROW & PITCHER / WATER POT (Pitcher + pebbles + water level rising!)
    if (sid.includes('pitcher') || sid.includes('water_pot') || (title.includes('crow') && (title.includes('pot') || title.includes('pitcher')))) {
      const potX = isThumbnail ? 175 : 275;
      const potY = isThumbnail ? 70 : 135;
      const progress = isThumbnail ? 0.75 : panelIndex / Math.max(1, totalPanels - 1);
      const waterRise = Math.round(progress * 18);

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

          <!-- Clay Pitcher Handle -->
          <path d="M47 24 Q58 35 48 46" stroke="#9A3412" stroke-width="4.5" fill="none" stroke-linecap="round" />

          <!-- Pebbles on the ground -->
          <ellipse cx="10" cy="72" rx="6" ry="4" fill="#475569" />
          <ellipse cx="20" cy="74" rx="5" ry="3.5" fill="#64748B" />
          <ellipse cx="5" cy="75" rx="4" ry="2.5" fill="#334155" />
          <ellipse cx="60" cy="72" rx="6" ry="4" fill="#64748B" />
          <ellipse cx="68" cy="74" rx="4.5" ry="3" fill="#475569" />
          
          <!-- Pebble falling into pitcher if panel > 1 -->
          ${
            progress > 0.2
              ? `
            <ellipse cx="35" cy="${28 - waterRise}" rx="3.5" ry="2.5" fill="#334155" />
          `
              : ''
          }
        </g>
      `;
    }

    // 2. FOX & GRAPES (Overhead Grapevine with purple grape clusters!)
    if (sid.includes('grapes') || title.includes('grapes')) {
      const x = isThumbnail ? 150 : 250;
      const y = isThumbnail ? 8 : 15;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale * 1.1})">
          <!-- Wooden Trellis / Vine Branch -->
          <path d="M-10 15 Q40 5 100 12" stroke="#78350F" stroke-width="5" stroke-linecap="round" fill="none" />
          <!-- Green Vine Leaves -->
          <path d="M15 15 Q25 0 35 15 Q30 25 15 15 Z" fill="#22C55E" />
          <path d="M60 12 Q72 0 85 14 Q78 24 60 12 Z" fill="#16A34A" />
          <!-- Grape Bunch 1 -->
          <g transform="translate(25, 20)">
            <circle cx="0" cy="0" r="5" fill="#7E22CE" /><circle cx="8" cy="0" r="5" fill="#9333EA" />
            <circle cx="16" cy="0" r="5" fill="#7E22CE" /><circle cx="4" cy="7" r="5" fill="#A855F7" />
            <circle cx="12" cy="7" r="5" fill="#7E22CE" /><circle cx="8" cy="14" r="5" fill="#9333EA" />
            <circle cx="8" cy="20" r="4" fill="#6B21A8" />
          </g>
          <!-- Grape Bunch 2 -->
          <g transform="translate(68, 18) scale(0.9)">
            <circle cx="0" cy="0" r="5" fill="#9333EA" /><circle cx="8" cy="0" r="5" fill="#7E22CE" />
            <circle cx="4" cy="7" r="5" fill="#7E22CE" /><circle cx="12" cy="7" r="5" fill="#A855F7" />
            <circle cx="8" cy="14" r="4.5" fill="#6B21A8" />
          </g>
        </g>
      `;
    }

    // 3. TORTOISE & HARE (Race Finish Banner & Banana Leaf!)
    if ((sid.includes('tortoise') && sid.includes('hare')) || (title.includes('tortoise') && title.includes('hare'))) {
      const x = isThumbnail ? 190 : 310;
      const y = isThumbnail ? 45 : 95;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <!-- Wooden Post -->
          <rect x="0" y="0" width="6" height="85" rx="2" fill="#78350F" />
          <!-- Finish Line Flag -->
          <polygon points="6,5 50,5 42,22 50,38 6,38" fill="#EF4444" />
          <polygon points="6,5 26,5 22,22 6,22" fill="#FFFFFF" />
          <polygon points="26,22 46,22 50,38 28,38" fill="#FFFFFF" />
          <text x="12" y="28" font-family="'Nunito', sans-serif" font-size="8" font-weight="900" fill="#B91C1C">GO!</text>
          <!-- Shady Banana Leaf on ground -->
          <path d="M-40 82 Q-20 65 5 78 Q-10 88 -40 82 Z" fill="#16A34A" opacity="0.8" />
        </g>
      `;
    }

    // 4. MONKEY & COCONUT (Coconut Palm & Cracked Coconut with meat!)
    if (sid.includes('coconut') || title.includes('coconut')) {
      const x = isThumbnail ? 180 : 285;
      const y = isThumbnail ? 75 : 145;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <!-- Big Cracked Coconut Half -->
          <ellipse cx="20" cy="20" rx="15" ry="12" fill="#5D4037" />
          <ellipse cx="20" cy="20" rx="11" ry="8" fill="#FAFAFA" />
          <!-- Coconut Water reflection -->
          <ellipse cx="20" cy="21" rx="6" ry="4" fill="#E0F2FE" />
          <!-- Coconut Husk Shell Fragment -->
          <path d="M38 18 Q48 12 45 28 Z" fill="#4E342E" />
          <!-- Palm Leaves Overhead -->
          <path d="M-10 -50 Q20 -30 40 -10 Q10 -25 -10 -50 Z" fill="#2E7D32" />
        </g>
      `;
    }

    // 5. LION & MOUSE / TIGER & MICE (Hunter's Net & Chewed Rope!)
    if ((sid.includes('mouse') && (sid.includes('lion') || sid.includes('tiger'))) || (title.includes('mouse') && (title.includes('lion') || title.includes('tiger')))) {
      const x = isThumbnail ? 30 : 60;
      const y = isThumbnail ? 85 : 155;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})" opacity="0.85">
          <!-- Hunter's Net Lines -->
          <path d="M-10 10 L80 10 M-10 22 L80 22 M-10 34 L80 34" stroke="#D97706" stroke-width="2.5" stroke-dasharray="3,3" />
          <path d="M10 0 L10 45 M30 0 L30 45 M50 0 L50 45 M70 0 L70 45" stroke="#D97706" stroke-width="2.5" stroke-dasharray="3,3" />
          <!-- Chewed broken rope fibers -->
          <line x1="30" y1="22" x2="25" y2="28" stroke="#B45309" stroke-width="2" />
          <line x1="50" y1="22" x2="55" y2="28" stroke="#B45309" stroke-width="2" />
        </g>
      `;
    }

    // 6. DOG & SHADOW / REFLECTION (Bridge Plank, Bone, and Stream Reflection!)
    if (sid.includes('shadow') || sid.includes('reflection')) {
      const x = isThumbnail ? 160 : 255;
      const y = isThumbnail ? 85 : 155;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <!-- Wooden Footbridge Plank -->
          <rect x="-30" y="0" width="100" height="12" rx="3" fill="#854D0E" />
          <!-- Dog's Delicious Bone on bridge -->
          <g transform="translate(15, -12)">
            <rect x="5" y="4" width="20" height="6" rx="2" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" />
            <circle cx="4" cy="4" r="3.5" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1" />
            <circle cx="4" cy="10" r="3.5" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1" />
            <circle cx="26" cy="4" r="3.5" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1" />
            <circle cx="26" cy="10" r="3.5" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1" />
          </g>
          <!-- Water Ripples below -->
          <path d="M-15 25 Q15 20 45 25 T80 24" stroke="#0284C7" stroke-width="2" fill="none" opacity="0.7" />
        </g>
      `;
    }

    // 7. FOX & CROW (Crow holding Yellow Cheese Wedge!)
    if (sid.includes('fox_and_the_crow') || title.includes('fox and the crow')) {
      const x = isThumbnail ? 180 : 290;
      const y = isThumbnail ? 45 : 75;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <!-- Tree Branch -->
          <path d="M-30 40 Q20 30 60 35" stroke="#5D4037" stroke-width="7" stroke-linecap="round" fill="none" />
          <!-- Big Yellow Cheese Wedge with holes -->
          <g transform="translate(10, 8) rotate(-15)">
            <polygon points="0,20 28,0 35,20" fill="#FACC15" stroke="#EAB308" stroke-width="1.5" />
            <ellipse cx="14" cy="14" rx="2.5" ry="3.5" fill="#CA8A04" opacity="0.6" />
            <circle cx="24" cy="10" r="2" fill="#CA8A04" opacity="0.6" />
            <circle cx="18" cy="8" r="1.5" fill="#CA8A04" opacity="0.6" />
          </g>
        </g>
      `;
    }

    // 8. COCK & JEWEL (Glittering Faceted Diamond in Straw!)
    if (sid.includes('jewel') || title.includes('jewel')) {
      const x = isThumbnail ? 185 : 285;
      const y = isThumbnail ? 80 : 155;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale * 1.1})">
          <!-- Straw bits -->
          <line x1="-15" y1="12" x2="15" y2="10" stroke="#FBBF24" stroke-width="2" stroke-linecap="round" />
          <line x1="-5" y1="15" x2="25" y2="12" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" />
          <!-- Sparkling Diamond Gemstone -->
          <polygon points="12,0 24,0 32,8 18,22 4,8" fill="#38BDF8" stroke="#0284C7" stroke-width="1.5" />
          <polygon points="12,0 24,0 20,8 16,8" fill="#E0F2FE" />
          <polygon points="16,8 20,8 18,22" fill="#BAE6FD" />
          <!-- Sparkle Star ✨ -->
          <path d="M30 -5 L32 -1 L36 0 L32 1 L30 5 L28 1 L24 0 L28 -1 Z" fill="#FDE047" />
        </g>
      `;
    }

    // 9. ANTS & GRASSHOPPER (Grain mound + Grasshopper's tiny fiddle/violin!)
    if (sid.includes('grasshopper') || title.includes('grasshopper')) {
      const x = isThumbnail ? 175 : 280;
      const y = isThumbnail ? 75 : 145;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <!-- Mound of Golden Winter Grain -->
          <ellipse cx="20" cy="25" rx="25" ry="12" fill="#F59E0B" />
          <circle cx="12" cy="18" r="3" fill="#FDE047" /><circle cx="22" cy="16" r="3" fill="#FDE047" /><circle cx="28" cy="20" r="3" fill="#FDE047" />
          <!-- Little Violin / Fiddle leaning on mound -->
          <g transform="translate(38, -5) rotate(25)">
            <ellipse cx="10" cy="15" rx="8" ry="12" fill="#B45309" />
            <rect x="8" y="-10" width="4" height="26" fill="#78350F" />
            <line x1="10" y1="-8" x2="10" y2="24" stroke="#FEF08A" stroke-width="1" />
            <!-- Bow -->
            <line x1="-4" y1="-5" x2="24" y2="28" stroke="#D97706" stroke-width="1.5" />
          </g>
        </g>
      `;
    }

    // 10. GOOSE & GOLDEN EGG (Straw Nest + Gleaming Golden Egg!)
    if (sid.includes('golden_egg') || title.includes('golden egg')) {
      const x = isThumbnail ? 180 : 280;
      const y = isThumbnail ? 75 : 145;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <!-- Woven Straw Nest -->
          <ellipse cx="25" cy="25" rx="25" ry="12" fill="#D97706" />
          <path d="M0 25 Q25 35 50 25" stroke="#B45309" stroke-width="3" fill="none" />
          <!-- The Golden Egg! -->
          <ellipse cx="25" cy="16" rx="12" ry="16" fill="#FBBF24" stroke="#F59E0B" stroke-width="1.5" />
          <!-- Golden Glint / Sparkle -->
          <ellipse cx="21" cy="11" rx="4" ry="6" fill="#FEF08A" opacity="0.9" transform="rotate(-20 21 11)" />
        </g>
      `;
    }

    // 11. BUNDLE OF STICKS (Tied bundle of wooden sticks with twine rope!)
    if (sid.includes('bundle') || title.includes('bundle')) {
      const x = isThumbnail ? 180 : 280;
      const y = isThumbnail ? 75 : 145;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <!-- Group of Sticks -->
          <rect x="0" y="5" width="55" height="5" rx="2" fill="#78350F" />
          <rect x="2" y="10" width="52" height="5" rx="2" fill="#92400E" />
          <rect x="-2" y="15" width="56" height="5" rx="2" fill="#78350F" />
          <rect x="1" y="20" width="53" height="5" rx="2" fill="#A16207" />
          <!-- Twine Rope Binding Center -->
          <rect x="22" y="3" width="8" height="24" rx="2" fill="#EAB308" stroke="#CA8A04" stroke-width="1" />
        </g>
      `;
    }

    // 12. MILKMAID & HER PAIL (Silver Milk Pail & Spilled Milk Splash!)
    if (sid.includes('milkmaid') || title.includes('pail')) {
      const x = isThumbnail ? 175 : 280;
      const y = isThumbnail ? 75 : 145;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <!-- Tipped Shiny Silver Pail -->
          <g transform="translate(10, 10) rotate(40)">
            <path d="M0 10 L8 35 L26 35 L34 10 Z" fill="#94A3B8" stroke="#64748B" stroke-width="2" />
            <ellipse cx="17" cy="10" rx="17" ry="5" fill="#CBD5E1" />
            <path d="M-2 10 Q17 -5 36 10" stroke="#475569" stroke-width="2" fill="none" />
          </g>
          <!-- Fresh White Milk Splash -->
          <path d="M25 28 Q45 22 55 32 Q40 38 25 28 Z" fill="#FFFFFF" />
          <circle cx="62" cy="31" r="3" fill="#FFFFFF" />
        </g>
      `;
    }

    // 13. FOX & STORK (Shallow Dish & Tall Narrow-Necked Vase!)
    if (sid.includes('stork') || title.includes('stork')) {
      const x = isThumbnail ? 175 : 280;
      const y = isThumbnail ? 65 : 135;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <!-- Shallow Flat Plate -->
          <ellipse cx="10" cy="35" rx="18" ry="4" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5" />
          <!-- Tall Narrow-Necked Jar for the Stork -->
          <path d="M38 10 L44 10 L43 24 Q52 35 45 42 Q36 42 36 32 Z" fill="#EA580C" stroke="#C2410C" stroke-width="1.5" />
          <ellipse cx="41" cy="10" rx="3.5" ry="1.5" fill="#7C2D12" />
        </g>
      `;
    }

    // Default nature flora (little flowering bush + butterfly or stone)
    const defX = isThumbnail ? 195 : 305;
    const defY = isThumbnail ? 75 : 145;
    return `
      <g transform="translate(${defX}, ${defY}) scale(${scale * 0.95})">
        <!-- Wildflowers & Grass Patch -->
        <path d="M0 20 Q5 5 10 20 M12 20 Q16 2 20 20 M22 20 Q28 8 32 20" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <!-- Pink/Yellow Flower Blossom -->
        <circle cx="10" cy="5" r="4" fill="#F43F5E" />
        <circle cx="10" cy="5" r="2" fill="#FDE047" />
        <circle cx="20" cy="2" r="3.5" fill="#38BDF8" />
        <circle cx="20" cy="2" r="1.5" fill="#FEF08A" />
      </g>
    `;
  }

  function getAnimalRenderer(animalKey) {
    const key = (animalKey || '').toLowerCase();
    if (key.includes('tiger')) return ANIMAL_AVATARS.tiger;
    if (key.includes('lion')) return ANIMAL_AVATARS.lion;
    if (key.includes('wolf')) return ANIMAL_AVATARS.wolf;
    if (key.includes('fox')) return ANIMAL_AVATARS.fox;
    if (key.includes('dog')) return ANIMAL_AVATARS.dog;
    if (key.includes('cat')) return ANIMAL_AVATARS.cat;
    if (key.includes('mouse') || key.includes('rat') || key.includes('mice')) return ANIMAL_AVATARS.mouse;
    if (key.includes('donkey') || key.includes('ass') || key.includes('mule')) return ANIMAL_AVATARS.donkey;
    if (key.includes('crow') || key.includes('raven')) return ANIMAL_AVATARS.crow;
    if (key.includes('eagle') || key.includes('hawk') || key.includes('kite')) return ANIMAL_AVATARS.eagle;
    if (key.includes('tortoise') || key.includes('turtle')) return ANIMAL_AVATARS.tortoise;
    if (key.includes('hare') || key.includes('rabbit')) return ANIMAL_AVATARS.hare;
    if (key.includes('monkey')) return ANIMAL_AVATARS.monkey;
    if (key.includes('frog') || key.includes('toad')) return ANIMAL_AVATARS.frog;
    if (key.includes('goat')) return ANIMAL_AVATARS.goat;
    if (key.includes('bear')) return ANIMAL_AVATARS.bear;
    if (key.includes('fish')) return ANIMAL_AVATARS.fish;
    if (key.includes('crab')) return ANIMAL_AVATARS.crab;
    if (key.includes('rooster') || key.includes('cock') || key.includes('hen')) return ANIMAL_AVATARS.rooster;
    return ANIMAL_AVATARS.default_animal;
  }

  function chooseScenery(theme, panelIndex, totalPanels) {
    if (theme === 'Nature') return SCENERIES.meadow;
    if (theme === 'Mythology') return SCENERIES.night;
    if (theme === 'Family') return SCENERIES.village;
    if (theme === 'Life Lessons') return panelIndex % 2 === 0 ? SCENERIES.village : SCENERIES.sunset;

    const ratio = panelIndex / Math.max(1, totalPanels - 1);
    if (ratio > 0.8) return SCENERIES.sunset;
    if (panelIndex % 3 === 0) return SCENERIES.river;
    if (panelIndex % 2 === 0) return SCENERIES.jungle;
    return SCENERIES.meadow;
  }

  /**
   * Generates a compact, vibrant SVG thumbnail with both the Animal and Story-Specific Props!
   * @param {Object} story
   * @returns {string} Safe SVG markup
   */
  function generateThumbnailSvg(story) {
    const animalDrawer = getAnimalRenderer(story.animal);
    const storyProps = getStoryProps(story, true, 0, 1);
    const theme = story.theme || 'Animals';

    let skyGrad = ['#87CEEB', '#E0F6FF'];
    let hillColor = '#7BC676';
    let sunColor = '#FFD700';

    if (theme === 'Life Lessons') {
      skyGrad = ['#fbc2eb', '#a6c1ee'];
      hillColor = '#a3e635';
    } else if (theme === 'Family') {
      skyGrad = ['#fef3c7', '#fed7aa'];
      hillColor = '#84cc16';
    } else if (theme === 'Nature') {
      skyGrad = ['#67e8f9', '#bae6fd'];
      hillColor = '#4ade80';
    } else if (theme === 'Mythology') {
      skyGrad = ['#312e81', '#4c1d95'];
      hillColor = '#1e1b4b';
      sunColor = '#fef08a';
    }

    const uniqueId = (story.id || 'thumb').replace(/[^\w-]/g, '_');

    return `
      <svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg" class="card-thumbnail-svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="thumbSky_${uniqueId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${skyGrad[0]}" />
            <stop offset="100%" stop-color="${skyGrad[1]}" />
          </linearGradient>
        </defs>

        <!-- Sky Background -->
        <rect width="280" height="140" fill="url(#thumbSky_${uniqueId})" />

        <!-- Celestial Body -->
        <circle cx="240" cy="26" r="16" fill="${sunColor}" opacity="0.9" />

        <!-- Fluffy Mini Cloud -->
        <path d="M 25 30 Q 35 20 50 25 Q 60 18 75 25 Q 85 25 88 33 Q 78 40 30 40 Z" fill="#FFFFFF" opacity="0.8" />

        <!-- Distant Hill -->
        <path d="M 0 95 Q 80 65 160 90 T 280 85 L 280 140 L 0 140 Z" fill="${hillColor}" opacity="0.75" />

        <!-- Foreground Rolling Hill -->
        <path d="M 0 105 Q 90 90 190 100 T 280 95 L 280 140 L 0 140 Z" fill="${hillColor}" />

        <!-- Story Narrative Props (e.g., Pitcher + Pebbles, Grapevine, Cheese, Net, Finish Line) -->
        ${storyProps}

        <!-- Centered Animal Avatar -->
        <g transform="translate(45, 48) scale(0.92)">
          ${animalDrawer(0, 0)}
        </g>
      </svg>
    `;
  }

  /**
   * Generates a complete SVG string for a story panel with animated scenery, animal, and story props.
   * @param {Object} story - Story metadata object
   * @param {number} panelIndex - Current panel / sentence index (0-based)
   * @returns {string} Safe SVG markup string
   */
  function generatePanelSvg(story, panelIndex) {
    const totalPanels = (story.text && story.text.length) || 1;
    const scenery = chooseScenery(story.theme, panelIndex, totalPanels);
    const animalDrawer = getAnimalRenderer(story.animal);
    const storyProps = getStoryProps(story, false, panelIndex, totalPanels);

    const xOffset = 50 + ((panelIndex * 40) % 180);
    const yOffset = 130 + (panelIndex % 2 === 0 ? 10 : 22);
    const sunColor = scenery.sun || '#FFD54F';
    const isNight = scenery.sky[0] === '#0f2027';

    return `
      <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" class="story-svg-canvas">
        <defs>
          <linearGradient id="skyGrad_${panelIndex}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${scenery.sky[0]}" />
            <stop offset="100%" stop-color="${scenery.sky[1] || scenery.sky[0]}" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Sky Backdrop -->
        <rect width="400" height="240" fill="url(#skyGrad_${panelIndex})" />

        <!-- Celestial Body -->
        ${
          isNight
            ? `
          <circle cx="340" cy="50" r="22" fill="#FFF9C4" filter="url(#softGlow)" />
          <circle cx="348" cy="46" r="18" fill="${scenery.sky[0]}" />
          <circle cx="60" cy="30" r="1.8" fill="#FFFDE7" />
          <circle cx="120" cy="65" r="1.5" fill="#FFFDE7" />
          <circle cx="200" cy="40" r="2.2" fill="#FFFDE7" />
          <circle cx="270" cy="75" r="1.6" fill="#FFFDE7" />
        `
            : `
          <g class="anim-sun">
            <circle cx="340" cy="45" r="26" fill="${sunColor}" filter="url(#softGlow)" opacity="0.9" />
            <circle cx="340" cy="45" r="20" fill="#FFF9C4" />
          </g>
          <g class="anim-cloud" opacity="0.85">
            <path d="M 40 50 Q 55 35 75 45 Q 90 35 105 45 Q 120 45 125 55 Q 110 65 50 65 Z" fill="#FFFFFF" />
          </g>
          <g class="anim-cloud-slow" opacity="0.7">
            <path d="M 210 65 Q 225 55 240 60 Q 255 52 270 60 Q 280 65 275 75 Q 240 80 215 75 Z" fill="#FFFFFF" />
          </g>
        `
        }

        <!-- Distant Hills -->
        <path d="M 0 160 Q 110 110 220 155 T 400 150 L 400 240 L 0 240 Z" fill="${scenery.groundDark}" opacity="0.75" />

        <!-- Foreground Ground -->
        <path d="M 0 175 Q 100 160 200 170 T 400 165 L 400 240 L 0 240 Z" fill="${scenery.ground}" />

        <!-- Story-specific props (e.g., Pitcher with rising water & pebbles, Grapes, Net, Finish Flag, etc.) -->
        ${storyProps}

        <!-- Animated Character -->
        <g class="anim-character">
          ${animalDrawer(xOffset, yOffset)}
        </g>

        <!-- Panel Badge -->
        <g transform="translate(10, 15)">
          <rect width="70" height="24" rx="12" fill="rgba(0,0,0,0.35)" />
          <text x="35" y="16" fill="#FFFFFF" font-family="'Nunito', sans-serif" font-size="11" font-weight="700" text-anchor="middle">
            Panel ${panelIndex + 1}/${totalPanels}
          </text>
        </g>
      </svg>
    `;
  }

  global.SvgArt = {
    generatePanelSvg,
    generateThumbnailSvg,
    getStoryProps,
  };
})(window);
