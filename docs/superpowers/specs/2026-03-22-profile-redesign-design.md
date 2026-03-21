# Profile Page Redesign — Design Spec
**Date:** 2026-03-22
**Status:** Approved
**Scope:** Full-stack — backend models/endpoints + frontend UI redesign

---

## 1. Goals

1. Redesign the profile page (`/[username]`) with Medium/X-vibe: clean white, semantic tokens, no hardcoded dark hex.
2. Add **Saved** and **History** tabs (own profile only).
3. Add **Replies** tab (public — shows threads where the user has posted a reply).
4. Add **profile privacy toggle** — private profiles show only banner + avatar + name + bio + follow button to non-connections.
5. Privacy gate: "friend" = accepted `Connection` record between viewer and profile owner.

---

## 2. Privacy Model

- `User.is_private: bool = False` (new field — backward-compatible default; no migration needed for existing documents)
- Privacy gate logic for `GET /users/{user_id}`:
  - **Unauthenticated viewer**: always receives stripped response for any private profile
  - **Profile owner**: always sees full profile
  - **Admin role**: always sees full profile
  - **Accepted connection**: sees full profile
  - **Everyone else** (authenticated non-connection): stripped response
  - Implementation: endpoint uses `Depends(get_optional_user)` — auth is optional, not required
- When stripped response is returned:
  - `GET /users/{user_id}` returns limited shape (see section 4)
  - Direct calls to `/users/{user_id}/replies` return 403
  - `/me/saved-threads` and `/me/read-history` are own-only — no change needed
- Connection check: query `Connection` collection for `(user_a=viewer, user_b=owner) OR (user_a=owner, user_b=viewer)` with `status="accepted"`
- Toggle: `PATCH /me` accepts `is_private` field — requires adding `is_private: bool | None` to `UserUpdate` Pydantic schema (not automatic)

---

## 3. Data Architecture

### 3a. New: `SavedThread` collection
```
SavedThread {
  user_id:    PydanticObjectId   (ref User)
  thread_id:  PydanticObjectId   (ref Thread)
  saved_at:   datetime
}
Indexes: compound unique (user_id, thread_id)
```
Never embed in User document. Separate collection scales independently.

### 3b. New: `ReadHistory` collection
```
ReadHistory {
  user_id:    PydanticObjectId
  thread_id:  PydanticObjectId
  read_at:    datetime           (updated on re-read)
}
Indexes: compound unique (user_id, thread_id), single (user_id, -read_at)
```
- Upsert on re-read via `update_one({ user_id, thread_id }, { $set: { read_at } }, upsert=True)` — atomic, no duplicate records
- Cap enforcement: after upsert, issue a separate non-blocking `delete_many` for records beyond the 100 newest. Race condition is benign (at worst 101 records exist briefly — no data loss, no corruption)
- Fire-and-forget from client — never block navigation. Backend returns 200 immediately; cap cleanup runs async.

### 3c. User model addition
```python
is_private: bool = False
```
- Default `False` is backward-compatible with existing documents (MongoDB treats missing field as falsy)
- No index needed on `is_private` for V1 — no listing queries filter by it
- Add `is_private` to `Settings.indexes` only if a "private accounts directory" feature is added later

---

## 4. Backend API Changes

### Modified endpoint
| Method | Path | Change |
|--------|------|--------|
| `PATCH /users/me` | existing | expose `is_private` in update schema |
| `GET /users/{user_id}` | existing | add privacy gate — return stripped response if private + not connected |

### New endpoints (all auth-required except where noted)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/threads/{id}/save` | Save a thread. 200 always (idempotent). `{ "saved": true }` |
| `DELETE` | `/threads/{id}/save` | Unsave. 204. 404 if not saved. |
| `GET` | `/users/me/saved-threads` | Paginated saved threads. `page`, `limit`. Returns thread data joined. |
| `GET` | `/users/me/read-history` | Paginated read history. `page`, `limit`. Returns thread data + `read_at`. |
| `POST` | `/threads/{id}/mark-read` | Upsert read record. Fire-and-forget. Returns 200. |
| `GET` | `/users/{user_id}/replies` | Threads where user has replied. Paginated. Respects privacy gate. |

