# Enhanced Job Application Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom screening questions, document link collection, and external career page redirect tracking to the job application flow.

**Architecture:** Embed `custom_questions` on the `JobPost` model and `custom_answers` on `JobApplication`. External career pages tracked via `is_external_redirect` flag on `JobApplication`, with a new `POST /redirect` endpoint. Frontend renders dynamic question fields in `JobApplyModal` and a question builder in `JobPostForm`.

**Tech Stack:** FastAPI + Beanie/Pydantic (backend), Next.js + React (frontend), MongoDB

**Spec:** `docs/superpowers/specs/2026-03-23-enhanced-job-application-flow.md`

---

## File Map

### Backend — Create/Modify

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/app/models/job_post.py` | Modify | Add `QuestionType`, `CustomQuestion`, new fields on `JobPost` |
| `backend/app/models/job_application.py` | Modify | Add `custom_answers`, `is_external_redirect` fields |
| `backend/app/schemas/job.py` | Modify | Add `CustomQuestionInput`, extend Create/Update/Out schemas |
| `backend/app/services/jobs.py` | Modify | Extend `apply_to_job()`, add `validate_custom_answers()` |
| `backend/app/routers/jobs.py` | Modify | Add `/redirect` endpoint, update helpers `_job_to_out`, `_app_to_out`, `my_applications` |

### Frontend — Create/Modify

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/lib/jobsApi.ts` | Modify | Add types + `redirectToJob()` function |
| `frontend/src/components/jobs/JobPostForm.tsx` | Modify | Add "Application Settings" section |
| `frontend/src/components/jobs/JobApplyModal.tsx` | Modify | Render dynamic custom question fields |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | Modify | External redirect button logic |
| `frontend/src/components/jobs/JobCard.tsx` | Modify | "External" chip for external-URL jobs |
| `frontend/src/components/jobs/KanbanCard.tsx` | Modify | Muted style + "External" tag for redirect apps |
| `frontend/src/app/(jobs)/jobs/applications/page.tsx` | Modify | "Redirected" badge in Applied tab |
| `frontend/src/components/jobs/MyJobDetailPanel.tsx` | Modify | Custom questions summary + external URL note for employer |
| `frontend/src/hooks/useJobs.ts` | Modify (if needed) | Extend apply hook arg type for `custom_answers` |

### Seed Data

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/scripts/seed_jobs.py` | Modify | Add jobs with custom questions + 1 external URL job |

---

## Task 1: Backend Models — Add new fields and types

**Files:**
- Modify: `backend/app/models/job_post.py:1-77`
- Modify: `backend/app/models/job_application.py:45-78`

- [ ] **Step 1: Add `QuestionType` enum and `CustomQuestion` model to `job_post.py`**

After the existing `JobStatus` enum (line 34), add:

```python
class QuestionType(str, Enum):
    short_text = "short_text"
    url = "url"
    yes_no = "yes_no"
    single_select = "single_select"
    multi_select = "multi_select"


class CustomQuestion(BaseModel):
    id: str
    label: str
    type: QuestionType
    required: bool = False
    options: list[str] = []
```

Add `BaseModel` to the pydantic import (line 9) if not already present: `from pydantic import BaseModel, Field`.

Note: `CustomQuestion` (with required `id: str`) is the **stored/output** variant. The **input** variant (`CustomQuestionInput` with optional `id`) lives in `schemas/job.py`. The model file only needs the stored variant.

- [ ] **Step 2: Add new fields to `JobPost` model**

After `rejection_reason` field (around line 57), add:

```python
    custom_questions: list[CustomQuestion] = []
    external_apply_url: Optional[str] = None
```

Add `Optional` to the imports from `typing` if not already present.

- [ ] **Step 3: Add new fields to `JobApplication` model**

In `backend/app/models/job_application.py`, after `is_read_by_candidate` field (around line 57), add:

```python
    custom_answers: dict[str, Any] = {}
    is_external_redirect: bool = False
```

Add `Any` to the imports from `typing` if not already present.

- [ ] **Step 4: Verify models load**

Run: `cd backend && python -c "from app.models.job_post import JobPost, CustomQuestion, QuestionType; from app.models.job_application import JobApplication; print('Models OK')"`

Expected: `Models OK`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/job_post.py backend/app/models/job_application.py
git commit -m "feat(models): add custom questions and external redirect fields"
```

---

## Task 2: Backend Schemas — Extend API contracts

**Files:**
- Modify: `backend/app/schemas/job.py:1-145`

- [ ] **Step 1: Add `CustomQuestionInput` and `CustomQuestion` output schemas**

After imports (line 10), add:

