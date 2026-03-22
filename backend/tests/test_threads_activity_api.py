from fastapi import FastAPI
from fastapi.testclient import TestClient
from beanie import PydanticObjectId

from app.core.auth import get_current_user
from app.routers import threads as threads_router
from app.routers import users as users_router


USER_ID = PydanticObjectId("66aa00000000000000000001")
AUTHOR_ID = PydanticObjectId("66aa00000000000000000002")
THREAD_ID = PydanticObjectId("66aa00000000000000000003")
POST_ID = PydanticObjectId("66aa00000000000000000004")


class DummyUser:
    def __init__(self) -> None:
        self.id = USER_ID
        self.role = "user"


class DummyThread:
    def __init__(self, likes: list[PydanticObjectId] | None = None) -> None:
        self.id = THREAD_ID
        self.author_id = AUTHOR_ID
        self.title = "Thread title"
        self.body = "Thread body"
        self.likes = list(likes or [])
        self.is_deleted = False
        self.saved = False

    async def save(self) -> None:
        self.saved = True


class DummyPost:
    def __init__(self, likes: list[PydanticObjectId] | None = None) -> None:
        self.id = POST_ID
        self.thread_id = THREAD_ID
        self.author_id = AUTHOR_ID
        self.parent_post_id = None
        self.content = "Post body"
        self.likes = list(likes or [])
        self.is_deleted = False
        self.saved = False

    async def save(self) -> None:
        self.saved = True


class DummySavedThread:
    def __init__(self) -> None:
        self.deleted = False

    async def delete(self) -> None:
        self.deleted = True


def make_client() -> TestClient:
    app = FastAPI()
    app.dependency_overrides[get_current_user] = lambda: DummyUser()
    app.include_router(threads_router.router)
    return TestClient(app)


def test_engagement_category_includes_like_save_and_share_actions() -> None:
    actions = users_router._activity_actions_for_category("engagement")

    assert actions is not None
    assert "thread_liked" in actions
    assert "thread_unliked" in actions
    assert "post_liked" in actions
    assert "post_unliked" in actions
    assert "thread_saved" in actions
    assert "thread_unsaved" in actions
    assert "thread_shared" in actions


def test_like_thread_logs_thread_liked(monkeypatch) -> None:
    events: list[dict] = []
    thread = DummyThread(likes=[])

    async def fake_find_one(query):
        assert query == {"_id": THREAD_ID, "is_deleted": False}
        return thread

    async def fake_log_audit(**kwargs) -> None:
        events.append(kwargs)

    monkeypatch.setattr(threads_router.Thread, "find_one", fake_find_one)
    monkeypatch.setattr(threads_router, "log_audit", fake_log_audit)

    client = make_client()
    response = client.post(f"/threads/{THREAD_ID}/like")

    assert response.status_code == 200
    assert response.json() == {"liked": True, "like_count": 1}
    assert thread.likes == [USER_ID]
    assert events and events[0]["action"] == "thread_liked"


def test_unlike_thread_logs_thread_unliked(monkeypatch) -> None:
    events: list[dict] = []
    thread = DummyThread(likes=[USER_ID])

    async def fake_find_one(query):
        assert query == {"_id": THREAD_ID, "is_deleted": False}
        return thread

    async def fake_log_audit(**kwargs) -> None:
        events.append(kwargs)

    monkeypatch.setattr(threads_router.Thread, "find_one", fake_find_one)
    monkeypatch.setattr(threads_router, "log_audit", fake_log_audit)

    client = make_client()
    response = client.delete(f"/threads/{THREAD_ID}/like")

    assert response.status_code == 200
    assert response.json() == {"liked": False, "like_count": 0}
    assert thread.likes == []
    assert events and events[0]["action"] == "thread_unliked"


