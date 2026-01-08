import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

const ParsonsComponent = ({ question, onSolutionChange }) => {
    const { isDark } = useTheme();
    const [solution, setSolution] = useState([]);
    const [available, setAvailable] = useState([]);

    useEffect(() => {
        // Shuffle blocks initially
        if (question.content.blocks) {
            setAvailable([...question.content.blocks].sort(() => Math.random() - 0.5));
            setSolution([]);
        }
    }, [question]);

    useEffect(() => {
        onSolutionChange(solution);
    }, [solution, onSolutionChange]);

    const handleAddToSolution = (block) => {
        setAvailable(prev => prev.filter(b => b.id !== block.id));
        setSolution(prev => [...prev, block]);
    };

    const handleRemoveFromSolution = (block) => {
        setSolution(prev => prev.filter(b => b.id !== block.id));
        setAvailable(prev => [...prev, block]);
    };

    return (
        <div className="w-full fade-in flex flex-col h-full">
            {/* Question Text */}
            <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">
                {question.description}
            </h2>

            {/* Drop Zone */}
            <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 min-h-[200px] border-2 border-dashed border-slate-300 dark:border-slate-700 mb-4 flex flex-col gap-2 transition-colors">
                {solution.length === 0 && (
                    <span className="text-slate-400 dark:text-slate-500 text-sm italic text-center my-auto pointer-events-none select-none">
                        A kód helye...
                    </span>
                )}
                {solution.map((block, idx) => (
                    <div 
                        key={block.id}
                        className="bg-slate-800 dark:bg-slate-700 text-white p-2 rounded text-xs font-mono flex justify-between items-center pop"
                    >
                        <span style={{ whiteSpace: 'pre' }}>{block.text}</span>
                        <span 
                            onClick={() => handleRemoveFromSolution(block)}
                            className="text-red-400 font-bold ml-2 cursor-pointer hover:text-red-300"
                        >
                            ×
                        </span>
                    </div>
                ))}
            </div>

            {/* Source Pool */}
            <div className="flex flex-col gap-2">
                {available.map((block) => (
                    <button
                        key={block.id}
                        onClick={() => handleAddToSolution(block)}
                        className="parsons-block bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-b-2 px-3 py-2 rounded-lg font-mono text-sm text-left text-slate-700 dark:text-slate-300 shadow-sm active:bg-slate-50 dark:active:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span style={{ whiteSpace: 'pre' }}>{block.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ParsonsComponent;