```python
from uuid import uuid4
from app.models.job_post import QuestionType


class CustomQuestionInput(BaseModel):
    id: Optional[str] = None
    label: str = Field(..., min_length=1, max_length=200)
    type: QuestionType
    required: bool = False
    options: list[str] = Field(default=[])

    @model_validator(mode="after")
    def validate_options(self):
        if self.type in (QuestionType.single_select, QuestionType.multi_select):
            if len(self.options) < 2:
                raise ValueError(f"{self.type.value} questions require at least 2 options")
        else:
            if self.options:
                raise ValueError(f"{self.type.value} questions must not have options")
        for opt in self.options:
            if len(opt) > 50:
                raise ValueError(f"Option '{opt[:20]}...' exceeds 50 characters")
        return self


class CustomQuestionOut(BaseModel):
    id: str
    label: str
    type: QuestionType
    required: bool
    options: list[str]
```

Add `model_validator` to the Pydantic imports and `Optional` to typing imports.

- [ ] **Step 2: Extend `JobPostCreate` with new fields**

After `application_deadline` field (around line 30), add:

```python
    custom_questions: list[CustomQuestionInput] = Field(default=[], max_length=10)
    external_apply_url: Optional[str] = None
```

- [ ] **Step 3: Extend `JobPostUpdate` with new fields**

After `application_deadline` field (around line 48), add:

```python
    custom_questions: Optional[list[CustomQuestionInput]] = None
    external_apply_url: Optional[str] = None
```

- [ ] **Step 4: Extend `JobPostOut` with new fields**

After `save_count` field (around line 78), add:

```python
    custom_questions: list[CustomQuestionOut] = []
    external_apply_url: Optional[str] = None
```

- [ ] **Step 5: Extend `ApplicationCreate` with `custom_answers`**

After `resume_url` field (around line 97), add:

```python
    custom_answers: dict[str, Any] = {}
```

Add `Any` to typing imports.

- [ ] **Step 6: Extend `ApplicationOut` with new fields**

After `is_read_by_candidate` field (around line 125), add:

```python
    custom_answers: dict[str, Any] = {}
    is_external_redirect: bool = False
```

- [ ] **Step 7: Extend `MyApplicationOut` with `is_external_redirect`**

After `updated_at` field (around line 145), add:

```python
    is_external_redirect: bool = False
```

- [ ] **Step 8: Verify schemas**

Run: `cd backend && python -c "from app.schemas.job import CustomQuestionInput, CustomQuestionOut, JobPostCreate, ApplicationCreate; print('Schemas OK')"`

Expected: `Schemas OK`

- [ ] **Step 9: Commit**

```bash
git add backend/app/schemas/job.py
git commit -m "feat(schemas): extend job and application schemas for custom questions"
```

---

## Task 3: Backend Service — Extend apply_to_job and add validation

**Files:**
- Modify: `backend/app/services/jobs.py:75-122`

- [ ] **Step 1: Add `validate_custom_answers` function**

Before `apply_to_job` (around line 73), add:

```python
def validate_custom_answers(
    answers: dict[str, Any],
    questions: list,
) -> dict[str, Any]:
    """Validate custom answers against job's custom questions.
    Returns cleaned answers dict (only matching question IDs kept)."""
    from urllib.parse import urlparse

    cleaned: dict[str, Any] = {}
    for q in questions:
        val = answers.get(q.id)
        if q.required and (val is None or val == "" or val == []):
            raise ValueError(f"Question '{q.label}' is required")
        if val is None:
            continue

        if q.type.value == "short_text":
            if not isinstance(val, str) or len(val) > 500:
                raise ValueError(f"'{q.label}': must be text (max 500 chars)")
        elif q.type.value == "url":
            if not isinstance(val, str):
                raise ValueError(f"'{q.label}': must be a URL string")
            parsed = urlparse(val)
            if not parsed.scheme or not parsed.netloc:
                raise ValueError(f"'{q.label}': must be a valid URL")
        elif q.type.value == "yes_no":
            if not isinstance(val, bool):
                raise ValueError(f"'{q.label}': must be true or false")
        elif q.type.value == "single_select":
            if val not in q.options:
                raise ValueError(f"'{q.label}': must be one of {q.options}")
        elif q.type.value == "multi_select":
            if not isinstance(val, list) or not all(v in q.options for v in val):
                raise ValueError(f"'{q.label}': all values must be from {q.options}")

        cleaned[q.id] = val
    return cleaned
```

- [ ] **Step 2: Extend `apply_to_job` signature and body**

Update the function signature (line 75-80) to accept `custom_answers`:

```python
async def apply_to_job(
    job: "JobPost",
    applicant: "User",
    cover_letter: Optional[str] = None,
    resume_url: Optional[str] = None,
    custom_answers: dict[str, Any] | None = None,
) -> "JobApplication":
```

After the duplicate check (around line 90), add the external URL guard:

```python
    if job.external_apply_url:
        raise ValueError("This job accepts applications through an external site")
```

Update the `JobApplication(...)` constructor (around line 94-107) to include:

```python
        custom_answers=custom_answers or {},
```

- [ ] **Step 3: Verify service loads**

Run: `cd backend && python -c "from app.services.jobs import apply_to_job, validate_custom_answers; print('Service OK')"`

