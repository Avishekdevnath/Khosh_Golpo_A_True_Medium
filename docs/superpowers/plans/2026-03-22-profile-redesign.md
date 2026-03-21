# Profile Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the profile page with Medium/X-vibe, add Threads/Replies/Saved/History tabs, and add a privacy toggle that hides content from non-connections.

**Architecture:** New `SavedThread` and `ReadHistory` MongoDB collections (separate from User doc). Privacy gate added to `GET /users/{user_id}` using the existing `Connection` model and `get_optional_current_user`. Frontend redesigns all profile components and adds lazy tab-switching with a new `useUserProfile` extended hook.

**Tech Stack:** FastAPI + Beanie ODM (backend) · Next.js 15 + Tailwind v4 CSS tokens + SWR (frontend) · MongoDB

---

## File Map

### Backend — New/Modified
| File | Action | Responsibility |
|------|--------|----------------|
| `backend/app/models/saved_thread.py` | Create | `SavedThread` Beanie document |
| `backend/app/models/read_history.py` | Create | `ReadHistory` Beanie document |
| `backend/app/models/user.py` | Modify | Add `is_private: bool = False` |
| `backend/app/schemas/user.py` | Modify | Add `is_private` to `UserUpdate` and `UserOut` |
| `backend/app/routers/users.py` | Modify | Privacy gate on `GET /{user_id}`, `PATCH /me` with is_private, new saved/history/replies endpoints |
| `backend/app/routers/threads.py` | Modify | Add `POST /{id}/save`, `DELETE /{id}/save`, `POST /{id}/mark-read` |
| `backend/app/main.py` | Modify | Register `SavedThread` and `ReadHistory` in Beanie init |

### Frontend — New/Modified
| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/lib/profileApi.ts` | Create | API calls: save/unsave, mark-read, saved-threads, read-history, replies, toggle-privacy |
| `frontend/src/components/profile/useUserProfile.ts` | Modify | Add tabs, lazy fetchers, privacy toggle |
| `frontend/src/components/profile/ProfileHeader.tsx` | Modify | Full Medium-vibe redesign, privacy pill |
| `frontend/src/components/profile/ProfileTabs.tsx` | Create | Tab bar (Threads/Replies/Saved/History) |
| `frontend/src/components/profile/ProfileContent.tsx` | Create | Replaces `ProfileThreads.tsx` — all 4 tab panels |
| `frontend/src/components/profile/UserProfileWorkspace.tsx` | Modify | Locked wall, wire new components |
| `frontend/src/app/(app)/threads/[id]/page.tsx` | Modify | Fire-and-forget mark-read on mount |

---

## Task 1: New Beanie models — SavedThread and ReadHistory

**Files:**
- Create: `backend/app/models/saved_thread.py`
- Create: `backend/app/models/read_history.py`

- [ ] **Step 1: Create `SavedThread` model**

```python
# backend/app/models/saved_thread.py
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field
from app.models.common import utc_now

class SavedThread(Document):
    user_id: PydanticObjectId
    thread_id: PydanticObjectId
    saved_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "saved_threads"
        indexes = [
            ["user_id", "thread_id"],  # compound unique enforced at app level
            "user_id",
        ]
```

- [ ] **Step 2: Create `ReadHistory` model**

```python
# backend/app/models/read_history.py
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field
from app.models.common import utc_now

class ReadHistory(Document):
    user_id: PydanticObjectId
    thread_id: PydanticObjectId
    read_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "read_history"
        indexes = [
            ["user_id", "thread_id"],  # compound — upsert uses this
            [("user_id", 1), ("read_at", -1)],
        ]
```

- [ ] **Step 3: Register in `backend/app/models/__init__.py`**

Beanie models are registered in `backend/app/models/__init__.py` (not `main.py`). Add at the top with the other imports:

```python
from app.models.saved_thread import SavedThread
from app.models.read_history import ReadHistory
```

Add to `DOCUMENT_MODELS` list:
```python
DOCUMENT_MODELS = [
    # ... existing ...
    SavedThread,
    ReadHistory,
]
```

Add to `__all__`:
```python
__all__ = [
    # ... existing ...
    "SavedThread",
    "ReadHistory",
]
```

- [ ] **Step 4: Commit**
```bash
git add backend/app/models/saved_thread.py backend/app/models/read_history.py backend/app/models/__init__.py
git commit -m "feat: add SavedThread and ReadHistory Beanie models"
```

---

## Task 2: User model — add `is_private` field

**Files:**
- Modify: `backend/app/models/user.py`
- Modify: `backend/app/schemas/user.py`

- [ ] **Step 1: Add field to `User` document**

In `backend/app/models/user.py`, after the `is_bot: bool = False` line, add:

```python
is_private: bool = False
```

No migration needed — MongoDB returns `False` for missing boolean fields.

- [ ] **Step 2: Add `is_private` to `UserUpdate` schema**

In `backend/app/schemas/user.py`, in the `UserUpdate` class, add:

```python
is_private: bool | None = None
```

- [ ] **Step 3: Add `is_private` to `UserOut` schema**

In `backend/app/schemas/user.py`, in the `UserOut` class, add:

```python
is_private: bool = False
```

- [ ] **Step 4: Expose `is_private` in `PATCH /me` handler**

In `backend/app/routers/users.py`, inside `update_me()`, after the gender block (~line 72), add:

```python
if payload.is_private is not None:
    changes["is_private"] = payload.is_private
    current_user.is_private = payload.is_private
