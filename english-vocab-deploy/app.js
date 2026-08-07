/* ============================================
   BCA Daily Vocab - Main App Logic v2.0
   With OTP, WhatsApp Share & Notifications
   ============================================ */

// ============= DATA =============
let ALL_WORDS = [];

function loadAllWords() {
  ALL_WORDS = window.ALL_WORDS || [];
  console.log(`Loaded ${ALL_WORDS.length} words`);
}

// ============= STATE =============
const STORAGE_KEY = 'bca_vocab_state_v2';
const NOTIF_CHECK_KEY = 'bca_vocab_last_notif_check';

let state = {
  user: null, // { id, name, whatsapp, joinedAt, authMethod, picture, googleId, email, sessionToken }
  learned: {},
  favorites: {},
  lastVisit: null,
  theme: 'light',
  streak: 0,
  notifications: {
    enabled: false,
    time: '09:00'
  },
  // OTP session (in-memory only)
  pendingOtp: null,
  pendingUser: null
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

function saveState() {
  try {
    const { pendingOtp, pendingUser, ...toSave } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

// ============= DATE HELPERS =============
function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getDayNumber() {
  if (!state.user) return 1;
  const joined = new Date(state.user.joinedAt);
  const today = new Date();
  const diff = today - joined;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay) + 1;
}

function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime12h(time24) {
  const [h, m] = time24.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============= WORD SELECTION =============
function getWordsForDate(date) {
  const doy = getDayOfYear(date);
  const total = ALL_WORDS.length;
  const wordsPerDay = 5;
  const totalDays = Math.floor(total / wordsPerDay);
  const safeDay = ((doy - 1) % totalDays) + 1;
  const startIdx = (safeDay - 1) * wordsPerDay;
  return ALL_WORDS.slice(startIdx, startIdx + wordsPerDay).map((w, i) => ({
    ...w,
    globalIndex: startIdx + i
  }));
}

// ============= STREAK =============
function updateStreak() {
  const today = getTodayString();
  if (state.lastVisit === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (state.lastVisit === yesterdayStr) {
    state.streak = (state.streak || 0) + 1;
  } else if (state.lastVisit !== today) {
    state.streak = 1;
  }

  state.lastVisit = today;
  saveState();
}

// ============================================
// ============= AUTH =================
// (Google Sign-In only — handled in Google section below)
// ============================================

function handleLogout() {
  if (!confirm('Logout? Your progress will be saved on this device.')) return;
  // If signed in with Google, also revoke
  if (state.user?.authMethod === 'google' && typeof google !== 'undefined' && google.accounts) {
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
  }
  state.user = null;
  saveState();
  showAuth();
}

function showAuth() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
  // Re-initialize Google Sign-In button (in case user logged out)
  if (window.initGoogleSignIn) {
    setTimeout(window.initGoogleSignIn, 200);
  }
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  initApp();
}

// ============= APP INIT =============
function initApp() {
  // Greeting
  document.getElementById('greeting').textContent = getGreeting();
  document.getElementById('userName').textContent = state.user.name;

  // Profile
  const initial = state.user.name[0].toUpperCase();
  const profileAvatar = document.getElementById('profileAvatar');
  if (state.user.picture) {
    profileAvatar.innerHTML = `<img src="${escapeHtml(state.user.picture)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  } else {
    profileAvatar.textContent = initial;
  }
  document.getElementById('profileName').textContent = state.user.name;
  document.getElementById('profileEmail').textContent = state.user.email || state.user.id;

  // Show Google badge if signed in with Google
  const googleBadge = document.getElementById('googleBadge');
  if (googleBadge) {
    googleBadge.style.display = state.user.authMethod === 'google' ? 'inline-block' : 'none';
  }

  // Show Google ID for Google users
  const profileGid = document.getElementById('profileGoogleId');
  if (profileGid) {
    if (state.user.googleId) {
      profileGid.textContent = '🆔 Google ID: ' + state.user.googleId;
      profileGid.style.display = 'block';
    } else {
      profileGid.style.display = 'none';
    }
  }

  if (state.user.whatsapp) {
    document.getElementById('profileWhatsapp').textContent = '📲 +91 ' + state.user.whatsapp;
    document.getElementById('profileWhatsapp').style.display = 'block';
  } else {
    document.getElementById('profileWhatsapp').style.display = 'none';
  }

  // Stats
  const dayNum = getDayNumber();
  document.getElementById('streakNum').textContent = state.streak || 0;
  document.getElementById('dayNum').textContent = dayNum;
  document.getElementById('totalLearned').textContent = Object.keys(state.learned).length;

  // Today
  document.getElementById('todayDate').textContent = formatDate();

  renderToday();
  renderHistory();
  renderFavorites();
  renderProfile();
  applyNotificationState();

  if (state.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Start notification checker
  startNotificationChecker();
}

// ============= RENDER: TODAY =============
function renderToday() {
  const words = getWordsForDate(new Date());
  const container = document.getElementById('wordsContainer');
  container.innerHTML = '';

  words.forEach((w, i) => {
    const card = createWordCard(w, i + 1);
    container.appendChild(card);
  });
}

function createWordCard(w, num) {
  const card = document.createElement('div');
  card.className = 'word-card';
  if (state.learned[w.globalIndex]) card.classList.add('learned');

  const isFav = state.favorites[w.globalIndex];

  card.innerHTML = `
    <div class="word-header">
      <span class="word-num">Word ${num}</span>
      <span class="word-category">${escapeHtml(w.category || '')}</span>
    </div>
    <div class="word-text">${escapeHtml(w.word)}</div>
    <div class="word-pronunciation">${escapeHtml(w.pronunciation || '')}</div>
    <div class="meaning-row">
      <div class="meaning-label english">🇬🇧 English Meaning</div>
      <div class="meaning-text">${escapeHtml(w.englishMeaning)}</div>
    </div>
    <div class="meaning-row">
      <div class="meaning-label hindi">🇮🇳 Hindi Meaning</div>
      <div class="meaning-text hindi">${escapeHtml(w.hindiMeaning)}</div>
    </div>
    <div class="example-box">
      <div class="example-label">💡 Example</div>
      ${escapeHtml(w.example)}
    </div>
    <div class="word-actions">
      <button class="action-btn ${state.learned[w.globalIndex] ? 'active' : ''}" onclick="toggleLearned(${w.globalIndex})">
        ✓ ${state.learned[w.globalIndex] ? 'Learned' : 'Mark Learned'}
      </button>
      <button class="action-btn fav ${isFav ? 'active' : ''}" onclick="toggleFav(${w.globalIndex})">
        ${isFav ? '★ Saved' : '☆ Save'}
      </button>
      <button class="action-btn" onclick="shareSingleWord(${w.globalIndex})">📤</button>
    </div>
  `;
  return card;
}

function toggleLearned(idx) {
  if (state.learned[idx]) {
    delete state.learned[idx];
    showToast('↩️ Marked as not learned');
  } else {
    state.learned[idx] = true;
    showToast('🎉 Word learned! Keep it up!');
  }
  saveState();
  renderToday();
  updateStats();
}

function toggleFav(idx) {
  if (state.favorites[idx]) {
    delete state.favorites[idx];
    showToast('💔 Removed from favorites');
  } else {
    state.favorites[idx] = true;
    showToast('⭐ Added to favorites');
  }
  saveState();
  renderToday();
  renderFavorites();
  updateStats();
}

function shareSingleWord(idx) {
  const w = ALL_WORDS[idx];
  if (!w) return;
  const text = `📚 *English Vocab*\n\n*${w.word}* _(${w.pronunciation})_\n\n🇬🇧 ${w.englishMeaning}\n🇮🇳 ${w.hindiMeaning}\n\n💡 _${w.example}_`;
  if (navigator.share) {
    navigator.share({ title: w.word, text }).catch(() => copyToClipboard(text));
  } else {
    shareViaWhatsApp(text);
  }
}

// ============================================
// ============ WHATSAPP SHARE ===============
// ============================================

function buildDailyMessage() {
  const words = getWordsForDate(new Date());
  let msg = `📚 *English Vocab - ${formatDate()}*\n`;
  msg += `_रोज़ 5 English words सीखो Hindi meaning के साथ_\n\n`;

  words.forEach((w, i) => {
    msg += `*${i + 1}. ${w.word}* _(${w.pronunciation})_\n`;
    msg += `🇬🇧 ${w.englishMeaning}\n`;
    msg += `🇮🇳 ${w.hindiMeaning}\n`;
    msg += `💡 _${w.example}_\n\n`;
  });

  msg += `---\n✨ Padhte raho! Visit: ${window.location.origin}`;
  return msg;
}

function shareToWhatsApp() {
  if (!state.user?.whatsapp) {
    if (confirm('📲 WhatsApp number nahi hai. Apna number add karoge?\n\nOK = Yes, Cancel = Share to any number')) {
      const num = prompt('Enter your WhatsApp number (10 digits):', '');
      if (num && /^\d{10}$/.test(num.replace(/\D/g, '').slice(-10))) {
        state.user.whatsapp = num.replace(/\D/g, '').slice(-10);
        saveState();
        showToast('✅ WhatsApp number saved!');
      } else {
        return;
      }
    } else {
      // Just open WhatsApp with the message
      const msg = buildDailyMessage();
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      showToast('📲 WhatsApp khul raha hai...');
      return;
    }
  }

  const msg = buildDailyMessage();
  // wa.me/<phone> opens chat with that number, pre-filled message
  const phone = '91' + state.user.whatsapp; // India country code
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  showToast('📲 WhatsApp khul raha hai...');
}

function shareViaWhatsApp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => showToast('📋 Copied to clipboard!'),
    () => showToast('❌ Could not copy')
  );
}

// ============= RENDER: HISTORY =============
function renderHistory() {
  const dayNum = getDayNumber();
  const container = document.getElementById('historyContainer');
  container.innerHTML = '';

  document.getElementById('statDays').textContent = dayNum;
  document.getElementById('statLearned').textContent = Object.keys(state.learned).length;
  document.getElementById('statFavs').textContent = Object.keys(state.favorites).length;

  const daysToShow = Math.min(dayNum, 30);
  if (daysToShow <= 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <div class="empty-text">No history yet. Start learning today!</div>
      </div>
    `;
    return;
  }

  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const words = getWordsForDate(d);
    const learnedCount = words.filter(w => state.learned[w.globalIndex]).length;
    const allLearned = learnedCount === words.length;
    const dateStr = formatDate(d);
    const isToday = i === 0;

    const div = document.createElement('div');
    div.className = 'history-day';
    div.onclick = () => showDayWords(d, words);
    div.innerHTML = `
      <div>
        <div class="history-date">${dateStr}${isToday ? ' (Today)' : ''}</div>
        <div class="history-words">${words.map(w => w.word).join(' • ')}</div>
      </div>
      <div style="display:flex; align-items:center;">
        <span class="history-progress ${allLearned ? 'complete' : ''}">${learnedCount}/${words.length}</span>
        <span class="history-arrow">›</span>
      </div>
    `;
    container.appendChild(div);
  }
}

function showDayWords(date, words) {
  const container = document.getElementById('wordsContainer');
  container.innerHTML = '';
  document.getElementById('todayDate').textContent = formatDate(date);
  document.getElementById('todaySubtitle').textContent = `${words.length} words for this day`;

  words.forEach((w, i) => {
    const card = createWordCard(w, i + 1);
    container.appendChild(card);
  });

  switchView('todayView');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============= RENDER: FAVORITES =============
function renderFavorites() {
  const container = document.getElementById('favContainer');
  container.innerHTML = '';

  const favIndices = Object.keys(state.favorites).map(Number).sort((a, b) => a - b);

  if (favIndices.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⭐</div>
        <div class="empty-text">No favorites yet.<br>Tap ☆ on any word to save it.</div>
      </div>
    `;
    return;
  }

  favIndices.forEach(idx => {
    const w = ALL_WORDS[idx];
    if (!w) return;
    const card = createWordCard({ ...w, globalIndex: idx }, '★');
    container.appendChild(card);
  });
}

// ============= RENDER: SEARCH =============
function handleSearch() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const container = document.getElementById('searchContainer');
  container.innerHTML = '';

  if (!query) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">Start typing to search ${ALL_WORDS.length} words</div>
      </div>
    `;
    return;
  }

  const matches = ALL_WORDS
    .map((w, idx) => ({ ...w, globalIndex: idx }))
    .filter(w =>
      w.word.toLowerCase().includes(query) ||
      w.englishMeaning.toLowerCase().includes(query) ||
      w.hindiMeaning.includes(query) ||
      (w.category && w.category.toLowerCase().includes(query))
    )
    .slice(0, 50);

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🤔</div>
        <div class="empty-text">No matches for "${escapeHtml(query)}"</div>
      </div>
    `;
    return;
  }

  matches.forEach((w, i) => {
    const card = createWordCard(w, i + 1);
    container.appendChild(card);
  });
}

// ============= RENDER: PROFILE =============
function renderProfile() {
  document.getElementById('pStatLearned').textContent = Object.keys(state.learned).length;
  document.getElementById('pStatFavs').textContent = Object.keys(state.favorites).length;
  document.getElementById('pStreak').textContent = state.streak || 0;
}

function updateStats() {
  document.getElementById('totalLearned').textContent = Object.keys(state.learned).length;
  document.getElementById('statLearned').textContent = Object.keys(state.learned).length;
  document.getElementById('statFavs').textContent = Object.keys(state.favorites).length;
  document.getElementById('pStatLearned').textContent = Object.keys(state.learned).length;
  document.getElementById('pStatFavs').textContent = Object.keys(state.favorites).length;
}

// ============= NAV =============
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============= THEME =============
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  document.querySelector('.icon-btn').textContent = state.theme === 'dark' ? '☀️' : '🌙';
  saveState();
}

// ============================================
// ============ NOTIFICATIONS ================
// ============================================

async function toggleNotification() {
  const toggle = document.getElementById('notifToggle');
  if (toggle.checked) {
    if (!('Notification' in window)) {
      showToast('❌ Browser does not support notifications');
      toggle.checked = false;
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('⚠️ Notification permission denied');
      toggle.checked = false;
      return;
    }

    state.notifications.enabled = true;
    document.getElementById('timeRow').style.display = 'flex';
    showToast('🔔 Daily reminder ON! Time: ' + formatTime12h(state.notifications.time));
    testNotification();
  } else {
    state.notifications.enabled = false;
    document.getElementById('timeRow').style.display = 'none';
    showToast('🔕 Reminders off');
  }
  saveState();
}

function updateReminderTime() {
  const time = document.getElementById('reminderTime').value;
  state.notifications.time = time;
  document.getElementById('reminderTimeText').textContent = formatTime12h(time);
  saveState();
  showToast('⏰ Reminder time set to ' + formatTime12h(time));
}

function applyNotificationState() {
  document.getElementById('notifToggle').checked = state.notifications.enabled;
  document.getElementById('reminderTime').value = state.notifications.time;
  document.getElementById('reminderTimeText').textContent = formatTime12h(state.notifications.time);
  document.getElementById('timeRow').style.display = state.notifications.enabled ? 'flex' : 'none';
}

function testNotification() {
  if (!('Notification' in window)) {
    showToast('❌ Browser does not support notifications');
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') showTestNotif();
    });
  } else if (Notification.permission === 'granted') {
    showTestNotif();
  } else {
    showToast('⚠️ Notifications blocked. Enable in browser settings.');
  }
}

function showTestNotif() {
  const words = getWordsForDate(new Date());
  const firstWord = words[0]?.word || 'Word';
  const n = new Notification('📚 English Vocab - आज के 5 words ready!', {
    body: `पहला word: ${firstWord}. App खोलें और पढ़ें!`,
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>',
    tag: 'bca-vocab-daily'
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
  setTimeout(() => n.close(), 10000);
  showToast('🔔 Test notification bhej diya!');
}

let notifCheckerInterval = null;
function startNotificationChecker() {
  if (notifCheckerInterval) clearInterval(notifCheckerInterval);
  notifCheckerInterval = setInterval(checkNotificationTime, 60000); // every minute
  checkNotificationTime();
}

function checkNotificationTime() {
  if (!state.notifications?.enabled) return;
  if (Notification.permission !== 'granted') return;

  const now = new Date();
  const [h, m] = (state.notifications.time || '09:00').split(':');
  if (now.getHours() !== parseInt(h) || now.getMinutes() !== parseInt(m)) return;

  // Already shown today?
  const today = getTodayString();
  if (localStorage.getItem(NOTIF_CHECK_KEY) === today) return;
  localStorage.setItem(NOTIF_CHECK_KEY, today);

  showTestNotif();
}

// ============= MODAL =============
function showUpgradeInfo() {
  document.getElementById('upgradeModal').style.display = 'flex';
}
function closeUpgradeInfo() {
  document.getElementById('upgradeModal').style.display = 'none';
}
// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.id === 'upgradeModal') closeUpgradeInfo();
});

// ============= EXPORT / RESET =============
function exportData() {
  const data = {
    user: state.user,
    learnedCount: Object.keys(state.learned).length,
    favoritesCount: Object.keys(state.favorites).length,
    streak: state.streak,
    daysActive: getDayNumber(),
    joinedAt: state.user?.joinedAt,
    exportDate: new Date().toISOString()
  };
  const text = JSON.stringify(data, null, 2);
  copyToClipboard(text);
  showToast('📊 Stats copied to clipboard!');
}

function resetProgress() {
  if (!confirm('Reset all progress? This will clear learned words, favorites, and streak. Your account will stay.')) return;
  state.learned = {};
  state.favorites = {};
  state.streak = 0;
  state.lastVisit = null;
  saveState();
  showToast('🔄 Progress reset!');
  initApp();
}

// ============= TOAST =============
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============= UTILS =============
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============= STARTUP =============
window.addEventListener('DOMContentLoaded', () => {
  loadAllWords();
  loadState();
  if (state.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  if (state.user) {
    updateStreak();
    showApp();
  } else {
    showAuth();
  }

  setTimeout(() => {
    const sp = document.getElementById('searchContainer');
    if (sp && !document.getElementById('searchInput').value) {
      sp.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">Start typing to search ${ALL_WORDS.length} words</div>
        </div>
      `;
    }
  }, 100);
});

