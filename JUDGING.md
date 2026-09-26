# DOGFOOD Judging & Automated Assignment Engine

This document details the architecture, data model, Conflict of Interest (COI) prevention policies, and automated deterministic judge assignment algorithm implemented in Phase 6 of the DOGFOOD platform.

---

## 1. Overview

The DOGFOOD judging subsystem enables organizers to configure an event-specific judge pool, record explicit and structural conflicts of interest, establish a target evaluation density ($K$ judges per submission), preview workload distributions, and atomically finalize official assignments.

Judges access an event-scoped, privacy-bounded assignment queue (`/judge/assignments`) where they can inspect their designated projects without access to other judges' assignments, private participant emails, or unauthorized submissions.

---

## 2. Event-Specific Judge Participation Model

Having the role `JUDGE` in DOGFOOD does **not** grant automatic judging rights across all hackathons. Judge participation is strictly event-scoped:

1. **User Identity vs. Event Enrollment**:
   - Identity resides in the central `users` table (`role = 'JUDGE'`).
   - Enrollment resides in `hackathon_judges`, with fields `(hackathon_id, judge_id, status, created_at, updated_at)`.
   - Database constraint: `CONSTRAINT uq_hackathon_judge UNIQUE (hackathon_id, judge_id)`.
2. **Judge Status Lifecycle**:
   - `ACTIVE`: The judge is available for evaluation and will be included in the automated assignment pool.
   - `INACTIVE`: The judge is temporarily unavailable or recused. The assignment engine strictly excludes inactive judges from candidate pools.
3. **RBAC & Enrollment Enforcement**:
   - Only `ORGANIZER` and `ADMIN` users can add, activate, deactivate, or remove judges for a hackathon.
   - Participants cannot add judges or assign themselves.
   - Judge endpoints reject requests if the authenticated user is not an `ACTIVE` judge for the requested event (`NOT_ACTIVE_JUDGE`).

---

## 3. Conflict of Interest (COI) Prevention

Preventing conflicts of interest is critical to maintaining hackathon integrity. The backend enforces two layers of conflict exclusion during assignment generation, previewing, finalization, and direct submission access:

### 3.1 Structural Conflicts (Team Membership)
- **Rule**: A judge **MUST NOT** be assigned to any submission submitted by a team where the judge is a registered member or leader.
- **Backend Enforcement**: For every candidate judge $J$ and submission $S$ submitted by team $T$, the engine checks whether a record exists in `team_members` where `team_id = T` and `user_id = J.id`.
- If matched, $J$ is excluded from the eligible judge pool for $S$.

### 3.2 Explicit Declared Conflicts (Advisory / Institutional / Personal)
- **Rule**: Organizers can record declared relationships in `judge_conflicts` (e.g., academic advisor, former co-founder, investor).
- **Scope**: Conflicts can be scoped to an entire team (`team_id`) or a specific project (`submission_id`).
- If matched, $J$ is excluded from candidate consideration for the respective project.

---

## 4. Automated Assignment Algorithm

The `JudgeAssignmentService` implements a pure, reproducible, and deterministic greedy workload-balancing algorithm designed to minimize workload variance across active judges while strictly honoring conflict constraints.

### 4.1 Objectives
1. Assign each eligible submission to exactly $K$ judges (`judges_per_submission`).
2. Minimize workload imbalance (variance in total assigned projects across active judges).
3. Prevent duplicate assignments: a judge can evaluate a submission at most once (`UNIQUE(submission_id, judge_id)`).
4. Strictly exclude all conflicted judges.
5. Provide 100% deterministic, reproducible output.
6. Fail safely and report exact unassignable submissions if judge capacity is insufficient.

### 4.2 Algorithm Specification

```
Input:
  hackathonId: UUID
  judgesPerSubmission: K (integer >= 1)
  judges: Array<Judge>
  submissions: Array<Submission>
  teamMemberships: Array<TeamMember>
  conflicts: Array<JudgeConflict>

Steps:
1. Filter active judges:
     activeJudges = judges.filter(j => j.status == 'ACTIVE')
   If activeJudges.length < K:
     Fail with error: "Insufficient active judges in pool."

2. Sort active judges deterministically by UUID ascending:
     activeJudges.sort((a, b) => a.id.localeCompare(b.id))

3. Sort submissions deterministically by UUID ascending:
     sortedSubmissions = submissions.sort((a, b) => a.id.localeCompare(b.id))

4. Initialize workload tracking map:
     workloadMap = { judge.id: 0 for judge in activeJudges }

5. Build fast O(1) conflict lookups:
     teamMemberSet = Set of "${teamId}:${userId}"
     judgeSubmissionConflicts = Map<judgeId, Set<submissionId>>
     judgeTeamConflicts = Map<judgeId, Set<teamId>>

6. For each submission S in sortedSubmissions:
     a. Filter eligible candidates from activeJudges:
          eligibleJudges = []
          for judge in activeJudges:
            if teamMemberSet.has("${S.teamId}:${judge.id}"):
              Record diagnostic: Structural team membership conflict
              continue
            if judgeSubmissionConflicts[judge.id]?.has(S.id):
              Record diagnostic: Explicit submission conflict
              continue
            if judgeTeamConflicts[judge.id]?.has(S.teamId):
              Record diagnostic: Explicit team conflict
              continue
            eligibleJudges.push(judge)

     b. If eligibleJudges.length < K:
          Record S in unassignableSubmissions with available count and reason.
          continue

     c. Sort eligible candidates:
          Primary criteria: workloadMap[judge.id] ascending (least loaded first)
          Secondary criteria (tie-breaker): judge.id ascending string comparison

     d. Select top K candidates:
          chosenJudges = eligibleJudges.slice(0, K)

     e. For each judge in chosenJudges:
          workloadMap[judge.id] += 1
          Create assignment: { submissionId: S.id, judgeId: judge.id, hackathonId }

7. Return result:
     success = (unassignableSubmissions.length == 0)
     assignments, workloadStats, unassignableSubmissions, conflictsEncountered
```

