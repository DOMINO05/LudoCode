import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

const DebugComponent = ({ question, onCodeChange, debugPhase, selections, onSelect, checkResult }) => {
    const { isDark } = useTheme();
    
    // Local state for instant interaction
    const [localPhase, setLocalPhase] = useState('identify'); // identify -> fix -> resolved
    const [tokenizedLines, setTokenizedLines] = useState([]);
    const [shakingToken, setShakingToken] = useState(null); // {line, token}
    const [shakingOption, setShakingOption] = useState(null);
    const [bugToken, setBugToken] = useState(null); // The identified bug token coordinates
    const [resolved, setResolved] = useState(false);

    useEffect(() => {
        let codeLines = [];
        if (question.content.buggy_code) {
            codeLines = question.content.buggy_code.split('\n');
        }
        
        // Tokenize lines with simple type inference for coloring
        const tokenized = codeLines.map((line, lIdx) => {
             // Split preserving delimiters
             const regex = /(".*?"|'.*?'|[a-zA-Z_]\w*|[0-9]+|[^\s\w]|\s+)/g;
             const rawTokens = line.match(regex) || [];
             
             return rawTokens.map((text, tIdx) => {
                 let type = 'text-slate-700';
                 const trimmed = text.trim();
                 if (!trimmed) type = 'whitespace';
                 else if (/^["'].*["']$/.test(trimmed)) type = 'text-green-600'; // String
                 else if (/^[0-9]+$/.test(trimmed)) type = 'text-blue-600'; // Number
                 else if (['if', 'else', 'for', 'while', 'return', 'def', 'class', 'import', 'from', 'public', 'static', 'void', 'int', 'float', 'double', 'boolean'].includes(trimmed)) type = 'text-purple-600'; // Keyword
                 
                 return { text, type, line: lIdx, index: tIdx };
             });
        });
        setTokenizedLines(tokenized);
        setLocalPhase('identify');
        setBugToken(null);
        setResolved(false);
        onSelect([]); // Reset selection in parent
        
    }, [question]);

    const handleTokenClick = (t) => {
        if (localPhase !== 'identify') return;
        if (t.type === 'whitespace') return;

        // Check if this token is the bug
        // Heuristic: Check if token text is contained in error_location
        // or if error_location is contained in token text.
        // Ideally exact match or part of range.
        const errorLoc = question.content.error_location;
        const isBug = t.text.trim() === errorLoc.trim() || errorLoc.includes(t.text.trim());

        if (isBug) {
            // Found it!
            setBugToken(t);
            setLocalPhase('fix');
            // We don't update parent 'selections' or 'code' yet, just UI state.
        } else {
            // Wrong! Shake it.
            setShakingToken({ line: t.line, index: t.index });
            setTimeout(() => setShakingToken(null), 400);
        }
    };

    const handleFixClick = (option) => {
        if (localPhase !== 'fix') return;

        // Check if this option is the correct one
        // We assume question.content.correct_code holds the correct replacement
        // OR we infer from logic.
        // schema.sql has 'correct_code'.
        const correctFix = question.content.correct_code;
        
        // Allow loose matching if exact string differs slightly (e.g. whitespace)
        // But usually options are distinct.
        const isCorrect = option.trim() === correctFix.trim();

        if (isCorrect) {
            // Success!
            setResolved(true);
            setLocalPhase('resolved');
            
            // Update code visually
            const newLines = [...tokenizedLines];
            if (bugToken) {
                // Replace the bug token text with the fix
                newLines[bugToken.line][bugToken.index].text = option;
                // If the fix is multiline or complex, this single-token replacement is simplistic
                // but matches tasks.html logic where a single token ')' becomes '}'.
                // If option is full line, we might need full line replacement logic from before.
                // Given tasks.html style, let's assume token-swapping mostly.
                // But for robustness, let's update parent with Full Corrected Code.
                
                // We need to construct the full code string for submission.
                // We take original lines, replace the bug token with option.
                // Reconstruct string.
                const finalCodeLines = newLines.map(lineTokens => lineTokens.map(tok => tok.text).join(''));
                onCodeChange(finalCodeLines.join('\n'));
                
                // Signal parent that we have a selection (so button enables)
                onSelect([{...bugToken, text: option}]); 
            }
        } else {
            // Wrong fix! Shake the button.
            setShakingOption(option);
            setTimeout(() => setShakingOption(null), 400);
        }
    };

    return (
        <div className="w-full fade-in flex flex-col h-full">
            {/* Header */}
            <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">
                {resolved ? "Siker!" : (localPhase === 'identify' ? "Találd meg a hibát!" : "Megvan a hiba!")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {resolved ? "Helyes javítás." : (localPhase === 'identify' ? "Érints meg a kódban azt a részt, ami nem oda való." : "Most javítsd ki a lenti gombokkal.")}
            </p>

            {/* Code Block */}
            <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm select-none mb-8">
                <code className="code-font leading-relaxed block text-slate-700 dark:text-slate-300">
                    {tokenizedLines.map((lineTokens, lIdx) => (
                        <div key={lIdx} className="min-h-[1.5rem]">
                            {lineTokens.map((t, tIdx) => {
                                const isBug = bugToken && bugToken.line === lIdx && bugToken.index === tIdx;
                                const isShaking = shakingToken && shakingToken.line === lIdx && shakingToken.index === tIdx;
                                
                                // Adjust token colors for dark mode if needed (or rely on default classes being compatible)
                                // 'text-purple-600' is fine in dark mode? Maybe lighter purple.
                                // I'll keep explicit classes for now as they are utility classes.
                                
                                return (
                                    <span 
                                        key={tIdx}
                                        onClick={() => handleTokenClick(t)}
                                        className={`debug-token text-xl font-medium inline-block 
                                            ${t.type === 'whitespace' ? '' : (t.type === 'text-slate-700' ? 'text-slate-700 dark:text-slate-300' : t.type)}
                                            ${isShaking ? 'shake bg-slate-200 dark:bg-slate-600' : ''}
                                            ${isBug ? (resolved ? 'bg-green-500 text-white scale-110 shadow-md' : 'bg-red-500 text-white shadow-md') : ''}
                                            ${(localPhase !== 'identify' && !isBug) ? 'opacity-50 pointer-events-none' : ''}
                                            ${resolved && isBug ? 'transition-transform' : ''}
                                        `}
                                    >
                                        {t.text}
                                    </span>
                                );
                            })}
                        </div>
                    ))}
                </code>
            </div>

            {/* Fix Options */}
            {(localPhase === 'fix' || resolved) && (
                <div className={`grid grid-cols-2 gap-4 fade-in ${resolved ? 'hidden' : ''}`}>
                    <div className="col-span-2 text-center text-sm font-bold text-slate-400 uppercase mb-1">Mire cseréled?</div>
                    {question.content.options && question.content.options.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleFixClick(option)}
                            className={`bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-xl font-bold text-lg font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors
                                ${shakingOption === option ? 'bg-red-100 dark:bg-red-900/30 shake border-red-300 dark:border-red-500' : ''}
                            `}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DebugComponent;
