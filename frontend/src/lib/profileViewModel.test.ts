import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOverviewSectionOrder,
  formatCertificationTimeline,
  formatTimelineRange,
  getProfileTabs,
  getRenderableOverviewSections,
  type PublicProfilePayload,
} from "./profileViewModel";


function makePayload(): PublicProfilePayload {
  return {
    user: {
      id: "user-1",
      username: "alice",
      display_name: "Alice Dev",
      bio: "Short bio",
      avatar_url: null,
      profile_slug: "alice-profile",
      is_private: true,
      is_bot: false,
      created_at: "2030-01-01T00:00:00.000Z",
    },
    basics: {
      headline: "Staff Engineer",
      about: "Long about section",
      banner_url: null,
      location: "Dhaka",
      website: "https://alice.dev",
      completion_percent: 72,
    },
    layout: {
      middle_order: ["skills", "projects", "certifications"],
    },
    sections: {
      experience: [{ id: "exp-1", title: "Senior Engineer", company: "Acme", sort_order: 1, is_visible: true }],
      education: [{ id: "edu-1", school: "BUET", degree: "BSc", sort_order: 1, is_visible: true }],
      projects: [{ id: "proj-1", name: "KhoshGolpo", role: "Lead builder", sort_order: 1, is_visible: true }],
      skills: [{ id: "skill-1", name: "React", sort_order: 1, is_visible: true }],
      certifications: [{ id: "cert-1", name: "AWS", issuer: "Amazon", sort_order: 1, is_visible: true }],
      contact_links: [{ id: "link-1", type: "github", value: "https://github.com/alice", sort_order: 1, is_visible: true, is_public: true }],
    },
    viewer: {
      is_owner: false,
      is_admin: false,
      can_view_activity: false,
    },
  };
}


test("profile tabs expose overview and hide saved for visitors", () => {
  assert.deepEqual(getProfileTabs(false), ["overview", "threads", "replies"]);
  assert.deepEqual(getProfileTabs(true), ["overview", "threads", "replies", "saved"]);
});


test("overview section order keeps fixed sections and reorders the middle group only", () => {
  assert.deepEqual(
    buildOverviewSectionOrder(["skills", "projects", "certifications"]),
    ["about", "experience", "education", "skills", "projects", "certifications", "contact"],
  );

  assert.deepEqual(
    buildOverviewSectionOrder(["certifications"]),
    ["about", "experience", "education", "certifications", "projects", "skills", "contact"],
  );
});


test("renderable overview sections drop empty sections but keep contact and about when present", () => {
  const payload = makePayload();
  const sections = getRenderableOverviewSections(payload);

  assert.deepEqual(
    sections.map((section) => section.key),
    ["about", "experience", "education", "skills", "projects", "certifications", "contact"],
  );
  assert.equal(sections[0]?.title, "About");
  assert.equal(sections.at(-1)?.title, "Contact");
});


test("profile section types preserve richer backend fields used by overview cards", () => {
  const payload = makePayload();
  const education = payload.sections.education[0];
  const project = payload.sections.projects[0];
  const certification = payload.sections.certifications[0];

  assert.equal(education?.degree, "BSc");
  assert.equal(project?.role, "Lead builder");
  assert.equal(certification?.issuer, "Amazon");
});


test("formatTimelineRange renders month timelines and present labels", () => {
  assert.equal(formatTimelineRange("2024-01", null, true), "Jan 2024 - Present");
  assert.equal(formatTimelineRange("2021-02", "2023-11"), "Feb 2021 - Nov 2023");
  assert.equal(formatTimelineRange("2020", null, false), "2020");
});


test("formatCertificationTimeline renders issued and expiry dates when available", () => {
  assert.equal(formatCertificationTimeline("2025-01", "2028-03"), "Issued Jan 2025 · Expires Mar 2028");
  assert.equal(formatCertificationTimeline("2025-01", null), "Issued Jan 2025");
  assert.equal(formatCertificationTimeline(null, null), null);
});
