# Aivow backend options

Checked against official pricing pages on 2026-11-06. The separate demo is now published at https://aivow-demo.aivow.workers.dev. The original local database and older hosted version have not been uploaded or changed.

## Selected: Workers + D1 Free + SQLite Durable Objects

This is already the local runtime. Workers serves the application/API, D1 persists accounts, sessions and conversation worlds, and two Durable Object classes schedule finite Dream and demo-reply rounds. The configured classes use SQLite-backed storage, which is available on the free plan.

| Service | Current free allowance | Aivow use |
| --- | --- | --- |
| Workers | 100,000 requests/day, 10 ms CPU/invocation | Web application, auth, API |
| D1 | 5 million rows read/day, 100,000 rows written/day, 5 GB total | Accounts, sessions, encrypted key records, worlds |
| Durable Objects | 100,000 requests/day, 13,000 GB-s/day | Sequential finite Dream rounds and demo replies |

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

These quotas are likely sufficient for a small course demo, but this is an estimate, not a measured capacity guarantee. Free Workers CPU is the tightest constraint: password hashing, server rendering and large JSON worlds need profiling before public use. Network waiting is excluded from CPU time. Do not reduce password security to meet a quota. If optimization is insufficient, Workers Paid starts at $5/month. See [CPU limits](https://developers.cloudflare.com/workers/platform/limits/) and [pricing](https://developers.cloudflare.com/workers/platform/pricing/).

The current 2.5-second visible-page poll creates about 1,440 reads/hour per open page, with additional Life ticks. Keep the test group small; a later hosted version should use conditional polling or server events and split large world records as needed. Free quotas are finite; reaching them may stop requests. DeepSeek usage remains separately billed by the AI provider; backend free allowance does not cover AI calls.

## Alternative: Supabase Free

Supabase includes managed authentication, Postgres, realtime and edge functions. Current Free includes 50,000 monthly active users, a 500 MB database and 5 GB egress, with two active projects; inactive projects pause after one week. It is attractive if managed email login/password reset becomes the priority. For this existing implementation it requires replacing D1 persistence and auth integration and adapting Dream scheduling, so it is more work than keeping Cloudflare. [Official pricing](https://supabase.com/pricing).

## Are registration and friends real?

Yes, the current local prototype creates persistent server-side accounts with hashed passwords and HttpOnly sessions. It is not just browser localStorage. Friends/introductions/shared circles and two-account messages work when both users reach the same running backend. Separate backends or separate local databases do not share users.

Current limitations: no verified email ownership, password reset, production rate limiting or abuse controls. Therefore this is a functional prototype account system, not a production-ready identity service. Free-plan CPU behavior and real network access must also be checked before an online test.

GitHub stores source code; GitHub Pages serves static files and cannot run this API, D1 or Durable Object jobs. Publishing the frontend alone does not make accounts or friends work online. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

A later public test would need one new shared Cloudflare environment, database migrations, HTTPS sessions, the server encryption secret and verified access from both phones. Per-account DeepSeek keys remain encrypted server-side. Local data stays local unless deliberately migrated. No credentials should enter GitHub or frontend bundles.

## Connection preparation status

The selected D1 configuration and GitHub checks are in [deploy/README.md](deploy/README.md). Following owner authorization on 2026-11-06, the separate APAC database aivow-demo-db was created, all three migrations applied, and aivow-demo published on workers.dev. Remote schema, writes/reads, optimistic version guards and hosted two-account/background-job checks passed. IDs are in ignored deploy/cloudflare.local.json; Wrangler credentials are encrypted with the key in macOS Keychain. The local app still uses local data. No local accounts, chats or API keys were migrated and no source was pushed to GitHub. [Deployment record](deploy/DEPLOYMENT.md).
