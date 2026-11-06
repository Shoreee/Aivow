# Aivow · Dream implementation

Approved 2026-11-06. Initially local-only; the user subsequently authorized publishing the separate Cloudflare demo. No source push or changes to the older hosted version.

## Experience

Existing connection → interaction → realtime counterfactual or accelerated future → private projection or accepted shared branch → EM scene actions → human response → grounded understanding record.

Navigation remains Life / Chats / Me. EM under Me contains profile, behavior, activity, private legacy branches, memory and preference suggestions. Life retains MapLibre / OpenFreeMap and opens a separate 2D Dream page. Chats shows one timeline per person, including Dream invitations and recaps with Replay / Reply / Branch. No matching, compatibility scores, contact-directory tab, video generation or location tracking.

## Implemented boundaries

- Private Dream uses a frozen, relationship-authorized peer projection. Shared Dream requires acceptance and uses each participant's authorized memories. Source types: person, em, projection.
- Invitation preview shares only selected events and scene metadata; unselected correction text, other branches and memory snapshots are excluded. Accepting creates a separate shared branch.
- Pair grants contain memory IDs and revision timestamps. Editing a memory requires reauthorization. New grants do not expand an existing private snapshot; revocation limits subsequent generation immediately.
- Human input, pause, withdrawal, block and settings changes invalidate outstanding actions. A private fork never overwrites history or changes long-term preferences.
- Only real human statements support acknowledged understanding records. Both people confirm stage changes. EM autoplay, card views and duration never advance stages.
- Repeated identical corrections in separate branches produce a private preference suggestion; saving requires confirmation and does not grant sharing permission.

## Runtime and AI

DreamScheduler is a local Durable Object with persistent alarms. Each round uses its initiator's account key, at most eight scene generations, a 90-second human-idle limit and a three-minute hard limit. Waiting for a person stops scene actions but retains the idle deadline. A grounded recap selects up to three existing event IDs and displays source-labelled verbatim excerpts; no generated narrative is presented as human agreement. Closing a browser does not stop the round while the local service remains running. Expired rounds are checked before new actions. Leases and version checks reject stale results.

Settings supports key input, test, save and removal. AES-GCM ciphertext is saved per account; the server-side encryption secret is in ignored .dev.vars. No old environment-key fallback exists. Missing key, authorization, balance, rate limit, network and malformed output errors remain visible at the point of use. Example replies never substitute for AI failures.

## Verification

- TypeScript and production build.
- scripts/check-dream-domain.ts: frozen context, revised memories, legacy defaults, preview redaction, actual human evidence, mutual stage approval, private forks and version guards.
- scripts/check-dream-api.py: two real local accounts, grant/revocation, invitation/acceptance, evidence, suggestions, withdrawal, masked credentials; --real-ai adds actual DeepSeek and background execution checks.
- scripts/check-api.py: existing auth, EM drafts, human takeover, turn limits, paused chat, introductions and cancellation regression.
- Browser checks at 390 × 844: registration/default setup, scene creation, missing-key error, Settings, bilingual UI, branch and chat access.

All timings, stage labels and scene templates are prototype design choices. Research supports autonomy and correction, not a claim that Dream predicts real feelings or improves relationship quality.

## Conversation-first revision (2026-11-06)

- Conversation Dream has no overlay: Chat / EM share a timeline workspace, controls, event bubbles and recaps. Time together is accessed from More, not a third tab. Life has its own Dream page using the same scene workspace (latest decision below).
- A fixed compact dock pairs the actual Life map with the imagined scene. Selected references travel as explicit card attachments in human chat; only that event and scene metadata are shared.
- Recaps now include an EM-action summary, grounded emoji highlights and optional next questions. All source distinctions remain intact, and summaries cannot assert human consensus from EM behavior.
- Mina (auto) uses a fixed fictional persona and account-configured DeepSeek replies through a separate finite Durable Object job. Mina (dead) receives messages but cannot reply or join actively. Source auto is never human understanding evidence.
- Private natural-language EM instructions are stored separately from public Dream events and filtered by owner in every view.
- Time together collects stages, sharing scopes, known/received details and recaps; actual human messages can create acknowledged understanding records.
- Life removes standalone shortcut buttons and keeps EM activity plus Dream in its control strip. EM activity defaults on; no switch in Life. Map points and walking geometry are cached from OpenFreeMap/OSM; movement is timed, persisted and makes no model calls.
- Added conversation integration and Life interpolation tests.

