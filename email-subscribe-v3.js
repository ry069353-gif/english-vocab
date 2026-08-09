/* ============================================
   Email Subscribe UI - Daily Words (v3 - NETWORK FIX)
   ============================================
   v3 Improvements:
   - LOCAL FALLBACK: Works even without backend
   - Clear network error messages
   - Save subscription locally if server unreachable
   - User can configure backend URL via UI
   ============================================ */

(function () {
  'use strict';

  // ====== CONFIG ======
  const DEFAULT_API = 'https://english-vocab-email.onrender.com';

  function getApiBase() {
    if (typeof window.EMAIL_API_BASE !== 'undefined' && window.EMAIL_API_BASE) {
      return window.EMAIL_API_BASE;
    }
    const meta = document.querySelector('meta[name="email-api-base"]');
    if (meta && meta.content) return meta.content;
    const stored = safeStorage.get('emailApiBase');
    if (stored) return stored;
    return DEFAULT_API;
  }

  let EMAIL_API_BASE = getApiBase();
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

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

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

  function showToast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
    else if (typeof window.showNotification === 'function') window.showNotification(msg);
    else console.log('[Email]', msg);
  }

  // ====== LOCAL FALLBACK SUBSCRIBE ======
  function saveSubscriptionLocal(email, name) {
    const subs = JSON.parse(safeStorage.get('emailSubscribers') || '[]');
    const exists = subs.find(s => s.email === email);
    if (!exists) {
      subs.push({
        email,
        name,
        subscribedAt: new Date().toISOString(),
        source: 'local-fallback'
      });
      safeStorage.set('emailSubscribers', JSON.stringify(subs));
    }
    return true;
  }

  // ====== API CALLS (with local fallback) ======
  async function subscribeUser(email, name, googleId) {
    if (DEMO_MODE) {
      return { success: true, message: 'Demo mode', email, mode: 'demo' };
    }

    const url = EMAIL_API_BASE.replace(/\/$/, '') + '/api/subscribe';
    console.log('[Email] POST →', url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, name, googleId }),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || `HTTP ${res.status}`, status: res.status };
      }

      const data = await res.json();
      return { ...data, success: true, mode: 'server' };
    } catch (e) {
      console.error('[Email] Network error:', e);

      // ⚠️ NETWORK ERROR → USE LOCAL FALLBACK
      if (e.name === 'AbortError' || e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        console.warn('[Email] Server unreachable. Using local fallback...');
        saveSubscriptionLocal(email, name);
        return {
          success: true,
          message: 'Saved locally (server not reachable). Deploy backend to enable real emails.',
          email,
          mode: 'local',
          warning: 'Backend not deployed - email will NOT be sent automatically'
        };
      }

      return { success: false, error: e.message || 'Unknown error' };
    }
  }

  // ====== UI ======
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

  function openSubscribeModal() {
    const existing = document.getElementById('emailSubscribeModal');
    if (existing) existing.remove();

    const user = (typeof window.state !== 'undefined' && window.state?.user) || {};
    const userEmail = user?.email || safeStorage.get('subscribedEmail') || '';
    const isLocal = safeStorage.get('emailSubscribed') === 'true' && safeStorage.get('emailSubscribedMode') === 'local';

    const initialStatus = isSubscribed
      ? (isLocal
          ? '✅ Saved locally (server not connected)'
          : '✅ You are subscribed!')
      : '📧 Ready to subscribe';

    const modal = el('div', {
      id: 'emailSubscribeModal',
      class: 'email-modal-overlay',
      onclick: (e) => { if (e.target.id === 'emailSubscribeModal') closeModal(); }
    },
      el('div', { class: 'email-modal' },
        el('div', { class: 'email-modal-header' },
          el('span', { class: 'email-modal-icon' }, '📧'),
          el('h2', { text: 'Daily Email' }),
          el('button', { class: 'email-modal-close', onclick: closeModal, 'aria-label': 'Close' }, '✕')
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
            )
          ),
          el('details', { class: 'email-advanced' },
            el('summary', { text: '⚙️ Advanced (Backend URL)' }),
            el('div', { style: 'margin-top: 8px;' },
              el('label', { class: 'email-label', text: 'Backend URL:' }),
              el('input', {
                type: 'url',
                id: 'emailApiInput',
                class: 'email-input',
                placeholder: 'https://your-backend.onrender.com'
              }),
              el('p', { style: 'font-size: 11px; color: #94a3b8; margin: 4px 0 0 0;', text: 'Leave blank to use default. Change if you deployed your own backend.' })
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
          el('button', { class: 'email-btn-cancel', onclick: closeModal }, 'Close'),
          el('button', { id: 'emailSubscribeSubmit', class: 'email-btn-primary', onclick: handleSubscribe }, '🔔 Subscribe')
        )
      )
    );

    document.body.appendChild(modal);

    const input = document.getElementById('emailInput');
    const apiInput = document.getElementById('emailApiInput');
    if (input) {
      input.value = userEmail;
      setTimeout(() => input.focus(), 100);
      input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSubscribe(); });
    }
    if (apiInput) {
      apiInput.value = EMAIL_API_BASE;
    }
  }

  function closeModal() {
    const modal = document.getElementById('emailSubscribeModal');
    if (modal) modal.remove();
  }

  function setStatus(message, type) {
    type = type || 'info';
    const statusEl = document.getElementById('emailStatus');
    if (!statusEl) return;
    const colors = { info: '#6366f1', success: '#10b981', error: '#ef4444', warn: '#f59e0b' };
    const color = colors[type] || colors.info;
    statusEl.innerHTML = '<span style="color: ' + color + ';">' + escapeHtml(message) + '</span>';
  }

  async function handleSubscribe() {
    const input = document.getElementById('emailInput');
    const apiInput = document.getElementById('emailApiInput');
    const submitBtn = document.getElementById('emailSubscribeSubmit');

    if (!input) return;
    const email = input.value.trim();

    // Use custom URL if changed
    if (apiInput && apiInput.value.trim() && apiInput.value.trim() !== EMAIL_API_BASE) {
      EMAIL_API_BASE = apiInput.value.trim();
      safeStorage.set('emailApiBase', EMAIL_API_BASE);
    }

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setStatus('⚠️ Please enter a valid email', 'error');
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Subscribing...';
    setStatus('⏳ Trying server... (will fallback to local if down)', 'info');

    const user = (typeof window.state !== 'undefined' && window.state?.user) || {};

    try {
      const result = await subscribeUser(email, user?.name || '', user?.googleId || user?.id || '');

      if (result.success) {
        isSubscribed = true;
        safeStorage.set('emailSubscribed', 'true');
        safeStorage.set('emailSubscribedMode', result.mode || 'server');
        safeStorage.set('subscribedEmail', email);

        if (result.mode === 'local') {
          setStatus('✅ Saved locally! (Email service not active - deploy backend to enable)', 'warn');
          submitBtn.textContent = '✅ Saved Locally';
          showToast('📧 Saved locally (backend not deployed)');
        } else {
          setStatus('✅ ' + (result.message || 'Subscribed!'), 'success');
          submitBtn.textContent = '✅ Done!';
          showToast('📧 Daily email subscription active!');
        }

        const btn = document.getElementById('emailSubscribeBtn');
        if (btn) {
          const textEl = btn.querySelector('.email-btn-text');
          if (textEl) textEl.textContent = result.mode === 'local' ? 'Saved Locally ✓' : 'Subscribed ✓';
        }

        setTimeout(closeModal, 3000);
      } else {
        // ❌ Real error (not network) - validation/server issue
        setStatus('❌ ' + (result.error || 'Failed'), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (e) {
      // Even local fallback failed - shouldn't happen
      setStatus('❌ Critical error: ' + e.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      console.error('Subscribe error:', e);
    }
  }

  function injectButton() {
    if (document.getElementById('emailSubscribeBtn')) return;
    const targets = ['.app-bar', '.header', '#appHeader', '.top-bar', '.navbar', 'body'];
    for (const sel of targets) {
      const target = document.querySelector(sel);
      if (target) {
        target.appendChild(createSubscribeButton());
        console.log('[Email] Button injected into:', sel);
        return;
      }
    }
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(injectButton, 1000));
    } else {
      setTimeout(injectButton, 1000);
    }
    console.log('[Email] Backend URL:', EMAIL_API_BASE);
    console.log('[Email] Mode: Network error → automatic local fallback');
  }

  window.openEmailSubscribe = openSubscribeModal;
  window.subscribeToDailyEmails = subscribeUser;
  window.EMAIL_API_BASE_CONFIG = EMAIL_API_BASE;

  init();
})();
