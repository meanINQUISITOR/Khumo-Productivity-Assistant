import React, { useState } from 'react';
import Anthropic from '@anthropic-ai/sdk';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('email');
  const [inputData, setInputData] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const systemPrompts = {
    email: 'You are an executive email assistant. Draft professional, clear, and concise emails based on user instructions.',
    summary: 'You are an executive administrative assistant. Summarize meeting notes into key takeaways, decisions made, and key action items.',
    planner: 'You are a project management assistant. Convert tasks or project descriptions into structured, prioritized, step-by-step action plans.'
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      alert('Please enter your Anthropic API Key first.');
      return;
    }
    if (!inputData) {
      alert('Please provide prompt input.');
      return;
    }

    setLoading(true);
    setOutput('');

    try {
      const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      const stream = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompts[activeTab],
        messages: [{ role: 'user', content: inputData }],
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          setOutput((prev) => prev + chunk.delta.text);
        }
      }
    } catch (error) {
      setOutput(`Error: ${error.message || 'Failed to generate response.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'sans-serif', padding: '20px' }}>
      <h1>Khumo Productivity Assistant</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Anthropic API Key:</label>
        <input 
          type="password" 
          value={apiKey} 
          onChange={(e) => setApiKey(e.target.value)} 
          placeholder="sk-ant-..." 
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('email')} 
          style={{ padding: '10px 15px', background: activeTab === 'email' ? '#0070f3' : '#ccc', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Email Generator
        </button>
        <button 
          onClick={() => setActiveTab('summary')} 
          style={{ padding: '10px 15px', background: activeTab === 'summary' ? '#0070f3' : '#ccc', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Meeting Summarizer
        </button>
        <button 
          onClick={() => setActiveTab('planner')} 
          style={{ padding: '10px 15px', background: activeTab === 'planner' ? '#0070f3' : '#ccc', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Task Planner
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <textarea 
          rows={6} 
          value={inputData} 
          onChange={(e) => setInputData(e.target.value)} 
          placeholder={`Enter details for ${activeTab}...`} 
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
        />
      </div>

      <button 
        onClick={handleGenerate} 
        disabled={loading} 
        style={{ padding: '12px 20px', background: '#0070f3', color: '#fff', border: 'none', cursor: 'pointer' }}>
        {loading ? 'Generating...' : 'Generate Result'}
      </button>

      {output && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f4f4f4', borderRadius: '5px', whiteSpace: 'pre-wrap' }}>
          <h3>Result:</h3>
          <p>{output}</p>
        </div>
      )}
    </div>
  );
}