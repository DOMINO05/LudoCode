import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ConstructionComponent from '../question-types/ConstructionComponent';
import TheoryComponent from '../question-types/TheoryComponent';
import PredictionComponent from '../question-types/PredictionComponent';
import FillBlankComponent from '../question-types/FillBlankComponent';
import ParsonsComponent from '../question-types/ParsonsComponent';
import DebugComponent from '../question-types/DebugComponent';

export default function MistakeRecovery({ session, onResolved, onCancel }) {
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState('');
    const [selectedOption, setSelectedOption] = useState(null);
    const [parsonsSolution, setParsonsSolution] = useState([]);
    const [message, setMessage] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchMistake();
    }, []);

    const fetchMistake = async () => {
        try {
            const { data, error } = await supabase.rpc('get_oldest_unresolved_mistake');
            
            if (error) throw error;

            if (data && data.question && data.question.content) {
                setSubmission(data);
                if (data.question.content.initial_code) setCode(data.question.content.initial_code);
            } else {
                setMessage({ type: 'error', text: 'Nincs több javítandó feladat!' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Hiba a lekérdezés során.' });
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        setSubmitting(true);
        const { question } = submission;
        let isCorrect = false;
        
        let submissionData = code;
        if (question.qType === 'theory' || question.qType === 'predict_output') {
            submissionData = selectedOption;
        } else if (question.qType === 'parsons') {
            submissionData = JSON.stringify(parsonsSolution.map(b => b.id));
        }

        // Validate locally
        if (question.qType === 'parsons') {
            isCorrect = JSON.stringify(question.content.correct_order) === submissionData;
        } else if (question.qType === 'debug') {
            const expected = (question.content.buggy_code || '').replace(question.content.error_location || '', question.content.correct_code || '');
            isCorrect = code.trim() === expected.trim();
        } else {
            let correct = question.content.correct_answer;
            if (typeof correct === 'number' && question.content.options) correct = question.content.options[correct];
            isCorrect = String(submissionData).trim() === String(correct).trim();
        }

        try {
            const { data, error } = await supabase.rpc('resolve_mistake', {
                p_submission_id: submission.id,
                p_is_correct_now: isCorrect
            });
            
            if (error) throw error;

            if (data.success) {
                setMessage({ type: 'success', text: 'Feladat sikeresen javítva!' });
                setTimeout(() => onResolved(data.new_sanity), 2000);
            } else {
                setMessage({ type: 'error', text: 'Még mindig nem pontos a megoldás. Próbáld újra!' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Sikertelen beküldés.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Betöltés...</div>;

    if (!submission) return (
        <div className="p-10 text-center">
            <p className="mb-5">{message?.text || 'Nincs több hibás feladat.'}</p>
            <button onClick={onCancel} className="btn btn-primary">Vissza</button>
        </div>
    );

    const renderContent = () => {
        const { question } = submission;
        if (!question) return null;
        switch (question.qType) {
            case 'theory': return <TheoryComponent question={question} selectedAnswer={selectedOption} onSelect={setSelectedOption} />;
            case 'predict_output': return <PredictionComponent question={question} selectedAnswer={selectedOption} onSelect={setSelectedOption} />;
            case 'fill_in_blank': return <FillBlankComponent question={question} onCodeChange={setCode} />;
            case 'parsons': return <ParsonsComponent question={question} onSolutionChange={setParsonsSolution} />;
            case 'debug': return <DebugComponent question={question} onCodeChange={setCode} debugPhase="fix" />;
            default: return <ConstructionComponent question={question} onCodeChange={setCode} />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">Sanity Recovery</h2>
                        <p className="text-sm text-slate-500 italic">Javítsd ki a korábbi hibádat a gyógyuláshoz!</p>
                    </div>
                    <button onClick={onCancel} className="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto p-6">
                    {message && (
                        <div className={`p-4 mb-6 rounded-xl text-center font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}
                    {renderContent()}
                </div>

                <div className="p-6 border-t dark:border-slate-800 flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        MÉGSEM
                    </button>
                    <button 
                        onClick={handleResolve} 
                        disabled={submitting}
                        className="flex-[2] py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                    >
                        {submitting ? 'ELLENŐRZÉS...' : 'JAVÍTÁS BEKÜLDÉSE'}
                    </button>
                </div>
            </div>
        </div>
    );
}
