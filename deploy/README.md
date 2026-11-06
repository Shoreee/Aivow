# Cloudflare D1 connection preparation

Source repository: https://github.com/Shoreee/Aivow. GitHub Actions verifies source changes; it does not deploy them.

The chosen database is **Cloudflare D1 Free**, using the existing `DB` binding. The separate `aivow-demo-db` database was created in APAC on 2026-11-06 after the owner authorized Wrangler. All three migrations have been applied. Cloud reads/writes and the optimistic version guard were verified using a synthetic probe, which was removed afterward.

The application is published at **https://aivow-demo.aivow.workers.dev**. See [deployment details](DEPLOYMENT.md). The running local application still uses its original local database. No local accounts, chats or API keys were uploaded. The older hosted version has not been changed.

## What is ready

- Existing account, chat, circle, disclosure and encrypted key storage already use D1 APIs locally.
- All SQL migrations in `drizzle/` can initialize a fresh D1 database. Older local data is preserved; it is not automatically uploaded.
- `npm run cloudflare:prepare` converts the built Worker config to the new database/Worker target and strips inherited service bindings and environment keys. Real account/database IDs are stored in ignored `deploy/cloudflare.local.json`; the generated binding is `dist/server/wrangler.aivow.json`.
- `npm run cloudflare:check` validates a disposable SQLite schema and performs an offline Wrangler bundle check with a fixture database ID. It makes no cloud changes and does not claim a real connection.
- `.github/workflows/verify.yml` builds and checks pull requests/main. It never applies cloud migrations or deploys.

## Rebuild or publish an update

Cloudflare authorization, the database, schema and Worker are ready. Wrangler credentials are encrypted with their encryption key in macOS Keychain. The user also granted Workers publication permissions on 2026-11-06. For an update:

1. Keep using the newly created `aivow-demo-db`; do not reuse the old hosted database. No paid plan upgrade was made.
2. On this computer, ignored `deploy/cloudflare.local.json` is already filled. On another checkout copy the example and supply the IDs, or use `AIVOW_D1_DATABASE_ID` and `CLOUDFLARE_ACCOUNT_ID` in CI. IDs are configuration, not database passwords.
3. Run `npm ci`, `npm run build`, then `npm run cloudflare:prepare`.
4. Review `dist/server/wrangler.aivow.json`: new Worker name, correct D1 ID, both SQLite Durable Object classes, and no raw API keys.
5. Apply any new schema migrations and deploy the prepared Worker. The cloud `AI_KEY_ENCRYPTION_SECRET` already exists; preserve it. Users enter their own DeepSeek keys in Settings. Do not upload `.dev.vars`.

Migration and publication commands:

```sh
npx wrangler d1 migrations apply aivow-demo-db --remote --config dist/server/wrangler.aivow.json
npx wrangler deploy --config dist/server/wrangler.aivow.json
```

The database migrations and initial publication have run. The encryption secret was generated and delivered through stdin; it must remain stable. Online validation and network details are in [DEPLOYMENT.md](DEPLOYMENT.md).

## How GitHub fits

GitHub can host this source and run checks; Cloudflare Workers can later connect to the GitHub repository or be published from GitHub Actions. The app and `/api/*` should use the **same Cloudflare origin**, so HttpOnly sessions and CSRF/origin checks work without changes. The phone then opens that Cloudflare URL.

GitHub Pages alone cannot host this server-rendered application or D1 jobs. Deploying this app on a `github.io` URL and adding a database URL would require a separate frontend/API architecture and CORS/session changes; it is not the current prepared path. D1 has no public browser credential to paste into the frontend.

Official references: [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
