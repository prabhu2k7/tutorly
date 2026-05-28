# MVP Plan — Tutorly

## Product vision

> **Turn a course creator's material into an AI tutor that answers student questions 24/7 — so the creator stops answering the same questions every day.**

The customer is the **online course creator** (Teachable / Kajabi / Thinkific / Podia / Skool / Maven / Gumroad). Their #1 ongoing pain is repetitive student questions about content they've already taught. The product gives them an embeddable / shareable chat tutor scoped strictly to *their* course material — and (in v2) shows them which topics students get stuck on.

## What this MVP is — and is NOT

**This MVP is** the smallest thing one real course creator can use end-to-end:

- A creator uploads their course material to a private knowledge base.
- They get a public **share link** they can give to their students.
- Students open the link and chat with a tutor that only answers from that creator's content.
- Two different creators' content stays completely isolated.

**This MVP is NOT** (deferred to a later phase):

- No user accounts or login (the `kb_id` *is* the access token for now)
- No Stripe / billing
- No embeddable JS widget (a hosted share-link page is enough for the pilot)
- No analytics dashboard ("top student questions") — comes in v2
- No video transcript ingestion — PDFs/DOCX/TXT is enough to test the thesis
- No streaming responses

The goal is to put it in a real creator's hands within days, not weeks.

## Architectural shift from current code

The current code is a single-user demo with a global Chroma collection and a browser-pasted OpenAI key. To become a product, three structural changes:

| Today | Phase 1 MVP |
|---|---|
| One global Chroma collection | Every chunk tagged with `kb_id`; queries filter by it |
| Browser pastes OpenAI key on every request | Server holds `OPENAI_API_KEY` from `.env` |
| Data wiped on every backend restart | Collection persists across restarts |
| One generic React view | Two views in one app: **creator** (default) and **student** (`?kb=<id>`) |

The retrieval engine itself (chunking, embeddings, search) stays as-is.

## Knowledge-base lifecycle

1. Creator visits the site → frontend asks backend `POST /api/kb` → gets back a `kb_id` (UUID v4) → stored in `localStorage`.
2. Creator uploads documents via `POST /api/kb/{kb_id}/upload`.
3. Creator copies a share link: `https://yoursite.com/?kb=<kb_id>`.
4. Student opens the share link → frontend detects `?kb=` in URL → shows student-only chat view.
5. Student questions go to `POST /api/kb/{kb_id}/chat`, scoped strictly to that KB.

`kb_id` is a UUID v4 — long enough to not be guessable. (Accounts + proper auth come in Phase 2.)

## API surface (MVP)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/kb` | Create a new knowledge base, returns `{kb_id}` |
| `POST` | `/api/kb/{kb_id}/upload` | Upload + embed a document into a KB |
| `GET` | `/api/kb/{kb_id}/files` | List files in a KB |
| `DELETE` | `/api/kb/{kb_id}/files/{file_id}` | Delete a file from a KB |
| `GET` | `/api/kb/{kb_id}/stats` | Stats for a KB |
| `POST` | `/api/kb/{kb_id}/chat` | Chat scoped to one KB (student-facing) |

No global endpoints — every operation is scoped to a `kb_id`.

## Use cases (user stories)

| # | Actor | Story |
|---|---|---|
| UC1 | Creator | I can create a fresh knowledge base on first visit without any signup |
| UC2 | Creator | I can upload a PDF / DOCX / TXT to my knowledge base |
| UC3 | Creator | I can see the list of materials in my KB and delete any |
| UC4 | Creator | I can copy a shareable link to send to my students |
| UC5 | Creator | When I come back later (same browser), I find my KB again |
| UC6 | Student | I can open the share link and immediately start asking questions |
| UC7 | Student | I see citations to the source material in the answers |
| UC8 | Student | I can ask follow-up questions and the bot remembers what we discussed |
| UC9 | System | Two creators' content stays completely separated — no cross-leak |
| UC10 | System | The bot refuses (or politely declines) to answer questions outside the course material |

## Configuration (env vars)

A new `backend/.env` will be required:

```env
OPENAI_API_KEY=sk-...           # server-side, used for embeddings + chat
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

`.env` will be added to `.gitignore`.

## Pilot success criteria

The MVP is "good enough to put in front of a creator" when:

1. All 10 use cases above work end-to-end on `localhost`.
2. The 10 test cases in [TEST_PLAN.md](TEST_PLAN.md) pass — most importantly **T6 (tenant isolation)** and **T3 (refuses out-of-scope questions)**.
3. The OpenStax Statistics test corpus (see TEST_PLAN.md) returns acceptable answers on 8/10 sample student questions.

## What comes after the MVP (not now)

- **Phase 2** — accounts, Stripe, embed widget, analytics dashboard ("top questions this week"), streaming responses, video-transcript ingestion.
- **Phase 3** — integrations with course platforms (Teachable / Kajabi / Skool app marketplaces) for built-in distribution.