Expected: `Service OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/jobs.py
git commit -m "feat(services): add custom answer validation and extend apply_to_job"
```

---

## Task 4: Backend Router — Update helpers and add redirect endpoint

**Files:**
- Modify: `backend/app/routers/jobs.py:38-518`

- [ ] **Step 1: Update `_job_to_out` helper**

In `_job_to_out()` (lines 38-79), add two new fields to the `JobPostOut(...)` return:

```python
        custom_questions=job.custom_questions,
        external_apply_url=job.external_apply_url,
```

Add them after `save_count=job.save_count` (around line 75).

- [ ] **Step 2: Update `_app_to_out` helper**

In `_app_to_out()` (lines 121-146), add two new fields to the `ApplicationOut(...)` return:

```python
        custom_answers=app.custom_answers,
        is_external_redirect=app.is_external_redirect,
```

Add them after `is_read_by_candidate=app.is_read_by_candidate` (around line 143).

- [ ] **Step 3: Update `my_applications` endpoint**

In the `my_applications` endpoint (lines 504-517), update the `MyApplicationOut(...)` construction to include:

```python
            is_external_redirect=a.is_external_redirect,
```

Add after `updated_at=a.updated_at` (around line 516).

- [ ] **Step 4: Update apply endpoint to pass `custom_answers`**

In the apply endpoint (lines 363-381), add imports at the top of the file:

```python
from app.services.jobs import validate_custom_answers
```

Update the endpoint body. After fetching the job (line 371), add the external URL guard and validation:

```python
        # Block internal apply for external-URL jobs
        if job.external_apply_url:
            raise HTTPException(400, "This job accepts applications through an external site")
        # Validate custom answers against job's questions
        cleaned_answers = {}
        if body.custom_answers and job.custom_questions:
            cleaned_answers = validate_custom_answers(body.custom_answers, job.custom_questions)
```

Update the `apply_to_job` call to pass `custom_answers=cleaned_answers`.

- [ ] **Step 5: Update create/update endpoints to assign question IDs**

Add import at top of file:

```python
from uuid import uuid4
from app.models.job_post import CustomQuestion as CustomQuestionModel
```

In the `create_job` endpoint (around line 196-207), **before** constructing the `JobPost`, assign UUIDs to questions in the payload dict. Since `CustomQuestion.id` is a required `str`, IDs must exist before model construction:

```python
        data = body.model_dump()
        # Assign UUIDs to new custom questions before model construction
        for q in data.get("custom_questions", []):
            if not q.get("id"):
                q["id"] = str(uuid4())
        job = JobPost(poster_id=current_user.id, **data)
```

In `update_job` endpoint (around line 254-273), assign IDs before `setattr`:

```python
        update_data = body.model_dump(exclude_none=True)
        # Assign UUIDs to new custom questions
        if "custom_questions" in update_data:
            for q in update_data["custom_questions"]:
                if not q.get("id"):
                    q["id"] = str(uuid4())
        for k, v in update_data.items():
            setattr(job, k, v)
```

- [ ] **Step 6: Add `POST /{job_id}/redirect` endpoint**

After the `withdraw_application` endpoint (around line 487), add:

```python
@router.post("/{job_id}/redirect", response_model=ApplicationOut, status_code=201)
async def redirect_to_external(
    job_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Track that a user clicked through to an external career page."""
    job = await JobPost.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.external_apply_url:
        raise HTTPException(400, "This job does not have an external application URL")

    # Check for existing application (internal or external) — return as-is, don't flip flags
    existing = await JobApplication.find_one(
        JobApplication.job_id == job.id,
        JobApplication.applicant_id == current_user.id,
    )
    if existing:
        from starlette.responses import JSONResponse
        out = _app_to_out(existing)
        return JSONResponse(content=out.model_dump(mode="json"), status_code=200)

    app = JobApplication(
        job_id=job.id,
        applicant_id=current_user.id,
        stage=ApplicationStage.applied,
        stage_history=[
            StageHistoryEntry(
                stage=ApplicationStage.applied,
                changed_by=str(current_user.id),
                note="Redirected to external career page",
            )
        ],
        is_external_redirect=True,
        # profile_snapshot left empty — external redirects don't capture profile
    )
    await app.insert()
    # Atomic increment — matches pattern in services/jobs.py
    await JobPost.find_one(JobPost.id == job.id).update({"$inc": {"application_count": 1}})

    return _app_to_out(app)
```

Uses `get_current_user` (matching all other endpoints), `PydanticObjectId` for `job_id`, atomic `$inc` for count increment, and omits `changed_at` (uses `StageHistoryEntry` default). Returns `200` for duplicates, `201` for new records.

- [ ] **Step 7: Verify router loads**

Run: `cd backend && python -c "from app.routers.jobs import router; print('Router OK')"`

Expected: `Router OK`

- [ ] **Step 8: Commit**

