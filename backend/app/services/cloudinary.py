from __future__ import annotations

import asyncio
import hashlib
import json
import time
from urllib import error, parse, request

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.models.user import User
from app.models.user_profile import UserProfile

PROFILE_MEDIA_KINDS = {"avatar", "banner"}


def _require_cloudinary_config() -> tuple[str, str, str, str]:
    settings = get_settings()
    cloud_name = (settings.cloudinary_cloud_name or "").strip()
    api_key = (settings.cloudinary_api_key or "").strip()
    api_secret = (settings.cloudinary_api_secret or "").strip()
    folder = (settings.cloudinary_profile_media_folder or "khoshgolpo/profile-media").strip().strip("/")

    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Cloudinary is not configured")

    return cloud_name, api_key, api_secret, folder or "khoshgolpo/profile-media"


def _stringify_signature_value(value: object) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _sign_params(params: dict[str, object], api_secret: str) -> str:
    joined = "&".join(
        f"{key}={_stringify_signature_value(value)}"
        for key, value in sorted(params.items())
        if value is not None and value != ""
    )
    return hashlib.sha1(f"{joined}{api_secret}".encode("utf-8")).hexdigest()


def build_profile_media_signature(user: User, kind: str) -> dict[str, object]:
    if kind not in PROFILE_MEDIA_KINDS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid media kind")

    cloud_name, api_key, api_secret, folder = _require_cloudinary_config()
    timestamp = int(time.time())
    public_id = f"{user.id}/{kind}"
    params = {
        "folder": folder,
        "overwrite": True,
        "public_id": public_id,
        "timestamp": timestamp,
    }

    return {
        "kind": kind,
        "cloud_name": cloud_name,
        "api_key": api_key,
        "timestamp": timestamp,
        "folder": folder,
        "public_id": public_id,
        "signature": _sign_params(params, api_secret),
        "upload_url": f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload",
        "overwrite": True,
    }


def _destroy_cloudinary_asset(public_id: str) -> None:
    cloud_name, api_key, api_secret, _folder = _require_cloudinary_config()
    timestamp = int(time.time())
    payload = {
        "api_key": api_key,
        "invalidate": "true",
        "public_id": public_id,
        "signature": _sign_params(
            {
                "invalidate": True,
                "public_id": public_id,
                "timestamp": timestamp,
            },
            api_secret,
        ),
        "timestamp": str(timestamp),
    }
    encoded = parse.urlencode(payload).encode("utf-8")
    http_request = request.Request(
        f"https://api.cloudinary.com/v1_1/{cloud_name}/image/destroy",
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=15) as response:
            body = response.read().decode("utf-8")
    except error.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to remove Cloudinary asset") from exc
    except error.URLError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to reach Cloudinary") from exc

    try:
        data = json.loads(body or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid Cloudinary response") from exc

    if data.get("result") not in {"ok", "not found"}:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to remove Cloudinary asset")


async def delete_profile_media_asset(kind: str, user: User, profile: UserProfile) -> None:
    if kind == "avatar":
        public_id = profile.avatar_public_id
    elif kind == "banner":
        public_id = profile.banner_public_id
    else:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid media kind")

    if not public_id:
        return

    await asyncio.to_thread(_destroy_cloudinary_asset, public_id)
