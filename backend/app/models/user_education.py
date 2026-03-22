from datetime import datetime

from beanie import Document, Insert, PydanticObjectId, Replace, before_event
from pydantic import Field

from app.models.common import utc_now


class UserEducation(Document):
    user_id: PydanticObjectId
    school: str = Field(min_length=1, max_length=120)
    degree: str | None = Field(default=None, max_length=120)
    field_of_study: str | None = Field(default=None, max_length=120)
    start_date: str | None = Field(default=None, max_length=20)
    end_date: str | None = Field(default=None, max_length=20)
    is_current: bool = False
    description: str | None = Field(default=None, max_length=2000)
    sort_order: int = 0
    is_visible: bool = True
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @before_event([Insert, Replace])
    def update_timestamps(self) -> None:
        now = utc_now()
        if self.created_at is None:
            self.created_at = now
        self.updated_at = now

    class Settings:
        name = "user_education"
        indexes = ["user_id", "sort_order"]
