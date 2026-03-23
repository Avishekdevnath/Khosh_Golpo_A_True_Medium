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
- Out of scope: AI-powered scoring, experience level inference, location matching, sorting/filtering by match score (future)

---

## Architecture

### Approach

Embed `match_score: int | None` directly in `JobPostOut`. The score is computed server-side during the existing `_enrich_jobs()` enrichment pass, so no extra API calls are needed on the frontend. Guests and users with no skills/tags receive `null` — the badge does not render.

---

## Backend

### 1. Scoring Service — `backend/app/services/matching.py`

New module with a single pure function:

```python
def compute_match_score(
    user_skill_names: list[str],      # lowercased, is_visible=True skills from UserSkill docs
    user_interest_tags: list[str],    # lowercased from User.interest_tags
    job: JobPost,
) -> int:  # 0–100, always rounded with round()
```

**Skills component (70 pts max)**

```python
job_skills = {s.lower().strip() for s in job.required_skills}
user_skills = set(user_skill_names)  # already lowercased

if not job_skills:
    skills_score = 70  # no required skills → full score, job is open to all
elif not user_skills:
    skills_score = 0   # user has no skills → 0, not null (null handled upstream)
else:
    matched = len(user_skills & job_skills)
    skills_score = round(matched / len(job_skills) * 70)  # denominator = job requirements
```

Formula: `matched / len(job.required_skills) * 70` — measures how many of the job's requirements the user satisfies. Capped at 70.

**Tags component (30 pts max)**

```python
job_tags = {t.lower().strip() for t in job.tags}
user_tags = set(user_interest_tags)  # already lowercased

if not job_tags:
    tags_score = 30   # no job tags → full score
elif not user_tags:
    tags_score = 0    # user has no interest tags → 0
else:
    matched = len(user_tags & job_tags)
    tags_score = round(matched / len(job_tags) * 30)
```

**Return:** `min(100, skills_score + tags_score)` as `int` (rounding via `round()` throughout)

---

### 2. Enrichment Integration — `backend/app/routers/jobs.py`

Modify `_enrich_jobs(jobs, current_user)`:

**Guest path (current_user is None):** already short-circuits before saved/applied lookups — add the same guard for match score. Set `match_score = None` for all jobs and return early from the match block.

**Authenticated path:**

```python
# Fetch only visible skills — one query for the whole batch
user_skills_docs = await UserSkill.find(
    UserSkill.user_id == current_user.id,
    UserSkill.is_visible == True
).to_list()
user_skill_names = [s.name.lower().strip() for s in user_skills_docs]
user_interest_tags = [t.lower().strip() for t in current_user.interest_tags]

# has_profile_data is a backend-internal variable — never serialised to the API response
# Only compute score if user has at least one signal (OR — either is enough)
has_profile_data = bool(user_skill_names or user_interest_tags)
# Note: a user with skills but no tags gets tags_score=0 (partial score shown)
# a user with tags but no skills gets skills_score=0 (partial score shown)
# only when BOTH are empty is match_score=null (badge hidden)
```

For each job:
- If `not has_profile_data` → `match_score = None`
- Else → `match_score = compute_match_score(user_skill_names, user_interest_tags, job)`

**Key:** `UserSkill` query runs once before the per-job loop — not N queries.

---

### 3. Schema Change — `backend/app/schemas/job.py`

Add one field to `JobPostOut`:

```python
match_score: int | None = None
```

Non-breaking — existing consumers ignore null fields.

---

## Frontend

### 1. TypeScript Type Update — `frontend/src/lib/jobsApi.ts`

Add `match_score` to the `JobPostOut` TypeScript interface:

```typescript
match_score: number | null;
```

Note: `?` (optional) is intentionally omitted — Pydantic always serializes the field (as `null` or an integer), so the key is always present in the response. Using `?` would create a false impression the field may be absent.

Without this, TypeScript either errors or silently drops the field before it reaches components.

### 2. `MatchBadge` Component — `frontend/src/components/jobs/MatchBadge.tsx`

Props: `score: number | null | undefined`, `size?: "sm" | "md"`

Renders **nothing** if `score` is `null` or `undefined`.

**Color tiers (existing project palette):**
| Score | Color | Style |
|-------|-------|-------|
| ≥ 70 | Green `#3dd68c` | `bg-[#3dd68c]/15 text-[#3dd68c]` |
| 40–69 | Orange `#f0834a` | `bg-[#f0834a]/15 text-[#f0834a]` |
| < 40 (including 0) | Muted | `bg-secondary text-muted-foreground` |

`0% match` uses the same muted style as any other sub-40 score — it is not hidden or specially styled. The distinction between `null` (no badge) and `0` (muted badge) is intentional: `0%` means the user has a profile but no overlap with this job.

**Display format:** `"{score}% match"` — e.g. `"73% match"`, `"0% match"`. Always includes the word "match" for clarity.

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
| Logged in, no skills AND no interest_tags | `match_score = null`, badge hidden |
| Logged in, has skills but zero overlap with job | `match_score = 0`, badge shows `0% match` in muted tier |
| Job has no `required_skills` | Skills component = 70pts full; tags scored normally |
| Job has no `tags` | Tags component = 30pts full; skills scored normally |
| User has skills but job has no `required_skills` AND no tags | Score = 100 (job is fully open) |
| `UserSkill.is_visible = False` | Excluded from match — hidden skills don't inflate score |
| Logged in, has skills but no interest_tags | Score computed: skills contribute up to 70pts, tags_score=0 — partial score shown |
| Logged in, has interest_tags but no skills | Score computed: tags contribute up to 30pts, skills_score=0 — partial score shown |

---

## Data Flow

```
GET /jobs (authenticated)
  └─ _enrich_jobs(jobs, current_user)
       ├─ if no current_user → match_score = null for all
       ├─ fetch UserSkill(user_id, is_visible=True) → 1 query
       ├─ read current_user.interest_tags → in-memory, 0 queries
       ├─ if no skills AND no tags → match_score = null for all
       └─ else → compute_match_score(skills, tags, job) per job → int 0–100

JobPostOut.match_score: int | None

Frontend:
  JobCard      → <MatchBadge score={job.match_score} />
  JobDetailPanel → <MatchBadge score={job.match_score} size="md" />
```

---

## Files Changed

| File | Change |
|------|--------|
| `backend/app/services/matching.py` | **Create** — pure scoring function |
| `backend/app/routers/jobs.py` | **Modify** — `_enrich_jobs()` fetch skills + compute scores |
| `backend/app/schemas/job.py` | **Modify** — add `match_score: int | None = None` to `JobPostOut` |
| `frontend/src/lib/jobsApi.ts` | **Modify** — add `match_score?: number | null` to `JobPostOut` interface |
| `frontend/src/components/jobs/MatchBadge.tsx` | **Create** — shared badge component |
| `frontend/src/components/jobs/JobCard.tsx` | **Modify** — render `<MatchBadge>` in tags row |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | **Modify** — render `<MatchBadge>` in metadata block |

---

## What's Explicitly Out of Scope

- Sorting or filtering jobs by match score
- Experience level scoring (needs explicit "years of experience" field on user profile)
- Location matching (needs extra `UserProfile` DB fetch — not worth it)
- AI-powered match explanation
- Employer-side match view
