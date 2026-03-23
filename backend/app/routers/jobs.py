"""Job board API: CRUD for job posts, applications, saved jobs, reports."""
from __future__ import annotations

from typing import Any, Optional
from uuid import uuid4

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from starlette.responses import JSONResponse

from app.core.auth import get_current_user, get_optional_current_user
from app.models.common import utc_now
from app.models.job_application import (
    ApplicationStage,
    JobApplication,
    SavedJob,
    StageHistoryEntry,
    TERMINAL_STAGES,
)
from app.models.job_post import CustomQuestion as CustomQuestionModel, JobPost, JobStatus
from app.models.job_report import JobReport
from app.models.user import User, UserRole
from app.schemas.job import (
    ApplicantUserOut,
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationOut,
    JobListResponse,
    JobPostCreate,
    JobPostOut,
    JobPosterOut,
    JobPostUpdate,
    JobReportCreate,
    JobReportOut,
    MyApplicationOut,
    StageMove,
)
from pymongo.errors import DuplicateKeyError as MongoDuplicateKeyError
from secrets import token_hex
from app.services.jobs import apply_to_job, make_slug, move_stage, validate_custom_answers

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _job_to_out(
    job: JobPost,
    *,
    is_saved: bool = False,
    has_applied: bool = False,
    poster: Optional[User] = None,
) -> JobPostOut:
    custom_questions = [
        question.model_dump() if hasattr(question, "model_dump") else question
        for question in job.custom_questions
    ]
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
        slug=job.slug or "",
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
        custom_questions=custom_questions,
        external_apply_url=job.external_apply_url,
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

    poster_ids = list({job.poster_id for job in jobs})
    posters_list = await User.find({"_id": {"$in": poster_ids}}).to_list()
    posters: dict[PydanticObjectId, User] = {poster.id: poster for poster in posters_list}

    saved_ids: set[PydanticObjectId] = set()
    applied_ids: set[PydanticObjectId] = set()
    if current_user:
        job_ids = [job.id for job in jobs]
        saved = await SavedJob.find(
            SavedJob.user_id == current_user.id,
            {"job_id": {"$in": job_ids}},
        ).to_list()
        saved_ids = {saved_job.job_id for saved_job in saved}
        applied = await JobApplication.find(
            JobApplication.applicant_id == current_user.id,
            {"job_id": {"$in": job_ids}},
        ).to_list()
        applied_ids = {application.job_id for application in applied}

    return [
        _job_to_out(
            job,
            is_saved=job.id in saved_ids,
            has_applied=job.id in applied_ids,
            poster=posters.get(job.poster_id),
        )
        for job in jobs
    ]


def _app_to_out(app: JobApplication, applicant: Optional[User] = None) -> ApplicationOut:
    applicant_out = None
    if applicant:
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
        custom_answers=getattr(app, "custom_answers", {}),
        is_external_redirect=getattr(app, "is_external_redirect", False),
        created_at=app.created_at,
        updated_at=app.updated_at,
    )


async def resolve_job(job_ref: str) -> JobPost:
    """Resolve a job by ObjectId string OR slug. Raises 404 if not found."""
    try:
        oid = PydanticObjectId(job_ref)
        job = await JobPost.get(oid)
        if job:
            return job
    except Exception:
        pass
    job = await JobPost.find_one({"slug": job_ref})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


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
        query = search.strip()
        if query:
            filters.append({"$text": {"$search": query}})
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

    query_builder = JobPost.find(*filters)
    total = await query_builder.count()
    jobs = (
        await query_builder.sort("-created_at")
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list()
    )

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
    data = body.model_dump()
    for question in data.get("custom_questions", []):
        if not question.get("id"):
            question["id"] = str(uuid4())

    base_slug = make_slug(body.title, body.company_name)

    # Attempt insert with clean slug; retry once with suffix on collision
    for attempt in range(2):
        slug = base_slug if attempt == 0 else f"{base_slug[:90]}-{token_hex(3)}"
        job = JobPost(
            poster_id=current_user.id,
            status=JobStatus.pending_review,
            slug=slug,
            **data,
        )
        try:
            await job.insert()
            break
        except MongoDuplicateKeyError:
            if attempt == 1:
                raise HTTPException(status_code=500, detail="Could not generate unique slug")
            continue

    return _job_to_out(job, poster=current_user)


