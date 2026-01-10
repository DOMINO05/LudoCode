import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import Editor from '@monaco-editor/react';

const ConstructionComponent = ({ question, onCodeChange }) => {
    const { isDark } = useTheme();
    const [isHardcore, setIsHardcore] = useState(false);
    
    // Normal Mode State
    const [constructedBlocks, setConstructedBlocks] = useState([]);
    const [availableBlocks, setAvailableBlocks] = useState([]);

    // Hardcore Mode State
    const [editorValue, setEditorValue] = useState('');

    useEffect(() => {
        // Initialize based on question content
        let initBlocks = [];
        let availBlocks = [];

        // 1. Setup Constructed Blocks from Initial Code
        if (question.content.initial_code) {
             const lines = question.content.initial_code.split('\n').filter(line => line !== ''); 
             const validLines = lines.filter(l => l.length > 0); 
             initBlocks = validLines.map((line, idx) => ({ id: `init-${idx}`, text: line }));
        }

        // 2. Setup Available Blocks from Scaffolding or Blocks
        if (question.content.scaffolding_blocks && question.content.scaffolding_blocks.length > 0) {
             availBlocks = question.content.scaffolding_blocks.map((text, idx) => {
                let cleanText = text;
                // Fix for Java 'Hello World' -> "Hello World"
                if (question.language === 'java' && text.startsWith("'") && text.endsWith("'") && text.length > 4) {
                    cleanText = `"${text.slice(1, -1)}"`;
                }
                return { id: `scaffold-${idx}`, text: cleanText };
             });
             // Shuffle scaffolding blocks
             availBlocks.sort(() => Math.random() - 0.5);
        } else if (question.content.blocks && question.content.blocks.length > 0) {
             availBlocks = [...question.content.blocks];
             availBlocks.sort(() => Math.random() - 0.5);
        }
        
        setConstructedBlocks(initBlocks);
        setAvailableBlocks(availBlocks);
        
        // Initial code for hardcore mode
        setEditorValue(question.content.initial_code || '');
        
        setIsHardcore(false);
    }, [question]);


    const handleToggleMode = () => {
        const newMode = !isHardcore;
        setIsHardcore(newMode);
        
        // Reset state on toggle as per spec ("No need to sync")
        if (newMode) {
             setEditorValue(question.content.initial_code || '');
             onCodeChange(question.content.initial_code || '');
        } else {
            setConstructedBlocks([]);
            if (question.content.blocks) {
                setAvailableBlocks([...question.content.blocks]);
            }
            onCodeChange('');
        }
    };

    // Normal Mode Handlers
    const generateCode = (blocks) => {
        let code = '';
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const prevBlock = i > 0 ? blocks[i-1] : null;
            
            if (i === 0) {
                code += block.text;
                continue;
            }

            const isNewline = block.text === '\n';
            const prevIsNewline = prevBlock && prevBlock.text === '\n';
            
            if (isNewline || prevIsNewline) {
                code += block.text;
            } else {
                code += ' ' + block.text;
            }
        }
        return code;
    };

    const handleAddBlock = (block) => {
        setConstructedBlocks(prev => [...prev, block]);
        
        const currentBlocks = [...constructedBlocks, block];
        onCodeChange(generateCode(currentBlocks));
    };

    const handleAddTab = () => {
        const tabBlock = { id: 'special-tab', text: '    ' }; // 4 spaces
        handleAddBlock(tabBlock);
    };

    const handleAddEnter = () => {
        const enterBlock = { id: 'special-enter', text: '\n' };
        handleAddBlock(enterBlock);
    };

    const handleRemoveBlock = (index) => {
        const currentBlocks = [...constructedBlocks];
        currentBlocks.splice(index, 1);
        setConstructedBlocks(currentBlocks);
        onCodeChange(generateCode(currentBlocks));
    };
    
    // Hardcore Mode Handler
    const handleEditorChange = (value) => {
        setEditorValue(value);
        onCodeChange(value);
    };

    return (
        <div className="w-full fade-in flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {question.description}
                    </h2>
                </div>
                <button 
                    onClick={handleToggleMode} 
                    className={`p-2 rounded-lg transition-colors ${
                        isHardcore 
                            ? 'bg-slate-800 dark:bg-slate-700 text-white' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                >
                    ⌨️
                </button>
            </div>

            {isHardcore ? (
                // HARDCORE MODE (Monaco Editor)
                <div className="w-full h-full border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden mb-4">
                    <Editor
                        height="100%"
                        defaultLanguage={question.language === 'python' ? 'python' : 'java'}
                        value={editorValue}
                        onChange={handleEditorChange}
                        theme={isDark ? "vs-dark" : "light"}
                        options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14,
                            padding: { top: 20 },
                            lineNumbers: 'on',
                        }}
                    />
                </div>
            ) : (
                // NORMAL MODE (Construction)
                <>
                    {/* Scratch Result */}
                    <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 min-h-[100px] p-4 rounded-xl mb-4 font-mono text-sm shadow-inner transition-all overflow-x-auto">
                        {constructedBlocks.length === 0 && (
                            <span className="text-slate-400 dark:text-slate-500 italic pointer-events-none select-none">
                                A kódod itt jelenik meg...
                            </span>
                        )}
                        
                        {/* Group blocks by lines for rendering */}
                        {(() => {
                            const lines = [];
                            let currentLine = [];
                            constructedBlocks.forEach((block, idx) => {
                                currentLine.push({ ...block, originalIdx: idx });
                                if (block.text === '\n') {
                                    lines.push(currentLine);
                                    currentLine = [];
                                }
                            });
                            if (currentLine.length > 0) lines.push(currentLine);
                            
                            return lines.map((line, lineIdx) => (
                                <div key={lineIdx} className="flex flex-wrap gap-2 items-center mb-2 last:mb-0">
                                    {line.map((block) => (
                                        <div 
                                            key={`${block.id}-${block.originalIdx}`}
                                            onClick={() => handleRemoveBlock(block.originalIdx)}
                                            className={`
                                                ${block.text === '\n' ? 'bg-transparent text-slate-400 px-1' : 'bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-2 py-1 rounded text-slate-800 dark:text-slate-200 font-bold shadow-sm'}
                                                pop cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-700 hover:text-red-500 dark:hover:text-red-300 whitespace-pre
                                            `}
                                        >
                                            {block.text === '\n' ? '↵' : block.text}
                                        </div>
                                    ))}
                                </div>
                            ));
                        })()}
                    </div>

                    {/* Word Bank */}
                    <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                        {/* Symbols */}
                        <div className="flex gap-2 mb-2">
                            {['{', '}', '(', ')', ';'].map((symbol) => (
                                <button
                                    key={`special-${symbol}`}
                                    onClick={() => handleAddBlock({ id: `special-${symbol}`, text: symbol })}
                                    className="bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 border-b-4 px-4 py-2 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-100 active:scale-95 transition-transform select-none hover:bg-slate-300 dark:hover:bg-slate-500 flex-1"
                                >
                                    {symbol}
                                </button>
                            ))}
                        </div>

                        {/* Special Keys */}
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={handleAddTab}
                                className="bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 border-b-4 px-4 py-2 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-100 active:scale-95 transition-transform select-none hover:bg-slate-300 dark:hover:bg-slate-500 flex-1"
                            >
                                Tab ⇥
                            </button>
                            <button
                                onClick={handleAddEnter}
                                className="bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 border-b-4 px-4 py-2 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-100 active:scale-95 transition-transform select-none hover:bg-slate-300 dark:hover:bg-slate-500 flex-1"
                            >
                                Enter ↵
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                         {availableBlocks.map((block, idx) => (
                            <button
                                key={`${block.id}-${idx}`}
                                onClick={() => handleAddBlock(block)}
                                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-b-4 px-3 py-2 rounded-lg font-mono font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-transform select-none hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                {block.text}
                            </button>
                        ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ConstructionComponent;
