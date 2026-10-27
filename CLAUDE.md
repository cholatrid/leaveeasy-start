# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LeaveEasy (ระบบขอลาออนไลน์) is a student lab project for ADT-RAISE Non-Degree Batch 2, Module 2
("MVP-Ready", weeks 6–9). It's an online leave-request app: employees submit leave requests,
managers/HR approve or reject them. The student (chonlatrid) drives the work; Claude assists
step by step rather than building the whole thing unprompted.

**Read [leaveeasy-spec.md](leaveeasy-spec.md) before making changes.** It is the authoritative spec —
field names, folder names, status values, role permissions, and (critically) *what is explicitly
out of scope for this module* (§9) and *which week each feature belongs to* (§8). Do not build
next-week's features early, and do not add anything not written in the spec — flag it as a proposal
instead and wait for instructions.

## Commands

```bash
npm run dev   # serve -l 3000 .  — starts a static file server at http://localhost:3000
```

There is no build step, bundler, linter, or test suite — this is plain HTML/CSS/JS loaded directly
by the browser via `<script type="module">`.

## Hard constraints (per spec §0.2 and §9)

- **No frameworks** — no React/Vue/Next.js/Tailwind/etc. Plain HTML, CSS, JavaScript only.
- **No custom backend** — pages talk to Firestore directly from the client; no Express/Node
  server/Cloud Functions.
- **No SQL / relational DB** — Firestore only.
- **One `.html` file per screen**, page-specific behavior in one matching `js/*.js` file,
  shared styles in `css/style.css`.
- **Thai UI text, English field/collection names** — collection and field names must match
  `leaveeasy-spec.md` §5 exactly, including case (`status` ≠ `Status`).
- Never invent placeholder/real personal data — use the fictional names/emails already seeded
  in `js/data.js`.
- No pagination, no automated tests before week 9, no email/LINE/SMS notifications, no leave-balance
  calculations, no multi-level approval, no 4th role — see spec §9 for the full exclusion list.

## Architecture

**No bundler, no shared entry point.** Each `<page>.html` independently loads:
1. `css/style.css` (shared styles)
2. `js/util.js` and `js/nav.js` as plain `<script defer>` (no ES module — they define globals)
3. `js/<page>.js` as `<script type="module">` (imports Firestore SDK + `js/firebase-config.js`)

`js/firebase-config.js` initializes the Firebase app and exports `db` (Firestore instance) —
every page module imports `db` from here. The Firebase Web SDK is loaded straight from the
`gstatic.com` CDN via ES module imports (no npm install of firebase).

`js/util.js` and `js/nav.js` are loaded as classic scripts (not modules) so their functions
(`esc()`, `ป้ายสถานะ()`, `เวลาตอนนี้()`, `ค่าจากURL()`, `showConfigWarning()`) are available as
globals to the page's module script without an import. `js/nav.js` also renders the shared navbar
into `<div id="nav"></div>`, present on every page.

**Firestore collections** — there are exactly 4, all lowerCamelCase, no underscores (spec §5.2):

| Collection | Docs | Notes |
|---|---|---|
| `users` | `u001`, `u002`, … | `{ name, email, role }`, `role ∈ employee \| manager \| hr` |
| `leaveTypes` | `lt001`, … | `{ name }` |
| `leaveRequests` | `lr001`, … | see field list below |
| `leaveRequests/{id}/approvals` | `ap001`, … | **subcollection** nested under each leave request doc |

**Firestore data model** (see spec §5 for full field lists):
```
users/{uid}            { name, email, role }         role ∈ employee | manager | hr
leaveTypes/{id}         { name }
leaveRequests/{id}      { title, reason, status, startDate, endDate, createdAt,
                           requesterId, requesterName,   ← denormalized
                           approverId,  approverName,    ← denormalized
                           leaveTypeId, leaveTypeName }  ← denormalized
  leaveRequests/{id}/approvals/{id}   { authorId, authorName, message, createdAt }  (subcollection)
```
Names are denormalized onto `leaveRequests` (see spec §5.3) because Firestore has no JOIN —
when writing to `users`/`leaveTypes`, existing `leaveRequests` documents keep their old copied
name (accepted limitation for this module; no cascade-update logic).

**Status machine** (`leaveRequests.status`) — exactly 3 values, per spec §6:

| Value | Meaning | Who can set it | Next |
|---|---|---|---|
| `รอพิจารณา` | pending | system, automatically on create | → `อนุมัติ` or `ไม่อนุมัติ` |
| `อนุมัติ` | approved | manager, hr | terminal — no further change |
| `ไม่อนุมัติ` | rejected | manager, hr | terminal — no further change |

Rules enforced in [js/leave-request-detail.js](js/leave-request-detail.js): only pending requests
can transition; rejecting requires at least one existing comment in the `approvals` subcollection;
status changes touch only the `status` field, never overwrite the rest of the document; never
transition backwards (e.g. `อนุมัติ` → `รอพิจารณา` is not allowed).

