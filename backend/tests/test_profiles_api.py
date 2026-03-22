from __future__ import annotations

from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest

from app.core.auth import get_current_user
from app.models.user import User, UserRole

import app.routers.profiles as profiles_router_module
import app.routers.admin_profiles as admin_profiles_router_module
import app.services.profiles as profile_service_module
from app.routers.profiles import router as profiles_router
from app.routers.admin_profiles import router as admin_profiles_router, _require_admin
from app.models.user_profile import UserProfile
from app.models.user_profile_visibility import UserProfileVisibility
from app.models.user_profile_layout import UserProfileLayout
from app.models.user_experience import UserExperience
from app.models.user_education import UserEducation
from app.models.user_project import UserProject
from app.models.user_skill import UserSkill
from app.models.user_certification import UserCertification
from app.models.user_contact_link import UserContactLink, ContactLinkType


def _oid(value: str) -> PydanticObjectId:
    return PydanticObjectId(value)


def _dt() -> datetime:
    return datetime(2030, 1, 1, tzinfo=timezone.utc)


def _user(user_id: str, *, username: str = "alice", is_private: bool = False, role: UserRole = UserRole.MEMBER) -> User:
    return User.model_construct(
        id=_oid(user_id),
        username=username,
        email=f"{username}@example.com",
        display_name="Alice Dev",
        bio="Short bio",
        role=role,
        is_active=True,
        is_bot=False,
        is_private=is_private,
        avatar_url="https://cdn.example.com/avatar.png",
        profile_slug=f"{username}-profile",
        created_at=_dt(),
        updated_at=_dt(),
    )


def _bundle_for(user: User) -> dict[str, object]:
    return {
        "profile": UserProfile.model_construct(
            id=_oid("65aa0000000000000000a001"),
            user_id=user.id,
            headline="Staff Engineer",
            about="Long-form about section",
            banner_url="https://cdn.example.com/banner.png",
            location="Dhaka, Bangladesh",
            website="https://alice.dev",
            completion_percent=72,
            created_at=_dt(),
            updated_at=_dt(),
        ),
        "visibility": UserProfileVisibility.model_construct(
            id=_oid("65aa0000000000000000a002"),
            user_id=user.id,
            show_about=True,
            show_experience=False,
            show_education=True,
            show_projects=True,
            show_skills=True,
            show_certifications=True,
            show_contact=True,
            created_at=_dt(),
            updated_at=_dt(),
        ),
        "layout": UserProfileLayout.model_construct(
            id=_oid("65aa0000000000000000a003"),
            user_id=user.id,
            middle_order=["skills", "projects", "certifications"],
            created_at=_dt(),
            updated_at=_dt(),
        ),
        "experience": [
            UserExperience.model_construct(
                id=_oid("65aa0000000000000000b001"),
                user_id=user.id,
                title="Senior Engineer",
                company="Acme",
                employment_type="full_time",
                location="Remote",
                start_date="2024-01",
                end_date=None,
                is_current=True,
                description="Built distributed systems.",
                sort_order=1,
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            )
        ],
        "education": [
            UserEducation.model_construct(
                id=_oid("65aa0000000000000000b002"),
                user_id=user.id,
                school="BUET",
                degree="BSc",
                field_of_study="CSE",
                start_date="2015-01",
                end_date="2019-01",
                is_current=False,
                description="Engineering studies.",
                sort_order=1,
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            )
        ],
        "projects": [
            UserProject.model_construct(
                id=_oid("65aa0000000000000000b003"),
                user_id=user.id,
                name="KhoshGolpo",
                role="Builder",
                description="Professional community product.",
                project_url="https://khoshgolpo.dev",
                repo_url="https://github.com/example/khoshgolpo",
                start_date="2025-01",
                end_date=None,
                is_ongoing=True,
                sort_order=1,
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            )
        ],
        "skills": [
            UserSkill.model_construct(
                id=_oid("65aa0000000000000000b004"),
                user_id=user.id,
                name="React",
                sort_order=1,
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            )
        ],
        "certifications": [
            UserCertification.model_construct(
                id=_oid("65aa0000000000000000b005"),
                user_id=user.id,
                name="AWS Solutions Architect",
                issuer="Amazon",
                issue_date="2028-01",
                expiry_date=None,
                credential_id="cred-123",
                credential_url="https://aws.example.com/cert",
                sort_order=1,
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            )
        ],
        "contact_links": [
            UserContactLink.model_construct(
                id=_oid("65aa0000000000000000b006"),
                user_id=user.id,
                type=ContactLinkType.GITHUB,
                label="GitHub",
                value="https://github.com/alice",
                is_public=True,
                sort_order=1,
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            ),
            UserContactLink.model_construct(
                id=_oid("65aa0000000000000000b007"),
                user_id=user.id,
                type=ContactLinkType.EMAIL,
                label="Email",
                value="alice@example.com",
                is_public=False,
                sort_order=2,
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            ),
        ],
    }


