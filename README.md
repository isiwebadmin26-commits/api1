# Daily Report API Architecture

A secure, modular, serverless reporting and analytics API deployed on Vercel for ISI Security.

---

## 🏛️ Architecture Overview

```
WEB APPLICATION / CLIENT / JIRA
               │
               ▼
       /controller  OR  /reports/*  OR  /api/reports/* (legacy)
               │
               ▼
      [ Security Middleware ]
      • CORS Verification
      • HTTP Method Validation
      • Token / API Key Authentication
      • Serverless Rate Limiter (Sliding Window)
      • Request Sanitization & Redacted Logging
               │
               ▼
      [ Controller Dispatcher ]
      • Code lookup (DRL, DRT, DRS, DRPF, WRT, WCA, MRT, MCA, CAR, etc.)
      • Route invocation
               │
               ▼
      [ Domain Services ]
      • DailyService (leads, traffic, stats, pending-followup)
      • WeeklyService (traffic, career-applications)
      • MonthlyService (traffic, career-applications)
      • CareerService (resume attachments & applicant digests)
               │
               ▼
      [ External Integrations ]
      • Google Sheets API v4
      • Google Drive API v3
      • SMTP / Nodemailer
      • Jira Automations
```

---

## 📋 API Endpoints Table

| API Route | Purpose | HTTP Method | Authentication | Controller Code |
|---|---|---|---|---|
| `/reports/daily/leads` | Daily lead generation report | `GET`, `POST` | Required | `DRL` |
| `/reports/daily/traffic` | Daily website traffic & hourly trend | `GET`, `POST` | Required | `DRT` |
| `/reports/daily/stats` | Daily executive KPIs, comparison & conversion | `GET`, `POST` | Required | `DRS` |
| `/reports/daily/pending-followup` | Daily pending leads requiring follow-up | `GET`, `POST` | Required | `DRPF` |
| `/reports/weekly/traffic` | Weekly traffic comparison vs prior 7 days | `GET`, `POST` | Required | `WRT` |
| `/reports/weekly/career-applications` | Weekly candidate applications submitted | `GET`, `POST` | Required | `WCA` |
| `/reports/monthly/traffic` | Monthly 30-day traffic breakdown | `GET`, `POST` | Required | `MRT` |
| `/reports/monthly/career-applications` | Monthly talent applications breakdown | `GET`, `POST` | Required | `MCA` |
| `/reports/career` | Monthly career resumes digest pipeline | `POST`, `GET` | Required | `CAR` |
| `/controller` | Centralized router & controller entry point | `GET`, `POST` | Required | `N/A` |
| `/security` | Security diagnostic & rate limit inspector | `GET`, `POST` | Public/Auth | `N/A` |
| `/health` | Service uptime and health check | `GET`, `HEAD` | Public | `N/A` |

---

## 🔄 Backward Compatibility (Jira Automations)

The following legacy endpoints are preserved and internally routed through the controller and security layer. Existing Jira Automation rules will continue to work without any modifications:

| Legacy Route | Target Handler / Service | Jira Rule |
|---|---|---|
| `/api/reports/daily` | `DailyExecutiveReport` (`DR`) | Daily Report Trigger |
| `/api/reports/weekly` | `WeeklyExecutiveReport` (`WR`) | Weekly Report Trigger |
| `/api/reports/monthly` | `MonthlyExecutiveReport` (`MR`) | Monthly Report Trigger |
| `/api/reports/career` | `MonthlyCareerDigest` (`CAR`) | Monthly Career Digest Trigger |

---

## 🛡️ Security & Authentication

All protected endpoints require authentication using one of:
1. `Authorization: Bearer <CRON_SECRET>`
2. `x-api-key: <CRON_SECRET>`
3. Query param: `?apiKey=<CRON_SECRET>`

Rate limiting is applied at **60 requests/minute** per IP by default (configurable via `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_SECONDS`).

---

## 🧪 Testing

Run the test suite locally:

```bash
npm test
```

Run TypeScript compilation check:

```bash
npm run build
```

---

## 🚀 Local Development & Deployment

Run locally with Vercel CLI:

```bash
npx vercel dev
```

Deploy to production:

```bash
npx vercel --prod
```
