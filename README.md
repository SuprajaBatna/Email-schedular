# ReachInbox Email Scheduler 🚀

A production-ready, full-stack distributed email scheduling application built for high throughput, reliable queue management, per-sender rate limiting, multi-sender Ethereal SMTP dispatches, real-time Slack alerts, Elasticsearch full-text search, and interactive Next.js dashboard.

---

## 📋 Complete Feature Checklist

| Phase | Feature | Status | Description |
|---|---|---|---|
| **Phase 0** | Monorepo Setup & Architecture | ✅ Completed | Clean `/backend`, `/frontend`, `docker-compose.yml`, `ARCHITECTURE.md` |
| **Phase 1** | Database Foundation | ✅ Completed | PostgreSQL + Prisma schema (`User`, `Sender`, `Email`, `SlackIntegration`) + migrations & seed data |
| **Phase 2** | BullMQ Scheduling Core | ✅ Completed | Redis-backed BullMQ `email-queue` with delayed job scheduling using PostgreSQL Email ID as BullMQ `jobId` |
| **Phase 3** | Ethereal SMTP Multi-Sender Delivery | ✅ Completed | Nodemailer SMTP engine supporting dynamic multi-sender credential selection & Ethereal preview links |
| **Phase 4** | Concurrency & Minimum Send Delay | ✅ Completed | `WORKER_CONCURRENCY=5` and `MIN_DELAY_MS=2000` enforced globally via Redis-backed rate limiting |
| **Phase 5** | Per-Sender Hourly Rate Limiting | ✅ Completed | Atomic Redis counters keyed by `senderId:YYYY-MM-DD-HH` (`MAX_EMAILS_PER_HOUR_PER_SENDER=50`), auto-rescheduling to next hour on limit reach |
| **Phase A** | Slack Alerts, Elasticsearch & Bull Board | ✅ Completed | Real Slack OAuth connect & webhooks, Elasticsearch full-text index & search API (`GET /api/emails/search?q=`), Bull Board queue UI (`/admin/queues`) |
| **Phase B** | NextAuth Google OAuth & Dashboard | ✅ Completed | Google OAuth 2.0 & Demo Login, session persistence, responsive Tailwind UI, CSV upload with PapaParse, staggered dispatches |
| **Phase C** | Frontend Quality & Refinement | ✅ Completed | Input validations, typed props/API responses, SWR 3s live polling, status badges, failReason tooltips, error/success toasts |
| **Phase D** | Dockerization & Production Documentation | ✅ Completed | Full dockerization (Postgres, Redis, Elasticsearch, Backend, Frontend), health checks, startup dependencies, comprehensive README |

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Dark Mode Glassmorphic UI)
- **Data Fetching**: SWR (Near-live polling & cache revalidation)
- **Authentication**: NextAuth.js (Google OAuth 2.0 & Developer Demo Account)
- **CSV Parsing**: PapaParse
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js & Express.js (TypeScript)
- **Database**: PostgreSQL 16 with Prisma ORM
- **Queue & In-Memory Store**: BullMQ & Redis 7
- **Email Delivery Engine**: Nodemailer with Ethereal Test SMTP
- **Search Engine**: Elasticsearch 8.11
- **Queue Dashboard**: Bull Board (`@bull-board/express`)
- **Integrations**: Slack OAuth 2.0 & Incoming Webhooks

### Infrastructure & Containerization
- **Containerization**: Docker & Docker Compose with health checks (`pg_isready`, `redis-cli ping`, `elasticsearch cluster health`)

---

## ⚙️ Environment Variables

### Backend (`/backend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for Express API server |
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5433/reachinbox?schema=public` | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `WORKER_CONCURRENCY` | `5` | Maximum concurrent email jobs processed per worker instance |
| `MIN_DELAY_MS` | `2000` | Minimum send delay (ms) between email dispatches |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `50` | Maximum allowed emails sent per sender within a UTC hour |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch node cluster endpoint |
| `SLACK_CLIENT_ID` | `mock_slack_client_id` | Slack OAuth App Client ID |
| `SLACK_CLIENT_SECRET` | `mock_slack_client_secret` | Slack OAuth App Client Secret |
| `SLACK_WEBHOOK_URL` | `""` | Optional fallback Slack Incoming Webhook URL for rate limit alerts |

### Frontend (`/frontend/.env.local`)

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `3000` | Port for Next.js web application |
| `NEXTAUTH_URL` | `http://localhost:3000` | Base URL for NextAuth.js callback redirections |
| `NEXTAUTH_SECRET` | `reachinbox_nextauth_secret_phase_b_2026` | Secret key for JWT session encryption |
| `GOOGLE_CLIENT_ID` | `mock_google_client_id` | Google OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | `mock_google_client_secret` | Google OAuth 2.0 Web Client Secret |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:5000` | Backend API base URL for client dispatches |

---

## 🚀 Quick Start Guide

### Option A: Docker Compose (Recommended - Single Command)

To build and start the entire stack (PostgreSQL, Redis, Elasticsearch, Backend, Frontend) with verified health checks and startup dependencies:

```bash
docker-compose up --build
```

Access the application:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **Bull Board Queue Admin**: `http://localhost:5000/admin/queues`
- **Elasticsearch Cluster**: `http://localhost:9200`

---

### Option B: Local Development Setup

#### 1. Prerequisites
- Node.js v18+
- Docker & Docker Compose (for database/redis/elasticsearch containers)

