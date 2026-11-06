# Aivow online demo

Published 2026-11-06 at **https://aivow-demo.aivow.workers.dev**.

- Worker: `aivow-demo`; version `e2080254-6c87-4e2c-8565-7c244e78d7b3`.
- D1: `aivow-demo-db` in APAC; all three existing schema migrations applied.
- Background classes: `DreamScheduler` and `DemoChatScheduler`, both SQLite Durable Objects.
- Static assets and API share the same HTTPS origin. Cloudflare created the `aivow.workers.dev` account subdomain and the `aivow-demo` app address. No domain purchase or paid-plan upgrade was performed.
- The only server secret is a newly generated `AI_KEY_ENCRYPTION_SECRET`. It was sent over stdin, never printed or put in a repository. It is independent of the local encryption secret.
- **No DeepSeek API key is deployed.** Each user configures their key in Me → Settings → AI. Missing configuration and provider failures remain explicit errors.

## Use

Open the public URL, register a new online account, choose EM settings (or the default), and complete or skip the quick guide. Configure AI in Settings when needed.

For a real friend, each person registers separately on this same public URL. Share the invitation from Me → My circle; the other person accepts it. Use Chats → New chat to request/accept friendship. No matching or public directory is added.

Local accounts and online accounts are separate. Local chats, profiles, stored keys and database files were not uploaded. The earlier hosted version was not modified. Source is managed separately at https://github.com/Shoreee/Aivow; GitHub updates do not automatically deploy.

## Verification and network

Typecheck, build and offline bundle/schema checks passed before publication. The deployment API confirms the version receives 100% of traffic. The published homepage, avatar, map JSON, map worker and favicon return HTTPS 200.

This computer's default DNS returned unrelated IPs for the new workers.dev address. Cloudflare's DNS-over-HTTPS returned valid Cloudflare IPs, and requests through the existing system proxy with that independently resolved address succeeded with normal hostname/certificate verification. No TLS checks, system DNS or proxy settings were disabled or changed. Some local/mobile networks may therefore need a different resolver/network or a later custom domain; this has to be verified on the user's device.

Browser automation became disabled in Work settings during final online verification. The earlier mobile UI checks were local; online browser visual verification was unavailable.

Hosted API checks passed with two disposable accounts: registration/login and Secure/HttpOnly/SameSite cookies, foreign-origin rejection, initial EM setup and guide, missing-key error, circle/friend acceptance, person-to-person messages, human understanding evidence, private branch isolation, shared invitation/acceptance and offline-role rejection. Account-isolated encrypted key storage and both Durable Object alarm classes passed using deliberately invalid fixture keys; DeepSeek returned its actual authentication error and the app produced no fake replies. No real user key was involved.

After verification, only those two exact disposable accounts, their test worlds, sessions and fixture key rows were removed. The cleanup receipt is ignored in `.sites-runtime/hosted-check.json`.

## Update

After changes, run typecheck/build, `npm run cloudflare:prepare`, then publish the prepared config. Keep the existing cloud encryption secret; deployments retain it automatically. Do not generate a replacement secret unless planning an explicit key-storage migration. Never pass local `.dev.vars` as the deployment secrets file.

The Cloudflare repository integration is optional. This release was uploaded directly from this checkout. The later source import to GitHub includes documentation and local setup improvements, without another deployment; the current source and published version can therefore differ. GitHub is not the runtime domain.
