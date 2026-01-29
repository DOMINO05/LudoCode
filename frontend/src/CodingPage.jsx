import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import RichText from './components/RichText';
import { supabase } from './supabaseClient';
import { PISTON_API_URL } from './config';

import TheoryComponent from './question-types/TheoryComponent';
import PredictionComponent from './question-types/PredictionComponent';
import FillBlankComponent from './question-types/FillBlankComponent';
import ParsonsComponent from './question-types/ParsonsComponent';
import DebugComponent from './question-types/DebugComponent';
import ConstructionComponent from './question-types/ConstructionComponent';

import Editor from '@monaco-editor/react';

export default function CodingPage() {
  const { session, profile, refreshProfile, showBadgeNotification, showNotification } = useOutletContext();
  const { isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conceptId = searchParams.get('conceptId');
  const mode = searchParams.get('mode');
  const type = searchParams.get('type');

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [noQuestions, setNoQuestions] = useState(false);
  const [isCourseFinished, setIsCourseFinished] = useState(false);

  const [code, setCode] = useState(''); 
  const [parsonsSolution, setParsonsSolution] = useState([]); 
  const [selectedOption, setSelectedOption] = useState(null); 

  const [debugPhase, setDebugPhase] = useState('identify'); 
  const [debugSelections, setDebugSelections] = useState([]); 

  const [result, setResult] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showStaticHint, setShowStaticHint] = useState(false);
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
    
    setCode('');
    setParsonsSolution([]);
    setSelectedOption(null);
    setDebugPhase('identify');
    setDebugSelections([]);

    try {
      let data = null;
      let error = null;

      if (mode === 'dev') {
          const query = supabase.from('questions').select('*').eq('language_id', currentLanguage.id);
          if (type) query.eq('q_type', type);
          const { data: qData, error: qError } = await query.order('id', { ascending: false }).limit(50);
          if (qData && qData.length > 0) {
              data = qData[Math.floor(Math.random() * qData.length)];
          }
          error = qError;
      } else {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_next_adaptive_question', {
              p_language_id: currentLanguage.id,
              p_type: type || null
          });
          data = rpcData;
          error = rpcError;
      }

      if (error) throw error;

      if (!data) {
          if (conceptId) {
              setIsCourseFinished(true);
          } else {
              setNoQuestions(true); 
          }
          setQuestion(null);
          return;
      }

      const mappedQuestion = {
          ...data,
          qType: data.q_type,
          languageId: data.language_id,
          difficultyBeta: data.difficulty_beta,
          difficultyDisplay: data.difficulty_display,
          discriminationAlpha: data.discrimination_alpha,
          createdAt: data.created_at
      };

      setQuestion(mappedQuestion);
      
      if (mappedQuestion.content.initial_code) {
          setCode(mappedQuestion.content.initial_code);
      }
      
    } catch (err) {
      console.error(err);
      showNotification('Hiba a feladat betöltésekor: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
      if (!question) return;

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
               } else {
                   return;
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

    setIsChecking(true);
    try {
        let isCorrect = false;
        let output = '';
        const content = question.content;
        setShowStaticHint(false);

        if (question.qType === 'coding' || question.qType === 'construction') {
            const language = currentLanguage.name.toLowerCase();
            const version = language === 'python' ? '3.10.0' : (language === 'java' ? '15.0.2' : '*');
            
            const payload = {
                language: language,
                version: version,
                files: [{ name: `main.${language === 'python' ? 'py' : 'java'}`, content: submissionData }],
                stdin: "",
                args: [],
                compile_timeout: 10000,
                run_timeout: 3000,
                compile_memory_limit: -1,
                run_memory_limit: -1
            };

            const response = await fetch(PISTON_API_URL + "/execute", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.run && data.run.code === 0) {
                 output = data.run.stdout;
                 isCorrect = true; 
            } else {
                output = data.run ? (data.run.stderr || data.run.output) : "Execution failed";
                isCorrect = false;
            }

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

        const { data, error } = await supabase.rpc('complete_submission', {
            p_question_id: question.id,
            p_is_correct: isCorrect,
            p_submitted_answer: submissionData,
            p_execution_time_ms: 0, 
            p_streak: sessionStreak
        });

        if (error) throw error;

        const resultData = {
            ...data,
            isCorrect,
            output,
            explanation: content.explanation,
            correct_answer: content.correct_answer || content.correct_code || content.correct_order,
            hint: question.hint,
            ai_explanation: null
        };

        setResult(resultData);
        setShowFeedback(true);

        if (!isCorrect) {
            setIsAiLoading(true);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                setShowStaticHint(true);
                setIsAiLoading(false);
            }, 5000); 

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
                        language: currentLanguage.name
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const aiData = await response.json();
                    if (aiData.text) {
                        setShowStaticHint(false);
                        setResult(prev => ({ ...prev, ai_explanation: aiData.text }));
                    } else {
                        console.log("AI text was empty in response");
                        setShowStaticHint(true);
                    }
                } else {
                    const errText = await response.text();
                    console.error("AI Function non-ok response:", errText);
                    setShowStaticHint(true); 
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('AI explanation failed', err);
                }
                setShowStaticHint(true);
            } finally {
                setIsAiLoading(false);
            }
        }

        if (data.newBadges && data.newBadges.length > 0 && showBadgeNotification) {
            data.newBadges.forEach((badge, index) => {
                setTimeout(() => { showBadgeNotification(badge); }, index * 5500); 
            });
        }

        if (data.completedChallenges && data.completedChallenges.length > 0 && showBadgeNotification) {
             const badgeDelay = (data.newBadges?.length || 0) * 5500;
             data.completedChallenges.forEach((ch, index) => {
                setTimeout(() => {
                    showBadgeNotification({
                        name: ch.description,
                        title: 'Kihívás Teljesítve!',
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
        showNotification('Sikertelen beküldés', 'error');
      } finally {
        setIsChecking(false);
      }
  };

  const handleNext = () => {
      if (result && result.isCorrect) {
          fetchNextQuestion();
      } else {
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

  const renderContent = () => {
      if (!question || !question.content) return null;

      switch (question.qType) {
          case 'theory':
              return <TheoryComponent question={question} selectedAnswer={selectedOption} onSelect={setSelectedOption} />;
          case 'predict_output':
              return <PredictionComponent question={question} selectedAnswer={selectedOption} onSelect={setSelectedOption} />;
          case 'fill_in_blank':
              return <FillBlankComponent question={question} onCodeChange={setCode} />;
          case 'parsons':
              return <ParsonsComponent question={question} onSolutionChange={setParsonsSolution} />;
          case 'debug':
              return <DebugComponent question={question} onCodeChange={setCode} debugPhase={debugPhase} selections={debugSelections} onSelect={setDebugSelections} checkResult={result} />;
          case 'coding':
          case 'construction': 
              return <ConstructionComponent question={question} onCodeChange={setCode} />;
          default:
               return (
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h2>{question.title}</h2>
                      <div className="mb-4 text-lg text-slate-600 dark:text-slate-300">
                          <RichText content={question.description} />
                      </div>
                      <div style={{ flex: 1, border: '1px solid var(--card-border)', marginTop: '20px' }}>
                        <Editor height="100%" defaultLanguage={question.language || 'python'} value={code} onChange={(val) => setCode(val)} theme={isDark ? "vs-dark" : "light"} />
                      </div>
                  </div>
              );
      }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen bg-[#f7f7f7] dark:bg-slate-900">
        <img src="/Poly/thinking.svg" alt="Gondolkodó Poly" className="w-48 h-48 animate-bounce" />
        <div className="mt-4 text-xl font-bold text-blue-600 animate-pulse">Betöltés...</div>
    </div>
  );

  if (isCourseFinished) {
      return (
          <div className="flex flex-col items-center justify-center h-screen text-center text-slate-700">
              <div className="text-6xl mb-5">🎓</div>
              <h1 className="text-green-500 text-3xl font-bold">Témakör Teljesítve!</h1>
              <p className="text-lg max-w-xl mb-10 mt-4">Sikeresen megoldottad az összes feladatot ebben a témakörben.</p>
              <button onClick={() => navigate('/courses')} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-md hover:bg-blue-600 transition">Vissza a Tanuló Ösvényre</button>
          </div>
      );
  }

  if (noQuestions) {
      return (
          <div className="flex flex-col items-center justify-center h-screen text-center text-slate-700">
              <div className="text-6xl mb-5">🎉</div>
              <h1 className="text-green-500 text-3xl font-bold">Gratulálunk!</h1>
              <p className="text-lg max-w-xl mb-10 mt-4">{mode === 'dev' ? "Nincs ilyen típusú feladat az adatbázisban." : "Jelenleg nincs több feladat a szintednek megfelelően."}</p>
              <button onClick={() => navigate(type ? '/courses' : '/dashboard')} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-md hover:bg-blue-600 transition">{type ? "Vissza a választóhoz" : "Vissza a Dashboardra"}</button>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col text-slate-700 dark:text-slate-100 overflow-hidden font-nunito bg-[#f7f7f7] dark:bg-slate-900 transition-colors duration-300">
        <div className="px-4 pt-4 pb-2 shrink-0 max-w-md mx-auto w-full">
            <div className="flex items-center gap-4">
                <span className="text-2xl cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => navigate(type ? '/courses' : '/dashboard')}>✕</span>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full flex-grow overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${(profile?.sanityPoints || 0) <= 20 ? 'bg-red-500' : (profile?.sanityPoints || 0) <= 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${profile?.sanityPoints || 0}%` }}></div>
                </div>
                <span className="text-blue-500 font-bold flex items-center" title="Sanity">🧠 {profile?.sanityPoints}%</span>
            </div>
            {comboMultiplier > 1 && (
                <div className="flex justify-center mt-2 animate-in slide-in-from-top-1 fade-in duration-300">
                    <span className="bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold py-1 px-4 rounded-full text-sm shadow-lg border border-orange-200 flex items-center gap-2">🔥 Combo: {comboMultiplier.toFixed(1)}x</span>
                </div>
            )}
        </div>

        <main className="flex-grow overflow-y-auto w-full relative">
            <div className="flex flex-col items-center justify-between p-4 max-w-md mx-auto w-full min-h-full">
                <div className="w-full h-full flex flex-col">
                    {renderContent()}
                </div>
            </div>
            {isChecking && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                    <img src="/Poly/thinking.svg" alt="Gondolkodó Poly" className="w-40 h-40 animate-bounce" />
                    <div className="mt-4 text-lg font-bold text-blue-600">Ellenőrzés...</div>
                </div>
            )}
        </main>

        <footer className="shrink-0 p-4 border-t bg-white dark:bg-slate-800 dark:border-slate-700 z-10 transition-colors duration-300">
            <div className="max-w-md mx-auto w-full flex flex-col gap-4">
                {showFeedback && result && (
                    <div className={`rounded-xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 ${result.isCorrect ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">{result.isCorrect ? '🎉' : '⚠️'}</div>
                            <div className="flex-1">
                                <div className="font-bold text-lg">{result.isCorrect ? 'Tökéletes!' : 'Nem egészen...'}</div>
                                {(result.isCorrect || showStaticHint) && (
                                    <div className="text-sm opacity-90 animate-in fade-in duration-500">
                                        {result.isCorrect ? 'Helyes válasz. Csak így tovább!' : (result.explanation || result.compile_message || result.output || 'Próbáld újra átgondolni a logikát.')}
                                    </div>
                                )}
                            </div>
                        </div>
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
                    onClick={showFeedback ? handleNext : handleCheck}
                    disabled={!showFeedback && isCheckDisabled()}
                    className={`w-full font-bold py-3 px-8 rounded-xl uppercase tracking-wider btn-shadow transition-colors ${showFeedback ? (result?.isCorrect ? 'bg-green-600 text-white' : 'bg-red-500 text-white hover:bg-red-600') : (isCheckDisabled() ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500' : 'bg-green-500 text-white hover:bg-green-600')}`}
                >
                    {showFeedback ? (result?.isCorrect ? 'TOVÁBB' : 'ÉRTEM') : 'ELLENŐRZÉS'}
                </button>
            </div>
        </footer>
    </div>
  );
}
