import React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../ThemeContext';

const PredictionComponent = ({ question, selectedAnswer, onSelect }) => {
    const { isDark } = useTheme();

    return (
        <div className="w-full fade-in flex flex-col h-full">
            {/* Question Text */}
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
                {question.description || "What will be the output of this code?"}
            </h2>

            {/* Code Block */}
            <div className="bg-slate-800 dark:bg-slate-900 rounded-2xl p-5 mb-6 shadow-lg border-2 border-slate-700 dark:border-slate-600 shrink-0">
                {/* Window Dots */}
                <div className="flex gap-1.5 mb-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                
                <div style={{ height: '200px' }}>
                    <Editor
                        height="100%"
                        defaultLanguage={question.language === 'python' ? 'python' : 'java'}
                        value={question.content.code_snippet || question.content.initial_code}
                        theme="vs-dark"
                        options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 16,
                            fontFamily: "'Fira Code', monospace",
                            padding: { top: 10 },
                            domReadOnly: true,
                            lineNumbers: 'off',
                            folding: false,
                            contextmenu: false,
                            renderLineHighlight: 'none',
                            hideCursorInOverviewRuler: true,
                            overviewRulerLanes: 0
                        }}
                    />
                </div>
            </div>

            {/* Options */}
            <div className="w-full">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Válassz kimenetet:</h3>
                <div className="grid grid-cols-1 gap-3">
                    {question.content.options && question.content.options.map((option, idx) => {
                        const isSelected = selectedAnswer === option;
                        return (
                            <button
                                key={idx}
                                onClick={() => onSelect(option)}
                                className={`option-card p-4 rounded-xl border-2 shadow-sm transition-all duration-200 group text-left ${
                                    isSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 shadow-md transform scale-[1.02]'
                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span className={`code-font text-lg font-bold tracking-widest ${
                                    isSelected ? 'text-blue-800 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'
                                }`}>
                                    {option}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PredictionComponent;