```bash
git add backend/app/routers/jobs.py
git commit -m "feat(router): add redirect endpoint, extend helpers for custom questions"
```

---

## Task 5: Frontend Types — Extend API client

**Files:**
- Modify: `frontend/src/lib/jobsApi.ts`

- [ ] **Step 1: Add `QuestionType` and `CustomQuestion` types**

After `ReportReason` type (around line 30), add:

```typescript
export type QuestionType = "short_text" | "url" | "yes_no" | "single_select" | "multi_select";

export interface CustomQuestionInput {
  id?: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
}

export interface CustomQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
}
```

- [ ] **Step 2: Extend `JobPostOut` interface**

After `has_applied` field (around line 63), add:

```typescript
  custom_questions: CustomQuestion[];
  external_apply_url: string | null;
```

- [ ] **Step 3: Extend `ApplicationOut` interface**

After `is_read_by_candidate` field (around line 100), add:

```typescript
  custom_answers: Record<string, unknown>;
  is_external_redirect: boolean;
```

- [ ] **Step 4: Extend `MyApplicationOut` interface**

After `updated_at` field (around line 121), add:

```typescript
  is_external_redirect: boolean;
```

- [ ] **Step 5: Extend `createJob` input type**

In the `createJob` function's data parameter (around line 151-168), add:

```typescript
  custom_questions?: CustomQuestionInput[];
  external_apply_url?: string;
```

- [ ] **Step 6: Extend `applyToJob` to accept `custom_answers`**

Update the `applyToJob` function's data parameter (around line 203):

```typescript
export async function applyToJob(
  jobId: string,
  data: { cover_letter?: string; resume_url?: string; custom_answers?: Record<string, unknown> },
): Promise<ApplicationOut> {
  return api.post(`jobs/${jobId}/apply`, { json: data }).json();
}
```

- [ ] **Step 7: Add `redirectToJob` function**

After `applyToJob` function, add:

```typescript
export async function redirectToJob(jobId: string): Promise<void> {
  await api.post(`jobs/${jobId}/redirect`);
}
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/jobsApi.ts
git commit -m "feat(api): extend types and functions for custom questions and redirects"
```

---

## Task 6: Frontend — JobDetailPanel external redirect logic

**Files:**
- Modify: `frontend/src/components/jobs/JobDetailPanel.tsx:171-215`

- [ ] **Step 1: Add redirect handler and state**

After the existing state declarations (around line 41), add:

```typescript
  const [redirecting, setRedirecting] = useState(false);
```

Add import for `redirectToJob` from `@/lib/jobsApi`:

```typescript
import { saveJob, unsaveJob, redirectToJob } from "@/lib/jobsApi";
```

Add a redirect handler after `toggleSave`:

```typescript
  async function handleRedirect() {
    if (!job.external_apply_url) return;
    setRedirecting(true);
    // Fire-and-forget tracking — don't block the user
    redirectToJob(job.id).catch(() => {});
    window.open(job.external_apply_url, "_blank");
    setApplied(true);
    setRedirecting(false);
  }
```

- [ ] **Step 2: Update the Apply button area**

Replace the apply button logic (around lines 184-195). Change:

```tsx
            {applied ? (
              <span className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#3dd68c] bg-[#3dd68c]/10 border border-[#3dd68c]/30 rounded-lg">
                <CheckCircle2 size={15} /> Applied
              </span>
            ) : (
              <button
                onClick={() => setApplyOpen(true)}
                className="px-5 py-2 text-[13px] font-medium bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0EA5E9]/90 transition-colors"
              >
                Apply Now
              </button>
            )}
```

To:

```tsx
            {applied ? (
              <span className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#3dd68c] bg-[#3dd68c]/10 border border-[#3dd68c]/30 rounded-lg">
                <CheckCircle2 size={15} /> {job.external_apply_url ? "Redirected" : "Applied"}
              </span>
            ) : job.external_apply_url ? (
              <button
                onClick={handleRedirect}
                disabled={redirecting}
                className="px-5 py-2 text-[13px] font-medium bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0EA5E9]/90 transition-colors disabled:opacity-50"
              >
                {redirecting ? "Redirecting..." : "Apply on Company Site"}
              </button>
            ) : (
              <button
                onClick={() => setApplyOpen(true)}
                className="px-5 py-2 text-[13px] font-medium bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0EA5E9]/90 transition-colors"
              >
                Apply Now
              </button>
            )}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/jobs/JobDetailPanel.tsx
git commit -m "feat(detail): add external redirect button for career page jobs"
```

---

## Task 7: Frontend — JobApplyModal dynamic question fields

**Files:**
- Modify: `frontend/src/components/jobs/JobApplyModal.tsx`

- [ ] **Step 1: Extend props to receive custom questions**

Update the Props interface to receive the job's custom questions:

```typescript
interface Props {
  job: JobPostOut;
  onClose: () => void;
  onApplied: () => void;
}
```

(It already receives `job` — the `custom_questions` come from `job.custom_questions`.)

