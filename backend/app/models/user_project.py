from datetime import datetime

from beanie import Document, Insert, PydanticObjectId, Replace, before_event
from pydantic import Field

from app.models.common import utc_now


class UserProject(Document):
    user_id: PydanticObjectId
    name: str = Field(min_length=1, max_length=120)
    role: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    project_url: str | None = Field(default=None, max_length=300)
    repo_url: str | None = Field(default=None, max_length=300)
    start_date: str | None = Field(default=None, max_length=20)
    end_date: str | None = Field(default=None, max_length=20)
    is_ongoing: bool = False
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
        name = "user_projects"
        indexes = ["user_id", "sort_order"]
