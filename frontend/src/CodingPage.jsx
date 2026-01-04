import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function CodingPage({ session }) {
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNextQuestion();
  }, []);

  const fetchNextQuestion = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('http://localhost:3000/questions/next', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) {
          if (res.status === 404) {
              setQuestion(null);
              return;
          }
          throw new Error('Failed to fetch question');
      }
      const data = await res.json();
      setQuestion(data);
      // Initialize code from content if available
      setCode(data.content.initial_code || '');
    } catch (err) {
      console.error(err);
      alert('Could not load question. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!question) return;
    try {
      const res = await fetch(`http://localhost:3000/questions/${question.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert('Submission failed');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!question) return <div>No more questions available!</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', padding: '20px', gap: '20px', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', borderRight: '1px solid #ccc' }}>
        <h2>{question.title}</h2>
        <p><strong>Difficulty:</strong> {question.difficultyRating}</p>
        <p><strong>XP:</strong> 10</p>
        <p><strong>Type:</strong> {question.qType}</p>
        <p><strong>Language:</strong> {question.language}</p>
        <div style={{ marginBottom: '20px' }}>
            <p>{question.description}</p>
        </div>
        
        {question.hint && <details><summary>Hint</summary>{question.hint}</details>}

        {result && (
          <div style={{ marginTop: '20px', padding: '10px', border: result.isCorrect ? '2px solid green' : '2px solid red', borderRadius: '5px' }}>
            <h3>{result.isCorrect ? 'Correct!' : 'Incorrect'}</h3>
            {result.isCorrect && <p>You earned 10 XP!</p>}
            {!result.isCorrect && <p>HP -1</p>}
            {result.output && (
                <div style={{ marginTop: '10px', background: '#f0f0f0', padding: '5px' }}>
                    <strong>Output:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{result.output}</pre>
                </div>
            )}
          </div>
        )}
        
        <button onClick={fetchNextQuestion} style={{ marginTop: '20px', padding: '10px' }}>Next Question</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Editor
          height="70vh"
          defaultLanguage={question.language === 'python' ? 'python' : 'java'}
          value={code}
          onChange={(value) => setCode(value)}
          theme="vs-dark"
          options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
          }}
        />
        <button onClick={handleSubmit} style={{ padding: '15px', marginTop: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
          Submit Solution
        </button>
      </div>
    </div>
  );
}
