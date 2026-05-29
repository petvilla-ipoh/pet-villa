# GitHub Push Steps

Repository target:

```text
https://github.com/petvilla-ipoh/pet-villa
```

## Option A: GitHub CLI

Install Git and GitHub CLI first, then run from the project root:

```bash
git init
git add .
git commit -m "Initial The Pet Villa app"
gh auth login
gh repo create petvilla-ipoh/pet-villa --private --source . --remote origin --push
```

Use `--public` instead of `--private` if you want the repository public.

## Option B: GitHub Website + Git

1. Open GitHub and create a new repository named `pet-villa` under `petvilla-ipoh`.
2. Do not add README, `.gitignore`, or license on GitHub because this repo already has project files.
3. Run:

```bash
git init
git add .
git commit -m "Initial The Pet Villa app"
git branch -M main
git remote add origin https://github.com/petvilla-ipoh/pet-villa.git
git push -u origin main
```

## Important

`.env` is intentionally ignored by Git. Do not push real Supabase, Stripe, or Firebase secrets. Put production secrets directly into Vercel and Render environment variable settings.
