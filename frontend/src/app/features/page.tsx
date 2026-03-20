"use client";

import NavBar from "@/components/public/sections/NavBar";
import Footer from "@/components/public/sections/Footer";

const features = [
  {
    number: "01",
    title: "AI Tone Coaching",
    tag: "Live",
    tagColor: "#3dd68c",
    headline: "Say what you mean — land it the way you intend.",
    desc: "Before you post, the AI scans for signals that your message might read harsher than you meant. It's not censorship. It's a mirror.",
    bullets: [
      "Sentiment analysis before every post",
      "Rewrite suggestions, never forced edits",
      "You always have the final say",
    ],
    icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    accent: "#0EA5E9",
  },
  {
    number: "02",
    title: "Live Threads",
    tag: "Live",
    tagColor: "#3dd68c",
    headline: "Conversations that breathe — not stale feeds.",
    desc: "Replies refresh in near real-time so discussions stay alive without constant page reloads. No more posting into a void.",
    bullets: [
      "Short-interval polling today",
      "Full WebSocket realtime planned post-v1",
      "Active thread indicators",
    ],
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    accent: "#818CF8",
  },
  {
    number: "03",
    title: "Smart Moderation",
    tag: "Live",
    tagColor: "#3dd68c",
    headline: "AI catches bad actors. Humans review edge cases.",
    desc: "Every post is scored automatically. Safe content flows through in milliseconds. Genuinely risky content goes to human review — not an algorithm ban.",
    bullets: [
      "Per-post AI toxicity scoring",
      "Human-in-the-loop for borderline cases",
      "No false positives on good-faith debate",
    ],
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    accent: "#3dd68c",
  },
  {
    number: "04",
    title: "Smart Notifications",
    tag: "Live",
    tagColor: "#3dd68c",
    headline: "Your attention is not a metric we optimize.",
    desc: "Notifications fire for mentions and replies only. No engagement bait. No dark patterns designed to pull you back into a scroll loop.",
    bullets: [
      "Mentions + direct replies only",
      "Zero algorithmic engagement triggers",
      "Batched digest option coming",
    ],
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0018 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    accent: "#fbbf24",
  },
  {
    number: "05",
    title: "Nested Threads",
    tag: "Live",
    tagColor: "#3dd68c",
    headline: "Branch any conversation. Context never collapses.",
    desc: "Reply to any post in the tree — not just the root. Hierarchical threading lets every voice carve its own path without burying the original point.",
    bullets: [
      "Unlimited nesting depth",
      "Collapsible branches",
      "Inline context always visible",
    ],
    icon: "M7 8a3 3 0 100-6 3 3 0 000 6zM7 15a6 6 0 110-12 6 6 0 010 12zm8-5a2 2 0 11-4 0 2 2 0 014 0zM16 19a4 4 0 11-8 0 4 4 0 018 0z",
    accent: "#0EA5E9",
  },
  {
    number: "06",
    title: "AI Summaries",
    tag: "Beta",
    tagColor: "#fbbf24",
    headline: "TL;DR in one click. Catch up in seconds.",
    desc: "Long thread? The AI extracts key decisions, points of consensus, and open questions — so you get the signal without the scroll.",
    bullets: [
      "On-demand thread summaries",
      "Highlights decisions and consensus",
      "Surfaces unresolved questions",
    ],
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    accent: "#818CF8",
  },
];

const compare = [
  { label: "Tone coaching before posting", khosh: true, reddit: false, twitter: false, linkedin: false },
  { label: "Human-first moderation", khosh: true, reddit: false, twitter: false, linkedin: false },
  { label: "Nested thread branching", khosh: true, reddit: true, twitter: false, linkedin: false },
  { label: "Zero engagement bait notifications", khosh: true, reddit: false, twitter: false, linkedin: false },
  { label: "AI thread summaries", khosh: true, reddit: false, twitter: false, linkedin: false },
  { label: "Professional profile + job board (coming)", khosh: true, reddit: false, twitter: false, linkedin: true },
];

