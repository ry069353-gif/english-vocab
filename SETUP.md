# 🚀 Setup Guide — English Vocab with Google Sign-In

This guide walks you through setting up **Google OAuth 2.0 Sign-In** and the **Admin Panel** for English Vocab.

---

## 📋 What you'll need

- ✅ A Google account
- ✅ 10 minutes of your time
- ✅ A free hosting account (Render.com recommended)

---

## 🎯 Overview of the setup

```
┌─────────────────────┐         ┌──────────────────────┐
│   Browser           │         │  Backend Server      │
│  (English Vocab)    │ <─────> │  (Node.js + Express) │
│                     │  HTTPS  │                      │
│  - Login page       │         │  - Verify Google JWT │
│  - Google button    │         │  - Save to SQLite DB │
│  - Admin panel      │         │  - Serve admin API   │
└─────────────────────┘         └──────────────────────┘
```

---

## 🪜 STEP 1: Get Google OAuth Credentials (5 min)

### 1.1 Go to Google Cloud Console
👉 Open: https://console.cloud.google.com/

### 1.2 Create a new project
- Click the project dropdown at the top
- Click **"New Project"**
- Name: `English Vocab` (or anything you like)
- Click **Create**

### 1.3 Enable Google Identity Services
- In the left menu: **APIs & Services** → **Library**
- Search for **"Google Identity"** or **"Google+ API"**
- Click on it → Click **Enable**

### 1.4 Configure OAuth Consent Screen
- Go to **APIs & Services** → **OAuth consent screen**
- Choose **External** → Click **Create**
- Fill in:
  - App name: `English Vocab`
  - User support email: your email
  - Developer contact: your email
- Click **Save and Continue** through all steps
- On **Test users** page, add your own email
- Click **Back to Dashboard**

### 1.5 Create OAuth 2.0 Client ID
- Go to **APIs & Services** → **Credentials**
- Click **"+ Create Credentials"** → **"OAuth client ID"**
- Application type: **Web application**
- Name: `English Vocab Web`
- **Authorized JavaScript origins** — add ALL of these:
  ```
  http://localhost:8000
  http://localhost:3000
  https://your-frontend-domain.com
  ```
  (Replace `your-frontend-domain.com` with your actual frontend URL — for the static deploy, you can use the space.minimax.io URL or your custom domain)

