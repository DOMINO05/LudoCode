import React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../ThemeContext';

const TheoryComponent = ({ question, selectedAnswer, onSelect }) => {
    const { isDark } = useTheme();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', padding: '20px' }}>
            {/* Question Text */}
            <div style={{ fontSize: '1.2rem', fontWeight: '500', lineHeight: '1.5' }}>
                {question.description}
            </div>

            {/* Code Snippet (if any) */}
            {question.content.code_snippet && (
                 <div style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--card-border)',
                    height: '200px', // Fixed height for consistency
                    flexShrink: 0
                }}>
                    <Editor
                        height="100%"
                        defaultLanguage={question.language === 'python' ? 'python' : 'java'}
                        value={question.content.code_snippet}
                        theme={isDark ? "vs-dark" : "light"}
                        options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14,
                            lineNumbers: 'off',
                            folding: false,
                            domReadOnly: true
                        }}
                    />
                </div>
            )}

            {/* Options */}
            <div style={{ display: 'grid', gap: '15px', marginTop: 'auto' }}>
                {question.content.options && question.content.options.map((option, idx) => (
                    <div
                        key={idx}
                        onClick={() => onSelect(option)}
                        style={{
                            padding: '20px',
                            borderRadius: '16px',
                            border: selectedAnswer === option ? '3px solid var(--primary-color)' : '1px solid var(--card-border)',
                            background: 'var(--card-bg)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '1.1rem',
                            fontWeight: '500',
                            textAlign: 'center',
                            boxShadow: selectedAnswer === option ? '0 0 0 2px rgba(var(--primary-rgb), 0.2)' : 'none'
                        }}
                    >
                        {option}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TheoryComponent;
