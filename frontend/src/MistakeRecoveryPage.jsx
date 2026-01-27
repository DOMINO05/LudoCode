import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { supabase } from './supabaseClient';
import { PISTON_API_URL } from './config';
// import { validateTestCases } from './utils/codeRunner';

// Import New Question Components
import TheoryComponent from './question-types/TheoryComponent';
import PredictionComponent from './question-types/PredictionComponent';
import FillBlankComponent from './question-types/FillBlankComponent';
import ParsonsComponent from './question-types/ParsonsComponent';
import DebugComponent from './question-types/DebugComponent';
import ConstructionComponent from './question-types/ConstructionComponent';

import Editor from '@monaco-editor/react';

export default function MistakeRecoveryPage() {
  const { session, profile, refreshProfile, showBadgeNotification, showNotification } = useOutletContext();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // State
  const [submissionId, setSubmissionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [message, setMessage] = useState('');

  // Answers State
  const [code, setCode] = useState('');
  const [parsonsSolution, setParsonsSolution] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // Debug Specific State
  const [debugPhase, setDebugPhase] = useState('identify');
  const [debugSelections, setDebugSelections] = useState([]);

  // Result & Feedback
  const [result, setResult] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showStaticHint, setShowStaticHint] = useState(false);

  useEffect(() => {
    fetchMistake();
  }, []);

  const fetchMistake = async () => {
    setLoading(true);
    setResult(null);
    setShowFeedback(false);
    setIsFinished(false);
    
    // Reset answer states
    setCode('');
    setParsonsSolution([]);
    setSelectedOption(null);
    setDebugPhase('identify');
    setDebugSelections([]);

    try {
      const { data, error } = await supabase.rpc('get_mistake_recovery_question');

      if (error) {
          console.error(error);
          setIsFinished(true);
          setMessage("Nincs több javítandó feladat!");
          return;
      }
      
      if (data && data.question) {
          setSubmissionId(data.id);
          setQuestion(data.question);
          if (data.question.content && data.question.content.initial_code) {
               setCode(data.question.content.initial_code);
          }
      } else {
          setIsFinished(true);
          setMessage("Nincs több javítandó feladat!");
      }
      
    } catch (err) {
      console.error(err);
      setMessage('Hiba történt a betöltés közben.');
      setIsFinished(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
      if (!question || !submissionId) return;

      // Handle Debug Phase A locally
      if (question.qType === 'debug' && debugPhase === 'identify') {
          if (debugSelections.length === 0) {
              showNotification('Kérlek válassz ki legalább egy elemet!', 'info');
              return;
          }
          
          const sortedSelections = [...debugSelections].sort((a, b) => {
              if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex;
              return a.tokenIndex - b.tokenIndex;
          });
          
          const selectedText = sortedSelections.map(s => s.text).join('');
          const errorLocation = question.content.error_location ? question.content.error_location.trim() : "";
          
          const normalizedSelected = selectedText.replace(/\s+/g, '');
          const normalizedError = errorLocation.replace(/\s+/g, '');

          if (normalizedSelected === normalizedError || normalizedError.includes(normalizedSelected)) {
               setDebugPhase('fix');
               if (code && question.content.buggy_code && code.trim() !== question.content.buggy_code.trim()) {
                   // Fall through to submission logic
               } else {
                   return; // Wait for user to select a fix
               }
          } else {
               setResult({ 
                   isCorrect: false, 
                   correct_answer: `A hiba itt található:\n${errorLocation}`, 
                   output: "Nem ez a hibás rész." 
               });
               setShowFeedback(true);
               return;
          }
      }

      // Prepare Submission
      let submissionData = null;
      if (question.qType === 'theory' || question.qType === 'predict_output') {
          submissionData = selectedOption;
      } else if (question.qType === 'parsons') {
          submissionData = JSON.stringify(parsonsSolution.map(b => b.id));
      } else {
          submissionData = code;
      }

      if (submissionData === null || submissionData === '' || (Array.isArray(submissionData) && submissionData.length === 0)) {
          showNotification('Kérlek adj meg egy választ előbb!', 'info');
          return;
      }

    try {
        let isCorrect = false;
        let output = '';
        const content = question.content;
        setShowStaticHint(false);

        if (question.qType === 'coding' || question.qType === 'construction') {
            // Piston API call simplified for Mistake Recovery too
            const language = (question.language?.name || 'python').toLowerCase();
            const payload = {
                language: language,
                version: language === 'python' ? '3.10.0' : '*',
                files: [{ name: 'main', content: submissionData }]
            };
            
            const response = await fetch(PISTON_API_URL + "/execute", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const pData = await response.json();
            isCorrect = pData.run && pData.run.code === 0;
            output = pData.run ? (pData.run.stdout || pData.run.stderr) : "Execution failed";
        } else if (question.qType === 'parsons') {
            const correctOrder = content.correct_order;
            const submittedOrder = JSON.parse(submissionData);
            isCorrect = JSON.stringify(correctOrder) === JSON.stringify(submittedOrder);
            output = isCorrect ? 'Sikeres futtatás' : 'Hibás sorrend';
        } else if (question.qType === 'debug') {
            const expectedFullCode = (content.buggy_code || '').replace(content.error_location || '', content.correct_code || '');
            isCorrect = submissionData.trim() === expectedFullCode.trim();
            output = isCorrect ? 'Sikeres javítás' : 'Még mindig hibás a kód';
        } else {
            let correctAnswer = content.correct_answer;
            if (typeof correctAnswer === 'number' && content.options) {
                correctAnswer = content.options[correctAnswer];
            }
            isCorrect = String(submissionData).trim() === String(correctAnswer).trim();
            output = isCorrect ? 'Helyes válasz' : 'Helytelen válasz';
        }

        const { data, error } = await supabase.rpc('resolve_mistake', {
            p_submission_id: submissionId,
            p_is_correct_now: isCorrect
        });

        if (error) throw error;
        
        // Map response to match CodingPage result structure for feedback display
        const feedbackResult = {
             isCorrect: isCorrect,
             output: isCorrect ? 'Feladat sikeresen javítva!' : 'Még mindig nem pontos a megoldás. Próbáld újra!',
             ai_explanation: null,
             explanation: output 
        };
        
        setResult(feedbackResult);
        setShowFeedback(true);

        // AI Explanation Stream with Timeout Fallback
        if (!isCorrect) {
            setIsAiLoading(true);
            const hintTimer = setTimeout(() => {
                setShowStaticHint(true);
            }, 3000);

            try {
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-explanation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        questionTitle: question.title,
                        questionDescription: question.description,
                        correctAnswer: content.correct_answer || content.correct_code || content.correct_order,
                        userAnswer: submissionData,
                        language: question.language?.name || 'python'
                    })
                });

                if (response.ok && response.body) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let fullText = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        if (chunk) {
                            clearTimeout(hintTimer);
                            setShowStaticHint(false);
                        }
                        fullText += chunk;
                        setResult(prev => ({ ...prev, ai_explanation: fullText }));
                    }
                } else {
                    setShowStaticHint(true);
                }
            } catch (err) {
                console.error('AI explanation streaming failed', err);
                setShowStaticHint(true);
            } finally {
                setIsAiLoading(false);
            }
        }

        if (isCorrect) {
             await refreshProfile();
             
             // Check if Sanity is full or close to full
             // We can check profile.sanityPoints (but it might be stale until refresh completes and propagates)
             // The backend returns 'newSanity' in data
             if (data.newSanity >= 100) {
                 setTimeout(() => {
                     setIsFinished(true);
                     setMessage("Sikeresen feltöltötted a Sanity-d!");
                 }, 1500);
             }
        }

      } catch (err) {
        console.error(err);
        showNotification('Sikertelen beküldés', 'error');
      }
  };

  const handleNext = () => {
      if (result && result.isCorrect) {
          fetchMistake();
      } else {
          // If incorrect, check if we should transition Debug phase
          if (question.qType === 'debug' && debugPhase === 'identify') {
              setDebugPhase('fix');
          }
          setShowFeedback(false);
      }
  };

  const isCheckDisabled = () => {
      if (!question) return true;
      if (question.qType === 'theory' || question.qType === 'predict_output') return !selectedOption;
      if (question.qType === 'fill_in_blank') return !code;
      if (question.qType === 'parsons') return parsonsSolution.length === 0;
      if (question.qType === 'debug') {
          if (debugPhase === 'identify') return debugSelections.length === 0;
          return !code || code === question.content.buggy_code;
      }
      if (question.qType === 'coding' || question.qType === 'construction') return !code;
      return false;
  };

  // Render Logic
  const renderContent = () => {
      if (!question) return null;
      if (!question.content) {
          return <div>Error: Question content missing</div>;
      }

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
                  selections={debugSelections}
                  onSelect={setDebugSelections}
                  checkResult={result}
              />;
          case 'coding':
          case 'construction': 
              return <ConstructionComponent 
                  question={question} 
                  onCodeChange={setCode} 
              />;
          default:
               return (
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h2>{question.title}</h2>
                      <p>{question.description}</p>
                      <div style={{ flex: 1, border: '1px solid var(--card-border)', marginTop: '20px' }}>
                        <Editor
                            height="100%"
                            defaultLanguage={question.language?.name || 'python'}
                            value={code}
                            onChange={(val) => setCode(val)}
                            theme={isDark ? "vs-dark" : "light"}
                        />
                      </div>
                  </div>
              );
      }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  if (isFinished) {
      return (
          <div className="flex flex-col items-center justify-center h-screen text-center text-slate-700 bg-[#f7f7f7] dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
              <div className="text-6xl mb-5">🎉</div>
              <h1 className="text-green-500 text-3xl font-bold">Gratulálunk!</h1>
              <p className="text-lg max-w-xl mb-10 mt-4">
                  {message || "Sikeresen feltöltötted a Sanity-d!"}
              </p>
              <button onClick={() => navigate('/dashboard')} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-md hover:bg-blue-600 transition">
                  Vissza a Dashboardra
              </button>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col text-slate-700 dark:text-slate-100 overflow-hidden font-nunito bg-[#f7f7f7] dark:bg-slate-900 transition-colors duration-300">
        {/* Progress Bar Area */}
        <div className="px-4 pt-4 pb-2 shrink-0 max-w-md mx-auto w-full">
            <div className="flex items-center gap-4">
                <span className="text-2xl cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => navigate('/dashboard')}>✕</span>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full flex-grow overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${(profile?.sanityPoints || 0) <= 20 ? 'bg-red-500' : (profile?.sanityPoints || 0) <= 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${profile?.sanityPoints || 0}%` }}></div>
                </div>
                <span className="text-blue-500 font-bold flex items-center" title="Sanity">🧠 {profile?.sanityPoints}%</span>
            </div>
            <div className="text-center mt-2 text-sm text-slate-500 font-bold uppercase tracking-wider">
                Mistake Recovery Mode
            </div>
        </div>

        {/* Main Content */}
        <main className="flex-grow overflow-y-auto w-full">
            <div className="flex flex-col items-center justify-between p-4 max-w-md mx-auto w-full min-h-full">
                <div className="w-full h-full flex flex-col">
                    {renderContent()}
                </div>
            </div>
        </main>

        {/* Footer */}
        <footer className="shrink-0 p-4 border-t bg-white dark:bg-slate-800 dark:border-slate-700 z-10 transition-colors duration-300">
            <div className="max-w-md mx-auto w-full flex flex-col gap-4">
                {/* Inline Feedback Area */}
                {showFeedback && result && (
                    <div className={`rounded-xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 ${result.isCorrect ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">{result.isCorrect ? '🎉' : '⚠️'}</div>
                            <div className="flex-1">
                                <div className="font-bold text-lg">{result.isCorrect ? 'Tökéletes!' : 'Nem egészen...'}</div>
                                {(result.isCorrect || showStaticHint) && (
                                    <div className="text-sm opacity-90 animate-in fade-in duration-500">
                                        {result.isCorrect ? 'Helyes válasz. Sanity +10%' : (result.explanation || result.output || 'Próbáld újra!')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Mentor Section */}
                        {!result.isCorrect && (isAiLoading || result.ai_explanation) && (
                            <div className="mt-2 pt-3 border-t border-red-200 dark:border-red-800/50">
                                <div className="text-xs font-black uppercase tracking-wider text-red-600/50 dark:text-red-400/50 mb-2 flex items-center gap-1">
                                    <span className={isAiLoading ? "animate-spin" : "animate-pulse"}>✨</span> AI Mentor
                                </div>
                                <div className="text-sm leading-relaxed font-medium">
                                    {result.ai_explanation}
                                    {isAiLoading && !result.ai_explanation && <span className="italic opacity-50">Gondolkodik...</span>}
                                    {isAiLoading && result.ai_explanation && <span className="inline-block w-1.5 h-4 ml-1 bg-red-400 animate-pulse align-middle"></span>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                <button 
                    onClick={showFeedback ? handleNext : handleResolve}
                    disabled={!showFeedback && isCheckDisabled()}
                    className={`w-full font-bold py-3 px-8 rounded-xl uppercase tracking-wider btn-shadow transition-colors ${
                        showFeedback 
                            ? (result?.isCorrect ? 'bg-green-600 text-white' : 'bg-red-500 text-white hover:bg-red-600')
                            : (isCheckDisabled() ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500' : 'bg-green-500 text-white hover:bg-green-600')
                    }`}
                >
                    {showFeedback ? (result?.isCorrect ? 'KÖVETKEZŐ' : 'ÉRTEM') : 'JAVÍTÁS BEKÜLDÉSE'}
                </button>
            </div>
        </footer>
    </div>
  );
}
