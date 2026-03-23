"""Seed dummy job postings without disturbing existing data.

Run from project root (with venv activated):
    python -m scripts.seed_jobs
"""

import asyncio
from datetime import datetime, timedelta, timezone
from secrets import token_hex

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError as MongoDuplicateKeyError

from app.core.config import get_settings
from app.models import DOCUMENT_MODELS
from app.models.job_post import (
    CustomQuestion,
    ExperienceLevel,
    JobPost,
    JobStatus,
    JobType,
    QuestionType,
)
from app.models.user import User
from app.services.jobs import make_slug


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def ago(**kwargs) -> datetime:
    return now_utc() - timedelta(**kwargs)


def future(**kwargs) -> datetime:
    return now_utc() + timedelta(**kwargs)


JOB_DATA = [
    {
        "title": "Senior Backend Engineer (Python / FastAPI)",
        "company_name": "Nexora Labs",
        "location": "San Francisco, CA",
        "is_remote": True,
        "job_type": JobType.full_time,
        "experience_level": ExperienceLevel.senior,
        "salary_min": 140_000,
        "salary_max": 180_000,
        "salary_currency": "USD",
        "salary_visible": True,
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"],
        "tags": ["backend", "python", "api", "remote"],
        "description": (
            "We're looking for a Senior Backend Engineer to help scale our real-time collaboration platform.\n\n"
            "**What you'll do:**\n"
            "- Design and build high-throughput REST and WebSocket APIs using FastAPI\n"
            "- Own backend services end-to-end: from schema design to production monitoring\n"
            "- Collaborate with product and frontend teams on new features\n"
            "- Mentor junior engineers and lead code reviews\n\n"
            "**Requirements:**\n"
            "- 5+ years professional Python experience\n"
            "- Deep understanding of async I/O and concurrency patterns\n"
            "- Experience with PostgreSQL and Redis in production\n"
            "- Comfort with Docker and CI/CD pipelines\n\n"
            "**Nice to have:**\n"
            "- Experience with MongoDB or other document stores\n"
            "- Familiarity with WebSockets or event-driven architectures\n\n"
            "We're fully remote-first, offer generous equity, and ship real products that developers love."
        ),
        "application_deadline": future(days=30),
        "status": JobStatus.active,
        "created_at_offset": ago(days=5),
        "application_count": 12,
        "save_count": 27,
    },
    {
        "title": "Frontend Engineer - React / Next.js",
        "company_name": "Nexora Labs",
        "location": "Remote",
        "is_remote": True,
        "job_type": JobType.full_time,
        "experience_level": ExperienceLevel.mid,
        "salary_min": 110_000,
        "salary_max": 145_000,
        "salary_currency": "USD",
        "salary_visible": True,
        "required_skills": ["React", "Next.js", "TypeScript", "Tailwind CSS"],
        "tags": ["frontend", "react", "nextjs", "remote"],
        "description": (
            "Join our frontend team to build the interfaces that thousands of developers use every day.\n\n"
            "**Role overview:**\n"
            "- Build fast, accessible UI components with React 19 and Next.js App Router\n"
            "- Work closely with design to turn Figma specs into pixel-perfect, delightful experiences\n"
            "- Own the performance budget - we care about Core Web Vitals\n"
            "- Contribute to our shared component library\n\n"
            "**Requirements:**\n"
            "- 3+ years React experience, ideally with Next.js\n"
            "- Strong TypeScript skills\n"
            "- Eye for detail - you notice when spacing is off by 2px\n\n"
            "**Bonus points:**\n"
            "- Experience with Zustand, SWR, or similar state/data libraries\n"
            "- Contributions to open-source projects"
        ),
        "application_deadline": future(days=21),
        "status": JobStatus.active,
        "created_at_offset": ago(days=3),
        "application_count": 8,
        "save_count": 19,
    },
    {
        "title": "DevOps / Platform Engineer",
        "company_name": "Nexora Labs",
        "location": "New York, NY",
        "is_remote": False,
        "job_type": JobType.full_time,
        "experience_level": ExperienceLevel.senior,
        "salary_min": 135_000,
        "salary_max": 165_000,
        "salary_currency": "USD",
        "salary_visible": True,
        "required_skills": ["Kubernetes", "AWS", "Terraform", "GitHub Actions", "Prometheus"],
        "tags": ["devops", "platform", "aws", "kubernetes"],
        "description": (
            "We're scaling fast and need a platform engineer to own our infrastructure as code and observability stack.\n\n"
            "**Responsibilities:**\n"
            "- Manage Kubernetes clusters on AWS EKS\n"
            "- Write and maintain Terraform modules for all cloud resources\n"
            "- Build and improve CI/CD pipelines in GitHub Actions\n"
            "- Set up alerting and dashboards with Prometheus + Grafana\n\n"
            "**Requirements:**\n"
            "- Strong AWS experience (EKS, RDS, S3, IAM)\n"
            "- Comfortable writing Terraform at scale\n"
            "- Experience with container orchestration in production\n\n"
            "On-site in NYC 3 days/week. Visa sponsorship available for exceptional candidates."
        ),
        "application_deadline": future(days=45),
        "status": JobStatus.active,
        "created_at_offset": ago(days=7),
        "application_count": 5,
        "save_count": 14,
    },
    {
        "title": "Junior Full-Stack Developer (Internship)",
        "company_name": "Bloom Startup Studio",
        "location": "Dhaka, Bangladesh",
        "is_remote": True,
        "job_type": JobType.internship,
        "experience_level": ExperienceLevel.entry,
        "salary_min": 800,
        "salary_max": 1_200,
        "salary_currency": "USD",
        "salary_visible": True,
        "required_skills": ["JavaScript", "React", "Node.js", "MongoDB"],
        "tags": ["internship", "fullstack", "entry-level", "remote", "startup"],
        "description": (
            "Bloom Startup Studio is a small product studio that builds B2B SaaS tools for SMEs across South Asia.\n\n"
            "We're looking for a motivated junior developer to join us as a full-stack intern for 3-6 months, "
            "with the possibility of a permanent role.\n\n"
            "**You'll work on:**\n"
            "- Building new features in our React frontend and Node/Express backend\n"
            "- Writing tests and fixing bugs\n"
            "- Participating in weekly product reviews and sprint planning\n\n"
            "**We're looking for:**\n"
            "- Basic JavaScript and React knowledge\n"
            "- Eagerness to learn - attitude matters more than experience\n"
            "- Availability for at least 30 hours/week\n\n"
            "This is a paid remote internship. We're a friendly team of 6 and we take mentorship seriously."
        ),
        "application_deadline": future(days=14),
        "status": JobStatus.active,
        "created_at_offset": ago(days=2),
        "application_count": 23,
        "save_count": 41,
    },
    {
        "title": "Product Designer (UI/UX)",
        "company_name": "Bloom Startup Studio",
        "location": "Remote",
        "is_remote": True,
        "job_type": JobType.contract,
        "experience_level": ExperienceLevel.mid,
        "salary_min": 5_000,
        "salary_max": 8_000,
        "salary_currency": "USD",
        "salary_visible": True,
        "required_skills": ["Figma", "User Research", "Prototyping", "Design Systems"],
        "tags": ["design", "ux", "figma", "contract", "remote"],
        "description": (
            "Contract engagement (3 months, likely to extend) for a product designer to own the UX of two "
            "greenfield SaaS products.\n\n"
            "**Scope:**\n"
            "- Lead user research: interviews, usability testing, synthesis\n"
            "- Design end-to-end flows in Figma - wireframes through final hi-fi\n"
            "- Build and maintain a shared component library\n"
            "- Work closely with our two developers to ensure pixel-accurate implementation\n\n"
            "**Requirements:**\n"
            "- Portfolio demonstrating product thinking, not just visual polish\n"
            "- Proficiency in Figma (auto-layout, variables, components)\n"
            "- Ability to work async with a small distributed team\n\n"
            "Budget: $5,000-$8,000/month depending on experience. 20-30 hrs/week."
        ),
        "application_deadline": future(days=10),
        "status": JobStatus.active,
        "created_at_offset": ago(days=1),
        "application_count": 7,
        "save_count": 22,
    },
    {
        "title": "Machine Learning Engineer",
        "company_name": "DataPulse AI",
        "location": "London, UK",
        "is_remote": True,
        "job_type": JobType.full_time,
        "experience_level": ExperienceLevel.senior,
        "salary_min": 95_000,
        "salary_max": 130_000,
        "salary_currency": "GBP",
        "salary_visible": True,
        "required_skills": ["Python", "PyTorch", "MLflow", "AWS SageMaker", "SQL"],
        "tags": ["ml", "ai", "python", "remote", "london"],
        "description": (
            "DataPulse AI builds real-time anomaly detection for financial services. "
            "We're a Series A company (GBP 8M raised) with a team of 18.\n\n"
            "**The role:**\n"
            "- Train and deploy ML models for time-series anomaly detection\n"
            "- Maintain and improve our MLflow experiment tracking and model registry\n"
            "- Work with data engineers to design feature pipelines at scale\n"
            "- Write production Python - clean, tested, reviewed\n\n"
            "**Must-haves:**\n"
            "- 4+ years ML engineering (not just research) experience\n"
            "- PyTorch or TensorFlow in production\n"
            "- Familiarity with MLOps tools (MLflow, DVC, or similar)\n"
            "- Strong SQL skills for feature analysis\n\n"
            "**Perks:** EMI equity, 25 days holiday, remote-first with optional London office access."
        ),
        "application_deadline": future(days=60),
        "status": JobStatus.active,
        "created_at_offset": ago(days=10),
        "application_count": 31,
        "save_count": 58,
    },
    {
        "title": "Technical Writer - Developer Docs",
        "company_name": "DataPulse AI",
        "location": "Remote",
        "is_remote": True,
        "job_type": JobType.part_time,
        "experience_level": ExperienceLevel.mid,
        "salary_min": 40_000,
        "salary_max": 55_000,
        "salary_currency": "GBP",
        "salary_visible": True,
        "required_skills": ["Technical Writing", "Markdown", "API Documentation", "Git"],
        "tags": ["docs", "writing", "api", "part-time", "remote"],
        "description": (
            "Part-time (20-25 hrs/week) technical writer to own developer-facing documentation "
            "for our REST API and Python SDK.\n\n"
            "**Responsibilities:**\n"
            "- Write, maintain, and improve API reference docs (OpenAPI/Swagger)\n"
            "- Create tutorials and quickstart guides for common integration patterns\n"
            "- Work with engineers to document new features as they ship\n"
            "- Gather feedback from developer users and improve docs iteratively\n\n"
            "**Requirements:**\n"
            "- Demonstrable technical writing portfolio (docs.rs, ReadTheDocs, Notion, etc.)\n"
            "- Comfortable reading Python code and simple REST API calls\n"
            "- Familiarity with Markdown and Git-based doc workflows\n\n"
            "You don't need to be a developer, but you do need to understand developers."
        ),
        "application_deadline": future(days=25),
        "status": JobStatus.active,
        "created_at_offset": ago(days=4),
        "application_count": 9,
        "save_count": 16,
    },
    {
        "title": "QA Engineer - Manual & Automation",
        "company_name": "DataPulse AI",
        "location": "Remote",
        "is_remote": True,
        "job_type": JobType.full_time,
        "experience_level": ExperienceLevel.mid,
        "salary_min": 70_000,
        "salary_max": 95_000,
        "salary_currency": "GBP",
        "salary_visible": True,
        "required_skills": ["Selenium", "Python", "CI/CD", "API Testing"],
        "tags": ["qa", "testing", "automation", "remote"],
        "description": (
            "Join our QA team to help ship reliable ML-powered products.\n\n"
            "**Responsibilities:**\n"
            "- Design and execute test plans for API and web applications\n"
            "- Write and maintain automated test suites (Selenium + pytest)\n"
            "- Integrate tests into CI/CD pipelines\n\n"
            "**Requirements:**\n"
            "- 3+ years QA experience with both manual and automated testing\n"
            "- Strong Python skills\n"
            "- Experience with REST API testing"
        ),
        "custom_questions": [
            CustomQuestion(
                id="q1",
                label="Do you have experience with ML model testing?",
                type=QuestionType.yes_no,
                required=True,
            ),
            CustomQuestion(
                id="q2",
                label="Which testing frameworks have you used?",
                type=QuestionType.multi_select,
                required=True,
                options=["Selenium", "Cypress", "Playwright", "pytest", "Jest"],
            ),
            CustomQuestion(
                id="q3",
                label="Link to a test portfolio or GitHub with test examples",
                type=QuestionType.url,
                required=False,
            ),
        ],
        "application_deadline": future(days=20),
        "status": JobStatus.active,
        "created_at_offset": ago(days=3),
        "application_count": 4,
        "save_count": 11,
    },
    {
        "title": "Data Analyst - Growth Team",
        "company_name": "Nexora Labs",
        "location": "Berlin, Germany",
        "is_remote": False,
        "job_type": JobType.full_time,
        "experience_level": ExperienceLevel.mid,
        "salary_min": 65_000,
        "salary_max": 85_000,
        "salary_currency": "EUR",
        "salary_visible": True,
        "required_skills": ["SQL", "Python", "Looker", "dbt"],
        "tags": ["data", "analytics", "growth"],
        "description": (
            "Join our Growth team to turn data into product decisions.\n\n"
            "**Note:** This role uses our external application portal. "
            "Click 'Apply on Company Site' to submit your application through our careers page."
        ),
        "external_apply_url": "https://careers.nexoralabs.example.com/data-analyst",
        "application_deadline": future(days=35),
        "status": JobStatus.active,
        "created_at_offset": ago(days=6),
        "application_count": 15,
        "save_count": 20,
    },
    {
        "title": "iOS Developer (Swift)",
        "company_name": "Nexora Labs",
        "location": "Austin, TX",
        "is_remote": False,
        "job_type": JobType.full_time,
        "experience_level": ExperienceLevel.mid,
        "salary_min": 120_000,
        "salary_max": 150_000,
        "salary_currency": "USD",
        "salary_visible": True,
        "required_skills": ["Swift", "SwiftUI", "Xcode", "Core Data", "REST APIs"],
        "tags": ["ios", "swift", "mobile"],
        "description": (
            "**This position has been filled.** We are no longer accepting applications.\n\n"
            "We were looking for a mid-level iOS developer to join our mobile team in Austin. "
            "Thank you to everyone who applied."
        ),
        "application_deadline": ago(days=5),
        "status": JobStatus.closed,
        "created_at_offset": ago(days=45),
        "application_count": 47,
        "save_count": 33,
    },
]


