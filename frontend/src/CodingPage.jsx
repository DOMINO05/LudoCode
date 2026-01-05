import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useTheme } from './ThemeContext';

// Simple Modal Component
const Modal = ({ children }) => (
  <div className="modal-overlay" style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  }}>
    <div className="modal-content" style={{
      padding: '30px', borderRadius: '10px',
      maxWidth: '500px', width: '90%', textAlign: 'center',
      boxShadow: 'var(--shadow)'
    }}>
      {children}
    </div>
  </div>
);

export default function CodingPage() {
  const { session, refreshProfile } = useOutletContext();
  const { isDark } = useTheme();
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [parsonsSolution, setParsonsSolution] = useState([]);
  const [parsonsAvailable, setParsonsAvailable] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  // Debug specific
  const [debugPhase, setDebugPhase] = useState('identify'); // 'identify' | 'fix'
  const editorRef = useRef(null);

  useEffect(() => {
    fetchNextQuestion();
  }, []);

  const fetchNextQuestion = async () => {
    setLoading(true);
    setResult(null);
    setShowSuccessModal(false);
    setShowHint(false);
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
      
      if (selectedText.trim() === errorLocation || (selectedText.trim().length > 0 && errorLocation.includes(selectedText.trim()))) {
          alert('Correct! Now fix the bug.');
          setDebugPhase('fix');
      } else {
          alert(`Incorrect. The bug is at: "${errorLocation}". Now fix it.`);
          setDebugPhase('fix');
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
      
      // Update profile regardless of result to sync HP/XP/ELO
      refreshProfile();

      if (data.isCorrect) {
          setShowSuccessModal(true);
      }
    } catch (err) {
      console.error(err);
      alert('Submission failed');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!question) return <div style={{ padding: '20px' }}>No more questions available!</div>;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', gap: '20px', boxSizing: 'border-box', overflow: 'hidden', padding: '20px' }}>
      {/* Left Panel: Task Description */}
      <div className="card" style={{ 
        flex: '0 0 35%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '0' // Override padding for internal scroll
      }}>
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ marginTop: 0 }}>{question.title}</h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', fontSize: '0.9em' }}>
            <span style={{ background: 'var(--input-bg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--input-border)' }}>{question.difficultyRating}</span>
            <span style={{ background: 'var(--primary-color)', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>10 XP</span>
            <span style={{ background: 'var(--input-bg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--input-border)' }}>{question.qType}</span>
            <span style={{ background: 'var(--input-bg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--input-border)' }}>{question.language}</span>
          </div>

          <div style={{ marginBottom: '20px', lineHeight: '1.6' }}>
            <p>{question.description}</p>
          </div>

          {question.content.code_snippet && (
            <div style={{ marginBottom: '20px', background: isDark ? '#2d2d2d' : '#f0f0f0', color: isDark ? '#ccc' : '#333', padding: '10px', borderRadius: '5px', fontFamily: 'monospace', overflowX: 'auto' }}>
                <pre style={{ margin: 0 }}>{question.content.code_snippet}</pre>
            </div>
          )}

          {question.content.options && (
            <div style={{ marginBottom: '20px' }}>
                <h3>Select Answer:</h3>
                {question.content.options.map((option, idx) => (
                    <div key={idx} style={{ marginBottom: '10px', background: 'var(--input-bg)', padding: '10px', borderRadius: '4px', border: '1px solid var(--input-border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input 
                                type="radio" 
                                name="answer" 
                                value={option} 
                                checked={code === option} 
                                onChange={(e) => setCode(e.target.value)} 
                                style={{ marginRight: '10px' }}
                            />
                            <span>{option}</span>
                        </label>
                    </div>
                ))}
            </div>
          )}

          {question.qType === 'parsons' && (
            <div style={{ marginBottom: '20px' }}>
                <h3>Your Solution:</h3>
                <div style={{ minHeight: '50px', border: '1px dashed var(--input-border)', padding: '10px', marginBottom: '20px', borderRadius: '4px', background: 'var(--input-bg)' }}>
                    {parsonsSolution.map((block, idx) => (
                        <div 
                            key={block.id} 
                            onClick={() => {
                                setParsonsSolution(prev => prev.filter((_, i) => i !== idx));
                                setParsonsAvailable(prev => [...prev, block]);
                            }}
                            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '8px', marginBottom: '5px', cursor: 'pointer', borderRadius: '4px' }}
                        >
                            {block.text}
                        </div>
                    ))}
                    {parsonsSolution.length === 0 && <span style={{color: 'var(--text-color)', opacity: 0.7, fontStyle: 'italic'}}>Click blocks to add them here</span>}
                </div>

                <h3>Available Blocks:</h3>
                <div style={{ minHeight: '50px', border: '1px solid var(--input-border)', padding: '10px', borderRadius: '4px', background: 'var(--input-bg)' }}>
                    {parsonsAvailable.map((block, idx) => (
                        <div 
                            key={block.id} 
                            onClick={() => {
                                setParsonsAvailable(prev => prev.filter((_, i) => i !== idx));
                                setParsonsSolution(prev => [...prev, block]);
                            }}
                            style={{ background: 'var(--primary-color)', color: '#fff', padding: '8px', marginBottom: '5px', cursor: 'pointer', borderRadius: '4px' }}
                        >
                            {block.text}
                        </div>
                    ))}
                </div>
            </div>
          )}

          {question.hint && (
            <div style={{ marginTop: '20px' }}>
              <button 
                onClick={() => setShowHint(!showHint)} 
                className="btn btn-outline"
                style={{ fontSize: '14px', padding: '5px 10px' }}
              >
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </button>
              {showHint && (
                <div style={{ marginTop: '10px', padding: '10px', background: 'var(--input-bg)', borderRadius: '4px', borderLeft: '3px solid var(--primary-color)' }}>
                  {question.hint}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Editor & Output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Editor Area */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
            {(question.qType === 'coding' || question.qType === 'fill_in_blank' || question.qType === 'debug') ? (
                <Editor
                height="100%"
                defaultLanguage={question.language === 'python' ? 'python' : 'java'}
                value={code}
                onChange={(value) => setCode(value)}
                onMount={(editor) => { editorRef.current = editor; }}
                theme={isDark ? "vs-dark" : "light"}
                options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    padding: { top: 20 },
                    readOnly: question.qType === 'debug' && debugPhase === 'identify'
                }}
                />
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', color: 'var(--text-color)' }}>
                    {question.qType === 'parsons' ? 
                        <p>Arrange blocks in the left panel.</p> : 
                        <p>Select an option from the left panel.</p>
                    }
                </div>
            )}
        </div>

        {/* Controls & Console Output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
             {question.qType === 'debug' && debugPhase === 'identify' ? (
                <button 
                  onClick={handleDebugCheck} 
                  className="btn btn-secondary"
                  style={{ fontSize: '14px' }}>
                    Identify Bug
                </button>
            ) : (
                <button 
                  onClick={handleSubmit} 
                  className="btn btn-primary"
                  style={{ fontSize: '14px' }}>
                    Run & Submit
                </button>
            )}
          </div>

          {/* Console Output Box */}
          <div style={{ 
            flex: 1, 
            backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5', 
            borderRadius: '8px', 
            border: result && !result.isCorrect ? '1px solid var(--error-color)' : '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '8px 15px', background: isDark ? '#252526' : '#e0e0e0', borderBottom: '1px solid var(--card-border)', fontSize: '12px', color: isDark ? '#ccc' : '#333', fontWeight: 'bold' }}>
              CONSOLE OUTPUT
            </div>
            <div style={{ padding: '15px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '13px', color: isDark ? '#fff' : '#000', height: '100%' }}>
              {!result && <span style={{ opacity: 0.6 }}>Waiting for submission...</span>}
              
              {result && !result.isCorrect && (
                 <div style={{ marginBottom: '10px', color: 'var(--error-color)' }}>
                   <strong>Sajnos nem jó. -1 HP, -15 ELO</strong>
                 </div>
              )}

              {result && result.compile_message && (
                 <div style={{ color: 'var(--error-color)', whiteSpace: 'pre-wrap' }}>
                   {result.compile_message}
                 </div>
              )}

              {result && result.output && (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: result.isCorrect ? 'var(--success-color)' : (isDark ? '#ce9178' : '#d32f2f') }}>
                  {result.output}
                </pre>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <Modal>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ color: 'var(--success-color)', marginBottom: '10px' }}>Helyes válasz!</h2>
          <div style={{ fontSize: '18px', marginBottom: '20px', color: 'var(--text-color)' }}>
            <p>+10 XP</p>
            <p>+15 ELO</p>
          </div>
          <button 
            onClick={fetchNextQuestion}
            className="btn btn-primary"
            style={{ fontSize: '16px' }}
          >
            Következő feladat
          </button>
        </Modal>
      )}
    </div>
  );
}
