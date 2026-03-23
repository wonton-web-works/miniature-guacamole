// ── Enterprise page interactive scripts ────────────────────────────────────
// Extracted from enterprise.astro inline <script> block to enable script-src
// 'self' in the Content-Security-Policy header.

// ── Constellation particles ─────────────────────────────────────────────────
(function () {
  const container = document.getElementById('particles-container');
  if (!container) return;

  // Respect user's reduced-motion preference — skip all animated particles
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const positions = [
    { x: 60, y: 8 }, { x: 78, y: 22 }, { x: 45, y: 35 },
    { x: 88, y: 45 }, { x: 55, y: 58 }, { x: 72, y: 68 },
    { x: 40, y: 15 }, { x: 92, y: 30 }, { x: 65, y: 80 },
    { x: 80, y: 75 }, { x: 50, y: 90 }, { x: 95, y: 62 },
    { x: 30, y: 50 }, { x: 70, y: 12 },
  ];

  const pulseIndices = [2, 5, 9];

  positions.forEach((pos, i) => {
    const dot = document.createElement('div');
    dot.className = 'particle';
    dot.style.cssText = `
      left: ${pos.x}%;
      top: ${pos.y}%;
      animation-delay: ${800 + i * 40}ms, ${800 + i * 40}ms;
      --base-opacity: 0.3;
    `;
    if (pulseIndices.includes(i)) {
      const dur = 3000 + i * 500;
      const del = i * 400;
      dot.style.setProperty('--dur', dur + 'ms');
      dot.style.setProperty('--delay', del + 'ms');
    } else {
      dot.style.animation = `particleFadeIn 0.4s ease ${800 + i * 40}ms forwards`;
    }
    container.appendChild(dot);
  });

  // Draw hairline connector lines between a few particles
  const lineConnections = [[0,1],[1,3],[3,7],[2,6]] as [number, number][];
  lineConnections.forEach(([a, b]) => {
    const pA = positions[a];
    const pB = positions[b];
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const line = document.createElement('div');
    line.className = 'particle-line';
    line.style.cssText = `
      left: ${pA.x}%;
      top: ${pA.y}%;
      width: ${len}%;
      transform: rotate(${angle}deg);
      transform-origin: 0 50%;
      animation: particleFadeIn 0.4s ease ${1200}ms forwards;
      opacity: 0;
    `;
    container.appendChild(line);
  });
})();

// ── IntersectionObserver for scroll reveals ──────────────────────────────────
(function () {
  document.querySelectorAll<HTMLElement>('[data-delay]').forEach((el) => {
    el.style.setProperty('--reveal-delay', el.dataset.delay ?? null);
  });
  document.querySelectorAll<HTMLElement>('.reveal[style*="--delay"]').forEach((el) => {
    const d = el.style.getPropertyValue('--delay');
    if (d) el.style.setProperty('--reveal-delay', d);
  });
  document.querySelectorAll<HTMLElement>('#csuite-row .reveal, #dir-row .reveal').forEach((el) => {
    const d = el.style.getPropertyValue('--delay');
    if (d) el.style.setProperty('--reveal-delay', d);
  });

  const reveals = document.querySelectorAll<HTMLElement>('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target as HTMLElement;

      el.querySelectorAll<HTMLElement>('[style*="--delay"]').forEach((child) => {
        const d = child.style.getPropertyValue('--delay');
        if (d) child.style.setProperty('--reveal-delay', d);
        child.classList.add('visible');
      });

      el.classList.add('visible');
      observer.unobserve(el);
    });
  }, { threshold: 0.15 });

  reveals.forEach((el) => observer.observe(el));
})();