```

- [ ] **Step 5: Add `is_private` to `_to_user_out()` helper**

In `_to_user_out()` (~line 952), add to the `UserOut(...)` call:

```python
is_private=user.is_private,
```

- [ ] **Step 6: Commit**
```bash
git add backend/app/models/user.py backend/app/schemas/user.py backend/app/routers/users.py
git commit -m "feat: add is_private field to User model and UserUpdate/UserOut schemas"
```

---

## Task 3: Privacy gate on `GET /users/{user_id}`

**Files:**
- Modify: `backend/app/routers/users.py`

**Key info:**
- `get_optional_current_user` already exists in `app.core.auth`
- `Connection` model uses fields `user_id` + `connected_user_id` + `status`. Status `"connected"` (= `ConnectionStatus.CONNECTED`) means the connection is accepted/active. Note: the spec says "accepted" but the model's actual value is `"connected"` — use `ConnectionStatus.CONNECTED` in code.
- To check if A and B are connected: query `(user_id=A, connected_user_id=B) OR (user_id=B, connected_user_id=A)` with `status=ConnectionStatus.CONNECTED`

- [ ] **Step 1: Add a `ProfileLockedOut` schema to `backend/app/schemas/user.py`**

```python
class ProfileLockedOut(BaseModel):
    id: str
    username: str
    display_name: str
    bio: str | None
    avatar_seed: list[str]  # two hex colors for gradient
    is_private: bool = True
    is_locked: bool = True
    created_at: datetime
```

- [ ] **Step 2: Add a helper to compute avatar seed colors**

In `backend/app/routers/users.py`, add this helper after `_find_user`:

```python
def _avatar_seed(user_id: str) -> list[str]:
    """Deterministic gradient colors from user id — matches frontend avatarSeed()."""
    PALETTES = [
        ["#1e3a5f", "#0ea5e9"], ["#3b1f5e", "#7c3aed"],
        ["#1a3a2a", "#10b981"], ["#3a1f1f", "#ef4444"],
        ["#1f2a3a", "#3b82f6"], ["#2a1f3a", "#a855f7"],
        ["#1f3a2a", "#06b6d4"], ["#3a2a1f", "#f59e0b"],
    ]
    h = sum(ord(c) for c in user_id) % len(PALETTES)
    return PALETTES[h]
```

- [ ] **Step 3: Add `is_connected_with` async helper**

In `backend/app/routers/users.py`, add:

```python
async def _is_connected(viewer_id: PydanticObjectId, owner_id: PydanticObjectId) -> bool:
    """Return True if an accepted Connection exists between viewer and owner."""
    conn = await Connection.find_one({
        "$or": [
            {"user_id": viewer_id, "connected_user_id": owner_id},
            {"user_id": owner_id, "connected_user_id": viewer_id},
        ],
        "status": ConnectionStatus.CONNECTED,
    })
    return conn is not None
```

- [ ] **Step 4: Update `GET /users/{user_id}` to use optional auth and privacy gate**

Replace the current handler (~line 378):

```python
from app.core.auth import get_current_user, get_optional_current_user
from app.schemas.user import UserOut, UserUpdate, ProfileLockedOut
from typing import Union

