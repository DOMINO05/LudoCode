import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

const DebugComponent = ({ question, onCodeChange, debugPhase, selection, onSelect }) => {
    const { isDark } = useTheme();
    
    const [lines, setLines] = useState([]);
    const [fixOptions, setFixOptions] = useState([]);
    const [tokenizedLines, setTokenizedLines] = useState([]);

    useEffect(() => {
        let codeLines = [];
        if (question.content.buggy_code) {
            codeLines = question.content.buggy_code.split('\n');
            setLines(codeLines);
        }
        setFixOptions(question.content.options || []);
        
        // Tokenize lines
        const tokenized = codeLines.map(line => {
             // Split by strings, words, non-word chars, keeping whitespace
             // This regex captures:
             // 1. Strings: "..." or '...'
             // 2. Words: alphanumeric + underscore
             // 3. Non-whitespace non-word chars: punctuation
             // 4. Whitespace
             const regex = /(".*?"|'.*?'|[a-zA-Z0-9_]+|[^\s\w]|\s+)/g;
             return line.match(regex) || [];
        });
        setTokenizedLines(tokenized);
        
    }, [question]);

    const handleTokenClick = (lineIndex, tokenIndex, text) => {
        if (debugPhase !== 'identify') return;
        // Ignore whitespace
        if (!text.trim()) return;
        
        onSelect({ lineIndex, tokenIndex, text });
    };

    const handleFixSelect = (option) => {
        // Apply fix to the code
        // We assume the fix replaces the entire line where the error was found
        // OR does it replace just the token?
        // The previous implementation replaced the line.
        // If the error is a single token, replacing the line is safer if 'option' is a full line.
        // But if 'option' is just the corrected token, we should replace token.
        // Let's assume options are "Corrected Line" strings for now, as usually debug questions offer full line fixes.
        // If the option is short, maybe it's a token replacement.
        // Let's check if option contains newlines or looks like a full statement.
        
        // Given the spec "2-3 javítási opció (helyes vs helytelen kód)", it's likely code snippets.
        // I will assume it replaces the LINE for now, as maintaining token-level replacement is complex without knowing context.
        // However, if we selected a token, maybe we should just replace that token?
        // If the options are e.g. "println", "print", then token replacement makes sense.
        // If options are "System.out.println(...);", then line replacement.
        // Heuristic: If option has no spaces and is short, replace token. Else replace line.
        
        const newLines = [...lines];
        
        if (selection) {
             const { lineIndex, tokenIndex } = selection;
             
             // Check heuristic
             if (option.includes(' ') || option.includes('(') || option.includes(';')) {
                 // Likely a full line/statement
                 newLines[lineIndex] = option;
             } else {
                 // Likely a token replacement
                 const lineTokens = [...tokenizedLines[lineIndex]];
                 lineTokens[tokenIndex] = option;
                 newLines[lineIndex] = lineTokens.join('');
             }
        }
        
        const newCode = newLines.join('\n');
        onCodeChange(newCode); 
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', padding: '20px' }}>
            {/* Question Description */}
            <div style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '10px' }}>
                {debugPhase === 'identify' ? "Tap the specific code element that is incorrect." : "Select the correct fix."}
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
                position: 'relative',
                padding: '15px'
            }}>
                {tokenizedLines.map((tokens, lineIdx) => (
                    <div key={lineIdx} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', minHeight: '24px' }}>
                        {/* Line Number */}
                         <span style={{ 
                            width: '30px', 
                            textAlign: 'right', 
                            marginRight: '10px', 
                            color: 'var(--text-secondary)',
                            userSelect: 'none',
                            fontSize: '0.8rem',
                            opacity: 0.7,
                            flexShrink: 0
                        }}>
                            {lineIdx + 1}
                        </span>

                        {tokens.map((token, tokenIdx) => {
                            const isSelected = selection && selection.lineIndex === lineIdx && selection.tokenIndex === tokenIdx;
                            const isWhitespace = !token.trim();
                            
                            return (
                                <span 
                                    key={tokenIdx}
                                    onClick={() => handleTokenClick(lineIdx, tokenIdx, token)}
                                    style={{
                                        cursor: (debugPhase === 'identify' && !isWhitespace) ? 'pointer' : 'default',
                                        backgroundColor: isSelected ? 'rgba(var(--primary-rgb), 0.3)' : 'transparent',
                                        border: isSelected ? '1px solid var(--primary-color)' : '1px solid transparent',
                                        borderRadius: '4px',
                                        padding: '0 2px',
                                        margin: '0 1px',
                                        whiteSpace: 'pre',
                                        transition: 'background-color 0.1s',
                                        color: (debugPhase === 'fix' && isSelected) ? 'var(--error-color)' : 'inherit',
                                        fontWeight: isSelected ? 'bold' : 'normal'
                                    }}
                                >
                                    {token}
                                </span>
                            );
                        })}
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
