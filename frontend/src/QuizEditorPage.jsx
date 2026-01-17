import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import QuestionSearchModal from './components/QuestionSearchModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function QuizEditorPage() {
  const { session } = useOutletContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [title, setTitle] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`${API_URL}/quizzes/${id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setQuiz(data);
        setTitle(data.title);
        setIsPublic(data.isPublic);
      }
    } catch (err) {
      console.error('Failed to fetch quiz', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuiz = async () => {
    try {
      const res = await fetch(`${API_URL}/quizzes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title, isPublic }),
      });
      if (res.ok) {
        // Updated
      }
    } catch (err) {
      console.error('Failed to update quiz', err);
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    try {
      const res = await fetch(`${API_URL}/quizzes/${id}/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        setQuiz({
          ...quiz,
          questions: quiz.questions.filter((q) => q.questionId !== questionId),
        });
      }
    } catch (err) {
      console.error('Failed to remove question', err);
    }
  };

  const handleAddExistingQuestion = async (question) => {
    try {
      const res = await fetch(`${API_URL}/quizzes/${id}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          questionId: question.id,
          orderIndex: quiz.questions?.length || 0,
        }),
      });

      if (res.ok) {
        const newQQ = await res.json();
        // Since we need the full question object for display
        newQQ.question = question;
        setQuiz({
          ...quiz,
          questions: [...(quiz.questions || []), newQQ],
        });
        setIsSearchOpen(false);
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to add question');
      }
    } catch (err) {
      console.error('Failed to add question', err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading quiz editor...</div>;
  if (!quiz) return <div className="p-8 text-center">Quiz not found.</div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/quizzes')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
        >
          ⬅️
        </button>
        <h1 className="text-3xl font-extrabold">Kvíz Szerkesztése</h1>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Kvíz neve
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleUpdateQuiz}
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-primary transition-all font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Láthatóság
            </label>
            <div className="flex items-center gap-4 h-12">
              <button
                onClick={() => {
                    const newVal = !isPublic;
                    setIsPublic(newVal);
                    // Force update immediately for toggle
                    fetch(`${API_URL}/quizzes/${id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ title, isPublic: newVal }),
                      });
                }}
                className={`flex-1 py-2 px-4 rounded-xl font-bold transition-all ${
                  isPublic
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {isPublic ? '🌐 Publikus' : '🔒 Privát'}
              </button>
              <div className="flex-1 text-center bg-primary/5 rounded-xl py-1 border border-primary/10">
                <span className="text-[10px] text-primary/60 block uppercase font-black">Megosztó kód</span>
                <span className="font-mono text-2xl font-black text-primary tracking-[0.2em]">{quiz.shareCode || '??????'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Kérdések ({quiz.questions?.length || 0})</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => navigate(`/quizzes/${id}/new-question`)}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
            >
                + Új Kérdés
            </button>
            <button 
                onClick={() => setIsSearchOpen(true)}
                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-4 py-2 rounded-xl font-bold text-sm transition-all"
            >
                🔍 Meglévő Kérdések
            </button>
        </div>
      </div>

      <div className="space-y-4">
        {quiz.questions?.sort((a,b) => a.orderIndex - b.orderIndex).map((qq, index) => (
          <div
            key={qq.questionId}
            className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 group"
          >
            <div className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-slate-400">
              {index + 1}
            </div>
            <div className="flex-1">
              <h4 className="font-bold">{qq.question.title}</h4>
              <p className="text-sm text-slate-500">{qq.question.qType} • {qq.question.languageId}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-tighter">ID: {qq.questionId}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                    onClick={() => navigate(`/quizzes/${id}/edit-question/${qq.questionId}`)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Szerkesztés"
                >
                    ✏️
                </button>
                <button
                    onClick={() => handleRemoveQuestion(qq.questionId)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    title="Eltávolítás"
                >
                    🗑️
                </button>
            </div>
          </div>
        ))}
        {(!quiz.questions || quiz.questions.length === 0) && (
            <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                Még nincsenek kérdések a kvízben.
            </div>
        )}
      </div>

      <QuestionSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleAddExistingQuestion}
        session={session}
      />
    </div>
  );
}
