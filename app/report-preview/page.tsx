'use client';

export default function ReportPreview() {
  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#fff", padding: "80px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#e8ff4a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
            Sample TSO Audit Report
          </div>
          <h1 style={{ fontSize: 48, color: "#fff", lineHeight: 1.2, marginBottom: 16 }}>
            TechStartup Solutions
          </h1>
          <p style={{ fontSize: 15, color: "#888", maxWidth: 560, margin: "0 auto" }}>
            This is an example of what your TSO Audit report will look like. You'll see your AI Visibility Score, platform-by-platform breakdown, and specific recommendations.
          </p>
        </div>

        {/* Score Card */}
        <div style={{
          background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 20, padding: 40, marginBottom: 40,
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center"
        }}>
          <div>
            <p style={{ fontSize: 13, color: "#e8ff4a", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              Your AI Visibility Score
            </p>
            <div style={{ fontSize: 72, color: "#fff", fontWeight: 500, lineHeight: 1, marginBottom: 16 }}>
              67<span style={{ fontSize: 40, color: "#888" }}>/100</span>
            </div>
            <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7 }}>
              Your business shows up in roughly 2 out of 3 AI-generated answers. This is stronger than your industry average, but there's room to grow across all platforms.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { platform: "ChatGPT", score: 72, color: "#10b981" },
              { platform: "Perplexity", score: 65, color: "#8b5cf6" },
              { platform: "Google AI", score: 64, color: "#3b82f6" },
              { platform: "Gemini", score: 58, color: "#e8ff4a" },
            ].map((item) => (
              <div key={item.platform}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{item.platform}</span>
                  <span style={{ fontSize: 13, color: item.color, fontWeight: 500 }}>{item.score}/100</span>
                </div>
                <div style={{ height: 6, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.score}%`, background: item.color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Comparison */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 13, color: "#e8ff4a", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24 }}>
            How You Compare
          </p>
          <div style={{
            background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 16, padding: 24,
            display: "flex", flexDirection: "column", gap: 16
          }}>
            {[
              { name: "Your Business", score: 67, color: "#e8ff4a" },
              { name: "Competitor A", score: 58, color: "#888" },
              { name: "Competitor B", score: 42, color: "#666" },
            ].map((item) => (
              <div key={item.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontSize: 14, color: item.color, fontWeight: 500 }}>{item.score}</span>
                </div>
                <div style={{ height: 8, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.score}%`, background: item.color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Findings */}
        <div style={{
          background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 16, padding: 32, marginBottom: 40
        }}>
          <p style={{ fontSize: 13, color: "#e8ff4a", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24 }}>
            Key Findings
          </p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              "You're cited as a source in 58% of AI responses (industry avg: 41%)",
              "Your business appears in featured snippets 6x more often than competitors",
              "ChatGPT mentions you for 5 of 12 key search terms tracked",
              "Perplexity mentions you but ranks you 3rd behind competitors",
            ].map((item, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ color: "#e8ff4a", marginTop: 2, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: "#ccc", lineHeight: 1.6 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>
            Ready to see your actual AI Visibility Score?
          </p>
          <a href="#pricing" style={{
            display: "inline-block", background: "#e8ff4a", color: "#000",
            fontSize: 16, fontWeight: 500, padding: "16px 40px", borderRadius: 99,
            textDecoration: "none"
          }}>
            Get Your TSO Audit - $297
          </a>
        </div>
      </div>
    </div>
  );
}
