# ReachInbox Email Scheduler - Load & Concurrency Behavior Specification

This document details the system behavior, ordering guarantees, distributed safety, and restart persistence under heavy load (e.g., 1,000+ simultaneous email scheduling requests).

---

## 1. Simultaneous Load Behavior (1,000+ Emails)

When 1,000+ emails are scheduled simultaneously via the API (`POST /api/emails/schedule`):

1. **Database Persistence**: Each request creates a PostgreSQL `Email` record in `pending` status.
2. **BullMQ Queueing**: For each record, a delayed job is enqueued in Redis `email-queue` with `jobId = Email.id`. BullMQ stores delayed jobs in Redis sorted sets (`bull:email-queue:delayed`) ordered by target execution timestamp.
3. **Throttled Dispatch**: Workers process jobs at a rate bounded by:
   - **Worker Concurrency** (`WORKER_CONCURRENCY`, default `5`): Maximum parallel jobs being processed by a worker process.
   - **Minimum Send Delay** (`MIN_DELAY_MS`, default `2000` ms): Distributed minimum delay between outgoing email transmissions across worker processes.
4. **Hourly Rate Limit Rollover**: For any given sender, the first `MAX_EMAILS_PER_HOUR_PER_SENDER` (default `50`) emails in the current UTC hour are dispatched via SMTP. The 51st through 1,000th emails for that sender trigger rate-limit rollover and are automatically rescheduled to the start of the next UTC hour.

---

## 2. FIFO Email Ordering Guarantees

Email sequence order is strictly preserved:

1. **Queue Priority**: BullMQ evaluates delayed jobs using Redis sorted sets indexed by `scheduledAt` timestamp and insertion sequence.
2. **Deterministic Overflow Offsets**: When an email exceeds the sender's hourly limit, its new schedule time is computed deterministically:
   $$\text{RescheduledTime} = \text{NextUTCHourStart} + (\text{OverflowIndex} \times \text{MIN\_DELAY\_MS})$$
   - Email #51 is scheduled for $\text{NextUTCHourStart} + 0\text{ ms}$
   - Email #52 is scheduled for $\text{NextUTCHourStart} + 2000\text{ ms}$
   - Email #53 is scheduled for $\text{NextUTCHourStart} + 4000\text{ ms}$
3. **Sequence Preservation**: When the next UTC hour begins, the rescheduled emails execute in the exact order they were originally queued.

---

## 3. Multiple-Sender Isolation

Hourly rate limiting is strictly isolated per sender:

- **Key Pattern**: `rate-limit:sender:<senderId>:<YYYY-MM-DD-HH>` (in UTC).
- **Isolation Mechanism**:
  - `Sender A` tracks usage under `rate-limit:sender:SenderA:2026-09-24-15`.
  - `Sender B` tracks usage under `rate-limit:sender:SenderB:2026-09-24-15`.
- **Impact**: If `Sender A` exhausts its 50 emails/hour allocation, `Sender B` is completely unaffected and continues sending up to its own 50 emails/hour limit.

---

## 4. Atomic Redis Counter Implementation

- **Atomic Primitives**: Counters use Redis `INCR` commands executed via `ioredis`.
- **Thread Safety**: Redis single-threaded command execution guarantees atomicity across multiple concurrent worker nodes/containers without mutexes or in-memory locks.
- **Memory Hygiene**: On the first `INCR` call for a new hourly bucket (`currentCount === 1`), a 2-hour Time-To-Live (`EXPIRE 7200`) is attached, ensuring old rate-limiting keys are automatically purged by Redis.

---

## 5. Process & Worker Restart Persistence

- **Zero Data Loss**: Delayed jobs, queue states, and hourly rate limit counters reside in Redis named volumes (`redis_data`).
- **Automatic Recovery**: If worker processes or the entire backend application crash or restart:
  - Pending/delayed jobs in Redis remain intact.
  - Active hourly counters in Redis remain intact.
  - When worker processes restart, BullMQ automatically resumes monitoring `email-queue` and picks up delayed jobs as their target execution time arrives.
  - No manual re-enqueue scripts or database scans are required.
