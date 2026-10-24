/**
 * svg-art.js
 * Comprehensive storybook illustration engine with:
 * 1. Standardized right-facing vector avatars centered at (50, 50).
 * 2. Multi-character interactive stage composition (facing each other, realistic sizing, ground baseline).
 * 3. Narrative sentence-aware action solver (sleeping zZz on the correct character, closed resting eyes, perched birds, hunter's nets, racing).
 * 4. Rich interactive story props (shady mango tree, seeds, terracotta pitchers, grapes, cheese, banners, bridges, nets).
 * 5. Cleaned up Rough.js hand-drawn sketch mode: NO random green wiggles, harmonic colored-pencil strokes and watercolor fills.
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
      sky: ['#6ee7b7', '#a7f3d0'],
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
      sky: ['#bae6fd', '#f0f9ff'],
      ground: '#d97706',
      groundDark: '#b45309',
      sun: '#f59e0b',
      cloud: '#FFFFFF',
    },
  };

  /**
   * Helper to wrap any avatar drawing so its center is strictly at (x, y)
   * All avatars natively face RIGHT (positive X).
   * isFlipped = false -> faces RIGHT (towards center when on the left).
   * isFlipped = true  -> faces LEFT (towards center when on the right).
   */
  function wrapAvatar(x, y, scale = 1, isFlipped = false, content) {
    const sx = isFlipped ? -scale : scale;
    return `
      <g transform="translate(${x}, ${y}) scale(${sx}, ${scale}) translate(-50, -50)">
        ${content}
      </g>
    `;
  }

  // Standardized Right-Facing Avatar Drawings (Head at right x~70, tail at left x~15)
  const AVATARS = {
    // 1. CROW / RAVEN / JACKDAW (Head on Right, Beak pointing Right)
    crow: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <!-- Tail feathers extending left -->
        <polygon points="15,48 2,40 4,55" fill="#1E293B" />
        <polygon points="18,52 6,56 12,62" fill="#0F172A" />
        <!-- Sleek Body -->
        <ellipse cx="46" cy="50" rx="22" ry="17" fill="#1E293B" />
        <!-- Wing Feathers -->
        <path d="M35 42 Q52 38 62 52 Q46 58 35 42 Z" fill="#0F172A" />
        <!-- Head -->
        <circle cx="68" cy="38" r="14" fill="#1E293B" />
        <!-- Glossy Eye -->
        ${
          state === 'sleeping'
            ? `<path d="M68 36 Q72 40 76 36" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" />`
            : `
          <circle cx="72" cy="35" r="3.5" fill="#FFFFFF" />
          <circle cx="73" cy="35" r="2" fill="#000000" />
          <circle cx="74" cy="34" r="0.8" fill="#FFFFFF" />
        `
        }
        <!-- Sharp Golden Beak pointing Right -->
        <polygon points="78,35 95,40 78,44" fill="#F59E0B" />
        <!-- Claws / Feet -->
        <line x1="42" y1="67" x2="40" y2="78" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" />
        <line x1="54" y1="67" x2="54" y2="78" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" />
      `
      ),

    // 2. FOX (Bushy tail on Left, Head & Snout pointing Right)
    fox: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <!-- Bushy Tail extending Left with white tip -->
        <path d="M32 50 Q0 40 10 20 Q22 30 38 42 Z" fill="#E65100" />
        <circle cx="8" cy="22" r="7" fill="#FFFFFF" />
        <!-- Body -->
        <ellipse cx="50" cy="50" rx="26" ry="18" fill="#F57C00" />
        <ellipse cx="56" cy="52" rx="16" ry="12" fill="#FFF3E0" />
        <!-- Head -->
        <polygon points="86,42 62,25 62,55" fill="#F57C00" />
        <polygon points="82,42 64,33 64,50" fill="#FFF3E0" />
        <!-- Ears -->
        <polygon points="66,26 60,8 54,26" fill="#F57C00" /><polygon points="64,24 60,14 56,24" fill="#3E2723" />
        <polygon points="74,27 72,10 66,26" fill="#F57C00" />
        <!-- Eye & Nose pointing Right -->
        ${
          state === 'sleeping'
            ? `<path d="M68 38 Q72 42 76 38" stroke="#3E2723" stroke-width="2.2" fill="none" stroke-linecap="round" />`
            : `<ellipse cx="72" cy="37" rx="3.5" ry="2" fill="#3E2723" transform="rotate(15 72 37)" />`
        }
        <circle cx="86" cy="42" r="2.5" fill="#212121" />
        <!-- Paws -->
        <circle cx="42" cy="67" r="5" fill="#3E2723" /><circle cx="64" cy="67" r="5" fill="#3E2723" />
      `
      ),

    // 3. TORTOISE (Shell in Center, Head reaching Right)
    tortoise: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <polygon points="20,52 10,50 16,56" fill="#81C784" />
        <path d="M80 50 Q50 15 20 50 Z" fill="#388E3C" />
        <path d="M75 50 Q50 20 25 50 Z" fill="#4CAF50" />
        <polygon points="60,32 40,32 34,45 50,50 66,45" fill="#2E7D32" stroke="#81C784" stroke-width="1.5" />
        <!-- Head stretching Right -->
        <ellipse cx="86" cy="46" rx="11" ry="8" fill="#81C784" />
        <circle cx="90" cy="44" r="2.5" fill="#1B5E20" /><circle cx="90" cy="43" r="0.8" fill="#FFFFFF" />
        <!-- Legs -->
        <ellipse cx="72" cy="54" rx="7" ry="5" fill="#81C784" /><ellipse cx="28" cy="54" rx="7" ry="5" fill="#81C784" />
      `
      ),

    // 4. HARE / RABBIT (Fluffy tail on Left, Long ears & Face pointing Right)
    hare: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <circle cx="25" cy="50" r="7" fill="#EFEBE9" />
        <ellipse cx="50" cy="52" rx="24" ry="18" fill="#BCAAA4" />
        <circle cx="70" cy="40" r="14" fill="#BCAAA4" />
        <!-- Long Ears -->
        <ellipse cx="64" cy="16" rx="5" ry="16" fill="#BCAAA4" transform="rotate(-10 64 16)" />
        <ellipse cx="64" cy="16" rx="2.5" ry="11" fill="#F8BBD0" transform="rotate(-10 64 16)" />
        <ellipse cx="75" cy="18" rx="5" ry="16" fill="#BCAAA4" transform="rotate(10 75 18)" />
        <ellipse cx="75" cy="18" rx="2.5" ry="11" fill="#F8BBD0" transform="rotate(10 75 18)" />
        <!-- Eyes: Open vs Peaceful Sleeping -->
        ${
          state === 'sleeping'
            ? `<path d="M71 39 Q75 43 79 39" stroke="#4E342E" stroke-width="2.2" fill="none" stroke-linecap="round" />`
            : `
          <circle cx="75" cy="38" r="3" fill="#4E342E" /><circle cx="76" cy="37" r="1" fill="#FFFFFF" />
        `
        }
        <circle cx="82" cy="44" r="2" fill="#E91E63" />
        <ellipse cx="40" cy="68" rx="8" ry="4" fill="#8D6E63" /><ellipse cx="68" cy="68" rx="8" ry="4" fill="#8D6E63" />
      `
      ),

    // 5. LION (Tufted Tail on Left, Grand Mane & Face pointing Right)
    lion: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <path d="M22 55 Q5 50 10 35" stroke="#FFA726" stroke-width="4.5" fill="none" stroke-linecap="round" />
        <circle cx="10" cy="35" r="6" fill="#BF360C" />
        <ellipse cx="45" cy="58" rx="30" ry="22" fill="#FFA726" />
        <!-- Grand Orange Mane -->
        <circle cx="72" cy="42" r="28" fill="#D84315" />
        <circle cx="72" cy="42" r="19" fill="#FFA726" />
        <circle cx="62" cy="24" r="6" fill="#FFA726" /><circle cx="62" cy="24" r="3" fill="#D84315" />
        <circle cx="84" cy="24" r="6" fill="#FFA726" /><circle cx="84" cy="24" r="3" fill="#D84315" />
        <!-- Eyes: Sleeping vs Open -->
        ${
          state === 'sleeping'
            ? `
          <path d="M64 42 Q68 46 72 42" stroke="#3E2723" stroke-width="2.2" fill="none" stroke-linecap="round" />
          <path d="M76 42 Q80 46 84 42" stroke="#3E2723" stroke-width="2.2" fill="none" stroke-linecap="round" />
        `
            : `
          <circle cx="68" cy="40" r="3" fill="#3E2723" /><circle cx="69" cy="39" r="1" fill="#FFFFFF" />
          <circle cx="80" cy="40" r="3" fill="#3E2723" /><circle cx="81" cy="39" r="1" fill="#FFFFFF" />
        `
        }
        <polygon points="72,46 76,46 74,50" fill="#4E342E" />
        <path d="M74 50 Q71 54 67 52 M74 50 Q77 54 81 52" stroke="#3E2723" stroke-width="1.8" fill="none" />
        <circle cx="42" cy="76" r="6" fill="#FFA726" /><circle cx="68" cy="76" r="6" fill="#FFA726" />
      `
      ),

    // 6. TIGER (Striped Tail Left, Head pointing Right, Sleeping state support)
    tiger: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <!-- Striped Tail Left -->
        <path d="M24 45 Q5 40 8 20" stroke="#FF9800" stroke-width="6" stroke-linecap="round" fill="none" />
        <!-- Body -->
        <ellipse cx="48" cy="52" rx="28" ry="22" fill="#FF9800" />
        <ellipse cx="48" cy="54" rx="20" ry="15" fill="#FFE0B2" />
        <path d="M42 34 Q39 46 43 54 M50 32 Q48 44 52 54" stroke="#3E2723" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <!-- Head -->
        <circle cx="72" cy="40" r="20" fill="#FF9800" />
        <circle cx="60" cy="24" r="6" fill="#FF9800" /><circle cx="60" cy="24" r="3" fill="#3E2723" />
        <circle cx="84" cy="24" r="6" fill="#FF9800" /><circle cx="84" cy="24" r="3" fill="#3E2723" />
        <ellipse cx="66" cy="45" rx="7" ry="5" fill="#FFE0B2" /><ellipse cx="78" cy="45" rx="7" ry="5" fill="#FFE0B2" />
        <!-- Eyes: Peaceful Sleeping curve vs Open alert eyes -->
        ${
          state === 'sleeping'
            ? `
          <path d="M63 38 Q66 42 69 38" stroke="#3E2723" stroke-width="2.5" fill="none" stroke-linecap="round" />
          <path d="M75 38 Q78 42 81 38" stroke="#3E2723" stroke-width="2.5" fill="none" stroke-linecap="round" />
        `
            : `
          <circle cx="66" cy="38" r="3" fill="#3E2723" /><circle cx="67" cy="37" r="1" fill="#FFFFFF" />
          <circle cx="78" cy="38" r="3" fill="#3E2723" /><circle cx="79" cy="37" r="1" fill="#FFFFFF" />
        `
        }
        <polygon points="70,43 74,43 72,47" fill="#D84315" />
        <!-- Paws -->
        <circle cx="44" cy="72" r="6" fill="#FF9800" /><circle cx="68" cy="72" r="6" fill="#FF9800" />
      `
      ),

    // 7. MOUSE / RAT (Long tail Left, Snout pointing Right)
    mouse: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <!-- Long Tail Left -->
        <path d="M30 50 Q10 45 15 25" stroke="#F48FB1" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <ellipse cx="50" cy="50" rx="22" ry="16" fill="#B0BEC5" />
        <ellipse cx="54" cy="52" rx="14" ry="10" fill="#ECEFF1" />
        <!-- Head -->
        <circle cx="68" cy="44" r="13" fill="#B0BEC5" />
        <circle cx="60" cy="28" r="10" fill="#B0BEC5" /><circle cx="60" cy="28" r="6" fill="#F48FB1" />
        <circle cx="74" cy="27" r="9" fill="#B0BEC5" /><circle cx="74" cy="27" r="5" fill="#F48FB1" />
        <circle cx="72" cy="42" r="2.8" fill="#263238" /><circle cx="73" cy="41" r="0.9" fill="#FFFFFF" />
        <circle cx="81" cy="46" r="2.5" fill="#E91E63" />
        <path d="M80 47 L88 44 M80 49 L88 51" stroke="#546E7A" stroke-width="1.2" />
        <ellipse cx="44" cy="64" rx="5" ry="3" fill="#90A4AE" /><ellipse cx="64" cy="64" rx="5" ry="3" fill="#90A4AE" />
      `
      ),

    // 8. ELEPHANT (Tail Left, Head & Curled Trunk pointing Right)
    elephant: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <path d="M18 52 Q8 62 12 74" stroke="#78909C" stroke-width="3" fill="none" stroke-linecap="round" />
        <circle cx="12" cy="74" r="3" fill="#455A64" />
        <ellipse cx="50" cy="52" rx="36" ry="28" fill="#78909C" />
        <circle cx="74" cy="40" r="22" fill="#78909C" />
        <ellipse cx="60" cy="38" rx="12" ry="18" fill="#90A4AE" transform="rotate(10 60 38)" />
        <ellipse cx="60" cy="38" rx="8" ry="12" fill="#CFD8DC" transform="rotate(10 60 38)" />
        <circle cx="78" cy="34" r="3" fill="#263238" /><circle cx="79" cy="33" r="1" fill="#FFFFFF" />
        <!-- Trunk -->
        <path d="M88 44 Q106 52 104 68 Q100 80 88 75 Q86 70 94 66 Q96 55 86 50 Z" fill="#78909C" />
        <path d="M84 52 Q94 60 88 66 Q82 60 82 52 Z" fill="#FFFBEB" stroke="#E2E8F0" stroke-width="1" />
        <rect x="36" y="72" width="12" height="20" rx="5" fill="#607D8B" />
        <rect x="62" y="72" width="12" height="20" rx="5" fill="#607D8B" />
      `
      ),

    // 9. CRANE / STORK / HERON (Body Left, S-Neck & Long Beak pointing Right)
    crane: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <polygon points="25,48 10,44 14,54" fill="#B0BEC5" />
        <ellipse cx="46" cy="48" rx="20" ry="14" fill="#ECEFF1" />
        <path d="M56 48 Q68 32 64 20 Q62 8 68 8" stroke="#ECEFF1" stroke-width="6.5" fill="none" stroke-linecap="round" />
        <circle cx="68" cy="8" r="8" fill="#ECEFF1" />
        <circle cx="68" cy="4" r="3.5" fill="#E53935" />
        <circle cx="70" cy="7" r="1.8" fill="#212121" />
        <polygon points="74,7 100,9 74,12" fill="#FB8C00" />
        <path d="M38 42 Q52 38 60 50 Q48 54 38 42 Z" fill="#CFD8DC" />
        <line x1="42" y1="62" x2="40" y2="92" stroke="#FB8C00" stroke-width="2.5" />
        <line x1="52" y1="62" x2="54" y2="92" stroke="#FB8C00" stroke-width="2.5" />
      `
      ),

    // 10. MONKEY (Tail Left, Face pointing Right)
    monkey: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <path d="M30 50 Q5 65 15 30 Q25 10 32 25" stroke="#795548" stroke-width="4.5" fill="none" stroke-linecap="round" />
        <ellipse cx="50" cy="52" rx="22" ry="18" fill="#795548" />
        <ellipse cx="52" cy="53" rx="14" ry="12" fill="#D7CCC8" />
        <circle cx="68" cy="34" r="16" fill="#795548" />
        <circle cx="56" cy="34" r="6" fill="#D7CCC8" /><circle cx="80" cy="34" r="6" fill="#D7CCC8" />
        <ellipse cx="70" cy="38" rx="11" ry="8" fill="#D7CCC8" />
        <circle cx="66" cy="33" r="2.8" fill="#3E2723" /><circle cx="74" cy="33" r="2.8" fill="#3E2723" />
        <path d="M66 41 Q70 45 74 41" stroke="#5D4037" stroke-width="1.8" fill="none" stroke-linecap="round" />
        <circle cx="44" cy="70" r="5" fill="#5D4037" /><circle cx="62" cy="70" r="5" fill="#5D4037" />
      `
      ),

    // 11. WOLF (Tail Left, Muzzle pointing Right)
    wolf: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <path d="M26 50 Q5 45 12 30" stroke="#546E7A" stroke-width="5" fill="none" stroke-linecap="round" />
        <ellipse cx="50" cy="50" rx="28" ry="18" fill="#607D8B" />
        <polygon points="86,40 62,26 62,54" fill="#607D8B" />
        <polygon points="78,41 64,34 64,49" fill="#CFD8DC" />
        <polygon points="64,24 60,6 54,24" fill="#455A64" />
        <polygon points="72,25 70,8 64,25" fill="#455A64" />
        <polygon points="71,34 65,36 70,38" fill="#FFD54F" /><circle cx="69" cy="36" r="1.5" fill="#263238" />
        <circle cx="86" cy="40" r="2.5" fill="#212121" />
        <rect x="40" y="66" width="6" height="14" rx="3" fill="#455A64" /><rect x="62" y="66" width="6" height="14" rx="3" fill="#455A64" />
      `
      ),

    // 12. DOG (Wagging Tail Left, Snout pointing Right)
    dog: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <path d="M24 48 Q10 35 15 20" stroke="#8D6E63" stroke-width="4.5" stroke-linecap="round" fill="none" />
        <ellipse cx="48" cy="50" rx="26" ry="19" fill="#8D6E63" />
        <circle cx="70" cy="36" r="16" fill="#8D6E63" />
        <ellipse cx="60" cy="38" rx="5" ry="12" fill="#5D4037" transform="rotate(15 60 38)" />
        <ellipse cx="80" cy="38" rx="5" ry="12" fill="#5D4037" transform="rotate(-15 80 38)" />
        <ellipse cx="74" cy="44" rx="8" ry="6" fill="#D7CCC8" />
        <circle cx="76" cy="41" r="2.8" fill="#212121" />
        <circle cx="68" cy="32" r="2.8" fill="#212121" /><circle cx="69" cy="31" r="1" fill="#FFFFFF" />
        <circle cx="78" cy="32" r="2.8" fill="#212121" /><circle cx="79" cy="31" r="1" fill="#FFFFFF" />
        <circle cx="42" cy="68" r="5" fill="#5D4037" /><circle cx="64" cy="68" r="5" fill="#5D4037" />
      `
      ),

    // 13. SHEEP / LAMB (Tail Left, Head pointing Right)
    sheep: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <circle cx="35" cy="45" r="15" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
        <circle cx="55" cy="45" r="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
        <circle cx="45" cy="35" r="14" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
        <circle cx="45" cy="55" r="15" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
        <ellipse cx="72" cy="40" rx="13" ry="11" fill="#F1F5F9" />
        <ellipse cx="64" cy="32" rx="5" ry="3" fill="#FDA4AF" transform="rotate(-20 64 32)" />
        <ellipse cx="80" cy="42" rx="5" ry="3" fill="#FDA4AF" transform="rotate(20 80 42)" />
        <circle cx="70" cy="38" r="2.2" fill="#1E293B" /><circle cx="77" cy="38" r="2.2" fill="#1E293B" />
        <ellipse cx="74" cy="45" rx="2.5" ry="1.8" fill="#F43F5E" />
        <rect x="36" y="62" width="5" height="14" rx="2" fill="#64748B" /><rect x="54" y="62" width="5" height="14" rx="2" fill="#64748B" />
      `
      ),

    // 14. OX / BULL (Horns Above, Snout pointing Right)
    ox: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <path d="M15 50 Q6 65 10 78" stroke="#5D4037" stroke-width="3" fill="none" />
        <ellipse cx="46" cy="52" rx="32" ry="22" fill="#5D4037" />
        <circle cx="72" cy="38" r="17" fill="#5D4037" />
        <path d="M68 24 Q58 8 74 10" stroke="#ECEFF1" stroke-width="4" fill="none" stroke-linecap="round" />
        <path d="M76 24 Q86 8 70 10" stroke="#ECEFF1" stroke-width="4" fill="none" stroke-linecap="round" />
        <ellipse cx="80" cy="45" rx="10" ry="7" fill="#D7CCC8" />
        <circle cx="78" cy="45" r="1.8" fill="#3E2723" /><circle cx="84" cy="45" r="1.8" fill="#3E2723" />
        <circle cx="74" cy="34" r="2.8" fill="#212121" />
        <rect x="34" y="70" width="7" height="16" rx="2" fill="#3E2723" /><rect x="62" y="70" width="7" height="16" rx="2" fill="#3E2723" />
      `
      ),

    // 15. ROOSTER (Comb Above, Beak pointing Right)
    rooster: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <path d="M35 45 Q15 15 8 35 Q22 40 32 50 Z" fill="#00897B" />
        <circle cx="48" cy="48" r="16" fill="#FF8F00" />
        <circle cx="66" cy="32" r="11" fill="#FF8F00" />
        <path d="M62 22 Q68 12 74 22 Z" fill="#E53935" />
        <polygon points="74,30 86,33 74,36" fill="#FDD835" />
        <circle cx="70" cy="29" r="2.2" fill="#000000" />
        <line x1="44" y1="64" x2="42" y2="76" stroke="#F57F17" stroke-width="2.5" />
        <line x1="54" y1="64" x2="54" y2="76" stroke="#F57F17" stroke-width="2.5" />
      `
      ),

    // 16. BOY / CHILD (Facing Right)
    boy: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <circle cx="50" cy="25" r="13" fill="#FFEDD5" />
        <path d="M38 22 Q50 12 62 20" stroke="#0284C7" stroke-width="5" fill="none" stroke-linecap="round" />
        <circle cx="52" cy="23" r="2" fill="#1E293B" /><circle cx="60" cy="23" r="2" fill="#1E293B" />
        <path d="M54 28 Q58 32 62 28" stroke="#EA580C" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <rect x="40" y="38" width="20" height="22" rx="4" fill="#38BDF8" />
        <rect x="42" y="60" width="5" height="15" rx="2" fill="#1E293B" /><rect x="52" y="60" width="5" height="15" rx="2" fill="#1E293B" />
      `
      ),

    // 17. MAN (FARMER / SHEPHERD / WOODMAN - Facing Right)
    man: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <circle cx="50" cy="22" r="12" fill="#FED7AA" />
        <ellipse cx="50" cy="14" rx="16" ry="4" fill="#A16207" />
        <path d="M40 14 Q50 3 60 14" fill="#CA8A04" />
        <circle cx="52" cy="20" r="2" fill="#1E293B" /><circle cx="60" cy="20" r="2" fill="#1E293B" />
        <path d="M48 26 Q56 34 64 26" fill="#78350F" />
        <path d="M38 35 L62 35 L66 68 L34 68 Z" fill="#2563EB" />
        <rect x="40" y="68" width="6" height="15" rx="2" fill="#1E293B" /><rect x="52" y="68" width="6" height="15" rx="2" fill="#1E293B" />
        <line x1="68" y1="12" x2="68" y2="82" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
      `
      ),

    // 18. WOMAN (MOTHER / MILKMAID - Facing Right)
    woman: (x, y, scale = 1, isFlipped = false, state = 'normal') =>
      wrapAvatar(
        x,
        y,
        scale,
        isFlipped,
        `
        <circle cx="50" cy="22" r="12" fill="#FFEDD5" />
        <path d="M36 20 Q50 8 64 20 L62 28 L38 28 Z" fill="#F43F5E" />
        <circle cx="52" cy="22" r="2" fill="#1E293B" /><circle cx="60" cy="22" r="2" fill="#1E293B" />
        <path d="M54 28 Q58 32 62 28" stroke="#E11D48" stroke-width="1.5" fill="none" />
        <path d="M38 34 L62 34 L68 70 L32 70 Z" fill="#EC4899" />
        <path d="M42 38 L58 38 L56 66 L44 66 Z" fill="#FFFFFF" opacity="0.9" />
      `
      ),
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
    if (k.includes('sheep') || k.includes('lamb')) return { drawer: AVATARS.sheep, scale: 0.95 };
    if (k.includes('ox') || k.includes('bull') || k.includes('cow') || k.includes('bullock')) return { drawer: AVATARS.ox, scale: 1.25 };
    if (k.includes('rooster') || k.includes('cock') || k.includes('hen')) return { drawer: AVATARS.rooster, scale: 0.85 };
    if (k.includes('boy') || k.includes('child')) return { drawer: AVATARS.boy, scale: 0.85 };
    if (k.includes('mother') || k.includes('milkmaid') || k.includes('woman')) return { drawer: AVATARS.woman, scale: 1.05 };
    if (k.includes('man') || k.includes('farmer') || k.includes('shepherd') || k.includes('woodman') || k.includes('father') || k.includes('traveller')) return { drawer: AVATARS.man, scale: 1.1 };

    return { drawer: AVATARS.fox, scale: 0.9 };
  }

  // Harmonic Stroke Color Deriver (prevents harsh black borders around bright colors in Rough.js)
  function getHarmonicStroke(fillHex) {
    if (!fillHex || fillHex === 'none') return '#475569';
    const h = fillHex.toLowerCase();
    if (h.includes('ffd700') || h.includes('ffd54f') || h.includes('fbbf24') || h.includes('f59e0b') || h.includes('fde047')) return '#D97706';
    if (h.includes('7bc676') || h.includes('5eaa59') || h.includes('4caf50') || h.includes('22c55e') || h.includes('16a34a') || h.includes('3b7a32')) return '#2E7D32';
    if (h.includes('38bdf8') || h.includes('0284c7') || h.includes('0288d1') || h.includes('7dd3fc') || h.includes('bae6fd') || h.includes('29b6f6')) return '#0369A1';
    if (h.includes('c2410c') || h.includes('ea580c') || h.includes('9a3412') || h.includes('d97706')) return '#7C2D12';
    if (h.includes('ff9800') || h.includes('ffa726') || h.includes('f57c00') || h.includes('e65100')) return '#BF360C';
    if (h.includes('ffffff') || h.includes('f8fafc') || h.includes('eceff1') || h.includes('f1f5f9')) return '#94A3B8';
    if (h.includes('1e293b') || h.includes('0f172a') || h.includes('263238') || h.includes('212121')) return '#0F172A';
    return '#475569';
  }

  // Story-specific Props & Settings (No random wiggles!)
  function getStoryProps(story, isThumbnail = false, panelIndex = 0, totalPanels = 1) {
    const sid = (story.id || '').toLowerCase();
    const title = (story.title || '').toLowerCase();
    const scale = isThumbnail ? 0.7 : 1.0;

    // 1. TIGER & MICE / LION & MOUSE (Shady Mango Tree Canopy, Golden Seeds, Hunter's Net)
    if ((sid.includes('mouse') || sid.includes('mice')) && (sid.includes('lion') || sid.includes('tiger'))) {
      const netX = isThumbnail ? 30 : 75;
      const netY = isThumbnail ? 85 : 125;
      const isNetTrapped = panelIndex >= 3 && panelIndex <= 4;
      const isFreed = panelIndex >= 5;

      return `
        <!-- Shady Mango Tree Trunk & Spreading Leafy Canopy Overhead -->
        <g opacity="0.95">
          <path d="M-10 180 Q25 110 15 35" stroke="#78350F" stroke-width="20" fill="none" stroke-linecap="round" />
          <path d="M15 45 Q70 35 140 40" stroke="#78350F" stroke-width="12" fill="none" stroke-linecap="round" />
          <ellipse cx="65" cy="25" rx="75" ry="35" fill="#15803D" opacity="0.9" />
          <ellipse cx="125" cy="35" rx="50" ry="26" fill="#16A34A" opacity="0.85" />
          <ellipse cx="40" cy="18" rx="45" ry="22" fill="#22C55E" opacity="0.8" />
          <!-- Golden Ripe Mangoes hanging from the shady boughs -->
          <circle cx="60" cy="46" r="6.5" fill="#FBBF24" /><circle cx="105" cy="50" r="6" fill="#F59E0B" />
        </g>

        <!-- Fallen Seeds for mouse to gather in early panels -->
        ${
          panelIndex < 3
            ? `
          <g>
            <ellipse cx="270" cy="168" rx="3.5" ry="2" fill="#FDE047" />
            <ellipse cx="282" cy="170" rx="3" ry="1.8" fill="#FBBF24" />
            <ellipse cx="295" cy="167" rx="3.5" ry="2" fill="#FDE047" />
          </g>
        `
            : ''
        }

        <!-- Hunter's Net Trap (Panels 3-4) -->
        ${
          isNetTrapped
            ? `
          <g transform="translate(${netX}, ${netY}) scale(${scale})" opacity="0.9">
            <path d="M-10 10 L90 10 M-10 24 L90 24 M-10 38 L90 38 M-10 52 L90 52" stroke="#D97706" stroke-width="3" stroke-dasharray="4,4" />
            <path d="M10 0 L10 65 M30 0 L30 65 M50 0 L50 65 M70 0 L70 65" stroke="#D97706" stroke-width="3" stroke-dasharray="4,4" />
            ${panelIndex === 4 ? `<line x1="30" y1="24" x2="25" y2="34" stroke="#B45309" stroke-width="2.5" /><line x1="50" y1="24" x2="55" y2="34" stroke="#B45309" stroke-width="2.5" />` : ''}
          </g>
        `
            : ''
        }

        <!-- Friendship Celebration Stars (Panels 5-6) -->
        ${
          isFreed
            ? `
          <g transform="translate(180, 80)">
            <path d="M0 -6 L2 -2 L6 0 L2 2 L0 6 L-2 2 L-6 0 L-2 -2 Z" fill="#F59E0B" />
            <path d="M25 -15 L26 -12 L29 -10 L26 -8 L25 -5 L24 -8 L21 -10 L24 -12 Z" fill="#FDE047" />
          </g>
        `
            : ''
        }
      `;
    }

    // 2. CROW & THE WATER POT / PITCHER
    if (sid.includes('pitcher') || sid.includes('water_pot') || (title.includes('crow') && (title.includes('pot') || title.includes('pitcher')))) {
      const potX = isThumbnail ? 180 : 275;
      const potY = isThumbnail ? 65 : 135;
      const progress = isThumbnail ? 0.75 : panelIndex / Math.max(1, totalPanels - 1);
      const isWaterFull = progress >= 0.6;

      return `
        <g transform="translate(${potX}, ${potY}) scale(${scale})">
          <!-- Cobblestone Terrace Stones -->
          <ellipse cx="25" cy="58" rx="35" ry="8" fill="#CBD5E1" opacity="0.6" />
          <!-- Earthen Clay Amphora / Pitcher Body -->
          <path d="M10 50 Q10 28 20 22 L20 12 Q20 8 28 8 L32 8 Q40 8 40 12 L40 22 Q50 28 50 50 Q50 58 30 58 Q10 58 10 50 Z" fill="#C2410C" stroke="#9A3412" stroke-width="1.5" />
          <path d="M14 48 Q14 30 22 24 L22 14 L38 14 L38 24 Q46 30 46 48 Z" fill="#EA580C" />
          <!-- Pitcher Rim Opening -->
          <ellipse cx="30" cy="10" rx="10" ry="3.5" fill="#7C2D12" />
          ${isWaterFull ? `<ellipse cx="30" cy="11" rx="8" ry="2.5" fill="#38BDF8" stroke="#0284C7" stroke-width="1" />` : ''}
          <!-- Curved Clay Handle -->
          <path d="M40 16 Q52 25 44 38" stroke="#9A3412" stroke-width="3.5" fill="none" stroke-linecap="round" />
          <!-- Pebbles on ground -->
          <ellipse cx="-15" cy="56" rx="5" ry="3" fill="#475569" stroke="#334155" stroke-width="1" />
          <ellipse cx="-5" cy="58" rx="4" ry="2.5" fill="#64748B" stroke="#475569" stroke-width="1" />
          <ellipse cx="65" cy="56" rx="5" ry="3" fill="#64748B" stroke="#475569" stroke-width="1" />
          ${panelIndex === 3 ? `<circle cx="30" cy="22" r="3" fill="#475569" /><path d="M26 26 Q30 29 34 26" stroke="#38BDF8" stroke-width="1.5" fill="none"/>` : ''}
        </g>
      `;
    }

    // 3. FOX & GRAPES
    if (sid.includes('grapes') || title.includes('grapes')) {
      const x = isThumbnail ? 160 : 255;
      const y = isThumbnail ? 10 : 20;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale * 1.05})">
          <rect x="-10" y="0" width="8" height="150" fill="#78350F" rx="2" />
          <path d="M-15 15 Q40 5 100 12" stroke="#78350F" stroke-width="5" stroke-linecap="round" fill="none" />
          <path d="M15 15 Q25 0 35 15 Q30 25 15 15 Z" fill="#22C55E" />
          <path d="M60 12 Q72 0 85 14 Q78 24 60 12 Z" fill="#16A34A" />
          <g transform="translate(25, 20)">
            <circle cx="0" cy="0" r="5" fill="#7E22CE" /><circle cx="8" cy="0" r="5" fill="#9333EA" />
            <circle cx="16" cy="0" r="5" fill="#7E22CE" /><circle cx="4" cy="7" r="5" fill="#A855F7" />
            <circle cx="12" cy="7" r="5" fill="#7E22CE" /><circle cx="8" cy="14" r="5" fill="#9333EA" />
            <circle cx="8" cy="20" r="4" fill="#6B21A8" />
          </g>
          <g transform="translate(65, 18) scale(0.85)">
            <circle cx="0" cy="0" r="5" fill="#9333EA" /><circle cx="8" cy="0" r="5" fill="#7E22CE" />
            <circle cx="4" cy="7" r="5" fill="#7E22CE" /><circle cx="12" cy="7" r="5" fill="#A855F7" />
            <circle cx="8" cy="14" r="4" fill="#6B21A8" />
          </g>
        </g>
      `;
    }

    // 4. TORTOISE & HARE (Race Finish Ribbon & Banana Leaf)
    if (sid.includes('tortoise') && sid.includes('hare')) {
      const x = isThumbnail ? 190 : 310;
      const y = isThumbnail ? 45 : 85;
      return `
        <g transform="translate(${x}, ${y}) scale(${scale})">
          <rect x="0" y="0" width="6" height="95" rx="2" fill="#78350F" />
          <polygon points="6,5 50,5 42,22 50,38 6,38" fill="#EF4444" />
          <polygon points="6,5 26,5 22,22 6,22" fill="#FFFFFF" />
          <polygon points="26,22 46,22 50,38 28,38" fill="#FFFFFF" />
          <text x="12" y="28" font-family="'Nunito', sans-serif" font-size="8" font-weight="900" fill="#B91C1C">GO!</text>
        </g>
      `;
    }

    // 5. DOG & HIS SHADOW / REFLECTION (Bridge & Bone)
    if (sid.includes('shadow') || sid.includes('reflection')) {
      return `
        <g transform="translate(180, 160) scale(${scale})">
          <rect x="-50" y="0" width="140" height="12" rx="3" fill="#854D0E" />
          <!-- Dog's White Bone -->
          <g transform="translate(20, -12)">
            <rect x="5" y="4" width="20" height="6" rx="2" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" />
            <circle cx="4" cy="4" r="3.5" fill="#F8FAFC" /><circle cx="4" cy="10" r="3.5" fill="#F8FAFC" />
            <circle cx="26" cy="4" r="3.5" fill="#F8FAFC" /><circle cx="26" cy="10" r="3.5" fill="#F8FAFC" />
          </g>
          <path d="M-30 22 Q20 18 70 22 T120 21" stroke="#0284C7" stroke-width="2" fill="none" opacity="0.7" />
        </g>
      `;
    }

    // Return clean empty string for other stories — NO RANDOM GREEN WIGGLES!
    return '';
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

      // Preserve sky gradients, full-frame backdrops, and badge buttons
      if (attrs.id && attrs.id.startsWith('skyGrad')) return match;
      if (attrs.width === '400' && attrs.height === '240') return match;
      if (attrs.width === '280' && attrs.height === '140') return match;
      if (attrs.fill && attrs.fill.startsWith('url(')) return match;
      if (attrs.rx === '12' && attrs.width === '70') return match;

      const fill = attrs.fill && attrs.fill !== 'none' ? attrs.fill : undefined;
      // Derive organic harmonic stroke color instead of harsh charcoal black
      const stroke = attrs.stroke && attrs.stroke !== 'none' ? attrs.stroke : getHarmonicStroke(fill);
      const strokeWidth = parseFloat(attrs['stroke-width'] || (stroke ? '1.2' : '0'));

      const opt = {
        roughness: 0.75,
        bowing: 0.8,
        fill: fill,
        fillStyle: 'solid',
        stroke: stroke,
        strokeWidth: Math.max(0.8, strokeWidth),
      };

      let shape;
      if (tag === 'circle') {
        const cx = parseFloat(attrs.cx || 0);
        const cy = parseFloat(attrs.cy || 0);
        const r = parseFloat(attrs.r || 0);
        if (r <= 2.2) return match; // keep small pupil gleams crisp
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
    const sid = (story.id || '').toLowerCase();

    // Pick scenery
    let scenery = SCENERIES.meadow;
    if (sLower.includes('courtyard') || sLower.includes('pot') || sLower.includes('pitcher') || sid.includes('water_pot')) {
      scenery = SCENERIES.courtyard;
    } else if (sLower.includes('river') || sLower.includes('water') || sLower.includes('stream') || sLower.includes('bridge')) {
      scenery = SCENERIES.river;
    } else if (sLower.includes('grove') || sLower.includes('jungle') || sLower.includes('forest') || sid.includes('tiger') || sid.includes('lion')) {
      scenery = SCENERIES.jungle;
    } else if (story.theme === 'Mythology') {
      scenery = SCENERIES.night;
    } else if (panelIndex === totalPanels - 1) {
      scenery = SCENERIES.sunset;
    }

    // Detect characters for stage layout
    const charList = story.character || [story.animal || 'fox'];
    const pCharName = charList[0] || story.animal || 'fox';
    let sCharName = charList.length > 1 ? charList[1] : null;

    const pConfig = getCharacterConfig(pCharName);
    let sConfig = sCharName ? getCharacterConfig(sCharName) : null;

    // Narrative positioning & facing logic
    let pX = 110;
    let pY = 145;
    let pFlipped = false; // Natively faces RIGHT, so on left it faces RIGHT into center

    let sX = 285;
    let sY = 145;
    let sFlipped = true; // Flips to face LEFT into center

    // Ground line baseline adjustment (tiny animals like mice sit lower on ground)
    if (pConfig.scale <= 0.7) pY = 158;
    if (sConfig && sConfig.scale <= 0.7) sY = 158;

    // Action detection
    const isSleeping = sLower.includes('sleep') || sLower.includes('asleep') || sLower.includes('nap');
    let pState = 'normal';
    let sState = 'normal';
    let sleepingX = null;
    let sleepingY = null;

    // Determine exactly WHO is sleeping so zZz and closed eyes are on the right character!
    if (isSleeping) {
      const pName = pCharName.toLowerCase();
      const sName = (sCharName || '').toLowerCase();

      if (sName && (sLower.includes(sName) || (sName.includes('hare') && sLower.includes('hare')))) {
        sState = 'sleeping';
        sleepingX = sX;
        sleepingY = sY - 32;
      } else {
        pState = 'sleeping';
        sleepingX = pX;
        sleepingY = pY - 32;
      }
    }

    // 1. TIGER & MICE / LION & MOUSE
    if ((sid.includes('mouse') || sid.includes('mice')) && (sid.includes('lion') || sid.includes('tiger'))) {
      if (panelIndex === 0) {
        // Tiger sleeping under shady tree on left, Mouse gathering seeds on right
        pX = 115;
        pY = 145;
        sX = 290;
        sY = 158;
        pState = 'sleeping';
        sleepingX = pX;
        sleepingY = pY - 32;
      } else if (panelIndex === 4) {
        // Mouse gnawing net beside tiger's paw
        pX = 115;
        pY = 145;
        sX = 185;
        sY = 158;
        sFlipped = true; // Mouse facing tiger's paw
      } else if (panelIndex >= 5) {
        // Both free and friends!
        pX = 115;
        pY = 145;
        sX = 265;
        sY = 158;
      }
    }

    // 2. CROW & WATER POT (Crow interacts directly with the pot on the right!)
    if (sid.includes('pitcher') || sid.includes('water_pot')) {
      sConfig = null; // solo story with pot
      if (panelIndex === 0) {
        pX = 140;
        pY = 145;
        pFlipped = false;
      } else if (panelIndex === 1) {
        pX = 245;
        pY = 115;
        pFlipped = false;
      } else if (panelIndex === 2) {
        pX = 160;
        pY = 150;
        pFlipped = false;
      } else if (panelIndex === 3) {
        pX = 250;
        pY = 95;
        pFlipped = false;
      } else if (panelIndex === 4) {
        pX = 175;
        pY = 145;
        pFlipped = false;
      } else if (panelIndex === 5) {
        pX = 245;
        pY = 112;
        pFlipped = false;
      } else {
        pX = 200;
        pY = 65;
        pFlipped = false;
      }
    }

    // 3. FOX & GRAPES
    if (sid.includes('grapes')) {
      sConfig = null;
      if (panelIndex === 2) {
        pX = 230;
        pY = 80;
        pFlipped = false;
      } else if (panelIndex >= 4) {
        pX = 90;
        pY = 145;
        pFlipped = true; // walking away LEFT!
      } else {
        pX = 140;
        pY = 145;
        pFlipped = false;
      }
    }

    // 4. TORTOISE & HARE
    if (sid.includes('tortoise') && sid.includes('hare')) {
      if (panelIndex === 2 || panelIndex === 3) {
        sX = 295;
        sY = 145;
        pX = 160;
        pY = 155;
        pFlipped = false;
        sState = 'sleeping';
        sleepingX = sX;
        sleepingY = sY - 32;
      } else if (panelIndex === 4) {
        pX = 285;
        pY = 155;
        sX = 75;
        sY = 145;
        pFlipped = false;
        sFlipped = false;
      }
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

        <!-- Celestial Body with Soft Glow -->
        <circle cx="340" cy="45" r="24" fill="${scenery.sun || '#FFD54F'}" opacity="0.9" />

        <!-- Distant Hills -->
        <path d="M 0 160 Q 110 110 220 155 T 400 150 L 400 240 L 0 240 Z" fill="${scenery.groundDark}" opacity="0.75" />

        <!-- Foreground Ground -->
        <path d="M 0 175 Q 100 160 200 170 T 400 165 L 400 240 L 0 240 Z" fill="${scenery.ground}" />

        <!-- Story Narrative Props (shady mango tree, pitcher, grapes, net, finish banner) -->
        ${storyProps}

        <!-- Character 1 (Protagonist) -->
        <g class="anim-character">
          ${pConfig.drawer(pX, pY, pConfig.scale, pFlipped, pState)}
        </g>

        <!-- Character 2 (Companion/Antagonist) -->
        ${
          sConfig
            ? `
          <g class="anim-character">
            ${sConfig.drawer(sX, sY, sConfig.scale, sFlipped, sState)}
          </g>
        `
            : ''
        }

        <!-- Sleeping zZz Animation (Targeting the EXACT character who is sleeping!) -->
        ${
          isSleeping && sleepingX !== null
            ? `
          <g transform="translate(${sleepingX}, ${sleepingY})" fill="#9333EA" font-family="'Nunito', sans-serif" font-weight="900">
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

        <g transform="translate(60, 65)">
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