def test_like_post_logs_post_liked(monkeypatch) -> None:
    events: list[dict] = []
    post = DummyPost(likes=[])

    async def fake_find_one(query):
        assert query == {"_id": POST_ID, "thread_id": THREAD_ID, "is_deleted": False}
        return post

    async def fake_log_audit(**kwargs) -> None:
        events.append(kwargs)

    monkeypatch.setattr(threads_router.Post, "find_one", fake_find_one)
    monkeypatch.setattr(threads_router, "log_audit", fake_log_audit)

    client = make_client()
    response = client.post(f"/threads/{THREAD_ID}/posts/{POST_ID}/like")

    assert response.status_code == 200
    assert response.json() == {"liked": True, "like_count": 1}
    assert post.likes == [USER_ID]
    assert events and events[0]["action"] == "post_liked"


def test_unlike_post_logs_post_unliked(monkeypatch) -> None:
    events: list[dict] = []
    post = DummyPost(likes=[USER_ID])

    async def fake_find_one(query):
        assert query == {"_id": POST_ID, "thread_id": THREAD_ID, "is_deleted": False}
        return post

    async def fake_log_audit(**kwargs) -> None:
        events.append(kwargs)

    monkeypatch.setattr(threads_router.Post, "find_one", fake_find_one)
    monkeypatch.setattr(threads_router, "log_audit", fake_log_audit)

    client = make_client()
    response = client.delete(f"/threads/{THREAD_ID}/posts/{POST_ID}/like")

    assert response.status_code == 200
    assert response.json() == {"liked": False, "like_count": 0}
    assert post.likes == []
    assert events and events[0]["action"] == "post_unliked"


def test_save_thread_logs_thread_saved(monkeypatch) -> None:
    events: list[dict] = []
    thread = DummyThread()

    class FakeSavedThreadCollection:
        async def update_one(self, query, update, upsert=False):
            assert query == {"user_id": USER_ID, "thread_id": THREAD_ID}
            assert upsert is True

            class Result:
                matched_count = 0
                upserted_id = PydanticObjectId("66aa00000000000000000009")

            return Result()

    async def fake_find_one(query):
        assert query == {"_id": THREAD_ID, "is_deleted": False}
        return thread

    async def fake_log_audit(**kwargs) -> None:
        events.append(kwargs)

    monkeypatch.setattr(threads_router.Thread, "find_one", fake_find_one)
    monkeypatch.setattr(threads_router.SavedThread, "get_motor_collection", lambda: FakeSavedThreadCollection())
    monkeypatch.setattr(threads_router, "log_audit", fake_log_audit)

    client = make_client()
    response = client.post(f"/threads/{THREAD_ID}/save")

    assert response.status_code == 200
    assert response.json() == {"saved": True}
    assert events and events[0]["action"] == "thread_saved"


def test_unsave_thread_logs_thread_unsaved(monkeypatch) -> None:
    events: list[dict] = []
    saved_thread = DummySavedThread()

    async def fake_find_one(query):
        assert query == {"user_id": USER_ID, "thread_id": THREAD_ID}
        return saved_thread

    async def fake_log_audit(**kwargs) -> None:
        events.append(kwargs)

    monkeypatch.setattr(threads_router.SavedThread, "find_one", fake_find_one)
    monkeypatch.setattr(threads_router, "log_audit", fake_log_audit)

    client = make_client()
    response = client.delete(f"/threads/{THREAD_ID}/save")

    assert response.status_code == 204
    assert saved_thread.deleted is True
    assert events and events[0]["action"] == "thread_unsaved"


def test_share_thread_logs_thread_shared(monkeypatch) -> None:
    events: list[dict] = []
    thread = DummyThread()

    async def fake_find_one(query):
        assert query == {"_id": THREAD_ID, "is_deleted": False}
        return thread

    async def fake_log_audit(**kwargs) -> None:
        events.append(kwargs)

    monkeypatch.setattr(threads_router.Thread, "find_one", fake_find_one)
    monkeypatch.setattr(threads_router, "log_audit", fake_log_audit)

    client = make_client()
    response = client.post(f"/threads/{THREAD_ID}/share")

    assert response.status_code == 200
    assert response.json() == {"shared": True}
    assert events and events[0]["action"] == "thread_shared"