async def seed_jobs() -> None:
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri)
    database = client[settings.mongodb_db_name]
    await init_beanie(database=database, document_models=DOCUMENT_MODELS)

    # Remove dev docs without slugs so re-seeding is idempotent
    await JobPost.find({"slug": None}).delete()

    print("Seeding dummy job postings (non-destructive)...")

    poster_map: dict[str, User] = {}
    for username in ("admin", "user1", "user2"):
        user = await User.find_one(User.username == username)
        if user is None:
            print(f"  WARNING: User '{username}' not found -- run seed.py first")
            return
        poster_map[username] = user

    poster_usernames = ["admin", "admin", "admin", "user1", "user1", "user2", "user2", "user2", "admin", "admin"]

    inserted = 0
    for job_data, poster_username in zip(JOB_DATA, poster_usernames):
        poster = poster_map[poster_username]
        created_at = job_data.pop("created_at_offset")

        base_slug = make_slug(job_data["title"], job_data["company_name"])
        for attempt in range(2):
            slug = base_slug if attempt == 0 else f"{base_slug[:90]}-{token_hex(3)}"
            job = JobPost(
                poster_id=poster.id,
                created_at=created_at,
                updated_at=created_at,
                slug=slug,
                **job_data,
            )
            try:
                await job.insert()
                break
            except MongoDuplicateKeyError:
                if attempt == 1:
                    raise
                continue
        inserted += 1
        print(f"  + [{job.status.value:14s}] {job.slug} | {job.title}")

    print(f"\nDone -- inserted {inserted} job postings.")
    print("Open http://localhost:3000/jobs to browse them.")


if __name__ == "__main__":
    asyncio.run(seed_jobs())
