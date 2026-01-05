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
        if (question.content.blocks && question.content.blocks.length > 0) {
            setAvailableBlocks([...question.content.blocks]); 
            setConstructedBlocks([]);
        } else if (question.content.initial_code) {
             // Fallback: Generate blocks from initial_code (split by lines)
             const lines = question.content.initial_code.split('\n').filter(line => line.trim() !== '');
             const generatedBlocks = lines.map((line, idx) => ({ id: idx, text: line }));
             // Shuffle them? Maybe not shuffled initially if it's construction, usually construction starts empty.
             // But if we generate them, they are available.
             // Let's shuffle them to make it a task.
             setAvailableBlocks(generatedBlocks.sort(() => Math.random() - 0.5));
             setConstructedBlocks([]);
        } else {
             setAvailableBlocks([]);
             setConstructedBlocks([]);
        }
        
        // Initial code for hardcore mode
        setEditorValue(question.content.initial_code || '');
        
        setIsHardcore(false);
    }, [question]);


    const handleToggleMode = () => {
        const newMode = !isHardcore;
        setIsHardcore(newMode);
        
        // Reset state on toggle as per spec ("No need to sync")
        if (newMode) {
             // Switching to Hardcore
             setEditorValue(question.content.initial_code || '');
             onCodeChange(question.content.initial_code || '');
        } else {
            // Switching to Normal
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
        // Do we remove from available? Spec says "Like FillBlank". 
        // FillBlank returns to bank. 
        // Let's assume we remove from available.
        setAvailableBlocks(prev => prev.filter(b => b.id !== block.id)); // Assuming blocks have unique IDs
        
        // Update parent with constructed code
        // We need to join the blocks text
        const currentBlocks = [...constructedBlocks, block];
        const code = currentBlocks.map(b => b.text).join(''); // Join without separator or with newline?
        // Usually code construction implies lines or parts. 
        // If blocks are full lines, join with \n. If snippets, maybe empty string.
        // Let's assume \n for now if it looks like lines, or check context.
        // For simplicity, let's join with \n for now as most construction tasks are line-based.
        // Or better: Use the raw text. 
        onCodeChange(currentBlocks.map(b => b.text).join('\n')); 
    };

    const handleRemoveBlock = (block) => {
        setConstructedBlocks(prev => prev.filter(b => b.id !== block.id));
        setAvailableBlocks(prev => [...prev, block]);
        
        const currentBlocks = constructedBlocks.filter(b => b.id !== block.id);
        onCodeChange(currentBlocks.map(b => b.text).join('\n'));
    };
    
    // Hardcore Mode Handler
    const handleEditorChange = (value) => {
        setEditorValue(value);
        onCodeChange(value);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', padding: '20px', position: 'relative' }}>
            
            {/* Header with Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '10px', paddingRight: '40px' }}>
                    {question.description}
                </div>
                
                <button 
                    onClick={handleToggleMode}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '24px',
                        padding: '10px',
                        borderRadius: '50%',
                        backgroundColor: isHardcore ? 'var(--primary-color)' : 'var(--card-bg)',
                        color: isHardcore ? '#fff' : 'var(--text-color)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s'
                    }}
                    title={isHardcore ? "Switch to Block Mode" : "Switch to Keyboard Mode"}
                >
                    ⌨️
                </button>
            </div>

            {isHardcore ? (
                // HARDCORE MODE (Monaco Editor)
                <div style={{
                    flex: '1',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--card-border)',
                }}>
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
                            padding: { top: 20 }
                        }}
                    />
                </div>
            ) : (
                // NORMAL MODE (Construction)
                <>
                    {/* Construction Area */}
                    <div style={{
                        flex: '1',
                        borderRadius: '12px',
                        border: '2px dashed var(--primary-color)',
                        padding: '15px',
                        background: isDark ? 'rgba(var(--primary-rgb), 0.1)' : '#f0f9ff',
                        overflowY: 'auto',
                        minHeight: '200px'
                    }}>
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            color: 'var(--primary-color)',
                            marginBottom: '10px',
                            letterSpacing: '1px'
                        }}>
                            Your Code
                        </div>
                        {constructedBlocks.length === 0 && (
                            <div style={{ fontStyle: 'italic', opacity: 0.6 }}>Tap blocks to build your code...</div>
                        )}
                         {constructedBlocks.map((block) => (
                            <div 
                                key={block.id} 
                                onClick={() => handleRemoveBlock(block)}
                                style={{
                                    padding: '10px 15px',
                                    marginBottom: '8px',
                                    borderRadius: '8px',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                    cursor: 'pointer',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {block.text}
                            </div>
                        ))}
                    </div>

                    {/* Block Bank */}
                    <div style={{ flex: '0 0 auto' }}>
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            color: 'var(--text-secondary)',
                            marginBottom: '10px',
                            letterSpacing: '1px'
                        }}>
                            Available Blocks
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                             {availableBlocks.map((block) => (
                                <button
                                    key={block.id}
                                    onClick={() => handleAddBlock(block)}
                                    style={{
                                        padding: '10px 15px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--card-border)',
                                        background: 'var(--card-bg)',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontFamily: 'monospace',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
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
