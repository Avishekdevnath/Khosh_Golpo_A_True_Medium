# backend/app/models/saved_thread.py
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel
from app.models.common import utc_now


class SavedThread(Document):
    user_id: PydanticObjectId
    thread_id: PydanticObjectId
    saved_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "saved_threads"
        indexes = [
            IndexModel(
                [("user_id", ASCENDING), ("thread_id", ASCENDING)],
                unique=True,
            ),
            IndexModel([("user_id", ASCENDING)]),
        ]
