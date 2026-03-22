"""Job board API — CRUD for job posts, applications, saved jobs, reports."""
from __future__ import annotations

from typing import Any, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.auth import get_current_user, get_optional_current_user, require_roles
from app.models.job_application import ApplicationStage, JobApplication, SavedJob, TERMINAL_STAGES
from app.models.job_post import JobPost, JobStatus
from app.models.job_report import JobReport, ReportStatus
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole
from app.models.common import utc_now
from app.schemas.job import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationOut,
    ApplicantUserOut,
    JobListResponse,
    JobPostCreate,
    JobPostOut,
    JobPostUpdate,
    JobPosterOut,
    JobReportCreate,
    JobReportOut,
    MyApplicationOut,
    StageMove,
)
from app.services.jobs import apply_to_job, move_stage

router = APIRouter(prefix="/jobs", tags=["jobs"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _job_to_out(
    job: JobPost,
    *,
    is_saved: bool = False,
    has_applied: bool = False,
    poster: Optional[User] = None,
) -> JobPostOut:
    poster_out = None
    if poster:
        poster_out = JobPosterOut(
            id=str(poster.id),
            username=poster.username,
            display_name=poster.display_name,
            avatar_url=poster.avatar_url,
        )
    return JobPostOut(
        id=str(job.id),
        title=job.title,
        description=job.description,
        company_name=job.company_name,
        company_logo_url=job.company_logo_url,
        poster_id=str(job.poster_id),
        poster=poster_out,
        location=job.location,
        is_remote=job.is_remote,
        job_type=job.job_type,
        experience_level=job.experience_level,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        salary_currency=job.salary_currency,
        salary_visible=job.salary_visible,
        required_skills=job.required_skills,
        tags=job.tags,
        application_deadline=job.application_deadline,
        status=job.status,
        application_count=job.application_count,
        save_count=job.save_count,
        is_saved=is_saved,
        has_applied=has_applied,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


async def _enrich_jobs(
    jobs: list[JobPost],
    current_user: Optional[User],
) -> list[JobPostOut]:
    """Attach poster info, is_saved, has_applied for a list of jobs."""
    if not jobs:
        return []

    # Batch-load posters
    poster_ids = list({j.poster_id for j in jobs})
    posters_list = await User.find({"_id": {"$in": poster_ids}}).to_list()
    posters: dict[PydanticObjectId, User] = {p.id: p for p in posters_list}

    saved_ids: set[PydanticObjectId] = set()
    applied_ids: set[PydanticObjectId] = set()
    if current_user:
        job_ids = [j.id for j in jobs]
        saved = await SavedJob.find(
            SavedJob.user_id == current_user.id,
            {"job_id": {"$in": job_ids}},
        ).to_list()
        saved_ids = {s.job_id for s in saved}
        applied = await JobApplication.find(
            JobApplication.applicant_id == current_user.id,
            {"job_id": {"$in": job_ids}},
        ).to_list()
        applied_ids = {a.job_id for a in applied}

    return [
        _job_to_out(
            j,
            is_saved=j.id in saved_ids,
            has_applied=j.id in applied_ids,
            poster=posters.get(j.poster_id),
        )
        for j in jobs
    ]


def _app_to_out(app: JobApplication, applicant: Optional[User] = None) -> ApplicationOut:
    applicant_out = None
    if applicant:
        from app.models.user_profile import UserProfile  # lazy import
        applicant_out = ApplicantUserOut(
            id=str(applicant.id),
            username=applicant.username,
            display_name=applicant.display_name,
            avatar_url=applicant.avatar_url,
            headline=app.profile_snapshot.get("headline"),
        )
    return ApplicationOut(
        id=str(app.id),
        job_id=str(app.job_id),
        applicant_id=str(app.applicant_id),
        applicant=applicant_out,
        cover_letter=app.cover_letter,
        resume_url=app.resume_url,
        profile_snapshot=app.profile_snapshot,
        stage=app.stage,
        stage_history=app.stage_history,
        employer_note=app.employer_note,
        is_read_by_employer=app.is_read_by_employer,
        is_read_by_candidate=app.is_read_by_candidate,
        created_at=app.created_at,
        updated_at=app.updated_at,
    )


# ── Job Posts ──────────────────────────────────────────────────────────────────

@router.get("", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    job_type: Optional[str] = None,
    experience_level: Optional[str] = None,
    is_remote: Optional[bool] = None,
    tag: Optional[str] = None,
    salary_min: Optional[int] = Query(None, ge=0),
    salary_max: Optional[int] = Query(None, ge=0),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> JobListResponse:
    filters: list[Any] = [{"status": JobStatus.active}]

    if search:
        q = search.strip()
        if q:
            rx = {"$regex": q, "$options": "i"}
            filters.append({"$or": [{"title": rx}, {"description": rx}, {"company_name": rx}]})
    if job_type:
        filters.append({"job_type": job_type})
    if experience_level:
        filters.append({"experience_level": experience_level})
    if is_remote is not None:
        filters.append({"is_remote": is_remote})
    if tag:
        filters.append({"tags": tag.strip().lower()})
    if salary_min is not None:
        filters.append({"salary_max": {"$gte": salary_min}, "salary_visible": True})
    if salary_max is not None:
        filters.append({"salary_min": {"$lte": salary_max}, "salary_visible": True})

    q_builder = JobPost.find(*filters)
    total = await q_builder.count()
    jobs = await q_builder.sort("-created_at").skip((page - 1) * page_size).limit(page_size).to_list()

    return JobListResponse(
        data=await _enrich_jobs(jobs, current_user),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=JobPostOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    body: JobPostCreate,
    current_user: User = Depends(get_current_user),
) -> JobPostOut:
    job = JobPost(
        poster_id=current_user.id,
        status=JobStatus.pending_review,
        **body.model_dump(),
    )
    await job.insert()
    return _job_to_out(job, poster=current_user)


@router.get("/my", response_model=JobListResponse)
async def my_job_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
) -> JobListResponse:
    q = JobPost.find(JobPost.poster_id == current_user.id)
    total = await q.count()
    jobs = await q.sort("-created_at").skip((page - 1) * page_size).limit(page_size).to_list()
    return JobListResponse(
        data=await _enrich_jobs(jobs, current_user),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{job_id}", response_model=JobPostOut)
async def get_job(
    job_id: PydanticObjectId,
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> JobPostOut:
    job = await JobPost.get(job_id)
    if not job or job.status == JobStatus.draft:
        raise HTTPException(status_code=404, detail="Job not found")

    is_saved = False
    has_applied = False
    poster: Optional[User] = await User.get(job.poster_id)

    if current_user:
        sv = await SavedJob.find_one(
            SavedJob.user_id == current_user.id, SavedJob.job_id == job.id
        )
        is_saved = sv is not None
        app = await JobApplication.find_one(
            JobApplication.job_id == job.id,
            JobApplication.applicant_id == current_user.id,
        )
        has_applied = app is not None

    return _job_to_out(job, is_saved=is_saved, has_applied=has_applied, poster=poster)


@router.patch("/{job_id}", response_model=JobPostOut)
async def update_job(
    job_id: PydanticObjectId,
    body: JobPostUpdate,
    current_user: User = Depends(get_current_user),
) -> JobPostOut:
    job = await JobPost.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.poster_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your job post")

    updates = body.model_dump(exclude_none=True)
    if updates:
        for k, v in updates.items():
            setattr(job, k, v)
        job.updated_at = utc_now()
        await job.replace()

    return _job_to_out(job, poster=current_user)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
) -> None:
    job = await JobPost.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.poster_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your job post")
    await job.delete()


@router.post("/{job_id}/close", response_model=JobPostOut)
async def close_job(
    job_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
) -> JobPostOut:
    job = await JobPost.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.poster_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your job post")
    job.status = JobStatus.closed
    job.updated_at = utc_now()
    await job.replace()
    return _job_to_out(job)


# ── Saved Jobs ─────────────────────────────────────────────────────────────────

@router.post("/{job_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def save_job(
    job_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
) -> None:
    job = await JobPost.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    existing = await SavedJob.find_one(
        SavedJob.user_id == current_user.id, SavedJob.job_id == job_id
    )
    if existing:
        return  # idempotent
    sv = SavedJob(user_id=current_user.id, job_id=job_id)
    await sv.insert()
    await JobPost.find_one(JobPost.id == job_id).update({"$inc": {"save_count": 1}})


@router.delete("/{job_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_job(
    job_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
) -> None:
    sv = await SavedJob.find_one(
        SavedJob.user_id == current_user.id, SavedJob.job_id == job_id
    )
    if sv:
        await sv.delete()
        await JobPost.find_one(JobPost.id == job_id).update({"$inc": {"save_count": -1}})


@router.get("/saved/list", response_model=JobListResponse)
async def list_saved_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
) -> JobListResponse:
    saved = await SavedJob.find(SavedJob.user_id == current_user.id).to_list()
    job_ids = [s.job_id for s in saved]
    if not job_ids:
        return JobListResponse(data=[], total=0, page=page, page_size=page_size)

    total = len(job_ids)
    start = (page - 1) * page_size
    page_ids = job_ids[start: start + page_size]
    jobs = await JobPost.find({"_id": {"$in": page_ids}}).to_list()
    return JobListResponse(
        data=await _enrich_jobs(jobs, current_user),
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Applications ───────────────────────────────────────────────────────────────

@router.post("/{job_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply(
    job_id: PydanticObjectId,
    body: ApplicationCreate,
    current_user: User = Depends(get_current_user),
) -> ApplicationOut:
    job = await JobPost.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    try:
        app = await apply_to_job(
            job=job,
            applicant=current_user,
            cover_letter=body.cover_letter,
            resume_url=body.resume_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _app_to_out(app, applicant=current_user)


@router.get("/{job_id}/applications", response_model=ApplicationListResponse)
async def list_applications(
    job_id: PydanticObjectId,
    stage: Optional[ApplicationStage] = None,
    current_user: User = Depends(get_current_user),
) -> ApplicationListResponse:
    job = await JobPost.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.poster_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your job")

    filters: list[Any] = [JobApplication.job_id == job_id]
    if stage:
        filters.append({"stage": stage})

    apps = await JobApplication.find(*filters).sort("-created_at").to_list()

    applicant_ids = list({a.applicant_id for a in apps})
    users_list = await User.find({"_id": {"$in": applicant_ids}}).to_list()
    users: dict[PydanticObjectId, User] = {u.id: u for u in users_list}

    # Mark as read by employer
    unread_ids = [a.id for a in apps if not a.is_read_by_employer]
    if unread_ids:
        await JobApplication.find({"_id": {"$in": unread_ids}}).update(
            {"$set": {"is_read_by_employer": True}}
        )

    return ApplicationListResponse(
        data=[_app_to_out(a, applicant=users.get(a.applicant_id)) for a in apps],
        total=len(apps),
    )


@router.get("/{job_id}/applications/{app_id}", response_model=ApplicationOut)
async def get_application(
    job_id: PydanticObjectId,
    app_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
) -> ApplicationOut:
    app = await JobApplication.get(app_id)
    if not app or app.job_id != job_id:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await JobPost.get(job_id)
    is_employer = job and job.poster_id == current_user.id
    is_applicant = app.applicant_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN

    if not (is_employer or is_applicant or is_admin):
        raise HTTPException(status_code=403, detail="Access denied")

    applicant: Optional[User] = await User.get(app.applicant_id)
    return _app_to_out(app, applicant=applicant)


@router.post("/{job_id}/applications/{app_id}/move", response_model=ApplicationOut)
async def move_application_stage(
    job_id: PydanticObjectId,
    app_id: PydanticObjectId,
    body: StageMove,
    current_user: User = Depends(get_current_user),
) -> ApplicationOut:
    app = await JobApplication.get(app_id)
    if not app or app.job_id != job_id:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await JobPost.get(job_id)
    if not job or (job.poster_id != current_user.id and current_user.role != UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not your job")

    try:
        app = await move_stage(
            app=app,
            new_stage=body.stage,
            moved_by_id=current_user.id,
            note=body.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    applicant: Optional[User] = await User.get(app.applicant_id)
    return _app_to_out(app, applicant=applicant)


@router.post("/{job_id}/applications/{app_id}/withdraw", response_model=ApplicationOut)
async def withdraw_application(
    job_id: PydanticObjectId,
    app_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
) -> ApplicationOut:
    app = await JobApplication.get(app_id)
    if not app or app.job_id != job_id:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.applicant_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your application")
    if app.stage in TERMINAL_STAGES:
        raise HTTPException(status_code=400, detail="Application is already in a terminal stage")

    app.stage = ApplicationStage.withdrawn
    app.updated_at = utc_now()
    await app.replace()
    return _app_to_out(app, applicant=current_user)


# ── My Applications (Candidate view) ──────────────────────────────────────────

@router.get("/me/applications", response_model=list[MyApplicationOut])
async def my_applications(
    current_user: User = Depends(get_current_user),
) -> list[MyApplicationOut]:
    apps = await JobApplication.find(
        JobApplication.applicant_id == current_user.id
    ).sort("-created_at").to_list()

    job_ids = list({a.job_id for a in apps})
    jobs_list = await JobPost.find({"_id": {"$in": job_ids}}).to_list()
    jobs: dict[PydanticObjectId, JobPost] = {j.id: j for j in jobs_list}

    result = []
    for a in apps:
        job = jobs.get(a.job_id)
        result.append(MyApplicationOut(
            id=str(a.id),
            job_id=str(a.job_id),
            job_title=job.title if job else "(deleted)",
            company_name=job.company_name if job else "",
            stage=a.stage,
            stage_history=a.stage_history,
            employer_note=a.employer_note,
            created_at=a.created_at,
            updated_at=a.updated_at,
        ))
    return result


# ── Reports ────────────────────────────────────────────────────────────────────

@router.post("/{job_id}/report", response_model=JobReportOut, status_code=status.HTTP_201_CREATED)
async def report_job(
    job_id: PydanticObjectId,
    body: JobReportCreate,
    current_user: User = Depends(get_current_user),
) -> JobReportOut:
    job = await JobPost.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = await JobReport.find_one(
        JobReport.job_id == job_id, JobReport.reported_by == current_user.id
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already reported this job")

    report = JobReport(
        job_id=job_id,
        reported_by=current_user.id,
        reason=body.reason,
        details=body.details,
    )
    await report.insert()

    return JobReportOut(
        id=str(report.id),
        job_id=str(report.job_id),
        reported_by=str(report.reported_by),
        reason=report.reason,
        details=report.details,
        status=report.status,
        admin_note=report.admin_note,
        created_at=report.created_at,
    )
