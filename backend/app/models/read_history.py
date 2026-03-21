# backend/app/models/read_history.py
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field
from app.models.common import utc_now


class ReadHistory(Document):
    user_id: PydanticObjectId
    thread_id: PydanticObjectId
    read_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "read_history"
        indexes = [
            ["user_id", "thread_id"],
            [("user_id", 1), ("read_at", -1)],
        ]
