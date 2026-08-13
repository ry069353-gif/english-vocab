/* ============================================
   Google OAuth Configuration
   ============================================
   ✅ CONFIGURED — Google Sign-In is now active!
   👤 Client ID: 720582602063-ot2n7qh... (Owner: Rajneesh)
   📌 Current mode: LOCAL (no backend deployed)
      → Google login works
      → User data saved in browser only
      → Admin panel will be empty (DB not connected)
   
   To enable full database features:
   1. Deploy the backend/ folder to Render.com
   2. Add API_BASE below with your backend URL
   ============================================ */

window.GOOGLE_CONFIG = {
  // ✅ Your Google Client ID (configured!)
  CLIENT_ID: '720582602063-ot2n7qh268t2hfp1qlmsloq1rbfb7pbj.apps.googleusercontent.com',

  // 👇 YOUR BACKEND API URL (leave empty for local mode)
  // For local testing: 'http://localhost:3000'
  // For production: 'https://your-backend.onrender.com'
  API_BASE: 'https://english-vocab-sooty.vercel.app/',

  // Google button settings
  AUTO_SELECT: false,
  CANCEL_ON_TAP_OUTSIDE: true,
  ITP_SUPPORT: true
};

// Helper: detect if Google Sign-In is properly configured
window.isGoogleSignInConfigured = function () {
  return !!(window.GOOGLE_CONFIG.CLIENT_ID && window.GOOGLE_CONFIG.CLIENT_ID.length > 20);
};

// Initialize Google Sign-In button when ready
window.initGoogleSignIn = function () {
  const container = document.getElementById('googleSignInContainer');
  const fallback = document.getElementById('googleFallback');

  if (!window.isGoogleSignInConfigured()) {
    // Show fallback button with setup hint
    if (container) container.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
    return;
  }

  if (typeof google === 'undefined' || !google.accounts) {
    setTimeout(window.initGoogleSignIn, 200);
    return;
  }

  if (container) container.style.display = 'block';
  if (fallback) fallback.style.display = 'none';

  google.accounts.id.initialize({
    client_id: window.GOOGLE_CONFIG.CLIENT_ID,
    callback: window.handleGoogleCredentialResponse,
    auto_select: window.GOOGLE_CONFIG.AUTO_SELECT,
    cancel_on_tap_outside: window.GOOGLE_CONFIG.CANCEL_ON_TAP_OUTSIDE,
    itp_support: window.GOOGLE_CONFIG.ITP_SUPPORT
  });

  google.accounts.id.renderButton(
    document.getElementById('googleBtn'),
    {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: '100%'
    }
  );

  // Optionally prompt account selection if user already signed in
  // google.accounts.id.prompt();
};
