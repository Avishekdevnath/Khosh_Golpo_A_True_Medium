from datetime import datetime
from enum import Enum

from beanie import Document, Insert, PydanticObjectId, Replace, before_event
from pydantic import Field

from app.models.common import utc_now


class ContactLinkType(str, Enum):
    WEBSITE = "website"
    PORTFOLIO = "portfolio"
    GITHUB = "github"
    LINKEDIN = "linkedin"
    EMAIL = "email"
    PHONE = "phone"
    OTHER = "other"


class UserContactLink(Document):
    user_id: PydanticObjectId
    type: ContactLinkType
    label: str | None = Field(default=None, max_length=80)
    value: str = Field(min_length=1, max_length=300)
    is_public: bool = True
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
        name = "user_contact_links"
        indexes = ["user_id", "sort_order", "type"]