def _build_profiles_client(monkeypatch: pytest.MonkeyPatch, current_user: User | None = None) -> TestClient:
    app = FastAPI()
    app.include_router(profiles_router)

    async def fake_optional_current_user() -> User | None:
        return current_user

    async def fake_current_user() -> User:
        assert current_user is not None
        return current_user

    app.dependency_overrides[profiles_router_module.get_optional_current_user] = fake_optional_current_user
    app.dependency_overrides[get_current_user] = fake_current_user
    return TestClient(app)


def _build_admin_profiles_client(monkeypatch: pytest.MonkeyPatch, admin_user: User) -> TestClient:
    app = FastAPI()
    app.include_router(admin_profiles_router)
    app.dependency_overrides[_require_admin] = lambda: admin_user
    return TestClient(app)


def test_get_public_profile_filters_private_overview_and_exposes_activity_gate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    profile_user = _user("65aa00000000000000000111", username="alice", is_private=True)
    bundle = _bundle_for(profile_user)

    async def fake_resolve(identifier: str) -> User | None:
        assert identifier == "alice"
        return profile_user

    async def fake_bundle_loader(user: User) -> dict[str, object]:
        assert user.id == profile_user.id
        return bundle

    monkeypatch.setattr(profiles_router_module, "_resolve_profile_user", fake_resolve)
    monkeypatch.setattr(profiles_router_module, "_load_profile_bundle", fake_bundle_loader)

    client = _build_profiles_client(monkeypatch, current_user=None)
    response = client.get("/profiles/alice")

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["username"] == "alice"
    assert payload["basics"]["headline"] == "Staff Engineer"
    assert payload["basics"]["about"] == "Long-form about section"
    assert payload["layout"]["middle_order"] == ["skills", "projects", "certifications"]
    assert payload["sections"]["experience"] == []
    assert payload["sections"]["education"][0]["school"] == "BUET"
    assert payload["sections"]["skills"][0]["name"] == "React"
    assert [item["type"] for item in payload["sections"]["contact_links"]] == ["github"]
    assert payload["viewer"] == {"is_owner": False, "is_admin": False, "can_view_activity": False}