@router.get("/{user_id}")
async def get_user_profile(
    user_id: str,
    viewer: User | None = Depends(get_optional_current_user),
) -> Union[UserOut, ProfileLockedOut]:
    user = await _find_user(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Bypass gate: owner or admin always sees full profile
    if viewer is not None and (viewer.id == user.id or viewer.role.value == "admin"):
        return _to_user_out(user)

    # Privacy gate
    if user.is_private:
        is_connected = False
        if viewer is not None:
            is_connected = await _is_connected(viewer.id, user.id)
        if not is_connected:
            return ProfileLockedOut(
                id=str(user.id),
                username=user.username,
                display_name=user.display_name,
                bio=user.bio,
                avatar_seed=_avatar_seed(str(user.id)),
                created_at=user.created_at,
            )

    return _to_user_out(user)
```

- [ ] **Step 5: Start backend and test manually**

```bash
cd backend && PYTHONPATH=. ../.venv/Scripts/python -c "import app.routers.users; print('OK')"
```

Expected: `OK` (no import errors)

- [ ] **Step 6: Commit**
```bash
git add backend/app/routers/users.py backend/app/schemas/user.py
git commit -m "feat: privacy gate on GET /users/{user_id} — locked response for non-connections"
```

---

## Task 4: Save/unsave thread endpoints

**Files:**
- Modify: `backend/app/routers/threads.py`

- [ ] **Step 1: Add imports to `threads.py`**

```python
from app.models.saved_thread import SavedThread
```

- [ ] **Step 2: Add `POST /{thread_id}/save`**

Add after the like endpoint (~line 433):

```python
@router.post("/{thread_id}/save", status_code=status.HTTP_200_OK)
async def save_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        tid = PydanticObjectId(thread_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid thread ID")

    thread = await Thread.find_one({"_id": tid, "is_deleted": False})
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    existing = await SavedThread.find_one({"user_id": current_user.id, "thread_id": tid})
    if existing is None:
        await SavedThread(user_id=current_user.id, thread_id=tid).insert()

    return {"saved": True}
```

- [ ] **Step 3: Add `DELETE /{thread_id}/save`**

```python
@router.delete("/{thread_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        tid = PydanticObjectId(thread_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid thread ID")

    existing = await SavedThread.find_one({"user_id": current_user.id, "thread_id": tid})
    if existing is None:
        raise HTTPException(status_code=404, detail="Not saved")
    await existing.delete()
```

- [ ] **Step 4: Commit**
```bash
git add backend/app/routers/threads.py
git commit -m "feat: POST/DELETE /threads/{id}/save endpoints"
```

---

## Task 5: Mark-read endpoint

**Files:**
- Modify: `backend/app/routers/threads.py`

- [ ] **Step 1: Add import**

```python
from app.models.read_history import ReadHistory
from app.models.common import utc_now
```

- [ ] **Step 2: Add `POST /{thread_id}/mark-read`**

```python
@router.post("/{thread_id}/mark-read", status_code=status.HTTP_200_OK)
async def mark_thread_read(
    thread_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        tid = PydanticObjectId(thread_id)
    except Exception:
        return {"ok": True}  # fire-and-forget: never error the client

    now = utc_now()
    # Atomic upsert — updates read_at if exists, creates if not
    await ReadHistory.get_motor_collection().update_one(
        {"user_id": current_user.id, "thread_id": tid},
        {"$set": {"read_at": now}},
        upsert=True,
    )

    # Non-blocking cap: delete records beyond 100 most recent (best-effort)
    recent = await ReadHistory.find(
        {"user_id": current_user.id}
    ).sort("-read_at").skip(100).to_list()
    if recent:
        ids_to_delete = [r.id for r in recent]
        await ReadHistory.find({"_id": {"$in": ids_to_delete}}).delete()

    return {"ok": True}
```

- [ ] **Step 3: Commit**
```bash
git add backend/app/routers/threads.py
git commit -m "feat: POST /threads/{id}/mark-read with 100-record cap"
```

---

## Task 6: Saved threads and read history list endpoints

**Files:**
- Modify: `backend/app/routers/users.py`

- [ ] **Step 1: Add imports**

```python
from app.models.saved_thread import SavedThread
from app.models.read_history import ReadHistory
from app.models.thread import Thread
from app.schemas.thread import ThreadOut, ThreadListResponse
```

- [ ] **Step 2: Add `GET /me/saved-threads`**

Add before the `/{user_id}` route (so it doesn't get caught by the wildcard):

```python
@router.get("/me/saved-threads")
async def get_saved_threads(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=40),
    current_user: User = Depends(get_current_user),
) -> ThreadListResponse:
    saved = await SavedThread.find(
        {"user_id": current_user.id}
    ).sort("-saved_at").to_list()

    total = len(saved)
    page_saved = saved[(page - 1) * limit : page * limit]
    thread_ids = [s.thread_id for s in page_saved]

    threads = await Thread.find(
        {"_id": {"$in": thread_ids}, "is_deleted": False}
    ).to_list()

    # Preserve saved order
    thread_map = {t.id: t for t in threads}
    ordered = [thread_map[tid] for tid in thread_ids if tid in thread_map]

    return ThreadListResponse(
        data=[_to_thread_out(t) for t in ordered],
        page=page,
        limit=limit,
        total=total,
    )
```

- [ ] **Step 3: Add `GET /me/read-history`**

```python
@router.get("/me/read-history")
async def get_read_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=40),
    current_user: User = Depends(get_current_user),
) -> ThreadListResponse:
    history = await ReadHistory.find(
        {"user_id": current_user.id}
    ).sort("-read_at").to_list()

    total = len(history)
    page_history = history[(page - 1) * limit : page * limit]
    thread_ids = [h.thread_id for h in page_history]

    threads = await Thread.find(
        {"_id": {"$in": thread_ids}, "is_deleted": False}
    ).to_list()

    thread_map = {t.id: t for t in threads}
    ordered = [thread_map[tid] for tid in thread_ids if tid in thread_map]

    return ThreadListResponse(
        data=[_to_thread_out(t) for t in ordered],
        page=page,
        limit=limit,
        total=total,
    )
```

- [ ] **Step 4: Add `_to_thread_out` helper to `users.py`**

```python
def _to_thread_out(thread: Thread) -> ThreadOut:
    return ThreadOut(
        id=str(thread.id),
        title=thread.title,
        body=thread.body,
        tags=thread.tags,
        author_id=str(thread.author_id),
        post_count=thread.post_count,
        like_count=getattr(thread, "like_count", 0),
        status=thread.status,
        is_pinned=getattr(thread, "is_pinned", False),
        is_deleted=thread.is_deleted,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )
```

- [ ] **Step 5: Commit**
```bash
git add backend/app/routers/users.py
git commit -m "feat: GET /me/saved-threads and GET /me/read-history endpoints"
```

---

## Task 7: Replies endpoint

**Files:**
- Modify: `backend/app/routers/users.py`

- [ ] **Step 1: Add `GET /{user_id}/replies`**

Add before `/{user_id}/follow` (~line 386):

```python
@router.get("/{user_id}/replies")
async def get_user_replies(
    user_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=40),
    viewer: User | None = Depends(get_optional_current_user),
) -> ThreadListResponse:
    from app.models.post import Post

    profile_user = await _find_user(user_id)
    if profile_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Privacy gate — non-connections see 403 on private profiles
    if profile_user.is_private:
        is_owner = viewer is not None and viewer.id == profile_user.id
        is_admin = viewer is not None and viewer.role.value == "admin"
        is_connected = False
        if viewer is not None and not is_owner and not is_admin:
            is_connected = await _is_connected(viewer.id, profile_user.id)
        if not is_owner and not is_admin and not is_connected:
            raise HTTPException(status_code=403, detail="This profile is private")

    # Find distinct thread_ids where user has posted (replies)
    posts = await Post.find(
        {"author_id": profile_user.id}
    ).sort("-created_at").to_list()

    seen: set = set()
    unique_thread_ids = []
    for p in posts:
        if p.thread_id not in seen:
            seen.add(p.thread_id)
            unique_thread_ids.append(p.thread_id)

    total = len(unique_thread_ids)
    page_ids = unique_thread_ids[(page - 1) * limit : page * limit]

    threads = await Thread.find(
        {"_id": {"$in": page_ids}, "is_deleted": False}
    ).to_list()

    thread_map = {t.id: t for t in threads}
    ordered = [thread_map[tid] for tid in page_ids if tid in thread_map]

    return ThreadListResponse(
        data=[_to_thread_out(t) for t in ordered],
        page=page,
        limit=limit,
        total=total,
    )
