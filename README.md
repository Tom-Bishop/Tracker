# Budget Tracker Dashboard

A Vite + React web app for tracking income, expenses, and category budgets with a dashboard view.

## Local Development

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build production output:

```bash
npm run build
```

## Host On Cloudflare Pages

### Option 1: Git-Connected Deployment (Recommended)

1. Push this project to GitHub.
2. In Cloudflare Dashboard, go to Workers & Pages > Create > Pages > Connect to Git.
3. Select the repository.
4. Use these build settings:
	- Framework preset: React (Vite)
	- Build command: npm run build
	- Build output directory: dist
5. Deploy.

This enables automatic deployments for each push.

### Option 2: Wrangler CLI Deployment

1. Authenticate:

```bash
npm run cf:login
```

2. First deploy (create/select project when prompted):

```bash
npm run cf:deploy
```

3. Production branch style deploy:

```bash
npm run cf:deploy:prod
```

## Notes

- The file public/_redirects is included for SPA-style route fallback support.
- Wrangler config lives in wrangler.toml.

## Add Private Accounts With Cloudflare D1

This project includes Cloudflare Pages Functions in functions/api for:

- Account registration and login
- Secure session cookies
- Per-user transaction storage in D1

### 1. Create a D1 database

```bash
wrangler d1 create tracker-db
```

Copy the returned database_id.

### 2. Add a D1 binding

In Cloudflare Pages project settings:

- Go to Settings > Functions > D1 bindings
- Add binding name: DB
- Select your D1 database

For local wrangler workflows, also add the binding to wrangler.toml:

```toml
[[d1_databases]]
binding = "DB"
database_name = "tracker-db"
database_id = "YOUR_DATABASE_ID"
```

### 3. Run database migration

```bash
wrangler d1 execute tracker-db --remote --file=./migrations/0001_init.sql
```

### 4. Add session secret

In Cloudflare Pages project settings:

- Go to Settings > Environment variables
- Add secret: SESSION_SECRET
- Use a long random value (at least 32 chars)

After adding bindings/secrets, redeploy the site.
