<template>
  <div class="hero-guacamole-anchor" ref="anchor">
    <svg
      ref="svg"
      class="hero-guacamole-svg"
      aria-hidden="true"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMaxYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Gradients for 3D effect -->
        <linearGradient id="bowlGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color: #FAF9F5; stop-opacity: 1" />
          <stop offset="100%" :style="`stop-color: ${isDark ? '#E8E6DD' : '#F0EEE8'}; stop-opacity: 1`" />
        </linearGradient>
        <linearGradient id="guacGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" :style="`stop-color: ${isDark ? '#5A8C69' : '#4A7C59'}; stop-opacity: 1`" />
          <stop offset="100%" :style="`stop-color: ${isDark ? '#3A6C49' : '#3A6C49'}; stop-opacity: 1`" />
        </linearGradient>
        <linearGradient id="tomatoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color: #E74C3C; stop-opacity: 1" />
          <stop offset="100%" style="stop-color: #C0392B; stop-opacity: 1" />
        </linearGradient>
        <linearGradient id="limeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color: #A8E6A3; stop-opacity: 1" />
          <stop offset="100%" style="stop-color: #8BC68A; stop-opacity: 1" />
        </linearGradient>

        <!-- Filters for depth and shadow -->
        <filter id="layerShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="0" dy="6" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Blueprint grid background -->
      <g class="blueprint-grid" :opacity="isDark ? 0.08 : 0.15">
        <line v-for="i in 25" :key="`h-${i}`"
              :x1="0" :y1="i * 32" :x2="1200" :y2="i * 32"
              stroke="#2E8B8B" stroke-width="0.5" stroke-dasharray="4,4" />
        <line v-for="i in 38" :key="`v-${i}`"
              :x1="i * 32" :y1="0" :x2="i * 32" :y2="800"
              stroke="#2E8B8B" stroke-width="0.5" stroke-dasharray="4,4" />
      </g>

      <!-- Assembly group - right side on desktop, front-facing perspective -->
      <g :transform="isMobile ? `translate(600, 480) scale(0.9) rotate(${rotation})` : `translate(820, 460) scale(1.3) rotate(${rotation})`" class="assembly-group">

        <!-- Center alignment guides (crosshair) - behind everything -->
        <g :opacity="annotationOpacity * 0.4">
          <line x1="-300" y1="0" x2="-180" y2="0"
                :stroke="isDark ? '#5ABABA' : '#2E8B8B'"
                stroke-width="0.5"
                stroke-dasharray="4,4" />
          <line x1="180" y1="0" x2="300" y2="0"
                :stroke="isDark ? '#5ABABA' : '#2E8B8B'"
                stroke-width="0.5"
                stroke-dasharray="4,4" />
          <line x1="0" y1="-220" x2="0" y2="-180"
                :stroke="isDark ? '#5ABABA' : '#2E8B8B'"
                stroke-width="0.5"
                stroke-dasharray="4,4" />
          <line x1="0" y1="180" x2="0" y2="220"
                :stroke="isDark ? '#5ABABA' : '#2E8B8B'"
                stroke-width="0.5"
                stroke-dasharray="4,4" />
        </g>

        <!-- Layer 1: Bowl (bottom) - drawn first so it's behind everything -->
        <g :transform="`translate(0, ${layerOffsets[0]})`" filter="url(#layerShadow)">
          <!-- Bowl base shadow -->
          <ellipse cx="0" cy="95" rx="80" ry="10"
                   :fill="isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)'"
                   fill-opacity="1" />
          <!-- Bowl front wall -->
          <path d="M -150,0 Q -130,80 0,95 Q 130,80 150,0"
                :fill="isDark ? '#D8D6CD' : '#E8E6DD'"
                :stroke="isDark ? '#B8B6AD' : '#C8C6BD'"
                stroke-width="2" />
          <!-- Bowl wall highlight -->
          <path d="M -140,5 Q -120,70 0,82 Q 40,78 60,70"
                fill="none"
                :stroke="isDark ? '#E8E6DD' : '#FAF9F5'"
                stroke-width="1.5"
                opacity="0.4" />
          <!-- Bowl rim -->
          <ellipse cx="0" cy="0" rx="150" ry="55"
                   fill="url(#bowlGradient)"
                   :stroke="isDark ? '#C8C6BD' : '#D8D6CD'"
                   stroke-width="2" />
          <!-- Bowl inner shadow -->
          <ellipse cx="0" cy="5" rx="130" ry="40"
                   fill="none"
                   :stroke="isDark ? '#D8D6CD' : '#E8E6DD'"
                   stroke-width="1"
                   opacity="0.4" />
          <!-- Annotation -->
          <line :x1="160" :y1="40" :x2="280" :y2="80"
                stroke="#2E8B8B" stroke-width="1" :opacity="annotationOpacity" />
          <text :x="290" :y="75" class="annotation-label" :opacity="annotationOpacity">FRAMEWORK CONTAINER</text>
          <text :x="290" :y="90" class="annotation-value" :opacity="annotationOpacity">Ø 300px</text>
        </g>

        <!-- Layer 2: Guacamole base -->
        <g :transform="`translate(0, ${layerOffsets[1]})`" filter="url(#layerShadow)">
          <!-- Guac front wall (visible thickness) -->
          <path d="M -120,0 Q -100,35 0,45 Q 100,35 120,0"
                :fill="isDark ? '#3A6C49' : '#2D5B39'"
                :stroke="isDark ? '#2A5C39' : '#2D3B2D'"
                stroke-width="2" />
          <!-- Guac top surface -->
          <ellipse cx="0" cy="0" rx="120" ry="45"
                   fill="url(#guacGradient)"
                   :stroke="isDark ? '#3A6C49' : '#2D3B2D'"
                   stroke-width="2" />
          <!-- Texture marks -->
          <circle v-for="dot in guacDots" :key="`dot-${dot.x}-${dot.y}`"
                  :cx="dot.x" :cy="dot.y" :r="dot.r"
                  :fill="isDark ? '#4A7C59' : '#3A6C49'"
                  opacity="0.3" />
          <!-- Annotation -->
          <line :x1="-130" :y1="10" :x2="-270" :y2="40"
                stroke="#2E8B8B" stroke-width="1" :opacity="annotationOpacity" />
          <text :x="-470" :y="45" class="annotation-label" :opacity="annotationOpacity">AGENT LAYER - 19 ROLES</text>
          <text :x="-470" :y="60" class="annotation-value" :opacity="annotationOpacity">DEPTH: 45px</text>
          <!-- Dimension line -->
          <line :x1="-120" :y1="-60" :x2="120" :y2="-60"
                :stroke="isDark ? '#5ABABA' : '#2E8B8B'"
                stroke-width="1" stroke-dasharray="2,2"
                :opacity="annotationOpacity * 0.7" />
          <line :x1="-120" :y1="-65" :x2="-120" :y2="-55"
                :stroke="isDark ? '#5ABABA' : '#2E8B8B'"
                stroke-width="1" :opacity="annotationOpacity * 0.7" />
          <line :x1="120" :y1="-65" :x2="120" :y2="-55"
                :stroke="isDark ? '#5ABABA' : '#2E8B8B'"
                stroke-width="1" :opacity="annotationOpacity * 0.7" />
          <text :x="0" :y="-65" class="dimension-label" :opacity="annotationOpacity">Ø 240px</text>
        </g>

        <!-- Layer 3: Cilantro leaves -->
        <g :transform="`translate(0, ${layerOffsets[2]})`" filter="url(#layerShadow)">
          <g v-for="(leaf, i) in cilantroLeaves" :key="`leaf-${i}`"
             :transform="`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.angle})`">
            <path d="M 0,0 Q -8,-12 -6,-20 Q -4,-14 0,-8 Q 4,-14 6,-20 Q 8,-12 0,0 Z"
                  :fill="isDark ? '#4EABAB' : '#2E8B8B'"
                  :stroke="isDark ? '#2E8B8B' : '#1E6B6B'"
                  stroke-width="1" />
            <line x1="0" y1="0" x2="0" y2="-20"
                  :stroke="isDark ? '#2E8B8B' : '#1E6B6B'"
                  stroke-width="1" />
          </g>
          <!-- Annotation -->
          <line :x1="-110" :y1="0" :x2="-230" :y2="10"
                stroke="#2E8B8B" stroke-width="1" :opacity="annotationOpacity" />
          <text :x="-420" :y="15" class="annotation-label" :opacity="annotationOpacity">SKILLS LAYER - 16 WORKFLOWS</text>
          <text :x="-420" :y="30" class="annotation-value" :opacity="annotationOpacity">COVERAGE: 99%</text>
        </g>

        <!-- Layer 4: Tomato cubes -->
        <g :transform="`translate(0, ${layerOffsets[3]})`" filter="url(#layerShadow)">
          <g transform="translate(-50, -20)">
            <path d="M 0,0 L 12,-6 L 24,0 L 12,6 Z" fill="url(#tomatoGradient)" stroke="#C0392B" stroke-width="1.5" />
            <path d="M 12,6 L 12,18 L 0,12 L 0,0 Z" fill="#C0392B" stroke="#A0291B" stroke-width="1.5" />
            <path d="M 12,6 L 24,0 L 24,12 L 12,18 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="1.5" />
          </g>
          <g transform="translate(30, -15)">
            <path d="M 0,0 L 12,-6 L 24,0 L 12,6 Z" fill="url(#tomatoGradient)" stroke="#C0392B" stroke-width="1.5" />
            <path d="M 12,6 L 12,18 L 0,12 L 0,0 Z" fill="#C0392B" stroke="#A0291B" stroke-width="1.5" />
            <path d="M 12,6 L 24,0 L 24,12 L 12,18 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="1.5" />
          </g>
          <g transform="translate(-10, 20)">
            <path d="M 0,0 L 12,-6 L 24,0 L 12,6 Z" fill="url(#tomatoGradient)" stroke="#C0392B" stroke-width="1.5" />
            <path d="M 12,6 L 12,18 L 0,12 L 0,0 Z" fill="#C0392B" stroke="#A0291B" stroke-width="1.5" />
            <path d="M 12,6 L 24,0 L 24,12 L 12,18 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="1.5" />
          </g>
          <g transform="translate(40, 25)">
            <path d="M 0,0 L 12,-6 L 24,0 L 12,6 Z" fill="url(#tomatoGradient)" stroke="#C0392B" stroke-width="1.5" />
            <path d="M 12,6 L 12,18 L 0,12 L 0,0 Z" fill="#C0392B" stroke="#A0291B" stroke-width="1.5" />
            <path d="M 12,6 L 24,0 L 24,12 L 12,18 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="1.5" />
          </g>
          <!-- Annotation -->
          <line :x1="70" :y1="20" :x2="220" :y2="-20"
                stroke="#2E8B8B" stroke-width="1" :opacity="annotationOpacity" />
          <text :x="230" :y="-15" class="annotation-label" :opacity="annotationOpacity">MEMORY PROTOCOL</text>
          <text :x="230" :y="0" class="annotation-value" :opacity="annotationOpacity">4 CHUNKS</text>
        </g>

        <!-- Layer 5: Onion rings -->
        <g :transform="`translate(0, ${layerOffsets[4]})`" filter="url(#layerShadow)">
          <ellipse cx="-40" cy="-10" rx="18" ry="12"
                   :fill="isDark ? '#E8E6DD' : '#FAF9F5'"
                   :stroke="isDark ? '#C8C6BD' : '#C8C6DD'"
                   stroke-width="2" />
          <ellipse cx="-40" cy="-10" rx="10" ry="6"
                   fill="none"
                   :stroke="isDark ? '#C8C6BD' : '#B8B6CD'"
                   stroke-width="1.5" />
          <ellipse cx="40" cy="0" rx="20" ry="14"
                   :fill="isDark ? '#E8E6DD' : '#FAF9F5'"
                   :stroke="isDark ? '#C8C6BD' : '#C8C6DD'"
                   stroke-width="2" />
          <ellipse cx="40" cy="0" rx="11" ry="7"
                   fill="none"
                   :stroke="isDark ? '#C8C6BD' : '#B8B6CD'"
                   stroke-width="1.5" />
          <ellipse cx="0" cy="20" rx="16" ry="11"
                   :fill="isDark ? '#E8E6DD' : '#FAF9F5'"
                   :stroke="isDark ? '#C8C6BD' : '#C8C6DD'"
                   stroke-width="2" />
          <ellipse cx="0" cy="20" rx="9" ry="5"
                   fill="none"
                   :stroke="isDark ? '#C8C6BD' : '#B8B6CD'"
                   stroke-width="1.5" />
          <!-- Annotation -->
          <line :x1="60" :y1="10" :x2="200" :y2="-50"
                stroke="#2E8B8B" stroke-width="1" :opacity="annotationOpacity" />
          <text :x="210" :y="-45" class="annotation-label" :opacity="annotationOpacity">SHARED STATE</text>
          <text :x="210" :y="-30" class="annotation-value" :opacity="annotationOpacity">ATOMIC WRITES</text>
        </g>

        <!-- Layer 6: Lime wedge (top - drawn last, appears on top) -->
        <g :transform="`translate(0, ${layerOffsets[5]})`" filter="url(#layerShadow)">
          <path d="M -30,-20 L 30,-20 L 0,30 Z"
                :fill="isDark ? '#98D693' : 'url(#limeGradient)'"
                :stroke="isDark ? '#7AB675' : '#8BC68A'"
                stroke-width="2" />
          <path d="M -15,-10 L 15,-10 L 0,15 Z"
                :fill="isDark ? '#B8E6B3' : '#D0F0CC'"
                :stroke="isDark ? '#98D693' : '#A8E6A3'"
                stroke-width="1" />
          <!-- Annotation -->
          <line :x1="40" :y1="0" :x2="160" :y2="-80"
                stroke="#2E8B8B" stroke-width="1" :opacity="annotationOpacity" />
          <text :x="170" :y="-75" class="annotation-label" :opacity="annotationOpacity">CAD WORKFLOW</text>
          <text :x="170" :y="-60" class="annotation-value" :opacity="annotationOpacity">MISUSE-FIRST</text>
        </g>

      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

