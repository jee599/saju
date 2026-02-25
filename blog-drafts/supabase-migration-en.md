---
title: "I Failed 3 Times Connecting Prisma to Supabase — Here's What Actually Works"
published: false
description: "Switching from SQLite to Supabase PostgreSQL with Prisma: IPv4 traps, wrong pooler regions, and cross-schema FK issues"
tags: [prisma, supabase, postgresql, database]
series: AI Fortune App Build Log
---

Switching Prisma from SQLite to PostgreSQL is one line. That part's true. But actually connecting to Supabase? I failed three times in a row.

## Why Switch

I was building an AI fortune-telling app (based on the traditional East Asian "Four Pillars of Destiny" system) with SQLite for local dev. But production needs were clear: concurrent connections, serverless compatibility, data retention policies — all pointing to PostgreSQL. Supabase free tier was the move.

## Step 1: Change the Provider — This Was Easy

```prisma
// Before
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// After
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Generated PostgreSQL migration SQL with `prisma migrate diff --from-empty --to-schema-datamodel`. Prisma handled all the type conversions — `DATETIME` to `TIMESTAMP(3)`, `REAL` to `DOUBLE PRECISION`. Smooth so far.

## Failure 1: "Can't reach database server"

```
Error: P1001: Can't reach database server at
db.xxxxx.supabase.co:5432
```

DNS wouldn't resolve. Ran `nslookup` — no A record. Opened the Supabase dashboard and found the warning: "Not IPv4 compatible." The direct connection is IPv6 only.

Lesson: Supabase free tier direct DB is IPv6 only. Use the Connection Pooler on IPv4 networks.

## Failure 2: "Tenant or user not found"

Switched to the pooler. Different error.

```
FATAL: Tenant or user not found
```

I guessed the pooler region as `aws-0-ap-northeast-2`. The actual pooler host was `aws-1-ap-south-1`. One wrong region = connection refused.

Lesson: Don't guess the pooler host. Copy it from Supabase Dashboard > Connect > ORMs tab.

## Failure 3: "Cross schema references"

Connection worked. But `prisma migrate dev` blew up.

```
Error: P4002
public.profiles points to auth.users in constraint profiles_id_fkey
```

Supabase ships with a default `profiles` table that references `auth.users`. Prisma only introspects the `public` schema, so it chokes on cross-schema foreign keys.

The fix: bypass introspection entirely.

```bash
# Execute SQL directly (no introspection)
prisma db execute --stdin < migration.sql

# Mark migration as applied (baseline)
prisma migrate resolve --applied "20260225_init_postgresql"
```

Instead of `migrate dev` or `db push`, pipe the SQL directly and mark it as resolved. Clean workaround for the cross-schema issue.

## Final Result

```
Test Files  4 passed (4)
     Tests  99 passed (99)
```

DB tests hitting live Supabase, full CRUD passing. Five tables created (FortuneRequest, Order, Report, LlmUsage, PromptCache).

Also cleaned up hardcoded SQLite paths from vitest config and QA gate scripts. `grep -r sqlite` returns zero hits.

## Prisma + Supabase Connection Cheatsheet

```env
# Queries (pgbouncer, port 6543)
DATABASE_URL="postgresql://postgres.[REF]:[PW]@aws-X-region.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Migrations (session mode, port 5432)
DIRECT_URL="postgresql://postgres.[REF]:[PW]@aws-X-region.pooler.supabase.com:5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

> "The DB switch is one line of config. The actual connection is an infrastructure problem. Copy from the Supabase ORMs tab and save yourself three failures."
