import asyncio

from beanie import PydanticObjectId
from starlette.requests import Request

from app.routers import admin as admin_router
from app.schemas.admin import AdminHardDeleteBulkItem, AdminHardDeleteBulkRequest


ADMIN_ID = PydanticObjectId("68aa00000000000000000001")
THREAD_ID = PydanticObjectId("68aa00000000000000000002")
ROOT_POST_ID = PydanticObjectId("68aa00000000000000000003")
CHILD_POST_ID = PydanticObjectId("68aa00000000000000000004")
UNRELATED_POST_ID = PydanticObjectId("68aa00000000000000000005")


class DummyAdmin:
    def __init__(self) -> None:
        self.id = ADMIN_ID


class DummyThread:
    def __init__(self) -> None:
        self.id = THREAD_ID
        self.author_id = ADMIN_ID
        self.title = "Deleted thread"
        self.is_deleted = True
        self.deleted = False

    async def delete(self) -> None:
        self.deleted = True


class DummyPost:
    def __init__(self, *, post_id: PydanticObjectId, parent_post_id: PydanticObjectId | None = None) -> None:
        self.id = post_id
        self.thread_id = THREAD_ID
        self.author_id = ADMIN_ID
        self.parent_post_id = parent_post_id
        self.content = f"Deleted post {post_id}"
        self.is_deleted = True
        self.deleted = False

    async def delete(self) -> None:
        self.deleted = True


class FakeQuery:
    def __init__(self, items):
        self._items = items

    async def to_list(self):
        return list(self._items)


def make_request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/admin/content/hard-delete-bulk",
            "headers": [],
            "client": ("127.0.0.1", 50000),
        }
    )


def test_bulk_hard_delete_removes_deleted_thread_and_posts(monkeypatch) -> None:
    thread = DummyThread()
    root = DummyPost(post_id=ROOT_POST_ID)
    child = DummyPost(post_id=CHILD_POST_ID, parent_post_id=ROOT_POST_ID)
    audits: list[dict] = []

    async def fake_thread_find_one(query):
        assert query == {"_id": THREAD_ID}
        return thread

    def fake_post_find(query):
        assert query == {"thread_id": THREAD_ID}
        return FakeQuery([root, child])

    async def fake_write_audit_log(**kwargs):
        audits.append(kwargs)

    monkeypatch.setattr(admin_router.Thread, "find_one", fake_thread_find_one)
    monkeypatch.setattr(admin_router.Post, "find", fake_post_find)
    monkeypatch.setattr(admin_router, "_write_audit_log", fake_write_audit_log)

    payload = AdminHardDeleteBulkRequest(
        actions=[
            AdminHardDeleteBulkItem(content_type="thread", content_id=str(THREAD_ID), reason="cleanup"),
        ]
    )
    response = asyncio.run(
        admin_router.bulk_hard_delete_content(
            payload=payload,
            request=make_request(),
            admin_user=DummyAdmin(),
        )
    )

    assert response.succeeded == 1
    assert thread.deleted is True
    assert root.deleted is True
    assert child.deleted is True
    assert audits and audits[0]["action"] == "admin_thread_hard_deleted"


def test_bulk_hard_delete_removes_deleted_post_subtree(monkeypatch) -> None:
    root = DummyPost(post_id=ROOT_POST_ID)
    child = DummyPost(post_id=CHILD_POST_ID, parent_post_id=ROOT_POST_ID)
    unrelated = DummyPost(post_id=UNRELATED_POST_ID)
    audits: list[dict] = []

    async def fake_post_find_one(query):
        assert query == {"_id": ROOT_POST_ID}
        return root

    def fake_post_find(query):
        assert query == {"thread_id": THREAD_ID}
        return FakeQuery([root, child, unrelated])

    async def fake_write_audit_log(**kwargs):
        audits.append(kwargs)

    monkeypatch.setattr(admin_router.Post, "find_one", fake_post_find_one)
    monkeypatch.setattr(admin_router.Post, "find", fake_post_find)
    monkeypatch.setattr(admin_router, "_write_audit_log", fake_write_audit_log)

    payload = AdminHardDeleteBulkRequest(
        actions=[
            AdminHardDeleteBulkItem(content_type="post", content_id=str(ROOT_POST_ID), reason="cleanup"),
        ]
    )
    response = asyncio.run(
        admin_router.bulk_hard_delete_content(
            payload=payload,
            request=make_request(),
            admin_user=DummyAdmin(),
        )
    )

    assert response.succeeded == 1
    assert root.deleted is True
    assert child.deleted is True
    assert unrelated.deleted is False
    assert audits and audits[0]["action"] == "admin_post_hard_deleted"
