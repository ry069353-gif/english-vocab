# 📚 BCA Daily Vocab v2.0

Daily 5 English words with Hindi meanings + pronunciation, made for BCA students.

## 🎯 Features (v2.0)
- 🔐 **OTP Login** — Phone/Email verification at signup
- 📲 **WhatsApp Share** — One-tap send daily words to your WhatsApp
- 🔔 **Browser Notifications** — Daily reminder at your chosen time
- ✓ Mark words as learned
- ⭐ Save favorites
- 🔍 Search across 1500+ words
- 📅 Browse history of past days
- 🔥 Daily streak counter
- 🌙 Light/Dark mode
- 📤 Share individual words

## 📁 Project Structure
```
bca-vocab/
├── index.html              # Main page (UI structure)
├── style.css               # All styling
├── app.js                  # All logic (login, daily words, notifications)
├── words-data.js           # 1504 unique BCA vocabulary words
├── backend-integration.js  # Real Twilio/WhatsApp/SMS template (optional)
└── README.md               # This file
```

## 🚀 Quick Start

Just open `index.html` in any browser. No server, no setup.

For local server (optional):
```bash
cd bca-vocab
python3 -m http.server 8000
# Open http://localhost:8000
```

## 🛠️ How to Edit

### Change website name/title:
1. Open `index.html`
2. Find `<title>BCA Vocab - Daily 5 Words</title>` — change
3. Find `<h1 class="auth-title">BCA Vocab</h1>` — change
4. Save and refresh

### Add new words:
1. Open `words-data.js`
2. Find `window.ALL_WORDS = [`
3. Add new entry BEFORE `];`:
```javascript
{ "word": "YourWord", "pronunciation": "YUR-word", "englishMeaning": "...", "hindiMeaning": "...", "example": "...", "category": "..." }
```
4. Save and refresh

### Change colors/design:
1. Open `style.css`
2. Top section has `:root { --primary: #6366f1; ... }` — change colors
3. Save and refresh

### Customize OTP/WhatsApp behavior:
- **OTP shown on screen** (demo): Edit `sendOtp()` in `app.js`
- **WhatsApp message format**: Edit `buildDailyMessage()` in `app.js`
- **Notification time default**: Edit `'09:00'` in `state.notifications.time`

## 🔌 Real WhatsApp + SMS Upgrade Path

The demo version uses:
- **OTP**: 4-digit code shown on screen
- **WhatsApp**: Manual share via wa.me link

For **automatic daily delivery** to real WhatsApp/SMS, see `backend-integration.js`. It includes:
- Complete Node.js + Express + Twilio setup
- Daily cron job at 9 AM
- OTP via SMS
- WhatsApp message delivery
- Email alternative using EmailJS (200 free/month)

**Cost**: ~₹0.50/message via Twilio. Free tier: $15 credit.

## 🌐 Live Demo
https://ci5schbbj53sc.space.minimax.io

## 📱 Mobile Installation
Open the URL in mobile browser → menu → "Add to Home Screen"
- iOS Safari: Share button → Add to Home Screen
- Android Chrome: Menu (⋮) → Add to Home Screen

## 💡 Tips for Best Experience
1. **Enable notifications** when prompted (Profile → Settings)
2. **Allow WhatsApp number** at signup for easy daily sharing
3. **Bookmark** the site for quick daily access
4. **Use dark mode** for night reading (moon icon top-right)
5. **Save favorites** for revision before exams

## 🎨 Categories Included (20 total)
- Programming Basics, C Language, Java, Python, Logic, Version Control
- Data Structures, Algorithms, OOP, Database, SQL
- Operating System, Networks, Web Development, Software Engineering, Cloud Computing
- Hardware, AI/ML, Cybersecurity
- Professional English, Academic English

## 🔐 Privacy
- All data stored in your browser's localStorage
- No data sent to any server (in demo mode)
- No tracking, no cookies
- You can logout/clear anytime

## 🐛 Troubleshooting
- **Notifications not working?** Check browser settings → Site permissions → Notifications
- **WhatsApp not opening?** Make sure WhatsApp is installed on your device
- **Words not loading?** Clear browser cache (Ctrl+Shift+R) and reload
- **OTP not showing?** Check browser console (F12) for errors

---
Made with 💜 for BCA students
Version 2.0 — with OTP, WhatsApp Share, and Notifications
