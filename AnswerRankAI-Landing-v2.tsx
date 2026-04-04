import { useState, useEffect, useRef } from "react";

// AnswerRank AI — Landing Page v2.1
// Changes from v2:
//   - Hero: loss-based fear framing
//   - Risk reversal: Hormozi-style satisfaction guarantee on $97
//   - DFY: outcome-based (no task list on main page)
//   - DFY: scarcity indicator (3 of 15 spots)
//   - Stats: faces on numbers, urgency without fear
//   - "The Window" callout section between stats and how it works
//   - Report preview link added to $97 card + step 3

const PLATFORMS = ["ChatGPT", "Perplexity", "Gemini", "Google AI"];

const PRICING = [
  {
    name: "One-Time Audit",
    price: "$97",
    period: "one time",
    description: "Know exactly where you stand. Full AI Visibility Score, competitor breakdown, and Fix List — yours to keep.",
    features: [
      "AI Visibility Score (0–100)",
      "Scanned across all 4 AI platforms",
      "Up to 3 competitor comparisons",
      "Sentiment analysis per platform",
      "Prioritized Fix List (5–10 items)",
      "Downloadable PDF report",
    ],
    cta: "Get My Score",
    highlight: false,
    badge: null,
    guarantee: true,
  },
  {
    name: "Monthly Monitoring",
    price: "$79",
    period: "per month",
    description: "Track your score every month. See what's improving, what's not, and get an updated Fix List as the AI landscape shifts.",
    features: [
      "Everything in One-Time Audit",
      "Monthly automated re-scan",
      "Score trend line over time",
      "Updated Fix List each month",
      "Monthly PDF report to your inbox",
      "Cancel anytime",
    ],
    cta: "Start Monitoring",
    highlight: true,
    badge: "Most Popular",
    guarantee: false,
  },
  {
    name: "Done-For-You",
    price: "$997",
    period: "per month",
    description: "We handle everything on your Fix List — so you stop losing ground while your competitors pull ahead.",
    features: [
      "Everything in Monthly Monitoring",
      "Monthly 30-min strategy call",
      "Full execution of your Fix List",
      "AI presence built and maintained",
      "Score improvement or we keep working",
      "Limited to 15 clients",
    ],
    cta: "Book a Discovery Call",
    highlight: false,
    badge: "Limited Availability",
    guarantee: false,
  },
];

