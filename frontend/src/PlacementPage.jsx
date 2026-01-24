import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import TheoryComponent from './question-types/TheoryComponent';
import PredictionComponent from './question-types/PredictionComponent';
import FillBlankComponent from './question-types/FillBlankComponent';
import ParsonsComponent from './question-types/ParsonsComponent';
import DebugComponent from './question-types/DebugComponent';
import ConstructionComponent from './question-types/ConstructionComponent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function PlacementPage() {
  const { session, profile, refreshProfile, showBadgeNotification, showNotification } = useOutletContext();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  // Answer State
  const [code, setCode] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [parsonsSolution, setParsonsSolution] = useState([]);
  
  // Feedback State
  const [result, setResult] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []); // Run only once on mount

  const fetchQuestions = async () => {
    if (!currentLanguage) return;
    try {
      const res = await fetch(`${API_URL}/questions/placement?languageId=${currentLanguage.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    const question = questions[currentIndex];
    let submissionData = null;
    if (question.qType === 'theory' || question.qType === 'predict_output') {
      submissionData = selectedOption;
    } else if (question.qType === 'parsons') {
      submissionData = JSON.stringify(parsonsSolution.map(b => b.id));
    } else {
      submissionData = code;
    }

    if (!submissionData && question.qType !== 'debug') {
        showNotification('Kérlek adj meg egy választ!', 'info');
        return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/questions/${question.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: submissionData, isPlacement: true }),
      });
      const data = await res.json();
      setResult(data);
      setShowFeedback(true);

      if (data.isCorrect) setScore(s => s + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setResult(null);
      setShowFeedback(false);
      setCode('');
      setSelectedOption(null);
      setParsonsSolution([]);
    } else {
      await finishPlacement();
    }
  };

  const finishPlacement = async () => {
    setLoading(true);
    try {
      // Calculate refined proficiency
      let newProficiency = profile.globalProficiency;
      const ratio = score / questions.length;
      if (ratio >= 0.9) newProficiency += 1.0;
      else if (ratio >= 0.7) newProficiency += 0.5;
      else if (ratio <= 0.3) newProficiency -= 0.5;
      
      newProficiency = Math.max(-3.0, Math.min(3.0, newProficiency));

      await fetch(`${API_URL}/users/complete-placement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ proficiency: newProficiency }),
      });
      
      setIsFinished(true);
      await refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Betöltés...</div>;
  if (questions.length === 0) return <div>Nincs elérhető kérdés a szintfelmérőhöz.</div>;

  if (isFinished) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100">
        <div className="bg-surface-light dark:bg-surface-dark p-12 rounded-3xl shadow-2xl text-center max-w-md w-full border border-slate-200 dark:border-slate-700 animate-fade-in">
          <div className="text-7xl mb-6">🎓</div>
          <h1 className="text-3xl font-extrabold mb-2">Szintfelmérő Kész!</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">Köszönjük! A profilodat sikeresen frissítettük a tudásodnak megfelelően.</p>
          
          <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl mb-10">
            <div className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-1">Eredményed</div>
            <div className="text-5xl font-black text-primary">{score} / {questions.length}</div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-bold text-xl transition-all shadow-lg hover:-translate-y-1"
          >
            Irány a Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  const renderQuestion = () => {
    switch (currentQuestion.qType) {
      case 'theory': 
        return <TheoryComponent question={currentQuestion} selectedAnswer={selectedOption} onSelect={setSelectedOption} />;
      case 'predict_output': 
        return <PredictionComponent question={currentQuestion} selectedAnswer={selectedOption} onSelect={setSelectedOption} />;
      case 'fill_in_blank': 
        return <FillBlankComponent question={currentQuestion} onCodeChange={setCode} />;
      case 'parsons': 
        return <ParsonsComponent question={currentQuestion} onSolutionChange={setParsonsSolution} />;
      case 'debug': 
        return <DebugComponent question={currentQuestion} onCodeChange={setCode} debugPhase="fix" selections={[]} onSelect={() => {}} />;
      case 'coding': 
        return <ConstructionComponent question={currentQuestion} onCodeChange={setCode} />;
      default: return <div>Ismeretlen kérdéstípus.</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark font-nunito">
      <div className="shrink-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="text-xl">🎯</div>
          <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
            {questions.map((_, idx) => (
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
                <span className="font-black text-slate-800 dark:text-slate-100 text-2xl tracking-tight">Szintfelmérő</span>
                <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-xs">
                    {currentIndex + 1} / {questions.length} KÉRDÉS
                </span>
              </div>
          </div>

          <div className="flex-1 animate-fade-in">
            {renderQuestion()}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
            {showFeedback && result && (
                <div className={`mb-6 p-6 rounded-3xl flex items-start gap-4 animate-in slide-in-from-bottom-4 duration-500 ${result.isCorrect ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100'}`}>
                    <div className="text-4xl">{result.isCorrect ? '🎉' : '💡'}</div>
                    <div className="flex-1">
                        <div className="font-black text-xl mb-1">{result.isCorrect ? 'Helyes!' : 'Sajnos nem...'}</div>
                        <div className="text-sm opacity-80 font-medium">
                            {result.isCorrect ? 'Szép munka, csak így tovább!' : (result.output || 'Folytassuk a következővel!')}
                        </div>
                    </div>
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
                    {submitting ? 'Ellenőrzés...' : showFeedback ? (currentIndex === questions.length - 1 ? 'Befejezés' : 'Következő') : 'Ellenőrzés'}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