- **Authorized redirect URIs** — leave empty (we don't use redirect flow)
- Click **Create**

### 1.6 Copy your Client ID
- A popup will show your **Client ID** and **Client Secret**
- 📋 **Copy the Client ID** (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)
- You don't need the Client Secret (we use the JavaScript SDK)

---

## 🪜 STEP 2: Configure the Frontend (1 min)

### 2.1 Open `google-config.js`

### 2.2 Paste your Client ID
```javascript
window.GOOGLE_CONFIG = {
  CLIENT_ID: 'PASTE-YOUR-CLIENT-ID-HERE.apps.googleusercontent.com',
  API_BASE: '',  // Will set in Step 4 after deploying backend
  // ... rest stays the same
};
```

### 2.3 Save the file

---

## 🪜 STEP 3: Deploy the Backend (5 min)

The backend needs to run on a server (not just a static host). The easiest free option is **Render.com**.

### 3.1 Create a GitHub repo
- Go to https://github.com/new
- Create a new **public** repo named `english-sikho-backend`
- Upload the `backend/` folder to it

### 3.2 Sign up at Render
- Go to https://render.com
- Sign up free with GitHub

### 3.3 Create a new Web Service
- Click **"New +"** → **"Web Service"**
- Connect your `english-sikho-backend` repo
- Fill in:
  - **Name**: `english-sikho-backend`
  - **Region**: Oregon (or nearest)
  - **Branch**: `main`
  - **Root Directory**: `backend`
  - **Runtime**: Node
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Instance Type**: Free
- Click **"Advanced"** → Add environment variables:
  ```
  NODE_ENV=production
  GOOGLE_CLIENT_ID=YOUR-CLIENT-ID-HERE
  JWT_SECRET=run-this-command-to-generate-a-random-secret
  ADMIN_USERNAME=admin
  ADMIN_PASSWORD=YourSecurePassword123
  DB_PATH=./data/english-sikho.db
  ```
  
  💡 To generate a JWT secret, run in terminal: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

- Click **"Create Web Service"**

### 3.4 Wait for deployment
- First deploy takes 2-3 minutes
- You'll get a URL like: `https://english-sikho-backend.onrender.com`
- Test it: open `https://your-backend-url.onrender.com/api/health` — should show:
  ```json
  {"status":"ok","service":"English Vocab Backend","version":"1.0.0"}
  ```

---

## 🪜 STEP 4: Update Frontend with Backend URL (1 min)

### 4.1 Open `google-config.js` again

### 4.2 Add your backend URL
```javascript
window.GOOGLE_CONFIG = {
  CLIENT_ID: 'your-client-id-here.apps.googleusercontent.com',
  API_BASE: 'https://english-sikho-backend.onrender.com',  // 👈 Your backend URL
  // ... rest stays the same
};
```

### 4.3 Re-deploy frontend
- If using a static host, just re-upload `index.html`, `app.js`, `google-config.js`
- Or simply refresh the site — users will get the new code on next visit

---

## 🪜 STEP 5: Update Google Cloud Authorized Origins (1 min)

Go back to Google Cloud Console → Credentials → Edit your OAuth Client ID

Add your **deployed frontend URL** to "Authorized JavaScript origins":
```
https://cvdl9412qpfyp.space.minimax.io
https://your-custom-domain.com  (if you have one)
```

Save.

---

## 🪜 STEP 6: Test everything

### 6.1 Test Google Sign-In
- Open your English Vocab site
- Click **"Sign in with Google"**
- Select your Google account
- You should be logged in with your name and email showing

### 6.2 Test Admin Panel
- Open `https://your-frontend-domain.com/admin.html`
- Login with:
  - Username: `admin` (or whatever you set in env)
  - Password: `YourSecurePassword123`
- You should see your Google sign-in as the first user in the list

### 6.3 Verify database
- In Render dashboard → your service → "Shell" tab
- Run: `sqlite3 data/english-sikho.db "SELECT * FROM users;"`
- You should see your user record

---

## 🆓 Free hosting comparison

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Render.com** | 750 hrs/month, sleeps after 15min | ✅ Recommended — easy setup |
| **Railway.app** | $5 credit/month | Good alternative |
| **Fly.io** | Small VMs free | More control |
| **Vercel** | Serverless functions | Need to refactor to serverless |
| **Glitch.com** | Always free | Quick demos |

⚠️ **Render free tier** sleeps after 15 min of inactivity. First request after sleep takes 30-60 seconds. To keep it awake, use [UptimeRobot](https://uptimerobot.com) (free) to ping every 5 min.

---

## 🔒 Production checklist

Before going live, do these:

- [ ] Change `ADMIN_PASSWORD` from default
- [ ] Generate a strong `JWT_SECRET` (64+ random chars)
- [ ] Add your real domain to Google OAuth authorized origins
- [ ] Remove `.env` from git (use `.gitignore`)
- [ ] Enable HTTPS (Render does this automatically)
- [ ] Set up database backups
- [ ] Add rate limiting (already in code)
- [ ] Test with multiple users

---

## 🛠️ Troubleshooting

### "Google sign-in button doesn't show"
- Check `google-config.js` has a valid Client ID
- Check browser console for errors (F12)
- Make sure `https://accounts.google.com/gsi/client` is loading (check Network tab)

### "Invalid Google credential" error
- Verify Client ID matches exactly (no extra spaces)
- Check that your frontend URL is in "Authorized JavaScript origins"

### "Backend not configured" error
- Open `backend/.env` and set `GOOGLE_CLIENT_ID`
- Restart the backend server

### Admin panel shows "Session expired"
- Token expires after 8 hours — just log in again
- To extend: change `JWT_EXPIRES_IN` in `backend/middleware/auth.js`

### Database errors
- Check `DB_PATH` directory exists and is writable
- On Render, the `data/` folder is ephemeral — use a Persistent Disk (paid) or external DB

---

## 📁 File structure

```
english-sikho/
├── index.html              # Main frontend
├── app.js                  # Frontend logic
├── style.css               # Styles
├── words-data.js           # Vocabulary data
├── google-config.js        # 👈 EDIT THIS with your Client ID
├── admin.html              # Admin panel
├── admin.css               # Admin styles
├── backend/                # 👈 DEPLOY THIS to Render
│   ├── server.js
│   ├── package.json
│   ├── db.js
│   ├── .env.example        # 👈 COPY TO .env and configure
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       └── admin.js
├── README.md
└── SETUP.md                # This file
```

---

## 🆘 Need help?

1. Check the **Troubleshooting** section above
2. Look at backend logs in Render dashboard
3. Check browser console (F12 → Console tab) for frontend errors
4. Verify all URLs match between Google Console, Render, and `google-config.js`

---

**Total setup time: ~10 minutes** ⏱️

Enjoy your English Vocab with Google Sign-In! 🎉
