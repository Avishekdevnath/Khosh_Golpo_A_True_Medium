from datetime import datetime

from beanie import Document, Insert, PydanticObjectId, Replace, before_event
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.common import utc_now


class UserProfileLayout(Document):
    user_id: PydanticObjectId
    middle_order: list[str] = Field(default_factory=lambda: ["projects", "skills", "certifications"])
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @before_event([Insert, Replace])
    def update_timestamps(self) -> None:
        now = utc_now()
        if self.created_at is None:
            self.created_at = now
        self.updated_at = now

    class Settings:
        name = "user_profile_layout"
        indexes = [IndexModel([("user_id", ASCENDING)], unique=True)]
