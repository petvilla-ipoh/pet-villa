# Windows Setup Steps

This guide assumes this is your first time using Git.

## 1. Install the Required Apps

### Install Git for Windows

1. Open your browser.
2. Go to `https://git-scm.com/download/win`.
3. Download the installer.
4. Open the installer.
5. Keep the default options.
6. When the installer asks for the default branch name, choose `main` if shown.
7. Finish installation.

After installation, you will have an app called **Git Bash**.

### Install Node.js LTS

1. Go to `https://nodejs.org`.
2. Download the **LTS** version.
3. Open the installer.
4. Keep the default options.
5. Finish installation.

### Install GitHub CLI

1. Go to `https://cli.github.com`.
2. Download GitHub CLI for Windows.
3. Open the installer.
4. Keep the default options.
5. Finish installation.

## 2. Put the Project on Your Computer

If you received this project as a ZIP file:

1. Move the ZIP file to your Desktop or Documents folder.
2. Right-click the ZIP file.
3. Click **Extract All**.
4. Open the extracted folder.
5. Make sure you can see `package.json`, `apps`, `packages`, `database`, and `setup.sh`.

If the project is already in a folder, open that folder directly.

## 3. Open Git Bash in the Project Folder

1. Open the project folder in File Explorer.
2. Right-click inside the empty area of the folder.
3. Click **Open Git Bash here**.
4. A terminal window opens.

Check you are in the correct folder:

```bash
ls
```

You should see:

```text
apps
packages
database
package.json
setup.sh
```

## 4. Run the Setup Script

In Git Bash, run:

```bash
bash setup.sh
```

The script will:

- Check Git, Node.js, npm, and GitHub CLI.
- Run `npm install`.
- Ask you for environment variables.
- Create `.env`.
- Ask for your Git commit name and email if Git has not been configured yet.
- Create the local Git commit.
- Create/push GitHub repo `petvilla-ipoh/pet-villa`.

## 5. How to Fill Each `.env` Value

### `CORS_ORIGIN`

Use local web first:

```text
http://localhost:3000,https://YOUR_VERCEL_DOMAIN.vercel.app
```

After Vercel gives you a real domain, replace `YOUR_VERCEL_DOMAIN`.

### `DATABASE_URL`

1. Go to `https://supabase.com`.
2. Open your project.
3. Click **Connect** or **Project Settings > Database**.
4. Copy the PostgreSQL connection string.
5. Replace the password placeholder with your database password.
6. Paste it when the script asks for `Supabase DATABASE_URL`.

For Render production, prefer the pooled connection string.

### `SUPABASE_ANON_KEY`

1. Supabase Dashboard.
2. Open **Project Settings**.
3. Click **API**.
4. Copy the `anon` public key.
5. Paste it when the script asks for `Supabase Anon Key`.

### `REDIS_URL`

For local setup, keep:

```text
redis://localhost:6379
```

For production, use the Redis URL from Render Redis, Upstash, or another Redis provider.

### `STRIPE_SECRET_KEY`

1. Go to `https://dashboard.stripe.com`.
2. Click **Developers**.
3. Click **API keys**.
4. Copy the secret key beginning with `sk_test_`.
5. Paste it when asked.

Use test keys first.

### `STRIPE_PUBLISHABLE_KEY`

1. Stripe Dashboard.
2. Click **Developers > API keys**.
3. Copy the publishable key beginning with `pk_test_`.
4. Paste it when asked.

### `STRIPE_WEBHOOK_SECRET`

If you have not deployed Render yet, keep:

```text
whsec_replace_after_webhook_setup
```

After Render gives you an API URL:

1. Stripe Dashboard.
2. Click **Developers > Webhooks**.
3. Click **Add endpoint**.
4. Endpoint URL:

```text
https://YOUR_RENDER_API_DOMAIN/api/v1/payments/stripe/webhook
```

5. Select event `payment_intent.succeeded`.
6. Save.
7. Copy the signing secret beginning with `whsec_`.
8. Replace the placeholder in `.env` and in Render environment variables.

### `FIREBASE_SERVICE_ACCOUNT`

The setup script can read your Firebase JSON file.

1. Go to Firebase Console.
2. Open your project.
3. Click the gear icon.
4. Click **Project settings**.
5. Click **Service accounts**.
6. Click **Generate new private key**.
7. Download the JSON file.
8. When the script asks for the JSON file path, paste the full path.

Example Windows path in Git Bash:

```text
/c/Users/YOUR_NAME/Downloads/firebase-service-account.json
```

If you skip this during setup, open `.env` later and replace:

```text
FIREBASE_SERVICE_ACCOUNT='PASTE_FIREBASE_SERVICE_ACCOUNT_JSON_HERE'
```

### `EXPO_PUBLIC_API_URL`

For local development:

```text
http://localhost:4000/api/v1
```

For production:

```text
https://YOUR_RENDER_API_DOMAIN/api/v1
```

### `NEXT_PUBLIC_API_URL`

For local web:

```text
http://localhost:4000/api/v1
```

For Vercel:

```text
https://YOUR_RENDER_API_DOMAIN/api/v1
```

## 6. GitHub Login During Setup

When the script runs `gh auth login`:

1. Choose **GitHub.com**.
2. Choose **HTTPS**.
3. Choose **Login with a web browser**.
4. Copy the one-time code shown in Git Bash.
5. Press Enter.
6. Your browser opens.
7. Paste the code.
8. Click **Authorize GitHub CLI**.
9. Return to Git Bash.

The script will then create and push:

```text
https://github.com/petvilla-ipoh/pet-villa
```

## 7. Run Supabase Migrations

1. Open `https://supabase.com`.
2. Open your project.
3. Click **SQL Editor** in the left sidebar.
4. Click **New query**.
5. Open this project file:

```text
database/migrations/202605270001_create_pet_villa_core.sql
```

6. Copy the entire file content.
7. Paste it into Supabase SQL Editor.
8. Click **Run**.
9. Wait for success.
10. Click **New query** again.
11. Open this project file:

```text
database/migrations/202605270002_add_host_availability_blocks.sql
```

12. Copy the entire file content.
13. Paste it into Supabase SQL Editor.
14. Click **Run**.

For development demo data only:

1. Click **New query**.
2. Open:

```text
database/seeds/dev_seed.sql
```

3. Copy and run it.

Do not run seed data in production unless you intentionally want fake records.

## 8. Confirm the Database Tables

In Supabase:

1. Click **Table Editor**.
2. Confirm these tables exist:

```text
users
hosts
pets
bookings
booking_status_events
reviews
messages
diary_entries
notifications
payments
host_availability_blocks
```

## 9. Start Local Development

Open Git Bash in the project folder.

Start API:

```bash
npm run dev --workspace @pet-villa/api
```

Open another Git Bash window in the same folder.

Start web:

```bash
npm run dev --workspace @pet-villa/web
```

Open:

```text
http://localhost:3000
```