- [ ] **Step 2: Add custom answers state**

After existing state (around line 18), add:

```typescript
  const [customAnswers, setCustomAnswers] = useState<Record<string, unknown>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
```

Add a helper to update answers:

```typescript
  function setAnswer(questionId: string, value: unknown) {
    setCustomAnswers((prev) => ({ ...prev, [questionId]: value }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }
```

- [ ] **Step 3: Add client-side validation**

Add a `validateAnswers` function:

```typescript
  function validateAnswers(): boolean {
    const errors: Record<string, string> = {};
    for (const q of job.custom_questions ?? []) {
      const val = customAnswers[q.id];
      if (q.required && (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0))) {
        errors[q.id] = "This field is required";
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }
```

- [ ] **Step 4: Update submit handler**

Update `handleSubmit` to include answers and validation:

```typescript
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAnswers()) return;
    setLoading(true);
    setError(null);
    try {
      await applyToJob(job.id, {
        cover_letter: coverLetter || undefined,
        resume_url: resumeUrl || undefined,
        custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
      });
      onApplied();
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit application");
    } finally {
      setLoading(false);
    }
  }
```

- [ ] **Step 5: Add dynamic question rendering**

After the resume URL input (around line 81), add a section for custom questions:

```tsx
          {/* Custom Questions */}
          {(job.custom_questions ?? []).length > 0 && (
            <div className="flex flex-col gap-4 mt-1">
              <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide">Screening Questions</p>
              {job.custom_questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-[13px] text-foreground mb-1.5">
                    {q.label}
                    {q.required && <span className="text-[#f06b6b] ml-0.5">*</span>}
                  </label>

                  {q.type === "short_text" && (
                    <textarea
                      maxLength={500}
                      rows={3}
                      value={(customAnswers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground resize-y"
                    />
                  )}

                  {q.type === "url" && (
                    <input
                      type="url"
                      placeholder="https://..."
                      value={(customAnswers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground"
                    />
                  )}

                  {q.type === "yes_no" && (
                    <div className="flex gap-4">
                      {[true, false].map((val) => (
                        <label key={String(val)} className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={customAnswers[q.id] === val}
                            onChange={() => setAnswer(q.id, val)}
                            className="accent-[#0EA5E9]"
                          />
                          {val ? "Yes" : "No"}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "single_select" && (
                    q.options.length <= 5 ? (
                      <div className="flex flex-col gap-1.5">
                        {q.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={customAnswers[q.id] === opt}
                              onChange={() => setAnswer(q.id, opt)}
                              className="accent-[#0EA5E9]"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <select
                        value={(customAnswers[q.id] as string) ?? ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground"
                      >
                        <option value="">Select...</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )
                  )}

                  {q.type === "multi_select" && (
                    <div className="flex flex-col gap-1.5">
                      {q.options.map((opt) => {
                        const selected = Array.isArray(customAnswers[q.id])
                          ? (customAnswers[q.id] as string[])
                          : [];
                        return (
                          <label key={opt} className="flex items-center gap-1.5 text-[13px] text-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected.includes(opt)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selected, opt]
                                  : selected.filter((v) => v !== opt);
                                setAnswer(q.id, next);
                              }}
                              className="accent-[#0EA5E9]"
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {validationErrors[q.id] && (
                    <p className="text-[12px] text-[#f06b6b] mt-1">{validationErrors[q.id]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/jobs/JobApplyModal.tsx
git commit -m "feat(apply-modal): render dynamic custom question fields"
```

---

## Task 8: Frontend — JobPostForm application settings section

**Files:**
- Modify: `frontend/src/components/jobs/JobPostForm.tsx`

- [ ] **Step 1: Add state for custom questions and external URL**

Extend the form state object (around line 21-39) to include:

```typescript
    external_apply_url: existing?.external_apply_url ?? "",
    custom_questions: existing?.custom_questions ?? [] as Array<{
      id?: string;
      label: string;
      type: string;
      required: boolean;
      options: string[];
    }>,
```

- [ ] **Step 2: Add question helper functions**

After the `addTag` function (around line 59), add:

