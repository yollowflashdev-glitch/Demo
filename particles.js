/* ================================================================
   SPIDER-MAN LOGIN PAGE — PARTICLES ENGINE
   js/particles.js

   Renders two layers:
   1. Floating ambient particles (dust / spores)
   2. Occasional web-thread streaks shooting across the bg
================================================================ */

'use strict';

(function () {

  /* ── Canvas Setup ───────────────────────────────────────────── */
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H, dpr, raf;
  const particles = [];
  const webStreaks = [];

  /* ── Config ─────────────────────────────────────────────────── */
  const CFG = {
    particleCount : 55,
    colors        : [
      'rgba(230, 22, 45,',   // red
      'rgba(37, 99, 235,',   // blue
      'rgba(0, 212, 255,',   // cyan
      'rgba(255, 255, 255,', // white
    ],
    streakInterval: 3000,  // ms between web streaks
  };

  /* ── Resize ─────────────────────────────────────────────────── */
  function resize () {
    dpr    = window.devicePixelRatio || 1;
    W      = window.innerWidth;
    H      = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
  }

  /* ── Particle Factory ───────────────────────────────────────── */
  function createParticle (index) {
    const color = CFG.colors[Math.floor(Math.random() * CFG.colors.length)];
    return {
      x      : Math.random() * W,
      y      : Math.random() * H,
      r      : 0.5 + Math.random() * 2,
      vx     : (Math.random() - 0.5) * 0.35,
      vy     : -0.1 - Math.random() * 0.3,
      alpha  : 0.15 + Math.random() * 0.5,
      alphaD : (Math.random() > 0.5 ? 1 : -1) * 0.002,
      color  : color,
      life   : 0,
      maxLife: 200 + Math.random() * 400,
    };
  }

  function spawnParticle (i) {
    particles[i] = createParticle(i);
  }

  function initParticles () {
    for (let i = 0; i < CFG.particleCount; i++) {
      spawnParticle(i);
      // scatter initial Y
      particles[i].y = Math.random() * H;
    }
  }

  /* ── Web Streak Factory ─────────────────────────────────────── */
  function createStreak () {
    const fromRight = Math.random() > 0.5;
    return {
      x1   : fromRight ? W + 10 : -10,
      y1   : Math.random() * H * 0.7,
      x2   : fromRight ? W + 10 : -10,
      y2   : Math.random() * H * 0.7,
      tx1  : fromRight ? -100 : W + 100,
      ty1  : Math.random() * H * 0.7,
      tx2  : fromRight ? -80  : W + 80,
      ty2  : Math.random() * H * 0.7,
      prog : 0,
      speed: 0.012 + Math.random() * 0.01,
      alpha: 0.25 + Math.random() * 0.2,
      width: 0.5 + Math.random() * 1,
    };
  }

  /* ── Update ─────────────────────────────────────────────────── */
  function updateParticle (p) {
    p.x    += p.vx;
    p.y    += p.vy;
    p.life += 1;
    p.alpha += p.alphaD;

    // Wrap at edges
    if (p.x < -5)  p.x = W + 5;
    if (p.x > W+5) p.x = -5;
    if (p.y < -5)  p.y = H + 5;

    // Reverse alpha drift
    if (p.alpha <= 0.05 || p.alpha >= 0.65) {
      p.alphaD *= -1;
      p.alpha = Math.max(0.05, Math.min(0.65, p.alpha));
    }

    // Respawn on max life
    if (p.life >= p.maxLife) {
      Object.assign(p, createParticle());
      p.y = H + 5; // rise from bottom
    }
  }

  function lerpVal (a, b, t) { return a + (b - a) * t; }

  function updateStreak (s) {
    s.prog = Math.min(1, s.prog + s.speed);
  }

  /* ── Draw ───────────────────────────────────────────────────── */
  function draw () {
    ctx.clearRect(0, 0, W, H);

    // Draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();

      // Tiny glow for red/cyan particles
      if (p.color !== 'rgba(255, 255, 255,') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (p.alpha * 0.15) + ')';
        ctx.fill();
      }
    }

    // Draw web streaks
    for (let i = webStreaks.length - 1; i >= 0; i--) {
      const s = webStreaks[i];
      const t = s.prog;

      const cx1 = lerpVal(s.x1, s.tx1, t);
      const cy1 = lerpVal(s.y1, s.ty1, t);
      const cx2 = lerpVal(s.x2, s.tx2, t);
      const cy2 = lerpVal(s.y2, s.ty2, t);

      // Fade in/out
      const fadeAlpha = s.alpha * Math.sin(t * Math.PI);

      ctx.beginPath();
      ctx.moveTo(cx1, cy1);
      ctx.lineTo(cx2, cy2);
      ctx.strokeStyle = `rgba(230, 22, 45, ${fadeAlpha})`;
      ctx.lineWidth   = s.width;
      ctx.lineCap     = 'round';
      ctx.stroke();

      if (t >= 1) webStreaks.splice(i, 1);
    }
  }

  /* ── Animation Loop ─────────────────────────────────────────── */
  function loop () {
    for (let i = 0; i < particles.length; i++) {
      updateParticle(particles[i]);
    }
    for (let i = 0; i < webStreaks.length; i++) {
      updateStreak(webStreaks[i]);
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  /* ── Streak Spawner ─────────────────────────────────────────── */
  function scheduleStreak () {
    const delay = CFG.streakInterval + (Math.random() - 0.5) * 2000;
    setTimeout(function () {
      webStreaks.push(createStreak());
      scheduleStreak();
    }, delay);
  }

  /* ── Mouse Parallax Interaction ─────────────────────────────── */
  let mouseX = W / 2;
  let mouseY = H / 2;

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Gently attract nearby particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        const force = (100 - dist) / 100 * 0.04;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
        // Dampen
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
    }
  }, { passive: true });

  /* ── Init ───────────────────────────────────────────────────── */
  function init () {
    resize();
    initParticles();
    loop();
    scheduleStreak();
  }

  window.addEventListener('resize', function () {
    cancelAnimationFrame(raf);
    resize();
    raf = requestAnimationFrame(loop);
  }, { passive: true });

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
