from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document, Insert, PydanticObjectId, Replace, before_event
from pymongo import ASCENDING, DESCENDING, IndexModel
from pydantic import Field

from app.models.common import timestamps_for_insert, timestamps_for_replace, utc_now


class JobType(str, Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    internship = "internship"
    freelance = "freelance"


class ExperienceLevel(str, Enum):
    entry = "entry"
    mid = "mid"
    senior = "senior"
    lead = "lead"


class JobStatus(str, Enum):
    draft = "draft"
    pending_review = "pending_review"
    active = "active"
    closed = "closed"
    rejected = "rejected"


class JobPost(Document):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=20, max_length=10000)
    company_name: str = Field(min_length=1, max_length=120)
    company_logo_url: Optional[str] = None
    poster_id: PydanticObjectId
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
    status: JobStatus = JobStatus.pending_review
    application_count: int = 0
    save_count: int = 0
    rejection_reason: Optional[str] = None

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @before_event(Insert)
    def set_insert_timestamps(self) -> None:
        self.created_at, self.updated_at = timestamps_for_insert(self.created_at)

    @before_event(Replace)
    def touch_updated_at(self) -> None:
        self.created_at, self.updated_at = timestamps_for_replace(self.created_at)

    class Settings:
        name = "job_posts"
        indexes = [
            IndexModel([("status", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("poster_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("required_skills", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("tags", ASCENDING), ("status", ASCENDING)]),
        ]
