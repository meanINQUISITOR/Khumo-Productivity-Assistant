import React, { useState, useEffect } from 'react';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const TABS = [
  { id: 'email', label: '✉️ Email Generator', placeholder: 'Describe the email you need...\ne.g. "Write a follow-up email to a client after a product demo. Keep it professional and include a call to action."' },
  { id: 'summary', label: '📝 Meeting Summariser', placeholder: 'Paste your meeting notes here...' },
  { id: 'planner', label: '📅 Task Planner', placeholder: 'List your tasks or describe your project...\ne.g.\n- Prepare quarterly report (due Friday)\n- Team standup at 9am\n- Review new vendor contracts' },
];

const SYSTEM_PROMPTS = {
  email: 'You are an executive email assistant. Draft professional, clear, and concise emails based on user instructions. Include a subject line, greeting, body, and sign-off. Adapt the tone based on the context provided.',
  summary: 'You are an executive administrative assistant. Summarise meeting notes into: ## Summary (2-3 sentences), ## Key Decisions (bullet points), ## Action Items (with owner and deadline if mentioned). Be concise.',
  planner: 'You are a productivity coach. Convert tasks into a prioritised, structured plan with urgency/importance labels, suggested time blocks, and one time-saving tip. Be practical and concise.',
};

export default function App() {
  const [apiKey, setApiKey] = useState('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');
  const [keyVisible, setKeyVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [inputData, setInputData] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Persist API key in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('groq_api_key');
    if (saved) setApiKey(saved);
  }, []);

  useEffect(() => {
    if (apiKey) localStorage.setItem('groq_api_key', apiKey);
  }, [apiKey]);

  const handleGenerate = async () => {
    if (!apiKey.trim()) { setError('Please enter your Groq API key first.'); return; }
    if (!inputData.trim()) { setError('Please enter some input first.'); return; }
    setError(''); setOutput(''); setLoading(true);

    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM_PROMPTS[activeTab] },
            { role: 'user', content: inputData },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `API error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const text = json.choices?.[0]?.delta?.content;
            if (text) setOutput(prev => prev + text);
          } catch {}
        }
      }
    } catch (e) {
      setError(e.message || 'Something went wrong. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '32px 16px 60px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#0f172a' }}>Khumo Productivity Assistant</h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>AI-powered tools for everyday professional tasks — CAPACITI AI Skill Accelerator</p>
        </div>

        {/* API Key */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 8 }}>
            🔑 Groq API Key <span style={{ fontWeight: 400, color: '#64748b' }}>(saved in your browser)</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={keyVisible ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="gsk_..."
              style={{ flex: 1, padding: '9px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: 'monospace', outline: 'none' }}
            />
            <button onClick={() => setKeyVisible(v => !v)}
              style={{ padding: '9px 14px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#64748b' }}>
              {keyVisible ? 'Hide' : 'Show'}
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8' }}>Get a free key at console.groq.com — no credit card needed.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', padding: 4, borderRadius: 12, marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setOutput(''); setError(''); }}
              style={{
                flex: 1, padding: '9px 8px', fontSize: 13, border: 'none', borderRadius: 9,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                background: activeTab === t.id ? 'white' : 'transparent',
                color: activeTab === t.id ? '#0f172a' : '#64748b',
                fontWeight: activeTab === t.id ? 600 : 400,
                boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Main card */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 600 }}>{currentTab.label}</h2>
          <textarea
            rows={7}
            value={inputData}
            onChange={e => { setInputData(e.target.value); setError(''); }}
            placeholder={currentTab.placeholder}
            style={{ width: '100%', padding: '12px 14px', fontSize: 14, lineHeight: 1.6, border: `1px solid ${error && !inputData ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, resize: 'vertical', fontFamily: 'inherit', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
          />
          {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '6px 0 0' }}>{error}</p>}
          <button onClick={handleGenerate} disabled={loading}
            style={{ marginTop: 12, padding: '10px 22px', background: loading ? '#94a3b8' : '#1a56db', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Generating…' : 'Generate'}
          </button>

          {/* Output */}
          {(output || loading) && (
            <div style={{ marginTop: 16, padding: '16px 20px', background: loading && !output ? '#f8fafc' : '#f0fdf4', border: `1px solid ${loading && !output ? '#e2e8f0' : '#86efac'}`, borderRadius: 12, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 360, overflowY: 'auto', color: '#0f172a' }}>
              {!output && loading ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Generating…</span> : output}
            </div>
          )}
          {output && !loading && (
            <button onClick={copyOutput}
              style={{ marginTop: 8, padding: '6px 14px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', color: copied ? '#16a34a' : '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
              {copied ? '✓ Copied' : 'Copy output'}
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 24 }}>
          AI outputs may contain errors. Always review before using in professional contexts.
        </p>
      </div>
    </div>
  );
}
