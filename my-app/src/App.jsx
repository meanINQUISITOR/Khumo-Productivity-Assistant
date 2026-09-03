import { useState, useRef, useEffect } from "react";

const ACCENT = "#1a56db";
const SURFACE = "#f8fafc";
const CARD = "#ffffff";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const SUCCESS_BG = "#f0fdf4";
const SUCCESS_BORDER = "#86efac";

const TABS = [
  { id: "notes", label: "Meeting Notes", icon: "📝" },
  { id: "planner", label: "Task Planner", icon: "📅" },
  { id: "research", label: "Research Assistant", icon: "🔍" },
];

async function callClaude(systemPrompt, userMessage, onChunk) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        if (json.type === "content_block_delta" && json.delta?.text) {
          onChunk(json.delta.text);
        }
      } catch {}
    }
  }
}

function OutputBox({ text, loading }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);

  if (!text && !loading) return null;

  return (
    <div
      ref={ref}
      style={{
        marginTop: 16,
        padding: "16px 20px",
        background: loading ? SURFACE : SUCCESS_BG,
        border: `1px solid ${loading ? BORDER : SUCCESS_BORDER}`,
        borderRadius: 12,
        fontSize: 14,
        lineHeight: 1.7,
        color: TEXT,
        whiteSpace: "pre-wrap",
        maxHeight: 360,
        overflowY: "auto",
        transition: "background 0.3s",
        fontFamily: "inherit",
      }}
    >
      {loading && !text && (
        <span style={{ color: MUTED, fontStyle: "italic" }}>Generating…</span>
      )}
      {text}
      {loading && text && (
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 14,
            background: ACCENT,
            marginLeft: 2,
            verticalAlign: "middle",
            borderRadius: 2,
            animation: "blink 1s steps(1) infinite",
          }}
        />
      )}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      style={{
        marginTop: 8,
        padding: "6px 14px",
        fontSize: 13,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        background: "white",
        color: copied ? "#16a34a" : MUTED,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {copied ? "✓ Copied" : "Copy output"}
    </button>
  );
}

function MeetingNotes() {
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!notes.trim()) { setError("Paste your meeting notes first."); return; }
    setError(""); setOutput(""); setLoading(true);
    try {
      await callClaude(
        "You are a professional meeting summarizer. Extract key points, decisions, action items, owners, and deadlines. Use clear markdown sections: ## Summary, ## Key Decisions, ## Action Items (with owner and deadline if mentioned). Be concise and structured.",
        `Here are the meeting notes to summarize:\n\n${notes}`,
        (chunk) => setOutput((o) => o + chunk)
      );
    } catch (e) {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={{ color: MUTED, fontSize: 14, margin: "0 0 12px" }}>
        Paste raw meeting notes — get a structured summary with action items and decisions extracted.
      </p>
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setError(""); }}
        placeholder="Paste your meeting notes here…"
        rows={8}
        style={{
          width: "100%", boxSizing: "border-box", padding: "12px 14px",
          fontSize: 14, lineHeight: 1.6, border: `1px solid ${error ? "#fca5a5" : BORDER}`,
          borderRadius: 10, resize: "vertical", fontFamily: "inherit", color: TEXT,
          background: "white", outline: "none",
        }}
      />
      {error && <p style={{ color: "#dc2626", fontSize: 13, margin: "6px 0 0" }}>{error}</p>}
      <button
        onClick={run}
        disabled={loading}
        style={{
          marginTop: 12, padding: "10px 22px", background: loading ? MUTED : ACCENT,
          color: "white", border: "none", borderRadius: 10, fontSize: 14,
          fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s",
        }}
      >
        {loading ? "Summarising…" : "Summarise notes"}
      </button>
      <OutputBox text={output} loading={loading} />
      <CopyButton text={output} />
    </div>
  );
}

function TaskPlanner() {
  const [tasks, setTasks] = useState("");
  const [mode, setMode] = useState("daily");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!tasks.trim()) { setError("Enter your tasks first."); return; }
    setError(""); setOutput(""); setLoading(true);
    try {
      await callClaude(
        `You are a productivity coach and task planner. Create a structured ${mode} plan using the Eisenhower Matrix (urgent/important prioritisation). Format with time blocks, suggested order, and one time-optimisation tip. Keep it actionable and concise.`,
        `Here are my tasks. Build a ${mode} plan:\n\n${tasks}`,
        (chunk) => setOutput((o) => o + chunk)
      );
    } catch (e) {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={{ color: MUTED, fontSize: 14, margin: "0 0 12px" }}>
        List your tasks and get a prioritised plan with time blocks and focus tips.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["daily", "weekly"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "7px 18px", fontSize: 13, borderRadius: 8, cursor: "pointer",
              border: `1px solid ${mode === m ? ACCENT : BORDER}`,
              background: mode === m ? "#eff6ff" : "white",
              color: mode === m ? ACCENT : MUTED,
              fontWeight: mode === m ? 500 : 400, transition: "all 0.15s",
            }}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)} plan
          </button>
        ))}
      </div>
      <textarea
        value={tasks}
        onChange={(e) => { setTasks(e.target.value); setError(""); }}
        placeholder={`List your tasks, one per line…\ne.g.\n- Prepare client report (due Friday)\n- Team standup at 10am\n- Review quarterly budget`}
        rows={7}
        style={{
          width: "100%", boxSizing: "border-box", padding: "12px 14px",
          fontSize: 14, lineHeight: 1.6, border: `1px solid ${error ? "#fca5a5" : BORDER}`,
          borderRadius: 10, resize: "vertical", fontFamily: "inherit", color: TEXT,
          background: "white", outline: "none",
        }}
      />
      {error && <p style={{ color: "#dc2626", fontSize: 13, margin: "6px 0 0" }}>{error}</p>}
      <button
        onClick={run}
        disabled={loading}
        style={{
          marginTop: 12, padding: "10px 22px", background: loading ? MUTED : ACCENT,
          color: "white", border: "none", borderRadius: 10, fontSize: 14,
          fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s",
        }}
      >
        {loading ? "Planning…" : `Build ${mode} plan`}
      </button>
      <OutputBox text={output} loading={loading} />
      <CopyButton text={output} />
    </div>
  );
}

