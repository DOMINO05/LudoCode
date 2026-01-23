import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CommunityPage() {
  const { session } = useOutletContext();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareCode, setShareCode] = useState('');

  useEffect(() => {
    fetchPublicQuizzes();
  }, []);

  const fetchPublicQuizzes = async () => {
    try {
      const res = await fetch(`${API_URL}/quizzes/public`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
      }
    } catch (err) {
      console.error('Failed to fetch public quizzes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (shareCode.length !== 6) return;
    
    const code = shareCode.toUpperCase();
    
    // Check if it's a snippet first
    try {
        const res = await fetch(`${API_URL}/snippets/${code}`, {
             headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
            navigate(`/share/${code}`);
            return;
        }
    } catch (err) {
        console.error("Error checking snippet:", err);
    }

    // Fallback to quiz
    navigate(`/quiz/${code}`);
  };

  if (loading) return <div className="p-8 text-center">Loading community...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black mb-4 tracking-tight">Közösségi Kvízek</h1>
        <p className="text-slate-500 text-lg mb-8">Tanulj másoktól, vagy oszd meg saját tudásodat!</p>
        
        <form onSubmit={handleJoinByCode} className="max-w-md mx-auto flex gap-2">
            <input 
                type="text" 
                placeholder="6 karakteres kód..." 
                maxLength={6}
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                className="flex-1 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 outline-none focus:ring-4 focus:ring-primary/20 transition-all font-mono font-bold text-center tracking-widest text-xl uppercase"
            />
            <button 
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white px-8 rounded-2xl font-bold transition-all shadow-lg"
            >
                Ugrás
            </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {quizzes.filter(q => q.shareCode).map((quiz) => (
          <div
            key={quiz.id}
            onClick={() => navigate(`/quiz/${quiz.shareCode}`)}
            className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    📚
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Készítette</span>
                    <div className="font-bold text-sm">{quiz.creator?.username || 'Rendszer'}</div>
                    {quiz.creator?.bio && (
                        <div className="text-xs text-slate-500 italic mt-1 line-clamp-1 max-w-[150px]">
                            "{quiz.creator.bio}"
                        </div>
                    )}
                </div>
            </div>

            <h3 className="text-2xl font-black mb-4 leading-tight group-hover:text-primary transition-colors">
              {quiz.title}
            </h3>
            
            <div className="flex items-center gap-4 text-slate-500 font-bold text-sm">
                <span>❓ {quiz.questions?.length || 0} kérdés</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-primary">{quiz.shareCode}</span>
            </div>
          </div>
        ))}
      </div>
      
      {quizzes.length === 0 && (
          <div className="text-center py-20 text-slate-400">
              Még nincsenek publikus kvízek. Legyél te az első!
          </div>
      )}
    </div>
  );
}
