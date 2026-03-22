from datetime import datetime

from beanie import Document, Insert, PydanticObjectId, Replace, before_event
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.common import utc_now


class UserProfileVisibility(Document):
    user_id: PydanticObjectId
    show_about: bool = True
    show_experience: bool = True
    show_education: bool = True
    show_projects: bool = True
    show_skills: bool = True
    show_certifications: bool = True
    show_contact: bool = True
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @before_event([Insert, Replace])
    def update_timestamps(self) -> None:
        now = utc_now()
        if self.created_at is None:
            self.created_at = now
        self.updated_at = now

    class Settings:
        name = "user_profile_visibility"
        indexes = [IndexModel([("user_id", ASCENDING)], unique=True)]
