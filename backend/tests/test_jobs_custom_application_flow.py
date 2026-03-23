from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID

from beanie import PydanticObjectId
from fastapi import HTTPException
import pytest

from app.models.job_application import ApplicationStage, StageHistoryEntry
from app.models.user import User, UserRole
import app.models.job_post as job_post_module
import app.routers.jobs as jobs_module
import app.schemas.job as job_schemas
import app.services.jobs as jobs_service


NOW = datetime(2026, 3, 23, tzinfo=timezone.utc)
USER_ID = PydanticObjectId("65aa00000000000000000011")
JOB_ID = PydanticObjectId("65aa00000000000000000022")
APP_ID = PydanticObjectId("65aa00000000000000000033")


def _user(role: UserRole = UserRole.MEMBER) -> User:
    return User.model_construct(
        id=USER_ID,
        username="candidate",
        email="candidate@example.com",
        display_name="Candidate Example",
        role=role,
        is_active=True,
        created_at=NOW,
        updated_at=NOW,
    )


def _fake_application(**overrides):
    data = {
        "id": APP_ID,
        "job_id": JOB_ID,
        "applicant_id": USER_ID,
        "cover_letter": "Interested in this role.",
        "resume_url": "https://example.com/resume.pdf",
        "profile_snapshot": {"headline": "QA Engineer"},
        "stage": ApplicationStage.applied,
        "stage_history": [
            StageHistoryEntry(
                stage=ApplicationStage.applied,
                changed_at=NOW,
                changed_by=str(USER_ID),
                note=None,
            )
        ],
        "employer_note": None,
        "is_read_by_employer": False,
        "is_read_by_candidate": True,
        "custom_answers": {},
        "is_external_redirect": False,
        "created_at": NOW,
        "updated_at": NOW,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def test_job_schemas_expose_custom_application_fields() -> None:
    assert "custom_questions" in job_schemas.JobPostCreate.model_fields
    assert "custom_questions" in job_schemas.JobPostUpdate.model_fields
    assert "custom_questions" in job_schemas.JobPostOut.model_fields
    assert "external_apply_url" in job_schemas.JobPostOut.model_fields
    assert "custom_answers" in job_schemas.ApplicationCreate.model_fields
    assert "custom_answers" in job_schemas.ApplicationOut.model_fields
    assert "is_external_redirect" in job_schemas.ApplicationOut.model_fields
    assert "is_external_redirect" in job_schemas.MyApplicationOut.model_fields


def test_custom_question_input_validates_select_options() -> None:
    question_type = getattr(job_post_module, "QuestionType", None)
    custom_question_input = getattr(job_schemas, "CustomQuestionInput", None)

    assert question_type is not None
    assert custom_question_input is not None

    with pytest.raises(ValueError, match="at least 2 options"):
        custom_question_input(
            label="Preferred test framework?",
            type=question_type.single_select,
            options=["pytest"],
        )


def test_validate_custom_answers_filters_unknown_answers() -> None:
    validate_custom_answers = getattr(jobs_service, "validate_custom_answers", None)
    custom_question = getattr(job_post_module, "CustomQuestion", None)
    question_type = getattr(job_post_module, "QuestionType", None)

    assert callable(validate_custom_answers)
    assert custom_question is not None
    assert question_type is not None

    questions = [
        custom_question(
            id="portfolio",
            label="Portfolio URL",
            type=question_type.url,
            required=True,
            options=[],
        ),
        custom_question(
            id="tools",
            label="Testing tools used",
            type=question_type.multi_select,
            required=False,
            options=["pytest", "Playwright", "Selenium"],
        ),
    ]

    cleaned = validate_custom_answers(
        {
            "portfolio": "https://example.com/work",
            "tools": ["pytest", "Playwright"],
            "ignored": "drop me",
        },
        questions,
    )

    assert cleaned == {
        "portfolio": "https://example.com/work",
        "tools": ["pytest", "Playwright"],
    }


def test_create_job_assigns_ids_to_new_custom_questions(monkeypatch: pytest.MonkeyPatch) -> None:
    custom_question_input = getattr(job_schemas, "CustomQuestionInput", None)
    question_type = getattr(job_post_module, "QuestionType", None)

    assert custom_question_input is not None
    assert question_type is not None

    inserted: dict[str, object] = {}

    class FakeJobPost:
        def __init__(self, **kwargs):
            custom_questions = kwargs.get("custom_questions", [])
            kwargs["custom_questions"] = [
                question if hasattr(question, "id") else job_post_module.CustomQuestion(**question)
                for question in custom_questions
            ]
            for key, value in kwargs.items():
                setattr(self, key, value)
            self.id = None
            self.application_count = getattr(self, "application_count", 0)
            self.save_count = getattr(self, "save_count", 0)
            self.external_apply_url = getattr(self, "external_apply_url", None)
            self.created_at = NOW
            self.updated_at = NOW

        async def insert(self):
            inserted["job"] = self
            self.id = JOB_ID
            return self

    monkeypatch.setattr(jobs_module, "JobPost", FakeJobPost)
    monkeypatch.setattr(
        jobs_module,
        "uuid4",
        lambda: UUID("11111111-1111-1111-1111-111111111111"),
        raising=False,
    )

    body = job_schemas.JobPostCreate(
        title="QA Engineer",
        description="Build and automate end-to-end quality workflows.",
        company_name="DataPulse AI",
        custom_questions=[
            custom_question_input(
                label="Share your test portfolio",
                type=question_type.url,
                required=True,
            )
        ],
    )

    result = asyncio.run(jobs_module.create_job(body, _user(UserRole.MEMBER)))

    stored_job = inserted["job"]
    assert stored_job.custom_questions[0].id == "11111111-1111-1111-1111-111111111111"
    assert result.custom_questions[0].id == "11111111-1111-1111-1111-111111111111"


def test_apply_route_blocks_external_jobs(monkeypatch: pytest.MonkeyPatch) -> None:
    job = SimpleNamespace(
        id=JOB_ID,
        status="active",
        external_apply_url="https://careers.example.com/jobs/qa",
        custom_questions=[],
    )

    async def fake_get(_job_id):
        return job

    async def fake_apply_to_job(**_kwargs):
        return _fake_application()

    monkeypatch.setattr(jobs_module.JobPost, "get", fake_get)
    monkeypatch.setattr(jobs_module, "apply_to_job", fake_apply_to_job)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            jobs_module.apply(
                JOB_ID,
                SimpleNamespace(cover_letter=None, resume_url=None, custom_answers={}),
                _user(),
            )
        )

    assert exc_info.value.status_code == 400
    assert "external site" in str(exc_info.value.detail)