```

- [ ] **Step 2: Commit**
```bash
git add backend/app/routers/users.py
git commit -m "feat: GET /users/{user_id}/replies with privacy gate"
```

---

## Task 8: Frontend — profile API client

**Files:**
- Create: `frontend/src/lib/profileApi.ts`

- [ ] **Step 1: Export `ThreadListResponse` from `useUserProfile.ts`**

In `frontend/src/components/profile/useUserProfile.ts`, find the `ThreadListResponse` type (~line 39) and ensure it has `export`:

```typescript
export type ThreadListResponse = {
  data: ThreadOut[];
  page: number;
  limit: number;
  total: number;
};
```

- [ ] **Step 2: Create `profileApi.ts`**

```typescript
// frontend/src/lib/profileApi.ts
import { apiPost, apiDelete, apiGet, apiPatch } from "@/lib/api";
import type { ThreadListResponse } from "@/components/profile/useUserProfile";

export async function saveThread(threadId: string): Promise<void> {
  await apiPost(`/threads/${threadId}/save`, {});
}

export async function unsaveThread(threadId: string): Promise<void> {
  await apiDelete(`/threads/${threadId}/save`);
}

export async function markThreadRead(threadId: string): Promise<void> {
  // Fire-and-forget — never throws to caller
  try {
    await apiPost(`/threads/${threadId}/mark-read`, {});
  } catch {
    // intentionally silent
  }
}

export async function getSavedThreads(page = 1, limit = 10): Promise<ThreadListResponse> {
  return apiGet(`/users/me/saved-threads?page=${page}&limit=${limit}`);
}

export async function getReadHistory(page = 1, limit = 10): Promise<ThreadListResponse> {
  return apiGet(`/users/me/read-history?page=${page}&limit=${limit}`);
}

export async function getUserReplies(userId: string, page = 1, limit = 10): Promise<ThreadListResponse> {
  return apiGet(`/users/${userId}/replies?page=${page}&limit=${limit}`);
}

export async function setProfilePrivacy(isPrivate: boolean): Promise<void> {
  await apiPatch("/users/me", { is_private: isPrivate });
}
```

- [ ] **Step 2: Verify `ThreadListResponse` type exists in `@/types/thread`**

Check `frontend/src/types/thread.ts`. If it doesn't export `ThreadListResponse`, add:

```typescript
export type ThreadListResponse = {
  data: Thread[];
  page: number;
  limit: number;
  total: number;
};
```

- [ ] **Step 4: Commit**
```bash
git add frontend/src/lib/profileApi.ts frontend/src/components/profile/useUserProfile.ts
git commit -m "feat: profileApi.ts — save, unsave, mark-read, saved-threads, history, replies, privacy"
```

---

## Task 9: Extend `useUserProfile.ts`

**Files:**
- Modify: `frontend/src/components/profile/useUserProfile.ts`

- [ ] **Step 1: Add `is_private` and `is_locked` to `UserOut` type**

In the `UserOut` type definition at the top:

```typescript
export type UserOut = {
  // ... existing fields ...
  is_private?: boolean;
  is_locked?: boolean;    // set by backend when profile is private + viewer not connected
  avatar_seed?: string[]; // included in locked response
};
```

- [ ] **Step 2: Add new state and types to the hook**

Replace the hook signature and add to return type:

```typescript
export type ProfileTab = "threads" | "replies" | "saved" | "history";

export interface UseUserProfileReturn {
  // ... existing fields ...
  activeTab: ProfileTab;
  setActiveTab: (tab: ProfileTab) => void;
  replies: ThreadOut[];
  repliesLoading: boolean;
  savedThreads: ThreadOut[];
  savedLoading: boolean;
  readHistory: ThreadOut[];
  historyLoading: boolean;
  isPrivate: boolean;
  togglePrivacy: () => Promise<void>;
}
```

- [ ] **Step 3: Add state variables inside the hook**

```typescript
const [activeTab, setActiveTab] = useState<ProfileTab>("threads");

const [replies, setReplies] = useState<ThreadOut[]>([]);
const [repliesLoading, setRepliesLoading] = useState(false);
const [repliesLoaded, setRepliesLoaded] = useState(false);

const [savedThreads, setSavedThreads] = useState<ThreadOut[]>([]);
const [savedLoading, setSavedLoading] = useState(false);
const [savedLoaded, setSavedLoaded] = useState(false);

const [readHistory, setReadHistory] = useState<ThreadOut[]>([]);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyLoaded, setHistoryLoaded] = useState(false);

const [isPrivate, setIsPrivate] = useState(false);
```

- [ ] **Step 4: Sync `isPrivate` from profileUser once loaded**

In the existing `useEffect` that loads the user, after `setProfileUser(u)`, add:

```typescript
setIsPrivate(u.is_private ?? false);
```

- [ ] **Step 5: Add lazy tab fetchers via `useEffect`**

```typescript
useEffect(() => {
  if (!profileUser || activeTab !== "replies" || repliesLoaded) return;
  setRepliesLoading(true);
  getUserReplies(profileUser.id).then(res => {
    setReplies(res.data);
    setRepliesLoaded(true);
  }).catch(() => {}).finally(() => setRepliesLoading(false));
}, [activeTab, profileUser, repliesLoaded]);

