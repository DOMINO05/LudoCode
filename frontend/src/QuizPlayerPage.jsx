import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { PISTON_API_URL } from './config';
// import { validateTestCases } from './utils/codeRunner';
import TheoryComponent from './question-types/TheoryComponent';
import PredictionComponent from './question-types/PredictionComponent';
import FillBlankComponent from './question-types/FillBlankComponent';
import ParsonsComponent from './question-types/ParsonsComponent';
import DebugComponent from './question-types/DebugComponent';
import ConstructionComponent from './question-types/ConstructionComponent';

export default function QuizPlayerPage() {
  const { session, refreshProfile, showBadgeNotification, showNotification } = useOutletContext();
  const { code: shareCode } = useParams();
  const navigate = useNavigate();
  
  // Quiz State
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  // Answer State (Local for current question)
  const [code, setCode] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [parsonsSolution, setParsonsSolution] = useState([]);
  
  // Feedback State
  const [result, setResult] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showStaticHint, setShowStaticHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [shareCode]);

  const fetchQuiz = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
            *,
            questions:quiz_questions(
                *,
                question:questions(*)
            )
        `)
        .eq('share_code', shareCode)
        .single();

      if (error || !data) {
          showNotification('Kvíz nem található vagy nincs hozzáférésed.', 'error');
          navigate('/dashboard');
          return;
      }

      // Sort questions initially
      data.questions.sort((a, b) => a.order_index - b.order_index);
      
      // Remap field names if needed
      const mappedQuiz = {
          ...data,
          questions: data.questions.map(q => ({
              ...q,
              orderIndex: q.order_index,
              question: {
                  ...q.question,
                  q_type: q.question.q_type, // Ensure it's there
                  qType: q.question.q_type,   // Map for compatibility
                  languageId: q.question.language_id
              }
          }))
      };
      
      setQuiz(mappedQuiz);
    } catch (err) {
      console.error('Failed to fetch quiz', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    const currentQQ = quiz.questions[currentIndex];
    const question = currentQQ.question;
    
    let submissionData = null;
    if (question.q_type === 'theory' || question.q_type === 'predict_output') {
      submissionData = selectedOption;
    } else if (question.q_type === 'parsons') {
      submissionData = JSON.stringify(parsonsSolution.map(b => b.id));
    } else {
      submissionData = code;
    }

    if (!submissionData && question.q_type !== 'debug') {
        showNotification('Kérlek adj meg egy választ!', 'info');
        return;
    }

    setSubmitting(true);
    try {
      let isCorrect = false;
      let output = '';
      const content = question.content;
      setShowStaticHint(false);

      if (question.q_type === 'coding' || question.q_type === 'construction') {
          // Piston API call
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
      } else if (question.q_type === 'parsons') {
          const correctOrder = content.correct_order;
          const submittedOrder = JSON.parse(submissionData);
          isCorrect = JSON.stringify(correctOrder) === JSON.stringify(submittedOrder);
          output = isCorrect ? 'Sikeres futtatás' : 'Hibás sorrend';
      } else if (question.q_type === 'debug') {
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
          p_streak: 0
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
                      const lines = chunk.split('\n');
                      for (const line of lines) {
                          if (line.startsWith('data: ')) {
                              try {
                                  const data = JSON.parse(line.substring(6));
                                  if (data.text) {
                                      clearTimeout(hintTimer);
                                      setShowStaticHint(false);
                                      fullText += data.text;
                                      setResult(prev => ({ ...prev, ai_explanation: fullText }));
                                  }
                              } catch (e) {}
                          }
                      }
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

      if (data.newBadges && data.newBadges.length > 0 && showBadgeNotification) {
          data.newBadges.forEach((badge, index) => {
             setTimeout(() => showBadgeNotification(badge), index * 5500);
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
          setScore(s => s + 1);
      }
      refreshProfile();
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < quiz.questions.length - 1) {
      // Reset for next question
      setCurrentIndex(currentIndex + 1);
      setResult(null);
      setShowFeedback(false);
      setCode('');
      setSelectedOption(null);
      setParsonsSolution([]);
    } else {
      // Finish the whole quiz
      setIsFinished(true);

      // Submit final attempt to quiz results
      try {
        const { data, error } = await supabase.rpc('complete_quiz_attempt', {
            p_quiz_id: quiz.id,
            p_score: score,
            p_max_score: quiz.questions.length
        });

        if (error) throw error;

        if (data) {
            // Show notifications for new badges
            if (data.newBadges && data.newBadges.length > 0 && showBadgeNotification) {
                data.newBadges.forEach((badge, index) => {
                   setTimeout(() => showBadgeNotification(badge), index * 5500);
                });
            }

            // Show notifications for completed challenges
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

            refreshProfile();
        }
      } catch (err) {
        console.error('Failed to submit attempt', err);
      }
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Kvíz betöltése...</div>;
  if (!quiz) return null;

  const currentQQ = quiz.questions[currentIndex];
  const progress = (currentIndex / quiz.questions.length) * 100;

  if (isFinished) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-surface-light dark:bg-surface-dark p-12 rounded-3xl shadow-2xl text-center max-w-md w-full border border-slate-200 dark:border-slate-700">
          <div className="text-7xl mb-6">🏆</div>
          <h1 className="text-3xl font-extrabold mb-2">Gratulálunk!</h1>
          <p className="text-slate-500 mb-8">Befejezted a(z) <span className="font-bold text-slate-700 dark:text-slate-200">{quiz.title}</span> kvízt.</p>
          
          <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl mb-8">
            <div className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-1">Eredményed</div>
            <div className="text-5xl font-black text-primary">{score} / {quiz.questions.length}</div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-xl hover:bg-primary-dark transition-all shadow-lg"
          >
            Vissza a főoldalra
          </button>
        </div>
      </div>
    );
  }

  const renderQuestion = () => {
    const question = currentQQ.question;
    
    switch (question.q_type) {
      case 'theory': 
        return <TheoryComponent question={question} selectedAnswer={selectedOption} onSelect={setSelectedOption} />;
      case 'predict_output': 
        return <PredictionComponent question={question} selectedAnswer={selectedOption} onSelect={setSelectedOption} />;
      case 'fill_in_blank': 
        return <FillBlankComponent question={question} onCodeChange={setCode} />;
      case 'parsons': 
        return <ParsonsComponent question={question} onSolutionChange={setParsonsSolution} />;
      case 'debug': 
        return <DebugComponent question={question} onCodeChange={setCode} debugPhase="fix" selections={[]} onSelect={() => {}} />;
      case 'coding': 
        return <ConstructionComponent question={question} onCodeChange={setCode} />;
      default: return <div>Ismeretlen kérdéstípus.</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Progress Bar */}
      <div className="shrink-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="text-xl">🧘</div>
          <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
            {quiz.questions.map((_, idx) => (
              <div 
                key={idx}
                className={`h-full flex-1 transition-all duration-500 ${idx < currentIndex ? 'bg-primary' : idx === currentIndex ? 'bg-primary/40' : 'bg-slate-300 dark:bg-slate-700'}`}
              />
            ))}
          </div>
          <div className="text-xl">🏁</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-3xl mx-auto flex flex-col h-full">
          <div className="flex justify-between items-center mb-8 shrink-0">
              <div className="flex flex-col">
                <span className="font-black text-slate-800 dark:text-slate-100 text-xl">{quiz.title}</span>
                <span className="font-bold text-slate-400 uppercase tracking-widest text-xs">
                    {currentIndex + 1} / {quiz.questions.length} KÉRDÉS
                </span>
              </div>
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all"
              >
                ✕
              </button>
          </div>

          <div className="flex-1">
            {renderQuestion()}
          </div>

          {/* Footer / Feedback */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
            {showFeedback && result && (
                <div className={`mb-6 p-6 rounded-3xl flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500 ${result.isCorrect ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100'}`}>
                    <div className="flex items-start gap-4">
                        <div className="text-4xl">{result.isCorrect ? '🎉' : '💡'}</div>
                        <div className="flex-1">
                            <div className="font-black text-xl mb-1">{result.isCorrect ? 'Helyes!' : 'Sajnos nem...'}</div>
                            {(result.isCorrect || showStaticHint) && (
                                <div className="text-sm opacity-80 font-medium animate-in fade-in duration-500">
                                    {result.isCorrect ? 'Szép munka, csak így tovább!' : (result.output || 'Próbáld újra a következőnél!')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Mentor Section */}
                    {!result.isCorrect && (isAiLoading || result.ai_explanation) && (
                        <div className="pt-4 border-t border-red-200 dark:border-red-800/50">
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

            <div className="flex justify-end">
                <button
                    onClick={showFeedback ? handleNext : handleCheck}
                    disabled={submitting}
                    className={`px-12 py-4 rounded-2xl font-black text-xl transition-all shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 ${
                        showFeedback 
                        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' 
                        : 'bg-primary text-white'
                    }`}
                >
                    {submitting ? 'Ellenőrzés...' : showFeedback ? (currentIndex === quiz.questions.length - 1 ? 'Befejezés' : 'Következő') : 'Ellenőrzés'}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
