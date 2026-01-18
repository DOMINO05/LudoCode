import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';

// Import New Question Components
import TheoryComponent from './question-types/TheoryComponent';
import PredictionComponent from './question-types/PredictionComponent';
import FillBlankComponent from './question-types/FillBlankComponent';
import ParsonsComponent from './question-types/ParsonsComponent';
import DebugComponent from './question-types/DebugComponent';
import ConstructionComponent from './question-types/ConstructionComponent';

// Fallback for types not yet fully implemented or standard 'coding'
import Editor from '@monaco-editor/react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CodingPage() {
  const { session, profile, refreshProfile, showBadgeNotification } = useOutletContext();
  const { isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conceptId = searchParams.get('conceptId');
  const mode = searchParams.get('mode');
  const type = searchParams.get('type');

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
  const [debugSelections, setDebugSelections] = useState([]); // Array of { lineIndex, tokenIndex, text }

  // Result & Feedback
  const [result, setResult] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionStreak, setSessionStreak] = useState(0);

  const comboMultiplier = sessionStreak >= 2 ? 1.3 + (sessionStreak - 2) * 0.1 : 1.0;

  useEffect(() => {
    if (currentLanguage) {
        fetchNextQuestion();
    }
  }, [currentLanguage]);

  const fetchNextQuestion = async () => {
    if (!currentLanguage) return;
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
    setDebugSelections([]);

    let url = `${API_URL}/questions/next?languageId=${currentLanguage.id}`;
    if (conceptId) {
        url = `${API_URL}/courses/${conceptId}/next-question?languageId=${currentLanguage.id}`;
    } else if (type) {
        url = `${API_URL}/questions/next?languageId=${currentLanguage.id}&type=${type}`;
    } else if (mode === 'dev') {
        url = `${API_URL}/questions/random?type=${type}&languageId=${currentLanguage.id}`;
    }

    console.log(`[Frontend] Fetching question from: ${url}`);
    console.log(`[Frontend] Params: mode=${mode}, type=${type}, conceptId=${conceptId}`);

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      console.log(`[Frontend] Response status: ${res.status}`);

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
          if (debugSelections.length === 0) {
              alert("Kérlek válassz ki legalább egy elemet!");
              return;
          }
          
          // Construct selected text from tokens, sorting them first to be safe
          const sortedSelections = [...debugSelections].sort((a, b) => {
              if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex;
              return a.tokenIndex - b.tokenIndex;
          });
          
          const selectedText = sortedSelections.map(s => s.text).join('');
          const errorLocation = question.content.error_location ? question.content.error_location.trim() : "";
          
          // Compare ignoring whitespace to be more forgiving
          const normalizedSelected = selectedText.replace(/\s+/g, '');
          const normalizedError = errorLocation.replace(/\s+/g, '');

          if (normalizedSelected === normalizedError || normalizedError.includes(normalizedSelected)) {
               // Correct Phase A
               setDebugPhase('fix');
               
               // If the user has already selected a fix (code is modified), proceed to submission immediately
               // to avoid requiring a second click.
               if (code && question.content.buggy_code && code.trim() !== question.content.buggy_code.trim()) {
                   // Fall through to submission logic below
               } else {
                   return; // Wait for user to select a fix
               }
          } else {
              // Incorrect Phase A
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
          // Coding, FillBlank, Construction, Debug (Fix Phase)
          submissionData = code;
      }

      if (submissionData === null || submissionData === '' || (Array.isArray(submissionData) && submissionData.length === 0)) {
          alert("Please provide an answer first.");
          return;
      }

    try {
        console.log(`[Frontend] Submitting answer to ${API_URL}/questions/${question.id}/submit`);
        console.log(`[Frontend] Submission data:`, { code: submissionData, streak: sessionStreak });

        const res = await fetch(`${API_URL}/questions/${question.id}/submit`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ code: submissionData, streak: sessionStreak })
        });
        const data = await res.json();
        console.log(`[Frontend] Submission response:`, data);
        setResult(data);
        setShowFeedback(true);

        // Check for new badges
        if (data.newBadges && data.newBadges.length > 0 && showBadgeNotification) {
            console.log("Triggering badge notification for:", data.newBadges);
            data.newBadges.forEach((badge, index) => {
                setTimeout(() => {
                    showBadgeNotification(badge);
                }, index * 5500); // 5000ms is duration + 500ms buffer
            });
        }

        // Check for completed challenges
        if (data.completedChallenges && data.completedChallenges.length > 0 && showBadgeNotification) {
             console.log("Triggering challenge notification for:", data.completedChallenges);
             const badgeDelay = (data.newBadges?.length || 0) * 5500;
             
             data.completedChallenges.forEach((ch, index) => {
                setTimeout(() => {
                    showBadgeNotification({
                        name: ch.description,
                        iconPath: '🎯' 
                    });
                }, badgeDelay + index * 5500);
             });
        }

        if (data.isCorrect) {
            setSessionStreak(prev => prev + 1);
        } else {
            setSessionStreak(0);
        }
        
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
          // If incorrect, check if we should transition Debug phase
          if (question.qType === 'debug' && debugPhase === 'identify') {
              // User failed identification, move to fix phase automatically
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
          return !code || code === question.content.buggy_code; // Ideally check if code changed
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

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  if (isCourseFinished) {
      return (
          <div className="flex flex-col items-center justify-center h-screen text-center text-slate-700">
              <div className="text-6xl mb-5">🎓</div>
              <h1 className="text-green-500 text-3xl font-bold">Témakör Teljesítve!</h1>
              <p className="text-lg max-w-xl mb-10 mt-4">
                  Sikeresen megoldottad az összes feladatot ebben a témakörben.
              </p>
              <button onClick={() => navigate('/courses')} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-md hover:bg-blue-600 transition">
                  Vissza a Tanuló Ösvényre
              </button>
          </div>
      );
  }

  if (noQuestions) {
      return (
          <div className="flex flex-col items-center justify-center h-screen text-center text-slate-700">
              <div className="text-6xl mb-5">🎉</div>
              <h1 className="text-green-500 text-3xl font-bold">Gratulálunk!</h1>
              <p className="text-lg max-w-xl mb-10 mt-4">
                  {mode === 'dev' 
                      ? "Nincs ilyen típusú feladat az adatbázisban." 
                      : "Jelenleg nincs több feladat a szintednek megfelelően."}
              </p>
              <button onClick={() => navigate(type ? '/courses' : '/dashboard')} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-md hover:bg-blue-600 transition">
                  {type ? "Vissza a választóhoz" : "Vissza a Dashboardra"}
              </button>
          </div>
      );
  }

  return (
    <div className="h-screen flex flex-col text-slate-700 dark:text-slate-100 overflow-hidden font-nunito bg-[#f7f7f7] dark:bg-slate-900 transition-colors duration-300">
        {/* Progress Bar Area */}
        <div className="px-4 pt-4 pb-2 shrink-0 max-w-md mx-auto w-full">
            <div className="flex items-center gap-4">
                <span className="text-2xl cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => navigate(type ? '/courses' : '/dashboard')}>✕</span>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full flex-grow overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: '30%' }}></div>
                </div>
                <span className="text-blue-500 font-bold flex items-center" title="Sanity">🧠 {profile?.sanityPoints}%</span>
            </div>
            {comboMultiplier > 1 && (
                <div className="flex justify-center mt-2 animate-in slide-in-from-top-1 fade-in duration-300">
                    <span className="bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold py-1 px-4 rounded-full text-sm shadow-lg border border-orange-200 flex items-center gap-2">
                        🔥 Combo: {comboMultiplier.toFixed(1)}x
                    </span>
                </div>
            )}
        </div>

        {/* Main Content */}
        <main className="flex-grow flex flex-col items-center justify-between p-4 max-w-md mx-auto w-full overflow-y-auto">
            <div className="w-full h-full flex flex-col">
                {renderContent()}
            </div>
        </main>

        {/* Footer */}
        <footer className="p-4 border-t bg-white dark:bg-slate-800 dark:border-slate-700 shrink-0 z-10 transition-colors duration-300">
            <div className="max-w-md mx-auto w-full flex flex-col gap-4">
                {/* Inline Feedback Area */}
                {showFeedback && result && (
                    <div className={`rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${result.isCorrect ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
                        <div className="text-3xl">{result.isCorrect ? '🎉' : '⚠️'}</div>
                        <div className="flex-1">
                            <div className="font-bold text-lg">{result.isCorrect ? 'Tökéletes!' : 'Nem egészen...'}</div>
                            {!result.isCorrect && result.ai_explanation ? (
                                <div className="mt-1">
                                    <div className="text-xs font-black uppercase tracking-wider text-red-600/50 dark:text-red-400/50 mb-1 flex items-center gap-1">
                                        <span className="animate-pulse">✨</span> AI Mentor Magyarázata
                                    </div>
                                    <div className="text-sm leading-relaxed font-medium">
                                        {result.ai_explanation}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm opacity-90">
                                    {result.isCorrect ? 'Helyes válasz. Csak így tovább!' : (result.explanation || result.compile_message || result.output || 'Próbáld újra átgondolni a logikát.')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                <button 
                    onClick={showFeedback ? handleNext : handleCheck}
                    disabled={!showFeedback && isCheckDisabled()}
                    className={`w-full font-bold py-3 px-8 rounded-xl uppercase tracking-wider btn-shadow transition-colors ${
                        showFeedback 
                            ? (result?.isCorrect ? 'bg-green-600 text-white' : 'bg-red-500 text-white hover:bg-red-600')
                            : (isCheckDisabled() ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500' : 'bg-green-500 text-white hover:bg-green-600')
                    }`}
                >
                    {showFeedback ? (result?.isCorrect ? 'TOVÁBB' : 'ÉRTEM') : 'ELLENŐRZÉS'}
                </button>
            </div>
        </footer>
    </div>
  );
}
