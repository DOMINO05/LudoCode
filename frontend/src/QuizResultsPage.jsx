import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function QuizResultsPage() {
  const { session } = useOutletContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_submissions')
        .select(`
            *,
            user:profiles(username)
        `)
        .eq('quiz_id', id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setResults(data.map(r => ({
            ...r,
            maxScore: r.max_score,
            completedAt: r.completed_at,
            startedAt: r.started_at
        })));
      }
    } catch (err) {
      console.error('Failed to fetch results', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading results...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/quizzes')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
        >
          ⬅️
        </button>
        <h1 className="text-3xl font-extrabold">Kvíz Eredmények</h1>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Felhasználó</th>
              <th className="p-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Pontszám</th>
              <th className="p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Dátum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.map((result) => (
              <tr key={result.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <td className="p-4 font-bold">{result.user?.username || 'Anonymous'}</td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full font-black ${result.score / result.maxScore >= 0.8 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {result.score} / {result.maxScore}
                  </span>
                </td>
                <td className="p-4 text-slate-500 text-sm">
                  {new Date(result.completedAt || result.startedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {results.length === 0 && (
                <tr>
                    <td colSpan="3" className="p-12 text-center text-slate-400 italic">
                        Még senki sem töltötte ki ezt a kvízt.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
