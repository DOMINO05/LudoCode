import React, { useState } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function QuestionCreatorPage() {
  const { session } = useOutletContext();
  const { quizId, questionId } = useParams();
  const navigate = useNavigate();
  const [qType, setQType] = useState('theory');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [languages, setLanguages] = useState([]);
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  React.useEffect(() => {
    const init = async () => {
        await fetchLanguages();
        if (questionId) {
            await fetchQuestion();
        }
        setInitialLoading(false);
    };
    init();
  }, [questionId]);

  const fetchLanguages = async () => {
      try {
          const { data, error } = await supabase.from('languages').select('*');
          if (!error && data) {
              setLanguages(data);
              if (!languageId && data.length > 0) {
                  setLanguageId(data[0].id);
              }
          }
      } catch (err) {
          console.error("Failed to fetch languages", err);
      }
  };

  const fetchQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (error) throw error;
      
      if (data) {
        setQType(data.q_type);
        setTitle(data.title);
        setDescription(data.description);
        setLanguageId(data.language_id);
        setContent(data.content);
      }
    } catch (err) {
      console.error('Failed to fetch question', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const questionPayload = {
        title: title || `Saját kérdés - ${new Date().toLocaleDateString()}`,
        description,
        q_type: qType,
        language_id: languageId,
        content,
        creator_id: session.user.id
      };

      let question;
      if (questionId) {
          const { data, error } = await supabase
            .from('questions')
            .update(questionPayload)
            .eq('id', questionId)
            .select()
            .single();
          if (error) throw error;
          question = data;
      } else {
          const { data, error } = await supabase
            .from('questions')
            .insert(questionPayload)
            .select()
            .single();
          if (error) throw error;
          question = data;
      }

      if (question && !questionId) {
          // 2. Add to quiz only if it's a new question
          const { error: quizError } = await supabase
            .from('quiz_questions')
            .insert({
                quiz_id: quizId,
                question_id: question.id,
                order_index: 999
            });
          if (quizError) throw quizError;
      }

      navigate(`/quizzes/edit/${quizId}`);
    } catch (err) {
      console.error('Failed to save question', err);
    } finally {
      setLoading(false);
    }
  };

  const renderTypeFields = () => {
    switch (qType) {
      case 'theory':
      case 'predict_output':
        return (
          <div className="space-y-4">
            {qType === 'predict_output' && (
                <textarea
                    placeholder="Kód részlet aminek a kimenetét meg kell jósolni..."
                    className="w-full p-3 h-32 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-mono"
                    value={content.code_snippet || ''}
                    onChange={(e) => setContent({ ...content, code_snippet: e.target.value })}
                />
            )}
            <input
              type="text"
              placeholder={qType === 'theory' ? "Kérdés szövege..." : "Kérdés (pl. Mi lesz a kimenet?)"}
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none"
              value={content.question || ''}
              onChange={(e) => setContent({ ...content, question: e.target.value })}
            />
            {['A', 'B', 'C', 'D'].map((opt) => (
              <div key={opt} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Opció ${opt}...`}
                  className="flex-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none"
                  value={content.options?.[opt.charCodeAt(0) - 65] || ''}
                  onChange={(e) => {
                    const options = [...(content.options || ['', '', '', ''])];
                    const idx = opt.charCodeAt(0) - 65;
                    options[idx] = e.target.value;
                    setContent({ ...content, options });
                  }}
                />
                <button
                  type="button"
                  onClick={() => setContent({ ...content, correct_answer: opt.charCodeAt(0) - 65 })}
                  className={`px-4 rounded-xl font-bold ${content.correct_answer === opt.charCodeAt(0) - 65 ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-600'}`}
                >
                  {opt}
                </button>
              </div>
            ))}
          </div>
        );
      case 'parsons':
        return (
            <div className="space-y-4">
                <textarea
                    placeholder="Feladat leírása..."
                    className="w-full p-3 h-32 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none"
                    value={content.problem_description || ''}
                    onChange={(e) => setContent({ ...content, problem_description: e.target.value })}
                />
                <textarea
                    placeholder="Helyes megoldás (soronként)..."
                    className="w-full p-3 h-48 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-mono"
                    value={content.solution || ''}
                    onChange={(e) => setContent({ ...content, solution: e.target.value })}
                />
                <p className="text-xs text-slate-500 italic">A backend automatikusan felbontja a megoldást blokkokra és összekeveri őket a játékosnak.</p>
            </div>
        )
      case 'debug':
        return (
            <div className="space-y-4">
                <textarea
                    placeholder="Hibás kód..."
                    className="w-full p-3 h-32 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-mono"
                    value={content.buggy_code || ''}
                    onChange={(e) => setContent({ ...content, buggy_code: e.target.value })}
                />
                <textarea
                    placeholder="Hiba helye (melyik részt kell kicserélni)..."
                    className="w-full p-3 h-20 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-mono"
                    value={content.error_location || ''}
                    onChange={(e) => setContent({ ...content, error_location: e.target.value })}
                />
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase">Lehetséges javítások (Opciók)</label>
                    {['A', 'B', 'C', 'D'].map((opt) => (
                        <div key={opt} className="flex gap-2">
                            <input
                                type="text"
                                placeholder={`Opció ${opt}...`}
                                className="flex-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none"
                                value={content.options?.[opt.charCodeAt(0) - 65] || ''}
                                onChange={(e) => {
                                    const options = [...(content.options || ['', '', '', ''])];
                                    const idx = opt.charCodeAt(0) - 65;
                                    options[idx] = e.target.value;
                                    setContent({ ...content, options });
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setContent({ ...content, correct_answer: opt.charCodeAt(0) - 65 })}
                                className={`px-4 rounded-xl font-bold ${content.correct_answer === opt.charCodeAt(0) - 65 ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-600'}`}
                            >
                                {opt}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
      case 'fill_in_blank':
        return (
            <div className="space-y-4">
                <textarea
                    placeholder="Kód (a hiányzó rész helyére írd: {{BLANK}})..."
                    className="w-full p-3 h-32 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-mono"
                    value={content.initial_code || ''}
                    onChange={(e) => setContent({ ...content, initial_code: e.target.value })}
                />
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        <strong>Magyarázat:</strong> A kiegészítendő rész helyére írd hogy <code>{`{{BLANK}}`}</code>. 
                        Példa: <code>{`{{BLANK}}.out.println("szöveg");`}</code>
                    </p>
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase">Helyes és rossz válaszok (Opciók)</label>
                    {['A', 'B', 'C', 'D'].map((opt) => (
                        <div key={opt} className="flex gap-2">
                            <input
                                type="text"
                                placeholder={`Opció ${opt}...`}
                                className="flex-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none"
                                value={content.options?.[opt.charCodeAt(0) - 65] || ''}
                                onChange={(e) => {
                                    const options = [...(content.options || ['', '', '', ''])];
                                    const idx = opt.charCodeAt(0) - 65;
                                    options[idx] = e.target.value;
                                    setContent({ ...content, options });
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setContent({ ...content, correct_answer: opt.charCodeAt(0) - 65 })}
                                className={`px-4 rounded-xl font-bold ${content.correct_answer === opt.charCodeAt(0) - 65 ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-600'}`}
                            >
                                {opt}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
      case 'coding':
        return (
            <div className="space-y-4">
                <textarea
                    placeholder="Feladat leírása..."
                    className="w-full p-3 h-32 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none"
                    value={content.problem_description || ''}
                    onChange={(e) => setContent({ ...content, problem_description: e.target.value })}
                />
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Beviteli mód</label>
                    <div className="flex gap-2">
                        {[
                            { id: 'keyboard', label: 'Billentyűzet' },
                            { id: 'blocks', label: 'Kódblokkok' },
                            { id: 'both', label: 'Mindkettő' }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                type="button"
                                onClick={() => setContent({ ...content, input_mode: mode.id })}
                                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${content.input_mode === mode.id ? 'bg-primary text-white' : 'bg-white dark:bg-slate-700 text-slate-500'}`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>

                <textarea
                    placeholder="Helyes megoldás (Kódblokkoknál ebből generálunk blokkokat)..."
                    className="w-full p-3 h-32 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-mono"
                    value={content.solution || ''}
                    onChange={(e) => setContent({ ...content, solution: e.target.value })}
                />

                <textarea
                    placeholder="Kezdő kód (opcionális)..."
                    className="w-full p-3 h-24 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-mono"
                    value={content.initial_code || ''}
                    onChange={(e) => setContent({ ...content, initial_code: e.target.value })}
                />

                <div className="pt-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Teszt esetek</label>
                    <div className="space-y-3">
                        {(content.test_cases || []).map((tc, idx) => (
                            <div key={idx} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex-1 space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="Input (pl. [1, 2], 5)" 
                                        className="w-full p-2 text-sm rounded bg-white dark:bg-slate-700 outline-none border border-slate-200 dark:border-slate-600 font-mono"
                                        value={tc.input}
                                        onChange={(e) => {
                                            const newTC = [...content.test_cases];
                                            newTC[idx].input = e.target.value;
                                            setContent({ ...content, test_cases: newTC });
                                        }}
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Expected Output (pl. 3)" 
                                        className="w-full p-2 text-sm rounded bg-white dark:bg-slate-700 outline-none border border-slate-200 dark:border-slate-600 font-mono"
                                        value={tc.expected_output}
                                        onChange={(e) => {
                                            const newTC = [...content.test_cases];
                                            newTC[idx].expected_output = e.target.value;
                                            setContent({ ...content, test_cases: newTC });
                                        }}
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const newTC = content.test_cases.filter((_, i) => i !== idx);
                                        setContent({ ...content, test_cases: newTC });
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button 
                            type="button"
                            onClick={() => {
                                const newTC = [...(content.test_cases || []), { input: '', expected_output: '' }];
                                setContent({ ...content, test_cases: newTC });
                            }}
                            className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 font-bold text-sm hover:border-primary hover:text-primary transition-all"
                        >
                            + Új Teszt Eset
                        </button>
                    </div>
                </div>
            </div>
        );
      default:
        return <p className="text-slate-400 italic">Ehhez a típushoz még nincs vizuális szerkesztő, de a JSON-t hamarosan implementáljuk.</p>;
    }
  };

  if (initialLoading) return <div className="p-12 text-center">Kérdés betöltése...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/quizzes/edit/${quizId}`)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
        >
          ⬅️
        </button>
        <h1 className="text-3xl font-extrabold">{questionId ? 'Kérdés Szerkesztése' : 'Új Kérdés'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="mb-6">
              <label className="block text-sm font-bold text-slate-500 mb-2 uppercase">Cím</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pl. Ciklusok alapjai"
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-bold"
              />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 uppercase">Típus</label>
              <select
                value={qType}
                onChange={(e) => setQType(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-bold"
              >
                <option value="theory">Theory (Feleletválasztós)</option>
                <option value="coding">Coding (Programozás)</option>
                <option value="debug">Debug (Hibakeresés)</option>
                <option value="parsons">Parsons (Sorrendezés)</option>
                <option value="fill_in_blank">Fill in Blank (Kiegészítés)</option>
                <option value="predict_output">Predict Output (Kimenet jóslás)</option>
              </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase">Nyelv</label>
                <select
                    value={languageId}
                    onChange={(e) => setLanguageId(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none font-bold"
                >
                    {languages.map(lang => (
                        <option key={lang.id} value={lang.id}>
                            {lang.display_name || lang.name}
                        </option>
                    ))}
                </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-500 mb-2 uppercase">Rövid leírás (Markdown)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 h-24 rounded-xl bg-slate-100 dark:bg-slate-700 outline-none"
              placeholder="Pl. Ebben a feladatban a listák használatát gyakoroljuk..."
            />
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-sm font-bold text-slate-500 mb-4 uppercase">Kérdés tartalom</label>
            {renderTypeFields()}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-bold text-xl transition-all shadow-xl disabled:opacity-50"
        >
          {loading ? 'Mentés...' : 'Kérdés Mentése'}
        </button>
      </form>
    </div>
  );
}
