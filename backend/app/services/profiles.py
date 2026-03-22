from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.connection import Connection, ConnectionStatus
from app.models.user import User, UserRole
from app.models.user_profile import UserProfile
from app.models.user_profile_layout import UserProfileLayout
from app.models.user_profile_visibility import UserProfileVisibility
from app.models.user_experience import UserExperience
from app.models.user_education import UserEducation
from app.models.user_project import UserProject
from app.models.user_skill import UserSkill
from app.models.user_certification import UserCertification
from app.models.user_contact_link import ContactLinkType, UserContactLink


ALLOWED_MIDDLE_ORDER = ("projects", "skills", "certifications")
SECTION_MODEL_MAP = {
    "experience": UserExperience,
    "education": UserEducation,
    "projects": UserProject,
    "skills": UserSkill,
    "certifications": UserCertification,
    "contact_links": UserContactLink,
}


def _parse_partial_date(raw_value: object) -> datetime | None:
    if raw_value is None:
        return None
    text = str(raw_value).strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _timeline_sort_key(section: str, item: object) -> tuple[object, ...]:
    current_flag = False
    primary_date: datetime | None = None
    secondary_date: datetime | None = None

    if section in {"experience", "education"}:
        current_flag = bool(getattr(item, "is_current", False))
        primary_date = _parse_partial_date(getattr(item, "end_date", None)) or _parse_partial_date(getattr(item, "start_date", None))
        secondary_date = _parse_partial_date(getattr(item, "start_date", None))
    elif section == "projects":
        current_flag = bool(getattr(item, "is_ongoing", False))
        primary_date = _parse_partial_date(getattr(item, "end_date", None)) or _parse_partial_date(getattr(item, "start_date", None))
        secondary_date = _parse_partial_date(getattr(item, "start_date", None))
    elif section == "certifications":
        primary_date = _parse_partial_date(getattr(item, "issue_date", None)) or _parse_partial_date(getattr(item, "expiry_date", None))
        secondary_date = _parse_partial_date(getattr(item, "expiry_date", None))

    created_at = getattr(item, "created_at", None)
    created_rank = -created_at.timestamp() if isinstance(created_at, datetime) else 0
    primary_rank = -primary_date.toordinal() if isinstance(primary_date, datetime) else 0
    secondary_rank = -secondary_date.toordinal() if isinstance(secondary_date, datetime) else 0

    return (
        0 if current_flag else 1,
        0 if primary_date is not None else 1,
        primary_rank,
        0 if secondary_date is not None else 1,
        secondary_rank,
        getattr(item, "sort_order", 0),
        created_rank,
    )


def sort_profile_section_items(section: str, items: Iterable[object]) -> list[object]:
    return sorted(list(items), key=lambda item: _timeline_sort_key(section, item))


def normalize_middle_order(order: Iterable[str] | None) -> list[str]:
    normalized: list[str] = []
    for item in order or []:
        key = str(item).strip().lower()
        if key in ALLOWED_MIDDLE_ORDER and key not in normalized:
            normalized.append(key)
    for fallback in ALLOWED_MIDDLE_ORDER:
        if fallback not in normalized:
            normalized.append(fallback)
    return normalized


