/* ================================================================
   SPIDER-MAN LOGIN PAGE — SWING ANIMATION ENGINE
   js/spiderman.js

   Physics-based pendulum swing from top-right, arc to center,
   perch above the card, then breathe-idle.
   Uses a custom rAF loop with parametric Bézier arc motion.
================================================================ */

'use strict';

(function () {

  /* ── Element References ──────────────────────────────────────── */
  const wrapper  = document.getElementById('spiderman-wrapper');
  const svg      = document.getElementById('spiderman-svg');
  const webSVG   = document.getElementById('web-lines-svg');

  /* ── Canvas for web-thread rendering ───────────────────────── */
  const webCanvas = document.getElementById('web-canvas');
  const wCtx      = webCanvas.getContext('2d');

  let W, H, dpr;
  function resizeWeb () {
    dpr = window.devicePixelRatio || 1;
    W   = window.innerWidth;
    H   = window.innerHeight;
    webCanvas.width  = W * dpr;
    webCanvas.height = H * dpr;
    webCanvas.style.width  = W + 'px';
    webCanvas.style.height = H + 'px';
    wCtx.scale(dpr, dpr);
  }

  /* ── State ──────────────────────────────────────────────────── */
  let phase      = 'hidden';   // hidden → swing → land → perch → idle
  let startTime  = null;
  let raf        = null;

  /* ── Swing path definition (Bézier control points) ─────────── */
  // We define three swings and a landing arc as Bézier segments
  const swingDuration = 2400; // ms total swing
  const landDuration  = 600;  // ms final approach to perch

  // Anchor point (where the web attaches at the top — skyscraper)
  const anchor = { x: 0.88, y: 0.02 }; // as fraction of viewport

  // Keyframes: [ t_start, t_end, ctrl1, ctrl2, end ] all as {x, y} fractions
  const swingPath = [
    // Swing 1: appear from off-screen top-right → arc left
    {
      t0: 0.00, t1: 0.30,
      p0: { x: 1.05, y: -0.05 },
      c1: { x: 1.00, y:  0.35 },
      c2: { x: 0.70, y:  0.45 },
      p1: { x: 0.55, y:  0.25 },
    },
    // Swing 2: arc back right slightly
    {
      t0: 0.30, t1: 0.55,
      p0: { x: 0.55, y: 0.25 },
      c1: { x: 0.45, y: 0.50 },
      c2: { x: 0.60, y: 0.58 },
      p1: { x: 0.72, y: 0.38 },
    },
    // Swing 3: final arc to above card center
    {
      t0: 0.55, t1: 0.85,
      p0: { x: 0.72, y: 0.38 },
      c1: { x: 0.80, y: 0.60 },
      c2: { x: 0.55, y: 0.52 },
      p1: { x: 0.50, y: 0.30 },
    },
    // Land: glide down to perch position above card
    {
      t0: 0.85, t1: 1.00,
      p0: { x: 0.50, y: 0.30 },
      c1: { x: 0.50, y: 0.40 },
      c2: { x: 0.50, y: 0.46 },
      p1: { x: 0.50, y: 0.08 }, // perch: top edge above card
    },
  ];

  /* ── Easing ─────────────────────────────────────────────────── */
  function easeInOutCubic (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutExpo (t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  /* ── Cubic Bézier evaluation ────────────────────────────────── */
  function bezier (p0, c1, c2, p1, t) {
    const u  = 1 - t;
    const tt = t * t;
    const uu = u * u;
    return {
      x: uu * u * p0.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + tt * t * p1.x,
      y: uu * u * p0.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + tt * t * p1.y,
    };
  }

  /* ── Interpolate across all segments ──────────────────────────*/
  function getPosition (globalT) {
    for (let i = 0; i < swingPath.length; i++) {
      const seg = swingPath[i];
      if (globalT >= seg.t0 && globalT <= seg.t1) {
        const localT = (globalT - seg.t0) / (seg.t1 - seg.t0);
        const eased  = easeInOutCubic(localT);
        return bezier(seg.p0, seg.c1, seg.c2, seg.p1, eased);
      }
    }
    return swingPath[swingPath.length - 1].p1;
  }

  /* ── Compute spider rotation (tangent of arc) ────────────────── */
  function getRotation (globalT) {
    const eps  = 0.002;
    const posA = getPosition(Math.max(0, globalT - eps));
    const posB = getPosition(Math.min(1, globalT + eps));
    const dx   = posB.x - posA.x;
    const dy   = posB.y - posA.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    // Rotate figure to face direction of travel (offset 90° since figure is upright)
    return angle - 90;
  }

  /* ── Draw web thread on canvas ─────────────────────────────── */
  // anchorPx: web anchor position in pixels
  // spiderPx: spider current position in pixels
  function drawWebThread (anchorPx, spiderPx, alpha) {
    wCtx.clearRect(0, 0, W, H);
    if (alpha <= 0) return;

    // Main thread
    wCtx.beginPath();
    wCtx.moveTo(anchorPx.x, anchorPx.y);

    // Slight sag for physics feel
    const midX  = (anchorPx.x + spiderPx.x) / 2;
    const midY  = (anchorPx.y + spiderPx.y) / 2 + 30;

    wCtx.quadraticCurveTo(midX, midY, spiderPx.x, spiderPx.y);

    // Web style
    const grad = wCtx.createLinearGradient(anchorPx.x, anchorPx.y, spiderPx.x, spiderPx.y);
    grad.addColorStop(0, `rgba(200, 180, 255, ${alpha * 0.9})`);
    grad.addColorStop(0.5, `rgba(230, 22, 45, ${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(200, 180, 255, ${alpha * 0.7})`);

    wCtx.strokeStyle = grad;
    wCtx.lineWidth   = 1.5;
    wCtx.lineCap     = 'round';

    // Glow
    wCtx.shadowBlur  = 6;
    wCtx.shadowColor = 'rgba(230, 22, 45, 0.6)';
    wCtx.stroke();
    wCtx.shadowBlur  = 0;

    // Secondary thinner thread (parallel)
    wCtx.beginPath();
    wCtx.moveTo(anchorPx.x + 2, anchorPx.y);
    wCtx.quadraticCurveTo(midX + 2, midY + 5, spiderPx.x + 2, spiderPx.y + 5);
    wCtx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
    wCtx.lineWidth   = 0.5;
    wCtx.stroke();
  }

  /* ── Place spider on screen ─────────────────────────────────── */
  function placeSpider (frac, rotation, webAlpha) {
    const px = frac.x * W;
    const py = frac.y * H;

    wrapper.style.transform = `translate(${px - 36}px, ${py - 48}px) rotate(${rotation}deg)`;

    // Draw web from anchor
    const anchorPx = { x: anchor.x * W, y: anchor.y * H };
    const spiderPx = { x: px, y: py };
    drawWebThread(anchorPx, spiderPx, webAlpha);
  }

  /* ── Animation Loop ─────────────────────────────────────────── */
  function animate (timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const totalDur = swingDuration + landDuration;
    const globalT  = Math.min(elapsed / totalDur, 1);

    if (phase === 'swing') {
      const pos      = getPosition(globalT);
      const rotation = getRotation(globalT);

      // Web fades out near landing
      const webAlpha = globalT < 0.85 ? 0.8 : 0.8 * (1 - (globalT - 0.85) / 0.15);

      placeSpider(pos, rotation, webAlpha);

      if (globalT >= 1) {
        // Arrived — perch
        phase = 'perch';
        onPerch();
        return;
      }
    }

    raf = requestAnimationFrame(animate);
  }

  /* ── Perch Behavior ─────────────────────────────────────────── */
  function onPerch () {
    // Clear web thread
    wCtx.clearRect(0, 0, W, H);

    // Perch position: above the login card
    const cardEl = document.getElementById('login-card');
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      const px   = rect.left + rect.width / 2;
      const py   = Math.max(20, rect.top - 70);
      wrapper.style.transform = `translate(${px - 36}px, ${py}px) rotate(0deg)`;
    } else {
      wrapper.style.transform = `translate(calc(50vw - 36px), 60px) rotate(0deg)`;
    }

    // Perch wiggle CSS class
    wrapper.classList.add('is-perched');

    // Draw final web anchor connecting to building
    drawPerchWeb();

    // After wiggle — enter idle
    setTimeout(function () {
      wrapper.classList.remove('is-perched');
      wrapper.classList.add('is-idle');
      phase = 'idle';
    }, 900);
  }

  /* ── Perch Web Lines ─────────────────────────────────────────── */
  function drawPerchWeb () {
    // Draw a small radial web from perch position to nearby card edges
    const cardEl = document.getElementById('login-card');
    if (!cardEl) return;

    const rect   = cardEl.getBoundingClientRect();
    const spiderX = rect.left + rect.width / 2;
    const spiderY = Math.max(20, rect.top - 35);

    // Clear previous
    wCtx.clearRect(0, 0, W, H);

    const anchors = [
      { x: 0,   y: -80 },
      { x: -60, y: -60 },
      { x:  60, y: -60 },
      { x: -30, y: -100 },
      { x:  30, y: -100 },
    ];

    anchors.forEach(function (offset) {
      const ax = spiderX + offset.x;
      const ay = spiderY + offset.y;

      wCtx.beginPath();
      wCtx.moveTo(spiderX, spiderY);
      wCtx.lineTo(ax, ay);
      wCtx.strokeStyle = 'rgba(200, 180, 255, 0.4)';
      wCtx.lineWidth   = 0.8;
      wCtx.shadowBlur  = 4;
      wCtx.shadowColor = 'rgba(230, 22, 45, 0.4)';
      wCtx.stroke();
      wCtx.shadowBlur  = 0;
    });

    // Fade out web after 2 seconds
    let webAlpha = 0.4;
    const fadeInterval = setInterval(function () {
      webAlpha -= 0.02;
      if (webAlpha <= 0) {
        clearInterval(fadeInterval);
        wCtx.clearRect(0, 0, W, H);
        return;
      }
      wCtx.clearRect(0, 0, W, H);
      anchors.forEach(function (offset) {
        const ax = spiderX + offset.x;
        const ay = spiderY + offset.y;
        wCtx.beginPath();
        wCtx.moveTo(spiderX, spiderY);
        wCtx.lineTo(ax, ay);
        wCtx.strokeStyle = `rgba(200, 180, 255, ${webAlpha})`;
        wCtx.lineWidth   = 0.8;
        wCtx.stroke();
      });
    }, 50);
  }

  /* ── Web Shoot on Form Submit ───────────────────────────────── */
  window.spiderShootWeb = function (fromEl, toX, toY) {
    if (!fromEl) return;
    const rect = fromEl.getBoundingClientRect();
    const fx   = rect.left + rect.width / 2;
    const fy   = rect.top + rect.height / 2;

    wCtx.clearRect(0, 0, W, H);
    wCtx.beginPath();
    wCtx.moveTo(fx, fy);
    wCtx.lineTo(toX, toY);

    const grad = wCtx.createLinearGradient(fx, fy, toX, toY);
    grad.addColorStop(0, 'rgba(230, 22, 45, 0.8)');
    grad.addColorStop(1, 'rgba(200, 180, 255, 0.1)');
    wCtx.strokeStyle = grad;
    wCtx.lineWidth   = 2;
    wCtx.shadowBlur  = 10;
    wCtx.shadowColor = 'rgba(230, 22, 45, 0.7)';
    wCtx.stroke();
    wCtx.shadowBlur  = 0;

    // Fade
    let a = 1;
    const fade = setInterval(function () {
      a -= 0.05;
      if (a <= 0) { clearInterval(fade); wCtx.clearRect(0, 0, W, H); return; }
      wCtx.clearRect(0, 0, W, H);
      wCtx.beginPath();
      wCtx.moveTo(fx, fy);
      wCtx.lineTo(toX, toY);
      const g2 = wCtx.createLinearGradient(fx, fy, toX, toY);
      g2.addColorStop(0, `rgba(230, 22, 45, ${a * 0.8})`);
      g2.addColorStop(1, `rgba(200, 180, 255, ${a * 0.1})`);
      wCtx.strokeStyle = g2;
      wCtx.lineWidth   = 2 * a;
      wCtx.stroke();
    }, 30);
  };

  /* ── Parallax on mousemove ──────────────────────────────────── */
  document.addEventListener('mousemove', function (e) {
    if (phase !== 'idle') return;

    // Subtle idle drift tracking mouse
    const cardEl = document.getElementById('login-card');
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    const px   = rect.left + rect.width / 2;
    const py   = Math.max(20, rect.top - 70);

    const dx = (e.clientX - W / 2) / W * 6;
    const dy = (e.clientY - H / 2) / H * 4;

    wrapper.style.transform =
      `translate(${px - 36 + dx}px, ${py + dy}px) rotate(${dx * 0.5}deg)`;
  }, { passive: true });

  /* ── Skyline Parallax ───────────────────────────────────────── */
  const skylineLayers = document.querySelectorAll('.skyline[data-parallax]');

  document.addEventListener('mousemove', function (e) {
    const cx = e.clientX / W - 0.5; // -0.5 to +0.5
    const cy = e.clientY / H - 0.5;

    skylineLayers.forEach(function (layer) {
      const factor = parseFloat(layer.getAttribute('data-parallax')) || 0.03;
      const tx = cx * factor * W * 0.5;
      const ty = cy * factor * H * 0.3;
      layer.style.transform = `translate(${tx}px, ${ty}px)`;
    });
  }, { passive: true });

  /* ── Init ───────────────────────────────────────────────────── */
  function init () {
    resizeWeb();
    window.addEventListener('resize', function () {
      resizeWeb();
      if (phase === 'idle') {
        // Reposition on resize
        const cardEl = document.getElementById('login-card');
        if (cardEl) {
          const rect = cardEl.getBoundingClientRect();
          const px   = rect.left + rect.width / 2;
          const py   = Math.max(20, rect.top - 70);
          wrapper.style.transform = `translate(${px - 36}px, ${py}px) rotate(0deg)`;
        }
      }
    }, { passive: true });

    // Start swing after a brief delay (let card animate in)
    setTimeout(function () {
      wrapper.style.display = 'block';
      phase = 'swing';
      raf   = requestAnimationFrame(animate);
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
