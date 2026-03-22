from datetime import datetime

from beanie import Document, Insert, PydanticObjectId, Replace, before_event
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.common import utc_now


class UserProfile(Document):
    user_id: PydanticObjectId
    headline: str | None = Field(default=None, max_length=120)
    about: str | None = Field(default=None, max_length=5000)
    avatar_public_id: str | None = Field(default=None, max_length=300)
    banner_url: str | None = Field(default=None, max_length=500)
    banner_public_id: str | None = Field(default=None, max_length=300)
    location: str | None = Field(default=None, max_length=120)
    website: str | None = Field(default=None, max_length=300)
    completion_percent: int = Field(default=0, ge=0, le=100)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @before_event([Insert, Replace])
    def update_timestamps(self) -> None:
        now = utc_now()
        if self.created_at is None:
            self.created_at = now
        self.updated_at = now

    class Settings:
        name = "user_profiles"
        indexes = [IndexModel([("user_id", ASCENDING)], unique=True)]
