# ReachInbox Free-Tier Deployment Guide

This guide provides complete instructions for deploying the **ReachInbox Email Scheduler** application using **Vercel** (for the Next.js frontend) and **Render** (for the Express backend API), with managed PostgreSQL and Redis instances.

---

## 🔑 Where to Get `postgrespassword` & Database Credentials

When connecting to a PostgreSQL database, the `DATABASE_URL` formatted string requires a username, password, host, port, and database name:
`postgresql://<username>:<postgrespassword>@<host>:<port>/<database_name>?schema=public`

Depending on where your PostgreSQL database is hosted, here is where you get `postgrespassword`:

1. **Render PostgreSQL (Free Tier)**:
   - Go to your [Render Dashboard](https://dashboard.render.com) → Click **New +** → Select **PostgreSQL**.
   - After creation, Render displays your **Internal Database URL** and **External Database URL**.
   - The password is embedded directly in the connection URI: `postgresql://username:PASSWORD@hostname/dbname`. You can copy the entire URI for `DATABASE_URL`.
2. **Neon.tech / Supabase / Railway / Aiven (Free Tier alternatives)**:
   - When creating a new Postgres project, the dashboard will display the generated password once.
   - Copy the provided connection string.
3. **Local Docker / Development**:
   - In `docker-compose.yml`, the default password is `postgrespassword` (`postgresql://postgres:postgrespassword@localhost:5433/reachinbox?schema=public`).

---

## 🛠️ Required Environment Variables

> ⚠️ **IMPORTANT**: Never commit `.env` or `.env.local` files containing real secrets to Git. Always configure these values directly in the deployment platform settings (Vercel Environment Variables & Render Environment Variables).

### 1. Frontend Environment Variables (Configure in Vercel)

| Variable Name | Required | Example / Recommended Value | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** | `https://reachinbox-backend.onrender.com` | Base URL of your deployed backend API on Render (no trailing slash). |
| `NEXTAUTH_URL` | **Yes** | `https://reachinbox-frontend.vercel.app` | Canonical URL of your deployed Vercel frontend. |
| `NEXTAUTH_SECRET` | **Yes** | `generate_random_secret_string_32_chars` | Secret key used by NextAuth to encrypt JWT session tokens. |
| `GOOGLE_CLIENT_ID` | Optional | `your-google-oauth-client-id.apps.googleusercontent.com` | Google OAuth Client ID for production login. |
| `GOOGLE_CLIENT_SECRET` | Optional | `your-google-oauth-client-secret` | Google OAuth Client Secret for production login. |

---

### 2. Backend Environment Variables (Configure in Render)

| Variable Name | Required | Example / Recommended Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | **Yes** | `5000` (or set automatically by Render) | Port for Express web server. |
| `NODE_ENV` | **Yes** | `production` | Node environment indicator. |
| `DATABASE_URL` | **Yes** | `postgresql://postgres:PASSWORD@dpg-xxx.render.com/reachinbox` | Connection string for PostgreSQL database. |
| `REDIS_URL` | **Yes** | `rediss://default:PASSWORD@xxx.upstash.io:6379` or `redis://...` | Redis connection URL for BullMQ job queue & rate limiter (supports `rediss://` TLS). |
| `FRONTEND_URL` | **Yes** | `https://reachinbox-frontend.vercel.app` | Deployed frontend origin allowed by backend CORS configuration. |
| `ALLOWED_ORIGINS` | Optional | `https://reachinbox-frontend.vercel.app,http://localhost:3000` | Comma-separated list of allowed CORS origins. |
| `BACKEND_URL` | Optional | `https://reachinbox-backend.onrender.com` | Deployed backend public URL (used for Slack OAuth redirects). |
| `ETHEREAL_USER` | Optional | `sender@ethereal.email` | Default Ethereal SMTP user for fallback. |
| `ETHEREAL_PASS` | Optional | `ethereal_pass` | Default Ethereal SMTP password. |
| `SLACK_CLIENT_ID` | Optional | `your_slack_client_id` | Slack app Client ID for rate limit alert webhook setup. |
| `SLACK_CLIENT_SECRET` | Optional | `your_slack_client_secret` | Slack app Client Secret. |
| `SLACK_REDIRECT_URI` | Optional | `https://reachinbox-backend.onrender.com/api/slack/callback` | OAuth callback endpoint. |
| `ELASTICSEARCH_URL` | Optional | `http://localhost:9200` | Optional Elasticsearch node URL (falls back gracefully to PostgreSQL if unreachable). |
| `WORKER_CONCURRENCY` | Optional | `5` | BullMQ worker concurrency count. |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Optional | `50` | Hourly rate limit per sender account. |
| `MIN_DELAY_MS` | Optional | `2000` | Minimum delay between email dispatches. |

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Deploy Database & Redis Infrastructure

1. **PostgreSQL Database**:
   - Create a free PostgreSQL instance on **Render**, **Neon.tech**, or **Supabase**.
   - Copy the database connection URI string for `DATABASE_URL`.
2. **Redis Cache / Queue**:
   - Create a free Redis instance on **Upstash Redis** (https://upstash.com) or **Render Redis**.
   - Upstash provides a free `rediss://` URL string compatible with BullMQ.

---

### Step 2: Deploy Backend to Render

1. Log into [Render.com](https://dashboard.render.com) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure service settings:
   - **Name**: `reachinbox-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node` (or `Docker`)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
4. In the **Environment Variables** section, add all required backend variables listed above (`DATABASE_URL`, `REDIS_URL`, `FRONTEND_URL`, `NODE_ENV=production`).
5. Click **Create Web Service**.

---

### Step 3: Deploy Frontend to Vercel

1. Log into [Vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Import your GitHub repository.
3. In Project Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: Edit and set to `frontend`
4. Expand **Environment Variables** and add:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://<your-render-backend-name>.onrender.com`
   - `NEXTAUTH_URL` = `https://<your-vercel-app-name>.vercel.app`
   - `NEXTAUTH_SECRET` = `<your_random_secret_string>`
5. Click **Deploy**.

---

## 📋 Local Build Verification

Both frontend and backend production builds have been verified:
- **Backend build**: `npm run build` (`prisma generate && tsc`) runs cleanly.
- **Frontend build**: `npm run build` (`next build`) outputs optimized production bundles.