useEffect(() => {
  if (!isOwnProfileRef.current || activeTab !== "saved" || savedLoaded) return;
  setSavedLoading(true);
  getSavedThreads().then(res => {
    setSavedThreads(res.data);
    setSavedLoaded(true);
  }).catch(() => {}).finally(() => setSavedLoading(false));
}, [activeTab, savedLoaded]);

useEffect(() => {
  if (!isOwnProfileRef.current || activeTab !== "history" || historyLoaded) return;
  setHistoryLoading(true);
  getReadHistory().then(res => {
    setReadHistory(res.data);
    setHistoryLoaded(true);
  }).catch(() => {}).finally(() => setHistoryLoading(false));
}, [activeTab, historyLoaded]);
```

Note: `isOwnProfileRef` is a `useRef<boolean>` set from the `isOwnProfile` prop. Add it:

```typescript
const isOwnProfileRef = useRef(false);
// set it inside the existing load useEffect after setProfileUser(u):
// isOwnProfileRef.current = currentUserId === u.id;
// But since the hook doesn't receive currentUserId, pass it as a second param:
```

Change the hook signature:

```typescript
export function useUserProfile(userId: string, currentUserId?: string): UseUserProfileReturn {
```

Then set: `isOwnProfileRef.current = !!currentUserId && currentUserId === profileUser?.id;`

- [ ] **Step 6: Add `togglePrivacy`**

```typescript
const togglePrivacy = useCallback(async () => {
  const next = !isPrivate;
  setIsPrivate(next); // optimistic
  try {
    await setProfilePrivacy(next);
    if (profileUser) setProfileUser({ ...profileUser, is_private: next });
  } catch {
    setIsPrivate(!next); // revert
  }
}, [isPrivate, profileUser]);
```

- [ ] **Step 7: Update the return object** with all new fields.

- [ ] **Step 8: Update `UserProfileWorkspace.tsx` to pass `currentUserId`**

```typescript
const { user: currentUser } = useAuthStore();
// change hook call:
const { ... } = useUserProfile(userId, currentUser?.id);
```

- [ ] **Step 9: Commit**
```bash
git add frontend/src/components/profile/useUserProfile.ts frontend/src/components/profile/UserProfileWorkspace.tsx
git commit -m "feat: extend useUserProfile with tabs, lazy fetchers, privacy toggle"
```

---

## Task 10: New `ProfileTabs.tsx` component

**Files:**
- Create: `frontend/src/components/profile/ProfileTabs.tsx`

- [ ] **Step 1: Create tab bar**

```typescript
// frontend/src/components/profile/ProfileTabs.tsx
import type { ProfileTab } from "./useUserProfile";

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isOwnProfile: boolean;
}

const TABS: Array<{ key: ProfileTab; label: string; ownOnly: boolean }> = [
  { key: "threads",  label: "Threads",  ownOnly: false },
  { key: "replies",  label: "Replies",  ownOnly: false },
  { key: "saved",    label: "Saved",    ownOnly: true  },
  { key: "history",  label: "History",  ownOnly: true  },
];