### 4.3 Determinism & Workload Balancing Behavior
- **No Uncontrolled Randomness**: The engine never uses `Math.random()`, system clocks, or hash table iteration non-determinism.
- **Reproducibility**: Calling the algorithm multiple times with the same inputs produces identical assignments and identical workload distribution.
- **Fair Workload Balancing**: By sorting eligible judges by current assignment count ascending at each step, workload is spread evenly across the active pool. For example, 24 submissions with 6 judges and $K=3$ will result in exactly 12 assignments per judge.

### 4.4 Failure Conditions
The algorithm safely fails and does not produce corrupt or partial assignments if:
- $K < 1$.
- Active judges count $< K$.
- For any submission, candidate pool after COI filtering has $< K$ judges. In this case, detailed diagnostics report the exact submission title and the specific conflict reasons.

---

## 5. Assignment Lifecycle: Preview vs. Finalization

```
Organizer opens Judging Console
             ↓
Configure Active Judge Pool & K
             ↓
Generate Assignment Preview (POST /preview)
  - Evaluates algorithm purely in memory
  - Displays projected workload distribution
  - Flags any unassignable submissions or warnings
  - Does NOT alter existing finalized assignments
             ↓
Organizer reviews & verifies
             ↓
Finalize Assignments (POST /finalize)
  - Executes in a single PostgreSQL database transaction (BEGIN ... COMMIT)
  - Replaces active assignment records atomically
  - Updates hackathon_judging_configs.assignments_finalized = TRUE
  - Emits immutable audit log (ASSIGNMENTS_FINALIZED or ASSIGNMENTS_REGENERATED)
             ↓
Judges access official queue (/judge/assignments)
```

### Safe Regeneration
- If assignments are already finalized, generating a **preview** does not affect the official assignments in the database.
- Calling `/finalize` on an already finalized hackathon requires `forceRegenerate: true`. Attempting to overwrite finalized assignments without this explicit flag returns `409 ASSIGNMENTS_ALREADY_FINALIZED`.
- Any official regeneration is logged to the audit trail as `ASSIGNMENTS_REGENERATED`.

---

## 6. Access Control & Privacy Boundaries

1. **Role Enforcement**:
   - `ORGANIZER` / `ADMIN`: Can manage judges, declare conflicts, generate previews, finalize assignments, and inspect all assignments for their hackathon.
   - `JUDGE`: Can only view their own assigned projects (`/judge/my-assignments`). Cannot view other judges' assignments, modify assignments, or view organizer configuration.
   - `PARTICIPANT`: Strictly blocked from all judging endpoints (returns `403 Forbidden`).
2. **IDOR Protection**:
   - Accessing `/judge/assignments/:assignmentId` verifies that `assignment.judge_id === req.user.id`. A judge attempting to query an assignment belonging to another judge receives `403 FORBIDDEN`.
3. **Data Minimization**:
   - Judge API responses return sanitized DTOs exposing project title, tagline, description, tech stack, code repository, and live demo.
   - Private participant emails, internal team invite codes, other judges' identities, and organizer notes are strictly omitted.

---

## 7. Audit Logging

Every state-changing judge operation records an immutable entry in `audit_logs`:

| Action | Entity Type | Details Recorded |
| :--- | :--- | :--- |
| `JUDGE_ADDED` | `HACKATHON_JUDGE` | `hackathonId`, `judgeId`, initial status |
| `JUDGE_ACTIVATED` | `HACKATHON_JUDGE` | `hackathonId`, `judgeId`, old status, new status |
| `JUDGE_DEACTIVATED` | `HACKATHON_JUDGE` | `hackathonId`, `judgeId`, old status, new status |
| `JUDGE_REMOVED` | `HACKATHON_JUDGE` | `hackathonId`, `judgeId` |
| `JUDGING_CONFIG_UPDATED` | `JUDGING_CONFIG` | `hackathonId`, `judgesPerSubmission` |
| `ASSIGNMENTS_PREVIEW_GENERATED` | `JUDGE_ASSIGNMENTS` | `hackathonId`, `totalSubmissions`, `totalAssignments` |
| `ASSIGNMENTS_FINALIZED` | `JUDGE_ASSIGNMENTS` | `hackathonId`, `persistedCount`, `judgesPerSubmission` |
| `ASSIGNMENTS_REGENERATED` | `JUDGE_ASSIGNMENTS` | `hackathonId`, `persistedCount`, overwrite confirmation |