const svg = ref<SVGElement | null>(null);
const anchor = ref<HTMLDivElement | null>(null);

// Brand colors
const COLORS = {
  guacGreen: '#4A7C59',
  avocadoPit: '#2D3B2D',
  cilantroTeal: '#2E8B8B',
  chipWhite: '#FAF9F5',
};

// Animation state
let animationId: number | null = null;
let observer: IntersectionObserver | null = null;
let resizeObs: ResizeObserver | null = null;
let darkModeObs: MutationObserver | null = null;
let isVisible = true;
const isDark = ref(false);
const rotation = ref(0);
const skew = ref(-5);
const annotationOpacity = ref(0.8);
const isMobile = ref(false);

function checkMobile() {
  isMobile.value = window.innerWidth < 960;
}

// Layer positions (vertical offsets in SVG units) - more spread for dramatic exploded effect
const baseOffsets = [-60, -140, -220, -300, -375, -450];
const layerOffsets = ref([...baseOffsets]);

// Float animation parameters for each layer (amplitude and phase)
const floatParams = [
  { amplitude: 4, period: 5000, phase: 0 },
  { amplitude: 6, period: 4500, phase: 0.3 },
  { amplitude: 8, period: 5500, phase: 0.7 },
  { amplitude: 7, period: 4800, phase: 1.2 },
  { amplitude: 5, period: 5200, phase: 1.8 },
  { amplitude: 6, period: 6000, phase: 2.3 },
];

