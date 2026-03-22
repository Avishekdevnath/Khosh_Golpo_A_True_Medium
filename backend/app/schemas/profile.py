from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.user_contact_link import ContactLinkType


class ProfileUserSummaryOut(BaseModel):
    id: str
    username: str
    display_name: str
    bio: str | None = None
    avatar_url: str | None = None
    profile_slug: str | None = None
    is_private: bool = False
    is_bot: bool = False
    created_at: datetime


class ProfileBasicsOut(BaseModel):
    headline: str | None = None
    about: str | None = None
    banner_url: str | None = None
    location: str | None = None
    website: str | None = None
    completion_percent: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProfileViewerStateOut(BaseModel):
    is_owner: bool
    is_admin: bool
    can_view_activity: bool


class ProfileLayoutOut(BaseModel):
    middle_order: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProfileVisibilityOut(BaseModel):
    show_about: bool = True
    show_experience: bool = True
    show_education: bool = True
    show_projects: bool = True
    show_skills: bool = True
    show_certifications: bool = True
    show_contact: bool = True

    model_config = ConfigDict(from_attributes=True)


class ExperienceOut(BaseModel):
    id: str
    title: str
    company: str
    employment_type: str | None = None
    location: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool = False
    description: str | None = None
    sort_order: int = 0
    is_visible: bool = True


class EducationOut(BaseModel):
    id: str
    school: str
    degree: str | None = None
    field_of_study: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool = False
    description: str | None = None
    sort_order: int = 0
    is_visible: bool = True


class ProjectOut(BaseModel):
    id: str
    name: str
    role: str | None = None
    description: str | None = None
    project_url: str | None = None
    repo_url: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_ongoing: bool = False
    sort_order: int = 0
    is_visible: bool = True


class SkillOut(BaseModel):
    id: str
    name: str
    sort_order: int = 0
    is_visible: bool = True


class CertificationOut(BaseModel):
    id: str
    name: str
    issuer: str | None = None
    issue_date: str | None = None
    expiry_date: str | None = None
    credential_id: str | None = None
    credential_url: str | None = None
    sort_order: int = 0
    is_visible: bool = True


class ContactLinkOut(BaseModel):
    id: str
    type: ContactLinkType
    label: str | None = None
    value: str
    is_public: bool = True
    sort_order: int = 0
    is_visible: bool = True


class ProfileSectionsOut(BaseModel):
    experience: list[ExperienceOut] = Field(default_factory=list)
    education: list[EducationOut] = Field(default_factory=list)
    projects: list[ProjectOut] = Field(default_factory=list)
    skills: list[SkillOut] = Field(default_factory=list)
    certifications: list[CertificationOut] = Field(default_factory=list)
    contact_links: list[ContactLinkOut] = Field(default_factory=list)


class PublicProfileOut(BaseModel):
    user: ProfileUserSummaryOut
    basics: ProfileBasicsOut
    layout: ProfileLayoutOut
    sections: ProfileSectionsOut
    viewer: ProfileViewerStateOut


class ManageProfileOut(BaseModel):
    user: ProfileUserSummaryOut
    basics: ProfileBasicsOut
    visibility: ProfileVisibilityOut
    layout: ProfileLayoutOut
    sections: ProfileSectionsOut


class ProfileBasicsUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=280)
    headline: str | None = Field(default=None, max_length=120)
    about: str | None = Field(default=None, max_length=5000)
    avatar_url: str | None = Field(default=None, max_length=500)
    avatar_public_id: str | None = Field(default=None, max_length=300)
    banner_url: str | None = Field(default=None, max_length=500)
    banner_public_id: str | None = Field(default=None, max_length=300)
    location: str | None = Field(default=None, max_length=120)
    website: str | None = Field(default=None, max_length=300)
    is_private: bool | None = None


class ProfileMediaSignatureRequest(BaseModel):
    kind: Literal["avatar", "banner"]


class ProfileMediaSignatureOut(BaseModel):
    kind: Literal["avatar", "banner"]
    cloud_name: str
    api_key: str
    timestamp: int
    folder: str
    public_id: str
    signature: str
    upload_url: str
    overwrite: bool = True