@router.get("/my", response_model=JobListResponse)
async def my_job_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
) -> JobListResponse:
    query_builder = JobPost.find(JobPost.poster_id == current_user.id)
    total = await query_builder.count()
    jobs = (
        await query_builder.sort("-created_at")
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list()
    )
    return JobListResponse(
        data=await _enrich_jobs(jobs, current_user),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{job_id}", response_model=JobPostOut)
async def get_job(
    job_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> JobPostOut:
    job = await resolve_job(job_id)
    if job.status == JobStatus.draft:
        raise HTTPException(status_code=404, detail="Job not found")

    is_saved = False
    has_applied = False
    poster: Optional[User] = await User.get(job.poster_id)

    if current_user:
        saved_job = await SavedJob.find_one(
            SavedJob.user_id == current_user.id,
            SavedJob.job_id == job.id,
        )
        is_saved = saved_job is not None
        application = await JobApplication.find_one(
            JobApplication.job_id == job.id,
            JobApplication.applicant_id == current_user.id,
        )
        has_applied = application is not None

    return _job_to_out(job, is_saved=is_saved, has_applied=has_applied, poster=poster)


@router.patch("/{job_id}", response_model=JobPostOut)
async def update_job(
    job_id: str,
    body: JobPostUpdate,
    current_user: User = Depends(get_current_user),
) -> JobPostOut:
    job = await resolve_job(job_id)
    if job.poster_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your job post")

    updates = body.model_dump(exclude_none=True)
    if updates:
        for key, value in updates.items():
            if key == "custom_questions":
                for question in value:
                    if not question.get("id"):
                        question["id"] = str(uuid4())
                value = [CustomQuestionModel(**question) for question in value]
            setattr(job, key, value)
        job.updated_at = utc_now()
        await job.replace()

    return _job_to_out(job, poster=current_user)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    job = await resolve_job(job_id)
    if job.poster_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your job post")
    await JobApplication.find(JobApplication.job_id == job.id).delete()
    await SavedJob.find({"job_id": job.id}).delete()
    await job.delete()


@router.post("/{job_id}/close", response_model=JobPostOut)
async def close_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> JobPostOut:
    job = await resolve_job(job_id)
    if job.poster_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your job post")
    job.status = JobStatus.closed
    job.updated_at = utc_now()
    await job.replace()
    return _job_to_out(job)


@router.post("/{job_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def save_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    job = await resolve_job(job_id)
    existing = await SavedJob.find_one(
        SavedJob.user_id == current_user.id,
        SavedJob.job_id == job.id,
    )
    if existing:
        return
    saved_job = SavedJob(user_id=current_user.id, job_id=job.id)
    await saved_job.insert()
    await JobPost.find_one(JobPost.id == job.id).update({"$inc": {"save_count": 1}})


@router.delete("/{job_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    job = await resolve_job(job_id)
    saved_job = await SavedJob.find_one(
        SavedJob.user_id == current_user.id,
        SavedJob.job_id == job.id,
    )
    if saved_job:
        await saved_job.delete()
        await JobPost.find_one(JobPost.id == job.id).update({"$inc": {"save_count": -1}})


@router.get("/saved/list", response_model=JobListResponse)
async def list_saved_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
) -> JobListResponse:
    saved = await SavedJob.find(SavedJob.user_id == current_user.id).to_list()
    job_ids = [saved_job.job_id for saved_job in saved]
    if not job_ids:
        return JobListResponse(data=[], total=0, page=page, page_size=page_size)

    total = len(job_ids)
    start = (page - 1) * page_size
    page_ids = job_ids[start : start + page_size]
    jobs = await JobPost.find({"_id": {"$in": page_ids}}).to_list()
    return JobListResponse(
        data=await _enrich_jobs(jobs, current_user),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{job_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply(
    job_id: str,
    body: ApplicationCreate,
    current_user: User = Depends(get_current_user),
) -> ApplicationOut:
    job = await resolve_job(job_id)
    if job.external_apply_url:
        raise HTTPException(
            status_code=400,
            detail="This job accepts applications through an external site",
        )

    cleaned_answers: dict[str, Any] = {}
    if body.custom_answers and job.custom_questions:
        cleaned_answers = validate_custom_answers(body.custom_answers, job.custom_questions)

    poster: Optional[User] = await User.get(job.poster_id)
    try:
        app = await apply_to_job(
            job=job,
            applicant=current_user,
            cover_letter=body.cover_letter,
            resume_url=body.resume_url,
            custom_answers=cleaned_answers,
            poster=poster,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _app_to_out(app, applicant=current_user)


@router.post("/{job_id}/redirect", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def redirect_to_external(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    job = await resolve_job(job_id)
    if not job.external_apply_url:
        raise HTTPException(
            status_code=400,
            detail="This job does not have an external application URL",
        )

    existing = await JobApplication.find_one({"job_id": job.id, "applicant_id": current_user.id})
    if existing:
        out = _app_to_out(existing, applicant=current_user)
        return JSONResponse(content=out.model_dump(mode="json"), status_code=status.HTTP_200_OK)

    poster_for_snap: Optional[User] = await User.get(job.poster_id)
    job_snapshot = {
        "title": job.title,
        "company_name": job.company_name,
        "company_logo_url": job.company_logo_url,
        "location": job.location,
        "is_remote": job.is_remote,
        "job_type": job.job_type.value,
        "slug": job.slug or "",
        "poster_id": str(job.poster_id),
        "poster_display_name": poster_for_snap.display_name if poster_for_snap else None,
        "poster_username": poster_for_snap.username if poster_for_snap else None,
        "poster_avatar_url": poster_for_snap.avatar_url if poster_for_snap else None,
    }

    app = JobApplication(
        job_id=job.id,
        applicant_id=current_user.id,
        stage=ApplicationStage.applied,
        stage_history=[
            StageHistoryEntry(
                stage=ApplicationStage.applied,
                changed_by=str(current_user.id),
                note="Redirected to external career page",
            )
        ],
        is_external_redirect=True,
        job_snapshot=job_snapshot,
    )
    await app.insert()
    await JobPost.find_one({"_id": job.id}).update({"$inc": {"application_count": 1}})

    return _app_to_out(app, applicant=current_user)


@router.get("/applications/me", response_model=list[MyApplicationOut])
async def my_applications(
    current_user: User = Depends(get_current_user),
) -> list[MyApplicationOut]:
    apps = await JobApplication.find({"applicant_id": current_user.id}).sort("-created_at").to_list()

    job_ids = list({app.job_id for app in apps})
    jobs_list = await JobPost.find({"_id": {"$in": job_ids}}).to_list()
    jobs: dict[PydanticObjectId, JobPost] = {job.id: job for job in jobs_list}

    result = []
    for app in apps:
        job = jobs.get(app.job_id)
        snap: dict[str, Any] = getattr(app, "job_snapshot", {}) or {}
        job_deleted = job is None
        result.append(
            MyApplicationOut(
                id=str(app.id),
                job_id=str(app.job_id),
                job_title=job.title if job else snap.get("title", "(deleted)"),
                company_name=job.company_name if job else snap.get("company_name", ""),
                company_logo_url=job.company_logo_url if job else snap.get("company_logo_url"),
                job_slug=(job.slug or "") if job else snap.get("slug", ""),
                job_location=job.location if job else snap.get("location"),
                job_is_remote=job.is_remote if job else snap.get("is_remote", False),
                job_type=job.job_type.value if job else snap.get("job_type"),
                poster_display_name=snap.get("poster_display_name"),
                poster_username=snap.get("poster_username"),
                poster_avatar_url=snap.get("poster_avatar_url"),
                job_deleted=job_deleted,
                cover_letter=app.cover_letter,
                resume_url=app.resume_url,
                custom_answers=getattr(app, "custom_answers", {}),
                stage=app.stage,
                stage_history=app.stage_history,
                employer_note=app.employer_note,
                is_read_by_candidate=app.is_read_by_candidate,
                is_external_redirect=getattr(app, "is_external_redirect", False),
                created_at=app.created_at,
                updated_at=app.updated_at,
            )
        )
    return result


@router.get("/me/applications", response_model=list[MyApplicationOut])
async def legacy_my_applications(
    current_user: User = Depends(get_current_user),
) -> list[MyApplicationOut]:
    return await my_applications(current_user)


@router.get("/{job_id}/applications", response_model=ApplicationListResponse)
async def list_applications(
    job_id: str,
    stage: Optional[ApplicationStage] = None,
    current_user: User = Depends(get_current_user),
) -> ApplicationListResponse:
    job = await resolve_job(job_id)
    if job.poster_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your job")

    filters: list[Any] = [JobApplication.job_id == job.id]
    if stage:
        filters.append({"stage": stage})

    applications = await JobApplication.find(*filters).sort("-created_at").to_list()

    applicant_ids = list({application.applicant_id for application in applications})
    users_list = await User.find({"_id": {"$in": applicant_ids}}).to_list()
    users: dict[PydanticObjectId, User] = {user.id: user for user in users_list}

    unread_ids = [application.id for application in applications if not application.is_read_by_employer]
    if unread_ids:
        await JobApplication.find({"_id": {"$in": unread_ids}}).update(
            {"$set": {"is_read_by_employer": True}}
        )

    return ApplicationListResponse(
        data=[_app_to_out(application, applicant=users.get(application.applicant_id)) for application in applications],
        total=len(applications),
    )


@router.get("/{job_id}/applications/{app_id}", response_model=ApplicationOut)
async def get_application(
    job_id: str,
    app_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
) -> ApplicationOut:
    job = await resolve_job(job_id)
    app = await JobApplication.get(app_id)
    if not app or app.job_id != job.id:
        raise HTTPException(status_code=404, detail="Application not found")
    is_employer = job and job.poster_id == current_user.id
    is_applicant = app.applicant_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN

    if not (is_employer or is_applicant or is_admin):
        raise HTTPException(status_code=403, detail="Access denied")

    applicant: Optional[User] = await User.get(app.applicant_id)
    return _app_to_out(app, applicant=applicant)


@router.delete("/{job_id}/applications/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_application(
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    """Hard-delete the current user's own application. Works even if the job has been deleted."""
    job_oid: Optional[PydanticObjectId] = None
    try:
        job_oid = PydanticObjectId(job_id)
    except Exception:
        job = await JobPost.find_one({"slug": job_id})
        if job:
            job_oid = job.id

    if job_oid is None:
        raise HTTPException(status_code=404, detail="Application not found")

    app = await JobApplication.find_one({"job_id": job_oid, "applicant_id": current_user.id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Decrement application_count on the job if it still exists
    live_job = await JobPost.find_one({"_id": job_oid})
    if live_job:
        await JobPost.find_one({"_id": job_oid}).update({"$inc": {"application_count": -1}})

    await app.delete()


@router.post("/{job_id}/applications/{app_id}/move", response_model=ApplicationOut)
async def move_application_stage(
    job_id: str,
    app_id: PydanticObjectId,
    body: StageMove,
    current_user: User = Depends(get_current_user),
) -> ApplicationOut:
    job = await resolve_job(job_id)
    app = await JobApplication.get(app_id)
    if not app or app.job_id != job.id:
        raise HTTPException(status_code=404, detail="Application not found")

    if job.poster_id != current_user.id and current_user.role != UserRole.ADMIN:
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
    job_id: str,
    app_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
) -> ApplicationOut:
    job = await resolve_job(job_id)
    app = await JobApplication.get(app_id)
    if not app or app.job_id != job.id:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.applicant_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your application")
    if app.stage in TERMINAL_STAGES:
        raise HTTPException(
            status_code=400,
            detail="Application is already in a terminal stage",
        )

    app.stage = ApplicationStage.withdrawn
    app.updated_at = utc_now()
    await app.replace()
    return _app_to_out(app, applicant=current_user)


@router.post("/{job_id}/report", response_model=JobReportOut, status_code=status.HTTP_201_CREATED)
async def report_job(
    job_id: str,
    body: JobReportCreate,
    current_user: User = Depends(get_current_user),
) -> JobReportOut:
    job = await resolve_job(job_id)

    existing = await JobReport.find_one(
        JobReport.job_id == job.id,
        JobReport.reported_by == current_user.id,
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already reported this job")

    report = JobReport(
        job_id=job.id,
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