// Cilantro leaf positions
const cilantroLeaves = [
  { x: -60, y: -10, angle: -30 },
  { x: -30, y: 15, angle: 20 },
  { x: 20, y: -5, angle: -15 },
  { x: 60, y: 10, angle: 35 },
  { x: 0, y: -20, angle: 0 },
  { x: -40, y: 20, angle: 45 },
  { x: 50, y: -15, angle: -25 },
];

// Guacamole texture dots
const guacDots = Array.from({ length: 30 }, () => ({
  x: (Math.random() - 0.5) * 200,
  y: (Math.random() - 0.5) * 80,
  r: 2 + Math.random() * 3,
}));

// Assembly state
let assemblyTimer = 0;
const ASSEMBLY_INTERVAL = 15000; // Every 15 seconds
const ASSEMBLY_DURATION = 1500;  // 1.5 second assembly

function checkDarkMode() {
  isDark.value = document.documentElement.classList.contains('dark');
}

function animate() {
  if (!isVisible) {
    animationId = requestAnimationFrame(animate);
    return;
  }

  const time = Date.now();
  const dt = time - assemblyTimer;

  // Gentle oscillation: ±5° over 12 seconds
  rotation.value = Math.sin((time / 12000) * Math.PI * 2) * 5;

  // Check if we're in assembly mode
  const isAssembling = dt % ASSEMBLY_INTERVAL < ASSEMBLY_DURATION;

  if (isAssembling) {
    // Compress layers together
    const progress = (dt % ASSEMBLY_INTERVAL) / ASSEMBLY_DURATION;
    const easeInOut = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    layerOffsets.value = baseOffsets.map((baseOffset, i) => {
      const compressed = -80 - (i * 15); // Compress to minimal spacing
      return baseOffset + (compressed - baseOffset) * easeInOut;
    });
  } else {
    // Normal floating animation
    layerOffsets.value = baseOffsets.map((baseOffset, i) => {
      const { amplitude, period, phase } = floatParams[i];
      const offset = Math.sin((time / period) * Math.PI * 2 + phase) * amplitude;
      return baseOffset + offset;
    });
  }

  // Pulse annotation opacity
  annotationOpacity.value = 0.6 + Math.sin((time / 2000) * Math.PI * 2) * 0.2;

  checkDarkMode();
  animationId = requestAnimationFrame(animate);
}