class ProfileVisibilityUpdate(BaseModel):
    show_about: bool | None = None
    show_experience: bool | None = None
    show_education: bool | None = None
    show_projects: bool | None = None
    show_skills: bool | None = None
    show_certifications: bool | None = None
    show_contact: bool | None = None


class ProfileLayoutUpdate(BaseModel):
    middle_order: list[str] = Field(default_factory=list)


class ExperienceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    company: str = Field(min_length=1, max_length=120)
    employment_type: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=120)
    start_date: str | None = Field(default=None, max_length=20)
    end_date: str | None = Field(default=None, max_length=20)
    is_current: bool = False
    description: str | None = Field(default=None, max_length=2000)
    sort_order: int = 0
    is_visible: bool = True


class ExperienceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    company: str | None = Field(default=None, min_length=1, max_length=120)
    employment_type: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=120)
    start_date: str | None = Field(default=None, max_length=20)
    end_date: str | None = Field(default=None, max_length=20)
    is_current: bool | None = None
    description: str | None = Field(default=None, max_length=2000)
    sort_order: int | None = None
    is_visible: bool | None = None


class EducationCreate(BaseModel):
    school: str = Field(min_length=1, max_length=120)
    degree: str | None = Field(default=None, max_length=120)
    field_of_study: str | None = Field(default=None, max_length=120)
    start_date: str | None = Field(default=None, max_length=20)
    end_date: str | None = Field(default=None, max_length=20)
    is_current: bool = False
    description: str | None = Field(default=None, max_length=2000)
    sort_order: int = 0
    is_visible: bool = True


class EducationUpdate(BaseModel):
    school: str | None = Field(default=None, min_length=1, max_length=120)
    degree: str | None = Field(default=None, max_length=120)
    field_of_study: str | None = Field(default=None, max_length=120)
    start_date: str | None = Field(default=None, max_length=20)
    end_date: str | None = Field(default=None, max_length=20)
    is_current: bool | None = None
    description: str | None = Field(default=None, max_length=2000)
    sort_order: int | None = None
    is_visible: bool | None = None


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    role: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    project_url: str | None = Field(default=None, max_length=300)
    repo_url: str | None = Field(default=None, max_length=300)
    start_date: str | None = Field(default=None, max_length=20)
    end_date: str | None = Field(default=None, max_length=20)
    is_ongoing: bool = False
    sort_order: int = 0
    is_visible: bool = True


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    role: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    project_url: str | None = Field(default=None, max_length=300)
    repo_url: str | None = Field(default=None, max_length=300)
    start_date: str | None = Field(default=None, max_length=20)
    end_date: str | None = Field(default=None, max_length=20)
    is_ongoing: bool | None = None
    sort_order: int | None = None
    is_visible: bool | None = None


class SkillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    sort_order: int = 0
    is_visible: bool = True


class SkillUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    sort_order: int | None = None
    is_visible: bool | None = None


class CertificationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    issuer: str | None = Field(default=None, max_length=120)
    issue_date: str | None = Field(default=None, max_length=20)
    expiry_date: str | None = Field(default=None, max_length=20)
    credential_id: str | None = Field(default=None, max_length=120)
    credential_url: str | None = Field(default=None, max_length=300)
    sort_order: int = 0
    is_visible: bool = True


class CertificationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=140)
    issuer: str | None = Field(default=None, max_length=120)
    issue_date: str | None = Field(default=None, max_length=20)
    expiry_date: str | None = Field(default=None, max_length=20)
    credential_id: str | None = Field(default=None, max_length=120)
    credential_url: str | None = Field(default=None, max_length=300)
    sort_order: int | None = None
    is_visible: bool | None = None


class ContactLinkCreate(BaseModel):
    type: ContactLinkType
    label: str | None = Field(default=None, max_length=80)
    value: str = Field(min_length=1, max_length=300)
    is_public: bool | None = None
    sort_order: int = 0
    is_visible: bool = True


class ContactLinkUpdate(BaseModel):
    type: ContactLinkType | None = None
    label: str | None = Field(default=None, max_length=80)
    value: str | None = Field(default=None, min_length=1, max_length=300)
    is_public: bool | None = None
    sort_order: int | None = None
    is_visible: bool | None = None
