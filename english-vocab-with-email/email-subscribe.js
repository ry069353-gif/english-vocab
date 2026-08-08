/* ============================================
   Email Subscribe UI - Daily Words
   ============================================ */

(function () {
  'use strict';

  // ====== CONFIG ======
  // Update this with your backend URL after deploying to Render
  const EMAIL_API_BASE = window.EMAIL_API_BASE || 'https://english-vocab-email.onrender.com';

  // ====== STATE ======
  let isSubscribed = false;
  let isLoading = false;

  // ====== DOM HELPERS ======
  function $(sel) { return document.querySelector(sel); }
  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') {
        e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      } else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of children) {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  }

  // ====== TOAST ======
  function showToast(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
    } else {
      console.log('[Email]', msg);
    }
  }

  // ====== API CALLS ======
  async function subscribeUser(email, name, googleId) {
    const res = await fetch(EMAIL_API_BASE + '/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, googleId })
    });
    return res.json();
  }

  async function getStats() {
    try {
      const res = await fetch(EMAIL_API_BASE + '/api/stats');
      return res.json();
    } catch (e) {
      return null;
    }
  }

  // ====== UI: SUBSCRIBE BUTTON IN PROFILE/HEADER ======
  function createSubscribeButton() {
    const btn = el('button', {
      id: 'emailSubscribeBtn',
      class: 'email-subscribe-btn',
      onclick: openSubscribeModal
    },
      el('span', { class: 'email-btn-icon' }, '📧'),
      el('span', { class: 'email-btn-text' }, 'Daily Email')
    );
    return btn;
  }

  // ====== MODAL ======
  function openSubscribeModal() {
    // Close any existing modal first
    const existing = document.getElementById('emailSubscribeModal');
    if (existing) existing.remove();

    const user = window.state?.user;
    const userEmail = user?.email || '';
    const userName = user?.name || '';

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
          el('h2', {}, 'Daily Email Subscription'),
          el('button', {
            class: 'email-modal-close',
            onclick: closeModal,
            'aria-label': 'Close'
          }, '✕')
        ),
        el('div', { class: 'email-modal-body' },
          el('p', { class: 'email-modal-desc' },
            'हर रोज़ 9 AM पर 5 नए English words आपके email पर आएंगे! 🚀'
          ),
          el('p', { class: 'email-modal-desc-en' },
            'Get 5 new English words delivered to your email every day at 9 AM IST.'
          ),
          el('div', { class: 'email-features' },
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon' }, '📚'),
              el('span', {}, '5 fresh words daily')
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon' }, '🇮🇳'),
              el('span', {}, 'Hindi + English meanings')
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon' }, '🔔'),
              el('span', {}, 'Pronunciation guide')
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon' }, '🎯'),
              el('span', {}, 'Example sentences')
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon' }, '🔓'),
              el('span', {}, 'Unsubscribe anytime')
            ),
            el('div', { class: 'email-feature' },
              el('span', { class: 'email-feature-icon' }, '🆓'),
              el('span', {}, '100% free')
            )
          ),
          el('div', { class: 'email-form' },
            el('label', { class: 'email-label' }, 'Your Email:'),
            el('input', {
              type: 'email',
              id: 'emailInput',
              class: 'email-input',
              placeholder: 'you@gmail.com',
              value: userEmail
            }),
            el('div', { class: 'email-status' }, '')
          )
        ),
        el('div', { class: 'email-modal-footer' },
          el('button', {
            class: 'email-btn-cancel',
            onclick: closeModal
          }, 'Cancel'),
          el('button', {
            id: 'emailSubscribeSubmit',
            class: 'email-btn-primary',
            onclick: handleSubscribe
          }, '🔔 Subscribe Now')
        )
      )
    );

    document.body.appendChild(modal);

    // Focus input
    setTimeout(() => {
      const input = document.getElementById('emailInput');
      if (input) input.focus();
    }, 100);

    // Enter key handler
    const input = document.getElementById('emailInput');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubscribe();
      });
    }
  }

  function closeModal() {
    const modal = document.getElementById('emailSubscribeModal');
    if (modal) modal.remove();
  }

  async function handleSubscribe() {
    const input = document.getElementById('emailInput');
    const statusEl = document.querySelector('.email-status');
    const submitBtn = document.getElementById('emailSubscribeSubmit');

    if (!input) return;
    const email = input.value.trim();

    if (!email || !email.includes('@') || !email.includes('.')) {
      statusEl.innerHTML = '<span style="color: #ef4444;">⚠️ Please enter a valid email</span>';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Subscribing...';
    statusEl.innerHTML = '<span style="color: #6366f1;">Subscribing...</span>';

    try {
      const user = window.state?.user;
      const result = await subscribeUser(email, user?.name || '', user?.googleId || user?.id || '');

      if (result.success) {
        statusEl.innerHTML = '<span style="color: #10b981;">✅ ' + (result.message || 'Subscribed!') + '</span>';
        submitBtn.textContent = '✅ Subscribed!';
        showToast('📧 Daily email subscription active!');
        localStorage.setItem('emailSubscribed', 'true');
        localStorage.setItem('subscribedEmail', email);
        setTimeout(closeModal, 2000);
      } else {
        statusEl.innerHTML = '<span style="color: #ef4444;">❌ ' + (result.error || 'Failed') + '</span>';
        submitBtn.disabled = false;
        submitBtn.textContent = '🔔 Subscribe Now';
      }
    } catch (e) {
      statusEl.innerHTML = '<span style="color: #ef4444;">❌ Network error. Try again later.</span>';
      submitBtn.disabled = false;
      submitBtn.textContent = '🔔 Subscribe Now';
      console.error('Subscribe error:', e);
    }
  }

  // ====== INJECT BUTTON INTO APP ======
  function injectButton() {
    // Try to inject in header / app bar
    const targets = [
      '.app-bar',
      '.header',
      '#appHeader',
      '.top-bar',
      '.navbar',
      'body'
    ];

    for (const sel of targets) {
      const target = document.querySelector(sel);
      if (target) {
        const btn = createSubscribeButton();
        // Check if already injected
        if (!document.getElementById('emailSubscribeBtn')) {
          target.appendChild(btn);
          console.log('📧 Email subscribe button injected into', sel);
        }
        return;
      }
    }
  }

  // ====== INIT ======
  function init() {
    // Wait for app to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(injectButton, 1000));
    } else {
      setTimeout(injectButton, 1000);
    }
  }

  // Public API
  window.openEmailSubscribe = openSubscribeModal;
  window.subscribeToDailyEmails = subscribeUser;

  init();
})();
