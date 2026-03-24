# Job Match Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a match percentage badge on every job card and job detail panel for logged-in users, so they can quickly assess fit without reading the full description.

**Architecture:** Embed `match_score: int | None` directly in `JobPostOut`. Computed server-side in the existing `_enrich_jobs()` enrichment pass (one `UserSkill` query for the whole batch, no extra API calls). `null` = no badge; `0–100` = show badge.

**Tech Stack:** FastAPI + Beanie/Motor (backend), Next.js + React 19 + Tailwind CSS (frontend)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/app/services/matching.py` | **Create** | Pure `compute_match_score()` function |
| `backend/app/schemas/job.py` | **Modify** | Add `match_score: int \| None = None` to `JobPostOut` |
| `backend/app/routers/jobs.py` | **Modify** | Fetch `UserSkill` docs + compute scores in `_enrich_jobs()` |
| `frontend/src/lib/jobsApi.ts` | **Modify** | Add `match_score: number \| null` to `JobPostOut` TS interface |
| `frontend/src/components/jobs/MatchBadge.tsx` | **Create** | Shared badge component |
| `frontend/src/components/jobs/JobCard.tsx` | **Modify** | Render `<MatchBadge>` in Row 3 (tags+salary row) |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | **Modify** | Render `<MatchBadge>` in metadata badges block |

---

### Task 1: Create scoring service

**Files:**
- Create: `backend/app/services/matching.py`

- [ ] **Step 1: Create the file**

```python
# backend/app/services/matching.py
from __future__ import annotations
from backend.app.models.job_post import JobPost


def compute_match_score(
    user_skill_names: list[str],  # lowercased, is_visible=True skills
    job: JobPost,
) -> int | None:
    """Return 0–100 match score, or None if job has no required_skills."""
    job_skills = {s.lower().strip() for s in job.required_skills}

    if not job_skills:
        return None   # no required_skills → badge would be meaningless

    if not user_skill_names:
        return 0      # user has no visible skills → 0% match

    user_skills = set(user_skill_names)
    matched = len(user_skills & job_skills)
    return round(matched / len(job_skills) * 100)
```

- [ ] **Step 2: Verify import path is correct**

Run from project root:
```bash
cd backend && python -c "from app.services.matching import compute_match_score; print(compute_match_score(['python'], type('J', (), {'required_skills': ['python', 'django']})()))"
```
Expected output: `50`

- [ ] **Step 3: Quick unit check**

```python
# Paste into a Python shell to verify edge cases:
from app.services.matching import compute_match_score

class FakeJob:
    def __init__(self, skills):
        self.required_skills = skills

assert compute_match_score([], FakeJob([])) is None        # no job skills → None
assert compute_match_score([], FakeJob(["python"])) == 0   # no user skills → 0
assert compute_match_score(["python"], FakeJob([])) is None # no job skills → None
assert compute_match_score(["python", "django"], FakeJob(["python", "django"])) == 100
assert compute_match_score(["python"], FakeJob(["python", "django"])) == 50
assert compute_match_score(["java"], FakeJob(["python"])) == 0
print("All assertions passed")
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/matching.py
git commit -m "feat(jobs): add compute_match_score pure function"
```

---

### Task 2: Add match_score field to JobPostOut schema

**Files:**
- Modify: `backend/app/schemas/job.py:117-119`

- [ ] **Step 1: Add field after `has_applied`**

In `backend/app/schemas/job.py`, find the `JobPostOut` class (around line 117):

```python
    is_saved: bool = False
    has_applied: bool = False
    created_at: datetime
    updated_at: datetime
```

Change to:
```python
    is_saved: bool = False
    has_applied: bool = False
    match_score: int | None = None
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 2: Verify Python parses cleanly**

```bash
cd backend && python -c "from app.schemas.job import JobPostOut; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/job.py
git commit -m "feat(jobs): add match_score field to JobPostOut schema"
```

---

### Task 3: Integrate scoring into _enrich_jobs()

**Files:**
- Modify: `backend/app/routers/jobs.py:96-131`

The current `_enrich_jobs()` function fetches `SavedJob` and `JobApplication` in batch when `current_user` is set. We add a `UserSkill` batch fetch and score computation in the same block.

