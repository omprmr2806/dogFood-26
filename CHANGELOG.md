# CHANGELOG

All notable changes to DOGFOOD are documented in this file.

---

## [1.0.0] — 2026-09-27

### Phase 15: Final Release
- Version bumped to 1.0.0
- All phases verified, committed, and pushed
- Docker Compose verified: PostgreSQL + API + Web all healthy offline

### Phase 14: UI/UX Redesign
- Complete premium design system rewrite (globals.css)
- Glassmorphism cards, gradient accents (Indigo/Violet/Cyan palette)
- Micro-animations: `fadeIn`, `slideIn`, `pulse-glow`, `float`, `spin`
- Skeleton loaders for all async data pages
- VoteButton component with optimistic UI updates
- Leaderboard page with podium display and medal emojis
- Organizer Results management page (publish/unpublish/export)
- Audit Log page with pagination and action icons

### Phase 13: Documentation
- README.md updated with complete phase table and feature matrix
- CHANGELOG.md created
- All API endpoints documented in inline code comments

### Phase 12: Acceptance Test Suite
- `vote-results.test.ts` covering Phase 9/10/11 endpoints
- 152 total automated tests (148 unit + 4 integration needing live DB)
- Security header verification tests

### Phase 11: Security Hardening
- Auth rate limiter hardened: 5 attempts per 15 minutes (was 10/min)
- Vote rate limiter: 10 votes per minute per user (user-keyed)
- General API rate limiter: 300 requests per minute per IP
- Rate limiters applied globally at API prefix level
- Vote endpoints protected with per-user keyed rate limiter

### Phase 10: Results + Leaderboard + Exports + Audit
- `hackathon_results_publications` table with immutable snapshot (JSONB)
- `audit_log` table with indexed action, user, hackathon, and timestamp columns
- `ResultsService`: live leaderboard composition joining scores + vote counts
- Publish/unpublish lifecycle with snapshot freezing
- CSV and JSON export endpoints
- Audit log write on every publish/unpublish event
- Organizer-only preview of live results before publication

### Phase 9: Community Voting + Anti-Abuse
- `submission_votes` table with `UNIQUE(user_id, submission_id)` DB constraint
- `submission_vote_counts` convenience view
- Voting window columns on `hackathons` table: `voting_start`, `voting_end`, `voting_enabled`
- `VoteService`: cast, remove, count (single + bulk), window enforcement
- Vote routes: POST/DELETE/GET with authentication + rate limiting
- Organizer voting-config endpoint (PUT/GET)
- Judges excluded from community voting

---

## [0.8.0-phase8] — 2026-09 (Prior)
- Z-Score normalization with raw-score fallback
- Deterministic ranking engine with tie detection
- `project_judging_results` as authoritative ranking store

## [0.7.0-phase7] — 2026-09
- Configurable rubric and weighted criteria
- Judge scoring console with per-criterion feedback
- Organizer judging progress monitor

## [0.6.0-phase6] — 2026-09
- Deterministic judge assignment algorithm
- Conflict of Interest prevention
- Workload balancing

## [0.5.0-phase5] — 2026-09
- Project submissions system (DRAFT → SUBMITTED → LOCKED)
- Public project gallery with search, filter, pagination

## [0.4.0-phase4] — 2026-09
- Team formation with invite codes
- Member capacity enforcement

## [0.3.0-phase3] — 2026-09
- Hackathon lifecycle state machine
- Participant registration system

## [0.2.0-phase2] — 2026-09
- Local authentication (Argon2id + JWT sessions)
- Backend RBAC (ADMIN, ORGANIZER, JUDGE, PARTICIPANT)

## [0.1.0-phase1] — 2026-09
- Next.js + Express + PostgreSQL 16 foundation
- Docker Compose infrastructure
- Health check API