export default function FeaturesPage() {
  return (
    <div className="page-shell">
      <NavBar />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />

      <main className="features-main">

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="f-hero">
          <div className="container">
            <div className="f-hero-badge">
              <span className="badge-dot" />
              Platform Features
            </div>
            <h1 className="f-hero-title">
              Every feature
              <br />
              <span className="f-hero-accent">earns its place.</span>
            </h1>
            <p className="f-hero-sub">
              No engagement tricks. No dark patterns. Each feature exists for one reason — to make conversations better.
            </p>
            <div className="f-hero-pills">
              <span className="f-pill">6 core features</span>
              <span className="f-pill">AI-assisted moderation</span>
              <span className="f-pill">Human-first by design</span>
            </div>
          </div>
        </section>

        {/* ── FEATURE SPOTLIGHT ROWS ───────────────────────────── */}
        <section className="f-spots container">
          {features.map((f, i) => (
            <article key={f.number} className={`f-spot ${i % 2 === 1 ? "f-spot--reverse" : ""}`}>
              {/* Left: content */}
              <div className="f-spot-body">
                <div className="f-spot-meta">
                  <span className="f-spot-num">{f.number}</span>
                  <span className="f-spot-tag" style={{ color: f.tagColor, background: `${f.tagColor}18` }}>
                    {f.tag}
                  </span>
                </div>
                <h2 className="f-spot-title">{f.title}</h2>
                <p className="f-spot-headline">{f.headline}</p>
                <p className="f-spot-desc">{f.desc}</p>
                <ul className="f-spot-bullets">
                  {f.bullets.map((b) => (
                    <li key={b}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: f.accent }}>
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: icon visual */}
              <div className="f-spot-visual">
                <div className="f-spot-glow" style={{ background: `${f.accent}18` }} />
                <div className="f-spot-icon-wrap" style={{ background: `${f.accent}22`, border: `1px solid ${f.accent}40` }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ color: f.accent }}>
                    <path d={f.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
                <span className="f-spot-watermark">{f.number}</span>
              </div>
            </article>
          ))}
        </section>

        {/* ── COMPARISON TABLE ─────────────────────────────────── */}
        <section className="f-compare">
          <div className="container">
            <div className="f-compare-header">
              <p className="section-label">How we compare</p>
              <h2 className="section-title">Built differently, on purpose</h2>
            </div>
            <div className="f-compare-table-wrap">
              <table className="f-compare-table">
                <thead>
                  <tr>
                    <th className="col-feature">Feature</th>
                    <th className="col-khosh">KhoshGolpo</th>
                    <th>Reddit</th>
                    <th>X / Twitter</th>
                    <th>LinkedIn</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map((row) => (
                    <tr key={row.label}>
                      <td className="col-feature">{row.label}</td>
                      <td className="col-khosh">
                        {row.khosh
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="Yes"><path d="M20 6L9 17l-5-5" stroke="#3dd68c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <span className="no-mark">—</span>}
                      </td>
                      <td>{row.reddit ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span className="no-mark">—</span>}</td>
                      <td>{row.twitter ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span className="no-mark">—</span>}</td>
                      <td>{row.linkedin ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span className="no-mark">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS — TIMELINE ──────────────────────────── */}
        <section className="f-timeline">
          <div className="container">
            <div className="f-timeline-header">
              <p className="section-label">How it works</p>
              <h2 className="section-title">Three moments. One better conversation.</h2>
            </div>
            <div className="f-timeline-track">
              <div className="f-timeline-line" aria-hidden="true" />
              {[
                {
                  n: "1",
                  title: "Start a thread",
                  desc: "Write your idea, question, or story. AI checks the tone before you post — helping you land it the way you mean it.",
                },
                {
                  n: "2",
                  title: "Community replies",
                  desc: "Replies refresh in near real-time. Branch conversations naturally and keep context clear with nested threading.",
                },
                {
                  n: "3",
                  title: "AI keeps it warm",
                  desc: "Moderation runs silently in the background. Good conversations flow freely. Bad actors get caught, not good people.",
                },
              ].map((step) => (
                <div key={step.n} className="f-timeline-step">
                  <div className="f-timeline-dot">
                    <span>{step.n}</span>
                  </div>
                  <div className="f-timeline-content">
                    <h3 className="f-timeline-title">{step.title}</h3>
                    <p className="f-timeline-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />

      <style jsx>{`
        .page-shell {
          position: relative;
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          overflow: hidden;
        }

        .features-main {
          position: relative;
          z-index: 1;
          padding-top: 88px;
        }

        /* ── HERO ─── */
        .f-hero {
          padding: 100px 0 80px;
          text-align: center;
        }

        .f-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent);
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.2);
          padding: 6px 14px;
          border-radius: 999px;
          margin-bottom: 32px;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .f-hero-title {
          font-family: var(--serif);
          font-size: clamp(48px, 6vw, 80px);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 24px;
          color: var(--text);
        }

        .f-hero-accent {
          color: var(--accent);
        }

        .f-hero-sub {
          font-size: 18px;
          color: var(--muted);
          line-height: 1.7;
          max-width: 520px;
          margin: 0 auto 40px;
        }

        .f-hero-pills {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .f-pill {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 7px 16px;
          border-radius: 999px;
        }

        /* ── SPOTLIGHT ROWS ─── */
        .f-spots {
          padding: 40px 0 120px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: var(--border);
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 120px;
        }

        .f-spot {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 0;
          background: var(--surface);
          padding: 64px 56px;
          position: relative;
          overflow: hidden;
          transition: background 0.25s;
        }

        .f-spot:hover {
          background: var(--surface2);
        }

        .f-spot--reverse {
          grid-template-columns: 380px 1fr;
        }

        .f-spot--reverse .f-spot-body {
          order: 2;
        }

        .f-spot--reverse .f-spot-visual {
          order: 1;
        }

        .f-spot-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .f-spot-num {
          font-family: var(--serif);
          font-size: 13px;
          font-weight: 700;
          color: var(--muted);
          letter-spacing: 0.05em;
        }

        .f-spot-tag {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 999px;
        }

        .f-spot-title {
          font-family: var(--serif);
          font-size: clamp(22px, 2.5vw, 32px);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-bottom: 12px;
        }

        .f-spot-headline {
          font-size: 15px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .f-spot-desc {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.75;
          margin-bottom: 28px;
          max-width: 480px;
        }

        .f-spot-bullets {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .f-spot-bullets li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }

        .f-spot-bullets li svg {
          flex-shrink: 0;
        }

        .f-spot-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .f-spot-glow {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
        }

        .f-spot-icon-wrap {
          width: 120px;
          height: 120px;
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .f-spot-icon-wrap svg {
          width: 52px;
          height: 52px;
        }

        .f-spot-watermark {
          position: absolute;
          bottom: 24px;
          right: 28px;
          font-family: var(--serif);
          font-size: 80px;
          font-weight: 800;
          color: var(--border);
          line-height: 1;
          pointer-events: none;
          user-select: none;
          z-index: 0;
        }

        /* ── COMPARISON ─── */
        .f-compare {
          padding: 120px 0;
        }

        .f-compare-header {
          text-align: center;
          margin-bottom: 56px;
        }

        .f-compare-table-wrap {
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid var(--border);
        }

        .f-compare-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .f-compare-table th {
          padding: 16px 20px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--muted);
          background: var(--surface2);
          border-bottom: 1px solid var(--border);
        }

        .f-compare-table th.col-feature {
          text-align: left;
          width: 45%;
        }

        .f-compare-table th.col-khosh {
          color: var(--accent);
          background: rgba(14, 165, 233, 0.07);
        }

        .f-compare-table td {
          padding: 14px 20px;
          text-align: center;
          border-bottom: 1px solid var(--border);
          color: var(--muted);
          vertical-align: middle;
        }

        .f-compare-table tr:last-child td {
          border-bottom: none;
        }

        .f-compare-table td.col-feature {
          text-align: left;
          font-weight: 500;
          color: var(--text);
          font-size: 14px;
        }

        .f-compare-table td.col-khosh {
          background: rgba(14, 165, 233, 0.04);
        }

        .f-compare-table td svg {
          display: inline-block;
          vertical-align: middle;
        }

        .no-mark {
          color: var(--border);
          font-size: 16px;
          font-weight: 600;
        }

        /* ── TIMELINE ─── */
        .f-timeline {
          padding: 120px 0 140px;
        }

        .f-timeline-header {
          text-align: center;
          margin-bottom: 72px;
        }

        .f-timeline-track {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0;
          max-width: 640px;
          margin: 0 auto;
        }

        .f-timeline-line {
          position: absolute;
          left: 27px;
          top: 28px;
          bottom: 28px;
          width: 2px;
          background: linear-gradient(to bottom, var(--accent), var(--border) 90%);
          z-index: 0;
        }

        .f-timeline-step {
          display: flex;
          gap: 28px;
          align-items: flex-start;
          padding: 28px 0;
          position: relative;
          z-index: 1;
        }

        .f-timeline-dot {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--surface);
          border: 2px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--serif);
          font-size: 18px;
          font-weight: 800;
          color: var(--accent);
          flex-shrink: 0;
          transition: all 0.25s;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.08);
        }

        .f-timeline-step:hover .f-timeline-dot {
          background: var(--accent);
          color: #fff;
          box-shadow: 0 0 0 8px rgba(14, 165, 233, 0.12);
        }

        .f-timeline-content {
          padding-top: 12px;
        }

        .f-timeline-title {
          font-family: var(--serif);
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }

        .f-timeline-desc {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.7;
        }

        /* ── GLOBAL REUSE ─── */
        .section-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 12px;
        }

        .section-title {
          font-family: var(--serif);
          font-size: clamp(28px, 3.5vw, 44px);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        /* ── MOBILE ─── */
        @media (max-width: 900px) {
          .f-spots {
            border-radius: 16px;
            margin-bottom: 80px;
          }

          .f-spot,
          .f-spot--reverse {
            grid-template-columns: 1fr;
            padding: 40px 28px;
          }

          .f-spot--reverse .f-spot-body,
          .f-spot--reverse .f-spot-visual {
            order: unset;
          }

          .f-spot-visual {
            display: none;
          }

          .f-compare {
            padding: 80px 0;
          }

          .f-timeline {
            padding: 80px 0 100px;
          }
        }

        @media (max-width: 600px) {
          .f-hero {
            padding: 72px 0 60px;
          }

          .f-hero-pills {
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
