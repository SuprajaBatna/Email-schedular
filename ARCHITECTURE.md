# ReachInbox Email Scheduler - Architecture Specification

> **Note:** This document describes the **FINAL** architecture for the ReachInbox Email Scheduler system. 
> All phases (**Phase 0 through Phase D**) have been fully implemented, integrated, containerized, and verified.

---

## 1. System Architecture Diagram

```
Frontend (Next.js 14 App Router + Tailwind CSS + SWR + NextAuth.js)
    │
    ▼
Express API Backend (Node.js + Express + TypeScript)
    │
    ├──────────────────────────┬──────────────────────────┐
    ▼                          ▼                          ▼
PostgreSQL (16)           BullMQ Queue               Elasticsearch (8.11)
(Data Source of Truth)   (Job Dispatcher)           (Full-Text Index & Search)
                               │                          │
                               ▼                          ▼
                           Redis (7)                 Bull Board UI
                        (Queue State &               (/admin/queues)
                         Rate Limiting)
                               │
                               ▼
                          Email Worker
                        (BullMQ Consumer Process)
                               │
                               ├──────────────────────────┐
                               ▼                          ▼
                          Ethereal SMTP             Slack Webhooks
                       (Multi-Sender Engine)       (Rate Limit Alerts)
```

---

## 2. Supporting Integrations & Systems

* **Elasticsearch**: Full-text indexing and instant search across sent/scheduled email payloads and metadata via `GET /api/emails/search?q=...`.
* **Bull Board**: Interactive admin UI at `/admin/queues` mounted on Express API for real-time queue visibility, job monitoring, retries, and failure diagnostics.
* **Slack Integration (OAuth & Webhooks)**: Triggers real-time alert notifications to configured Slack channels when per-sender hourly rate limits are reached and jobs are rescheduled.
* **Google OAuth & NextAuth.js**: Authentication mechanism with Google provider support and instant Developer Demo Account fallback.

---

## 3. Component Responsibilities

| Component | Technology | Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14, React, Tailwind CSS | Dashboard UI, compose email modal, CSV lead parser, scheduling controls, SWR live tables, and NextAuth. |
| **Express API** | Express.js, TypeScript | Serves REST endpoints, validates scheduling requests, persists records to DB, enqueues BullMQ jobs, handles OAuth callbacks. |
| **PostgreSQL** | PostgreSQL 16, Prisma ORM | Primary persistent store for user profiles, OAuth tokens, email jobs, schedules, sender accounts, and delivery logs. |
| **BullMQ** | BullMQ | Job queue library responsible for delayed/scheduled jobs, retry handling, and concurrency management. |
| **Redis** | Redis 7 | In-memory data store providing backend queue state management for BullMQ and distributed rate-limiting counters. |
| **Email Worker** | Node.js, BullMQ Worker | Background consumer process that picks up scheduled jobs, enforces rate limits per sender, and triggers SMTP execution. |
| **Ethereal SMTP** | Ethereal Email | Test SMTP provider used for mock email transmission, verification, and inbox rendering without hitting real recipients. |
| **Elasticsearch** | Elasticsearch 8.11 | Provides indexing and fast full-text searching over email bodies, subjects, and recipient histories. |
| **Bull Board** | `@bull-board/express` | Admin queue interface for inspecting waiting, active, delayed, failed, and completed email jobs. |

---

## 4. Key Architectural Constraints & Guarantees

1. **BullMQ + Redis Scheduling**: All email scheduling uses BullMQ backed by Redis for precise execution timing.
2. **No In-Memory / Simple Cron**: OS cron, `node-cron`, and `Agenda` are explicitly prohibited to prevent single-node lock-in and timer drift.
3. **PostgreSQL as Source of Truth**: All domain entities (users, schedules, email states) reside permanently in PostgreSQL.
4. **Redis for Queue & Rate-Limiting**: Redis manages transient queue states and distributed rate limiting per sender (`MAX_EMAILS_PER_HOUR_PER_SENDER=50`).
5. **Job Persistence & Resiliency**: Email jobs in BullMQ + Redis survive worker and backend application restarts without losing pending jobs.
6. **Idempotent Sending**: Email sending logic uses PostgreSQL Email ID as BullMQ `jobId` to enforce strict 1:1 identity and prevent duplicates.
7. **Multi-Sender Distribution**: The worker engine dynamically loads sender credentials (`Sender` model) and dispatches via Nodemailer.
8. **Searchable Email Store**: Elasticsearch indexes email metadata and text content for fast search operations.
9. **Real OAuth Flows**: Slack and Google integrations utilize real OAuth 2.0 protocol flows.

---

## 5. Worker Concurrency & Rate Limiting Mechanics

* **Worker Concurrency**: Configurable via `WORKER_CONCURRENCY` (default: `5`). Controls how many email jobs can be processed concurrently by a single worker instance.
* **Minimum Send Delay**: Configurable via `MIN_DELAY_MS` (default: `2000` ms). Enforces a minimum interval between outgoing email dispatches to comply with SMTP rate limits.
* **Per-Sender Hourly Rate Limiting**: Enforced via atomic Redis counters keyed by `senderId:YYYY-MM-DD-HH` (`MAX_EMAILS_PER_HOUR_PER_SENDER=50`). When exceeded, jobs are deterministically rescheduled to the next UTC hour without consuming SMTP retry attempts.

---

## 6. Implementation Status

* **Status**: **Phase D Complete — Fully Integrated, Containerized & Production Ready**
* **Implemented**:
  * Monorepo foundation (`/backend`, `/frontend`)
  * Express API with `/health`, `POST /api/emails/schedule`, `GET /api/emails`, `GET /api/senders`, `GET /api/emails/search`
  * Next.js 14 + Tailwind CSS + SWR + NextAuth.js frontend
  * PostgreSQL + Prisma schema (`User`, `Sender`, `Email`, `SlackIntegration`) & migrations/seeds
  * BullMQ delayed email queue (`email-queue`) backed by Redis
  * Multi-sender Nodemailer Ethereal SMTP worker execution with exponential backoff retries (5 attempts)
  * Distributed Redis-backed rate limiting (`MIN_DELAY_MS=2000`, `MAX_EMAILS_PER_HOUR_PER_SENDER=50`) and worker concurrency (`WORKER_CONCURRENCY=5`)
  * Real Slack OAuth & Webhook notifications
  * Elasticsearch 8.11 full-text indexing & search integration
  * Bull Board admin UI at `/admin/queues`
  * Full Docker Compose containerization with verified health checkslimiting (`MIN_DELAY_MS=2000`) and worker concurrency (`WORKER_CONCURRENCY=5`)

