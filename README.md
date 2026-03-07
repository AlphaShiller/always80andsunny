# SolGate — Creator Paywall & Membership on Solana

A Next.js prototype for a creator-first paywall and membership platform powered by Solana.

## Deploy to Vercel (Easiest — 5 minutes)

### Step 1: Push to GitHub
1. Go to [github.com/new](https://github.com/new) and create a new repository called `solgate-app`
2. Open Terminal on your Mac and run these commands one at a time:

```bash
cd ~/Desktop/Claude\ Folder/solgate-app
git init
git add .
git commit -m "Initial SolGate prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/solgate-app.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click "Add New Project"
3. Import your `solgate-app` repository
4. Click "Deploy" — Vercel auto-detects Next.js
5. Wait ~60 seconds and you'll get a live URL!

## Run Locally

```bash
cd ~/Desktop/Claude\ Folder/solgate-app
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)