function ResearchAssistant() {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState("overview");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const depthOptions = [
    { id: "overview", label: "Quick overview" },
    { id: "detailed", label: "Detailed brief" },
    { id: "pros-cons", label: "Pros and cons" },
  ];

  const systemMap = {
    overview: "Give a concise overview in plain language: what it is, why it matters, and 3 key takeaways. Under 250 words. Avoid jargon.",
    detailed: "Write a structured research brief with sections: ## What it is, ## Why it matters, ## Key facts and figures, ## Implications. Be thorough but avoid unnecessary filler. Under 500 words.",
    "pros-cons": "Analyse the topic with balanced sections: ## Advantages, ## Disadvantages, ## Verdict. Use bullet points. Be objective. Under 350 words.",
  };

  const run = async () => {
    if (!topic.trim()) { setError("Enter a topic or paste text to research."); return; }
    setError(""); setOutput(""); setLoading(true);
    try {
      await callClaude(
        `You are a professional research assistant. ${systemMap[depth]} Always end with a one-sentence disclaimer: "AI-generated summary — verify key facts from authoritative sources."`,
        `Research topic or text:\n\n${topic}`,
        (chunk) => setOutput((o) => o + chunk)
      );
    } catch (e) {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={{ color: MUTED, fontSize: 14, margin: "0 0 12px" }}>
        Enter a topic or paste a block of text. Get a clear, structured research brief.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {depthOptions.map((d) => (
          <button
            key={d.id}
            onClick={() => setDepth(d.id)}
            style={{
              padding: "7px 16px", fontSize: 13, borderRadius: 8, cursor: "pointer",
              border: `1px solid ${depth === d.id ? ACCENT : BORDER}`,
              background: depth === d.id ? "#eff6ff" : "white",
              color: depth === d.id ? ACCENT : MUTED,
              fontWeight: depth === d.id ? 500 : 400, transition: "all 0.15s",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>
      <textarea
        value={topic}
        onChange={(e) => { setTopic(e.target.value); setError(""); }}
        placeholder="e.g. 'The impact of AI on supply chain management' or paste a long article to summarise…"
        rows={7}
        style={{
          width: "100%", boxSizing: "border-box", padding: "12px 14px",
          fontSize: 14, lineHeight: 1.6, border: `1px solid ${error ? "#fca5a5" : BORDER}`,
          borderRadius: 10, resize: "vertical", fontFamily: "inherit", color: TEXT,
          background: "white", outline: "none",
        }}
      />
      {error && <p style={{ color: "#dc2626", fontSize: 13, margin: "6px 0 0" }}>{error}</p>}
      <button
        onClick={run}
        disabled={loading}
        style={{
          marginTop: 12, padding: "10px 22px", background: loading ? MUTED : ACCENT,
          color: "white", border: "none", borderRadius: 10, fontSize: 14,
          fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s",
        }}
      >
        {loading ? "Researching…" : "Research this"}
      </button>
      <OutputBox text={output} loading={loading} />
      <CopyButton text={output} />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("notes");

  return (
    <div style={{ minHeight: "100vh", background: SURFACE, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        * { box-sizing: border-box; }
        textarea:focus, button:focus { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 20px 60px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: ACCENT,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>⚡</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: TEXT }}>
              WorkAI Assistant
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
            AI-powered tools to save time on everyday professional tasks — built for CAPACITI AI Skill Accelerator
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 24,
          background: "#e2e8f0", padding: 4, borderRadius: 12,
        }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "9px 12px", fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                border: "none", borderRadius: 9, cursor: "pointer", transition: "all 0.15s",
                background: tab === t.id ? "white" : "transparent",
                color: tab === t.id ? TEXT : MUTED,
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <span style={{ marginRight: 6 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 16, padding: "28px 28px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: TEXT }}>
            {TABS.find((t) => t.id === tab)?.icon} {TABS.find((t) => t.id === tab)?.label}
          </h2>
          <div style={{ marginTop: 16 }}>
            {tab === "notes" && <MeetingNotes />}
            {tab === "planner" && <TaskPlanner />}
            {tab === "research" && <ResearchAssistant />}
          </div>
        </div>

        {/* Footer disclaimer */}
        <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 24 }}>
          AI outputs may contain errors. Always review and verify before using in professional contexts.
        </p>
      </div>
    </div>
  );
}