## Progressive Life Dream revision (2026-11-06)

- Life Dream opens a new page, independent of Chats navigation, and never silently reopens an existing branch. Time mode, connected person, scene, then place/pace appear one step at a time. Context chips allow returning to earlier choices. No scene or model call is created until Start Dream.
- Connection choices use existing avatar assets and disclose auto/offline demo status. Offline people support private projection only. Chat EM uses the same progressive setup with that conversation's person fixed.
- Both entry points reuse the same permission-checked scene engine, event timeline, private commands and recaps. Bringing a scene into human chat is an explicit action.
- Registered accounts see a three-card, skippable guide after EM setup/default skip. Completion is stored on the account's person record, including across login; old accounts are preserved. Settings can replay the guide.
- Time together is collected under More; the conversation tab and Me entry are named EM.
- Backend options and current local-auth limitations are documented in BACKEND.md. Online release details are in deploy/DEPLOYMENT.md.
- The collection is now Time together / 我们在一起的时间. Removed repeated policy/marketing captions from the collection, scene setup and behavior settings while retaining source and error states.
- D1 Free is the chosen database. deploy/ contains a separate-target configuration, a preparation script, fresh-schema/offline bundle checks and GitHub verification workflow. After owner authorization on 2026-11-06, aivow-demo-db was created in APAC, all migrations applied and remote read/write/version guards verified.

## Published demo (2026-11-06)

- The user authorized deploying aivow-demo at https://aivow-demo.aivow.workers.dev. Version e2080254-6c87-4e2c-8565-7c244e78d7b3 receives 100% of traffic; no source was pushed.
- Only a new server-side encryption secret was delivered through stdin. No user's DeepSeek key or local data was uploaded. Users configure their own AI in Settings.
- Hosted API checks pass: new registration/login and secure cookies, origin protection, initial setup/guide, missing-key errors, two-account friendship/chat, private/shared branches, offline roles, account-isolated key storage and both background alarm classes. Deliberately invalid fixture keys produce real provider errors with no fake replies.
- The default DNS on this machine returned wrong workers.dev addresses. Online checks used independently verified Cloudflare DNS results and normal TLS certificate/hostname verification over the existing proxy. Online browser QA was unavailable because local browser use was disabled in Work settings; prior mobile UI checks remain local.

## GitHub source management (2026-11-06)

- The user authorized uploading source to Shoreee/Aivow without another deployment. README uses actual interface captures and documents the core flow, boundaries, local setup and verification.
- setup:local initializes a fresh local database and ignored encryption secret, preserves complete existing installations, and refuses a partial legacy schema. Fresh-clone initialization and repeat-run preservation are tested.
- GitHub Actions only typechecks, builds and runs offline configuration/local setup checks. Local credentials, runtime databases, cloud account configuration, test receipts and publication archives remain excluded.

## Executable EM controls (2026-11-06)

- Owner instructions invalidate pending generations before parsing, commit a concrete own-EM action immediately, and schedule the peer's next turn. Literal speech executes exactly; “请你立刻咕咕嘎嘎” is verified as source em with text “咕咕嘎嘎”.
- Realtime starts from Life after choosing a connection, without template/place/pace questions. Own EM movement and waiting update persisted virtual Life motion. Private projections never move the other person's Life EM; accelerated imagination remains independent.
- Ending is terminal and idempotent. Controls disappear or disable after end; the same round cannot restart. Recap jobs are deduplicated and failures retain the ended state.
- Checks cover literal speech, actual HTTP/D1 execution, route/wait state, shared-owner permissions, stale generations, out-of-order commands, ended guards and recap concurrency. The user subsequently authorized updating the Cloudflare release and completing the GitHub upload.
