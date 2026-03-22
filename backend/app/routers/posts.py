from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.models.post import Post
from app.models.thread import Thread
from app.models.user import User, UserRole
from app.models.audit_log import AuditSeverity
from app.schemas.post import PostOut, PostUpdate
from app.services.ai import score_content
from app.services.audit import log_audit
from app.services.content_deletion import soft_delete_post_subtree
from app.services.mentions import merge_mentions

router = APIRouter(prefix="/posts", tags=["posts"])


@router.patch("/{post_id}")
async def update_post(
    post_id: str,
    payload: PostUpdate,
    current_user: User = Depends(get_current_user),
) -> PostOut:
    object_id = _parse_object_id(post_id)
    post = await Post.find_one({"_id": object_id, "is_deleted": False})
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.author_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this post")

    content = payload.content.strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="content cannot be empty",
        )

    post.content = content
    post.mentions = merge_mentions(content, None)
    moderation = score_content(content)
    post.ai_score = moderation.score
    post.is_flagged = moderation.flagged
    await post.save()

    return _to_post_out(post)


@router.delete("/{post_id}")
async def delete_post(post_id: str, current_user: User = Depends(get_current_user)) -> dict[str, str]:
    object_id = _parse_object_id(post_id)
    post = await Post.find_one({"_id": object_id, "is_deleted": False})
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.author_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this post")

    deleted_posts = await soft_delete_post_subtree(post)

    thread = await Thread.find_one({"_id": post.thread_id, "is_deleted": False})
    if thread is not None and deleted_posts:
        thread.post_count = max(0, thread.post_count - len(deleted_posts))
        await thread.save()

    await log_audit(
        action="post_deleted",
        actor_id=current_user.id,
        target_type="post",
        target_id=post.id,
        severity=AuditSeverity.WARNING,
        details={
            "thread_id": str(post.thread_id),
            "deleted_post_count": len(deleted_posts),
        },
    )

    return {"message": "Post deleted"}


def _parse_object_id(value: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except Exception as exc:  # pragma: no cover - defensive input guard
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid post_id",
        ) from exc


def _to_post_out(post: Post) -> PostOut:
    return PostOut(
        id=str(post.id),
        thread_id=str(post.thread_id),
        author_id=str(post.author_id),
        parent_post_id=str(post.parent_post_id) if post.parent_post_id else None,
        content=post.content,
        mentions=post.mentions,
        ai_score=post.ai_score,
        is_flagged=post.is_flagged,
        is_deleted=post.is_deleted,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )
