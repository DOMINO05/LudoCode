import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import RichText from '../components/RichText';

const FillBlankComponent = ({ question, onCodeChange }) => {
    // We expect question.content.initial_code to contain blanks like "___" or "???"
    
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
        const filledValues = blanks.filter(b => b !== null);
        if (filledValues.length === 1) {
             onCodeChange(filledValues[0]);
        } else if (filledValues.length > 1) {
             onCodeChange(filledValues.join(','));
        } else {
             onCodeChange('');
        }
    }, [blanks, codeSegments, onCodeChange]);


    const handleBankClick = (word) => {
        const firstEmptyIndex = blanks.findIndex(b => b === null);
        if (firstEmptyIndex !== -1) {
            const newBlanks = [...blanks];
            newBlanks[firstEmptyIndex] = word;
            setBlanks(newBlanks);
            
            // Remove from bank (just filtering out one instance logic, simplistic for now)
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
        <div className="w-full fade-in flex flex-col h-full">
             {/* Question Description */}
             <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100">
                <RichText content={question.description} />
            </h2>

            {/* Code Display Area */}
            <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm mb-8 text-lg w-full">
                <code className="code-font text-slate-700 dark:text-slate-300 leading-loose">
                    {codeSegments.map((segment, idx) => {
                        if (segment.match(placeholderRegex)) {
                            const blankIndex = Math.floor(idx / 2);
                            const filledWord = blanks[blankIndex];
                            
                            return (
                                <span 
                                    key={idx}
                                    onClick={() => handleBlankClick(blankIndex, filledWord)}
                                    className={`inline-block border-b-4 rounded px-3 py-1 min-w-[80px] text-center font-bold transition-all cursor-pointer select-none mx-1 ${
                                        filledWord 
                                            ? 'text-slate-800 dark:text-slate-900 bg-blue-100 dark:bg-blue-300 border-blue-300 dark:border-blue-500' 
                                            : 'text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 animate-pulse'
                                    }`}
                                >
                                    {filledWord || "???"}
                                </span>
                            );
                        } else {
                            // Render text segments, maybe highlighting keywords manually if needed?
                            // For now simple text. We could wrap keywords in spans if we had a lexer.
                            // Just preserving newlines and spaces.
                            return <span key={idx} style={{whiteSpace: 'pre-wrap'}}>{segment}</span>;
                        }
                    })}
                </code>
            </div>

            {/* Word Bank */}
            <div className="flex flex-wrap justify-center gap-3 w-full">
                {wordBank.map((word, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleBankClick(word)}
                        className="chip option-chip bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-b-4 px-6 py-3 rounded-2xl font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        {word}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FillBlankComponent;
