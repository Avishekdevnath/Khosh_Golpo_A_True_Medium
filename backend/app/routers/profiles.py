from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.auth import get_current_user, get_optional_current_user
from app.models.user_profile import UserProfile
from app.models.user import User, UserRole
from app.schemas.profile import (
    CertificationCreate,
    CertificationOut,
    CertificationUpdate,
    ContactLinkCreate,
    ContactLinkOut,
    ContactLinkUpdate,
    EducationCreate,
    EducationOut,
    EducationUpdate,
    ExperienceCreate,
    ExperienceOut,
    ExperienceUpdate,
    ManageProfileOut,
    ProfileBasicsOut,
    ProfileBasicsUpdate,
    ProfileLayoutOut,
    ProfileLayoutUpdate,
    ProfileMediaSignatureOut,
    ProfileMediaSignatureRequest,
    ProfileSectionsOut,
    ProfileUserSummaryOut,
    ProfileViewerStateOut,
    ProfileVisibilityOut,
    ProfileVisibilityUpdate,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    PublicProfileOut,
    SkillCreate,
    SkillOut,
    SkillUpdate,
)
from app.services.audit import log_audit
from app.services import cloudinary as cloudinary_service
from app.services import profiles as profile_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


async def _resolve_profile_user(identifier: str) -> User | None:
    return await profile_service.resolve_profile_user(identifier)


async def _load_profile_bundle(user: User) -> dict[str, object]:
    bundle = await profile_service.load_profile_bundle(user.id)
    await profile_service.refresh_completion(user, bundle, persist=False)
    return bundle


async def _load_or_create_profile_bundle(user: User) -> dict[str, object]:
    bundle = await profile_service.load_or_create_profile_bundle(user)
    await profile_service.refresh_completion(user, bundle, persist=False)
    return bundle


async def _create_section_item(section: str, user: User, payload: dict[str, object]) -> object:
    item = await profile_service.create_section_item(section, user, payload)
    bundle = await profile_service.load_or_create_profile_bundle(user)
    await profile_service.refresh_completion(user, bundle, persist=True)
    return item


async def _update_section_item(section: str, item_id: str, user: User, payload: dict[str, object]) -> object:
    item = await profile_service.update_section_item(section, item_id, user, payload)
    bundle = await profile_service.load_or_create_profile_bundle(user)
    await profile_service.refresh_completion(user, bundle, persist=True)
    return item


async def _delete_section_item(section: str, item_id: str, user: User) -> bool:
    deleted = await profile_service.delete_section_item(section, item_id, user)
    bundle = await profile_service.load_or_create_profile_bundle(user)
    await profile_service.refresh_completion(user, bundle, persist=True)
    return deleted


def _to_user_summary(user: User) -> ProfileUserSummaryOut:
    return ProfileUserSummaryOut(
        id=str(user.id),
        username=user.username,
        display_name=user.display_name,
        bio=user.bio,
        avatar_url=user.avatar_url,
        profile_slug=user.profile_slug,
        is_private=user.is_private,
        is_bot=user.is_bot,
        created_at=user.created_at,
    )


def _to_basics(profile: object, *, include_about: bool) -> ProfileBasicsOut:
    return ProfileBasicsOut(
        headline=getattr(profile, "headline", None),
        about=getattr(profile, "about", None) if include_about else None,
        banner_url=getattr(profile, "banner_url", None),
        location=getattr(profile, "location", None),
        website=getattr(profile, "website", None),
        completion_percent=getattr(profile, "completion_percent", 0) or 0,
    )


def _to_sections(sections: dict[str, list[object]]) -> ProfileSectionsOut:
    return ProfileSectionsOut(
        experience=[ExperienceOut(**profile_service.serialize_doc(item)) for item in sections.get("experience", [])],
        education=[EducationOut(**profile_service.serialize_doc(item)) for item in sections.get("education", [])],
        projects=[ProjectOut(**profile_service.serialize_doc(item)) for item in sections.get("projects", [])],
        skills=[SkillOut(**profile_service.serialize_doc(item)) for item in sections.get("skills", [])],
        certifications=[CertificationOut(**profile_service.serialize_doc(item)) for item in sections.get("certifications", [])],
        contact_links=[ContactLinkOut(**profile_service.serialize_doc(item)) for item in sections.get("contact_links", [])],
    )


