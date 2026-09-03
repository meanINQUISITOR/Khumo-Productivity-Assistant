import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function App() {
  // Automatically retrieves the saved key from the browser's localStorage
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [activeTab, setActiveTab] = useState('email');
  const [inputData, setInputData] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  // Saves the API key locally whenever you type or update it
  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  const systemPrompts = {
    email: 'You are an executive email assistant. Draft professional, clear, and concise emails based on user instructions.',
    summary: 'You are an executive administrative assistant. Summarize meeting notes into key takeaways, decisions made, and key action items.',
    planner: 'You are a project management assistant. Convert tasks or project descriptions into structured, prioritized, step-by-step action plans.'
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      alert('Please enter your Gemini API Key first.');
      return;
    }
    if (!inputData) {
      alert('Please provide prompt input.');
      return;
    }

    setLoading(true);
    setOutput('');

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompts[activeTab]}\n\nTask details:\n${inputData}`,
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          setOutput((prev) => prev + chunk.text);
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
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Gemini API Key:</label>
        <input 
          type="password" 
          value={apiKey} 
          onChange={(e) => setApiKey(e.target.value)} 
          placeholder="AIzaSy..." 
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
        />
        <small style={{ color: '#666' }}>Your key is stored in browser memory so you don't have to re-enter it.</small>
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