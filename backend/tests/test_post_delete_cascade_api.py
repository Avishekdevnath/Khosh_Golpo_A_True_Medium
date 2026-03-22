from fastapi import FastAPI
from fastapi.testclient import TestClient
from beanie import PydanticObjectId

from app.core.auth import get_current_user
from app.models.thread import ThreadStatus
from app.routers import posts as posts_router
from app.routers import threads as threads_router


USER_ID = PydanticObjectId("67aa00000000000000000001")
THREAD_ID = PydanticObjectId("67aa00000000000000000002")
ROOT_POST_ID = PydanticObjectId("67aa00000000000000000003")
CHILD_POST_ID = PydanticObjectId("67aa00000000000000000004")
GRANDCHILD_POST_ID = PydanticObjectId("67aa00000000000000000005")
UNRELATED_POST_ID = PydanticObjectId("67aa00000000000000000006")


class DummyUser:
    def __init__(self) -> None:
        self.id = USER_ID
        self.role = "user"


class DummyPost:
    def __init__(
        self,
        *,
        post_id: PydanticObjectId,
        parent_post_id: PydanticObjectId | None,
        author_id: PydanticObjectId = USER_ID,
    ) -> None:
        self.id = post_id
        self.thread_id = THREAD_ID
        self.author_id = author_id
        self.parent_post_id = parent_post_id
        self.content = f"Post {post_id}"
        self.mentions = []
        self.ai_score = None
        self.is_flagged = False
        self.is_deleted = False
        self.saved = False

    async def save(self) -> None:
        self.saved = True


class DummyThread:
    def __init__(self) -> None:
        self.id = THREAD_ID
        self.author_id = USER_ID
        self.title = "Cascade thread"
        self.body = "Root thread body"
        self.post_count = 4
        self.status = ThreadStatus.OPEN
        self.is_deleted = False
        self.saved = False

    async def save(self) -> None:
        self.saved = True


class FakeQuery:
    def __init__(self, items):
        self._items = items

    async def to_list(self):
        return list(self._items)


def make_posts_client() -> TestClient:
    app = FastAPI()
    app.dependency_overrides[get_current_user] = lambda: DummyUser()
    app.include_router(posts_router.router)
    return TestClient(app)


def make_threads_client() -> TestClient:
    app = FastAPI()
    app.dependency_overrides[get_current_user] = lambda: DummyUser()
    app.include_router(threads_router.router)
    return TestClient(app)


def test_delete_post_cascades_to_descendants(monkeypatch) -> None:
    root = DummyPost(post_id=ROOT_POST_ID, parent_post_id=None)
    child = DummyPost(post_id=CHILD_POST_ID, parent_post_id=ROOT_POST_ID)
    grandchild = DummyPost(post_id=GRANDCHILD_POST_ID, parent_post_id=CHILD_POST_ID)
    unrelated = DummyPost(post_id=UNRELATED_POST_ID, parent_post_id=None)
    thread = DummyThread()
    events: list[dict] = []

    async def fake_post_find_one(query):
        assert query == {"_id": ROOT_POST_ID, "is_deleted": False}
        return root

    def fake_post_find(query):
        assert query == {"thread_id": THREAD_ID}
        return FakeQuery([root, child, grandchild, unrelated])

    async def fake_thread_find_one(query):
        assert query == {"_id": THREAD_ID, "is_deleted": False}
        return thread

    async def fake_log_audit(**kwargs):
        events.append(kwargs)

    monkeypatch.setattr(posts_router.Post, "find_one", fake_post_find_one)
    monkeypatch.setattr(posts_router.Post, "find", fake_post_find)
    monkeypatch.setattr(posts_router.Thread, "find_one", fake_thread_find_one)
    monkeypatch.setattr(posts_router, "log_audit", fake_log_audit)

    client = make_posts_client()
    response = client.delete(f"/posts/{ROOT_POST_ID}")

    assert response.status_code == 200
    assert root.is_deleted is True
    assert child.is_deleted is True
    assert grandchild.is_deleted is True
    assert unrelated.is_deleted is False
    assert thread.post_count == 1
    assert events and events[0]["action"] == "post_deleted"
    assert events[0]["details"]["deleted_post_count"] == 3


def test_delete_thread_cascades_all_posts(monkeypatch) -> None:
    thread = DummyThread()
    root = DummyPost(post_id=ROOT_POST_ID, parent_post_id=None)
    child = DummyPost(post_id=CHILD_POST_ID, parent_post_id=ROOT_POST_ID)
    unrelated = DummyPost(post_id=UNRELATED_POST_ID, parent_post_id=None)
    events: list[dict] = []

    async def fake_thread_find_one(query):
        assert query == {"_id": THREAD_ID, "is_deleted": False}
        return thread

    def fake_post_find(query):
        assert query == {"thread_id": THREAD_ID}
        return FakeQuery([root, child, unrelated])

    async def fake_log_audit(**kwargs):
        events.append(kwargs)

    monkeypatch.setattr(threads_router.Thread, "find_one", fake_thread_find_one)
    monkeypatch.setattr(threads_router.Post, "find", fake_post_find)
    monkeypatch.setattr(threads_router, "log_audit", fake_log_audit)

    client = make_threads_client()
    response = client.delete(f"/threads/{THREAD_ID}")

    assert response.status_code == 200
    assert thread.is_deleted is True
    assert thread.status == ThreadStatus.ARCHIVED
    assert thread.post_count == 0
    assert root.is_deleted is True
    assert child.is_deleted is True
    assert unrelated.is_deleted is True
    assert events and events[0]["action"] == "thread_deleted"
    assert events[0]["details"]["deleted_post_count"] == 3
