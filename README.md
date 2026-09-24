# Daily Report API

Standalone Vercel Function. No cron is included.

## Run locally

1. Copy `.env.local.example` to `.env.local`.
2. Fill the environment variables.
3. Run:

```bash
npm install
npx vercel dev
```

Endpoint:

`http://localhost:3000/api/reports/daily`

Dry run:

```bash
curl -X POST "http://localhost:3000/api/reports/daily?dryRun=true" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Real run:

```bash
curl -X POST "http://localhost:3000/api/reports/daily" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Deploy

```bash
npx vercel login
npx vercel
npx vercel --prod
```

Add the environment variables in Vercel Project Settings before testing production.

IMPORTANT: This ZIP contains a standalone, runnable Vercel API starter. The exact Apps Script aggregation/build functions must still be migrated into `lib/daily-report.ts` before treating the result as the production Daily Report.
