from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from beanie import Document, Insert, PydanticObjectId, Replace, before_event
from pymongo import ASCENDING, DESCENDING, IndexModel
from pydantic import BaseModel, Field

from app.models.common import timestamps_for_insert, timestamps_for_replace, utc_now


class ApplicationStage(str, Enum):
    applied = "applied"
    screening = "screening"
    interview = "interview"
    offer = "offer"
    hired = "hired"
    rejected = "rejected"
    withdrawn = "withdrawn"


# Valid forward transitions — terminal stages have empty lists
STAGE_TRANSITIONS: dict[ApplicationStage, list[ApplicationStage]] = {
    ApplicationStage.applied:    [ApplicationStage.screening, ApplicationStage.rejected],
    ApplicationStage.screening:  [ApplicationStage.interview, ApplicationStage.rejected],
    ApplicationStage.interview:  [ApplicationStage.offer, ApplicationStage.rejected],
    ApplicationStage.offer:      [ApplicationStage.hired, ApplicationStage.rejected],
    ApplicationStage.hired:      [],
    ApplicationStage.rejected:   [],
    ApplicationStage.withdrawn:  [],
}

TERMINAL_STAGES = {ApplicationStage.hired, ApplicationStage.rejected, ApplicationStage.withdrawn}


class StageHistoryEntry(BaseModel):
    stage: ApplicationStage
    changed_at: datetime = Field(default_factory=utc_now)
    changed_by: str  # stringified user id
    note: Optional[str] = None


class JobApplication(Document):
    job_id: PydanticObjectId
    applicant_id: PydanticObjectId
    cover_letter: Optional[str] = Field(None, max_length=2000)
    resume_url: Optional[str] = None
    profile_snapshot: dict[str, Any] = Field(default_factory=dict)
    stage: ApplicationStage = ApplicationStage.applied
    stage_history: list[StageHistoryEntry] = Field(default_factory=list)
    employer_note: Optional[str] = None
    is_read_by_employer: bool = False
    is_read_by_candidate: bool = True

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @before_event(Insert)
    def set_insert_timestamps(self) -> None:
        self.created_at, self.updated_at = timestamps_for_insert(self.created_at)

    @before_event(Replace)
    def touch_updated_at(self) -> None:
        self.created_at, self.updated_at = timestamps_for_replace(self.created_at)

    class Settings:
        name = "job_applications"
        indexes = [
            IndexModel([("job_id", ASCENDING), ("stage", ASCENDING)]),
            IndexModel([("applicant_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel(
                [("job_id", ASCENDING), ("applicant_id", ASCENDING)],
                unique=True,
                name="unique_application",
            ),
        ]


class SavedJob(Document):
    user_id: PydanticObjectId
    job_id: PydanticObjectId
    created_at: datetime = Field(default_factory=utc_now)

    @before_event(Insert)
    def set_created_at(self) -> None:
        self.created_at = utc_now()

    class Settings:
        name = "saved_jobs"
        indexes = [
            IndexModel(
                [("user_id", ASCENDING), ("job_id", ASCENDING)],
                unique=True,
                name="unique_saved_job",
            ),
        ]
