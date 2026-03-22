from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document, Insert, PydanticObjectId, before_event
from pymongo import ASCENDING, DESCENDING, IndexModel
from pydantic import Field

from app.models.common import utc_now


class ReportReason(str, Enum):
    fake_job = "fake_job"
    misleading = "misleading"
    spam = "spam"
    inappropriate = "inappropriate"
    scam = "scam"
    other = "other"


class ReportStatus(str, Enum):
    pending = "pending"
    reviewed = "reviewed"
    actioned = "actioned"   # job was closed as a result
    dismissed = "dismissed"


class JobReport(Document):
    job_id: PydanticObjectId
    reported_by: PydanticObjectId
    reason: ReportReason
    details: Optional[str] = Field(None, max_length=500)
    status: ReportStatus = ReportStatus.pending
    reviewed_by: Optional[PydanticObjectId] = None
    admin_note: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @before_event(Insert)
    def set_created_at(self) -> None:
        self.created_at = utc_now()
        self.updated_at = utc_now()

    class Settings:
        name = "job_reports"
        indexes = [
            IndexModel([("status", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel(
                [("job_id", ASCENDING), ("reported_by", ASCENDING)],
                unique=True,
                name="unique_report",
            ),
        ]