// Enter key handler (no longer needed for OTP — Google button handles its own)
// document.addEventListener('keydown', (e) => {
//   if (e.key === 'Enter') { /* no-op */ }
// });

// ============================================
// ============ GOOGLE SIGN-IN =================
// ============================================

/**
 * Called by Google's Identity Services button when user signs in
 * @param {Object} response - { credential: "jwt..." }
 */
window.handleGoogleCredentialResponse = async function (response) {
  console.log('Google credential received');
  const credential = response.credential;
  if (!credential) {
    showToast('❌ Google sign-in failed');
    return;
  }

  // Show loading state
  showToast('🔐 Verifying with Google...');

  // If no backend configured, use fallback: decode JWT locally
  const apiBase = (window.GOOGLE_CONFIG && window.GOOGLE_CONFIG.API_BASE) || '';
  if (!apiBase) {
    console.warn('API_BASE not set — using local-only Google sign-in (no DB save)');
    handleGoogleSignInLocal(credential);
    return;
  }

  // Send credential to backend for verification + DB save
  try {
    const res = await fetch(apiBase + '/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast('❌ ' + (data.error || 'Google sign-in failed'));
      return;
    }

    // Save user + session token
    state.user = {
      id: data.user.id,
      googleId: data.user.google_id,
      email: data.user.email,
      name: data.user.name,
      picture: data.user.picture,
      joinedAt: data.user.joined_at,
      sessionToken: data.token,
      authMethod: 'google',
      lastLogin: new Date().toISOString()
    };

    // Preserve any favorites/learned if user previously used the device
    saveState();
    updateStreak();
    showToast('✅ Welcome ' + data.user.name + '!');
    showApp();
  } catch (err) {
    console.error('Backend error:', err);
    showToast('⚠️ Backend not reachable. Using local sign-in.');
    handleGoogleSignInLocal(credential);
  }
};

