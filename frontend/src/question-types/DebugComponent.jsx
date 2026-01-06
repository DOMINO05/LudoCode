import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

const DebugComponent = ({ question, onCodeChange, debugPhase, selections = [], onSelect, checkResult }) => {
    const { isDark } = useTheme();
    
    const [lines, setLines] = useState([]);
    const [fixOptions, setFixOptions] = useState([]);
    const [tokenizedLines, setTokenizedLines] = useState([]);
    const [errorTokens, setErrorTokens] = useState([]); // Array of {lineIndex, tokenIndex}
    const [selectedOption, setSelectedOption] = useState(null);

    useEffect(() => {
        let codeLines = [];
        if (question.content.buggy_code) {
            codeLines = question.content.buggy_code.split('\n');
            setLines(codeLines);
        }
        setFixOptions(question.content.options || []);
        setSelectedOption(null);
        
        // Tokenize lines
        const tokenized = codeLines.map(line => {
             const regex = /(".*?"|'.*?'|[a-zA-Z0-9_]+|[^\s\w]|\s+)/g;
             return line.match(regex) || [];
        });
        setTokenizedLines(tokenized);
        
    }, [question]);

    // Calculate actual error tokens when checkResult (failure) is present
    useEffect(() => {
        if (checkResult && !checkResult.isCorrect && question.content.error_location) {
            const errorLoc = question.content.error_location.replace(/\s+/g, '');
            const foundTokens = [];
            
            // Flatten tokens for easier searching
            const allTokens = [];
            tokenizedLines.forEach((tokens, lIdx) => {
                tokens.forEach((text, tIdx) => {
                    if (text.trim()) { // Ignore whitespace tokens for matching
                        allTokens.push({ lineIndex: lIdx, tokenIndex: tIdx, text });
                    }
                });
            });

            // Find subsequence that matches errorLoc
            // This is a simplified search: finding contiguous sequence of non-whitespace tokens
            // whose combined text equals errorLoc (ignoring whitespace).
            for (let i = 0; i < allTokens.length; i++) {
                let currentStr = "";
                for (let j = i; j < allTokens.length; j++) {
                    currentStr += allTokens[j].text;
                    if (currentStr === errorLoc) {
                        // Found match
                        for (let k = i; k <= j; k++) {
                            foundTokens.push({ 
                                lineIndex: allTokens[k].lineIndex, 
                                tokenIndex: allTokens[k].tokenIndex 
                            });
                        }
                        break;
                    }
                    if (currentStr.length > errorLoc.length) break;
                }
                if (foundTokens.length > 0) break;
            }
            setErrorTokens(foundTokens);
        } else {
            setErrorTokens([]);
        }
    }, [checkResult, question, tokenizedLines]);

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
        setSelectedOption(option);
        
        if (selections.length === 0) return;

        const newLines = [...lines];
        
        // Heuristic: If option looks like a full line/statement, replace the line.
        // Otherwise, replace the selected token(s).
        // Removed parens check because it caused partial replacements (like function signatures) to trigger full line replacement.
        const isFullLine = option.includes(';') || option.includes('{') || option.trim().endsWith(':') || option.includes(' = ');
        
        if (isFullLine) {
             // Replace line(s) involved in selection
             const uniqueLines = [...new Set(selections.map(s => s.lineIndex))];
             uniqueLines.forEach(lineIndex => {
                 newLines[lineIndex] = option;
             });
        } else {
             // Token replacement
             const selectionsByLine = {};
             selections.forEach(s => {
                if (!selectionsByLine[s.lineIndex]) selectionsByLine[s.lineIndex] = [];
                selectionsByLine[s.lineIndex].push(s.tokenIndex);
             });
             
             Object.keys(selectionsByLine).forEach(lIdx => {
                const lineIndex = parseInt(lIdx);
                const tokenIndices = selectionsByLine[lineIndex].sort((a, b) => a - b);
                
                // Use current tokens to reconstruct
                // Note: tokenizedLines is state, derived from 'lines' (which comes from buggy_code initially)
                // If we edit, we update lines and re-tokenize.
                const currentTokens = [...tokenizedLines[lineIndex]];
                
                // Replace first selected token with option
                if (tokenIndices.length > 0) {
                    currentTokens[tokenIndices[0]] = option;
                    // Clear other selected tokens (effectively merging them)
                    for (let i = 1; i < tokenIndices.length; i++) {
                        currentTokens[tokenIndices[i]] = "";
                    }
                    newLines[lineIndex] = currentTokens.join("");
                }
             });
        }
        
        // Update local lines to show the fix immediately
        setLines(newLines);
        
        // Re-tokenize lines to reflect changes
        const tokenized = newLines.map(line => {
             const regex = /(".*?"|'.*?'|[a-zA-Z0-9_]+|[^\s\w]|\s+)/g;
             return line.match(regex) || [];
        });
        setTokenizedLines(tokenized);

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
                            const isActualError = errorTokens.some(t => t.lineIndex === lineIdx && t.tokenIndex === tokenIdx);
                            const isWhitespace = !token.trim();
                            
                            // Determine visuals
                            let backgroundColor = 'transparent';
                            let borderColor = 'transparent';
                            let color = 'inherit';
                            
                            if (checkResult && !checkResult.isCorrect) {
                                // Incorrect State
                                if (isActualError) {
                                    backgroundColor = 'rgba(231, 76, 60, 0.3)'; // Redish
                                    borderColor = 'var(--error-color)';
                                } else if (isSelected) {
                                    backgroundColor = 'rgba(46, 204, 113, 0.3)'; // Greenish (User selected valid code)
                                    borderColor = 'var(--success-color)';
                                }
                            } else {
                                // Normal / Correct State
                                if (isSelected) {
                                    backgroundColor = 'rgba(var(--primary-rgb), 0.3)';
                                    borderColor = 'var(--primary-color)';
                                    if (debugPhase === 'fix') {
                                        color = 'var(--error-color)'; // Highlight error in fix phase
                                    }
                                }
                            }

                            return (
                                <span 
                                    key={tokenIdx}
                                    onClick={() => handleTokenClick(lineIdx, tokenIdx, token)}
                                    style={{
                                        cursor: (debugPhase === 'identify' && !isWhitespace) ? 'pointer' : 'default',
                                        backgroundColor,
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '4px',
                                        padding: '0 2px',
                                        margin: '0 1px',
                                        whiteSpace: 'pre',
                                        transition: 'all 0.1s',
                                        color: color,
                                        fontWeight: isSelected || isActualError ? 'bold' : 'normal'
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
                                        border: selectedOption === option ? '2px solid var(--primary-color)' : '1px solid var(--card-border)',
                                        cursor: 'pointer',
                                        fontFamily: 'monospace',
                                        fontSize: '0.95rem',
                                        boxShadow: selectedOption === option ? '0 0 0 2px rgba(var(--primary-rgb), 0.2)' : 'none'
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
