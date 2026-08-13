# 🚀 Vercel + Turso Setup Guide (Hindi)

Yeh backend ab **Vercel serverless functions** ke liye bana hai, aur database
**Turso** (cloud SQLite) par store hoga — matlab data hamesha safe rahega,
Vercel restart ho ya kuch bhi ho.

Maine yeh sab pehle hi test kar liya hai (login, users, stats, subscribe —
sab sahi kaam kar rahe hain).

---

## Step 1: Turso account + database banayein

1. https://turso.tech par jaayein, sign up karein (free)
2. Turso CLI install karein (agar Mac/Linux hai):
   ```
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
   Windows ke liye: https://docs.turso.tech/cli/installation dekhein

3. Login karein:
   ```
   turso auth login
   ```

4. Database banayein:
   ```
   turso db create english-vocab
   ```

5. Database URL nikalein:
   ```
   turso db show english-vocab --url
   ```
   Output kuch aisa hoga: `libsql://english-vocab-yourname.turso.io`
   — yeh copy kar lein.

6. Auth token banayein:
   ```
   turso db tokens create english-vocab
   ```
   Ek lamba token milega — yeh bhi copy kar lein.

   💡 Agar CLI install nahi karna, to Turso ki website (dashboard) se bhi
   yeh dono cheezein mil jaati hain — "Create Database" ke baad "Connect"
   button click karein.

---

## Step 2: Is backend folder ko GitHub par upload karein

1. GitHub par ek naya repo banayein (public ya private, dono chalega)
2. Is poore folder (`vercel-backend/` ke andar ka content — `api/`, `lib/`,
   `package.json`, `vercel.json`, `.gitignore`) ko us repo me upload karein
3. ⚠️ `.env` file kabhi upload na karein (yeh sirf local testing ke liye hai)

---

## Step 3: Vercel par deploy karein

1. https://vercel.com par jaayein, GitHub se login karein
2. **"Add New" → "Project"** click karein
3. Apna backend repo select karein aur **"Import"** karein
4. Deploy hone se pehle **"Environment Variables"** section me yeh sab add karein:

   ```
   GOOGLE_CLIENT_ID=720582602063-ot2n7qh268t2hfp1qlmsloq1rbfb7pbj.apps.googleusercontent.com
   JWT_SECRET=(neeche wala command chala kar generate karein)
   JWT_EXPIRES_IN=8h
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=ApnaStrongPassword123!
   TURSO_DATABASE_URL=libsql://english-vocab-yourname.turso.io   👈 Step 1 se
   TURSO_AUTH_TOKEN=(Step 1 wala token)                          👈 Step 1 se
   ALLOWED_ORIGINS=
   ```

   `JWT_SECRET` generate karne ke liye apne computer ke terminal me:
   ```
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. **"Deploy"** click karein — 1-2 minute me ho jayega
6. URL milega jaise: `https://english-vocab-backend.vercel.app`
7. Test karein: browser me kholein
   ```
   https://english-vocab-backend.vercel.app/api/health
   ```
   `{"status":"ok",...}` dikhna chahiye ✅

---

## Step 4: Frontend ko is backend se jodein

`google-config.js` file kholein aur update karein:

```javascript
window.GOOGLE_CONFIG = {
  CLIENT_ID: '...(already set)...',
  API_BASE: 'https://english-vocab-backend.vercel.app',   // 👈 yahan naya URL
  ...
};
```

Agar aap frontend aur backend **dono ek hi Vercel project** me rakhna chahte
hain (recommended — simpler), to frontend files (`index.html`, `app.js`, etc.)
isi `vercel-backend` repo ke root me copy kar dein aur `API_BASE: ''` khaali
rakhein — dono same domain se serve honge.

---

## Step 5: Admin panel test karein

1. `admin.html` kholein
2. Login karein:
   - Username: jo `ADMIN_USERNAME` set kiya
   - Password: jo `ADMIN_PASSWORD` set kiya
3. Google sign-in karne wale users ab yahan dikhne lagenge

---

## Zaroori baatein

- **Turso free tier** kaafi generous hai (500 databases, 9GB storage) — chhoti
  website ke liye bilkul free rahega
- **Vercel serverless** har request par naya function chalata hai, lekin
  ab data Turso (cloud) me store hai, isliye kabhi delete nahi hoga
- Password badalna ho to sirf Vercel ke environment variable
  `ADMIN_PASSWORD` update karein aur redeploy karein
- `.env` file sirf local testing ke liye hai — production me Vercel dashboard
  ke environment variables hi use hote hain

---

## File structure

```
vercel-backend/
├── package.json
├── vercel.json
├── .env.example          👈 sirf reference ke liye, isko copy karke .env banayein local test ke liye
├── .gitignore
├── lib/
│   ├── db.js              👈 Turso database helper functions
│   └── auth.js            👈 JWT + CORS helpers
└── api/
    ├── health.js                          GET  /api/health
    ├── subscribe.js                       POST /api/subscribe
    ├── stats.js                           GET  /api/stats
    ├── auth/
    │   └── google.js                      POST /api/auth/google
    └── admin/
        ├── login.js                       POST /api/admin/login
        ├── stats.js                       GET  /api/admin/stats
        └── users/
            ├── index.js                   GET  /api/admin/users
            └── [id]/
                ├── index.js                GET/DELETE /api/admin/users/:id
                └── activate.js             POST /api/admin/users/:id/activate
```
