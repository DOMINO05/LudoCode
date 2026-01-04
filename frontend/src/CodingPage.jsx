import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Editor from '@monaco-editor/react';

export default function CodingPage() {
  const { session, refreshProfile } = useOutletContext();
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [parsonsSolution, setParsonsSolution] = useState([]);
  const [parsonsAvailable, setParsonsAvailable] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Debug specific
  const [debugPhase, setDebugPhase] = useState('identify'); // 'identify' | 'fix'
  const editorRef = React.useRef(null);

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
          const errorText = await res.text();
          throw new Error(`Failed to fetch question: ${res.status} ${res.statusText} - ${errorText}`);
      }
      const data = await res.json();
      setQuestion(data);
      // Initialize code/answer
      if (data.qType === 'debug') {
          setCode(data.content.buggy_code || '');
          setDebugPhase('identify');
      } else {
          setCode(data.content.initial_code || '');
      }
      
      if (data.qType === 'parsons' && data.content.blocks) {
          // Shuffle blocks? Or just list them. Schema usually has them mixed or ordered by ID.
          // Let's shuffle for better UX or just use as provided.
          setParsonsAvailable([...data.content.blocks].sort(() => Math.random() - 0.5));
          setParsonsSolution([]);
      }
    } catch (err) {
      console.error(err);
      alert('Could not load question. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDebugCheck = () => {
      if (!editorRef.current) return;
      const selection = editorRef.current.getSelection();
      const model = editorRef.current.getModel();
      const selectedText = model.getValueInRange(selection);
      
      const errorLocation = question.content.error_location.trim();
      
      // Simple check: does selected text contain the error location or vice versa?
      // Strict check might be frustrating.
      if (selectedText.trim() === errorLocation || (selectedText.trim().length > 0 && errorLocation.includes(selectedText.trim()))) {
          alert('Correct! Now fix the bug.');
          setDebugPhase('fix');
      } else {
          alert(`Incorrect. The bug is at: "${errorLocation}". Now fix it.`);
          setDebugPhase('fix');
          // Ideally highlight it, but showing alert is MVP.
      }
  };

  const handleSubmit = async () => {
    if (!question) return;
    
    let submissionData = code;
    if (question.qType === 'parsons') {
        submissionData = JSON.stringify(parsonsSolution.map(b => b.id));
    }

    try {
      const res = await fetch(`http://localhost:3000/questions/${question.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ code: submissionData })
      });
      const data = await res.json();
      setResult(data);
      if (data.isCorrect) {
          refreshProfile(); // Update stats in topbar
      }
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

        {question.content.code_snippet && (
            <div style={{ marginBottom: '20px', background: '#2d2d2d', color: '#ccc', padding: '10px', borderRadius: '5px', fontFamily: 'monospace' }}>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{question.content.code_snippet}</pre>
            </div>
        )}

        {question.content.options && (
            <div style={{ marginBottom: '20px' }}>
                <h3>Select Answer:</h3>
                {question.content.options.map((option, idx) => (
                    <div key={idx} style={{ marginBottom: '5px' }}>
                        <label>
                            <input 
                                type="radio" 
                                name="answer" 
                                value={option} 
                                checked={code === option} 
                                onChange={(e) => setCode(e.target.value)} 
                            />
                            <span style={{ marginLeft: '10px' }}>{option}</span>
                        </label>
                    </div>
                ))}
            </div>
        )}

        {question.qType === 'parsons' && (
            <div style={{ marginBottom: '20px' }}>
                <h3>Your Solution (Click to remove):</h3>
                <div style={{ minHeight: '50px', border: '1px dashed #ccc', padding: '10px', marginBottom: '10px' }}>
                    {parsonsSolution.map((block, idx) => (
                        <div 
                            key={block.id} 
                            onClick={() => {
                                setParsonsSolution(prev => prev.filter((_, i) => i !== idx));
                                setParsonsAvailable(prev => [...prev, block]);
                            }}
                            style={{ background: '#e0e0e0', padding: '5px', marginBottom: '5px', cursor: 'pointer' }}
                        >
                            {block.text}
                        </div>
                    ))}
                </div>

                <h3>Available Blocks (Click to add):</h3>
                <div style={{ minHeight: '50px', border: '1px solid #ccc', padding: '10px' }}>
                    {parsonsAvailable.map((block, idx) => (
                        <div 
                            key={block.id} 
                            onClick={() => {
                                setParsonsAvailable(prev => prev.filter((_, i) => i !== idx));
                                setParsonsSolution(prev => [...prev, block]);
                            }}
                            style={{ background: '#f0f0f0', padding: '5px', marginBottom: '5px', cursor: 'pointer' }}
                        >
                            {block.text}
                        </div>
                    ))}
                </div>
            </div>
        )}
        
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
        {(question.qType === 'coding' || question.qType === 'fill_in_blank' || question.qType === 'debug') ? (
            <Editor
            height="70vh"
            defaultLanguage={question.language === 'python' ? 'python' : 'java'}
            value={code}
            onChange={(value) => setCode(value)}
            onMount={(editor) => { editorRef.current = editor; }}
            theme="vs-dark"
            options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                readOnly: question.qType === 'debug' && debugPhase === 'identify'
            }}
            />
        ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', color: '#666' }}>
                {question.qType === 'parsons' ? 
                    <p>Arrange blocks in the left panel.</p> : 
                    <p>Select an option from the left panel.</p>
                }
            </div>
        )}
        
        {question.qType === 'debug' && debugPhase === 'identify' ? (
            <button onClick={handleDebugCheck} style={{ padding: '15px', marginTop: '10px', backgroundColor: '#ff9800', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                Identify Bug
            </button>
        ) : (
            <button onClick={handleSubmit} style={{ padding: '15px', marginTop: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                Submit Solution
            </button>
        )}
      </div>
    </div>
  );
}
