import React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../ThemeContext';

const PredictionComponent = ({ question, selectedAnswer, onSelect }) => {
    const { isDark } = useTheme();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', padding: '20px' }}>
            {/* Question Description */}
            <div style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '10px' }}>
                {question.description || "What will be the output of this code?"}
            </div>

            {/* Read-Only Code Editor */}
            <div style={{
                flex: '1',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--card-border)',
                minHeight: '200px'
            }}>
                <Editor
                    height="100%"
                    defaultLanguage={question.language === 'python' ? 'python' : 'java'}
                    value={question.content.code_snippet || question.content.initial_code}
                    theme={isDark ? "vs-dark" : "light"}
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        padding: { top: 20 },
                        domReadOnly: true
                    }}
                />
            </div>

            {/* Console / Options Area */}
            <div style={{ flex: '0 0 auto' }}>
                <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    marginBottom: '10px',
                    letterSpacing: '1px'
                }}>
                    Terminal Output
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {question.content.options && question.content.options.map((option, idx) => (
                        <div
                            key={idx}
                            onClick={() => onSelect(option)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '15px 20px',
                                borderRadius: '12px',
                                background: 'var(--card-bg)',
                                border: selectedAnswer === option ? '2px solid var(--primary-color)' : '1px solid var(--card-border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: selectedAnswer === option ? '6px solid var(--primary-color)' : '2px solid var(--text-secondary)',
                                marginRight: '15px',
                                boxSizing: 'border-box'
                            }} />
                            <span style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{option}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PredictionComponent;
