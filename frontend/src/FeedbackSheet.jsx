import React from 'react';
import { useTheme } from './ThemeContext';

const FeedbackSheet = ({ result, onNext, correctSolution, isVisible }) => {
    const { isDark } = useTheme();

    if (!isVisible || !result) return null;

    const isCorrect = result.isCorrect;
    const bgColor = isCorrect ? 'var(--success-color)' : 'var(--error-color)'; // Or a lighter/darker version based on design
    const textColor = '#fff'; 

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: isDark ? '#1e1e1e' : '#fff', // Base background
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            boxShadow: '0 -4px 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
            transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.3s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Status Header */}
            <div style={{
                backgroundColor: isCorrect ? '#2ecc71' : '#e74c3c',
                color: '#fff',
                padding: '15px 20px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                }}>
                    {isCorrect ? '✓' : '✗'}
                </div>
                {isCorrect ? 'Helyes!' : 'Helytelen!'}
            </div>

            {/* Content Area */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {!isCorrect && (
                    <div style={{ color: 'var(--text-color)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#e74c3c' }}>Helyes megoldás:</div>
                        <div style={{ 
                            fontFamily: 'monospace', 
                            background: isDark ? '#2d2d2d' : '#f0f0f0', 
                            padding: '10px', 
                            borderRadius: '8px',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '150px',
                            overflowY: 'auto'
                        }}>
                           {/* 
                               We might not always have the full correct solution readily available in the result object 
                               depending on backend response.
                               If passed as prop `correctSolution`, use it.
                           */}
                           {result.correct_answer || correctSolution || "Lásd a magyarázatot."}
                        </div>
                        {result.output && (
                            <div style={{ marginTop: '10px', fontSize: '0.9rem', opacity: 0.8 }}>
                                <strong>Kimenet:</strong> {result.output}
                            </div>
                        )}
                         {result.compile_message && (
                            <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#e74c3c' }}>
                                <strong>Hiba:</strong> {result.compile_message}
                            </div>
                        )}
                    </div>
                )}
                
                {isCorrect && (
                    <div style={{ color: 'var(--text-color)' }}>
                        <div style={{ fontSize: '1.1rem', marginBottom: '5px', color: '#2ecc71', fontWeight: 'bold' }}>Szép munka!</div>
                         {result.output && (
                            <div style={{ marginTop: '10px', fontSize: '0.9rem', opacity: 0.8, fontFamily: 'monospace' }}>
                                {result.output}
                            </div>
                        )}
                    </div>
                )}

                <button 
                    onClick={onNext}
                    style={{
                        padding: '15px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: isCorrect ? '#2ecc71' : '#e74c3c',
                        color: '#fff',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginTop: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}
                >
                    Tovább
                </button>
            </div>
        </div>
    );
};

export default FeedbackSheet;
