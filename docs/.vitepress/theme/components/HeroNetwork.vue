<template>
  <div class="hero-network-anchor" ref="anchor">
    <canvas
      ref="canvas"
      class="hero-network-canvas"
      aria-hidden="true"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const canvas = ref<HTMLCanvasElement | null>(null);
const anchor = ref<HTMLDivElement | null>(null);

// Brand colors
const COLORS = {
  guacGreen: '#4A7C59',
  avocadoPit: '#2D3B2D',
  limeZest: '#8FBC8F',
  cilantroTeal: '#2E8B8B',
  chipGold: '#D4A843',
  limeWash: '#C8E6D0',
  saltRim: '#E8E6DD',
  darkBg: '#1A2A1A',
  darkText: '#C8E6D0',
};

// Agent names for the network
const AGENTS = {
  inner: ['CEO', 'CTO', 'Engineering Director', 'Product Owner', 'Art Director', 'Staff Engineer'],
  middle: ['Engineering Manager', 'Product Manager', 'Dev', 'QA', 'Design', 'DevOps', 'Technical Writer'],
  outer: ['Data Engineer', 'API Designer', 'Security Engineer', 'Copywriter', 'Deployment Engineer', 'Supervisor'],
};

interface Node {
  ring: number;
  angle: number;
  radius: number;
  size: number;
  color: string;
  label: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

interface DataPulse {
  fromNode: number;
  toNode: number;
  progress: number;
  startTime: number;
}

// Animation state
let animationId: number | null = null;
let nodes: Node[] = [];
let particles: Particle[] = [];
let dataPulses: DataPulse[] = [];
let startTime = Date.now();
let lastPulseTime = 0;
let observer: IntersectionObserver | null = null;
let resizeObs: ResizeObserver | null = null;
let darkModeObs: MutationObserver | null = null;
let isVisible = true;
let isDark = false;
let logoImage: HTMLImageElement | null = null;
let logoLoaded = false;

// Responsive configuration
let logoSize = 120;
let ringRadii = [150, 220, 290];
let nodeCount = [6, 7, 6];

function checkDarkMode() {
  isDark = document.documentElement.classList.contains('dark');
}

function setupResponsiveConfig(width: number) {
  if (width < 768) {
    logoSize = 80;
    ringRadii = [120];
    nodeCount = [7];
  } else if (width < 1024) {
    logoSize = 100;
    ringRadii = [130, 200];
    nodeCount = [6, 7];
  } else {
    logoSize = 120;
    ringRadii = [150, 220, 290];
    nodeCount = [6, 7, 6];
  }
}

function initNodes() {
  nodes = [];
  let nodeIndex = 0;
  const agentGroups = [AGENTS.inner, AGENTS.middle, AGENTS.outer];

  for (let ring = 0; ring < ringRadii.length; ring++) {
    const count = nodeCount[ring];
    const agents = agentGroups[ring] || [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      nodes.push({
        ring,
        angle,
        radius: ringRadii[ring],
        size: 8 + Math.random() * 4,
        color: nodeIndex % 2 === 0 ? COLORS.guacGreen : COLORS.cilantroTeal,
        label: agents[i] || `Agent ${nodeIndex + 1}`,
      });
      nodeIndex++;
    }
  }
}

function initParticles(width: number, height: number) {
  particles = [];
  const particleCount = width < 768 ? 20 : 35;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.2,
    });
  }
}

function getNetworkCenter(canvasWidth: number, canvasHeight: number) {
  // On desktop, offset network to the right so it doesn't overlap hero text
  if (canvasWidth >= 960) {
    return { x: canvasWidth * 0.65, y: canvasHeight * 0.48 };
  }
  // On smaller screens (stacked layout), center it
  return { x: canvasWidth / 2, y: canvasHeight * 0.48 };
}

function getNodePosition(node: Node, time: number, canvasWidth: number, canvasHeight: number) {
  const center = getNetworkCenter(canvasWidth, canvasHeight);

  const speeds = [60000, 80000, 100000];
  const directions = [1, -1, 1];

  const rotationSpeed = (Math.PI * 2) / speeds[node.ring];
  const direction = directions[node.ring];
  const currentAngle = node.angle + (time * rotationSpeed * direction);

  return {
    x: center.x + Math.cos(currentAngle) * node.radius,
    y: center.y + Math.sin(currentAngle) * node.radius,
    angle: currentAngle,
  };
}

function drawHexGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const hexSize = 40;
  const gridColor = isDark ? 'rgba(58, 74, 58, 0.12)' : 'rgba(232, 230, 221, 0.25)';

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;

  for (let y = -hexSize; y < height + hexSize; y += hexSize * 1.5) {
    for (let x = -hexSize; x < width + hexSize; x += hexSize * Math.sqrt(3)) {
      const offsetX = (Math.floor(y / (hexSize * 1.5)) % 2) * (hexSize * Math.sqrt(3) / 2);
      drawHexagon(ctx, x + offsetX, y, hexSize);
    }
  }
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const hx = x + size * Math.cos(angle);
    const hy = y + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(hx, hy);
    } else {
      ctx.lineTo(hx, hy);
    }
  }
  ctx.closePath();
  ctx.stroke();
}