const FAQS = [
  {
    q: "What is AI Visibility and why does it matter?",
    a: "When someone asks ChatGPT, Perplexity, or Google AI who to hire in your industry, the AI generates a single answer. Your business is either in that answer or it isn't — there is no page 2. AI Visibility is how consistently and positively your business appears in those answers. It's becoming the most important discovery channel for local businesses.",
  },
  {
    q: "How is this different from SEO?",
    a: "Traditional SEO gets you ranked in a list of links. Someone still has to click. GEO — Generative Engine Optimization — gets your business cited directly inside AI-generated answers before the user sees any links. AI-referred traffic also converts at 4.4x higher than traditional search because users arrive with strong purchase intent.",
  },
  {
    q: "Which AI platforms do you scan?",
    a: "We scan all four major platforms: ChatGPT, Perplexity, Gemini, and Google AI Overviews. Each platform weighs different signals, so a business can be invisible on one and well-represented on another. You see the full picture broken down by platform.",
  },
  {
    q: "How is the score calculated?",
    a: "Your AI Visibility Score (0–100) is built from five components: brand mention rate, citation source rate, sentiment, platform coverage, and competitor displacement. Each prompt runs three times per platform and results are averaged to account for variability. We disclose our methodology openly.",
  },
  {
    q: "What is the Fix List?",
    a: "After scoring, AnswerRank AI generates 5–10 specific, actionable items that will move your score. Each item explains why it works. You can execute these yourself or have us handle them through the Done-For-You service.",
  },
  {
    q: "Is the Done-For-You service really limited?",
    a: "Yes. We cap Done-For-You at 15 clients to maintain quality. When spots are full, new clients go on a waitlist. If you're interested, book a discovery call sooner rather than later.",
  },
  {
    q: "I run a marketing agency. Is there a partner program?",
    a: "Yes — an agency partner program is in development. If you're an agency interested in offering GEO services to your clients, book a discovery call and mention it. We're building the partner structure now and prioritizing early conversations.",
  },
];

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  a { text-decoration: none; color: inherit; }
  button { background: none; border: none; cursor: pointer; }

  .ar-serif { font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif; }
  .ar-sans { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
  .ar-italic { font-style: italic; }

  @keyframes ar-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes ar-fadeup {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ar-ticker {
    0% { transform: translateY(0); }
    25% { transform: translateY(-1.4em); }
    50% { transform: translateY(-2.8em); }
    75% { transform: translateY(-4.2em); }
    100% { transform: translateY(0); }
  }

  .ar-pulse { animation: ar-pulse 2s ease-in-out infinite; }
  .ar-fade-1 { animation: ar-fadeup 0.7s ease forwards; }
  .ar-fade-2 { animation: ar-fadeup 0.7s ease 0.15s forwards; opacity: 0; }
  .ar-fade-3 { animation: ar-fadeup 0.7s ease 0.3s forwards; opacity: 0; }
  .ar-fade-4 { animation: ar-fadeup 0.7s ease 0.45s forwards; opacity: 0; }

  .ar-ticker-wrap { overflow: hidden; height: 1.2em; display: inline-block; vertical-align: bottom; }
  .ar-ticker-inner { animation: ar-ticker 8s ease-in-out infinite; line-height: 1.2em; }

  .ar-card:hover { border-color: #2e2e2e !important; }
  .ar-nav-link:hover { color: #fff !important; }
  .ar-footer-link:hover { color: #fff !important; }

  .ar-guarantee-badge {
    display: flex; align-items: flex-start; gap: 10px;
    background: rgba(232,255,74,0.06); border: 1px solid rgba(232,255,74,0.15);
    border-radius: 12px; padding: 12px 14px; margin-top: 16px;
  }
`;

function useCounter(target: number, duration: number = 1600, start: boolean = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const raf = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, duration, start]);
  return count;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Sub-components ──────────────────────────────────────────

function ScanDemo() {
  const [active, setActive] = useState(0);
  const scores = [14, 67, 38, 9];
  const names = ["Your Business", "Competitor A", "Competitor B", "Competitor C"];
  const colors = ["#e8ff4a", "#ff6b6b", "#444", "#2a2a2a"];

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % 4), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background: "#0a0a0a", border: "1px solid #1e1e1e",
      borderRadius: 16, padding: "28px 32px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="ar-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#e8ff4a" }} />
          <span className="ar-sans" style={{ color: "#888", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Live Scan
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PLATFORMS.map((p, i) => (
            <span key={p} className="ar-sans" style={{
              padding: "4px 10px", borderRadius: 99, fontSize: 10, fontWeight: 500,
              transition: "all 0.5s",
              background: active === i ? "#e8ff4a" : "#1a1a1a",
              color: active === i ? "#000" : "#555",
            }}>{p}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {names.map((name, i) => (
          <div key={name}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="ar-sans" style={{ fontSize: 13, color: i === 0 ? "#fff" : "#666", fontWeight: i === 0 ? 500 : 300 }}>
                {name}
              </span>
              <span className="ar-sans" style={{ fontSize: 13, color: colors[i], fontWeight: i === 0 ? 500 : 300 }}>
                {scores[i]}/100
              </span>
            </div>
            <div style={{ height: 6, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${scores[i]}%`, background: colors[i], borderRadius: 99, transition: "width 1s ease" }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 24, padding: "14px 16px",
        background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12,
      }}>
        <p className="ar-sans" style={{ color: "#ff6b6b", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          <strong>Your top competitor scores 67/100.</strong> They appear in 73% of AI responses when customers search for your services in your city. That gap is growing every month.
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, suffix, label, context, start }: { value: number; suffix: string; label: string; context: string; start: boolean }) {
  const count = useCounter(value, 1800, start);
  return (
    <div style={{ textAlign: "center" }}>
      <div className="ar-serif" style={{ fontSize: 48, color: "#fff", lineHeight: 1, marginBottom: 8 }}>
        {count}{suffix}
      </div>
      <div className="ar-sans" style={{ color: "#ccc", fontSize: 13, fontWeight: 400, lineHeight: 1.5, marginBottom: 6 }}>{label}</div>
      <div className="ar-sans" style={{ color: "#555", fontSize: 12, fontWeight: 300, lineHeight: 1.5 }}>{context}</div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #1e1e1e" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "20px 0", textAlign: "left" }}
      >
        <span className="ar-sans" style={{ color: "#fff", fontSize: 15, fontWeight: 400, lineHeight: 1.5 }}>{q}</span>
        <span style={{
          color: "#e8ff4a", fontSize: 24, flexShrink: 0, marginTop: 0,
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 0.3s",
          display: "block", lineHeight: 1,
        }}>+</span>
      </button>
      <div style={{ overflow: "hidden", maxHeight: open ? 300 : 0, transition: "max-height 0.4s ease", paddingBottom: open ? 20 : 0 }}>
        <p className="ar-sans" style={{ color: "#888", fontSize: 14, fontWeight: 300, lineHeight: 1.75, margin: 0 }}>{a}</p>
      </div>
    </div>
  );
}

function GuaranteeBadge() {
  return (
    <div className="ar-guarantee-badge">
      <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🛡</div>
      <div>
        <div className="ar-sans" style={{ color: "#e8ff4a", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
          Satisfaction Guarantee
        </div>
        <p className="ar-sans" style={{ color: "#888", fontSize: 12, fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
          If your report doesn't surface at least 5 specific, actionable fixes you can act on immediately — we'll refund every dollar. No questions. No forms.
        </p>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function AnswerRankLanding() {
  const { ref: statsRef, inView: statsInView } = useInView();

  // Rotating industries for hero ticker
  const industries = ["a plumber", "a dentist", "a lawyer", "a contractor"];

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{ minHeight: "100vh", background: "#080808", color: "#fff", overflowX: "hidden" }}>

        {/* NAV */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 48px",
          background: "rgba(8,8,8,0.88)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid #1a1a1a",
        }}>
          <div className="ar-serif" style={{ fontSize: 22, color: "#fff" }}>
            AnswerRank <span style={{ color: "#e8ff4a" }}>AI</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            {[["How It Works", "#how-it-works"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([label, href]) => (
              <a key={label} href={href} className="ar-sans ar-nav-link"
                style={{ color: "#888", fontSize: 14, fontWeight: 300, transition: "color 0.2s" }}>
                {label}
              </a>
            ))}
          </div>
          <a href="#pricing" className="ar-sans" style={{
            background: "#e8ff4a", color: "#000", fontSize: 14, fontWeight: 500,
            padding: "10px 22px", borderRadius: 99,
          }}>Get My Score</a>
        </nav>

        {/* HERO */}
        <section style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "140px 24px 80px", position: "relative", overflow: "hidden", textAlign: "center",
        }}>
          {/* Grid bg */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
            backgroundImage: "linear-gradient(#e8ff4a 1px, transparent 1px), linear-gradient(90deg, #e8ff4a 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
          <div style={{
            position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
            width: 700, height: 700, borderRadius: "50%", pointerEvents: "none",
            background: "radial-gradient(circle, rgba(232,255,74,0.07) 0%, transparent 70%)",
          }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 900, width: "100%" }}>

            {/* Eyebrow — urgency not brand */}
            <div className="ar-fade-1" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)",
              borderRadius: 99, padding: "6px 16px", marginBottom: 32,
            }}>
              <div className="ar-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6b6b" }} />
              <span className="ar-sans" style={{ color: "#ff6b6b", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                This is already happening — right now, in your city
              </span>
            </div>

            {/* H1 — loss framing */}
            <h1 className="ar-serif ar-fade-1" style={{
              fontSize: "clamp(38px, 6.5vw, 74px)", lineHeight: 1.06,
              color: "#fff", letterSpacing: "-0.02em", marginBottom: 20,
            }}>
              Someone just asked ChatGPT<br />
              for{" "}
              <span style={{ display: "inline" }}>
                <span className="ar-ticker-wrap">
                  <span className="ar-ticker-inner ar-serif ar-italic" style={{ color: "#e8ff4a", display: "block" }}>
                    {industries.map(i => <span key={i} style={{ display: "block" }}>{i}</span>)}
                  </span>
                </span>
              </span>
              {" "}in your city.<br />
              <span style={{ color: "#666" }}>Your competitor got the call.</span>
            </h1>

            {/* Sub — consequence, not feature */}
            <p className="ar-sans ar-fade-2" style={{
              color: "#888", fontSize: 17, fontWeight: 300,
              maxWidth: 560, margin: "0 auto 16px", lineHeight: 1.75,
            }}>
              AI is now the first stop for millions of buying decisions. Businesses that show up in those answers are taking work that used to find you through Google. That gap grows every week you don't act.
            </p>

            <p className="ar-sans ar-fade-2" style={{
              color: "#e8ff4a", fontSize: 14, fontWeight: 400,
              maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.6,
            }}>
              Find out your AI Visibility Score across ChatGPT, Perplexity, Gemini, and Google AI — and exactly what's costing you.
            </p>

            {/* CTAs */}
            <div className="ar-fade-3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
              <a href="#pricing" className="ar-sans" style={{
                background: "#e8ff4a", color: "#000", fontSize: 16, fontWeight: 500,
                padding: "16px 32px", borderRadius: 99,
              }}>See My Score — $97</a>
              <a href="/report-preview" className="ar-sans" style={{
                border: "1px solid #2a2a2a", color: "#aaa", fontSize: 16, fontWeight: 300,
                padding: "16px 32px", borderRadius: 99,
              }}>See a Sample Report</a>
            </div>

            {/* Demo */}
            <div className="ar-fade-4" style={{ maxWidth: 620, margin: "0 auto" }}>
              <ScanDemo />
            </div>
          </div>
        </section>

        {/* STATS */}
        <section ref={statsRef} style={{ padding: "80px 24px", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 40 }}>
            <StatCard
              value={527} suffix="%"
              label="AI-referred web sessions grew in 2025"
              context="That traffic is going to businesses already showing up in AI answers."
              start={statsInView}
            />
            <StatCard
              value={60} suffix="%"
              label="of searches now start with an AI answer"
              context="Before anyone sees a link — your business either appears or doesn't."
              start={statsInView}
            />
            <StatCard
              value={4} suffix="×"
              label="higher conversion from AI-referred visitors"
              context="They arrive already sold. Because AI already recommended someone."
              start={statsInView}
            />
            <StatCard
              value={16} suffix="%"
              label="of businesses tracking AI visibility today"
              context="The other 84% don't know what they're losing — yet."
              start={statsInView}
            />
          </div>
        </section>

        {/* THE WINDOW — urgency callout */}
        <section style={{ padding: "72px 24px", background: "#0a0a0a" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <p className="ar-sans" style={{ color: "#e8ff4a", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
              The window is open — but not for long
            </p>
            <h2 className="ar-serif" style={{ fontSize: "clamp(28px, 4vw, 44px)", color: "#fff", lineHeight: 1.15, marginBottom: 20 }}>
              In 2010, if you weren't on Google,<br />
              <span className="ar-italic" style={{ color: "#888" }}>you were invisible.</span>
            </h2>
            <p className="ar-sans" style={{ color: "#888", fontSize: 15, fontWeight: 300, lineHeight: 1.8, maxWidth: 580, margin: "0 auto 20px" }}>
              We are in that exact same moment with AI — right now. Businesses building AI visibility today are compounding an advantage that will be expensive and slow to overcome in 12 months. The ones who wait are funding someone else's lead.
            </p>
            <p className="ar-sans" style={{ color: "#666", fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>
              Gartner projects traditional search volume drops 25% by end of 2026. That traffic doesn't disappear — it moves to AI. The question is whose name comes up when it does.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ padding: "96px 24px", borderTop: "1px solid #1a1a1a" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ marginBottom: 56 }}>
              <p className="ar-sans" style={{ color: "#e8ff4a", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>How It Works</p>
              <h2 className="ar-serif" style={{ fontSize: "clamp(30px, 4vw, 48px)", color: "#fff", lineHeight: 1.1, maxWidth: 480 }}>
                Four platforms. One score. A clear path forward.
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 48 }}>
              {[
                {
                  step: "01",
                  title: "Enter your business",
                  body: "Tell us your business name, city, industry, and up to 3 competitors. Takes 90 seconds.",
                },
                {
                  step: "02",
                  title: "We run the scan",
                  body: "AnswerRank AI queries all 4 AI platforms with 15–20 prompts your customers actually use. Each prompt runs three times to account for AI variability.",
                },
                {
                  step: "03",
                  title: "You get your score and fix list",
                  body: "AI Visibility Score (0–100), platform-by-platform breakdown, competitor comparison, and a prioritized list of exactly what to fix.",
                  link: { label: "See a sample report →", href: "/report-preview" },
                },
              ].map((item) => (
                <div key={item.step} className="ar-card" style={{
                  background: "#0d0d0d", border: "1px solid #1e1e1e",
                  borderRadius: 16, padding: "28px 28px 32px", transition: "border-color 0.2s",
                }}>
                  <div className="ar-serif" style={{ fontSize: 56, color: "rgba(232,255,74,0.15)", lineHeight: 1, marginBottom: 16 }}>{item.step}</div>
                  <h3 className="ar-sans" style={{ color: "#fff", fontSize: 16, fontWeight: 500, marginBottom: 10 }}>{item.title}</h3>
                  <p className="ar-sans" style={{ color: "#666", fontSize: 14, fontWeight: 300, lineHeight: 1.7, marginBottom: item.link ? 12 : 0 }}>{item.body}</p>
                  {item.link && (
                    <a href={item.link.href} className="ar-sans" style={{ color: "#e8ff4a", fontSize: 13, fontWeight: 400 }}>
                      {item.link.label}
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <span className="ar-sans" style={{ color: "#555", fontSize: 13, marginRight: 4 }}>Scanned platforms:</span>
              {PLATFORMS.map((p) => (
                <div key={p} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#111", border: "1px solid #1e1e1e", borderRadius: 99, padding: "7px 16px",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#e8ff4a" }} />
                  <span className="ar-sans" style={{ color: "#fff", fontSize: 13 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SCORE BREAKDOWN */}
        <section style={{ padding: "96px 24px", background: "#0a0a0a", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <p className="ar-sans" style={{ color: "#e8ff4a", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>The Score</p>
              <h2 className="ar-serif" style={{ fontSize: "clamp(30px, 4vw, 48px)", color: "#fff", lineHeight: 1.1, marginBottom: 20 }}>
                Not a vanity metric. A diagnostic.
              </h2>
              <p className="ar-sans" style={{ color: "#888", fontSize: 15, fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
                Your AI Visibility Score is built from five components that reflect how AI platforms actually decide who to recommend.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "Brand mention rate", weight: "35%", desc: "How often you're named in relevant queries" },
                  { label: "Citation source rate", weight: "20%", desc: "How often your content is used as AI's source" },
                  { label: "Sentiment score", weight: "20%", desc: "Positive vs. neutral vs. negative framing" },
                  { label: "Platform coverage", weight: "15%", desc: "How many of the 4 platforms mention you" },
                  { label: "Competitor displacement", weight: "10%", desc: "How often competitors appear instead of you" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{
                      background: "rgba(232,255,74,0.08)", border: "1px solid rgba(232,255,74,0.2)",
                      borderRadius: 8, padding: "4px 10px", flexShrink: 0,
                    }}>
                      <span className="ar-sans" style={{ color: "#e8ff4a", fontSize: 12, fontWeight: 500 }}>{item.weight}</span>
                    </div>
                    <div>
                      <div className="ar-sans" style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{item.label}</div>
                      <div className="ar-sans" style={{ color: "#555", fontSize: 12, fontWeight: 300 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { range: "0–30", label: "Invisible", desc: "Not appearing in AI answers at all", color: "#ff4444" },
                { range: "31–55", label: "Weak Signal", desc: "Mentioned occasionally, inconsistently", color: "#ff8c44" },
                { range: "56–75", label: "Emerging", desc: "Showing up on some platforms, room to grow", color: "#ffcc44" },
                { range: "76–90", label: "Established", desc: "Strong presence across most platforms", color: "#88ff44" },
                { range: "91–100", label: "Dominant", desc: "Consistently cited, positive sentiment", color: "#e8ff4a" },
              ].map((band) => (
                <div key={band.range} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 12, padding: "14px 18px",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${band.color}18`, border: `1px solid ${band.color}35`,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: band.color }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span className="ar-sans" style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{band.label}</span>
                      <span className="ar-sans" style={{ color: "#444", fontSize: 11 }}>{band.range}</span>
                    </div>
                    <p className="ar-sans" style={{ color: "#555", fontSize: 12, fontWeight: 300 }}>{band.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" style={{ padding: "96px 24px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <p className="ar-sans" style={{ color: "#e8ff4a", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Pricing</p>
            <h2 className="ar-serif" style={{ fontSize: "clamp(30px, 4vw, 48px)", color: "#fff", lineHeight: 1.1, maxWidth: 480, marginBottom: 16 }}>
              Start with a score. Scale from there.
            </h2>
            <p className="ar-sans" style={{ color: "#666", fontSize: 15, fontWeight: 300, maxWidth: 520, lineHeight: 1.7, marginBottom: 48 }}>
              If you want expert help executing your Fix List, a Done-For-You service is available — limited to 15 clients. You'll see it below. It is not the main pitch. The audit is.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {PRICING.map((tier) => (
                <div key={tier.name} style={{
                  position: "relative",
                  background: tier.highlight ? "#e8ff4a" : "#0d0d0d",
                  border: tier.highlight ? "none" : "1px solid #1e1e1e",
                  borderRadius: 20, padding: "32px 28px 28px",
                  display: "flex", flexDirection: "column",
                }}>
                  {tier.badge && (
                    <div className="ar-sans" style={{
                      position: "absolute", top: -13, left: 24,
                      background: tier.highlight ? "#000" : "#e8ff4a",
                      color: tier.highlight ? "#e8ff4a" : "#000",
                      fontSize: 11, fontWeight: 500, padding: "4px 12px", borderRadius: 99,
                    }}>{tier.badge}</div>
                  )}

                  <p className="ar-sans" style={{
                    fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
                    marginBottom: 12, color: tier.highlight ? "rgba(0,0,0,0.45)" : "#555",
                  }}>{tier.name}</p>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                    <span className="ar-serif" style={{ fontSize: 52, color: tier.highlight ? "#000" : "#fff", lineHeight: 1 }}>{tier.price}</span>
                    <span className="ar-sans" style={{ fontSize: 13, color: tier.highlight ? "rgba(0,0,0,0.45)" : "#555" }}>/{tier.period}</span>
                  </div>

                  <p className="ar-sans" style={{
                    fontSize: 13, fontWeight: 300, lineHeight: 1.65, marginBottom: 24,
                    color: tier.highlight ? "rgba(0,0,0,0.65)" : "#666",
                  }}>{tier.description}</p>

                  <ul style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, listStyle: "none" }}>
                    {tier.features.map((f) => (
                      <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ color: tier.highlight ? "#000" : "#e8ff4a", fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span className="ar-sans" style={{ fontSize: 13, fontWeight: 300, color: tier.highlight ? "rgba(0,0,0,0.75)" : "#888" }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <a href={tier.name === "Done-For-You" ? "#dfy" : "#"} className="ar-sans" style={{
                    display: "block", textAlign: "center", fontWeight: 500, fontSize: 14,
                    padding: "14px", borderRadius: 99,
                    background: tier.highlight ? "#000" : "#e8ff4a",
                    color: tier.highlight ? "#e8ff4a" : "#000",
                  }}>{tier.cta}</a>

                  {/* Guarantee — $97 only */}
                  {tier.guarantee && <GuaranteeBadge />}

                  {/* Sample report link — $97 only */}
                  {tier.name === "One-Time Audit" && (
                    <p className="ar-sans" style={{ textAlign: "center", marginTop: 12 }}>
                      <a href="/report-preview" style={{ color: "#555", fontSize: 12, borderBottom: "1px solid #333" }}>
                        See a sample report first →
                      </a>
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p className="ar-sans" style={{ textAlign: "center", color: "#555", fontSize: 13, marginTop: 20 }}>
              Monthly Monitoring also available annually at $699/year — saves $250.
            </p>
          </div>
        </section>

        {/* DFY — outcomes, not tasks */}
        <section id="dfy" style={{ padding: "96px 24px", background: "#0a0a0a", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
            <p className="ar-sans" style={{ color: "#e8ff4a", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Done-For-You</p>
            <h2 className="ar-serif" style={{ fontSize: "clamp(30px, 4vw, 48px)", color: "#fff", lineHeight: 1.1, marginBottom: 20 }}>
              Stop losing ground while<br />
              <span className="ar-italic" style={{ color: "#e8ff4a" }}>your competitors pull ahead.</span>
            </h2>
            <p className="ar-sans" style={{ color: "#888", fontSize: 15, fontWeight: 300, lineHeight: 1.7, maxWidth: 500, margin: "0 auto 32px" }}>
              You've seen your score. You know what's at stake. Our Done-For-You service means we execute — so your AI presence grows every month without taking your attention off running your business.
            </p>

            {/* Outcomes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480, margin: "0 auto 40px", textAlign: "left" }}>
              {[
                "Your business starts appearing in AI answers",
                "Your competitor stops getting the calls that should be yours",
                "Every month your score moves — or we keep working",
                "You focus on your business. We handle the AI layer.",
              ].map((outcome) => (
                <div key={outcome} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "rgba(232,255,74,0.12)",
                    border: "1px solid rgba(232,255,74,0.3)", flexShrink: 0, marginTop: 2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ color: "#e8ff4a", fontSize: 11 }}>✓</span>
                  </div>
                  <span className="ar-sans" style={{ color: "#ccc", fontSize: 15, fontWeight: 300, lineHeight: 1.6 }}>{outcome}</span>
                </div>
              ))}
            </div>

            {/* Scarcity */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.15)",
              borderRadius: 99, padding: "8px 20px", marginBottom: 32,
            }}>
              <div className="ar-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6b6b", flexShrink: 0 }} />
              <span className="ar-sans" style={{ color: "#ff6b6b", fontSize: 13, fontWeight: 400 }}>
                Currently 3 of 15 spots available
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <a href="#" className="ar-sans" style={{
                display: "inline-block", background: "#e8ff4a", color: "#000",
                fontSize: 15, fontWeight: 500, padding: "16px 36px", borderRadius: 99,
              }}>Book a Free Discovery Call</a>
            </div>
            <p className="ar-sans" style={{ color: "#444", fontSize: 12 }}>
              $997/month · Month-to-month · Cancel anytime · Spots are approximate — check availability on the call
            </p>
          </div>
        </section>

        {/* AGENCY */}
        <section style={{ padding: "96px 24px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{
              background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 24,
              padding: "56px 64px", display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 64, alignItems: "center", position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, right: 0, width: 350, height: 350, pointerEvents: "none",
                background: "radial-gradient(circle, rgba(232,255,74,0.04) 0%, transparent 70%)",
              }} />
              <div>
                <p className="ar-sans" style={{ color: "#e8ff4a", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>For Agencies</p>
                <h2 className="ar-serif" style={{ fontSize: "clamp(28px, 3vw, 40px)", color: "#fff", lineHeight: 1.15, marginBottom: 16 }}>
                  Running a marketing agency? Let's talk.
                </h2>
                <p className="ar-sans" style={{ color: "#888", fontSize: 14, fontWeight: 300, lineHeight: 1.75, marginBottom: 16 }}>
                  GEO is the most defensible upsell available to agencies right now. Your clients' SEO isn't going away — but the search behavior that feeds it is shrinking. Every agency that adds GEO earns a new line item with zero competition from the big SEO platforms.
                </p>
                <p className="ar-sans" style={{ color: "#666", fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}>
                  An agency partner program is in development. Book a call and mention it — we're having those conversations now.
                </p>
              </div>
              <div>
                {[
                  { label: "New monthly revenue per client", value: "$97–$297" },
                  { label: "Hours of setup per client", value: "< 5 min" },
                  { label: "Competing SMB GEO tools at this price", value: "Zero" },
                  { label: "Businesses tracking AI visibility today", value: "16%" },
                ].map((stat, i, arr) => (
                  <div key={stat.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    paddingBottom: i < arr.length - 1 ? 20 : 0,
                    marginBottom: i < arr.length - 1 ? 20 : 0,
                    borderBottom: i < arr.length - 1 ? "1px solid #1a1a1a" : "none",
                  }}>
                    <span className="ar-sans" style={{ color: "#666", fontSize: 13, fontWeight: 300 }}>{stat.label}</span>
                    <span className="ar-serif" style={{ color: "#fff", fontSize: 28 }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ padding: "96px 24px", background: "#0a0a0a", borderTop: "1px solid #1a1a1a" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <p className="ar-sans" style={{ color: "#e8ff4a", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>FAQ</p>
            <h2 className="ar-serif" style={{ fontSize: "clamp(32px, 4vw, 48px)", color: "#fff", lineHeight: 1.1, marginBottom: 48 }}>
              Straight answers.
            </h2>
            {FAQS.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: "120px 24px", position: "relative", overflow: "hidden", textAlign: "center" }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
            backgroundImage: "linear-gradient(#e8ff4a 1px, transparent 1px), linear-gradient(90deg, #e8ff4a 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: 800, height: 400, pointerEvents: "none",
            background: "radial-gradient(ellipse, rgba(232,255,74,0.05) 0%, transparent 65%)",
          }} />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto" }}>
            <h2 className="ar-serif" style={{ fontSize: "clamp(38px, 6vw, 72px)", color: "#fff", lineHeight: 1.06, marginBottom: 24 }}>
              Find out where you stand.<br />
              <span className="ar-italic" style={{ color: "#e8ff4a" }}>Before your competitors do.</span>
            </h2>
            <p className="ar-sans" style={{ color: "#888", fontSize: 17, fontWeight: 300, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 16px" }}>
              One audit. Four AI platforms. A score, a competitor breakdown, and a clear list of what to fix.
            </p>
            <p className="ar-sans" style={{ color: "#666", fontSize: 14, fontWeight: 300, maxWidth: 420, margin: "0 auto 40px", lineHeight: 1.6 }}>
              If we don't surface at least 5 actionable fixes, you pay nothing. That's the guarantee.
            </p>
            <a href="#pricing" className="ar-sans" style={{
              display: "inline-block", background: "#e8ff4a", color: "#000",
              fontSize: 17, fontWeight: 500, padding: "18px 44px", borderRadius: 99,
            }}>Get My AI Visibility Score — $97</a>
            <p className="ar-sans" style={{ color: "#444", fontSize: 13, marginTop: 16 }}>
              One-time payment · PDF report included · Satisfaction guaranteed
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid #1a1a1a", padding: "40px 48px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div className="ar-serif" style={{ fontSize: 20, color: "#fff" }}>
              AnswerRank <span style={{ color: "#e8ff4a" }}>AI</span>
            </div>
            <p className="ar-sans" style={{ color: "#444", fontSize: 13, fontWeight: 300 }}>© 2026 AnswerRank AI · Built by ICC</p>
            <div style={{ display: "flex", gap: 24 }}>
              {["Privacy", "Terms", "Contact"].map((item) => (
                <a key={item} href="#" className="ar-sans ar-footer-link"
                  style={{ color: "#555", fontSize: 13, transition: "color 0.2s" }}>{item}</a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
