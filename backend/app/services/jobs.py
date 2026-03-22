"""Business logic for the job board: apply, stage moves, notifications."""
from __future__ import annotations

from typing import Any, Optional

from beanie import PydanticObjectId

from app.models.common import utc_now
from app.models.job_application import (
    ApplicationStage,
    JobApplication,
    STAGE_TRANSITIONS,
    StageHistoryEntry,
)
from app.models.job_post import JobPost, JobStatus
from app.models.notification import Notification, NotificationType
from app.models.user import User


async def _send_notification(
    recipient_id: PydanticObjectId,
    actor_id: PydanticObjectId,
    notif_type: NotificationType,
    message: str,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    n = Notification(
        type=notif_type,
        recipient_id=recipient_id,
        actor_id=actor_id,
        message=message[:300],
        metadata=metadata or {},
    )
    await n.insert()


async def build_profile_snapshot(user: User) -> dict[str, Any]:
    """Capture a frozen snapshot of the user's profile at application time.

    Returns a plain dict — not a live reference — so it stays accurate even
    if the user edits their profile later.
    """
    from app.models.user_skill import UserSkill
    from app.models.user_experience import UserExperience
    from app.models.user_education import UserEducation
    from app.models.user_profile import UserProfile

    profile = await UserProfile.find_one(UserProfile.user_id == user.id)
    skills = await UserSkill.find(UserSkill.user_id == user.id).to_list()
    experiences = await UserExperience.find(UserExperience.user_id == user.id).to_list()
    educations = await UserEducation.find(UserEducation.user_id == user.id).to_list()

    basics = profile.basics if profile and hasattr(profile, "basics") else None

    return {
        "display_name": user.display_name,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "headline": basics.headline if basics else None,
        "location": basics.location if basics else None,
        "website": basics.website if basics else None,
        "skills": [s.name for s in skills],
        "experience": [
            {"title": e.title, "company": e.company}
            for e in experiences
        ],
        "education": [
            {"degree": e.degree, "institution": e.institution}
            for e in educations
        ],
    }


async def apply_to_job(
    job: JobPost,
    applicant: User,
    cover_letter: Optional[str],
    resume_url: Optional[str],
) -> JobApplication:
    """Create a job application. Raises ValueError on duplicates or closed jobs."""
    if job.status != JobStatus.active:
        raise ValueError("Job is not accepting applications")

    existing = await JobApplication.find_one(
        JobApplication.job_id == job.id,
        JobApplication.applicant_id == applicant.id,
    )
    if existing:
        raise ValueError("Already applied to this job")

    snapshot = await build_profile_snapshot(applicant)

    app = JobApplication(
        job_id=job.id,
        applicant_id=applicant.id,
        cover_letter=cover_letter,
        resume_url=resume_url,
        profile_snapshot=snapshot,
        stage=ApplicationStage.applied,
        stage_history=[
            StageHistoryEntry(
                stage=ApplicationStage.applied,
                changed_by=str(applicant.id),
            )
        ],
    )
    await app.insert()

    # Increment cached counter on the job
    await JobPost.find_one(JobPost.id == job.id).update({"$inc": {"application_count": 1}})

    # Notify the job poster
    await _send_notification(
        recipient_id=job.poster_id,
        actor_id=applicant.id,
        notif_type=NotificationType.SYSTEM,
        message=f"New application for '{job.title[:60]}' from {applicant.display_name}",
        metadata={"job_id": str(job.id), "link": f"/jobs/{job.id}/manage"},
    )

    return app


async def move_stage(
    app: JobApplication,
    new_stage: ApplicationStage,
    moved_by_id: PydanticObjectId,
    note: Optional[str],
) -> JobApplication:
    """Move an application to a new stage. Raises ValueError on invalid transitions."""
    allowed = STAGE_TRANSITIONS.get(app.stage, [])
    if new_stage not in allowed:
        raise ValueError(f"Cannot move from '{app.stage}' to '{new_stage}'")

    entry = StageHistoryEntry(
        stage=new_stage,
        changed_by=str(moved_by_id),
        note=note,
    )
    app.stage = new_stage
    app.stage_history.append(entry)
    app.employer_note = note
    app.is_read_by_candidate = False
    app.updated_at = utc_now()
    await app.replace()

    # Notify applicant
    job = await JobPost.get(app.job_id)
    if job:
        msg = f"Your application for '{job.title[:50]}' moved to {new_stage.value}"
        if note:
            msg = f"{msg}: {note[:80]}"
        await _send_notification(
            recipient_id=app.applicant_id,
            actor_id=moved_by_id,
            notif_type=NotificationType.SYSTEM,
            message=msg,
            metadata={"job_id": str(job.id), "link": "/profile/applications"},
        )

    return app
