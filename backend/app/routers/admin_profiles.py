from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.auth import require_roles
from app.models.user import User, UserRole
from app.schemas.profile import ManageProfileOut
from app.services import profiles as profile_service
from app.services.audit import log_audit
from app.routers.profiles import _build_manage_profile

router = APIRouter(prefix="/admin", tags=["admin-profile-content"])
_require_admin = require_roles(UserRole.ADMIN)


async def _resolve_profile_user(identifier: str) -> User | None:
    return await profile_service.resolve_profile_user(identifier)


async def _load_or_create_profile_bundle_for_user(user: User) -> dict[str, object]:
    bundle = await profile_service.load_or_create_profile_bundle(user)
    await profile_service.refresh_completion(user, bundle, persist=False)
    return bundle


async def _delete_profile_item_as_admin(section: str, item_id: str, admin_user: User) -> bool:
    deleted = await profile_service.delete_profile_item_as_admin(section, item_id)
    await log_audit(
        action="admin_profile_item_deleted",
        actor_id=admin_user.id,
        target_type="profile_item",
        target_id=None,
        details={"section": section, "item_id": item_id},
    )
    return deleted


@router.get("/users/{user_id}/profile-content", response_model=ManageProfileOut)
async def get_user_profile_content(
    user_id: str,
    admin_user: User = Depends(_require_admin),
) -> ManageProfileOut:
    del admin_user
    user = await _resolve_profile_user(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    bundle = await _load_or_create_profile_bundle_for_user(user)
    return _build_manage_profile(user, bundle)


@router.delete("/profile-content/{section}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile_content_item(
    section: str,
    item_id: str,
    admin_user: User = Depends(_require_admin),
) -> Response:
    if section not in profile_service.SECTION_MODEL_MAP:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile section not found")
    await _delete_profile_item_as_admin(section, item_id, admin_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
