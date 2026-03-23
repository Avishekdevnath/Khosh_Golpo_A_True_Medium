# Enhanced Job Application Flow — Custom Questions, Doc Links & External Career Pages

**Date:** 2026-03-23
**Status:** Draft
**Approach:** Embedded in JobPost model (Approach A)

---

## Problem

Employers have three unmet needs in the current job posting system:

1. **Custom screening questions** — Employers can't ask applicants anything beyond a cover letter. Common needs: "Are you willing to relocate?", "Link to your portfolio", "Which tools have you used?"
2. **Document link collection** — Some employers want applicants to submit portfolio/doc links (Google Drive, Dropbox, GitHub) beyond just a resume URL.
3. **External career page** — Some employers manage hiring through their own ATS/career page and want "Apply" to redirect there, while still tracking interest on KhoshGolpo.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage approach | Embedded on JobPost | Questions are tightly coupled to the job; no reuse needed; follows existing patterns (`required_skills`, `tags`) |
| Question types | short_text, url, yes_no, single_select, multi_select | Covers 95%+ of real employer needs without building a form builder |
| File uploads | Not supported | Employers use `url` type for "Paste your Google Drive link" — same result, no storage complexity |
| External redirect tracking | Create a `JobApplication` with `is_external_redirect=True` | Reuses existing model; `has_applied` works automatically; applicant sees "Redirected" in their Applied tab |
| New pipeline stage for redirects | No — use boolean flag instead | `redirected` would pollute the Kanban board; a flag on the existing `applied` stage is cleaner |
| Question ID generation | Backend assigns UUIDs | Prevents duplicates; on update, existing questions matched by ID, new ones get fresh UUIDs |
| Max questions per job | 10 | Prevents abuse without being restrictive |

---

## Data Model

### New embedded type: `CustomQuestion`

Two schema variants:

```python
class QuestionType(str, Enum):
    short_text = "short_text"
    url = "url"
    yes_no = "yes_no"
    single_select = "single_select"
    multi_select = "multi_select"

# Input schema — used in JobPostCreate / JobPostUpdate (no id required)
class CustomQuestionInput(BaseModel):
    id: Optional[str] = None   # Omit for new questions; provide to keep existing question's ID on update
    label: str                 # Max 200 chars. e.g., "Are you willing to relocate?"
    type: QuestionType
    required: bool = False
    options: list[str] = []    # Only for single_select / multi_select. Min 2 when applicable. Max 50 chars each.

# Stored / output schema — always has id
class CustomQuestion(BaseModel):
    id: str                    # Backend-assigned UUID via str(uuid4())
    label: str
    type: QuestionType
    required: bool = False
    options: list[str] = []
```

Backend maps `CustomQuestionInput` → `CustomQuestion` by assigning `id = str(uuid4())` when `id` is None; preserves provided IDs on update.

### JobPost — new fields

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `custom_questions` | `list[CustomQuestion]` | `[]` | Max 10 screening questions defined by employer |
| `external_apply_url` | `Optional[str]` | `None` | If set, "Apply" redirects here; internal apply is blocked |

### JobApplication — new fields

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `custom_answers` | `dict[str, Any]` | `{}` | Keys = question `id`, values = typed answers |
| `is_external_redirect` | `bool` | `False` | True if applicant was redirected to external career page |

**Answer value types by question type:**

| QuestionType | Answer value type | Example |
|-------------|-------------------|---------|
| `short_text` | `str` (max 500 chars) | `"I'm passionate about..."` |
| `url` | `str` (valid URL) | `"https://drive.google.com/..."` |
| `yes_no` | `bool` | `true` |
| `single_select` | `str` (must be in options) | `"Immediate"` |
| `multi_select` | `list[str]` (all must be in options) | `["Figma", "Sketch"]` |

---

## API Changes

### Extended existing endpoints

#### `POST /jobs` and `PATCH /jobs/{id}`

Accept two new optional fields in `JobPostCreate` / `JobPostUpdate`:

```
custom_questions: list[CustomQuestionInput]   # validated per rules below
external_apply_url: Optional[str]             # validated as URL
```

**Custom questions validation (return `422` with descriptive errors on failure):**
- Max 10 questions
- `label`: non-empty, max 200 chars
- `options`: required and min 2 items for `single_select`/`multi_select`; must be empty for other types
- Each option: non-empty, max 50 chars
- Backend assigns `id = str(uuid4())` to questions where `id` is None; preserves provided IDs on update