def parse_object_id(raw_id: str, *, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(raw_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid {field_name}",
        ) from exc


async def resolve_profile_user(identifier: str) -> User | None:
    cleaned = identifier.strip()
    if not cleaned:
        return None

    try:
        object_id = PydanticObjectId(cleaned)
        by_id = await User.find_one({"_id": object_id})
        if by_id is not None:
            return by_id
    except Exception:
        pass

    lowered = cleaned.lower()
    by_username = await User.find_one({"username": lowered})
    if by_username is not None:
        return by_username
    return await User.find_one({"profile_slug": lowered})


def default_profile(user_id: PydanticObjectId) -> UserProfile:
    return UserProfile(user_id=user_id, completion_percent=0)


def default_visibility(user_id: PydanticObjectId) -> UserProfileVisibility:
    return UserProfileVisibility(user_id=user_id)


def default_layout(user_id: PydanticObjectId) -> UserProfileLayout:
    return UserProfileLayout(user_id=user_id, middle_order=list(ALLOWED_MIDDLE_ORDER))


async def get_profile_doc(user_id: PydanticObjectId, *, create: bool) -> UserProfile:
    doc = await UserProfile.find_one({"user_id": user_id})
    if doc is not None:
        return doc
    doc = default_profile(user_id)
    if create:
        await doc.insert()
    return doc


async def get_visibility_doc(user_id: PydanticObjectId, *, create: bool) -> UserProfileVisibility:
    doc = await UserProfileVisibility.find_one({"user_id": user_id})
    if doc is not None:
        return doc
    doc = default_visibility(user_id)
    if create:
        await doc.insert()
    return doc


async def get_layout_doc(user_id: PydanticObjectId, *, create: bool) -> UserProfileLayout:
    doc = await UserProfileLayout.find_one({"user_id": user_id})
    if doc is not None:
        doc.middle_order = normalize_middle_order(doc.middle_order)
        return doc
    doc = default_layout(user_id)
    if create:
        await doc.insert()
    return doc


async def list_section_items(user_id: PydanticObjectId, *, include_hidden: bool) -> dict[str, list[object]]:
    result: dict[str, list[object]] = {}
    for key, model in SECTION_MODEL_MAP.items():
        filters: dict[str, object] = {"user_id": user_id}
        if not include_hidden:
            filters["is_visible"] = True
        items = await model.find(filters).to_list()
        result[key] = sort_profile_section_items(key, items)
    return result


async def load_profile_bundle(user_id: PydanticObjectId) -> dict[str, object]:
    bundle = {
        "profile": await get_profile_doc(user_id, create=False),
        "visibility": await get_visibility_doc(user_id, create=False),
        "layout": await get_layout_doc(user_id, create=False),
    }
    bundle.update(await list_section_items(user_id, include_hidden=False))
    return bundle


async def load_or_create_profile_bundle(user: User) -> dict[str, object]:
    bundle = {
        "profile": await get_profile_doc(user.id, create=True),
        "visibility": await get_visibility_doc(user.id, create=True),
        "layout": await get_layout_doc(user.id, create=True),
    }
    bundle.update(await list_section_items(user.id, include_hidden=True))
    await refresh_completion(user, bundle, persist=False)
    return bundle


def _count_visible_items(items: Iterable[object]) -> int:
    count = 0
    for item in items:
        if getattr(item, "is_visible", True):
            count += 1
    return count


def calculate_completion_percent(user: User, bundle: dict[str, object]) -> int:
    profile: UserProfile = bundle["profile"]  # type: ignore[assignment]
    score = 0
    if (user.display_name or "").strip():
        score += 10
    if (user.bio or "").strip():
        score += 8
    if (user.avatar_url or "").strip():
        score += 8
    if (profile.headline or "").strip():
        score += 12
    if (profile.about or "").strip():
        score += 14
    if (profile.location or "").strip():
        score += 6
    if (profile.website or "").strip():
        score += 6
    if (profile.banner_url or "").strip():
        score += 6
    if _count_visible_items(bundle.get("experience", [])):
        score += 12
    if _count_visible_items(bundle.get("education", [])):
        score += 8
    if _count_visible_items(bundle.get("projects", [])):
        score += 6
    if _count_visible_items(bundle.get("skills", [])):
        score += 4
    if _count_visible_items(bundle.get("certifications", [])):
        score += 3
    if _count_visible_items(bundle.get("contact_links", [])):
        score += 5
    return min(score, 100)


async def refresh_completion(user: User, bundle: dict[str, object], *, persist: bool) -> UserProfile:
    profile: UserProfile = bundle["profile"]  # type: ignore[assignment]
    completion = calculate_completion_percent(user, bundle)
    profile.completion_percent = completion
    if persist:
        await profile.save()
    return profile


def filter_contact_links(items: Iterable[UserContactLink]) -> list[UserContactLink]:
    return [
        item
        for item in items
        if item.is_visible and item.is_public
    ]


def build_public_sections(user: User, bundle: dict[str, object]) -> dict[str, list[object]]:
    visibility: UserProfileVisibility = bundle["visibility"]  # type: ignore[assignment]
    return {
        "experience": list(bundle.get("experience", [])) if visibility.show_experience else [],
        "education": list(bundle.get("education", [])) if visibility.show_education else [],
        "projects": list(bundle.get("projects", [])) if visibility.show_projects else [],
        "skills": list(bundle.get("skills", [])) if visibility.show_skills else [],
        "certifications": list(bundle.get("certifications", [])) if visibility.show_certifications else [],
        "contact_links": filter_contact_links(bundle.get("contact_links", [])) if visibility.show_contact else [],
    }


async def can_view_private_activity(viewer: User | None, owner: User) -> bool:
    if not owner.is_private:
        return True
    if viewer is None:
        return False
    if viewer.id == owner.id:
        return True
    if viewer.role == UserRole.ADMIN:
        return True
    connection = await Connection.find_one(
        {
            "status": ConnectionStatus.ACCEPTED,
            "$or": [
                {"requester_id": viewer.id, "addressee_id": owner.id},
                {"requester_id": owner.id, "addressee_id": viewer.id},
            ],
        }
    )
    return connection is not None


def serialize_doc(doc: object) -> dict[str, object]:
    data = doc.model_dump() if hasattr(doc, "model_dump") else dict(doc)
    data["id"] = str(getattr(doc, "id", data.get("id")))
    if "user_id" in data:
        data["user_id"] = str(data["user_id"])
    return data


async def create_section_item(section: str, user: User, payload: dict[str, object]) -> object:
    model = SECTION_MODEL_MAP[section]
    data = dict(payload)
    data["user_id"] = user.id
    if section == "contact_links" and data.get("is_public") is None:
        contact_type = ContactLinkType(str(data["type"]))
        data["is_public"] = contact_type not in {ContactLinkType.EMAIL, ContactLinkType.PHONE}
    item = model(**data)
    await item.insert()
    return item


async def update_section_item(section: str, item_id: str, user: User, payload: dict[str, object]) -> object:
    model = SECTION_MODEL_MAP[section]
    object_id = parse_object_id(item_id, field_name="item_id")
    item = await model.find_one({"_id": object_id, "user_id": user.id})
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile item not found")
    for key, value in payload.items():
        if value is not None:
            setattr(item, key, value)
    await item.save()
    return item


async def delete_section_item(section: str, item_id: str, user: User) -> bool:
    model = SECTION_MODEL_MAP[section]
    object_id = parse_object_id(item_id, field_name="item_id")
    item = await model.find_one({"_id": object_id, "user_id": user.id})
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile item not found")
    await item.delete()
    return True


async def delete_profile_item_as_admin(section: str, item_id: str) -> bool:
    model = SECTION_MODEL_MAP[section]
    object_id = parse_object_id(item_id, field_name="item_id")
    item = await model.find_one({"_id": object_id})
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile item not found")
    await item.delete()
    return True