onMounted(() => {
  if (!svg.value) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Static display
    rotation.value = 15;
    annotationOpacity.value = 0.8;
    return;
  }

  // Intersection observer to pause when off-screen
  observer = new IntersectionObserver(
    (entries) => { isVisible = entries[0].isIntersecting; },
    { threshold: 0.1 }
  );
  if (anchor.value) {
    observer.observe(anchor.value);
  }

  // Dark mode observer
  darkModeObs = new MutationObserver(checkDarkMode);
  darkModeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Resize observer + responsive check
  checkMobile();
  window.addEventListener('resize', checkMobile);
  const heroEl = document.querySelector('.VPHero') as HTMLElement;
  if (heroEl) {
    resizeObs = new ResizeObserver(() => { checkMobile(); });
    resizeObs.observe(heroEl);
  }

  // Start animation
  assemblyTimer = Date.now();
  checkDarkMode();
  animate();
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  observer?.disconnect();
  resizeObs?.disconnect();
  darkModeObs?.disconnect();
  window.removeEventListener('resize', checkMobile);
});
</script>

<style>
/* Styles are in custom.css for proper cascade with VitePress */

.hero-guacamole-anchor {
  position: absolute !important;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100% !important;
  height: 100% !important;
  overflow: visible;
  z-index: 0;
  pointer-events: none;
}

.hero-guacamole-svg {
  position: absolute !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Typography for annotations */
.annotation-label {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  fill: var(--mg-cilantro-teal);
  text-anchor: start;
}

.dark .annotation-label {
  fill: #5ABABA;
}

.annotation-value {
  font-family: 'Courier New', Courier, monospace;
  font-size: 10px;
  font-weight: 400;
  fill: var(--mg-avocado-pit);
  text-anchor: start;
}

.dark .annotation-value {
  fill: var(--mg-dark-text-soft);
}

.dimension-label {
  font-family: 'Courier New', Courier, monospace;
  font-size: 10px;
  font-weight: 500;
  fill: var(--mg-cilantro-teal);
  text-anchor: middle;
}

.dark .dimension-label {
  fill: #5ABABA;
}

/* Responsive: hide on mobile/tablet where hero stacks vertically */
@media (max-width: 960px) {
  .hero-guacamole-anchor {
    display: none;
  }
}
</style>
