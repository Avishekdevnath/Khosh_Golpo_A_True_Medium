from datetime import datetime, timezone


def ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def timestamps_for_insert(created_at: datetime | None = None) -> tuple[datetime, datetime]:
    created = ensure_utc(created_at) or utc_now()
    return created, created


def timestamps_for_replace(created_at: datetime | None = None) -> tuple[datetime, datetime]:
    created = ensure_utc(created_at) or utc_now()
    return created, utc_now()


def utc_isoformat(value: datetime) -> str:
    normalized = ensure_utc(value)
    if normalized is None:
        raise ValueError("utc_isoformat requires a datetime value")
    return normalized.isoformat().replace("+00:00", "Z")
