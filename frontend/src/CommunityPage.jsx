import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Users, Search, BookOpen, Trophy } from 'lucide-react';
import { supabase } from './supabaseClient';

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
      const { data, error } = await supabase
        .from('custom_quizzes')
        .select('*, creator:profiles(username, bio)')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      // Manually fetch question counts for each quiz if needed, 
      // or just assume they exist.
      setQuizzes(data || []);
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
        const { data } = await supabase
            .from('shared_snippets')
            .select('share_code')
            .eq('share_code', code)
            .single();
            
        if (data) {
            navigate(`/share/${code}`);
            return;
        }
    } catch (err) {
        // Not found is fine
    }

    // Fallback to quiz
    navigate(`/quiz/${code}`);
  };

  if (loading) return <div className="p-8 text-center">Loading community...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <div className="inline-block p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Users className="text-blue-500 w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tight uppercase">Közösség</h1>
        <p className="text-slate-500 text-lg mb-8 font-medium">Tanulj másoktól, vagy oszd meg saját tudásodat!</p>
        
        <form onSubmit={handleJoinByCode} className="max-w-md mx-auto flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="6 KARAKTERES KÓD..." 
                    maxLength={6}
                    value={shareCode}
                    onChange={(e) => setShareCode(e.target.value)}
                    className="w-full p-4 pl-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 outline-none transition-all font-mono font-bold text-center tracking-widest text-xl uppercase"
                />
            </div>
            <button 
                type="submit"
                className="bg-blue-500 hover:bg-blue-400 text-white px-8 rounded-2xl font-bold transition-all shadow-lg border-b-4 border-blue-700 active:border-b-0 active:translate-y-[4px] uppercase tracking-wider"
            >
                Ugrás
            </button>
        </form>
      </div>

      <div className="flex items-center gap-3 mb-8 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
          <button 
            className="px-6 py-2 bg-blue-500 text-white font-bold rounded-xl shadow-md border-b-4 border-blue-700 uppercase tracking-wider text-sm"
          >
            Publikus Kvízek
          </button>
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
                <span>❓ {quiz.share_code}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-primary">{quiz.share_code}</span>
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