function drawLogo(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) {
  const pulseScale = 1.0 + Math.sin(time / 3000 * Math.PI * 2) * 0.02;
  const size = logoSize * pulseScale;

  // Draw glow behind logo
  ctx.save();
  const glowColor = isDark ? COLORS.limeWash : COLORS.guacGreen;
  const gradient = ctx.createRadialGradient(centerX, centerY, size * 0.3, centerX, centerY, size * 0.9);
  gradient.addColorStop(0, `${glowColor}25`);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Draw the SVG logo image if loaded
  if (logoLoaded && logoImage) {
    ctx.save();
    ctx.drawImage(logoImage, centerX - size / 2, centerY - size / 2, size, size);
    ctx.restore();
  }
}

function drawConnections(ctx: CanvasRenderingContext2D, time: number, width: number, height: number, center?: { x: number; y: number }) {
  const c = center || getNetworkCenter(width, height);

  // Draw connections from hub (center) to inner ring nodes
  ctx.globalAlpha = isDark ? 0.15 : 0.12;
  ctx.lineWidth = 1;
  for (const node of nodes) {
    if (node.ring !== 0) continue;
    const pos = getNodePosition(node, time, width, height);
    const color = isDark ? COLORS.darkText : COLORS.guacGreen;
    const gradient = ctx.createLinearGradient(c.x, c.y, pos.x, pos.y);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}00`);
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  // Draw connections between nearby nodes on same ring
  ctx.globalAlpha = isDark ? 0.2 : 0.15;
  for (let i = 0; i < nodes.length; i++) {
    const node1 = nodes[i];
    const pos1 = getNodePosition(node1, time, width, height);

    for (let j = i + 1; j < nodes.length; j++) {
      const node2 = nodes[j];
      if (node1.ring !== node2.ring) continue;

      const pos2 = getNodePosition(node2, time, width, height);
      const angleDiff = Math.abs(pos1.angle - pos2.angle);
      const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

      if (normalizedDiff < Math.PI / 3) {
        const color = isDark ? COLORS.darkText : COLORS.guacGreen;
        const gradient = ctx.createLinearGradient(pos1.x, pos1.y, pos2.x, pos2.y);
        gradient.addColorStop(0, `${color}00`);
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, `${color}00`);
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.stroke();
      }
    }

    // Cross-ring connections (adjacent rings, within 30° arc)
    for (let j = i + 1; j < nodes.length; j++) {
      const node2 = nodes[j];
      if (Math.abs(node1.ring - node2.ring) !== 1) continue;

      const pos2 = getNodePosition(node2, time, width, height);
      const angleDiff = Math.abs(pos1.angle - pos2.angle);
      const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

      if (normalizedDiff < Math.PI / 6) {
        const color = isDark ? COLORS.darkText : COLORS.guacGreen;
        ctx.strokeStyle = `${color}`;
        ctx.globalAlpha = isDark ? 0.08 : 0.06;
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
}

function drawNodes(ctx: CanvasRenderingContext2D, time: number, width: number, height: number) {
  for (const node of nodes) {
    const pos = getNodePosition(node, time, width, height);

    // Node glow
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, node.size * 2.5);
    const glowColor = isDark ? (node.color === COLORS.guacGreen ? '#6A9C79' : '#4EABAB') : node.color;
    gradient.addColorStop(0, `${glowColor}60`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, node.size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Node core
    ctx.fillStyle = isDark ? (node.color === COLORS.guacGreen ? '#6A9C79' : '#4EABAB') : node.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, node.size, 0, Math.PI * 2);
    ctx.fill();

    // Node border
    ctx.strokeStyle = isDark ? COLORS.darkText : COLORS.avocadoPit;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function updateAndDrawParticles(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const particleColor = isDark ? COLORS.darkText : COLORS.limeWash;

  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x < 0) particle.x = width;
    if (particle.x > width) particle.x = 0;
    if (particle.y < 0) particle.y = height;
    if (particle.y > height) particle.y = 0;

    ctx.fillStyle = `${particleColor}${Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')}`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateDataPulses(time: number) {
  if (time - lastPulseTime > 3000 && nodes.length > 1) {
    const fromNode = Math.floor(Math.random() * nodes.length);
    let toNode = Math.floor(Math.random() * nodes.length);
    while (toNode === fromNode) {
      toNode = Math.floor(Math.random() * nodes.length);
    }
    dataPulses.push({ fromNode, toNode, progress: 0, startTime: time });
    lastPulseTime = time;
  }

  dataPulses = dataPulses.filter(pulse => {
    pulse.progress = Math.min((time - pulse.startTime) / 2000, 1);
    return pulse.progress < 1;
  });
}

function drawDataPulses(ctx: CanvasRenderingContext2D, time: number, width: number, height: number) {
  for (const pulse of dataPulses) {
    const fromPos = getNodePosition(nodes[pulse.fromNode], time, width, height);
    const toPos = getNodePosition(nodes[pulse.toNode], time, width, height);

    const x = fromPos.x + (toPos.x - fromPos.x) * pulse.progress;
    const y = fromPos.y + (toPos.y - fromPos.y) * pulse.progress;

    // Trail
    const trailLen = 0.1;
    const trailStart = Math.max(0, pulse.progress - trailLen);
    const tx = fromPos.x + (toPos.x - fromPos.x) * trailStart;
    const ty = fromPos.y + (toPos.y - fromPos.y) * trailStart;
    const trailGrad = ctx.createLinearGradient(tx, ty, x, y);
    const trailColor = isDark ? COLORS.chipGold : COLORS.cilantroTeal;
    trailGrad.addColorStop(0, 'transparent');
    trailGrad.addColorStop(1, `${trailColor}80`);
    ctx.strokeStyle = trailGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Pulse particle glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
    const pulseColor = isDark ? COLORS.chipGold : COLORS.cilantroTeal;
    gradient.addColorStop(0, pulseColor);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = isDark ? COLORS.chipGold : COLORS.cilantroTeal;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function animate() {
  if (!canvas.value || !isVisible) {
    animationId = requestAnimationFrame(animate);
    return;
  }

  const ctx = canvas.value.getContext('2d');
  if (!ctx) return;

  // Use logical size (not DPR-scaled canvas size)
  const { width, height } = getCanvasLogicalSize();
  const time = Date.now() - startTime;

  checkDarkMode();

  ctx.clearRect(0, 0, width, height);

  const center = getNetworkCenter(width, height);

  drawHexGrid(ctx, width, height);
  drawConnections(ctx, time, width, height, center);
  updateAndDrawParticles(ctx, width, height);
  drawLogo(ctx, center.x, center.y, time);
  drawNodes(ctx, time, width, height);
  updateDataPulses(time);
  drawDataPulses(ctx, time, width, height);

  animationId = requestAnimationFrame(animate);
}

function resizeCanvas() {
  if (!canvas.value) return;

  // Find the VPHero parent to match its size
  const heroEl = document.querySelector('.VPHero') as HTMLElement;
  if (!heroEl) return;

  const w = heroEl.offsetWidth;
  const h = heroEl.offsetHeight;
  const dpr = window.devicePixelRatio || 1;

  // Set canvas internal resolution (accounting for DPR for crisp rendering)
  canvas.value.width = w * dpr;
  canvas.value.height = h * dpr;

  const ctx = canvas.value.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);

  setupResponsiveConfig(w);
  initNodes();
  initParticles(w, h);
}

function getCanvasLogicalSize(): { width: number; height: number } {
  const heroEl = document.querySelector('.VPHero') as HTMLElement;
  if (!heroEl) return { width: 800, height: 600 };
  return { width: heroEl.offsetWidth, height: heroEl.offsetHeight };
}

onMounted(() => {
  if (!canvas.value) return;

  // Load the SVG logo image
  logoImage = new Image();
  logoImage.onload = () => { logoLoaded = true; };
  // Use import.meta.env.BASE_URL for correct path in VitePress
  logoImage.src = (import.meta as any).env?.BASE_URL
    ? `${(import.meta as any).env.BASE_URL}logo.svg`
    : '/miniature-guacamole/logo.svg';

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initial resize
  resizeCanvas();

  if (prefersReducedMotion) {
    const ctx = canvas.value.getContext('2d');
    if (ctx) {
      const { width, height } = getCanvasLogicalSize();
      const center = getNetworkCenter(width, height);
      drawHexGrid(ctx, width, height);
      drawLogo(ctx, center.x, center.y, 0);
      drawConnections(ctx, 0, width, height, center);
      drawNodes(ctx, 0, width, height);
    }
    return;
  }

  // Intersection observer to pause when off-screen
  observer = new IntersectionObserver(
    (entries) => { isVisible = entries[0].isIntersecting; },
    { threshold: 0.1 }
  );
  observer.observe(canvas.value);

  // Resize observer on the hero element
  const heroEl = document.querySelector('.VPHero') as HTMLElement;
  if (heroEl) {
    resizeObs = new ResizeObserver(resizeCanvas);
    resizeObs.observe(heroEl);
  }

  // Dark mode observer
  darkModeObs = new MutationObserver(checkDarkMode);
  darkModeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Window resize handler
  window.addEventListener('resize', resizeCanvas);

  // Start animation
  startTime = Date.now();
  animate();
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  observer?.disconnect();
  resizeObs?.disconnect();
  darkModeObs?.disconnect();
  window.removeEventListener('resize', resizeCanvas);
});
</script>

<style>
/* Styles are in custom.css for proper cascade with VitePress */
</style>
