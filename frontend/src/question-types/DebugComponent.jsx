import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import Editor from '@monaco-editor/react';

const DebugComponent = ({ question, onCodeChange, debugPhase, onLineSelect, selectedLineIndex }) => {
    const { isDark } = useTheme();
    
    const [lines, setLines] = useState([]);
    const [fixOptions, setFixOptions] = useState([]);

    useEffect(() => {
        if (question.content.buggy_code) {
            setLines(question.content.buggy_code.split('\n'));
        }
        setFixOptions(question.content.options || []);
    }, [question]);

    const handleLineClick = (index) => {
        if (debugPhase !== 'identify') return;
        onLineSelect(index);
    };

    const handleFixSelect = (option) => {
        // Apply fix to the code
        const newLines = [...lines];
        if (selectedLineIndex !== null) {
            newLines[selectedLineIndex] = option;
        }
        
        const newCode = newLines.join('\n');
        // We might want to visually select this option too
        onCodeChange(newCode); 
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', padding: '20px' }}>
            {/* Question Description */}
            <div style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '10px' }}>
                {debugPhase === 'identify' ? "Tap the line of code that contains the bug." : "Select the correct fix for the highlighted line."}
            </div>

            {/* Code Display Area */}
            <div style={{
                flex: '1',
                borderRadius: '12px',
                border: '1px solid var(--card-border)',
                background: isDark ? '#1e1e1e' : '#f5f5f5',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '1rem',
                position: 'relative'
            }}>
                {lines.map((line, idx) => (
                    <div 
                        key={idx}
                        onClick={() => handleLineClick(idx)}
                        style={{
                            display: 'flex',
                            padding: '4px 0',
                            cursor: debugPhase === 'identify' ? 'pointer' : 'default',
                            backgroundColor: 
                                debugPhase === 'fix' && idx === selectedLineIndex ? 'rgba(231, 76, 60, 0.2)' : 
                                (selectedLineIndex === idx ? 'rgba(var(--primary-rgb), 0.2)' : 'transparent'),
                            borderLeft: debugPhase === 'fix' && idx === selectedLineIndex ? '4px solid var(--error-color)' : '4px solid transparent',
                             '&:hover': {
                                backgroundColor: debugPhase === 'identify' ? 'rgba(255,255,255,0.05)' : ''
                            }
                        }}
                    >
                        <span style={{ 
                            width: '30px', 
                            textAlign: 'right', 
                            marginRight: '15px', 
                            color: 'var(--text-secondary)',
                            userSelect: 'none',
                            fontSize: '0.8rem',
                            opacity: 0.7
                        }}>
                            {idx + 1}
                        </span>
                        <span style={{ whiteSpace: 'pre' }}>{line}</span>
                    </div>
                ))}
            </div>

            {/* Interaction Area */}
            <div style={{ flex: '0 0 auto' }}>
                {debugPhase === 'fix' && (
                    <div>
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            color: 'var(--text-secondary)',
                            marginBottom: '10px',
                            letterSpacing: '1px'
                        }}>
                            Choose Correction
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {fixOptions.map((option, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleFixSelect(option)}
                                    style={{
                                        padding: '15px',
                                        borderRadius: '12px',
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--card-border)',
                                        cursor: 'pointer',
                                        fontFamily: 'monospace',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    {option}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DebugComponent;