def test_get_manage_profile_returns_visibility_layout_and_raw_sections(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    current_user = _user("65aa00000000000000000112", username="owner")
    bundle = _bundle_for(current_user)
    calls: list[str] = []

    async def fake_manage_bundle(user: User) -> dict[str, object]:
        calls.append(str(user.id))
        return bundle

    monkeypatch.setattr(profiles_router_module, "_load_or_create_profile_bundle", fake_manage_bundle)

    client = _build_profiles_client(monkeypatch, current_user=current_user)
    response = client.get("/profiles/me/manage")

    assert response.status_code == 200
    payload = response.json()
    assert calls == [str(current_user.id)]
    assert payload["user"]["username"] == "owner"
    assert payload["visibility"]["show_experience"] is False
    assert payload["layout"]["middle_order"] == ["skills", "projects", "certifications"]
    assert payload["sections"]["experience"][0]["title"] == "Senior Engineer"
    assert payload["sections"]["contact_links"][1]["type"] == "email"


def test_patch_profile_basics_updates_user_profile_and_audits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    current_user = _user("65aa00000000000000000113", username="owner")
    bundle = _bundle_for(current_user)
    profile_doc = bundle["profile"]
    saved: list[str] = []
    audits: list[dict[str, object]] = []

    async def fake_manage_bundle(user: User) -> dict[str, object]:
        assert user.id == current_user.id
        return bundle

    async def fake_user_save(self: User) -> None:
        saved.append(f"user:{self.display_name}:{self.bio}:{self.is_private}")

    async def fake_profile_save(self: UserProfile) -> None:
        saved.append(f"profile:{self.headline}:{self.location}")

    async def fake_log_audit(action: str, current_user: User, *, details: dict[str, object]) -> None:
        audits.append(
            {
                "action": action,
                "actor_id": current_user.id,
                "target_id": current_user.id,
                "details": details,
            }
        )

    monkeypatch.setattr(profiles_router_module, "_load_or_create_profile_bundle", fake_manage_bundle)
    monkeypatch.setattr(User, "save", fake_user_save, raising=False)
    monkeypatch.setattr(UserProfile, "save", fake_profile_save, raising=False)
    monkeypatch.setattr(profiles_router_module, "_write_profile_audit", fake_log_audit)

    client = _build_profiles_client(monkeypatch, current_user=current_user)
    response = client.patch(
        "/profiles/me/basics",
        json={
            "display_name": "Alice Updated",
            "bio": "Compact intro",
            "headline": "Principal Engineer",
            "about": "Updated long about",
            "location": "Remote",
            "website": "https://updated.dev",
            "is_private": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["display_name"] == "Alice Updated"
    assert payload["user"]["bio"] == "Compact intro"
    assert payload["user"]["is_private"] is True
    assert payload["basics"]["headline"] == "Principal Engineer"
    assert payload["basics"]["location"] == "Remote"
    assert payload["basics"]["website"] == "https://updated.dev"
    assert saved == [
        "user:Alice Updated:Compact intro:True",
        "profile:Principal Engineer:Remote",
    ]
    assert audits and audits[0]["action"] == "user_profile_basics_updated"
    assert audits[0]["target_id"] == current_user.id
    assert "headline" in audits[0]["details"]["fields"]
    assert isinstance(profile_doc, UserProfile)


@pytest.mark.parametrize(
    ("section", "path", "create_payload", "update_payload", "expected_field"),
    [
        ("experience", "/profiles/me/experience", {"title": "Senior Engineer", "company": "Acme"}, {"title": "Principal Engineer"}, "title"),
        ("education", "/profiles/me/education", {"school": "BUET", "degree": "BSc"}, {"school": "MIT"}, "school"),
        ("projects", "/profiles/me/projects", {"name": "KhoshGolpo", "role": "Builder"}, {"role": "Lead"}, "role"),
        ("skills", "/profiles/me/skills", {"name": "React"}, {"name": "TypeScript"}, "name"),
        ("certifications", "/profiles/me/certifications", {"name": "AWS SA", "issuer": "Amazon"}, {"issuer": "AWS"}, "issuer"),
        ("contact_links", "/profiles/me/contact-links", {"type": "github", "label": "GitHub", "value": "https://github.com/alice"}, {"label": "Primary GitHub"}, "label"),
    ],
)
def test_profile_section_routes_cover_all_section_families(
    monkeypatch: pytest.MonkeyPatch,
    section: str,
    path: str,
    create_payload: dict[str, object],
    update_payload: dict[str, object],
    expected_field: str,
) -> None:
    current_user = _user("65aa00000000000000000114", username="owner")
    created_calls: list[tuple[str, dict[str, object]]] = []
    updated_calls: list[tuple[str, str, dict[str, object]]] = []
    deleted_calls: list[tuple[str, str]] = []

    async def fake_create(section_name: str, user: User, payload: dict[str, object]) -> dict[str, object]:
        created_calls.append((section_name, payload))
        response_payload = {"id": "item-1", **payload, "sort_order": 1, "is_visible": True}
        if section_name == "contact_links" and response_payload.get("is_public") is None:
            response_payload["is_public"] = True
        return response_payload

    async def fake_update(section_name: str, item_id: str, user: User, payload: dict[str, object]) -> dict[str, object]:
        updated_calls.append((section_name, item_id, payload))
        merged = dict(create_payload)
        merged.update(payload)
        return {"id": item_id, **merged, "sort_order": 1, "is_visible": True}

    async def fake_delete(section_name: str, item_id: str, user: User) -> bool:
        deleted_calls.append((section_name, item_id))
        return True

    async def fake_audit(*args: object, **kwargs: object) -> None:
        return None

    monkeypatch.setattr(profiles_router_module, "_create_section_item", fake_create)
    monkeypatch.setattr(profiles_router_module, "_update_section_item", fake_update)
    monkeypatch.setattr(profiles_router_module, "_delete_section_item", fake_delete)
    monkeypatch.setattr(profiles_router_module, "_write_profile_audit", fake_audit)

    client = _build_profiles_client(monkeypatch, current_user=current_user)

    create_response = client.post(path, json=create_payload)
    assert create_response.status_code == 201
    assert create_response.json()[expected_field] == create_payload.get(expected_field)
    assert created_calls and created_calls[0][0] == section
    for key, value in create_payload.items():
        assert created_calls[0][1][key] == value

    update_response = client.patch(f"{path}/item-1", json=update_payload)
    assert update_response.status_code == 200
    assert update_response.json()[expected_field] == update_payload.get(expected_field)
    assert updated_calls == [(section, "item-1", update_payload)]

    delete_response = client.delete(f"{path}/item-1")
    assert delete_response.status_code == 204
    assert deleted_calls == [(section, "item-1")]


def test_admin_can_delete_individual_profile_items(monkeypatch: pytest.MonkeyPatch) -> None:
    admin_user = _user("65aa00000000000000000115", username="admin", role=UserRole.ADMIN)
    delete_calls: list[tuple[str, str, str]] = []

    async def fake_delete(section_name: str, item_id: str, admin: User) -> bool:
        delete_calls.append((section_name, item_id, str(admin.id)))
        return True

    monkeypatch.setattr(admin_profiles_router_module, "_delete_profile_item_as_admin", fake_delete)

    client = _build_admin_profiles_client(monkeypatch, admin_user=admin_user)
    response = client.delete("/admin/profile-content/skills/item-1")

    assert response.status_code == 204
    assert delete_calls == [("skills", "item-1", str(admin_user.id))]


@pytest.mark.parametrize(
    ("section", "factory", "current_flag"),
    [
        (
            "experience",
            lambda user_id, item_id, **kwargs: UserExperience.model_construct(
                id=_oid(item_id),
                user_id=user_id,
                title=kwargs.get("title", "Role"),
                company="Acme",
                employment_type=None,
                location=None,
                start_date=kwargs.get("start_date"),
                end_date=kwargs.get("end_date"),
                is_current=kwargs.get("is_current", False),
                description=None,
                sort_order=kwargs.get("sort_order", 0),
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            ),
            "is_current",
        ),
        (
            "education",
            lambda user_id, item_id, **kwargs: UserEducation.model_construct(
                id=_oid(item_id),
                user_id=user_id,
                school=kwargs.get("school", "School"),
                degree=None,
                field_of_study=None,
                start_date=kwargs.get("start_date"),
                end_date=kwargs.get("end_date"),
                is_current=kwargs.get("is_current", False),
                description=None,
                sort_order=kwargs.get("sort_order", 0),
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            ),
            "is_current",
        ),
        (
            "projects",
            lambda user_id, item_id, **kwargs: UserProject.model_construct(
                id=_oid(item_id),
                user_id=user_id,
                name=kwargs.get("name", "Project"),
                role=None,
                description=None,
                project_url=None,
                repo_url=None,
                start_date=kwargs.get("start_date"),
                end_date=kwargs.get("end_date"),
                is_ongoing=kwargs.get("is_ongoing", False),
                sort_order=kwargs.get("sort_order", 0),
                is_visible=True,
                created_at=_dt(),
                updated_at=_dt(),
            ),
            "is_ongoing",
        ),
    ],
)
def test_timeline_sections_sort_current_items_first_then_recent_dates(
    section: str,
    factory,
    current_flag: str,
) -> None:
    user_id = _oid("65aa00000000000000000121")
    current_item = factory(user_id, "65aa0000000000000000c001", start_date="2024-01", end_date=None, sort_order=99, **{current_flag: True})
    recent_item = factory(user_id, "65aa0000000000000000c002", start_date="2022-01", end_date="2025-02", sort_order=0)
    older_item = factory(user_id, "65aa0000000000000000c003", start_date="2019-01", end_date="2021-06", sort_order=-4)

    ordered = profile_service_module.sort_profile_section_items(section, [older_item, recent_item, current_item])

    assert [str(item.id) for item in ordered] == [
        "65aa0000000000000000c001",
        "65aa0000000000000000c002",
        "65aa0000000000000000c003",
    ]


def test_certifications_sort_by_most_recent_issue_date() -> None:
    user_id = _oid("65aa00000000000000000122")
    latest = UserCertification.model_construct(
        id=_oid("65aa0000000000000000c011"),
        user_id=user_id,
        name="Latest",
        issuer="Issuer",
        issue_date="2025-01",
        expiry_date="2028-01",
        credential_id=None,
        credential_url=None,
        sort_order=10,
        is_visible=True,
        created_at=_dt(),
        updated_at=_dt(),
    )
    older = UserCertification.model_construct(
        id=_oid("65aa0000000000000000c012"),
        user_id=user_id,
        name="Older",
        issuer="Issuer",
        issue_date="2022-04",
        expiry_date="2025-04",
        credential_id=None,
        credential_url=None,
        sort_order=-10,
        is_visible=True,
        created_at=_dt(),
        updated_at=_dt(),
    )

    ordered = profile_service_module.sort_profile_section_items("certifications", [older, latest])

    assert [str(item.id) for item in ordered] == [
        "65aa0000000000000000c011",
        "65aa0000000000000000c012",
    ]


def test_timeline_sort_falls_back_to_sort_order_when_dates_are_missing() -> None:
    user_id = _oid("65aa00000000000000000123")
    first = UserExperience.model_construct(
        id=_oid("65aa0000000000000000c021"),
        user_id=user_id,
        title="First",
        company="Acme",
        employment_type=None,
        location=None,
        start_date=None,
        end_date=None,
        is_current=False,
        description=None,
        sort_order=1,
        is_visible=True,
        created_at=_dt(),
        updated_at=_dt(),
    )
    second = UserExperience.model_construct(
        id=_oid("65aa0000000000000000c022"),
        user_id=user_id,
        title="Second",
        company="Acme",
        employment_type=None,
        location=None,
        start_date=None,
        end_date=None,
        is_current=False,
        description=None,
        sort_order=4,
        is_visible=True,
        created_at=_dt(),
        updated_at=_dt(),
    )

    ordered = profile_service_module.sort_profile_section_items("experience", [second, first])

    assert [str(item.id) for item in ordered] == [
        "65aa0000000000000000c021",
        "65aa0000000000000000c022",
    ]


def test_profile_media_signature_returns_signed_payload_for_avatar(monkeypatch: pytest.MonkeyPatch) -> None:
    current_user = _user("65aa00000000000000000116", username="owner")
    signature_payload = {
        "kind": "avatar",
        "cloud_name": "demo-cloud",
        "api_key": "demo-key",
        "timestamp": 1_700_000_000,
        "folder": "khoshgolpo/profile-media",
        "public_id": "profiles/owner/avatar",
        "signature": "signed-value",
        "upload_url": "https://api.cloudinary.com/v1_1/demo-cloud/image/upload",
        "overwrite": True,
    }

    async def fake_signature_builder(user: User, kind: str) -> dict[str, object]:
        assert user.id == current_user.id
        assert kind == "avatar"
        return signature_payload

    monkeypatch.setattr(
        profiles_router_module,
        "_build_profile_media_signature",
        fake_signature_builder,
        raising=False,
    )

    client = _build_profiles_client(monkeypatch, current_user=current_user)
    response = client.post("/profiles/me/media/signature", json={"kind": "avatar"})

    assert response.status_code == 200
    assert response.json() == signature_payload


def test_profile_media_signature_returns_service_unavailable_when_cloudinary_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    current_user = _user("65aa00000000000000000117", username="owner")

    async def fake_signature_builder(user: User, kind: str) -> dict[str, object]:
        raise HTTPException(status_code=503, detail="Cloudinary is not configured")

    monkeypatch.setattr(
        profiles_router_module,
        "_build_profile_media_signature",
        fake_signature_builder,
        raising=False,
    )

    client = _build_profiles_client(monkeypatch, current_user=current_user)
    response = client.post("/profiles/me/media/signature", json={"kind": "banner"})

    assert response.status_code == 503
    assert response.json() == {"detail": "Cloudinary is not configured"}


def test_delete_profile_avatar_clears_media_fields_and_deletes_cloudinary_asset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    current_user = _user("65aa00000000000000000118", username="owner")
    bundle = _bundle_for(current_user)
    profile_doc = bundle["profile"]
    setattr(profile_doc, "avatar_public_id", "profiles/owner/avatar")
    saved: list[str] = []
    deleted_assets: list[tuple[str, str | None]] = []
    audits: list[dict[str, object]] = []

    async def fake_manage_bundle(user: User) -> dict[str, object]:
        return bundle

    async def fake_delete_asset(*, kind: str, user: User, profile: UserProfile) -> None:
        deleted_assets.append((kind, getattr(profile, "avatar_public_id", None)))

    async def fake_user_save(self: User) -> None:
        saved.append(f"user:{self.avatar_url}")

    async def fake_profile_save(self: UserProfile) -> None:
        saved.append(f"profile:{getattr(self, 'avatar_public_id', None)}:{self.banner_url}")

    async def fake_log_audit(action: str, current_user: User, *, details: dict[str, object]) -> None:
        audits.append({"action": action, "details": details})

    monkeypatch.setattr(profiles_router_module, "_load_or_create_profile_bundle", fake_manage_bundle)
    monkeypatch.setattr(profiles_router_module, "_delete_profile_media_asset", fake_delete_asset, raising=False)
    monkeypatch.setattr(User, "save", fake_user_save, raising=False)
    monkeypatch.setattr(UserProfile, "save", fake_profile_save, raising=False)
    monkeypatch.setattr(profiles_router_module, "_write_profile_audit", fake_log_audit)

    client = _build_profiles_client(monkeypatch, current_user=current_user)
    response = client.delete("/profiles/me/media/avatar")

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["avatar_url"] is None
    assert deleted_assets == [("avatar", "profiles/owner/avatar")]
    assert saved[0] == "user:None"
    assert audits and audits[0]["action"] == "user_profile_media_deleted"
    assert audits[0]["details"]["kind"] == "avatar"


def test_delete_profile_banner_clears_media_fields_and_deletes_cloudinary_asset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    current_user = _user("65aa00000000000000000119", username="owner")
    bundle = _bundle_for(current_user)
    profile_doc = bundle["profile"]
    setattr(profile_doc, "banner_public_id", "profiles/owner/banner")
    saved: list[str] = []
    deleted_assets: list[tuple[str, str | None]] = []

    async def fake_manage_bundle(user: User) -> dict[str, object]:
        return bundle

    async def fake_delete_asset(*, kind: str, user: User, profile: UserProfile) -> None:
        deleted_assets.append((kind, getattr(profile, "banner_public_id", None)))

    async def fake_user_save(self: User) -> None:
        saved.append(f"user:{self.avatar_url}")

    async def fake_profile_save(self: UserProfile) -> None:
        saved.append(f"profile:{self.banner_url}:{getattr(self, 'banner_public_id', None)}")

    async def fake_log_audit(*args: object, **kwargs: object) -> None:
        return None

    monkeypatch.setattr(profiles_router_module, "_load_or_create_profile_bundle", fake_manage_bundle)
    monkeypatch.setattr(profiles_router_module, "_delete_profile_media_asset", fake_delete_asset, raising=False)
    monkeypatch.setattr(User, "save", fake_user_save, raising=False)
    monkeypatch.setattr(UserProfile, "save", fake_profile_save, raising=False)
    monkeypatch.setattr(profiles_router_module, "_write_profile_audit", fake_log_audit)

    client = _build_profiles_client(monkeypatch, current_user=current_user)
    response = client.delete("/profiles/me/media/banner")

    assert response.status_code == 200
    payload = response.json()
    assert payload["basics"]["banner_url"] is None
    assert deleted_assets == [("banner", "profiles/owner/banner")]
    assert "profile:None:None" in saved