### Privacy gate response shape (stripped)
```json
{
  "id": "...",
  "username": "kai",
  "display_name": "Kai",
  "bio": "...",
  "avatar_seed": ["#hex1", "#hex2"],
  "is_private": true,
  "is_locked": true,
  "created_at": "..."
}
```
`avatar_seed` is required so the frontend can render the avatar and banner gradient on the locked wall.

### New endpoint: `/users/{user_id}/replies`
- **Auth**: required (own replies) or optional (public profile — respects privacy gate)
- **Query**: find all `Post` documents where `author_id = user_id` → collect distinct `thread_id`s → fetch those `Thread` documents
- **Index requirement**: `Post.author_id` index (verify exists; add if not)
- **Response**:
```json
{
  "data": [ ...ThreadOut objects... ],
  "total": 12,
  "page": 1,
  "limit": 10
}
```
- **Privacy**: if profile is private and viewer is not a connection → 403

### `POST /threads/{id}/save` — idempotency
- Returns `200` in all success cases (create or already-saved)
- Response: `{ "saved": true }`
- Avoids frontend needing to branch on 200 vs 201

---

## 5. Frontend Structure

### 5a. Components changed
| File | Change |
|------|--------|
| `ProfileHeader.tsx` | Full redesign: semantic tokens, Medium-vibe, privacy pill, no hardcoded hex |
| `ProfileTabs.tsx` | **New** — tab bar component (Threads / Replies / Saved / History) |
| `ProfileThreads.tsx` | Renamed/extended → `ProfileContent.tsx` — handles all 4 tab panels |
| `useUserProfile.ts` | Extended: `activeTab`, `savedThreads`, `readHistory`, privacy state, replies |
| `UserProfileWorkspace.tsx` | Wires new state, renders locked wall vs full profile |

### 5a-i. `useUserProfile` fetch strategy
- `threads`: fetch on mount (existing behavior)
- `replies`: fetch lazily — only when Replies tab is first activated
- `savedThreads`: fetch lazily — only when Saved tab is first activated (own profile only)
- `readHistory`: fetch lazily — only when History tab is first activated (own profile only)
- `activeTab`: `"threads" | "replies" | "saved" | "history"` — default `"threads"`
- Each lazy tab tracks a `loaded` boolean to avoid refetching on re-activation

### 5b. Thread detail page
- On mount: fire-and-forget `POST /threads/{id}/mark-read` (no await, silent fail)

### 5c. Tab visibility rules
| Tab | Own profile | Public profile | Private (non-connection) |
|-----|-------------|----------------|--------------------------|
| Threads | ✓ | ✓ | ✗ (locked wall) |
| Replies | ✓ | ✓ | ✗ |
| Saved | ✓ | ✗ | ✗ |
| History | ✓ | ✗ | ✗ |

### 5d. Locked wall (private non-connection)
- Banner + avatar + name + bio — visible
- Lock icon + "This profile is private" message
- Follow button visible
- No stats (followers/following counts hidden)
- No tabs

### 5e. Privacy toggle (own profile)
- Small `Globe`/`Lock` button in header action row, next to "Edit profile"
- Optimistic UI update, PATCH on click, revert on error
- Tooltip: "Profile is public — click to make private" / "Profile is private — click to make public"

---

## 6. Visual Design (Medium/X-vibe)

- **Banner**: `h-[120px]`, avatar-seed gradient (light opacity, not solid dark) — `from-[av1]/20 to-[av2]/10 bg-background`
- **Avatar**: `88px rounded-full border-4 border-background`, lifted `-mt-11`
- **Name**: `text-[22px] font-serif` (DM Serif Display), foreground
- **Username**: `@handle text-[13px] text-text-tertiary`
- **Bio**: `text-[14px] leading-relaxed text-text-secondary max-w-[520px]`
- **Stats row**: `N followers · N following · N threads` — inline separators, `text-[13px]`
- **Tabs**: underline style (`border-b-2 border-foreground`) matching People/Threads pages
- **Thread cards**: clean `border-border bg-background hover:bg-card-hover` — no gradient, no hardcoded dark hex
- **All colors**: semantic tokens only (`--foreground`, `--text-secondary`, `--text-tertiary`, `--border`, `--card-hover`, `--primary`)

---

## 7. Out of Scope
- Follow-request flow for private accounts (currently follow is instant — leave as-is)
- Profile picture upload (no image storage backend)
- Thread likes/reactions on profile
- Paginated thread loading on profile (keep existing limit=10)
