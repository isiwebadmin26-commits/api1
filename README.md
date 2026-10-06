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

## 📋 Email Frequency & Deduplication Policy

The system enforces strict scheduling policies and automatic deduplication:

1. **Daily (Strictly 2 Emails Per Day)**:
   - **Daily Traffic Analysis** (`DRT` / `/reports/daily/traffic`): Sent daily at 07:30 AM IST (02:00 UTC).
   - **Daily Leads Summary** (`DRL` / `/reports/daily/leads`): Sent daily at 07:35 AM IST (02:05 UTC).
   - If `/reports/daily` (code `DEX`) is called, it orchestrates exactly these 2 reports and dispatches no redundant third executive email.
   - Non-essential daily micro-reports (`DRS`, `DPF`) do not send emails automatically unless `sendEmail=true` is explicitly requested.

2. **Weekly (Weekly Once)**:
   - **Weekly Executive Brief** (`WEX` / `/reports/weekly`): Sent once a week on Monday at 07:45 AM IST (02:15 UTC).
   - Built-in deduplication prevents accidental duplicate sends during the same ISO calendar week.

3. **Monthly (Monthly Once)**:
   - **Monthly Executive Brief** (`MEX` / `/reports/monthly`): Sent once a month on the 1st at 08:00 AM IST (02:30 UTC).
   - Built-in deduplication prevents accidental duplicate sends during the same calendar month.

4. **Zero Duplicate Emails**:
   - **Recipient Deduplication**: All recipient lists are sanitized, trimmed, converted to lowercase, and deduplicated using Sets so nobody receives duplicate emails.
   - **Idempotency Guard**: Re-triggering a report on the same calendar period is safely intercepted (`duplicateSkipped: true`). Manual overrides can be forced using `{ "force": true }` or `?force=true`.

---

## 📋 API Endpoints Table

| API Route | Purpose | HTTP Method | Frequency | Controller Code |
|---|---|---|---|---|
| `/reports/daily/traffic` | Daily traffic analysis & trend email | `GET`, `POST` | Daily (1/day) | `DRT` |
| `/reports/daily/leads` | Daily lead generation report email | `GET`, `POST` | Daily (1/day) | `DRL` |
| `/reports/daily` | Orchestrates the 2 daily reports above | `GET`, `POST` | Daily | `DEX` |
| `/reports/weekly` | Weekly executive brief email | `GET`, `POST` | Weekly once | `WEX` |
| `/reports/monthly` | Monthly executive brief email | `GET`, `POST` | Monthly once | `MEX` |
| `/reports/career` | Monthly career resumes digest pipeline | `POST`, `GET` | Monthly once | `CAR` |
| `/reports/daily/stats` | Daily KPIs & conversion (data endpoint) | `GET`, `POST` | On demand | `DRS` |
| `/reports/daily/pending-followup` | Pending follow-ups (data endpoint) | `GET`, `POST` | On demand | `DRPF` |
| `/reports/weekly/traffic` | 7-day traffic comparison (data endpoint) | `GET`, `POST` | On demand | `WRT` |
| `/reports/weekly/career-applications` | Weekly applications (data endpoint) | `GET`, `POST` | On demand | `WCA` |
| `/reports/monthly/traffic` | 30-day traffic breakdown (data endpoint) | `GET`, `POST` | On demand | `MRT` |
| `/reports/monthly/career-applications` | Monthly applications (data endpoint) | `GET`, `POST` | On demand | `MCA` |
| `/controller` | Centralized router & controller entry point | `GET`, `POST` | Any | `N/A` |
| `/security` | Security diagnostic & rate limit inspector | `GET`, `POST` | Public/Auth | `N/A` |
| `/health` | Service uptime and health check | `GET`, `HEAD` | Public | `N/A` |

---

## 🔄 Jira Automations & Backward Compatibility

- **Active Jira Instance & Project Board**: [isiwebadmin26 DLF Project Board](https://isiwebadmin26.atlassian.net/jira/core/projects/DLF/board?filter=&groupBy=none)
- **Project Key**: `DLF`
- **Automation Trigger Target**: `https://daily-report-api-tan.vercel.app/controller` (or legacy `/api/reports/*`)

### Active Jira Automation Rules (5 Rules on isiwebadmin26 DLF Board):
- **Daily Triggers (Exactly 2 emails / 2 triggers daily)**:
  - `REPORT_Daily_Traffic`: Daily at 08:10 IST -> POST `/reports/daily/traffic` (`DRT`)
  - `REPORT_Daily_Leads`: Daily at 08:05 IST -> POST `/reports/daily/leads` (`DRL`)
- **Weekly Trigger (Exactly 1 email / 1 trigger weekly)**:
  - `REPORT_Weekly_Executive_Email`: Mondays at 07:30 IST -> POST `/reports/weekly` (`WEX`)
- **Monthly Triggers (Exactly 2 emails / 2 triggers monthly on 1st)**:
  - `REPORT_Monthly_Executive_Email`: 1st of month at 08:00 IST -> POST `/reports/monthly` (`MEX`)
  - `REPORT_Career`: 1st of month at 08:30 IST -> POST `/reports/career` (`CAR`)

*Note: All redundant rules on `isiwebadmin26` and all duplicate rules on the legacy account `praveenkumarraram.atlassian.net` have been disabled.*

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
