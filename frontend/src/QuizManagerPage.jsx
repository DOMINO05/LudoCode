import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function QuizManagerPage() {
  const { session } = useOutletContext();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch(`${API_URL}/quizzes/my-quizzes`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
      }
    } catch (err) {
      console.error('Failed to fetch quizzes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;

    try {
      const res = await fetch(`${API_URL}/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title: newQuizTitle }),
      });

      if (res.ok) {
        const newQuiz = await res.json();
        setQuizzes([newQuiz, ...quizzes]);
        setNewQuizTitle('');
        setIsCreating(false);
        navigate(`/quizzes/edit/${newQuiz.id}`);
      }
    } catch (err) {
      console.error('Failed to create quiz', err);
    }
  };

  const handleDeleteQuiz = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const res = await fetch(`${API_URL}/quizzes/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        setQuizzes(quizzes.filter((q) => q.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete quiz', err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading quizzes...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Saját Kvízek</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
        >
          + Új Kvíz
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Új Kvíz Létrehozása</h2>
            <form onSubmit={handleCreateQuiz}>
              <input
                type="text"
                placeholder="Kvíz címe..."
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 mb-4 outline-none focus:ring-2 focus:ring-primary transition-all"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-all"
                >
                  Létrehozás
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 bg-slate-200 dark:bg-slate-600 py-3 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-500 transition-all"
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark p-12 rounded-3xl text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-xl font-bold mb-2 text-slate-400">Még nincs saját kvízed</h2>
          <p className="text-slate-500 mb-6">Hozd létre az elsőt, és oszd meg másokkal!</p>
          <button
            onClick={() => setIsCreating(true)}
            className="text-primary font-bold hover:underline"
          >
            Létrehozás most
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold line-clamp-2">{quiz.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${quiz.isPublic ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {quiz.isPublic ? 'Publikus' : 'Privát'}
                </span>
              </div>
              
              <div className="text-sm text-slate-500 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span>❓ {quiz.questions?.length || 0} kérdés</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🔑 Kód: <span className="font-mono font-bold text-primary">{quiz.shareCode}</span></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate(`/quizzes/edit/${quiz.id}`)}
                  className="bg-slate-100 dark:bg-slate-700 py-2 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Szerkesztés
                </button>
                <button
                  onClick={() => navigate(`/quizzes/results/${quiz.id}`)}
                  className="bg-slate-100 dark:bg-slate-700 py-2 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Eredmények
                </button>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="col-span-2 text-red-500 text-sm font-bold hover:text-red-600 mt-2 transition-all opacity-0 group-hover:opacity-100"
                >
                  Törlés
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
