from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator

from app.models.job_post import ExperienceLevel, JobStatus, JobType, QuestionType
from app.models.job_application import ApplicationStage, StageHistoryEntry
from app.models.job_report import ReportReason, ReportStatus


# ── Job Post ──────────────────────────────────────────────────────────────────

class CustomQuestionInput(BaseModel):
    id: Optional[str] = None
    label: str = Field(..., min_length=1, max_length=200)
    type: QuestionType
    required: bool = False
    options: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_options(self):
        if self.type in (QuestionType.single_select, QuestionType.multi_select):
            if len(self.options) < 2:
                raise ValueError(f"{self.type.value} questions require at least 2 options")
        elif self.options:
            raise ValueError(f"{self.type.value} questions must not have options")

        for option in self.options:
            if len(option) > 50:
                raise ValueError(f"Option '{option[:20]}...' exceeds 50 characters")

        return self


class CustomQuestionOut(BaseModel):
    id: str
    label: str
    type: QuestionType
    required: bool
    options: list[str]


class JobPostCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=20, max_length=10000)
    company_name: str = Field(min_length=1, max_length=120)
    company_logo_url: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool = False
    job_type: JobType = JobType.full_time
    experience_level: ExperienceLevel = ExperienceLevel.mid
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"
    salary_visible: bool = True
    required_skills: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    application_deadline: Optional[datetime] = None
    custom_questions: list[CustomQuestionInput] = Field(default_factory=list, max_length=10)
    external_apply_url: Optional[str] = None


class JobPostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=120)
    description: Optional[str] = Field(None, min_length=20, max_length=10000)
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    job_type: Optional[JobType] = None
    experience_level: Optional[ExperienceLevel] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    salary_visible: Optional[bool] = None
    required_skills: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    application_deadline: Optional[datetime] = None
    custom_questions: Optional[list[CustomQuestionInput]] = None
    external_apply_url: Optional[str] = None


class JobPosterOut(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None


class JobPostOut(BaseModel):
    id: str
    slug: str = ""
    title: str
    description: str
    company_name: str
    company_logo_url: Optional[str]
    poster_id: str
    poster: Optional[JobPosterOut] = None
    location: Optional[str]
    is_remote: bool
    job_type: JobType
    experience_level: ExperienceLevel
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: str
    salary_visible: bool
    required_skills: list[str]
    tags: list[str]
    application_deadline: Optional[datetime]
    status: JobStatus
    application_count: int
    save_count: int
    custom_questions: list[CustomQuestionOut] = Field(default_factory=list)
    external_apply_url: Optional[str] = None
    is_saved: bool = False
    has_applied: bool = False
    match_score: int | None = None
    created_at: datetime
    updated_at: datetime


class JobListResponse(BaseModel):
    data: list[JobPostOut]
    total: int
    page: int
    page_size: int


# ── Application ───────────────────────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    cover_letter: Optional[str] = Field(None, max_length=2000)
    resume_url: Optional[str] = None
    custom_answers: dict[str, Any] = Field(default_factory=dict)


class StageMove(BaseModel):
    stage: ApplicationStage
    note: Optional[str] = Field(None, max_length=1000)


class ApplicantUserOut(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    headline: Optional[str] = None


class ApplicationOut(BaseModel):
    id: str
    job_id: str
    applicant_id: str
    applicant: Optional[ApplicantUserOut] = None
    cover_letter: Optional[str]
    resume_url: Optional[str]
    profile_snapshot: dict[str, Any]
    stage: ApplicationStage
    stage_history: list[StageHistoryEntry]
    employer_note: Optional[str]
    is_read_by_employer: bool
    is_read_by_candidate: bool
    custom_answers: dict[str, Any] = Field(default_factory=dict)
    is_external_redirect: bool = False
    created_at: datetime
    updated_at: datetime


class ApplicationListResponse(BaseModel):
    data: list[ApplicationOut]
    total: int


class MyApplicationOut(BaseModel):
    """Candidate's view of their own application."""
    id: str
    job_id: str
    # Snapshot fields — always available even if job was deleted:
    job_title: str
    company_name: str
    company_logo_url: Optional[str] = None
    job_slug: str = ""
    job_location: Optional[str] = None
    job_is_remote: bool = False
    job_type: Optional[str] = None
    poster_display_name: Optional[str] = None
    poster_username: Optional[str] = None
    poster_avatar_url: Optional[str] = None
    job_deleted: bool = False
    # Application content:
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    custom_answers: dict[str, Any] = Field(default_factory=dict)
    # Status:
    stage: ApplicationStage
    stage_history: list[StageHistoryEntry]
    employer_note: Optional[str] = None
    is_read_by_candidate: bool = True
    is_external_redirect: bool = False
    created_at: datetime
    updated_at: datetime


# ── Report ────────────────────────────────────────────────────────────────────

class JobReportCreate(BaseModel):
    reason: ReportReason
    details: Optional[str] = Field(None, max_length=500)


class JobReportOut(BaseModel):
    id: str
    job_id: str
    reported_by: str
    reason: ReportReason
    details: Optional[str]
    status: ReportStatus
    admin_note: Optional[str] = None
    created_at: datetime
