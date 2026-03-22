from __future__ import annotations

from beanie import PydanticObjectId

from app.models.post import Post


async def _load_thread_posts(thread_id: PydanticObjectId) -> list[Post]:
    return await Post.find({"thread_id": thread_id}).to_list()


def _collect_post_subtree(posts: list[Post], root_post_id: PydanticObjectId) -> list[Post]:
    children_by_parent: dict[str, list[Post]] = {}
    by_id: dict[str, Post] = {}
    for post in posts:
        by_id[str(post.id)] = post
        if post.parent_post_id is None:
            continue
        children_by_parent.setdefault(str(post.parent_post_id), []).append(post)

    root = by_id.get(str(root_post_id))
    if root is None:
        return []

    to_visit = [root]
    subtree: list[Post] = []
    seen: set[str] = set()
    while to_visit:
        current = to_visit.pop()
        current_id = str(current.id)
        if current_id in seen:
            continue
        seen.add(current_id)
        subtree.append(current)
        to_visit.extend(children_by_parent.get(current_id, []))
    return subtree


async def soft_delete_post_subtree(root_post: Post) -> list[Post]:
    posts = await _load_thread_posts(root_post.thread_id)
    subtree = _collect_post_subtree(posts, root_post.id)

    deleted: list[Post] = []
    for post in subtree:
        if post.is_deleted:
            continue
        post.is_deleted = True
        await post.save()
        deleted.append(post)
    return deleted


async def soft_delete_posts_for_thread(thread_id: PydanticObjectId) -> list[Post]:
    posts = await _load_thread_posts(thread_id)
    deleted: list[Post] = []
    for post in posts:
        if post.is_deleted:
            continue
        post.is_deleted = True
        await post.save()
        deleted.append(post)
    return deleted


async def hard_delete_post_subtree(root_post: Post) -> list[Post]:
    posts = await _load_thread_posts(root_post.thread_id)
    subtree = _collect_post_subtree(posts, root_post.id)
    for post in subtree:
        await post.delete()
    return subtree


async def hard_delete_posts_for_thread(thread_id: PydanticObjectId) -> list[Post]:
    posts = await _load_thread_posts(thread_id)
    for post in posts:
        await post.delete()
    return posts
