# Job Match Score Feature — Design Spec

**Date:** 2026-03-24
**Status:** Approved

---

## Goal

Show a match percentage badge on every job card and job detail panel for logged-in users, so they can quickly assess how well a job fits their profile without reading the full description.

---

## Scope

- Backend: scoring service + enrichment integration + schema change
- Frontend: shared `MatchBadge` component + integration into `JobCard` and `JobDetailPanel`
- Out of scope: AI-powered scoring, experience level inference, location matching, tag-based matching, sorting/filtering by match score (future)

---

## Architecture

Embed `match_score: int | None` directly in `JobPostOut`. Computed server-side during the existing `_enrich_jobs()` enrichment pass — no extra API calls on the frontend. `null` means "no badge shown" (guest, no skills, or job has no `required_skills`).

---

## Backend

### 1. Scoring Service — `backend/app/services/matching.py`

New module with a single pure function:

```python
def compute_match_score(
    user_skill_names: list[str],  # lowercased, is_visible=True skills from UserSkill docs
    job: JobPost,
) -> int | None:  # 0–100, or None if job has no required_skills
```

**Skills only — 100pts**

```python
job_skills = {s.lower().strip() for s in job.required_skills}
user_skills = set(user_skill_names)  # already lowercased

if not job_skills:
    return None   # job has no required_skills → no badge (score would be meaningless)
if not user_skills:
    return 0      # user has no skills → 0% match

matched = len(user_skills & job_skills)
return round(matched / len(job_skills) * 100)
```

Formula: `matched / len(job.required_skills) * 100` — measures how many of the job's requirements the user satisfies. Rounding via `round()`. Result is always 0–100 or None.

---

### 2. Enrichment Integration — `backend/app/routers/jobs.py`

Modify `_enrich_jobs(jobs, current_user)`:

**Guest path (`current_user is None`):** already short-circuits — add `match_score = None` for all jobs and skip the block entirely.

**Authenticated path:**

```python
# has_profile_data is backend-internal — never serialised to the API response
# Fetch only visible skills — one query for the whole batch
user_skills_docs = await UserSkill.find(
    UserSkill.user_id == current_user.id,
    UserSkill.is_visible == True
).to_list()
user_skill_names = [s.name.lower().strip() for s in user_skills_docs]
```

For each job:
- Call `compute_match_score(user_skill_names, job)` → returns `int | None`
- Set `job_out.match_score = result`

**Key:** `UserSkill` query runs once before the per-job loop — not N queries.

---

### 3. Schema Change — `backend/app/schemas/job.py`

Add one field to `JobPostOut`:

```python
match_score: int | None = None
```

Non-breaking — existing consumers ignore null fields. Pydantic always serialises this field (as `null` or an integer) — it is never absent from the response.

---

## Frontend

### 1. TypeScript Type Update — `frontend/src/lib/jobsApi.ts`

Add to the `JobPostOut` TypeScript interface:

```typescript
match_score: number | null;
```

No `?` marker — the field is always present in the response (either a number or null).

### 2. `MatchBadge` Component — `frontend/src/components/jobs/MatchBadge.tsx`

Props: `score: number | null | undefined`, `size?: "sm" | "md"`

Renders **nothing** if `score` is `null` or `undefined`.

**Display format:** `"{score}% match"` — e.g. `"73% match"`, `"0% match"`. Always includes the word "match".

**Color tiers (existing project palette):**
| Score | Color | Style |
|-------|-------|-------|
| ≥ 70 | Green `#3dd68c` | `bg-[#3dd68c]/15 text-[#3dd68c]` |
| 40–69 | Orange `#f0834a` | `bg-[#f0834a]/15 text-[#f0834a]` |
| < 40 (including 0) | Muted | `bg-secondary text-muted-foreground` |

`0% match` uses the muted style — it is not hidden. The distinction between `null` (no badge) and `0` (muted badge) is intentional: `0%` means the user has a profile with skills but none overlap with this job's requirements.

**Size variants:**
- `sm` (default) — JobCard: `text-[10.5px] px-2 py-0.5 rounded-full font-medium`
- `md` — JobDetailPanel: `text-[12px] px-2.5 py-1 rounded-full font-medium`

### 3. `JobCard.tsx`

Place `<MatchBadge score={job.match_score} />` in the tags+salary row, left of the salary pill (salary is pinned right via `ml-auto`). Renders nothing for guests — no layout shift.

### 4. `JobDetailPanel.tsx`

Place `<MatchBadge score={job.match_score} size="md" />` in the metadata block alongside the Remote/location/experience badges near the top of the panel.

---

## Edge Cases

| Case | Behaviour |
|------|-----------|
| Guest (`current_user` is None) | `match_score = null`, badge hidden |
| Logged in, no visible skills | `match_score = 0` for all jobs that have `required_skills` |
| Job has no `required_skills` | `match_score = null`, badge hidden — score would be meaningless |
| Zero overlap (has skills, none match) | `match_score = 0`, shows `"0% match"` muted |
| Full overlap (all required skills matched) | `match_score = 100`, shows `"100% match"` green |
| `UserSkill.is_visible = False` | Excluded — hidden skills don't inflate score |

---

## Data Flow

```
GET /jobs (authenticated)
  └─ _enrich_jobs(jobs, current_user)
       ├─ if no current_user → match_score = null for all
       ├─ fetch UserSkill(user_id, is_visible=True) → 1 query
       └─ per job → compute_match_score(user_skill_names, job)
            ├─ job has no required_skills → null
            ├─ user has no skills → 0
            └─ else → round(matched / len(job_skills) * 100)

JobPostOut.match_score: int | None

Frontend:
  JobCard        → <MatchBadge score={job.match_score} />
  JobDetailPanel → <MatchBadge score={job.match_score} size="md" />
```

---

## Files Changed

| File | Change |
|------|--------|
| `backend/app/services/matching.py` | **Create** — pure scoring function |
| `backend/app/routers/jobs.py` | **Modify** — `_enrich_jobs()` fetch skills + compute scores |
| `backend/app/schemas/job.py` | **Modify** — add `match_score: int | None = None` to `JobPostOut` |
| `frontend/src/lib/jobsApi.ts` | **Modify** — add `match_score: number | null` to `JobPostOut` interface |
| `frontend/src/components/jobs/MatchBadge.tsx` | **Create** — shared badge component |
| `frontend/src/components/jobs/JobCard.tsx` | **Modify** — render `<MatchBadge>` in tags row |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | **Modify** — render `<MatchBadge>` in metadata block |

---

## What's Explicitly Out of Scope

- Tag-based matching (`user.interest_tags` vs `job.tags` — different taxonomies, unreliable signal)
- Sorting or filtering jobs by match score
- Experience level scoring (needs explicit "years of experience" field on user profile)
- Location matching (needs extra `UserProfile` DB fetch)
- AI-powered match explanation
- Employer-side match view