**Pages and their JS** (all read/write Firestore live via `onSnapshot` except where noted):
- `index.html` — static landing page, no JS module of its own. Unprotected (only page other than
  login/signup that doesn't load `js/auth.js`), links out to `login.html`/`signup.html`.
- `login.html` / [js/login.js](js/login.js) — `signInWithEmailAndPassword`, redirects to `leave-requests.html`.
- `signup.html` / [js/signup.js](js/signup.js) — `createUserWithEmailAndPassword` → `updateProfile(displayName)` →
  `setDoc(users/{uid}, { name, email, role: "employee" })`, then redirects (signup auto-signs-in).
- `leave-requests.html` / [js/leave-requests.js](js/leave-requests.js) — list, real-time, optional `?status=` filter.
  Since `firestore.rules` was deployed, this query is **role-scoped**: it waits for `onAuthStateChanged`,
  reads the caller's own `role` from `users/{uid}`, and only queries the unfiltered `leaveRequests`
  collection for `manager`/`hr` — an `employee` gets `query(..., where("requesterId", "==", uid))`
  instead. Don't revert this to a plain unfiltered `onSnapshot(collection(db, "leaveRequests"))` —
  Firestore rejects an entire unfiltered collection query outright (not a partial/filtered result) when
  the rule's `allow read` depends on `resource.data` fields the query doesn't constrain via `where`, so
  employees would get `permission-denied` on the whole list, not just see fewer rows.
- `new-leave-request.html` / [js/new-leave-request.js](js/new-leave-request.js) — create form; `leaveTypes` loaded once via `getDocs`.
- `leave-request-detail.html` / [js/leave-request-detail.js](js/leave-request-detail.js) — detail + approve/reject + delete + comments.
- `leave-types.html` / [js/leave-types.js](js/leave-types.js) — full CRUD on `leaveTypes`.
- `seed.html` / [js/seed.js](js/seed.js) — one-time button that copies `window.LEAVE_DATA` (from `js/data.js`)
  into Firestore via `setDoc` (idempotent — reruns overwrite by id rather than duplicating). Not one
  of the 5 spec screens; intentionally left without the auth guard.

**Auth (Firebase Authentication, email/password)**: `js/firebase-config.js` also exports `auth`
(`getAuth(app)`) next to `db`. [js/auth.js](js/auth.js) is a shared route-guard-and-nav module —
every *protected* page (`leave-requests.html`, `new-leave-request.html`, `leave-request-detail.html`,
`leave-types.html`) loads it as `<script type="module" src="js/auth.js">` right after `nav.js` and
before the page's own module script. It calls `onAuthStateChanged` once: if logged out, redirects to
`login.html`; if logged in, fills `nav.js`'s `#navUser` placeholder with the display name + a
"ออกจากระบบ" (sign out) button. **Never add `js/auth.js` to `login.html`/`signup.html`** — it would
redirect a logged-out visitor on the login page back to itself.

`js/new-leave-request.js` and `js/leave-request-detail.js`'s `ส่งความเห็น()` read `auth.currentUser`
(uid + `displayName || email`) at submit time instead of hardcoding a fake user — this relies on
`js/auth.js`'s `onAuthStateChanged` having already resolved by the time a human finishes filling a
form, with a defensive null-check that fails closed (shows a Thai warning, doesn't write) if not.
`เปลี่ยนสถานะ()` in leave-request-detail.js is deliberately **not** touched by this — spec §6 requires
status changes to touch only the `status` field, and assigning `approverId`/`approverName` is a
separate (HR-only, later) feature.

**Known limitation, not a bug**: the `js/auth.js` guard is client-side (redirects on
`onAuthStateChanged`, which resolves asynchronously) — a logged-out visitor who loads a protected
page directly can briefly see the page shell before the redirect fires, though [firestore.rules](firestore.rules)
being live means any actual Firestore read in that window now correctly fails closed rather than
returning real data. Also requires the Email/Password sign-in provider to be enabled in the Firebase
Console for project `leaveeasy-chonlatrid` (it already is).

**[firestore.rules](firestore.rules)** — a full role-based ruleset matching [ACL.md](ACL.md) exactly
(role lookup via each caller's own `users/{uid}.role`; status transitions locked to one-way
`รอพิจารณา → อนุมัติ/ไม่อนุมัติ` touching only the `status` field; `leaveRequests`/`approvals`
visibility scoped to the owner or manager/hr; `leaveTypes` writes restricted to `hr`). **This is
week-8 scope (spec §8) drafted and deployed ahead of schedule at the student's request** — it is
**live** on the `leaveeasy-chonlatrid` project now, verified end-to-end (impersonation, field
spoofing, self-role-escalation, and unauthorized status/leaveTypes writes all correctly denied).
Two consequences to remember when touching Firestore-reading code from now on:
- Any unfiltered `onSnapshot`/`getDocs` on `leaveRequests` will be **denied outright** for an
  `employee` caller (not silently filtered) unless the query itself is scoped with
  `where("requesterId", "==", uid)` — see the role-branch in `js/leave-requests.js` above for the
  pattern to reuse if another page ever needs to list `leaveRequests`.
- `seed.html`'s `setDoc` calls now fail (seed data uses fixed ids like `u001` that don't match any
  real Firebase Auth uid, and the tool itself isn't gated behind login) — expected, not a bug to fix.

## AI assistant (week 8, spec §8/US-09)

Two levels, both calling OpenRouter (`js/ai.js`'s `เรียกAI()`, model `google/gemini-2.5-flash-lite`,
15s timeout, never blocks the normal save/approve flow on failure):

- **Level 1 — classify on submit** ([js/new-leave-request.js](js/new-leave-request.js)): "🤖 ให้ AI
  ช่วยจัดประเภทการลา" button reads the `reason` textarea, sends it with the real `leaveTypes` names,
  and only accepts a response that exactly matches one of them — anything else shows "AI จัดประเภทให้
  ไม่ได้" and leaves the select untouched (spec requirement ⑤). Sets the select + shows an "ข้อเสนอจาก
  AI" label that disappears the moment the human changes the select themselves (programmatic
  `.value =` doesn't fire `change`, so the label survives the AI's own write).
- **Level 2 — agentic summarize** ([js/leave-request-detail.js](js/leave-request-detail.js)): "🤖 ให้
  AI ช่วยสรุปใบลานี้" button (visible alongside approve/reject, i.e. only while `รอพิจารณา`) reads the
  request + its `approvals` comments, writes the summary to a new `aiSuggestion` field on the
  `leaveRequests` doc, and logs every call to a new `leaveRequests/{id}/aiLog/{id}` subcollection
  (`{ input, output, createdAt }`). Never touches `status` — approval is still a separate human click.

`firestore.rules` has matching additions: a second `allow update` on `leaveRequests` restricted to
`isManagerOrHr()` touching only `aiSuggestion`, plus a full `match /aiLog/{logId}` block mirroring
`approvals`'s read scoping. **These two additions are drafted but not yet deployed** — the base
role rules (users/leaveTypes/leaveRequests/approvals) are deployed and verified; publish the updated
file again (Firebase Console → Firestore → Rules → paste → Publish, or `firebase deploy --only
firestore:rules`) before the AI summarize button's Firestore writes will work end-to-end.

## Reviewer sub-agent (week 8, spec §8)

[.claude/agents/reviewer.md](.claude/agents/reviewer.md) defines a read-only (`Read`/`Grep`/`Glob`
only, no `Edit`/`Write`) sub-agent that checks 5 things — Security Rules gaps (especially
subcollections), missing input validation, missing not-found/AI-failure handling, field-name
consistency against this file and the spec, and leaked secrets — and writes findings to
[review-notes.md](review-notes.md) sorted into 🔴/🟡/⚪. It must never edit code itself. Re-run it
(or redo the same checks by hand) before every push, not just once.

## Secrets — never commit keys to a file that gets pushed

- **Never write a real secret key (API key, access token, password) into any file that will be
  committed/pushed** — this includes `js/firebase-config.js` for any *future* key beyond the
  Firebase web config, and especially the **OpenRouter API key** for the week-8 AI assistant
  feature. Put real secrets in a local, gitignored file (or ask the user how they want to supply
  it) — never hardcode them in tracked `.js`/`.html` files.
- The one documented exception: the **Firebase web `apiKey` already in
  [js/firebase-config.js](js/firebase-config.js) is not a secret** — Firebase's own docs say the
  web config is safe to expose client-side (access is controlled by Security Rules, not by hiding
  this key). Don't "fix" it by moving it out, and don't treat other keys the same way just because
  this one is public.
- Before any `git push`, list the files about to be pushed and read through the names — see
  [.gitignore](.gitignore) for the project's own reminder to do this and to watch for anything
  with `key`/`secret`/`config` in the name that shouldn't be tracked.
- The OpenRouter key lives in [js/ai-config.local.js](js/ai-config.local.js), which `.gitignore`
  already excludes (`js/ai-config.local.js` line) — verified with `git check-ignore -v
  js/ai-config.local.js`. It currently holds the placeholder string `"ใส่คีย์ของคุณตรงนี้"`; replace it
  with the real course-issued key locally, never in a tracked file. `js/ai.js` imports from it.

## Code style notes specific to this repo

- Variable and function names are frequently in **Thai** (e.g. `ใบRef`, `เปลี่ยนสถานะ()`,
  `กล่องใบลา`) mixed with English Firestore field names — this is intentional for this course,
  not a mistake to "fix".
- No semicolon-free style choice, uses `var`/`function` (ES5-ish), not `const`/`let`/arrow
  functions — match the existing style when editing these files.
- Always run user-supplied text through `esc()` before interpolating into `innerHTML`.