/**
 * Local fallback: parse the Google JWT without backend
 * NOTE: This does NOT save to any database. For full admin features,
 * configure a backend API_BASE in google-config.js
 */
function handleGoogleSignInLocal(credential) {
  try {
    // Decode JWT payload (no verification — for demo only)
    const parts = credential.split('.');
    if (parts.length !== 3) throw new Error('Invalid credential format');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    if (!payload.email_verified) {
      showToast('⚠️ Email not verified');
      return;
    }

    state.user = {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture,
      joinedAt: state.user?.joinedAt || new Date().toISOString(),
      sessionToken: null,
      authMethod: 'google',
      lastLogin: new Date().toISOString()
    };

    saveState();
    updateStreak();
    showToast('✅ Welcome ' + state.user.name + '! (Local sign-in — no DB save)');
    showApp();
  } catch (err) {
    console.error('Local sign-in failed:', err);
    showToast('❌ Could not parse Google credential');
  }
}

/**
 * Fallback button when Google's button didn't load
 */
window.googleSignInFallback = function () {
  showToast('⚠️ Google Sign-In not configured. See SETUP.md to enable it.');
};

// Initialize Google button when Google's script loads
window.addEventListener('load', () => {
  // Try to init every 200ms until Google's API is ready (max 5 seconds)
  let attempts = 0;
  const tryInit = setInterval(() => {
    attempts++;
    if (typeof google !== 'undefined' && google.accounts && window.initGoogleSignIn) {
      window.initGoogleSignIn();
      clearInterval(tryInit);
    } else if (attempts > 25) {
      clearInterval(tryInit);
    }
  }, 200);
});
