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
	- Framework preset: Vite
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