```typescript
  function addQuestion() {
    if (form.custom_questions.length >= 10) return;
    set("custom_questions", [
      ...form.custom_questions,
      { label: "", type: "short_text", required: false, options: [] },
    ]);
  }

  function updateQuestion(idx: number, field: string, value: unknown) {
    const updated = [...form.custom_questions];
    updated[idx] = { ...updated[idx], [field]: value };
    // Reset options when switching away from select types
    if (field === "type" && value !== "single_select" && value !== "multi_select") {
      updated[idx].options = [];
    }
    // Ensure at least 2 empty options when switching TO select types
    if (field === "type" && (value === "single_select" || value === "multi_select")) {
      if (updated[idx].options.length < 2) {
        updated[idx].options = ["", ""];
      }
    }
    set("custom_questions", updated);
  }

  function removeQuestion(idx: number) {
    set("custom_questions", form.custom_questions.filter((_, i) => i !== idx));
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= form.custom_questions.length) return;
    const updated = [...form.custom_questions];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    set("custom_questions", updated);
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    const updated = [...form.custom_questions];
    const opts = [...updated[qIdx].options];
    opts[oIdx] = value;
    updated[qIdx] = { ...updated[qIdx], options: opts };
    set("custom_questions", updated);
  }

  function addOption(qIdx: number) {
    const updated = [...form.custom_questions];
    updated[qIdx] = { ...updated[qIdx], options: [...updated[qIdx].options, ""] };
    set("custom_questions", updated);
  }

  function removeOption(qIdx: number, oIdx: number) {
    const updated = [...form.custom_questions];
    updated[qIdx] = { ...updated[qIdx], options: updated[qIdx].options.filter((_, i) => i !== oIdx) };
    set("custom_questions", updated);
  }
```

- [ ] **Step 3: Update submit handler to include new fields**

In the `handleSubmit` payload construction (around line 66-84), add:

```typescript
      external_apply_url: form.external_apply_url || undefined,
      custom_questions: form.custom_questions.length > 0
        ? form.custom_questions.map((q) => ({
            ...(q.id ? { id: q.id } : {}),
            label: q.label,
            type: q.type,
            required: q.required,
            options: q.options.filter((o) => o.trim() !== ""),
          }))
        : undefined,
```

- [ ] **Step 4: Add the Application Settings UI section**

After the application deadline input (around line 310), before the submit button, add:

