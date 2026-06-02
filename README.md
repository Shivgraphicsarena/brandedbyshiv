# BrandedByShiv — Deployment Guide

## 📁 Repo Structure
```
brandedbyshiv/
├── api/
│   ├── gemini.js      ← Handles all AI text generation (rate limited)
│   ├── scan.js        ← Product image scan via Gemini Vision
│   ├── tagline.js     ← Smart tagline generation
│   └── usage.js       ← Check remaining credits
├── public/
│   ├── index.html     ← The main app
│   └── manifest.json  ← PWA manifest
├── vercel.json        ← Vercel routing config
├── package.json       ← Dependencies
└── .gitignore
```

## 🚀 Deploy to Vercel (Step by Step)

### Step 1: Push to GitHub
1. Create a new GitHub repo named `brandedbyshiv`
2. Upload all these files to the repo
3. Make sure the folder structure matches above

### Step 2: Connect to Vercel
1. Go to vercel.com → Log in
2. Click "Add New Project"
3. Import your `brandedbyshiv` GitHub repo
4. Click Deploy (first deploy will fail — that's okay, we need env vars)

### Step 3: Add Environment Variables
In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add these one by one:

| Variable | Value |
|----------|-------|
| `GEMINI_API_KEY` | Your Gemini API key from aistudio.google.com |
| `ANTHROPIC_API_KEY` | Your Claude API key (optional — taglines fallback to Gemini) |
| `FIREBASE_PROJECT_ID` | `brandingbyshiv-d0577` |
| `FIREBASE_CLIENT_EMAIL` | From Firebase Console → Service Account |
| `FIREBASE_PRIVATE_KEY` | From Firebase Console → Service Account (copy the full key including -----BEGIN/END-----) |

### Step 4: Get Firebase Service Account
1. Go to Firebase Console → Your Project → Project Settings
2. Click "Service Accounts" tab
3. Click "Generate New Private Key"
4. Download the JSON file
5. Copy `client_email` → paste as `FIREBASE_CLIENT_EMAIL`
6. Copy `private_key` → paste as `FIREBASE_PRIVATE_KEY`

### Step 5: Redeploy
After adding env vars:
- Go to Deployments tab → Click "Redeploy" on latest deployment

### Step 6: Done! 🎉
Your app is live at `brandedbyshiv.vercel.app`

## 🔑 Rate Limiting
- **3 free generations per user per 48 hours**
- Tracked by Firebase UID (logged-in users)
- Resets automatically after 48 hours
- All 8 tools share the same credit pool

## 🛠️ Local Development
```bash
npm install
npm run dev   # Starts Vercel dev server
```
Requires Vercel CLI: `npm i -g vercel`

## 📞 Support
- Instagram: @its_shiv.ai
- Email: shivshankhdhar4@gmail.com
