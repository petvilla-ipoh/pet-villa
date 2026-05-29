#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="petvilla-ipoh"
REPO_NAME="pet-villa"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"

say() {
  printf "\n\033[1;35m%s\033[0m\n" "$1"
}

warn() {
  printf "\n\033[1;33m%s\033[0m\n" "$1"
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    warn "Missing command: $1"
    return 1
  fi
  return 0
}

prompt() {
  local label="$1"
  local default_value="${2:-}"
  local value
  if [ -n "$default_value" ]; then
    read -r -p "${label} [${default_value}]: " value
    printf "%s" "${value:-$default_value}"
  else
    read -r -p "${label}: " value
    printf "%s" "$value"
  fi
}

prompt_secret() {
  local label="$1"
  local value
  read -r -s -p "${label}: " value
  printf "\n" >&2
  printf "%s" "$value"
}

json_one_line() {
  local file_path="$1"
  if command -v python >/dev/null 2>&1; then
    python -c "import json,sys; print(json.dumps(json.load(open(sys.argv[1], encoding='utf-8')), separators=(',', ':')))" "$file_path"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import json,sys; print(json.dumps(json.load(open(sys.argv[1], encoding='utf-8')), separators=(',', ':')))" "$file_path"
  else
    warn "Python was not found, so Firebase JSON cannot be converted automatically."
    printf ""
  fi
}

say "The Pet Villa setup"

if [ ! -f "package.json" ]; then
  warn "Please run this script from the project root folder, the folder that contains package.json."
  exit 1
fi

say "1. Checking required tools"
missing=0
need_command git || missing=1
need_command node || missing=1
need_command npm || missing=1

if [ "$missing" -eq 1 ]; then
  warn "Install the missing tools first, then run this script again."
  warn "Recommended for Windows: install Git for Windows, Node.js LTS, and GitHub CLI."
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  warn "GitHub CLI (gh) is not installed. Dependency install and .env setup can continue, but GitHub repo creation will be skipped."
fi

say "2. Installing npm dependencies"
npm install

say "3. Creating .env"
warn "Keep this file private. It is ignored by Git and must not be committed."

CORS_ORIGIN=$(prompt "CORS_ORIGIN, comma-separated web origins" "http://localhost:3000,https://YOUR_VERCEL_DOMAIN.vercel.app")
DATABASE_URL=$(prompt_secret "Supabase DATABASE_URL")
SUPABASE_ANON_KEY=$(prompt_secret "Supabase Anon Key")
REDIS_URL=$(prompt "REDIS_URL" "redis://localhost:6379")
STRIPE_SECRET_KEY=$(prompt_secret "Stripe Secret Key")
STRIPE_PUBLISHABLE_KEY=$(prompt "Stripe Publishable Key")
STRIPE_WEBHOOK_SECRET=$(prompt "Stripe Webhook Secret, or leave placeholder until webhook is created" "whsec_replace_after_webhook_setup")
FIREBASE_JSON_PATH=$(prompt "Path to Firebase service account JSON file, or leave blank to paste later")
EXPO_PUBLIC_API_URL=$(prompt "EXPO_PUBLIC_API_URL" "http://localhost:4000/api/v1")
NEXT_PUBLIC_API_URL=$(prompt "NEXT_PUBLIC_API_URL" "http://localhost:4000/api/v1")

FIREBASE_SERVICE_ACCOUNT="PASTE_FIREBASE_SERVICE_ACCOUNT_JSON_HERE"
if [ -n "$FIREBASE_JSON_PATH" ] && [ -f "$FIREBASE_JSON_PATH" ]; then
  FIREBASE_SERVICE_ACCOUNT=$(json_one_line "$FIREBASE_JSON_PATH")
fi

cat > .env <<EOF_ENV
NODE_ENV=development
PORT=4000
CORS_ORIGIN=${CORS_ORIGIN}

# Supabase
DATABASE_URL=${DATABASE_URL}
DATABASE_SSL=true
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Redis
REDIS_URL=${REDIS_URL}

# Stripe
PAYMENT_MODE=stripe
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT='${FIREBASE_SERVICE_ACCOUNT}'
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Frontend
EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Render
RENDER_HEALTHCHECK_PATH=/health
EOF_ENV

say "4. Checking Git repository"
if [ ! -d ".git" ]; then
  git init
fi

if ! git config user.name >/dev/null 2>&1; then
  GIT_NAME=$(prompt "Git commit name, for example your name or petvilla-ipoh")
  git config user.name "$GIT_NAME"
fi

if ! git config user.email >/dev/null 2>&1; then
  GIT_EMAIL=$(prompt "Git commit email, usually your GitHub email")
  git config user.email "$GIT_EMAIL"
fi

git add .
if git diff --cached --quiet; then
  warn "No new Git changes to commit."
else
  git commit -m "Initial The Pet Villa app"
fi

say "5. Preparing GitHub remote"
if command -v gh >/dev/null 2>&1; then
  if ! gh auth status >/dev/null 2>&1; then
    warn "GitHub CLI is not logged in. A browser login will open now."
    gh auth login
  fi

  if gh repo view "${REPO_OWNER}/${REPO_NAME}" >/dev/null 2>&1; then
    warn "GitHub repo already exists: ${REPO_OWNER}/${REPO_NAME}"
    if git remote get-url origin >/dev/null 2>&1; then
      git remote set-url origin "$REPO_URL"
    else
      git remote add origin "$REPO_URL"
    fi
    git branch -M main
    git push -u origin main
  else
    gh repo create "${REPO_OWNER}/${REPO_NAME}" --private --source . --remote origin --push
  fi
else
  warn "Skipping GitHub push because gh is not installed."
  warn "After installing GitHub CLI, run:"
  printf "gh auth login\n"
  printf "gh repo create %s/%s --private --source . --remote origin --push\n" "$REPO_OWNER" "$REPO_NAME"
fi

say "Setup complete"
printf "Next: open Supabase SQL Editor and run the migration files in database/migrations in order.\n"
