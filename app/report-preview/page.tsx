'use client';

import { useState } from "react";

// AnswerRank AI — Sample Report Preview Page
// Route: /report-preview
// Mock business: Peak Performance Chiropractic, Edmonton AB
// Score: 19/100 (intentionally low — makes Fix List feel urgent)
// 3 competitors with scores: 71, 54, 28

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  a { text-decoration: none; color: inherit; }
  button { background: none; border: none; cursor: pointer; }

  .ar-serif { font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif; }
  .ar-sans { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
  .ar-italic { font-style: italic; }

  @keyframes ar-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes ar-fillbar { from { width: 0; } to { width: var(--target); } }

  .ar-pulse { animation: ar-pulse 2s ease-in-out infinite; }

  .ar-tab-btn { transition: all 0.2s; }
  .ar-tab-btn:hover { border-color: #444 !important; color: #ccc !important; }

  .ar-fix-card { transition: border-color 0.2s; }
  .ar-fix-card:hover { border-color: #2e2e2e !important; }

  .ar-bar { animation: ar-fillbar 1.2s ease forwards; }
`;

const TABS = ["Score Overview", "Competitor Matrix", "Sentiment", "Fix List"];

const PLATFORMS = ["Claude", "ChatGPT", "Perplexity", "Gemini", "Google AI", "Google Search"];

const PLATFORM_SCORES = [
  { platform: "Claude", score: 15, color: "#d97757" },
  { platform: "ChatGPT", score: 12, color: "#10a37f" },
  { platform: "Perplexity", score: 8, color: "#6e56cf" },
  { platform: "Gemini", score: 24, color: "#4285f4" },
  { platform: "Google AI", score: 31, color: "#fbbc04" },
  { platform: "Google Search", score: 22, color: "#34a853" },
];

const COMPETITORS = [
  { name: "Your Business", short: "Peak Performance", score: 19, color: "#e8ff4a", isYou: true },
  { name: "Alignment Chiropractic", short: "Alignment Chiro", score: 71, color: "#ff6b6b", isYou: false },
  { name: "Edmonton Spine Centre", short: "Spine Centre", score: 54, color: "#888", isYou: false },
  { name: "NorthWest Chiro", short: "NorthWest Chiro", score: 28, color: "#444", isYou: false },
];

const SENTIMENT_DATA = [
  {
    platform: "Claude",
    positive: 22, neutral: 53, negative: 25,
    note: "Reasons over indexed web content and cited sources. Mentions you occasionally but leans on competitors with richer structured profiles.",
  },
  {
    platform: "ChatGPT",
    positive: 20, neutral: 55, negative: 25,
    note: "Pulls from Bing + web crawl. Mentions your business but with limited context about services.",
  },
  {
    platform: "Perplexity",
    positive: 30, neutral: 45, negative: 25,
    note: "Community sources and recent reviews weighted heavily. One negative Reddit thread is influencing perception.",
  },
  {
    platform: "Gemini",
    positive: 35, neutral: 50, negative: 15,
    note: "Google Business Profile is being indexed. You get mentioned for some queries but not your strongest keywords.",
  },
  {
    platform: "Google AI",
    positive: 25, neutral: 50, negative: 25,
    note: "Your content is indexed but competing against 3 higher-authority sources. You need answer-first content to rank.",
  },
  {
    platform: "Google Search",
    positive: 28, neutral: 52, negative: 20,
    note: "You rank for branded terms but fall outside the top organic results for the service-and-city queries that actually convert.",
  },
];

const FIX_ITEMS = [
  {
    priority: 1,
    tag: "SEO + GEO",
    tagColor: "#10b981",
    title: "Fix critical on-page SEO and claim all business directories",
    why: "Your site has multiple Core Web Vitals failures (LCP 4.2s, CLS 0.28). Google and AI engines deprioritize slow, unstable sites. Simultaneously, you're listed on 1 of 4 key directories competitors use. Fixing SEO + claiming directories speeds up rankings across all channels.",
  },
  {
    priority: 2,
    tag: "AEO",
    tagColor: "#8b5cf6",
    title: "Restructure your Services page for featured snippets and voice search",
    why: "Your top keywords don't appear in featured snippets or voice search results. Restructuring with H2 questions, short answer paragraphs, and comparison tables triggers AI answer selection. This lifts AEO score and supports GEO visibility.",
  },
  {
    priority: 3,
    tag: "AIO + GEO",
    tagColor: "#3b82f6",
    title: "Create answer-first content for your top 12 search queries",
    why: "Google AI and ChatGPT both source from pages that answer the question immediately (not buried). Create a 'FAQ' or 'How-To' page for your 12 most-searched queries with direct 2–3 sentence answers at the top. This becomes citable source material for all AI platforms.",
  },
  {
    priority: 4,
    tag: "GEO",
    tagColor: "#e8ff4a",
    title: "Optimize your Bing Business Profile and claim your Google Business Profile completely",
    why: "ChatGPT pulls business info from Bing (not Google). Your Bing profile is missing 6 key fields. Gemini and Google AI pull from your Google Business Profile. Both are incomplete. Full optimization here is the fastest visibility win across all platforms.",
  },
  {
    priority: 5,
    tag: "AEO + GEO",
    tagColor: "#ffcc44",
    title: "Address the sentiment sources influencing your AI reputation",
    why: "Your sentiment score is dragged down by 2 one-star reviews on RateMDs and a single Reddit comment. While these are hard to remove, generating 3–5 recent 5-star reviews shifts the sentiment weight. Newer reviews carry more algorithmic weight in AI platforms.",
  },
  {
    priority: 6,
    tag: "AIO + GEO",
    tagColor: "#ffcc44",
    title: "Add LocalBusiness + FAQPage structured data to your website",
    why: "Structured data tells AI crawlers exactly what you do, where you are, and how to cite you. Without it, AI must guess from unstructured text — and often gets it wrong or skips you. This is foundational for all four TSO channels.",
  },
  {
    priority: 7,
    tag: "GEO",
    tagColor: "#888",
    title: "Build community signal on local Reddit and Facebook groups",
    why: "Perplexity and Google AI heavily weight community discussion. Genuine, helpful participation in r/YourCity and local Facebook groups (over 60–90 days) creates citable signals that all platforms recognize as local authority.",
  },
];

// ── Sub-components ──

function ScoreGauge({ score }: { score: number }) {
  const angle = (score / 100) * 180 - 90;
  const band =
    score <= 30 ? { label: "Invisible", color: "#ff4444" } :
    score <= 55 ? { label: "Weak Signal", color: "#ff8c44" } :
    score <= 75 ? { label: "Emerging", color: "#ffcc44" } :
    score <= 90 ? { label: "Established", color: "#88ff44" } :
    { label: "Dominant", color: "#e8ff4a" };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width="220" height="120" viewBox="0 0 220 120">
        {/* Track */}
        <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#1e1e1e" strokeWidth="12" strokeLinecap="round" />
        {/* Fill */}
        <path
          d={`M 20 110 A 90 90 0 0 1 ${110 + 90 * Math.cos((angle - 90) * Math.PI / 180)} ${110 + 90 * Math.sin((angle - 90) * Math.PI / 180)}`}
          fill="none" stroke={band.color} strokeWidth="12" strokeLinecap="round"
        />
        {/* Needle */}
        <line
          x1="110" y1="110"
          x2={110 + 70 * Math.cos((angle - 90) * Math.PI / 180)}
          y2={110 + 70 * Math.sin((angle - 90) * Math.PI / 180)}
          stroke="#e8ff4a" strokeWidth="2" strokeLinecap="round"
        />
        <circle cx="110" cy="110" r="5" fill="#e8ff4a" />
        {/* Labels */}
        <text x="16" y="124" fill="#444" fontSize="10" fontFamily="DM Sans, sans-serif">0</text>
        <text x="197" y="124" fill="#444" fontSize="10" fontFamily="DM Sans, sans-serif">100</text>
      </svg>
      <div style={{ textAlign: "center", marginTop: -16 }}>
        <div className="ar-serif" style={{ fontSize: 64, color: "#fff", lineHeight: 1 }}>{score}</div>
        <div className="ar-sans" style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>out of 100</div>
        <div style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 99,
          background: `${band.color}18`, border: `1px solid ${band.color}40`,
        }}>
          <span className="ar-sans" style={{ color: band.color, fontSize: 12, fontWeight: 500 }}>{band.label}</span>
        </div>
      </div>
    </div>
  );
}

function ScoreOverview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Top row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        <div style={{
          background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 16,
          padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          <ScoreGauge score={19} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="ar-sans" style={{ color: "#666", fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>Score by Platform</p>
          {PLATFORM_SCORES.map((p) => (
            <div key={p.platform} style={{
              background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 12, padding: "14px 18px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="ar-sans" style={{ color: "#ccc", fontSize: 13 }}>{p.platform}</span>
                <span className="ar-sans" style={{ color: p.color, fontSize: 13, fontWeight: 500 }}>{p.score}/100</span>
              </div>
              <div style={{ height: 4, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${p.score}%`, background: p.color,
                  borderRadius: 99, transition: "width 1.2s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Components */}
      <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 16, padding: "24px" }}>
        <p className="ar-sans" style={{ color: "#666", fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Score Components</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Brand mention rate", weight: 35, raw: 8, score: 8 },
            { label: "Citation source rate", weight: 20, raw: 3, score: 3 },
            { label: "Sentiment score", weight: 20, raw: 32, score: 32 },
            { label: "Platform coverage", weight: 15, raw: 50, score: 50 },
            { label: "Competitor displacement", weight: 10, raw: 15, score: 15 },
          ].map((c) => (
            <div key={c.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="ar-sans" style={{ color: "#888", fontSize: 13 }}>{c.label}</span>
                <div style={{ display: "flex", gap: 16 }}>
                  <span className="ar-sans" style={{ color: "#555", fontSize: 11 }}>weight: {c.weight}%</span>
                  <span className="ar-sans" style={{ color: "#e8ff4a", fontSize: 13, minWidth: 40, textAlign: "right" }}>{c.score}/100</span>
                </div>
              </div>
              <div style={{ height: 4, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${c.score}%`, background: "#e8ff4a", borderRadius: 99, transition: "width 1.2s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompetitorMatrix() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 16, padding: "24px" }}>
        <p className="ar-sans" style={{ color: "#666", fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Overall Visibility</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {COMPETITORS.map((c) => (
            <div key={c.name}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="ar-sans" style={{ fontSize: 14, color: c.isYou ? "#fff" : "#888", fontWeight: c.isYou ? 500 : 300 }}>
                    {c.short}
                  </span>
                  {c.isYou && (
                    <span className="ar-sans" style={{
                      fontSize: 10, color: "#000", background: "#e8ff4a",
                      padding: "2px 8px", borderRadius: 99, fontWeight: 500,
                    }}>You</span>
                  )}
                </div>
                <span className="ar-sans" style={{ color: c.color, fontSize: 14, fontWeight: c.isYou ? 500 : 300 }}>
                  {c.score}/100
                </span>
              </div>
              <div style={{ height: 8, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${c.score}%`, background: c.color,
                  borderRadius: 99, transition: "width 1.2s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform breakdown table */}
      <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 16, padding: "24px", overflowX: "auto" }}>
        <p className="ar-sans" style={{ color: "#666", fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Platform Breakdown</p>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr>
              <th className="ar-sans" style={{ color: "#555", fontSize: 11, fontWeight: 400, textAlign: "left", paddingBottom: 12, borderBottom: "1px solid #1e1e1e" }}>Business</th>
              {PLATFORMS.map((p) => (
                <th key={p} className="ar-sans" style={{ color: "#555", fontSize: 11, fontWeight: 400, textAlign: "center", paddingBottom: 12, borderBottom: "1px solid #1e1e1e" }}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: "Peak Performance", isYou: true, scores: [15, 12, 8, 24, 31, 22] },
              { name: "Alignment Chiro", isYou: false, scores: [78, 82, 74, 65, 63, 70] },
              { name: "Spine Centre", isYou: false, scores: [57, 61, 48, 52, 56, 59] },
              { name: "NorthWest Chiro", isYou: false, scores: [25, 22, 18, 35, 40, 31] },
            ].map((row, ri) => (
              <tr key={row.name} style={{ borderBottom: ri < 3 ? "1px solid #111" : "none" }}>
                <td className="ar-sans" style={{
                  fontSize: 13, color: row.isYou ? "#fff" : "#666",
                  fontWeight: row.isYou ? 500 : 300, padding: "14px 0",
                }}>
                  {row.name}{row.isYou ? " ★" : ""}
                </td>
                {row.scores.map((s, si) => {
                  const isLow = row.isYou && s < 30;
                  return (
                    <td key={si} style={{ textAlign: "center", padding: "14px 0" }}>
                      <span className="ar-sans" style={{
                        fontSize: 13,
                        color: row.isYou ? (isLow ? "#ff6b6b" : "#e8ff4a") : "#555",
                        fontWeight: row.isYou ? 500 : 300,
                      }}>{s}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        padding: "16px 20px", background: "rgba(255,107,107,0.06)",
        border: "1px solid rgba(255,107,107,0.15)", borderRadius: 12,
      }}>
        <p className="ar-sans" style={{ color: "#ff6b6b", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          <strong>Your TSO gap:</strong> Alignment Chiropractic appears in AI answers 4.7× more often across all six platforms. They're optimized for TSO — complete Bing + Google profiles, structured data, answer-first content, and directory listings. You're strong in one channel but underdeveloped across the others.
        </p>
      </div>
    </div>
  );
}

function SentimentBreakdown() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {SENTIMENT_DATA.map((s) => (
        <div key={s.platform} style={{
          background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span className="ar-sans" style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{s.platform}</span>
            <div style={{ display: "flex", gap: 12 }}>
              <span className="ar-sans" style={{ color: "#4caf50", fontSize: 12 }}>+{s.positive}%</span>
              <span className="ar-sans" style={{ color: "#888", fontSize: 12 }}>~{s.neutral}%</span>
              <span className="ar-sans" style={{ color: "#ff6b6b", fontSize: 12 }}>−{s.negative}%</span>
            </div>
          </div>
          {/* Stacked bar */}
          <div style={{ height: 8, borderRadius: 99, overflow: "hidden", display: "flex", marginBottom: 14 }}>
            <div style={{ width: `${s.positive}%`, background: "#4caf50", transition: "width 1.2s ease" }} />
            <div style={{ width: `${s.neutral}%`, background: "#333", transition: "width 1.2s ease" }} />
            <div style={{ width: `${s.negative}%`, background: "#ff6b6b", transition: "width 1.2s ease" }} />
          </div>
          <p className="ar-sans" style={{ color: "#666", fontSize: 13, fontWeight: 300, lineHeight: 1.6, margin: 0 }}>{s.note}</p>
        </div>
      ))}

      <div style={{
        padding: "16px 20px", background: "rgba(232,255,74,0.05)",
        border: "1px solid rgba(232,255,74,0.15)", borderRadius: 12,
      }}>
        <p className="ar-sans" style={{ color: "#aaa", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "#e8ff4a" }}>What's shaping your TSO visibility:</strong>{" "}
          Your Bing Business Profile is incomplete (GEO gap). Google Business Profile exists but missing key services (AIO/GEO gap). RateMDs: 3 reviews at 3.8★ (sentiment weight). One Reddit thread mentions competitors 2× and you 0× (AEO/GEO community signal gap).
        </p>
      </div>
    </div>
  );
}

function FixList() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {FIX_ITEMS.map((item) => (
        <div
          key={item.priority}
          className="ar-fix-card"
          style={{
            background: "#0d0d0d", border: "1px solid #1e1e1e",
            borderRadius: 14, overflow: "hidden",
          }}
        >
          <button
            onClick={() => setExpanded(expanded === item.priority ? null : item.priority)}
            style={{
              width: "100%", display: "flex", alignItems: "flex-start",
              gap: 14, padding: "18px 20px", textAlign: "left",
            }}
          >
            {/* Priority number */}
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span className="ar-serif" style={{ color: "#e8ff4a", fontSize: 14, lineHeight: 1 }}>{item.priority}</span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span className="ar-sans" style={{ color: "#fff", fontSize: 14, fontWeight: 400 }}>{item.title}</span>
                <span className="ar-sans" style={{
                  fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 99,
                  background: `${item.tagColor}15`, border: `1px solid ${item.tagColor}30`,
                  color: item.tagColor,
                }}>{item.tag}</span>
              </div>
            </div>

            <span style={{
              color: "#444", fontSize: 20, flexShrink: 0,
              transform: expanded === item.priority ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 0.3s", display: "block", lineHeight: 1,
            }}>+</span>
          </button>

          <div style={{
            overflow: "hidden",
            maxHeight: expanded === item.priority ? 300 : 0,
            transition: "max-height 0.4s ease",
          }}>
            <div style={{ padding: "0 20px 20px 62px" }}>
              <div style={{ background: "#111", borderRadius: 10, padding: "14px 16px" }}>
                <p className="ar-sans" style={{ color: "#555", fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Why This Works</p>
                <p className="ar-sans" style={{ color: "#888", fontSize: 13, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>{item.why}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* DFY callout — one mention, clean */}
      <div style={{
        marginTop: 8, padding: "20px 24px",
        background: "rgba(232,255,74,0.04)", border: "1px solid rgba(232,255,74,0.12)", borderRadius: 14,
      }}>
        <p className="ar-sans" style={{ color: "#888", fontSize: 14, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
          Ready to stop DIY and let experts handle your entire TSO strategy?{" "}
          <a href="/#pricing" style={{ color: "#e8ff4a", borderBottom: "1px solid rgba(232,255,74,0.3)" }}>
            AnswerRank AI Done-For-You TSO service
          </a>
          {" "}optimizes your website and business profile across all four platforms — SEO, AEO, AIO, and GEO — so you're cited more often, in more instances, on more platforms.
        </p>
      </div>
    </div>
  );
}

// ── Main ──

export default function ReportPreview() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{ minHeight: "100vh", background: "#080808", color: "#fff" }}>

        {/* NAV */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 32px",
          background: "rgba(8,8,8,0.92)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid #1a1a1a",
        }}>
          <a href="/" className="ar-serif" style={{ fontSize: 20, color: "#fff" }}>
            AnswerRank <span style={{ color: "#e8ff4a" }}>AI</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ar-sans" style={{ color: "#555", fontSize: 13 }}>Sample report</span>
            <a href="#" className="ar-sans" style={{
              background: "#e8ff4a", color: "#000", fontSize: 13, fontWeight: 500,
              padding: "8px 18px", borderRadius: 99,
            }}>Get My TSO Audit - $297</a>
          </div>
        </nav>

        <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 80px" }}>

          {/* Report header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div className="ar-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#e8ff4a" }} />
              <span className="ar-sans" style={{ color: "#555", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Sample Report — AnswerRank AI
              </span>
            </div>
            <h1 className="ar-serif" style={{ fontSize: "clamp(28px, 4vw, 44px)", color: "#fff", lineHeight: 1.1, marginBottom: 8 }}>
              AI Visibility Report
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 12 }}>
              {[
                { label: "Business", value: "Peak Performance Chiropractic" },
                { label: "Location", value: "Edmonton, AB" },
                { label: "Industry", value: "Chiropractic / Health" },
                { label: "Scanned", value: "April 2, 2026" },
              ].map((item) => (
                <div key={item.label}>
                  <span className="ar-sans" style={{ color: "#555", fontSize: 11 }}>{item.label} · </span>
                  <span className="ar-sans" style={{ color: "#888", fontSize: 12 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score banner */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.15)",
            borderRadius: 16, padding: "20px 28px", marginBottom: 32, flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="ar-serif" style={{ fontSize: 52, color: "#fff", lineHeight: 1 }}>19</span>
                <span className="ar-sans" style={{ color: "#555", fontSize: 14 }}>/100</span>
                <span className="ar-sans" style={{
                  fontSize: 12, color: "#ff6b6b", background: "rgba(255,107,107,0.12)",
                  border: "1px solid rgba(255,107,107,0.2)", padding: "3px 10px", borderRadius: 99, marginLeft: 4,
                }}>Invisible</span>
              </div>
              <p className="ar-sans" style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                Your top competitor scores 71/100 — appearing in AI answers 4.7× more often.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <a href="#" className="ar-sans" style={{
                background: "#e8ff4a", color: "#000", fontSize: 13, fontWeight: 500,
                padding: "10px 20px", borderRadius: 99,
              }}>Get My Real Report</a>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
            {TABS.map((tab, i) => (
              <button
                key={tab}
                className="ar-tab-btn ar-sans"
                onClick={() => setActiveTab(i)}
                style={{
                  padding: "8px 18px", borderRadius: 99, fontSize: 13,
                  border: `1px solid ${activeTab === i ? "#e8ff4a" : "#222"}`,
                  color: activeTab === i ? "#e8ff4a" : "#555",
                  background: activeTab === i ? "rgba(232,255,74,0.08)" : "transparent",
                  fontWeight: activeTab === i ? 500 : 300,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 0 && <ScoreOverview />}
          {activeTab === 1 && <CompetitorMatrix />}
          {activeTab === 2 && <SentimentBreakdown />}
          {activeTab === 3 && <FixList />}

          {/* Watermark / CTA */}
          <div style={{
            marginTop: 48, textAlign: "center", paddingTop: 40,
            borderTop: "1px solid #1a1a1a",
          }}>
            <p className="ar-sans" style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>
              This is a sample report with mock data. Your actual report will reflect your real business, competitors, and fix priorities.
            </p>
            <a href="/#pricing" className="ar-sans" style={{
              display: "inline-block", background: "#e8ff4a", color: "#000",
              fontSize: 15, fontWeight: 500, padding: "14px 32px", borderRadius: 99,
            }}>Get My TSO Audit - $297</a>
            <p className="ar-sans" style={{ color: "#444", fontSize: 12, marginTop: 12 }}>
              Satisfaction guaranteed — 5+ actionable fixes or full refund
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
