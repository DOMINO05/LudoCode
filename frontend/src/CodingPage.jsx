import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from './ThemeContext';

// Import New Question Components
import TheoryComponent from './question-types/TheoryComponent';
import PredictionComponent from './question-types/PredictionComponent';
import FillBlankComponent from './question-types/FillBlankComponent';
import ParsonsComponent from './question-types/ParsonsComponent';
import DebugComponent from './question-types/DebugComponent';
import ConstructionComponent from './question-types/ConstructionComponent';
import FeedbackSheet from './FeedbackSheet';

// Fallback for types not yet fully implemented or standard 'coding'
import Editor from '@monaco-editor/react';

export default function CodingPage() {
  const { session, refreshProfile } = useOutletContext();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conceptId = searchParams.get('conceptId');

  // State
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noQuestions, setNoQuestions] = useState(false);
  const [isCourseFinished, setIsCourseFinished] = useState(false);

  // Answers State
  const [code, setCode] = useState(''); // For Coding, FillBlank, Debug, Construction
  const [parsonsSolution, setParsonsSolution] = useState([]); // For Parsons
  const [selectedOption, setSelectedOption] = useState(null); // For Theory, Prediction

  // Debug Specific State
  const [debugPhase, setDebugPhase] = useState('identify'); // 'identify' | 'fix'
  const [debugSelectedLine, setDebugSelectedLine] = useState(null);

  // Result & Feedback
  const [result, setResult] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    fetchNextQuestion();
  }, []);

  const fetchNextQuestion = async () => {
    setLoading(true);
    setResult(null);
    setShowFeedback(false);
    setNoQuestions(false);
    setIsCourseFinished(false);
    
    // Reset answer states
    setCode('');
    setParsonsSolution([]);
    setSelectedOption(null);
    setDebugPhase('identify');
    setDebugSelectedLine(null);

    let url = 'http://localhost:3000/questions/next';
    if (conceptId) {
        url = `http://localhost:3000/courses/${conceptId}/next-question`;
    }

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) {
          if (res.status === 404) {
              setQuestion(null);
              setNoQuestions(true);
              return;
          }
          const errorText = await res.text();
          throw new Error(`Failed to fetch question: ${res.status} ${res.statusText} - ${errorText}`);
      }
      
      const text = await res.text();
      if (!text) {
          if (conceptId) {
              setIsCourseFinished(true);
          } else {
              setNoQuestions(true); 
          }
          setQuestion(null);
          return;
      }

      const data = JSON.parse(text);
      setQuestion(data);
      
      // Initial Setup
      if (data.qType === 'debug') {
          // Debug initial setup if needed
      } else if (data.content.initial_code) {
          setCode(data.content.initial_code);
      }
      
    } catch (err) {
      console.error(err);
      alert('Could not load question. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
      if (!question) return;

      // Handle Debug Phase A locally first
      if (question.qType === 'debug' && debugPhase === 'identify') {
          if (debugSelectedLine === null) return;
          
          const buggyCode = question.content.buggy_code || "";
          const lines = buggyCode.split('\n');
          const selectedText = lines[debugSelectedLine].trim();
          const errorLocation = question.content.error_location ? question.content.error_location.trim() : "";

          // Simple containment check
          if (selectedText === errorLocation || (selectedText.length > 0 && errorLocation.includes(selectedText))) {
               // Correct Phase A
               setDebugPhase('fix');
               // Maybe show a mini toast or visual cue?
               // Or just transition naturally.
          } else {
              // Incorrect Phase A
               setResult({ 
                   isCorrect: false, 
                   correct_answer: `A hiba itt található:\n${errorLocation}`, 
                   output: "Nem ez a hibás sor." 
               });
               setShowFeedback(true);
          }
          return;
      }

      // Prepare Submission
      let submissionData = null;
      if (question.qType === 'theory' || question.qType === 'predict_output') {
          submissionData = selectedOption;
      } else if (question.qType === 'parsons') {
          submissionData = JSON.stringify(parsonsSolution.map(b => b.id));
      } else {
          // Coding, FillBlank, Construction, Debug (Fix Phase)
          submissionData = code;
      }

      if (submissionData === null || submissionData === '' || (Array.isArray(submissionData) && submissionData.length === 0)) {
          alert("Please provide an answer first.");
          return;
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
        setShowFeedback(true);
        
        refreshProfile();

      } catch (err) {
        console.error(err);
        alert('Submission failed');
      }
  };

  const handleNext = () => {
      if (result && result.isCorrect) {
          fetchNextQuestion();
      } else {
          setShowFeedback(false);
      }
  };

  // Render Logic
  const renderContent = () => {
      if (!question) return null;

      switch (question.qType) {
          case 'theory':
              return <TheoryComponent 
                  question={question} 
                  selectedAnswer={selectedOption} 
                  onSelect={setSelectedOption} 
              />;
          case 'predict_output':
              return <PredictionComponent 
                  question={question} 
                  selectedAnswer={selectedOption} 
                  onSelect={setSelectedOption} 
              />;
          case 'fill_in_blank':
              return <FillBlankComponent 
                  question={question} 
                  onCodeChange={setCode} 
              />;
          case 'parsons':
              return <ParsonsComponent 
                  question={question} 
                  onSolutionChange={setParsonsSolution} 
              />;
          case 'debug':
              return <DebugComponent 
                  question={question} 
                  onCodeChange={setCode} 
                  debugPhase={debugPhase}
                  selectedLineIndex={debugSelectedLine}
                  onLineSelect={setDebugSelectedLine}
              />;
          case 'coding':
          case 'construction': // Spec calls it ConstructionComponent but maps 'coding' to it? 
          // Spec says: "coding -> <ConstructionComponent /> (Ez speciális...)"
              return <ConstructionComponent 
                  question={question} 
                  onCodeChange={setCode} 
              />;
          default:
              // Fallback to basic editor if type unknown
               return (
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h2>{question.title}</h2>
                      <p>{question.description}</p>
                      <div style={{ flex: 1, border: '1px solid var(--card-border)', marginTop: '20px' }}>
                        <Editor
                            height="100%"
                            defaultLanguage={question.language || 'python'}
                            value={code}
                            onChange={(val) => setCode(val)}
                            theme={isDark ? "vs-dark" : "light"}
                        />
                      </div>
                  </div>
              );
      }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

  if (isCourseFinished) {
      return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', color: 'var(--text-color)' }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎓</div>
              <h1 style={{ color: 'var(--success-color)' }}>Témakör Teljesítve!</h1>
              <p style={{ fontSize: '18px', maxWidth: '600px', marginBottom: '40px' }}>
                  Sikeresen megoldottad az összes feladatot ebben a témakörben.
              </p>
              <button onClick={() => navigate('/courses')} className="btn btn-primary" style={{ padding: '15px 30px', fontSize: '18px' }}>
                  Vissza a Tanuló Ösvényre
              </button>
          </div>
      );
  }

  if (noQuestions) {
      return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', color: 'var(--text-color)' }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
              <h1 style={{ color: 'var(--success-color)' }}>Gratulálunk!</h1>
              <p style={{ fontSize: '18px', maxWidth: '600px', marginBottom: '40px' }}>
                  Jelenleg nincs több feladat a szintednek megfelelően.
              </p>
              <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ padding: '15px 30px', fontSize: '18px' }}>
                  Vissza a Dashboardra
              </button>
          </div>
      );
  }

  return (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%', 
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)'
    }}>
      
      {/* Main Content Area - Scrollable */}
      <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          paddingBottom: '80px', // Space for footer
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto',
      }}>
          {renderContent()}
      </div>

      {/* Footer */}
      <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px',
          borderTop: '1px solid var(--card-border)',
          backgroundColor: isDark ? '#1e1e1e' : '#fff',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 100
      }}>
          <div style={{ maxWidth: '800px', width: '100%' }}>
            <button 
                onClick={handleCheck}
                disabled={showFeedback && result?.isCorrect} // Disable if already correct and showing feedback (waiting for next)
                style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: 'var(--success-color)', // Or primary
                    color: '#fff',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    transition: 'transform 0.1s',
                }}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
            >
                ELLENŐRZÉS
            </button>
          </div>
      </div>

      {/* Feedback Bottom Sheet */}
      <FeedbackSheet 
          result={result} 
          isVisible={showFeedback} 
          onNext={handleNext} 
      />
    </div>
  );
}