async def _build_public_profile(profile_user: User, viewer: User | None, bundle: dict[str, object]) -> PublicProfileOut:
    visibility = bundle["visibility"]
    can_view_activity = await profile_service.can_view_private_activity(viewer, profile_user)
    is_owner = viewer is not None and viewer.id == profile_user.id
    is_admin = viewer is not None and viewer.role == UserRole.ADMIN

    public_sections = profile_service.build_public_sections(profile_user, bundle)
    if is_owner or is_admin:
        public_sections["contact_links"] = [
            item for item in bundle.get("contact_links", []) if getattr(item, "is_visible", True)
        ]

    return PublicProfileOut(
        user=_to_user_summary(profile_user),
        basics=_to_basics(bundle["profile"], include_about=getattr(visibility, "show_about", True)),
        layout=ProfileLayoutOut.model_validate(bundle["layout"]),
        sections=_to_sections(public_sections),
        viewer=ProfileViewerStateOut(
            is_owner=is_owner,
            is_admin=is_admin,
            can_view_activity=can_view_activity,
        ),
    )


def _build_manage_profile(user: User, bundle: dict[str, object]) -> ManageProfileOut:
    return ManageProfileOut(
        user=_to_user_summary(user),
        basics=_to_basics(bundle["profile"], include_about=True),
        visibility=ProfileVisibilityOut.model_validate(bundle["visibility"]),
        layout=ProfileLayoutOut.model_validate(bundle["layout"]),
        sections=_to_sections(bundle),
    )


async def _write_profile_audit(action: str, current_user: User, *, details: dict[str, object]) -> None:
    await log_audit(
        action=action,
        actor_id=current_user.id,
        target_type="user",
        target_id=current_user.id,
        details=details,
    )


async def _build_profile_media_signature(user: User, kind: str) -> dict[str, object]:
    return cloudinary_service.build_profile_media_signature(user, kind)


async def _delete_profile_media_asset(*, kind: str, user: User, profile: UserProfile) -> None:
    await cloudinary_service.delete_profile_media_asset(kind, user, profile)


@router.get("/me/manage", response_model=ManageProfileOut)
async def get_manage_profile(current_user: User = Depends(get_current_user)) -> ManageProfileOut:
    bundle = await _load_or_create_profile_bundle(current_user)
    return _build_manage_profile(current_user, bundle)


@router.post("/me/media/signature", response_model=ProfileMediaSignatureOut)
async def get_profile_media_signature(
    payload: ProfileMediaSignatureRequest,
    current_user: User = Depends(get_current_user),
) -> ProfileMediaSignatureOut:
    signed_payload = await _build_profile_media_signature(current_user, payload.kind)
    return ProfileMediaSignatureOut(**signed_payload)


@router.patch("/me/basics", response_model=ManageProfileOut)
async def update_profile_basics(
    payload: ProfileBasicsUpdate,
    current_user: User = Depends(get_current_user),
) -> ManageProfileOut:
    bundle = await _load_or_create_profile_bundle(current_user)
    profile = bundle["profile"]
    changed_fields: list[str] = []

    if payload.display_name is not None:
        current_user.display_name = payload.display_name
        changed_fields.append("display_name")
    if payload.bio is not None:
        current_user.bio = payload.bio
        changed_fields.append("bio")
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url.strip() or None
        changed_fields.append("avatar_url")
    if payload.is_private is not None:
        current_user.is_private = payload.is_private
        changed_fields.append("is_private")
    if payload.avatar_public_id is not None:
        profile.avatar_public_id = payload.avatar_public_id.strip() or None
        changed_fields.append("avatar_public_id")

    profile_fields = ("headline", "about", "banner_url", "location", "website")
    for field_name in profile_fields:
        value = getattr(payload, field_name)
        if value is not None:
            setattr(profile, field_name, value.strip() if isinstance(value, str) else value)
            changed_fields.append(field_name)
    if payload.banner_public_id is not None:
        profile.banner_public_id = payload.banner_public_id.strip() or None
        changed_fields.append("banner_public_id")

    bundle["profile"] = profile
    await profile_service.refresh_completion(current_user, bundle, persist=False)
    await current_user.save()
    await profile.save()

    if changed_fields:
        await _write_profile_audit(
            "user_profile_basics_updated",
            current_user,
            details={"fields": changed_fields},
        )

    bundle = await _load_or_create_profile_bundle(current_user)
    return _build_manage_profile(current_user, bundle)


@router.delete("/me/media/avatar", response_model=ManageProfileOut)
async def delete_profile_avatar(current_user: User = Depends(get_current_user)) -> ManageProfileOut:
    bundle = await _load_or_create_profile_bundle(current_user)
    profile = bundle["profile"]
    await _delete_profile_media_asset(kind="avatar", user=current_user, profile=profile)
    current_user.avatar_url = None
    profile.avatar_public_id = None
    await profile_service.refresh_completion(current_user, bundle, persist=False)
    await current_user.save()
    await profile.save()
    await _write_profile_audit("user_profile_media_deleted", current_user, details={"kind": "avatar"})
    bundle = await _load_or_create_profile_bundle(current_user)
    return _build_manage_profile(current_user, bundle)


