import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function QuestionSearchModal({ isOpen, onClose, onSelect, session }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    title: '',
    qType: '',
    languageId: '',
    onlyMine: false,
  });

  useEffect(() => {
    if (isOpen) {
      handleSearch();
    }
  }, [isOpen]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      let query = supabase.from('questions').select('*');
      
      if (filter.title) query = query.ilike('title', `%${filter.title}%`);
      if (filter.qType) query = query.eq('q_type', filter.qType);
      if (filter.onlyMine) query = query.eq('creator_id', session.user.id);
      
      // We need language ID mapping if filter.languageId is a name
      // Simple approach: if languageId is set, we'd need another query to get the ID, 
      // but for now let's assume it matches.
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      
      if (data) {
        setQuestions(data.map(q => ({
            ...q,
            qType: q.q_type,
            languageId: q.language_id
        })));
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-surface-light dark:bg-surface-dark w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-2xl font-black">Kérdések Hozzáadása</h2>
          <button onClick={onClose} className="text-2xl hover:scale-110 transition-transform">✕</button>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Keresés címre..."
            value={filter.title}
            onChange={(e) => setFilter({ ...filter, title: e.target.value })}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 outline-none border border-slate-200 dark:border-slate-700"
          />
          <select
            value={filter.qType}
            onChange={(e) => setFilter({ ...filter, qType: e.target.value })}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 outline-none border border-slate-200 dark:border-slate-700 font-bold"
          >
            <option value="">Összes típus</option>
            <option value="theory">Theory</option>
            <option value="coding">Coding</option>
            <option value="debug">Debug</option>
            <option value="parsons">Parsons</option>
            <option value="fill_in_blank">Fill Blank</option>
            <option value="predict_output">Predict Output</option>
          </select>
          <select
            value={filter.languageId}
            onChange={(e) => setFilter({ ...filter, languageId: e.target.value })}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 outline-none border border-slate-200 dark:border-slate-700 font-bold"
          >
            <option value="">Összes nyelv</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="onlyMine"
              checked={filter.onlyMine}
              onChange={(e) => setFilter({ ...filter, onlyMine: e.target.checked })}
              className="w-5 h-5 accent-primary"
            />
            <label htmlFor="onlyMine" className="text-sm font-bold cursor-pointer">Csak saját</label>
          </div>
          <button
            onClick={handleSearch}
            className="bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all"
          >
            Keresés
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Keresés...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic">Nincs találat.</div>
          ) : (
            questions.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex-1">
                  <h4 className="font-bold">{q.title}</h4>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">{q.qType} • {q.languageId}</p>
                </div>
                <button
                  onClick={() => onSelect(q)}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-xl font-bold transition-all"
                >
                  + Hozzáadás
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