export default function ProfileTabs({ activeTab, onTabChange, isOwnProfile }: ProfileTabsProps) {
  const visibleTabs = TABS.filter(t => !t.ownOnly || isOwnProfile);

  return (
    <div className="flex items-center border-b border-border px-7 max-sm:px-3.5">
      {visibleTabs.map(tab => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={[
            "mr-6 py-[14px] text-[14px] border-b-2 transition-colors duration-150 whitespace-nowrap font-sans",
            activeTab === tab.key
              ? "border-b-foreground text-foreground font-medium"
              : "border-b-transparent text-text-secondary hover:text-foreground font-normal",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/profile/ProfileTabs.tsx
git commit -m "feat: ProfileTabs component — underline tabs matching app style"
```

---

## Task 11: New `ProfileContent.tsx` (replaces `ProfileThreads.tsx`)

**Files:**
- Create: `frontend/src/components/profile/ProfileContent.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/profile/ProfileContent.tsx
"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Bookmark, History, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThreadOut, UserOut, ProfileTab } from "./useUserProfile";
import { relativeTime } from "@/lib/workspaceUtils";

// ── Thread card — clean Medium-vibe, no dark gradients ───────────────────────

function ThreadCard({ thread, onClick }: { thread: ThreadOut; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left rounded-xl border border-border bg-background px-5 py-4 cursor-pointer font-sans transition-colors hover:bg-card-hover"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[14px] font-semibold text-foreground leading-snug flex-1">
          {thread.title}
        </span>
        {thread.status !== "open" && (
          <span className="text-[11px] font-medium text-text-tertiary shrink-0 pt-0.5 capitalize">
            {thread.status}
          </span>
        )}
      </div>

      {thread.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {thread.tags.slice(0, 3).map(tag => (
            <span key={tag} className="rounded-full bg-card-hover border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
        <span className="inline-flex items-center gap-1">
          <MessageSquare size={11} />
          {thread.post_count} {thread.post_count === 1 ? "reply" : "replies"}
        </span>
        <span>{relativeTime(thread.created_at)}</span>
      </div>
    </button>
  );
}

// ── Loading skeletons ─────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map(i => (
        <Skeleton key={i} className="h-[76px] rounded-xl" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function TabEmpty({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card-hover text-text-tertiary">
        {icon}
      </div>
      <p className="text-[13.5px] font-medium text-foreground">{title}</p>
      <p className="text-[12.5px] text-text-secondary max-w-xs">{description}</p>
    </div>
  );
}

// ── Thread list ───────────────────────────────────────────────────────────────

function ThreadList({
  threads,
  loading,
  emptyIcon,
  emptyTitle,
  emptyDesc,
}: {
  threads: ThreadOut[];
  loading: boolean;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDesc: string;
}) {
  const router = useRouter();
  if (loading) return <TabSkeleton />;
  if (threads.length === 0) return <TabEmpty icon={emptyIcon} title={emptyTitle} description={emptyDesc} />;
  return (
    <div className="flex flex-col gap-2">
      {threads.map(t => (
        <ThreadCard key={t.id} thread={t} onClick={() => router.push(`/threads/${t.id}`)} />
      ))}
    </div>
  );
}

// ── Props + main component ────────────────────────────────────────────────────

interface ProfileContentProps {
  activeTab: ProfileTab;
  threads: ThreadOut[];
  threadsLoading: boolean;
  threadTotal: number;
  replies: ThreadOut[];
  repliesLoading: boolean;
  savedThreads: ThreadOut[];
  savedLoading: boolean;
  readHistory: ThreadOut[];
  historyLoading: boolean;
  profileUser: UserOut;
  isOwnProfile: boolean;
}

export default function ProfileContent({
  activeTab,
  threads, threadsLoading, threadTotal,
  replies, repliesLoading,
  savedThreads, savedLoading,
  readHistory, historyLoading,
  profileUser, isOwnProfile,
}: ProfileContentProps) {
  const router = useRouter();

  return (
    <div className="px-7 pt-5 pb-10 max-sm:px-3.5 max-sm:pt-3.5">
      {activeTab === "threads" && (
        <ThreadList
          threads={threads}
          loading={threadsLoading}
          emptyIcon={<MessageSquare size={20} strokeWidth={1.5} />}
          emptyTitle="No threads yet"
          emptyDesc={isOwnProfile ? "Start a conversation in Threads." : `${profileUser.display_name} hasn't posted any threads.`}
        />
      )}

      {activeTab === "replies" && (
        <ThreadList
          threads={replies}
          loading={repliesLoading}
          emptyIcon={<MessageSquare size={20} strokeWidth={1.5} />}
          emptyTitle="No replies yet"
          emptyDesc={isOwnProfile ? "Threads you've replied to will appear here." : `${profileUser.display_name} hasn't replied to any threads.`}
        />
      )}

      {activeTab === "saved" && isOwnProfile && (
        <ThreadList
          threads={savedThreads}
          loading={savedLoading}
          emptyIcon={<Bookmark size={20} strokeWidth={1.5} />}
          emptyTitle="No saved threads"
          emptyDesc="Save threads to read them later — look for the bookmark icon on any thread."
        />
      )}

      {activeTab === "history" && isOwnProfile && (
        <ThreadList
          threads={readHistory}
          loading={historyLoading}
          emptyIcon={<Clock size={20} strokeWidth={1.5} />}
          emptyTitle="No read history"
          emptyDesc="Threads you open will appear here automatically."
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/profile/ProfileContent.tsx
git commit -m "feat: ProfileContent — all 4 tab panels with Medium-vibe thread cards"
```

---

## Task 12: Redesign `ProfileHeader.tsx`

**Files:**
- Modify: `frontend/src/components/profile/ProfileHeader.tsx`

**Design rules:**
- `h-[120px]` banner, avatar-seed colors at 15% opacity on white background
- No `app-bg`, `app-panel`, `app-border`, `app-input` tokens — use `background`, `border`, `card-hover`, `foreground`, `text-secondary`, `text-tertiary`
- Avatar: `88px rounded-full border-4 border-background -mt-11`
- Stats: `N followers · N following · N threads` inline with `·` separators
- Privacy toggle: `Globe`/`Lock` pill next to "Edit profile"
- No hardcoded hex anywhere

- [ ] **Step 1: Full rewrite of `ProfileHeader.tsx`**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Edit2, Globe, Lock, MoreHorizontal } from "lucide-react";
import FollowButton from "@/components/shared/FollowButton";
import ConnectionButton from "@/components/shared/ConnectionButton";
import type { UserOut } from "./useUserProfile";
import { avatarSeed, initials } from "@/lib/workspaceUtils";

function formatJoinDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

interface ProfileHeaderProps {
  profileUser: UserOut;
  isOwnProfile: boolean;
  isAdmin: boolean;
  threadTotal: number;
  isFollowing: boolean;
  followsYou: boolean;
  followersCount: number;
  followingCount: number;
  isPrivate: boolean;
  onFollowChange: (following: boolean, fCount: number, fgCount: number) => void;
  onTogglePrivacy: () => void;
  onOpenAdminEdit: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  mobileMenuOpen: boolean;
  mobileMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
}

export default function ProfileHeader({
  profileUser, isOwnProfile, isAdmin, threadTotal,
  isFollowing, followsYou, followersCount, followingCount,
  isPrivate, onFollowChange, onTogglePrivacy,
  onOpenAdminEdit, onOpenFollowers, onOpenFollowing,
  mobileMenuOpen, mobileMenuRef, onToggleMobileMenu, onCloseMobileMenu,
}: ProfileHeaderProps) {
  const router = useRouter();
  const [av1, av2] = avatarSeed(profileUser.id);

  return (
    <>
      {/* Back button */}
      <div className="absolute top-0 left-0 z-10 px-5 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[12px] font-medium text-text-secondary backdrop-blur-sm transition-colors hover:text-foreground cursor-pointer font-sans"
        >
          <ArrowLeft size={13} /> Back
        </button>
      </div>

      {/* Banner — light gradient using avatar seed */}
      <div
        className="h-[120px] w-full relative overflow-hidden flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${av1}26 0%, ${av2}18 60%, transparent 100%), var(--card-hover)` }}
      />

      {/* Header body */}
      <div className="px-7 pb-6 max-sm:px-4 max-sm:pb-4">

        {/* Avatar row */}
        <div className="flex items-end justify-between mb-4">
          {/* Avatar */}
          <div
            className="relative -mt-11 flex-shrink-0 size-[88px] rounded-full grid place-items-center font-serif text-[26px] font-bold text-white border-4 border-background shadow-sm max-sm:size-[72px] max-sm:text-xl max-sm:-mt-9"
            style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
          >
            {initials(profileUser.display_name)}
            {profileUser.is_active && (
              <span className="absolute bottom-1 right-1 size-3 rounded-full bg-success border-2 border-background" />
            )}
          </div>

          {/* Actions — desktop */}
          <div className="hidden sm:flex items-center gap-2 pb-1">
            {isOwnProfile ? (
              <>
                <button
                  type="button"
                  onClick={onTogglePrivacy}
                  title={isPrivate ? "Profile is private — click to make public" : "Profile is public — click to make private"}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-[7px] text-[12px] text-text-secondary transition-colors hover:text-foreground cursor-pointer font-sans"
                >
                  {isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                  {isPrivate ? "Private" : "Public"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/settings")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-[7px] text-[12px] text-text-secondary transition-colors hover:text-foreground cursor-pointer font-sans"
                >
                  <Edit2 size={12} /> Edit profile
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdminEdit}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-[7px] text-[12px] text-text-secondary transition-colors hover:text-foreground cursor-pointer font-sans"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                )}
                <ConnectionButton userId={profileUser.id} />
                <FollowButton userId={profileUser.id} initialFollowing={isFollowing} followsYou={followsYou} onFollowChange={onFollowChange} />
              </div>
            )}
          </div>

          {/* Actions — mobile */}
          <div className="sm:hidden relative pb-1" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Profile actions"
              className="size-9 grid place-items-center rounded-full border border-border bg-background text-text-secondary transition-colors hover:text-foreground cursor-pointer font-sans"
            >
              <MoreHorizontal size={16} />
            </button>
            {mobileMenuOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-50 min-w-[180px] rounded-xl border border-border bg-background p-1.5 shadow-lg">
                {isOwnProfile ? (
                  <>
                    <button type="button" onClick={() => { onCloseMobileMenu(); onTogglePrivacy(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-text-secondary hover:bg-card-hover cursor-pointer font-sans">
                      {isPrivate ? <Lock size={13} /> : <Globe size={13} />}
                      {isPrivate ? "Make public" : "Make private"}
                    </button>
                    <button type="button" onClick={() => { onCloseMobileMenu(); router.push("/settings"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-text-secondary hover:bg-card-hover cursor-pointer font-sans">
                      <Edit2 size={13} /> Edit profile
                    </button>
                  </>
                ) : (
                  <>
                    <div onClick={onCloseMobileMenu}>
                      <FollowButton userId={profileUser.id} initialFollowing={isFollowing} followsYou={followsYou} onFollowChange={onFollowChange} />
                    </div>
                    <div onClick={onCloseMobileMenu}>
                      <ConnectionButton userId={profileUser.id} />
                    </div>
                    {isAdmin && (
                      <button type="button" onClick={() => { onCloseMobileMenu(); onOpenAdminEdit(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-text-secondary hover:bg-card-hover cursor-pointer font-sans">
                        <Edit2 size={13} /> Admin edit
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <h1 className="font-serif text-[22px] leading-tight text-foreground mb-0.5 break-words">
          {profileUser.display_name}
        </h1>

        {/* Username + bot tag */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[13px] text-text-tertiary">@{profileUser.username}</span>
          {profileUser.is_bot && <span className="text-[11px] text-primary font-medium">Automated</span>}
          {isPrivate && isOwnProfile && (
            <span className="inline-flex items-center gap-1 rounded-full bg-card-hover border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
              <Lock size={9} /> Private
            </span>
          )}
        </div>

        {/* Bio */}
        {profileUser.bio && (
          <p className="text-[14px] leading-relaxed text-text-secondary mb-3 max-w-[520px] break-words">
            {profileUser.bio}
          </p>
        )}

        {/* Stats row — Medium-style inline */}
        <div className="flex items-center gap-1 text-[13px] text-text-secondary flex-wrap">
          <button onClick={onOpenFollowers} className="font-sans border-none bg-transparent p-0 cursor-pointer hover:underline">
            <strong className="text-foreground font-semibold">{followersCount}</strong>{" "}
            <span className="text-text-tertiary">followers</span>
          </button>
          <span className="text-text-tertiary mx-1">·</span>
          <button onClick={onOpenFollowing} className="font-sans border-none bg-transparent p-0 cursor-pointer hover:underline">
            <strong className="text-foreground font-semibold">{followingCount}</strong>{" "}
            <span className="text-text-tertiary">following</span>
          </button>
          <span className="text-text-tertiary mx-1">·</span>
          <span>
            <strong className="text-foreground font-semibold">{threadTotal}</strong>{" "}
            <span className="text-text-tertiary">{threadTotal === 1 ? "thread" : "threads"}</span>
          </span>
          <span className="text-text-tertiary mx-1">·</span>
          <span className="inline-flex items-center gap-1 text-text-tertiary">
            <Calendar size={11} />
            {formatJoinDate(profileUser.created_at)}
          </span>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/profile/ProfileHeader.tsx
git commit -m "redesign: ProfileHeader — Medium/X-vibe, semantic tokens, privacy toggle"
```

---

## Task 13: Update `UserProfileWorkspace.tsx`

**Files:**
- Modify: `frontend/src/components/profile/UserProfileWorkspace.tsx`

- [ ] **Step 1: Add locked wall component inline**

```typescript
function LockedWall({ profileUser }: { profileUser: UserOut }) {
  const [av1, av2] = avatarSeed(
    profileUser.avatar_seed ? "seeded" : profileUser.id
  );
  const colors = profileUser.avatar_seed ?? [av1, av2];

  return (
    <>
      {/* Banner */}
      <div
        className="h-[120px] w-full"
        style={{ background: `linear-gradient(135deg, ${colors[0]}26 0%, ${colors[1]}18 60%, transparent 100%), var(--card-hover)` }}
      />
      <div className="px-7 pb-8 max-sm:px-4">
        {/* Avatar */}
        <div
          className="-mt-11 mb-4 size-[88px] rounded-full grid place-items-center font-serif text-[26px] font-bold text-white border-4 border-background shadow-sm"
          style={{ background: `linear-gradient(135deg,${colors[0]},${colors[1]})` }}
        >
          {initials(profileUser.display_name)}
        </div>
        <h1 className="font-serif text-[22px] text-foreground mb-0.5">{profileUser.display_name}</h1>
        <p className="text-[13px] text-text-tertiary mb-3">@{profileUser.username}</p>
        {profileUser.bio && (
          <p className="text-[14px] leading-relaxed text-text-secondary mb-5 max-w-[480px]">{profileUser.bio}</p>
        )}
        <div className="flex flex-col items-center gap-3 py-10 text-center border-t border-border">
          <Lock size={20} className="text-text-tertiary" strokeWidth={1.5} />
          <p className="text-[13.5px] font-medium text-foreground">This profile is private</p>
          <p className="text-[12.5px] text-text-secondary max-w-xs">
            Connect with {profileUser.display_name} to see their threads and activity.
          </p>
          <FollowButton userId={profileUser.id} initialFollowing={false} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire all new hook fields and replace `ProfileThreads` with `ProfileContent` + `ProfileTabs`**

Update the main render inside `!loading && !error && profileUser` to:

```typescript
{/* If locked: show wall */}
{profileUser.is_locked ? (
  <LockedWall profileUser={profileUser} />
) : (
  <>
    <ProfileHeader
      {...existingProps}
      isPrivate={isPrivate}
      onTogglePrivacy={togglePrivacy}
    />
    <ProfileTabs
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isOwnProfile={isOwnProfile}
    />
    <ProfileContent
      activeTab={activeTab}
      threads={threads}
      threadsLoading={threadsLoading}
      threadTotal={threadTotal}
      replies={replies}
      repliesLoading={repliesLoading}
      savedThreads={savedThreads}
      savedLoading={savedLoading}
      readHistory={readHistory}
      historyLoading={historyLoading}
      profileUser={profileUser}
      isOwnProfile={isOwnProfile}
    />
    {/* existing modals unchanged */}
  </>
)}
```

- [ ] **Step 3: Add imports**

```typescript
import ProfileTabs from "./ProfileTabs";
import ProfileContent from "./ProfileContent";
import { Lock } from "lucide-react";
import FollowButton from "@/components/shared/FollowButton";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
```

- [ ] **Step 4: Remove the old `ProfileThreads` import** (no longer used directly)

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/profile/UserProfileWorkspace.tsx
git commit -m "feat: wire ProfileTabs, ProfileContent, locked wall into UserProfileWorkspace"
```

---

## Task 14: Fire-and-forget mark-read in thread detail

**Files:**
- Modify: `frontend/src/app/(app)/threads/[id]/page.tsx`

- [ ] **Step 1: Check current structure of thread detail page**

Read the file and find where the thread is first rendered. Add a `useEffect` call at the top of the client component that opens the thread:

```typescript
import { markThreadRead } from "@/lib/profileApi";

useEffect(() => {
  if (threadId) void markThreadRead(threadId); // fire-and-forget
}, [threadId]);
```

If the page is a Server Component, find the client component inside it and add the effect there.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/app/(app)/threads/[id]/page.tsx
git commit -m "feat: fire-and-forget mark-read on thread open"
```

---

## Task 15: End-to-end smoke test

- [ ] **Step 1: Start backend**
```bash
cd backend && PYTHONPATH=. PYTHONIOENCODING=utf-8 ../.venv/Scripts/python -m uvicorn app.main:app --reload
```

- [ ] **Step 2: Start frontend**
```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Test privacy toggle**
  - Log in as `demo@demo.com / demo123`
  - Navigate to your profile `/demo`
  - Click "Public" pill — should flip to "Private"
  - Log out, visit `/demo` — should see locked wall with name + bio only

- [ ] **Step 4: Test saved threads**
  - Log in, open any thread
  - Check network tab: `POST /threads/{id}/mark-read` fires
  - Navigate to own profile `/demo` → History tab — thread should appear

- [ ] **Step 5: Test Replies tab**
  - Post a reply in a thread
  - Navigate to own profile → Replies tab — thread should appear

- [ ] **Step 6: Test private profile as connected user**
  - Make `demo` profile private
  - Log in as `user1@demo.com`
  - Visit `/demo` — should see locked wall
  - Accept a connection with `demo`, revisit `/demo` — should see full profile

- [ ] **Step 7: Final commit**
```bash
git add -A
git commit -m "feat: profile redesign complete — tabs, saved, history, privacy gate"
```
