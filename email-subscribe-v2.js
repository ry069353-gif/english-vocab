/* ============================================
   Email Subscribe UI - Daily Words (v2 - BUGFIX)
   ============================================
   Fixes from v1:
   - XSS protection (escapes email/error in innerHTML)
   - localStorage wrapped in try/catch
   - Better server error detection
   - Configurable URL via meta tag too
   ============================================ */

(function () {
  'use strict';

  // ====== CONFIG ======
  function getApiBase() {
    // Priority: window var > meta tag > default
    if (typeof window.EMAIL_API_BASE !== 'undefined' && window.EMAIL_API_BASE) {
      return window.EMAIL_API_BASE;
    }
    const meta = document.querySelector('meta[name="email-api-base"]');
    if (meta && meta.content) {
      return meta.content;
    }
    return 'https://english-vocab-email.onrender.com';
  }

  const EMAIL_API_BASE = getApiBase();
  const DEMO_MODE = false;

  // ====== SAFE STORAGE ======
  const safeStorage = {
    get(key) {
      try { return localStorage.getItem(key); }
      catch (e) { return null; }
    },
    set(key, val) {
      try { localStorage.setItem(key, val); return true; }
      catch (e) { return false; }
    }
  };

  // ====== HTML ESCAPER (XSS PROTECTION) ======
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ====== STATE ======
  let isSubscribed = safeStorage.get('emailSubscribed') === 'true';

  // ====== DOM HELPERS ======
  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') {
        e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      } else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of children) {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  }

  // ====== TOAST ======
  function showToast(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
    } else if (typeof window.showNotification === 'function') {
      window.showNotification(msg);
    } else {
      console.log('[Email]', msg);
    }
  }

  // ====== API CALLS ======
  async function subscribeUser(email, name, googleId) {
    if (DEMO_MODE) {
      console.log('[DEMO MODE] Would subscribe:', email);
      return { success: true, message: 'Demo mode - simulated!', email };
    }

    const url = EMAIL_API_BASE.replace(/\/$/, '') + '/api/subscribe';
    console.log('[Email] POST →', url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, name, googleId }),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });

      clearTimeout(timeoutId);

      console.log('[Email] Response:', res.status, res.statusText);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg = data.error || data.message || `HTTP ${res.status}`;
        console.error('[Email] Server error:', errMsg);
        return { success: false, error: errMsg, status: res.status };
      }

      console.log('[Email] Success:', data);
      return { ...data, success: true };
    } catch (e) {
      console.error('[Email] Network error:', e);

      if (e.name === 'AbortError') {
        return { success: false, error: 'Timeout - server not responding (15s)' };
      }
      if (e.message && e.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Cannot reach server. Check URL or internet.'
        };
      }
      return { success: false, error: e.message || 'Unknown error' };
    }
  }

  // ====== UI: SUBSCRIBE BUTTON ======
  function createSubscribeButton() {
    return el('button', {
      id: 'emailSubscribeBtn',
      class: 'email-subscribe-btn',
      onclick: openSubscribeModal,
      title: 'Daily Email'
    },
      el('span', { class: 'email-btn-icon' }, '📧'),
      el('span', { class: 'email-btn-text' }, isSubscribed ? 'Subscribed ✓' : 'Daily Email')
    );
  }

  // ====== MODAL ======
  function openSubscribeModal() {
    const existing = document.getElementById('emailSubscribeModal');
    if (existing) existing.remove();

    const user = (typeof window.state !== 'undefined' && window.state?.user) || {};
    const userEmail = user?.email || safeStorage.get('subscribedEmail') || '';
    const userName = user?.name || '';

    // SAFE: use textContent for user input
    const initialStatus = isSubscribed
      ? '✅ You are already subscribed!'
      : '📧 Backend: ' + EMAIL_API_BASE;

    const modal = el('div', {
      id: 'emailSubscribeModal',
      class: 'email-modal-overlay',
      onclick: (e) => {
        if (e.target.id === 'emailSubscribeModal') closeModal();
      }
    },
      el('div', { class: 'email-modal' },
        el('div', { class: 'email-modal-header' },
          el('span', { class: 'email-modal-icon' }, '📧'),
          el('h2', { text: 'Daily Email' }),
          el('button', {
            class: 'email-modal-close',
            onclick: closeModal,
            'aria-label': 'Close'
          }, '✕')
        ),
        el('div', { class: 'email-modal-body' },
          el('p', { class: 'email-modal-desc', text: 'हर रोज़ 9 AM पर 5 नए English words आपके email पर आएंगे! 🚀' }),
          el('p', { class: 'email-modal-desc-en', text: 'Get 5 fresh English words in your inbox every day at 9 AM IST.' }),
          el('div', { class: 'email-features' },
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon', text: '📚' }),
              el('span', { text: '5 fresh words daily' })
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon', text: '🇮🇳' }),
              el('span', { text: 'Hindi + English' })
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon', text: '🔔' }),
              el('span', { text: 'Pronunciation' })
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon', text: '🎯' }),
              el('span', { text: 'Examples' })
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon', text: '🔓' }),
              el('span', { text: 'Unsubscribe anytime' })
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon', text: '🆓' }),
              el('span', { text: '100% free' })
            )
          ),
          el('div', { class: 'email-form' },
            el('label', { class: 'email-label', text: 'Your Email:' }),
            el('input', {
              type: 'email',
              id: 'emailInput',
              class: 'email-input',
              placeholder: 'you@gmail.com'
            })
          ),
          el('div', { class: 'email-status', id: 'emailStatus', text: initialStatus })
        ),
        el('div', { class: 'email-modal-footer' },
          el('button', {
            class: 'email-btn-cancel',
            onclick: closeModal
          }, 'Close'),
          el('button', {
            id: 'emailSubscribeSubmit',
            class: 'email-btn-primary',
            onclick: handleSubscribe
          }, isSubscribed ? '🔄 Update' : '🔔 Subscribe')
        )
      )
    );

    document.body.appendChild(modal);

    // Set value safely after creation
    const input = document.getElementById('emailInput');
    if (input) {
      input.value = userEmail;
      setTimeout(() => input.focus(), 100);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubscribe();
      });
    }
  }

  function closeModal() {
    const modal = document.getElementById('emailSubscribeModal');
    if (modal) modal.remove();
  }

  function setStatus(message, type = 'info') {
    const statusEl = document.getElementById('emailStatus');
    if (!statusEl) return;

    const colors = {
      info: '#6366f1',
      success: '#10b981',
      error: '#ef4444',
      warn: '#f59e0b'
    };
    const color = colors[type] || colors.info;

    // Use textContent to avoid XSS - but we need to preserve <br> tags
    // So escape first, then allow safe HTML
    const safeMessage = escapeHtml(message);
    statusEl.innerHTML = '<span style="color: ' + color + ';">' + safeMessage + '</span>';
  }

  async function handleSubscribe() {
    const input = document.getElementById('emailInput');
    const submitBtn = document.getElementById('emailSubscribeSubmit');

    if (!input) return;
    const email = input.value.trim();

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setStatus('⚠️ Please enter a valid email', 'error');
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Subscribing...';
    setStatus('⏳ Sending request to server...', 'info');

    const user = (typeof window.state !== 'undefined' && window.state?.user) || {};

    try {
      const result = await subscribeUser(email, user?.name || '', user?.googleId || user?.id || '');

      if (result.success) {
        setStatus('✅ ' + (result.message || 'Subscribed!'), 'success');
        submitBtn.textContent = '✅ Done!';
        showToast('📧 Daily email subscription active!');
        isSubscribed = true;
        safeStorage.set('emailSubscribed', 'true');
        safeStorage.set('subscribedEmail', email);

        // Update button text
        const btn = document.getElementById('emailSubscribeBtn');
        if (btn) {
          const textEl = btn.querySelector('.email-btn-text');
          if (textEl) textEl.textContent = 'Subscribed ✓';
        }

        setTimeout(closeModal, 2000);
      } else {
        const errMsg = result.error || 'Failed';
        setStatus('❌ ' + errMsg + ' (URL: ' + EMAIL_API_BASE + ')', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (e) {
      setStatus('❌ Unexpected: ' + e.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      console.error('Subscribe error:', e);
    }
  }

  // ====== INJECT BUTTON ======
  function injectButton() {
    if (document.getElementById('emailSubscribeBtn')) return;

    const targets = ['.app-bar', '.header', '#appHeader', '.top-bar', '.navbar', 'body'];

    for (const sel of targets) {
      const target = document.querySelector(sel);
      if (target) {
        const btn = createSubscribeButton();
        target.appendChild(btn);
        console.log('[Email] Button injected into:', sel);
        return;
      }
    }
  }

  // ====== INIT ======
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(injectButton, 1000));
    } else {
      setTimeout(injectButton, 1000);
    }

    console.log('[Email] Backend URL:', EMAIL_API_BASE);
    console.log('[Email] Demo mode:', DEMO_MODE);
    console.log('[Email] To override URL, set: window.EMAIL_API_BASE = "https://..."');
  }

  // Public API
  window.openEmailSubscribe = openSubscribeModal;
  window.subscribeToDailyEmails = subscribeUser;
  window.EMAIL_API_BASE_CONFIG = EMAIL_API_BASE;

  init();
})();