@router.delete("/me/media/banner", response_model=ManageProfileOut)
async def delete_profile_banner(current_user: User = Depends(get_current_user)) -> ManageProfileOut:
    bundle = await _load_or_create_profile_bundle(current_user)
    profile = bundle["profile"]
    await _delete_profile_media_asset(kind="banner", user=current_user, profile=profile)
    profile.banner_url = None
    profile.banner_public_id = None
    await profile_service.refresh_completion(current_user, bundle, persist=False)
    await current_user.save()
    await profile.save()
    await _write_profile_audit("user_profile_media_deleted", current_user, details={"kind": "banner"})
    bundle = await _load_or_create_profile_bundle(current_user)
    return _build_manage_profile(current_user, bundle)


@router.patch("/me/visibility", response_model=ManageProfileOut)
async def update_profile_visibility(
    payload: ProfileVisibilityUpdate,
    current_user: User = Depends(get_current_user),
) -> ManageProfileOut:
    bundle = await _load_or_create_profile_bundle(current_user)
    visibility = bundle["visibility"]
    changed_fields: list[str] = []

    for field_name, value in payload.model_dump().items():
        if value is not None:
            setattr(visibility, field_name, value)
            changed_fields.append(field_name)

    await visibility.save()
    if changed_fields:
        await _write_profile_audit(
            "user_profile_visibility_updated",
            current_user,
            details={"fields": changed_fields},
        )
    bundle = await _load_or_create_profile_bundle(current_user)
    return _build_manage_profile(current_user, bundle)


@router.patch("/me/layout", response_model=ManageProfileOut)
async def update_profile_layout(
    payload: ProfileLayoutUpdate,
    current_user: User = Depends(get_current_user),
) -> ManageProfileOut:
    bundle = await _load_or_create_profile_bundle(current_user)
    layout = bundle["layout"]
    layout.middle_order = profile_service.normalize_middle_order(payload.middle_order)
    await layout.save()
    await _write_profile_audit(
        "user_profile_layout_updated",
        current_user,
        details={"middle_order": layout.middle_order},
    )
    bundle = await _load_or_create_profile_bundle(current_user)
    return _build_manage_profile(current_user, bundle)


@router.post("/me/experience", response_model=ExperienceOut, status_code=status.HTTP_201_CREATED)
async def create_experience(payload: ExperienceCreate, current_user: User = Depends(get_current_user)) -> ExperienceOut:
    item = await _create_section_item("experience", current_user, payload.model_dump())
    await _write_profile_audit("user_profile_section_created", current_user, details={"section": "experience"})
    return ExperienceOut(**profile_service.serialize_doc(item))


@router.patch("/me/experience/{item_id}", response_model=ExperienceOut)
async def update_experience(item_id: str, payload: ExperienceUpdate, current_user: User = Depends(get_current_user)) -> ExperienceOut:
    item = await _update_section_item("experience", item_id, current_user, payload.model_dump(exclude_unset=True))
    await _write_profile_audit("user_profile_section_updated", current_user, details={"section": "experience"})
    return ExperienceOut(**profile_service.serialize_doc(item))


