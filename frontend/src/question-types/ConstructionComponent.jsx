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
             availBlocks = question.content.scaffolding_blocks.map((text, idx) => ({ id: `scaffold-${idx}`, text }));
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
    const handleAddBlock = (block) => {
        setConstructedBlocks(prev => [...prev, block]);
        // Do NOT remove from available (Reusable blocks?) Or remove? 
        // tasks.html behavior implies "addToken" doesn't remove from bank? 
        // "addToken(btn, token)" -> clone. Bank stays.
        // My previous logic removed it.
        // If bank stays, user can reuse tokens (like brackets).
        // I will keep bank intact to match "Word Bank" behavior usually allowing repeats or not?
        // tasks.html example loop over array.
        // Actually, construction tasks usually allow using blocks once or multiple times?
        // Scaffolding suggests usage once? Or basic tokens like `{` multiple?
        // Let's assume reusable for now, as tasks.html implies static bank.
        
        // Update parent with constructed code
        const currentBlocks = [...constructedBlocks, block];
        onCodeChange(currentBlocks.map(b => b.text).join('\n')); 
    };

    const handleRemoveBlock = (index) => {
        // Remove by index
        const currentBlocks = [...constructedBlocks];
        currentBlocks.splice(index, 1);
        setConstructedBlocks(currentBlocks);
        onCodeChange(currentBlocks.map(b => b.text).join('\n'));
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
                    <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 min-h-[100px] p-4 rounded-xl mb-4 flex flex-wrap gap-2 items-start font-mono text-sm shadow-inner transition-all content-start">
                        {constructedBlocks.length === 0 && (
                            <span className="text-slate-400 dark:text-slate-500 italic pointer-events-none select-none">
                                A kódod itt jelenik meg...
                            </span>
                        )}
                         {constructedBlocks.map((block, idx) => (
                            <div 
                                key={`${block.id}-${idx}`}
                                onClick={() => handleRemoveBlock(idx)}
                                className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-2 py-1 rounded text-slate-800 dark:text-slate-200 font-bold pop cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-700 hover:text-red-500 dark:hover:text-red-300 whitespace-pre"
                            >
                                {block.text}
                            </div>
                        ))}
                    </div>

                    {/* Word Bank */}
                    <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
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
                </>
            )}
        </div>
    );
};

export default ConstructionComponent;