#### `POST /jobs/{job_id}/apply`

Extended `ApplicationCreate`:

```
cover_letter: Optional[str]       # existing, max 2000 chars
resume_url: Optional[str]         # existing
custom_answers: dict[str, Any]    # NEW — default {}
```

**Validation (performed in service layer, not Pydantic schema — requires job's custom_questions):**
- If job has `external_apply_url` → reject with `400 Bad Request` ("This job accepts applications through an external site")
- Implement a `validate_custom_answers(answers: dict, questions: list[CustomQuestion])` function in `backend/app/services/jobs.py` and call it from the apply endpoint before creating the application
- For each question in job's `custom_questions`:
  - If `required=True`, answer must exist and be non-empty
  - Type-check answer value (see table above)
  - `single_select`: value must be in question's `options`
  - `multi_select`: all values must be in question's `options`
  - `url`: must be a valid URL
  - `short_text`: max 500 chars
- Extra answer keys (not matching any question ID) are silently ignored

### New endpoint

#### `POST /jobs/{job_id}/redirect`

Tracks that an applicant clicked through to an external career page.

- **Auth:** Required (logged-in user)
- **Guard:** Job must have `external_apply_url` set, else `400`
- **Duplicate guard:** If user already has an application for this job (internal or external), return existing record unchanged with `200 OK`. Do NOT flip `is_external_redirect` on an existing internal application.
- **Creates:** `JobApplication` with:
  - `is_external_redirect = True`
  - `stage = "applied"`
  - Empty `cover_letter`, `resume_url`, `custom_answers`
- **Side effect:** Increments job's `application_count` (only on new record, not on duplicate)
- **Response:** `201 Created` for new records, `200 OK` for existing records. Body: `ApplicationOut`

### Extended response schemas

**`JobPostOut`** — add:
- `custom_questions: list[CustomQuestion]`
- `external_apply_url: Optional[str]`

**`ApplicationOut`** — add:
- `custom_answers: dict[str, Any]`
- `is_external_redirect: bool`

**`MyApplicationOut`** — add:
- `is_external_redirect: bool`

### Implementation notes for response helpers

- **`_job_to_out()`** in `routers/jobs.py`: Pass `custom_questions` and `external_apply_url` from the JobPost model to JobPostOut.
- **`_app_to_out()`** in `routers/jobs.py`: Pass `custom_answers` and `is_external_redirect` from the JobApplication model to ApplicationOut.
- **`my_applications` endpoint** in `routers/jobs.py`: Include `is_external_redirect=a.is_external_redirect` when constructing `MyApplicationOut`.
- **`_enrich_jobs()`**: No changes needed. `has_applied` works automatically for both internal applications and external redirects since both create a `JobApplication` record.

---

## UI Changes

### A. JobPostForm — "Application Settings" section

Placed below the existing Tags section, before the submit button.

**External Career Page URL:**
- Text input with URL placeholder
- Hint text: "Applicants will be redirected to this URL instead of using the built-in application form"
- When filled, the custom questions section below is visually dimmed with an explanation ("Custom questions are disabled when using an external application link")

**Custom Screening Questions:**
- "Add Question" button (disabled when at 10 questions or when external URL is set)
- Each question rendered as a card with:
  - Type dropdown: Short Text / URL / Yes-No / Single Select / Multi Select
  - Label text input (placeholder: "Enter your question")
  - Required toggle (checkbox)
  - Options section: appears only when type is `single_select` or `multi_select`
    - Add/remove option inputs, min 2
    - Max 50 chars per option
  - Up/Down reorder buttons
  - Delete button
- Counter: "3/10 questions"

### B. JobDetailPanel + JobApplyModal — apply flow

**External redirect logic lives in `JobDetailPanel.tsx`** (not in the modal):

When job has `external_apply_url`:
- The "Apply Now" button text changes to "Apply on Company Site"
- Clicking it:
  1. Calls `POST /jobs/{job_id}/redirect` (fire-and-forget — don't block on failure)
  2. Opens `job.external_apply_url` in a new tab via `window.open()`
  3. Button changes to "Redirected" (disabled, green tint) — uses `has_applied` from job data
- The modal does NOT open at all

**`JobApplyModal.tsx` changes (internal apply only):**
- Existing fields remain at top: cover letter textarea + resume URL input
- Below them, render each custom question dynamically based on type:
  - `short_text` → `<textarea>` (max 500 chars, with char counter)
  - `url` → `<input type="url">` with URL validation hint
  - `yes_no` → Two radio buttons: Yes / No
  - `single_select` → Radio group (≤5 options) or `<select>` dropdown (>5 options)
  - `multi_select` → Checkbox group
- Required questions show red asterisk
- Submit button disabled until all required questions answered
- Validation errors shown inline per question

### C. Applied tab — "Redirected" badge

In `frontend/src/app/(jobs)/jobs/applications/page.tsx`:
- If `application.is_external_redirect === true`:
  - Show "Redirected" badge in orange (`bg-[#f0834a]/15 text-[#f0834a]`) instead of the normal stage pill
  - No stage history timeline (just "Redirected to company site" text)

### D. Employer pipeline — external applications

In KanbanBoard, applications with `is_external_redirect === true`:
- Appear in the "Applied" column with a subtle "External" chip/tag below the identity row
- Muted card style (reduced opacity or lighter border)
- Drag-to-move still works if employer wants to track progress manually
- No cover letter preview needed for external cards

### E. Employer application detail — custom answer display

When employer views an application (in `MyJobDetailPanel` or Kanban card expansion):
- Render `custom_answers` using the job's `custom_questions` for labels and formatting
- `yes_no` → display "Yes" / "No"
- `multi_select` → display comma-separated values
- `url` → render as clickable link
- `short_text` → display as plain text
- Questions that were deleted from the job but have answers → silently skip (don't display orphaned answers)

---

## Edge Cases

### Adding/removing `external_apply_url` on jobs with existing applications
- **Allowed.** Existing applications are not affected. New applicants follow the current configuration.
- Users who already have an application (internal or redirect) cannot create a second one due to the `(job_id, applicant_id)` unique index.

### Application deadline and external redirects
- The redirect endpoint does NOT enforce `application_deadline`. The external site is responsible for its own deadline handling.

### Employer edits questions after applications exist
- Allowed, but no migration of existing answers. Old answers may not match new question labels/options. This is acceptable — the answer data is preserved and viewable.

---

## Files to modify

### Backend
- `backend/app/models/job_post.py` — Add `CustomQuestion`, `CustomQuestionInput`, `QuestionType`, new fields on `JobPost`
- `backend/app/models/job_application.py` — Add `custom_answers`, `is_external_redirect`
- `backend/app/schemas/job.py` — Extend create/update/out schemas with new fields; add `CustomQuestionInput` for create
- `backend/app/services/jobs.py` — Extend `apply_to_job()` to accept and store `custom_answers`; add `validate_custom_answers()` function; add external URL guard
- `backend/app/routers/jobs.py` — Add `/redirect` endpoint; update `_job_to_out()` to pass `custom_questions` and `external_apply_url`; update `_app_to_out()` to pass `custom_answers` and `is_external_redirect`; update `my_applications` to include `is_external_redirect`

### Frontend
- `frontend/src/lib/jobsApi.ts` — Add `CustomQuestion`, `CustomQuestionInput`, `QuestionType` types; extend `JobPostOut`, `ApplicationOut`, `MyApplicationOut`; extend `createJob()` and `updateJob()` input types; add `redirectToJob()` API function
- `frontend/src/hooks/useJobs.ts` — No new hooks needed; `redirectToJob()` is fire-and-forget (called directly from component, not via SWR)
- `frontend/src/components/jobs/JobPostForm.tsx` — Add "Application Settings" section (external URL input + custom questions builder)
- `frontend/src/components/jobs/JobApplyModal.tsx` — Add dynamic question field rendering for custom_questions (internal apply only)
- `frontend/src/components/jobs/JobDetailPanel.tsx` — External redirect logic in button click handler; change button text/state for external jobs
- `frontend/src/components/jobs/JobCard.tsx` — Show "External" chip if `external_apply_url` is set
- `frontend/src/components/jobs/KanbanCard.tsx` — Muted style + "External" chip for redirect applications
- `frontend/src/components/jobs/MyJobDetailPanel.tsx` — Display custom answers when viewing an application (labels from job's questions, formatted by type)
- `frontend/src/app/(jobs)/jobs/applications/page.tsx` — "Redirected" badge in Applied tab

### Seed data
- `backend/scripts/seed_jobs.py` — Add 1-2 jobs with custom questions and 1 job with external URL for testing

---

## Out of scope

- File upload (use `url` question type instead)
- Question templates / reusable question banks
- Conditional questions (show question B only if question A answered "Yes")
- Rich text in question labels
- Editing questions after applications exist (allowed, but no migration of existing answers)