@router.delete("/me/experience/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experience(item_id: str, current_user: User = Depends(get_current_user)) -> Response:
    await _delete_section_item("experience", item_id, current_user)
    await _write_profile_audit("user_profile_section_deleted", current_user, details={"section": "experience"})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/education", response_model=EducationOut, status_code=status.HTTP_201_CREATED)
async def create_education(payload: EducationCreate, current_user: User = Depends(get_current_user)) -> EducationOut:
    item = await _create_section_item("education", current_user, payload.model_dump())
    await _write_profile_audit("user_profile_section_created", current_user, details={"section": "education"})
    return EducationOut(**profile_service.serialize_doc(item))


@router.patch("/me/education/{item_id}", response_model=EducationOut)
async def update_education(item_id: str, payload: EducationUpdate, current_user: User = Depends(get_current_user)) -> EducationOut:
    item = await _update_section_item("education", item_id, current_user, payload.model_dump(exclude_unset=True))
    await _write_profile_audit("user_profile_section_updated", current_user, details={"section": "education"})
    return EducationOut(**profile_service.serialize_doc(item))


@router.delete("/me/education/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_education(item_id: str, current_user: User = Depends(get_current_user)) -> Response:
    await _delete_section_item("education", item_id, current_user)
    await _write_profile_audit("user_profile_section_deleted", current_user, details={"section": "education"})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, current_user: User = Depends(get_current_user)) -> ProjectOut:
    item = await _create_section_item("projects", current_user, payload.model_dump())
    await _write_profile_audit("user_profile_section_created", current_user, details={"section": "projects"})
    return ProjectOut(**profile_service.serialize_doc(item))


@router.patch("/me/projects/{item_id}", response_model=ProjectOut)
async def update_project(item_id: str, payload: ProjectUpdate, current_user: User = Depends(get_current_user)) -> ProjectOut:
    item = await _update_section_item("projects", item_id, current_user, payload.model_dump(exclude_unset=True))
    await _write_profile_audit("user_profile_section_updated", current_user, details={"section": "projects"})
    return ProjectOut(**profile_service.serialize_doc(item))


@router.delete("/me/projects/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(item_id: str, current_user: User = Depends(get_current_user)) -> Response:
    await _delete_section_item("projects", item_id, current_user)
    await _write_profile_audit("user_profile_section_deleted", current_user, details={"section": "projects"})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/skills", response_model=SkillOut, status_code=status.HTTP_201_CREATED)
async def create_skill(payload: SkillCreate, current_user: User = Depends(get_current_user)) -> SkillOut:
    item = await _create_section_item("skills", current_user, payload.model_dump())
    await _write_profile_audit("user_profile_section_created", current_user, details={"section": "skills"})
    return SkillOut(**profile_service.serialize_doc(item))


@router.patch("/me/skills/{item_id}", response_model=SkillOut)
async def update_skill(item_id: str, payload: SkillUpdate, current_user: User = Depends(get_current_user)) -> SkillOut:
    item = await _update_section_item("skills", item_id, current_user, payload.model_dump(exclude_unset=True))
    await _write_profile_audit("user_profile_section_updated", current_user, details={"section": "skills"})
    return SkillOut(**profile_service.serialize_doc(item))


@router.delete("/me/skills/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(item_id: str, current_user: User = Depends(get_current_user)) -> Response:
    await _delete_section_item("skills", item_id, current_user)
    await _write_profile_audit("user_profile_section_deleted", current_user, details={"section": "skills"})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/certifications", response_model=CertificationOut, status_code=status.HTTP_201_CREATED)
async def create_certification(payload: CertificationCreate, current_user: User = Depends(get_current_user)) -> CertificationOut:
    item = await _create_section_item("certifications", current_user, payload.model_dump())
    await _write_profile_audit("user_profile_section_created", current_user, details={"section": "certifications"})
    return CertificationOut(**profile_service.serialize_doc(item))


@router.patch("/me/certifications/{item_id}", response_model=CertificationOut)
async def update_certification(item_id: str, payload: CertificationUpdate, current_user: User = Depends(get_current_user)) -> CertificationOut:
    item = await _update_section_item("certifications", item_id, current_user, payload.model_dump(exclude_unset=True))
    await _write_profile_audit("user_profile_section_updated", current_user, details={"section": "certifications"})
    return CertificationOut(**profile_service.serialize_doc(item))


@router.delete("/me/certifications/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_certification(item_id: str, current_user: User = Depends(get_current_user)) -> Response:
    await _delete_section_item("certifications", item_id, current_user)
    await _write_profile_audit("user_profile_section_deleted", current_user, details={"section": "certifications"})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/contact-links", response_model=ContactLinkOut, status_code=status.HTTP_201_CREATED)
async def create_contact_link(payload: ContactLinkCreate, current_user: User = Depends(get_current_user)) -> ContactLinkOut:
    item = await _create_section_item("contact_links", current_user, payload.model_dump())
    await _write_profile_audit("user_profile_section_created", current_user, details={"section": "contact_links"})
    return ContactLinkOut(**profile_service.serialize_doc(item))


@router.patch("/me/contact-links/{item_id}", response_model=ContactLinkOut)
async def update_contact_link(item_id: str, payload: ContactLinkUpdate, current_user: User = Depends(get_current_user)) -> ContactLinkOut:
    item = await _update_section_item("contact_links", item_id, current_user, payload.model_dump(exclude_unset=True))
    await _write_profile_audit("user_profile_section_updated", current_user, details={"section": "contact_links"})
    return ContactLinkOut(**profile_service.serialize_doc(item))


@router.delete("/me/contact-links/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact_link(item_id: str, current_user: User = Depends(get_current_user)) -> Response:
    await _delete_section_item("contact_links", item_id, current_user)
    await _write_profile_audit("user_profile_section_deleted", current_user, details={"section": "contact_links"})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{identifier}", response_model=PublicProfileOut)
async def get_public_profile(
    identifier: str,
    viewer: User | None = Depends(get_optional_current_user),
) -> PublicProfileOut:
    profile_user = await _resolve_profile_user(identifier)
    if profile_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    bundle = await _load_profile_bundle(profile_user)
    return await _build_public_profile(profile_user, viewer, bundle)
