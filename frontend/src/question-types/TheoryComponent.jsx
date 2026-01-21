import React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../ThemeContext';
import RichText from '../components/RichText';

const TheoryComponent = ({ question, selectedAnswer, onSelect }) => {
    const { isDark } = useTheme();

    return (
        <div className="w-full fade-in flex flex-col h-full">
            {/* Question Text */}
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">
                <RichText content={question.description} />
            </h2>

            {/* Code Snippet (if any) */}
            {question.content.code_snippet && (
                 <div className="bg-slate-800 dark:bg-slate-900 rounded-2xl p-5 mb-6 shadow-lg border-2 border-slate-700 dark:border-slate-600 shrink-0">
                    <div className="flex gap-1.5 mb-3">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div style={{ height: '200px' }}>
                        <Editor
                            height="100%"
                            defaultLanguage={question.language === 'python' ? 'python' : 'java'}
                            value={question.content.code_snippet}
                            theme="vs-dark" // Always dark for the code block style
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 14,
                                lineNumbers: 'off',
                                folding: false,
                                domReadOnly: true,
                                contextmenu: false,
                                overviewRulerLanes: 0,
                                hideCursorInOverviewRuler: true,
                                renderLineHighlight: 'none',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Options */}
            <div className="space-y-4 w-full">
                {question.content.options && question.content.options.map((option, idx) => {
                    const isSelected = selectedAnswer === option;
                    return (
                        <div
                            key={idx}
                            onClick={() => onSelect(option)}
                            className={`cursor-pointer bg-white dark:bg-slate-800 border-2 rounded-2xl p-4 transition-all duration-200 option-card group ${
                                isSelected 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400 shadow-md' 
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 border-2 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                                    isSelected 
                                        ? 'border-blue-500 text-blue-500 bg-white dark:bg-slate-800 dark:text-blue-400 dark:border-blue-400' 
                                        : 'border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500 group-hover:border-slate-400 dark:group-hover:border-slate-500 group-hover:text-slate-500'
                                }`}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <div className={`code-font text-base font-medium ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-600 dark:text-slate-300'}`}>
                                    <RichText content={option} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TheoryComponent;
