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
    const [bugRange, setBugRange] = useState(null); // { start, end }

    useEffect(() => {
        let codeLines = [];
        let fullCode = "";
        if (question.content.buggy_code) {
            fullCode = question.content.buggy_code;
            codeLines = fullCode.split('\n');
        }
        
        // Find bug range in full text
        const errorLoc = question.content.error_location || "";
        const bugStart = fullCode.indexOf(errorLoc);
        const bugEnd = bugStart !== -1 ? bugStart + errorLoc.length : -1;
        setBugRange({ start: bugStart, end: bugEnd });

        // Tokenize lines with simple type inference for coloring AND character indices
        let currentCharIndex = 0;
        const tokenized = codeLines.map((line, lIdx) => {
             // Split preserving delimiters
             const regex = /(".*?"|'.*?'|[a-zA-Z_]\w*|[0-9]+|[^\s\w]|\s+)/g;
             let match;
             const tokens = [];
             
             // Reset regex state for new string? No, simple match doesn't work for indices with global
             // Use loop with exec for indices
             while ((match = regex.exec(line)) !== null) {
                 const text = match[0];
                 const start = currentCharIndex + match.index;
                 const end = start + text.length;
                 
                 let type = 'text-slate-700';
                 const trimmed = text.trim();
                 if (!trimmed) type = 'whitespace';
                 else if (/^["'].*["']$/.test(trimmed)) type = 'text-green-600'; // String
                 else if (/^[0-9]+$/.test(trimmed)) type = 'text-blue-600'; // Number
                 else if (['if', 'else', 'for', 'while', 'return', 'def', 'class', 'import', 'from', 'public', 'static', 'void', 'int', 'float', 'double', 'boolean'].includes(trimmed)) type = 'text-purple-600'; // Keyword
                 
                 tokens.push({ text, type, line: lIdx, index: tokens.length, start, end });
             }
             
             // Update char index for next line (add newline char length)
             currentCharIndex += line.length + 1; // +1 for \n
             
             return tokens;
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

        // Check if this token IS part of the bug range
        let isBug = false;
        if (bugRange && bugRange.start !== -1) {
            // Check if token overlaps with bug range
            // We want tokens strictly INSIDE the error location?
            // Or tokens that contain the error location?
            // Usually error location is a set of tokens.
            // If user clicks ANY token within the error range, it's a hit.
            // Token interval: [t.start, t.end)
            // Bug interval: [bugRange.start, bugRange.end)
            
            // Intersection check: max(start1, start2) < min(end1, end2)
            const intersectStart = Math.max(t.start, bugRange.start);
            const intersectEnd = Math.min(t.end, bugRange.end);
            
            // Allow loose matching: if token is significantly part of the bug
            if (intersectStart < intersectEnd) {
                isBug = true;
            }
        }

        if (isBug) {
            // Found it!
            setBugToken(t);
            setLocalPhase('fix');
            
            // Select all tokens in the bug range to update parent state
            const allBugTokens = [];
            tokenizedLines.forEach(line => {
                line.forEach(tok => {
                    const iStart = Math.max(tok.start, bugRange.start);
                    const iEnd = Math.min(tok.end, bugRange.end);
                    if (iStart < iEnd) {
                        // Map token to format expected by CodingPage
                        allBugTokens.push({ lineIndex: tok.line, tokenIndex: tok.index, text: tok.text });
                    }
                });
            });
            
            onSelect(allBugTokens);
        } else {
            // Wrong! Shake it.
            setShakingToken({ line: t.line, index: t.index });
            setTimeout(() => setShakingToken(null), 400);
        }
    };

    const handleFixClick = (option) => {
        if (localPhase !== 'fix') return;

        // Check if this option is the correct one
        const correctFix = question.content.correct_code;
        
        // Allow loose matching if exact string differs slightly (e.g. whitespace)
        // But usually options are distinct.
        const isCorrect = option.trim() === correctFix.trim();

        if (isCorrect) {
            // Success!
            setResolved(true);
            setLocalPhase('resolved');
            
            // Update code visually
            // We replace the text in the bug range with the option.
            // Since we might have multiple lines, string manipulation is safer.
            const fullCode = question.content.buggy_code;
            const prefix = fullCode.substring(0, bugRange.start);
            const suffix = fullCode.substring(bugRange.end);
            const newFullCode = prefix + option + suffix;
            
            // Re-tokenize the NEW code to display it correctly
            const codeLines = newFullCode.split('\n');
            let currentCharIndex = 0;
            const newTokenized = codeLines.map((line, lIdx) => {
                 const regex = /(".*?"|'.*?'|[a-zA-Z_]\w*|[0-9]+|[^\s\w]|\s+)/g;
                 let match;
                 const tokens = [];
                 while ((match = regex.exec(line)) !== null) {
                     const text = match[0];
                     const start = currentCharIndex + match.index;
                     const end = start + text.length;
                     let type = 'text-slate-700';
                     const trimmed = text.trim();
                     if (!trimmed) type = 'whitespace';
                     else if (/^["'].*["']$/.test(trimmed)) type = 'text-green-600';
                     else if (/^[0-9]+$/.test(trimmed)) type = 'text-blue-600';
                     else if (['if', 'else', 'for', 'while', 'return', 'def', 'class', 'import', 'from', 'public', 'static', 'void', 'int', 'float', 'double', 'boolean'].includes(trimmed)) type = 'text-purple-600';
                     
                     tokens.push({ text, type, line: lIdx, index: tokens.length, start, end });
                 }
                 currentCharIndex += line.length + 1;
                 return tokens;
            });
            setTokenizedLines(newTokenized);

            onCodeChange(newFullCode);
            // Do NOT overwrite selections here. We want to keep the bug token selection 
            // so that CodingPage can validate Phase A correctly.
            // onSelect([{text: option}]); 
            
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
                                // Determine if this token is part of the bug range
                                const isBugInRange = bugRange && t.start < bugRange.end && t.end > bugRange.start;
                                // Is this token logically the bug?
                                // If localPhase is fix/resolved, show it as bug/fixed.
                                // If identify, show only if buggy token was clicked? No, we show it IF we found it.
                                // But localPhase 'fix' means found.
                                const showAsBug = (localPhase === 'fix' || resolved) && isBugInRange;
                                
                                const isShaking = shakingToken && shakingToken.line === lIdx && shakingToken.index === tIdx;
                                
                                return (
                                    <span 
                                        key={tIdx}
                                        onClick={() => handleTokenClick(t)}
                                        className={`debug-token text-xl font-medium inline-block 
                                            ${t.type === 'whitespace' ? '' : (t.type === 'text-slate-700' ? 'text-slate-700 dark:text-slate-300' : t.type)}
                                            ${isShaking ? 'shake bg-slate-200 dark:bg-slate-600' : ''}
                                            ${showAsBug ? (resolved ? 'bg-green-500 text-white scale-110 shadow-md rounded' : 'bg-red-500 text-white shadow-md rounded') : ''}
                                            ${(localPhase !== 'identify' && !showAsBug) ? 'opacity-50 pointer-events-none' : ''}
                                            ${resolved && showAsBug ? 'transition-transform' : ''}
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
