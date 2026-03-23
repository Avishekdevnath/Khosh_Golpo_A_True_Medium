from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from beanie import PydanticObjectId
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from app.core.auth import get_current_user
from app.models.job_application import ApplicationStage, StageHistoryEntry
from app.models.user import User, UserRole
import app.routers.jobs as jobs_module


NOW = datetime(2026, 3, 23, tzinfo=timezone.utc)
USER_ID = PydanticObjectId("65aa00000000000000000011")
JOB_ID = PydanticObjectId("65aa00000000000000000022")
APP_ID = PydanticObjectId("65aa00000000000000000033")


def _user() -> User:
    return User.model_construct(
        id=USER_ID,
        username="candidate",
        email="candidate@example.com",
        display_name="Candidate Example",
        role=UserRole.MEMBER,
        is_active=True,
        created_at=NOW,
        updated_at=NOW,
    )


def _fake_application() -> SimpleNamespace:
    return SimpleNamespace(
        id=APP_ID,
        job_id=JOB_ID,
        applicant_id=USER_ID,
        cover_letter="Interested in this role.",
        resume_url="https://example.com/resume.pdf",
        profile_snapshot={"headline": "QA Engineer"},
        stage=ApplicationStage.applied,
        stage_history=[
            StageHistoryEntry(
                stage=ApplicationStage.applied,
                changed_at=NOW,
                changed_by=str(USER_ID),
                note=None,
            )
        ],
        employer_note=None,
        is_read_by_employer=False,
        is_read_by_candidate=True,
        created_at=NOW,
        updated_at=NOW,
    )


def test_my_applications_route_is_not_shadowed_by_job_applications_route(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeQuery:
        def __init__(self, data):
            self.data = data

        def sort(self, *_args, **_kwargs):
            return self

        async def to_list(self):
            return self.data

    async def fake_current_user() -> User:
        return _user()

    app = FastAPI()
    app.include_router(jobs_module.router)
    app.dependency_overrides[get_current_user] = fake_current_user

    monkeypatch.setattr(
        jobs_module.JobApplication,
        "find",
        lambda *_args, **_kwargs: FakeQuery([_fake_application()]),
    )
    monkeypatch.setattr(
        jobs_module.JobPost,
        "find",
        lambda *_args, **_kwargs: FakeQuery([
            SimpleNamespace(id=JOB_ID, title="QA Engineer", company_name="DataPulse AI"),
        ]),
    )

    client = TestClient(app)
    response = client.get("/jobs/me/applications")

    assert response.status_code == 200
    assert response.json() == [{
        "id": str(APP_ID),
        "job_id": str(JOB_ID),
        "job_title": "QA Engineer",
        "company_name": "DataPulse AI",
        "stage": "applied",
        "stage_history": [{
            "stage": "applied",
            "changed_at": NOW.isoformat().replace("+00:00", "Z"),
            "changed_by": str(USER_ID),
            "note": None,
        }],
        "employer_note": None,
        "created_at": NOW.isoformat().replace("+00:00", "Z"),
        "updated_at": NOW.isoformat().replace("+00:00", "Z"),
        "is_external_redirect": False,
    }]
