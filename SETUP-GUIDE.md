# SeatChart MVP — Setup Guide

## What's in this package

```
seating-chart-mvp/
├── index.html          ← Entry HTML
├── package.json        ← Dependencies
├── vite.config.js      ← Build config
├── SETUP-GUIDE.md      ← This file
└── src/
    ├── main.jsx        ← App entry point
    ├── App.jsx         ← Router (landing page ↔ app)
    ├── LandingPage.jsx ← Marketing / pricing page
    └── SeatingChart.jsx ← The actual seating chart tool
```

---

## Step 1: Get the tools (one-time, 10 minutes)

### Install Node.js
1. Go to https://nodejs.org
2. Download the LTS version (the big green button)
3. Install it — click Next through everything
4. Open Terminal (Mac) or Command Prompt (Windows)
5. Type `node --version` and press Enter — if you see a number, you're good

### Create accounts (all free)
1. **GitHub** — https://github.com — for storing your code
2. **Vercel** — https://vercel.com — sign up with your GitHub account — this hosts your website
3. **Stripe** — https://stripe.com — for accepting payments (you'll set this up later)

---

## Step 2: Get it running locally (5 minutes)

Open Terminal / Command Prompt and run these commands one at a time:

```bash
# Go into the project folder (wherever you saved it)
cd seating-chart-mvp

# Install dependencies
npm install

# Start the local dev server
npm run dev
```

You'll see something like:
```
  VITE v5.0.0  ready in 300 ms
  ➜  Local:   http://localhost:5173/
```

Open that URL in your browser. You should see the landing page. Click "Open App" to see the seating chart tool.

**Press Ctrl+C in the terminal to stop the server when you're done.**

---

## Step 3: Put it on the internet (10 minutes)

### Push to GitHub
1. Go to https://github.com/new
2. Name it `seating-chart` (or whatever you want)
3. Leave it public (or private, doesn't matter)
4. DON'T check any boxes, just click "Create repository"
5. In your terminal, inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/seating-chart.git
git push -u origin main
```

(Replace YOUR-USERNAME with your actual GitHub username)

### Deploy to Vercel
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repo
4. Click "Deploy"
5. Wait ~60 seconds
6. You'll get a URL like `seating-chart-abc123.vercel.app`

**That's it. Your app is live.** Every time you push code to GitHub, Vercel rebuilds it automatically.

### Custom domain (optional, $12/year)
1. Buy a domain at https://namecheap.com (e.g., seatchart.app)
2. In Vercel, go to your project → Settings → Domains
3. Add your domain and follow the DNS instructions

---

## Step 4: Add payments with Stripe (when you're ready)

This is the part that turns it from free tool into a business. Here's the simplest approach:

### Option A: Stripe Payment Links (easiest, no code)
1. In Stripe Dashboard, go to Payment Links
2. Create a link for your plan ($6/month or whatever you chose)
3. Replace the "Start Free Trial" button href on your landing page with the Stripe link
4. After payment, Stripe sends them to a success URL — point it to `yourdomain.com/#/app`

This works but doesn't block non-paying users from the app. For a true paywall:

### Option B: Stripe Checkout + Supabase (more work, proper paywall)

This requires a backend. The simplest way:

1. **Supabase** (https://supabase.com) — free tier gives you:
   - User accounts (email/password signup)
   - A database (stores seating chart data in the cloud)
   - Edge functions (server-side code for Stripe)

2. Install Supabase in your project:
```bash
npm install @supabase/supabase-js
```

3. Create a `src/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'YOUR_SUPABASE_URL',      // from Supabase dashboard
  'YOUR_SUPABASE_ANON_KEY'  // from Supabase dashboard
)
```

4. The flow becomes:
   - Teacher signs up → Supabase creates account
   - They get a 14-day free trial
   - After trial → redirect to Stripe Checkout
   - Stripe webhook tells Supabase they paid
   - App checks subscription status before loading

**I'd recommend starting with Option A** (Stripe Payment Links). It gets you revenue with zero backend code. You can add the proper paywall later once you have paying customers and know the product has legs.

---

## Step 5: Things to customize

### Change the app name
Search and replace "SeatChart" in all files with whatever you name it.

### Change pricing
Edit `src/LandingPage.jsx` — find the pricing section and change the numbers.

### Change colors
Both files use the same color object `C` near the top. Change `green` to whatever your brand color is.

### Add your email list
In `LandingPage.jsx`, find the `handleSubmit` function. Connect it to:
- **Mailchimp** — free up to 500 contacts
- **ConvertKit** — free up to 1,000 contacts
- **Google Forms** — free forever (create a form, use the form action URL)

### Add analytics
Sign up at https://plausible.io ($9/month, privacy-friendly) or use Google Analytics (free). Add the script tag to `index.html`.

---

## Cost summary

| Item | Cost | Notes |
|------|------|-------|
| Vercel hosting | $0 | Free tier is plenty |
| Domain name | $12/year | Optional but professional |
| Stripe | 2.9% + 30¢ per charge | No monthly fee |
| Supabase | $0 | Free tier: 50K users, 500MB |
| **Total to start** | **$0–12** | |

### Revenue math
- 100 teachers × $6/month = **$600/month**
- 500 teachers × $6/month = **$3,000/month**
- 1 school district × 200 teachers × $4/teacher/year = **$800/year** per district
- Stripe takes ~$18/month at 100 teachers

---

## Marketing — where teachers hang out

1. **Teacher Facebook groups** — there are groups with 100K+ members. Share a post showing the IEP tracking and smart assign features.
2. **r/Teachers on Reddit** — post in the weekly thread about tools you've built.
3. **Teachers Pay Teachers** — list a "free resource" that links to your app.
4. **Twitter/X #EduTwitter** — teachers are very active here.
5. **Your own school** — get 5 teachers using it, then ask them to share.
6. **Back-to-school timing** — August is your biggest month. Plan for it.

---

## Getting help

If you get stuck on any step, you can:
- Come back to this Claude conversation and ask
- Post on Vercel's community forum (very responsive)
- Post on Supabase's Discord
- Google the exact error message — someone's had it before

Good luck! You've already built the hard part. 🪑
