import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

const DebugComponent = ({ question, onCodeChange, debugPhase, selections = [], onSelect }) => {
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
        
        // Toggle selection
        const isSelected = selections.some(s => s.lineIndex === lineIndex && s.tokenIndex === tokenIndex);
        let newSelections;
        
        if (isSelected) {
            newSelections = selections.filter(s => !(s.lineIndex === lineIndex && s.tokenIndex === tokenIndex));
        } else {
            newSelections = [...selections, { lineIndex, tokenIndex, text }];
        }
        
        onSelect(newSelections);
    };

    const handleFixSelect = (option) => {
        const newLines = [...lines];
        
        // If we have selections, we need to decide what to replace.
        // If multiple tokens are selected, replacing just one might be weird if we treat them individually.
        // But usually, the "fix" is a corrected version of the line or statement.
        // If selections are all on the same line, we might replace the line?
        // Let's stick to the heuristic: if option looks like a line, replace the line of the FIRST selection.
        
        if (selections.length > 0) {
             const firstSelection = selections[0];
             const { lineIndex } = firstSelection; // Assuming selections are mostly on the same line or relevant to one fix
             
             // Check heuristic
             if (option.includes(' ') || option.includes('(') || option.includes(';') || option.length > 15) {
                 // Likely a full line/statement
                 newLines[lineIndex] = option;
             } else {
                 // Likely a token replacement. Replace ALL selected tokens with the option?
                 // Or maybe just the first one?
                 // If the user selected "System" and "out", and option is "Console", maybe replacing both with "Console" is wrong.
                 // This is tricky.
                 // Let's assume if it's a token fix, it replaces the tokens.
                 // But replacing multiple tokens with one option string is valid (e.g. replacing "sys . out" with "console").
                 // Implementation: Reconstruct line from tokens, replacing selected range with option?
                 // Simple approach: Replace the line with the option if unsure.
                 newLines[lineIndex] = option;
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
                            const isSelected = selections.some(s => s.lineIndex === lineIdx && s.tokenIndex === tokenIdx);
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
