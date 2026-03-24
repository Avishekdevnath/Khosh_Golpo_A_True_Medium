from __future__ import annotations
from ..models.job_post import JobPost


def compute_match_score(
    user_skill_names: list[str],  # lowercased, is_visible=True skills
    job: JobPost,
) -> int | None:
    """Return 0–100 match score, or None if job has no required_skills."""
    job_skills = {s.lower().strip() for s in job.required_skills}

    if not job_skills:
        return None   # no required_skills → badge would be meaningless

    if not user_skill_names:
        return 0      # user has no visible skills → 0% match

    user_skills = set(user_skill_names)
    matched = len(user_skills & job_skills)
    return round(matched / len(job_skills) * 100)