- [ ] **Step 1: Add import for UserSkill and compute_match_score**

At the top of `backend/app/routers/jobs.py`, find the existing imports section. Add:

```python
from ..models.user_skill import UserSkill
from ..services.matching import compute_match_score
```

(Check existing model imports — `UserSkill` may need the correct relative path based on how other models are imported.)

- [ ] **Step 2: Modify _enrich_jobs() to fetch skills and compute scores**

Replace the `_enrich_jobs()` function body (lines ~96-131):

```python
async def _enrich_jobs(
    jobs: list[JobPost],
    current_user: Optional[User],
) -> list[JobPostOut]:
    """Attach poster info, is_saved, has_applied, match_score for a list of jobs."""
    if not jobs:
        return []

    poster_ids = list({job.poster_id for job in jobs})
    posters_list = await User.find({"_id": {"$in": poster_ids}}).to_list()
    posters: dict[PydanticObjectId, User] = {poster.id: poster for poster in posters_list}

    saved_ids: set[PydanticObjectId] = set()
    applied_ids: set[PydanticObjectId] = set()
    user_skill_names: list[str] = []

    if current_user:
        job_ids = [job.id for job in jobs]
        saved = await SavedJob.find(
            SavedJob.user_id == current_user.id,
            {"job_id": {"$in": job_ids}},
        ).to_list()
        saved_ids = {saved_job.job_id for saved_job in saved}
        applied = await JobApplication.find(
            JobApplication.applicant_id == current_user.id,
            {"job_id": {"$in": job_ids}},
        ).to_list()
        applied_ids = {application.job_id for application in applied}

        # Fetch only visible skills — one query for the whole batch
        user_skills_docs = await UserSkill.find(
            UserSkill.user_id == current_user.id,
            UserSkill.is_visible == True,
        ).to_list()
        user_skill_names = [s.name.lower().strip() for s in user_skills_docs]

    results = []
    for job in jobs:
        score = compute_match_score(user_skill_names, job) if current_user else None
        out = _job_to_out(
            job,
            is_saved=job.id in saved_ids,
            has_applied=job.id in applied_ids,
            poster=posters.get(job.poster_id),
        )
        out.match_score = score
        results.append(out)
    return results
```

- [ ] **Step 3: Verify server starts without error**

```bash
cd backend && fastapi dev app/main.py
```
Expected: Server starts, no import errors.

- [ ] **Step 4: Smoke test the endpoint**

With the dev server running, call `GET /jobs` (authenticated) and verify the response includes `match_score` field (either `null` or an integer).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/jobs.py
git commit -m "feat(jobs): compute match_score in _enrich_jobs enrichment pass"
```

---

### Task 4: Add match_score to TypeScript JobPostOut interface

**Files:**
- Modify: `frontend/src/lib/jobsApi.ts:82-84`

- [ ] **Step 1: Add field after has_applied**

In `frontend/src/lib/jobsApi.ts`, find the `JobPostOut` interface. After `has_applied: boolean;`, add:

```typescript
  match_score: number | null;
```

Result should look like:
```typescript
  is_saved: boolean;
  has_applied: boolean;
  match_score: number | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/jobsApi.ts
git commit -m "feat(jobs): add match_score to JobPostOut TS interface"
```

---

### Task 5: Create MatchBadge component

**Files:**
- Create: `frontend/src/components/jobs/MatchBadge.tsx`

Color tiers (from spec):
- ≥ 70 → Green `#3dd68c`: `bg-[#3dd68c]/15 text-[#3dd68c]`
- 40–69 → Orange `#f0834a`: `bg-[#f0834a]/15 text-[#f0834a]`
- < 40 (incl. 0) → Muted: `bg-secondary text-muted-foreground`

Size variants:
- `sm` (default): `text-[10.5px] px-2 py-0.5 rounded-full font-medium`
- `md`: `text-[12px] px-2.5 py-1 rounded-full font-medium`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/jobs/MatchBadge.tsx
interface Props {
  score: number | null | undefined;
  size?: "sm" | "md";
}

export default function MatchBadge({ score, size = "sm" }: Props) {
  if (score === null || score === undefined) return null;

  const colorClass =
    score >= 70
      ? "bg-[#3dd68c]/15 text-[#3dd68c]"
      : score >= 40
      ? "bg-[#f0834a]/15 text-[#f0834a]"
      : "bg-secondary text-muted-foreground";

  const sizeClass =
    size === "md"
      ? "text-[12px] px-2.5 py-1 rounded-full font-medium"
      : "text-[10.5px] px-2 py-0.5 rounded-full font-medium";

  return (
    <span className={`inline-flex items-center ${colorClass} ${sizeClass}`}>
      {score}% match
    </span>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/jobs/MatchBadge.tsx
git commit -m "feat(jobs): create MatchBadge component"
```

---

### Task 6: Integrate MatchBadge into JobCard

**Files:**
- Modify: `frontend/src/components/jobs/JobCard.tsx`

The badge goes in Row 3 (tags+salary row), inside the left flex group, after all other tags and before the salary span.

- [ ] **Step 1: Add import**

At the top of `frontend/src/components/jobs/JobCard.tsx`, add:
```tsx
import MatchBadge from "./MatchBadge";
```

- [ ] **Step 2: Add badge in Row 3 left flex group**

In Row 3, after the `has_applied` pill (around line 174), add `<MatchBadge>` as the last item in the left group, just before the closing `</div>`:

```tsx
          {job.has_applied && (
            <span className="text-[11px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {job.external_apply_url ? "✓ Redirected" : "✓ Applied"}
            </span>
          )}
          <MatchBadge score={job.match_score} />
        </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Visual check**

Run `npm run dev` and browse `/jobs` while logged in as a user with skills. Confirm badge appears on job cards with `required_skills`. Confirm no badge for guest users.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/jobs/JobCard.tsx
git commit -m "feat(jobs): render MatchBadge in JobCard tags row"
```

---

### Task 7: Integrate MatchBadge into JobDetailPanel

**Files:**
- Modify: `frontend/src/components/jobs/JobDetailPanel.tsx`

The badge goes in the metadata flex-wrap block at lines ~178-199, after the existing badge pills.

- [ ] **Step 1: Add import**

At the top of `frontend/src/components/jobs/JobDetailPanel.tsx`, add:
```tsx
import MatchBadge from "./MatchBadge";
```

- [ ] **Step 2: Add badge in metadata block**

In the metadata `<div className="flex flex-wrap gap-2 text-[12px] mb-4">` block (around line 178), add `<MatchBadge>` after the `salaryText` span:

```tsx
          {salaryText && (
            <span className="bg-[#3dd68c]/10 text-[#3dd68c] px-2 py-0.5 rounded-full font-medium">
              {salaryText}
            </span>
          )}
          <MatchBadge score={job.match_score} size="md" />
          {deadline && (
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Visual check**

Open a job detail panel while logged in. Confirm match badge appears alongside Remote/job-type/experience badges. Confirm size is slightly larger than the card badge.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/jobs/JobDetailPanel.tsx
git commit -m "feat(jobs): render MatchBadge in JobDetailPanel metadata block"
```

---

### Task 8: Full build verification

- [ ] **Step 1: Run full Next.js build**

```bash
cd frontend && npm run build
```
Expected: Clean build, no TypeScript or lint errors.

- [ ] **Step 2: Run backend sanity check**

```bash
cd backend && python -c "from app.services.matching import compute_match_score; from app.schemas.job import JobPostOut; print('Backend imports OK')"
```
Expected: `Backend imports OK`

- [ ] **Step 3: Commit if any lint fixes were needed**

```bash
git add -A
git commit -m "chore(jobs): fix any lint issues from match score integration"
```

---

## Edge Cases Summary

| Case | Expected |
|------|----------|
| Guest (not logged in) | `match_score = null` → no badge |
| Logged in, no visible skills | `match_score = 0` → muted "0% match" badge on jobs with required_skills |
| Job has no `required_skills` | `match_score = null` → no badge |
| Zero overlap (has skills, none match) | `match_score = 0` → muted "0% match" badge |
| Full overlap | `match_score = 100` → green "100% match" badge |
| `UserSkill.is_visible = False` | Excluded from score calculation |