def test_apply_route_forwards_cleaned_custom_answers(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}
    job = SimpleNamespace(
        id=JOB_ID,
        status="active",
        external_apply_url=None,
        custom_questions=[SimpleNamespace(id="portfolio", label="Portfolio", required=True)],
    )

    async def fake_get(_job_id):
        return job

    def fake_validate_custom_answers(answers, questions):
        captured["validated_answers"] = answers
        captured["question_count"] = len(questions)
        return {"portfolio": "https://example.com/work"}

    async def fake_apply_to_job(**kwargs):
        captured["custom_answers"] = kwargs.get("custom_answers")
        return _fake_application(custom_answers=kwargs.get("custom_answers") or {})

    monkeypatch.setattr(jobs_module.JobPost, "get", fake_get)
    monkeypatch.setattr(jobs_module, "validate_custom_answers", fake_validate_custom_answers, raising=False)
    monkeypatch.setattr(jobs_module, "apply_to_job", fake_apply_to_job)

    result = asyncio.run(
        jobs_module.apply(
            JOB_ID,
            SimpleNamespace(
                cover_letter="I love breaking edge cases.",
                resume_url="https://example.com/resume.pdf",
                custom_answers={"portfolio": "https://example.com/work"},
            ),
            _user(),
        )
    )

    assert captured["validated_answers"] == {"portfolio": "https://example.com/work"}
    assert captured["question_count"] == 1
    assert captured["custom_answers"] == {"portfolio": "https://example.com/work"}
    assert getattr(result, "custom_answers", None) == {"portfolio": "https://example.com/work"}


def test_redirect_to_external_creates_tracked_application(monkeypatch: pytest.MonkeyPatch) -> None:
    redirect_to_external = getattr(jobs_module, "redirect_to_external", None)
    assert callable(redirect_to_external)

    job = SimpleNamespace(
        id=JOB_ID,
        external_apply_url="https://careers.example.com/jobs/qa",
    )
    updates: list[dict[str, object]] = []

    async def fake_get(_job_id):
        return job

    class FakeUpdater:
        async def update(self, payload):
            updates.append(payload)

    class FakeJobApplication:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)
            self.id = None
            self.cover_letter = getattr(self, "cover_letter", None)
            self.resume_url = getattr(self, "resume_url", None)
            self.profile_snapshot = getattr(self, "profile_snapshot", {})
            self.employer_note = getattr(self, "employer_note", None)
            self.is_read_by_employer = getattr(self, "is_read_by_employer", False)
            self.is_read_by_candidate = getattr(self, "is_read_by_candidate", True)
            self.custom_answers = getattr(self, "custom_answers", {})
            self.created_at = NOW
            self.updated_at = NOW

        @staticmethod
        async def find_one(*_args, **_kwargs):
            return None

        async def insert(self):
            self.id = APP_ID
            return self

    monkeypatch.setattr(jobs_module.JobPost, "get", fake_get)
    monkeypatch.setattr(jobs_module.JobPost, "find_one", lambda *_args, **_kwargs: FakeUpdater())
    monkeypatch.setattr(jobs_module, "JobApplication", FakeJobApplication)

    result = asyncio.run(redirect_to_external(JOB_ID, _user()))

    assert result.stage == ApplicationStage.applied
    assert getattr(result, "is_external_redirect", None) is True
    assert updates == [{"$inc": {"application_count": 1}}]
