/* ================================================================
   SPIDER-MAN LOGIN PAGE — LOGIN LOGIC
   js/login.js

   Handles:
   · Form validation with real-time feedback
   · Password show/hide toggle
   · Submit with loading animation + web-shoot effect
   · Social button ripple interactions
   · Forgot password UI
   · Remember me
   · Success overlay
   · Accessibility enhancements
================================================================ */

'use strict';

(function () {

  /* ── Wait for DOM ───────────────────────────────────────────── */
  function ready (fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {

    /* ── Element References ──────────────────────────────────── */
    const form           = document.getElementById('login-form');
    const emailInput     = document.getElementById('email');
    const passwordInput  = document.getElementById('password');
    const pwToggle       = document.getElementById('password-toggle');
    const eyeOpen        = pwToggle.querySelector('.eye-open');
    const eyeClosed      = pwToggle.querySelector('.eye-closed');
    const rememberCheck  = document.getElementById('remember');
    const forgotLink     = document.getElementById('forgot-link');
    const btnSubmit      = document.getElementById('btn-submit');
    const btnGoogle      = document.getElementById('btn-google');
    const btnGithub      = document.getElementById('btn-github');
    const successOverlay = document.getElementById('success-overlay');
    const fieldEmail     = document.getElementById('field-email');
    const fieldPassword  = document.getElementById('field-password');
    const emailError     = document.getElementById('email-error');
    const passwordError  = document.getElementById('password-error');

    /* ── Validation Helpers ──────────────────────────────────── */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setFieldState (fieldEl, errorEl, state, message) {
      // state: '' | 'valid' | 'invalid'
      fieldEl.classList.remove('field--valid', 'field--invalid');
      if (state) fieldEl.classList.add('field--' + state);
      errorEl.textContent = message || '';
      errorEl.setAttribute('aria-hidden', state !== 'invalid' ? 'true' : 'false');
    }

    function validateEmail (value, showError) {
      if (!value) {
        if (showError) setFieldState(fieldEmail, emailError, 'invalid', '⚠ Email address is required.');
        return false;
      }
      if (!emailRegex.test(value)) {
        if (showError) setFieldState(fieldEmail, emailError, 'invalid', '⚠ Enter a valid email address.');
        return false;
      }
      setFieldState(fieldEmail, emailError, 'valid', '');
      return true;
    }

    function validatePassword (value, showError) {
      if (!value) {
        if (showError) setFieldState(fieldPassword, passwordError, 'invalid', '⚠ Password is required.');
        return false;
      }
      if (value.length < 6) {
        if (showError) setFieldState(fieldPassword, passwordError, 'invalid', '⚠ Password must be at least 6 characters.');
        return false;
      }
      setFieldState(fieldPassword, passwordError, 'valid', '');
      return true;
    }

    /* ── Real-time Validation (blur + input) ─────────────────── */
    emailInput.addEventListener('blur', function () {
      validateEmail(this.value.trim(), true);
    });

    emailInput.addEventListener('input', function () {
      // Only show valid state live (not error — wait for blur)
      if (fieldEmail.classList.contains('field--invalid')) {
        validateEmail(this.value.trim(), true);
      } else if (this.value.trim()) {
        validateEmail(this.value.trim(), false);
      }
    });

    passwordInput.addEventListener('blur', function () {
      validatePassword(this.value, true);
    });

    passwordInput.addEventListener('input', function () {
      if (fieldPassword.classList.contains('field--invalid')) {
        validatePassword(this.value, true);
      } else if (this.value) {
        validatePassword(this.value, false);
      }

      // Subtle password strength indicator via border hue
      const len = this.value.length;
      if (len === 0) {
        fieldPassword.style.setProperty('--strength', 'transparent');
      } else if (len < 8) {
        fieldPassword.style.setProperty('--strength', 'rgba(255, 150, 0, 0.5)');
      } else {
        fieldPassword.style.setProperty('--strength', 'rgba(34, 197, 94, 0.5)');
      }
    });

    /* ── Focus ring enhancement ──────────────────────────────── */
    [emailInput, passwordInput].forEach(function (input) {
      input.addEventListener('focus', function () {
        const wrap  = this.closest('.field__wrap');
        const ring  = wrap.querySelector('.field__focus-ring');
        if (ring) {
          ring.style.boxShadow = '0 0 0 3px rgba(230, 22, 45, 0.08), 0 0 20px rgba(230, 22, 45, 0.1)';
          ring.style.borderColor = 'rgba(230, 22, 45, 0.3)';
        }
      });

      input.addEventListener('blur', function () {
        const wrap = this.closest('.field__wrap');
        const ring = wrap.querySelector('.field__focus-ring');
        if (ring) {
          ring.style.boxShadow = '';
          ring.style.borderColor = '';
        }
      });
    });

    /* ── Password Toggle ─────────────────────────────────────── */
    pwToggle.addEventListener('click', function () {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      // Swap icons
      eyeOpen.style.display   = isPassword ? 'none'  : '';
      eyeClosed.style.display = isPassword ? ''      : 'none';

      // Update aria
      this.setAttribute('aria-label',   isPassword ? 'Hide password' : 'Show password');
      this.setAttribute('aria-pressed',  isPassword ? 'true' : 'false');

      // Keep focus in the input
      passwordInput.focus();
    });

    /* ── Remember Me — persist to localStorage ───────────────── */
    // Load saved state
    const savedEmail = localStorage.getItem('sp_remember_email');
    if (savedEmail) {
      emailInput.value      = savedEmail;
      rememberCheck.checked = true;
      validateEmail(savedEmail, false);
    }

    /* ── Forgot Password ─────────────────────────────────────── */
    forgotLink.addEventListener('click', function (e) {
      e.preventDefault();

      // Shoot a web from Spider-Man toward the link
      const rect = this.getBoundingClientRect();
      if (window.spiderShootWeb) {
        window.spiderShootWeb(
          document.getElementById('login-card'),
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
      }

      // Shake the email field
      emailInput.focus();
      fieldEmail.style.animation = 'none';
      fieldEmail.offsetHeight; // reflow
      fieldEmail.style.animation = 'fieldShake 0.4s ease';

      // Show a styled inline notification
      showToast('Check your inbox — we\'ll send a reset web-thread.', 'info');
    });

    /* ── Social Login Buttons ────────────────────────────────── */
    function createRipple (e, btn) {
      const rect = btn.getBoundingClientRect();
      const x    = e.clientX - rect.left;
      const y    = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.className = 'btn-social__ripple';
      ripple.style.left = x + 'px';
      ripple.style.top  = y + 'px';
      btn.appendChild(ripple);

      ripple.addEventListener('animationend', function () {
        ripple.remove();
      });
    }

    btnGoogle.addEventListener('click', function (e) {
      createRipple(e, this);
      showToast('Connecting to Google…', 'info');
      simulateProviderAuth('Google');
    });

    btnGithub.addEventListener('click', function (e) {
      createRipple(e, this);
      showToast('Connecting to GitHub…', 'info');
      simulateProviderAuth('GitHub');
    });

    function simulateProviderAuth (provider) {
      // Simulate OAuth redirect delay for demo
      setTimeout(function () {
        showSuccessOverlay('OAuth — ' + provider);
      }, 1200);
    }

    /* ── Form Submit ─────────────────────────────────────────── */
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const email    = emailInput.value.trim();
      const password = passwordInput.value;

      const emailOK    = validateEmail(email, true);
      const passwordOK = validatePassword(password, true);

      if (!emailOK || !passwordOK) {
        // Shake invalid fields
        if (!emailOK)    shakeField(fieldEmail);
        if (!passwordOK) shakeField(fieldPassword);

        // Focus first invalid
        if (!emailOK) emailInput.focus();
        else passwordInput.focus();
        return;
      }

      // Save email if remember checked
      if (rememberCheck.checked) {
        localStorage.setItem('sp_remember_email', email);
      } else {
        localStorage.removeItem('sp_remember_email');
      }

      // Web shoot from button
      const btnRect = btnSubmit.getBoundingClientRect();
      if (window.spiderShootWeb) {
        window.spiderShootWeb(
          btnSubmit,
          btnRect.left + btnRect.width / 2,
          btnRect.top - 40
        );
      }

      // Burst rings
      addBurstRings(btnSubmit);

      // Loading state
      setLoadingState(true);

      // Simulate API call
      setTimeout(function () {
        setLoadingState(false);
        showSuccessOverlay(email);
      }, 1800);
    });

    /* ── Loading State ───────────────────────────────────────── */
    function setLoadingState (loading) {
      if (loading) {
        btnSubmit.classList.add('is-loading');
        btnSubmit.setAttribute('aria-label', 'Signing in…');
        btnSubmit.setAttribute('aria-busy', 'true');
        form.querySelectorAll('input, button').forEach(function (el) {
          el.disabled = loading;
        });
        // Re-enable just the submit to show aria-busy
        btnSubmit.disabled = false;
      } else {
        btnSubmit.classList.remove('is-loading');
        btnSubmit.setAttribute('aria-label', 'Sign in to your account');
        btnSubmit.removeAttribute('aria-busy');
        form.querySelectorAll('input, button').forEach(function (el) {
          el.disabled = false;
        });
      }
    }

    /* ── Success Overlay ─────────────────────────────────────── */
    function showSuccessOverlay (identifier) {
      successOverlay.removeAttribute('aria-hidden');
      successOverlay.classList.add('is-visible');

      // Trap focus in overlay
      const overlayTitle = successOverlay.querySelector('.success-overlay__title');
      if (overlayTitle) {
        setTimeout(function () { overlayTitle.focus(); }, 100);
      }
    }

    /* Dismiss on click / escape */
    successOverlay.addEventListener('click', function () {
      this.classList.remove('is-visible');
      this.setAttribute('aria-hidden', 'true');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && successOverlay.classList.contains('is-visible')) {
        successOverlay.classList.remove('is-visible');
        successOverlay.setAttribute('aria-hidden', 'true');
        btnSubmit.focus();
      }
    });

    /* ── Burst Rings ─────────────────────────────────────────── */
    function addBurstRings (el) {
      const burst = el.querySelector('.btn-submit__burst');
      if (!burst) return;

      for (let i = 0; i < 3; i++) {
        const ring = document.createElement('span');
        ring.className = 'web-ring';
        ring.style.animationDelay = (i * 80) + 'ms';
        burst.appendChild(ring);
        ring.addEventListener('animationend', function () { ring.remove(); });
      }
    }

    /* ── Field Shake Animation ──────────────────────────────── */
    function shakeField (fieldEl) {
      fieldEl.style.animation = 'none';
      void fieldEl.offsetWidth; // reflow
      fieldEl.style.animation = 'fieldShake 0.45s ease';
    }

    /* Add fieldShake keyframes dynamically */
    const styleShake = document.createElement('style');
    styleShake.textContent = `
      @keyframes fieldShake {
        0%, 100% { transform: translateX(0); }
        15%       { transform: translateX(-6px); }
        30%       { transform: translateX(5px); }
        45%       { transform: translateX(-4px); }
        60%       { transform: translateX(3px); }
        75%       { transform: translateX(-2px); }
        90%       { transform: translateX(1px); }
      }
    `;
    document.head.appendChild(styleShake);

    /* ── Toast Notification ──────────────────────────────────── */
    let activeToast = null;

    function showToast (message, type) {
      if (activeToast) activeToast.remove();

      const toast = document.createElement('div');
      toast.className  = 'sp-toast sp-toast--' + (type || 'info');
      toast.textContent = message;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');

      document.body.appendChild(toast);
      activeToast = toast;

      // Animate in
      requestAnimationFrame(function () {
        toast.style.opacity   = '1';
        toast.style.transform = 'translateY(0)';
      });

      // Auto-dismiss
      setTimeout(function () {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(function () {
          toast.remove();
          if (activeToast === toast) activeToast = null;
        }, 300);
      }, 3000);
    }

    /* ── Toast Styles ────────────────────────────────────────── */
    const styleToast = document.createElement('style');
    styleToast.textContent = `
      .sp-toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%) translateY(10px);
        background: rgba(8, 15, 30, 0.96);
        border: 1px solid rgba(255,255,255,0.12);
        backdrop-filter: blur(16px);
        color: rgba(255,255,255,0.85);
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        padding: 0.75rem 1.5rem;
        border-radius: 100px;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
        z-index: 9999;
        max-width: 90vw;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        pointer-events: none;
      }
      .sp-toast--info {
        border-color: rgba(37, 99, 235, 0.4);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(37,99,235,0.15);
      }
      .sp-toast--success {
        border-color: rgba(34, 197, 94, 0.4);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(34,197,94,0.15);
      }
      .sp-toast--error {
        border-color: rgba(230, 22, 45, 0.4);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(230,22,45,0.15);
      }
    `;
    document.head.appendChild(styleToast);

    /* ── Card tilt on mousemove (subtle 3D feel) ─────────────── */
    const card = document.getElementById('login-card');
    if (card && window.matchMedia('(hover: hover)').matches) {
      card.addEventListener('mousemove', function (e) {
        const rect   = card.getBoundingClientRect();
        const cx     = rect.left + rect.width  / 2;
        const cy     = rect.top  + rect.height / 2;
        const dx     = (e.clientX - cx) / (rect.width  / 2);
        const dy     = (e.clientY - cy) / (rect.height / 2);
        const rotX   = -dy * 3;  // max ±3°
        const rotY   =  dx * 3;

        card.style.transform    = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        card.style.transition   = 'transform 0.1s linear';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transform  = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      });
    }

    /* ── Sign Up Link ────────────────────────────────────────── */
    const signupLink = document.querySelector('.form__signup-link');
    if (signupLink) {
      signupLink.addEventListener('click', function (e) {
        e.preventDefault();
        showToast('Account creation coming soon, hero!', 'info');
      });
    }

    /* ── Keyboard shortcuts ──────────────────────────────────── */
    document.addEventListener('keydown', function (e) {
      // Alt+G = Google login
      if (e.altKey && e.key === 'g') {
        e.preventDefault();
        btnGoogle.click();
      }
      // Alt+H = GitHub login
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        btnGithub.click();
      }
    });

    /* ── Page Visibility: pause heavy animations ─────────────── */
    document.addEventListener('visibilitychange', function () {
      const isHidden = document.hidden;
      document.querySelectorAll('.logo__icon').forEach(function (el) {
        el.style.animationPlayState = isHidden ? 'paused' : 'running';
      });
    });

    /* ── Input — web-thread on focus (decorative) ────────────── */
    emailInput.addEventListener('focus', function () {
      this.setAttribute('placeholder', 'e.g. peter@dailybugle.com');
    });

    emailInput.addEventListener('blur', function () {
      this.setAttribute('placeholder', 'hero@marvel.com');
    });

    /* ── Accessible error announcement helper ────────────────── */
    emailError.setAttribute('aria-hidden', 'true');
    passwordError.setAttribute('aria-hidden', 'true');

  }); // end ready()

}());