```tsx
        {/* ── Application Settings ── */}
        <div className="border-t border-border pt-5 mt-2">
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Application Settings</h3>

          {/* External Career Page URL */}
          <div className="mb-5">
            <label className="block text-[13px] text-foreground mb-1">External Career Page URL</label>
            <input
              type="url"
              placeholder="https://careers.yourcompany.com/apply/..."
              value={form.external_apply_url}
              onChange={(e) => set("external_apply_url", e.target.value)}
              className={inputClass}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              If set, applicants will be redirected to this URL instead of using the built-in form.
            </p>
          </div>

          {/* Custom Screening Questions */}
          <div className={form.external_apply_url ? "opacity-50 pointer-events-none" : ""}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[13px] text-foreground font-medium">
                Screening Questions
                <span className="text-muted-foreground font-normal ml-1">({form.custom_questions.length}/10)</span>
              </label>
              <button
                type="button"
                onClick={addQuestion}
                disabled={form.custom_questions.length >= 10}
                className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add Question
              </button>
            </div>

            {form.external_apply_url && (
              <p className="text-[12px] text-muted-foreground mb-3">
                Custom questions are disabled when using an external application link.
              </p>
            )}

            <div className="flex flex-col gap-3">
              {form.custom_questions.map((q, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 bg-card">
                  <div className="flex items-start gap-2 mb-2">
                    {/* Type selector */}
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(idx, "type", e.target.value)}
                      className="h-8 bg-secondary border border-border rounded px-2 text-[12px] text-foreground shrink-0"
                    >
                      <option value="short_text">Short Text</option>
                      <option value="url">URL / Link</option>
                      <option value="yes_no">Yes / No</option>
                      <option value="single_select">Single Select</option>
                      <option value="multi_select">Multi Select</option>
                    </select>
                    {/* Label */}
                    <input
                      type="text"
                      placeholder="Enter your question"
                      maxLength={200}
                      value={q.label}
                      onChange={(e) => updateQuestion(idx, "label", e.target.value)}
                      className="flex-1 h-8 bg-secondary border border-border rounded px-2 text-[13px] text-foreground"
                    />
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}
                        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer disabled:opacity-30"
                        title="Move up">↑</button>
                      <button type="button" onClick={() => moveQuestion(idx, 1)} disabled={idx === form.custom_questions.length - 1}
                        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer disabled:opacity-30"
                        title="Move down">↓</button>
                      <button type="button" onClick={() => removeQuestion(idx)}
                        className="w-6 h-6 flex items-center justify-center text-[#f06b6b] hover:text-[#f06b6b]/80 border-0 bg-transparent cursor-pointer"
                        title="Delete">×</button>
                    </div>
                  </div>

                  {/* Required toggle */}
                  <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(idx, "required", e.target.checked)}
                      className="accent-[#0EA5E9]"
                    />
                    Required
                  </label>

                  {/* Options (for select types) */}
                  {(q.type === "single_select" || q.type === "multi_select") && (
                    <div className="pl-2 border-l-2 border-border ml-1">
                      <p className="text-[11px] text-muted-foreground mb-1.5">Options (min 2)</p>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5 mb-1">
                          <input
                            type="text"
                            maxLength={50}
                            placeholder={`Option ${oIdx + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                            className="flex-1 h-7 bg-secondary border border-border rounded px-2 text-[12px] text-foreground"
                          />
                          {q.options.length > 2 && (
                            <button type="button" onClick={() => removeOption(idx, oIdx)}
                              className="text-[#f06b6b] text-[14px] border-0 bg-transparent cursor-pointer">×</button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(idx)}
                        className="text-[11px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline mt-1">
                        + Add Option
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/jobs/JobPostForm.tsx
git commit -m "feat(post-form): add application settings with custom question builder"
```

---

## Task 9: Frontend — JobCard, KanbanCard, Applications page updates

**Files:**
- Modify: `frontend/src/components/jobs/JobCard.tsx`
- Modify: `frontend/src/components/jobs/KanbanCard.tsx`
- Modify: `frontend/src/app/(jobs)/jobs/applications/page.tsx`

- [ ] **Step 1: Add "External" chip to JobCard**

In `JobCard.tsx`, after the salary chip (around line 146-148), add:

```tsx
        {job.external_apply_url && (
          <span className="bg-[#f0834a]/10 text-[#f0834a] px-1.5 py-0.5 rounded text-[11px]">
            External
          </span>
        )}
```

- [ ] **Step 2: Add "External" tag and muted style to KanbanCard**

In `KanbanCard.tsx`, after the identity row (around line 53), add:

```tsx
          {application.is_external_redirect && (
            <span className="text-[11px] text-[#f0834a] bg-[#f0834a]/10 px-1.5 py-0.5 rounded mt-1 self-start">
              Applied via external link
            </span>
          )}
```

Update the card wrapper (around line 34) to add muted style for external:

```tsx
        className={`p-3 rounded-lg border transition-opacity ${
          application.is_external_redirect
            ? "border-border/60 bg-card/50 opacity-70"
            : "border-border bg-card"
        } ${isMoving ? "opacity-50" : ""}`}
```

- [ ] **Step 3: Add "Redirected" badge to Applications page**

In `frontend/src/app/(jobs)/jobs/applications/page.tsx`, update the `ApplicationRow` component (around lines 12-26). Replace the existing `ApplicationStatusBadge` or stage display with:

```tsx
      {app.is_external_redirect ? (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f0834a]/15 text-[#f0834a]">
          Redirected
        </span>
      ) : (
        <ApplicationStatusBadge stage={app.stage} />
      )}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/jobs/JobCard.tsx frontend/src/components/jobs/KanbanCard.tsx frontend/src/app/(jobs)/jobs/applications/page.tsx
git commit -m "feat(ui): external chip on cards, redirected badge on applications"
```

---

## Task 10: Frontend — Employer custom answer display in MyJobDetailPanel

**Files:**
- Modify: `frontend/src/components/jobs/MyJobDetailPanel.tsx`

- [ ] **Step 1: Add a custom answers display section**

After the "Applicant Breakdown" section (around line 128), add a new section that renders when the employer views a selected application's custom answers. Since `MyJobDetailPanel` shows the job overview (not individual applications), the custom answers display belongs in the `KanbanCard` expanded view or a separate detail modal. For now, add a section showing the job's custom questions summary:

After the applicant breakdown bar chart (line 128), before the job description `<details>`, add:

```tsx
      {/* Custom Questions Summary */}
      {job.custom_questions && job.custom_questions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">
            Screening Questions ({job.custom_questions.length})
          </h3>
          <div className="flex flex-col gap-1.5">
            {job.custom_questions.map((q) => (
              <div key={q.id} className="flex items-center gap-2 text-[12px]">
                <span className="px-1.5 py-0.5 rounded bg-border text-muted-foreground text-[10px] uppercase shrink-0">
                  {q.type.replace("_", " ")}
                </span>
                <span className="text-foreground truncate">{q.label}</span>
                {q.required && <span className="text-[#f06b6b] text-[10px] shrink-0">Required</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Application Note */}
      {job.external_apply_url && (
        <div className="mb-6 px-3 py-2 rounded-lg bg-[#f0834a]/5 border border-[#f0834a]/20">
          <p className="text-[12px] text-[#f0834a]">
            Applications are managed externally
          </p>
          <a
            href={job.external_apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-[#0EA5E9] hover:underline break-all"
          >
            {job.external_apply_url}
          </a>
        </div>
      )}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/jobs/MyJobDetailPanel.tsx
git commit -m "feat(employer-view): show custom questions summary and external URL note"
```

---

## Task 11: Frontend — Update useJobs hook type

**Files:**
- Modify: `frontend/src/hooks/useJobs.ts`

- [ ] **Step 1: Check if `useApply` or similar hook has a hardcoded arg type**

Search for `cover_letter` or `resume_url` in `useJobs.ts`. If there's a hook that wraps `applyToJob` with its own typed args (e.g., `{ cover_letter?: string; resume_url?: string }`), extend it to include `custom_answers?: Record<string, unknown>`.

If the hook just re-exports `applyToJob` from `jobsApi.ts`, no changes needed since Task 5 already updated the function signature there.

- [ ] **Step 2: Commit if changes were needed**

```bash
git add frontend/src/hooks/useJobs.ts
git commit -m "feat(hooks): extend apply hook type for custom answers"
```

---

## Task 12: Seed Data — Add test jobs with custom questions and external URL

**Files:**
- Modify: `backend/scripts/seed_jobs.py`

- [ ] **Step 1: Add imports for new types**

Add to imports:

```python
from app.models.job_post import CustomQuestion, QuestionType
```

- [ ] **Step 2: Add a job with custom questions to `JOB_DATA`**

Before the closed iOS job (the last entry), add:

```python
    {
        "title": "QA Engineer — Manual & Automation",
        "company_name": "DataPulse AI",
        "location": "Remote",
        "is_remote": True,
        "job_type": JobType.full_time,
        "experience_level": ExperienceLevel.mid,
        "salary_min": 70_000,
        "salary_max": 95_000,
        "salary_currency": "GBP",
        "salary_visible": True,
        "required_skills": ["Selenium", "Python", "CI/CD", "API Testing"],
        "tags": ["qa", "testing", "automation", "remote"],
        "description": (
            "Join our QA team to help ship reliable ML-powered products.\n\n"
            "**Responsibilities:**\n"
            "- Design and execute test plans for API and web applications\n"
            "- Write and maintain automated test suites (Selenium + pytest)\n"
            "- Integrate tests into CI/CD pipelines\n\n"
            "**Requirements:**\n"
            "- 3+ years QA experience with both manual and automated testing\n"
            "- Strong Python skills\n"
            "- Experience with REST API testing"
        ),
        "custom_questions": [
            CustomQuestion(id="q1", label="Do you have experience with ML model testing?", type=QuestionType.yes_no, required=True),
            CustomQuestion(id="q2", label="Which testing frameworks have you used?", type=QuestionType.multi_select, required=True, options=["Selenium", "Cypress", "Playwright", "pytest", "Jest"]),
            CustomQuestion(id="q3", label="Link to a test portfolio or GitHub with test examples", type=QuestionType.url, required=False),
        ],
        "application_deadline": future(days=20),
        "status": JobStatus.active,
        "created_at_offset": ago(days=3),
        "application_count": 4,
        "save_count": 11,
    },
```

- [ ] **Step 3: Add a job with external career page URL**

```python
    {
        "title": "Data Analyst — Growth Team",
        "company_name": "Nexora Labs",
        "location": "Berlin, Germany",
        "is_remote": False,
        "job_type": JobType.full_time,
        "experience_level": ExperienceLevel.mid,
        "salary_min": 65_000,
        "salary_max": 85_000,
        "salary_currency": "EUR",
        "salary_visible": True,
        "required_skills": ["SQL", "Python", "Looker", "dbt"],
        "tags": ["data", "analytics", "growth"],
        "description": (
            "Join our Growth team to turn data into product decisions.\n\n"
            "**Note:** This role uses our external application portal. "
            "Click 'Apply on Company Site' to submit your application through our careers page."
        ),
        "external_apply_url": "https://careers.nexoralabs.example.com/data-analyst",
        "application_deadline": future(days=35),
        "status": JobStatus.active,
        "created_at_offset": ago(days=6),
        "application_count": 15,
        "save_count": 20,
    },
```

- [ ] **Step 4: Update poster assignment**

Update the `poster_usernames` list to match the new total (10 jobs instead of 8). Current list is `["admin", "admin", "admin", "user1", "user1", "user2", "user2", "admin"]`. Add 2 entries for the 2 new jobs (QA Engineer by user2, Data Analyst by admin):

```python
    poster_usernames = ["admin", "admin", "admin", "user1", "user1", "user2", "user2", "user2", "admin", "admin"]
```

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/seed_jobs.py
git commit -m "feat(seed): add test jobs with custom questions and external URL"
```

---

## Task 13: TypeScript Check and Final Verification

- [ ] **Step 1: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit`

Fix any errors in jobs files (ignore pre-existing errors in AdminWorkspace, ThreadHeader, etc.).

- [ ] **Step 2: Test backend startup**

Run: `cd backend && python -c "from app.main import app; print('Backend OK')"`

- [ ] **Step 3: Run seed script**

Run: `cd backend && python -m scripts.seed_jobs`

Verify the new jobs with custom questions and external URL are inserted.

- [ ] **Step 4: Manual smoke test checklist**

- Browse `/jobs` — verify "External" chip shows on the Data Analyst card
- Click the Data Analyst job — verify "Apply on Company Site" button appears
- Click it — verify new tab opens (to example URL) and button changes to "Redirected"
- Click QA Engineer job — verify "Apply Now" opens modal with 3 screening questions
- Try submitting without answering required questions — verify validation errors
- Post a new job via `/jobs/post` — verify Application Settings section appears
- Add 2 custom questions + set an external URL — verify questions dim when URL is set

- [ ] **Step 5: Final commit**

```bash
git commit -m "chore: verify enhanced job application flow complete"
```