#### 2. Install Monorepo Dependencies
```bash
npm run install:all
```

#### 3. Environment Configuration
Copy sample environment files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

#### 4. Start Local Infrastructure Containers
```bash
docker-compose up -d postgres redis elasticsearch
```

#### 5. Initialize Database Schema & Seed Data
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

#### 6. Start Backend & Frontend Dev Servers
In Terminal 1 (Backend):
```bash
npm run dev:backend
```

In Terminal 2 (Frontend):
```bash
npm run dev:frontend
```

---

## 🏗️ Architecture & Core System Design

### 1. Scheduling & Restart Persistence
- **PostgreSQL 1:1 Identity**: Every email schedule request creates a PostgreSQL `Email` record in status `pending`.
- **BullMQ Delayed Queue**: The `email-queue` enqueues a delayed job using the PostgreSQL `Email.id` as the strict BullMQ `jobId`.
- **Process Restart Safety**: If worker instances or server nodes crash, jobs persist in Redis. Upon startup, BullMQ resumes queued jobs seamlessly without lost or duplicate dispatches.

### 2. Multi-Sender Ethereal SMTP Engine
- Senders are loaded from PostgreSQL (`Sender` model).
- The worker dynamically selects SMTP credentials (`etherealEmail`, `etherealPass`) based on the `Email -> Sender` relation.
- Emails are delivered via Nodemailer SMTP, and Ethereal message preview URLs are automatically logged.

### 3. Concurrency & Minimum Send Delay
- **Worker Concurrency**: Set via `WORKER_CONCURRENCY=5`. Controls parallel job execution.
- **Minimum Send Delay**: Set via `MIN_DELAY_MS=2000`. Enforced globally across worker processes using Redis-backed rate limiting (`limiter: { max: 1, duration: 2000 }`), preventing local node timer drift.

### 4. Per-Sender Hourly Rate Limiting & Auto-Rescheduling
- **Redis Atomic Counter**: Keyed by `ratelimit:sender:<senderId>:<YYYY-MM-DD-HH>`.
- **Hourly Cap**: Configured via `MAX_EMAILS_PER_HOUR_PER_SENDER=50`.
- **Deterministic Rescheduling**: When the limit is reached, jobs are **NOT** failed or dropped. They are automatically rescheduled in BullMQ to the start of the next UTC hour (`delay = nextHourStart - now + index * MIN_DELAY_MS`).
- **Retry Preservation**: Rate-limit rescheduling does not consume Nodemailer/SMTP retry attempts.

### 5. Real-Time Slack Alerts & Webhooks
- Users can link their Slack workspace via `/api/slack/connect`.
- When per-sender rate limits trigger rescheduling, a Slack notification is automatically sent via webhook to inform campaign administrators.

### 6. Elasticsearch Full-Text Search
- Automatically indexes emails into the `emails` Elasticsearch index upon creation and status changes (`pending` -> `processing` -> `sent` / `failed`).
- Frontend search bar uses `GET /api/emails/search?q=...` to query subject, body, and recipient fields with PostgreSQL fallback.

### 7. Bull Board Admin Dashboard
- Live queue monitoring accessible at `http://localhost:5000/admin/queues`.
- Displays real-time statistics for waiting, active, delayed, completed, and failed jobs with retry and trigger options.

---

## 💻 Frontend Dashboard Features (Phases B & C)

- **Authentication**: Google OAuth 2.0 with instant Demo Account login fallback (`test@example.com`).
- **Navbar & Navigation**: Display user avatar, name, email, Slack connect status indicator, direct link to Bull Board, and Logout action.
- **Compose Modal**:
  - Drag-and-drop CSV parser or raw text email input.
  - Live detected email counter badge.
  - Controls for start time, delay between sends (seconds), and hourly send limit.
  - Validations for required fields, email formatting, and future start timestamps.
  - Staggered recipient dispatching to `POST /api/emails/schedule`.
- **Scheduled & Sent Email Tables**:
  - Reusable typed components.
  - Tabbed switching between Scheduled (`pending`/`processing`) and Sent (`sent`/`failed`).
  - Hoverable tooltips displaying `failReason` for failed dispatches.
  - SWR 3-second live polling for automatic status updates.
  - Interactive search bar filtering dispatches in real time via Elasticsearch.

---

## 📝 Assumptions, Shortcuts & Trade-offs

1. **Ethereal Test SMTP**: Used for email delivery testing without sending real spam. Production deployments can replace transporter credentials with Amazon SES, SendGrid, or Resend.
2. **Single-Node Elasticsearch**: Standard single-node deployment configuration (`discovery.type=single-node`) used in Docker Compose for minimal memory overhead (`ES_JAVA_OPTS=-Xms512m -Xmx512m`).
3. **Demo Auth Fallback**: Added instant Developer Demo Account login alongside Google OAuth 2.0 so reviewers can evaluate dashboard features without setting up Google Cloud Console client credentials.

---

## 📄 License & Monorepo Structure

- `/backend`: Express API, Prisma Schema, BullMQ Worker, Nodemailer Transporters, Elasticsearch Service.
- `/frontend`: Next.js App Router, Tailwind CSS, SWR Hooks, NextAuth Provider, PapaParse CSV Loader.
- `docker-compose.yml`: Stack orchestration with health checks.
- `ARCHITECTURE.md`: Technical architecture diagram & data flow specification.
- `LOAD-BEHAVIOR.md`: High-volume (1000+ emails) load analysis & ordering behavior.
