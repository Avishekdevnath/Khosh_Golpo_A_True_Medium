from app.models.appeal import ModerationAppeal
from app.models.job_post import JobPost, JobType, ExperienceLevel, JobStatus
from app.models.job_application import JobApplication, SavedJob, ApplicationStage, STAGE_TRANSITIONS, TERMINAL_STAGES
from app.models.job_report import JobReport, ReportReason, ReportStatus
from app.models.audit_log import AuditLog
from app.models.bot import BotConfig
from app.models.channel import Channel
from app.models.connection import Connection, MessageRequest
from app.models.conversation import Conversation
from app.models.conversation_read_state import ConversationReadState
from app.models.feed_config import FeedConfig
from app.models.feed_interest_job import FeedInterestSuggestionJob
from app.models.message import Message
from app.models.notification import Notification
from app.models.post import Post
from app.models.read_history import ReadHistory
from app.models.saved_thread import SavedThread
from app.models.thread import Thread
from app.models.user import User

DOCUMENT_MODELS = [
    User,
    Thread,
    Post,
    Notification,
    Connection,
    MessageRequest,
    Conversation,
    Message,
    ConversationReadState,
    ModerationAppeal,
    AuditLog,
    Channel,
    FeedConfig,
    FeedInterestSuggestionJob,
    BotConfig,
    SavedThread,
    ReadHistory,
    JobPost,
    JobApplication,
    SavedJob,
    JobReport,
]

__all__ = [
    "ModerationAppeal",
    "AuditLog",
    "BotConfig",
    "Channel",
    "Connection",
    "MessageRequest",
    "Conversation",
    "ConversationReadState",
    "FeedConfig",
    "FeedInterestSuggestionJob",
    "Message",
    "Notification",
    "Post",
    "ReadHistory",
    "SavedThread",
    "Thread",
    "User",
    "DOCUMENT_MODELS",
    "JobPost",
    "JobType",
    "ExperienceLevel",
    "JobStatus",
    "JobApplication",
    "SavedJob",
    "ApplicationStage",
    "STAGE_TRANSITIONS",
    "TERMINAL_STAGES",
    "JobReport",
    "ReportReason",
    "ReportStatus",
]
