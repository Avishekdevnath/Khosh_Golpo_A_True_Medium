from datetime import datetime

from beanie import Document, Insert, PydanticObjectId, Replace, before_event
from pydantic import Field

from app.models.common import timestamps_for_insert, timestamps_for_replace, utc_now


class Post(Document):
    thread_id: PydanticObjectId
    author_id: PydanticObjectId
    parent_post_id: PydanticObjectId | None = None

    content: str = Field(min_length=1)
    mentions: list[str] = Field(default_factory=list)
    likes: list[PydanticObjectId] = Field(default_factory=list)

    ai_score: float | None = None
    is_flagged: bool = False
    is_deleted: bool = False

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @before_event(Insert)
    def set_insert_timestamps(self) -> None:
        self.created_at, self.updated_at = timestamps_for_insert(self.created_at)

    @before_event(Replace)
    def touch_updated_at(self) -> None:
        self.created_at, self.updated_at = timestamps_for_replace(self.created_at)

    class Settings:
        name = "posts"
        indexes = ["thread_id", "author_id", "parent_post_id", "created_at"]