// ── Selective spawning interactivity ─────────────────────────────────────────
(function () {
  type ScenarioKey = 'pure-engineering' | 'eng-product' | 'brand-ux' | 'full-initiative';

  const scenarios: Record<ScenarioKey, { active: string[]; task: string; svgTitle: string }> = {
    'pure-engineering': {
      active: ['CTO'],
      task: 'Refactor the auth service. Replace JWT with short-lived tokens.',
      svgTitle: 'For Pure engineering, The Sage activates: CTO',
    },
    'eng-product': {
      active: ['CTO', 'CEO'],
      task: 'Build the new onboarding flow with feature flags.',
      svgTitle: 'For Engineering + product, The Sage activates: CTO, CEO',
    },
    'brand-ux': {
      active: ['CTO', 'CMO'],
      task: 'Redesign the landing page. Update brand voice and component library.',
      svgTitle: 'For Brand / UX, The Sage activates: CTO, CMO',
    },
    'full-initiative': {
      active: ['CEO', 'CTO', 'CMO', 'CFO'],
      task: 'Launch v2.0. New pricing, new infra, new market positioning.',
      svgTitle: 'For Full initiative, The Sage activates: CEO, CTO, CMO, CFO',
    },
  };

  // Full role name expansion for accessible aria-labels
  const roleNames: Record<string, string> = {
    CEO: 'Chief Executive Officer',
    CTO: 'Chief Technology Officer',
    CMO: 'Chief Marketing Officer',
    CFO: 'Chief Financial Officer',
  };

  const tabs = document.querySelectorAll<HTMLElement>('.scenario-tab');
  const nodes = document.querySelectorAll<HTMLElement>('.spawn-node');
  const taskDesc = document.getElementById('task-desc');
  const sageNode = document.getElementById('spawn-sage');
  const svgTitle = document.getElementById('spawn-svg-title');
  const tabContainer = document.querySelector<HTMLElement>('.scenario-tabs');

  function drawSpawnLines(activeRoles: string[]) {
    // Guard: skip if SVG hidden on mobile
    const spawnSvg = document.getElementById('spawn-svg');
    if (spawnSvg && getComputedStyle(spawnSvg).display === 'none') return;

    const svg = document.getElementById('spawn-svg') as SVGSVGElement | null;
    const spawnRight = document.querySelector('.spawning-right');
    if (!svg || !spawnRight) return;

    const titleEl = svg.querySelector('title');
    // Clear existing paths safely without innerHTML
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (titleEl) svg.appendChild(titleEl);

    const svgRect = svg.getBoundingClientRect();
    if (!svgRect.width) return;

    const sageEl = document.getElementById('spawn-sage');
    if (!sageEl) return;
    const sageR = sageEl.getBoundingClientRect();
    const sageX = sageR.left + sageR.width / 2 - svgRect.left;
    const sageY = sageR.bottom - svgRect.top;

    const spawnNodes = document.querySelectorAll<HTMLElement>('.spawn-node');
    spawnNodes.forEach((node) => {
      const role = node.dataset.role ?? '';
      const isActive = activeRoles.includes(role);
      const nR = node.getBoundingClientRect();
      const nx = nR.left + nR.width / 2 - svgRect.left;
      const ny = nR.top - svgRect.top;
      const midX = (sageX + nx) / 2;
      const midY = (sageY + ny) / 2;
      const bow = (nx > sageX ? 1 : nx < sageX ? -1 : 0) * 16;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${sageX} ${sageY} Q ${midX + bow} ${midY} ${nx} ${ny}`);
      path.setAttribute('fill', 'none');

      if (isActive) {
        path.setAttribute('stroke', 'rgba(46,139,139,0.5)');
        path.setAttribute('stroke-width', '1.5');
        const len = path.getTotalLength ? path.getTotalLength() : 120;
        path.style.strokeDasharray = String(len);
        path.style.strokeDashoffset = String(len);
        path.style.transition = 'stroke-dashoffset 0.3s ease';
        svg.appendChild(path);
        requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
      } else {
        path.setAttribute('stroke', 'rgba(138,155,176,0.1)');
        path.setAttribute('stroke-width', '0.5');
        svg.appendChild(path);
      }
    });
  }

  function applyScenario(scenarioKey: string) {
    const scenario = scenarios[scenarioKey as ScenarioKey];
    if (!scenario) return;

    tabs.forEach((tab) => {
      const isActive = tab.dataset.scenario === scenarioKey;
      tab.setAttribute('aria-checked', String(isActive));
      // Roving tabindex: only the active tab is in the tab order
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    nodes.forEach((node) => {
      node.classList.remove('active');
      node.classList.add('dormant');
      const abbr = node.dataset.role ?? '';
      const fullName = roleNames[abbr] ?? abbr;
      node.setAttribute('aria-label', `${fullName} — not needed for this task type`);
    });

    sageNode?.classList.add('pulsing');

    const activeRoles = scenario.active;
    setTimeout(() => {
      activeRoles.forEach((role, i) => {
        setTimeout(() => {
          const node = document.querySelector<HTMLElement>(`.spawn-node[data-role="${role}"]`);
          if (node) {
            node.classList.remove('dormant');
            node.classList.add('active');
            const fullName = roleNames[role] ?? role;
            node.setAttribute('aria-label', `${fullName} — active for this task type`);
          }
        }, i * 100);
      });
    }, 200);

    setTimeout(() => {
      sageNode?.classList.remove('pulsing');
      const totalStagger = (activeRoles.length - 1) * 100;
      setTimeout(() => drawSpawnLines(activeRoles), totalStagger + 50);
    }, 400);

    setTimeout(() => {
      if (taskDesc) taskDesc.textContent = scenario.task;
    }, 600);

    if (svgTitle) svgTitle.textContent = scenario.svgTitle;
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      applyScenario(tab.dataset.scenario ?? '');
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        applyScenario(tab.dataset.scenario ?? '');
      }
    });
  });

  // Roving tabindex keyboard navigation for radiogroup (ARIA APG pattern)
  if (tabContainer) {
    tabContainer.addEventListener('keydown', (e) => {
      const tabList = [...tabContainer.querySelectorAll<HTMLElement>('.scenario-tab')];
      const current = tabList.findIndex(t => t.getAttribute('aria-checked') === 'true');
      let next = current;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (current + 1) % tabList.length;
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (current - 1 + tabList.length) % tabList.length;
        e.preventDefault();
      }
      if (next !== current) {
        tabList[next].click();
        tabList[next].focus();
      }
    });
  }

  // Initialize roving tabindex on page load
  tabs.forEach((tab) => {
    const isActive = tab.getAttribute('aria-checked') === 'true';
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  const initialTab = document.querySelector<HTMLElement>('.scenario-tab[aria-checked="true"]');
  if (initialTab) {
    const initialScenario = scenarios[initialTab.dataset.scenario as ScenarioKey];
    if (initialScenario) {
      setTimeout(() => drawSpawnLines(initialScenario.active), 300);
    }
  }
})();

// ── Hierarchy SVG connection lines ────────────────────────────────────────────
(function () {
  function makePath(
    svg: SVGSVGElement,
    d: string,
    stroke: string,
    strokeWidth: number,
    animate: boolean
  ) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', String(strokeWidth));
    path.setAttribute('fill', 'none');
    if (animate) {
      const totalLen = path.getTotalLength ? path.getTotalLength() : 200;
      path.style.strokeDasharray = String(totalLen);
      path.style.strokeDashoffset = String(totalLen);
      path.style.transition = 'stroke-dashoffset 0.6s ease 0.3s';
      svg.appendChild(path);
      requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
    } else {
      svg.appendChild(path);
    }
  }

  function midBowPath(x1: number, y1: number, x2: number, y2: number) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const bow = (x2 > x1 ? 1 : x2 < x1 ? -1 : 0) * 18;
    return `M ${x1} ${y1} Q ${midX + bow} ${midY} ${x2} ${y2}`;
  }

  function drawHierarchyLines() {
    // Guard: skip if SVG hidden on mobile
    const hierarchySvg = document.getElementById('hierarchy-svg');
    if (hierarchySvg && getComputedStyle(hierarchySvg).display === 'none') return;

    const svg = document.getElementById('hierarchy-svg') as SVGSVGElement | null;
    const wrap = document.querySelector('.hierarchy-wrap');
    if (!svg || !wrap) return;

    // Clear existing paths safely without innerHTML
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const wrapRect = wrap.getBoundingClientRect();

    function cx(el: Element) { const r = el.getBoundingClientRect(); return r.left + r.width / 2 - wrapRect.left; }
    function top(el: Element) { return el.getBoundingClientRect().top - wrapRect.top; }
    function bot(el: Element) { return el.getBoundingClientRect().bottom - wrapRect.top; }

    const sageEl = wrap.querySelector('.sage-circle');
    if (!sageEl) return;
    const sageX = cx(sageEl);
    const sageBottom = bot(sageEl);

    const csuiteNodes = Array.from(wrap.querySelectorAll('#csuite-row .csuite-node'));
    csuiteNodes.forEach((node) => {
      const nx = cx(node);
      const ny = top(node);
      makePath(svg, midBowPath(sageX, sageBottom, nx, ny),
        'rgba(46,139,139,0.4)', 1.5, true);
    });

    const dirNodes = Array.from(wrap.querySelectorAll('#dir-row .dir-node'));
    if (csuiteNodes.length && dirNodes.length) {
      const csuiteBottoms = csuiteNodes.map((n) => ({ x: cx(n), y: bot(n) }));
      dirNodes.forEach((dNode) => {
        const dnx = cx(dNode);
        const dny = top(dNode);
        const closest = csuiteBottoms.reduce((best, c) =>
          Math.abs(c.x - dnx) < Math.abs(best.x - dnx) ? c : best
        );
        makePath(svg, midBowPath(closest.x, closest.y, dnx, dny),
          'rgba(46,139,139,0.25)', 1, false);
      });
    }

    const icRow = wrap.querySelector('#ic-row');
    if (icRow && dirNodes.length) {
      const icRect = icRow.getBoundingClientRect();
      const icCenterX = icRect.left + icRect.width / 2 - wrapRect.left;
      const icTop = icRect.top - wrapRect.top;
      dirNodes.forEach((dNode) => {
        const dnx = cx(dNode);
        const dnBottom = bot(dNode);
        makePath(svg, midBowPath(dnx, dnBottom, icCenterX, icTop),
          'rgba(46,139,139,0.15)', 0.5, false);
      });
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(drawHierarchyLines, 100);
  } else {
    window.addEventListener('load', () => setTimeout(drawHierarchyLines, 100));
  }

  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      requestAnimationFrame(drawHierarchyLines);
    }, 150);
  });
})();
