import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

const ParsonsComponent = ({ question, onSolutionChange }) => {
    const { isDark } = useTheme();
    const [solution, setSolution] = useState([]);
    const [available, setAvailable] = useState([]);

    useEffect(() => {
        // Shuffle blocks initially
        if (question.content.blocks) {
            setAvailable([...question.content.blocks].sort(() => Math.random() - 0.5));
            setSolution([]);
        }
    }, [question]);

    useEffect(() => {
        onSolutionChange(solution);
    }, [solution, onSolutionChange]);

    const handleAddToSolution = (block) => {
        setAvailable(prev => prev.filter(b => b.id !== block.id));
        setSolution(prev => [...prev, block]);
    };

    const handleRemoveFromSolution = (block) => {
        setSolution(prev => prev.filter(b => b.id !== block.id));
        setAvailable(prev => [...prev, block]);
    };

    const moveBlock = (index, direction) => {
        const newSolution = [...solution];
        if (direction === 'up' && index > 0) {
            [newSolution[index], newSolution[index - 1]] = [newSolution[index - 1], newSolution[index]];
        } else if (direction === 'down' && index < newSolution.length - 1) {
            [newSolution[index], newSolution[index + 1]] = [newSolution[index + 1], newSolution[index]];
        }
        setSolution(newSolution);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', padding: '20px' }}>
            {/* Question Description */}
            <div style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '10px' }}>
                {question.description}
            </div>

            {/* Solution Area */}
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
                    Your Solution
                </div>
                
                {solution.length === 0 && (
                     <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100px', 
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic'
                    }}>
                        Tap blocks below to add them here
                    </div>
                )}

                {solution.map((block, idx) => (
                    <div key={block.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        {/* Up/Down Controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', marginRight: '10px' }}>
                            <button 
                                onClick={() => moveBlock(idx, 'up')}
                                disabled={idx === 0}
                                style={{ 
                                    border: 'none', background: 'none', cursor: 'pointer', 
                                    color: idx === 0 ? 'transparent' : 'var(--text-secondary)',
                                    fontSize: '12px', padding: '0'
                                }}
                            >
                                ▲
                            </button>
                            <button 
                                onClick={() => moveBlock(idx, 'down')}
                                disabled={idx === solution.length - 1}
                                style={{ 
                                    border: 'none', background: 'none', cursor: 'pointer', 
                                    color: idx === solution.length - 1 ? 'transparent' : 'var(--text-secondary)',
                                    fontSize: '12px', padding: '0'
                                }}
                            >
                                ▼
                            </button>
                        </div>
                        
                        {/* The Block */}
                        <div 
                            onClick={() => handleRemoveFromSolution(block)}
                            style={{
                                flex: 1,
                                padding: '12px 15px',
                                borderRadius: '8px',
                                background: 'var(--card-bg)',
                                border: '1px solid var(--card-border)',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                                fontSize: '1rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                // Handle indentation visualization if needed. 
                                // Assuming block.text might contain tabs or spaces, 
                                // or we might rely on CSS padding-left based on logic? 
                                // For now, let's preserve whitespace.
                                whiteSpace: 'pre',
                                overflowX: 'auto'
                            }}
                        >
                            {block.text}
                        </div>
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
                    Available Lines
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {available.map((block) => (
                        <div
                            key={block.id}
                            onClick={() => handleAddToSolution(block)}
                            style={{
                                padding: '12px 15px',
                                borderRadius: '8px',
                                background: 'var(--card-bg)',
                                border: '1px solid var(--card-border)',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                                fontSize: '1rem',
                                whiteSpace: 'pre',
                                overflowX: 'auto',
                                transition: 'transform 0.1s'
                            }}
                        >
                            {block.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ParsonsComponent;
