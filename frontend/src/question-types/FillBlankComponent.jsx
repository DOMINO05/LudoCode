import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

const FillBlankComponent = ({ question, onCodeChange }) => {
    const { isDark } = useTheme();
    
    // We expect question.content.initial_code to contain blanks like "___" or "???"
    // And question.content.options to be the word bank.
    
    // Parse the code into tokens to manage state
    const [codeSegments, setCodeSegments] = useState([]);
    const [blanks, setBlanks] = useState([]); // Array of filled values, null if empty
    const [wordBank, setWordBank] = useState([]);
    // Update regex to include {{BLANK}} with optional whitespace
    const placeholderRegex = /(___|\?\?\?|\{\{\s*BLANK\s*\}\})/g;

    useEffect(() => {
        // Fallback to code_snippet if initial_code is missing
        const rawCode = question.content.initial_code || question.content.code_snippet || "";
        const segments = rawCode.split(placeholderRegex);
        setCodeSegments(segments);
        
        // Count how many blanks we have
        const matches = rawCode.match(placeholderRegex) || [];
        setBlanks(new Array(matches.length).fill(null));
        
        // Initialize word bank
        // If options are provided, use them. If not, we might need to infer? 
        // Assuming options are provided in content.options
        setWordBank(question.content.options || []);
        
    }, [question]);

    // Update parent whenever blanks change
    useEffect(() => {
        if (codeSegments.length === 0) return;
        
        let constructedCode = "";
        let blankIndex = 0;
        
        codeSegments.forEach(segment => {
            if (segment.match(placeholderRegex)) {
                constructedCode += blanks[blankIndex] || "___";
                blankIndex++;
            } else {
                constructedCode += segment;
            }
        });
        
        // Check if we should submit the full code or just the blank values.
        // Based on schema.sql, correct_answer is often just the word (e.g., "def").
        // So we should likely submit the filled values joined by comma or just the single value.
        // Assuming single blank for now as per schema examples.
        const filledValues = blanks.filter(b => b !== null);
        if (filledValues.length === 1) {
             onCodeChange(filledValues[0]);
        } else if (filledValues.length > 1) {
             // If multiple blanks, join them? Or send full code?
             // If correct_answer is "def, len", then join.
             // If correct_answer is full code, then constructedCode.
             // Usually, simplistic backends check for the specific word.
             // Let's try sending comma-separated values for multiple blanks.
             onCodeChange(filledValues.join(','));
        } else {
             // No blanks filled yet
             onCodeChange('');
        }
    }, [blanks, codeSegments, onCodeChange]);


    const handleBankClick = (word) => {
        // Find first empty blank
        const firstEmptyIndex = blanks.findIndex(b => b === null);
        if (firstEmptyIndex !== -1) {
            const newBlanks = [...blanks];
            newBlanks[firstEmptyIndex] = word;
            setBlanks(newBlanks);
            
            // Remove from bank (or decrease count if duplicates allowed? Assuming unique use for now)
            // But usually in these apps, if you use a word, it disappears from bank.
            setWordBank(prev => prev.filter(w => w !== word)); 
            // Note: This simple filter removes all instances. 
            // If we have duplicate words in bank, we should remove by index.
            // Let's refine this to remove just one instance.
             const indexToRemove = wordBank.indexOf(word);
             if (indexToRemove > -1) {
                 const newBank = [...wordBank];
                 newBank.splice(indexToRemove, 1);
                 setWordBank(newBank);
             }
        }
    };

    const handleBlankClick = (index, word) => {
        if (!word) return; // Clicked on empty blank
        
        // Return word to bank
        setWordBank(prev => [...prev, word]);
        
        // Clear blank
        const newBlanks = [...blanks];
        newBlanks[index] = null;
        setBlanks(newBlanks);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', padding: '20px' }}>
             {/* Question Description */}
             <div style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '10px' }}>
                {question.description}
            </div>

            {/* Code Display Area */}
            <div style={{
                flex: '1',
                borderRadius: '12px',
                border: '1px solid var(--card-border)',
                padding: '20px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                lineHeight: '2',
                fontSize: '1.1rem',
                backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
                color: isDark ? '#d4d4d4' : '#333',
                overflowY: 'auto'
            }}>
                {codeSegments.map((segment, idx) => {
                    if (segment.match(placeholderRegex)) {
                        // Determine which blank index this corresponds to
                        // We can count how many blanks appeared before this segment index
                        // But actually, we map segments. 
                        // The segments array alternates: [text, blank, text, blank, text]
                        // So blank index is roughly idx / 2
                        const blankIndex = Math.floor(idx / 2);
                        const filledWord = blanks[blankIndex];
                        
                        return (
                            <span 
                                key={idx}
                                onClick={() => handleBlankClick(blankIndex, filledWord)}
                                style={{
                                    display: 'inline-block',
                                    minWidth: '60px',
                                    padding: '2px 8px',
                                    margin: '0 4px',
                                    borderRadius: '4px',
                                    backgroundColor: filledWord ? 'var(--primary-color)' : (isDark ? '#3c3c3c' : '#e0e0e0'),
                                    color: filledWord ? '#fff' : 'transparent',
                                    borderBottom: '2px solid var(--text-secondary)',
                                    cursor: filledWord ? 'pointer' : 'default',
                                    textAlign: 'center'
                                }}
                            >
                                {filledWord || "?"}
                            </span>
                        );
                    } else {
                        return <span key={idx}>{segment}</span>;
                    }
                })}
            </div>

            {/* Word Bank */}
            <div style={{ flex: '0 0 auto' }}>
                <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    marginBottom: '10px',
                    letterSpacing: '1px'
                }}>
                    Word Bank
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {wordBank.map((word, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleBankClick(word)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '20px',
                                border: '1px solid var(--card-border)',
                                background: 'var(--card-bg)',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontFamily: 'monospace',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'transform 0.1s'
                            }}
                        >
                            {word}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FillBlankComponent;
