import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CoursesPage() {
    const { session } = useOutletContext();
    const [progress, setProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await fetch(`${API_URL}/courses/progress`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProgress(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProgress();
    }, [session]);

    if (loading) return <div style={{padding: '20px', color: 'var(--text-color)'}}>Loading courses...</div>;

    return (
        <div style={{ 
            padding: '20px', 
            maxWidth: '1200px', 
            margin: '0 auto', 
            color: 'var(--text-color)',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <h1 style={{ textAlign: 'center', marginBottom: '30px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary-color)', fontSize: 'clamp(24px, 5vw, 36px)' }}>Tanuló Ösvény</h1>
            
            <div className="grid-responsive">
                {progress.map((concept) => {
                    const isCompleted = concept.percentage === 100;
                    const isLocked = concept.is_locked;
                    const isActive = !isLocked && !isCompleted;

                    // Color logic
                    let bgColor = 'var(--card-bg)';
                    let borderColor = 'var(--card-border)';
                    let icon = '📖';

                    if (isCompleted) {
                        borderColor = 'gold';
                        icon = '🏆';
                    } else if (isLocked) {
                        borderColor = 'var(--card-border)';
                        bgColor = 'rgba(0,0,0,0.2)'; // Darker
                        icon = '🔒';
                    } else {
                        borderColor = 'var(--primary-color)';
                        icon = '🚀';
                    }
                    
                    return (
                        <div key={concept.id} className="card" style={{ 
                            border: `2px solid ${borderColor}`,
                            opacity: isLocked ? 0.6 : 1,
                            backgroundColor: bgColor,
                            padding: '30px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            position: 'relative',
                            transition: 'transform 0.2s',
                            boxShadow: isActive ? `0 0 15px ${borderColor}` : 'var(--shadow)',
                            height: '100%',
                            boxSizing: 'border-box'
                        }}
                        onClick={() => {
                            if (!isLocked) {
                                navigate(`/solve?conceptId=${concept.id}`);
                            }
                        }}
                        onMouseEnter={(e) => { if(!isLocked) e.currentTarget.style.transform = 'scale(1.03)'; }}
                        onMouseLeave={(e) => { if(!isLocked) e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            <div style={{ fontSize: '50px', marginBottom: '15px' }}>{icon}</div>
                            <h2 style={{ margin: '0 0 10px 0', color: isLocked ? 'gray' : (isCompleted ? '#ffd700' : 'var(--text-color)') }}>{concept.name}</h2>
                            <p style={{ margin: '0 0 20px 0', fontSize: '14px', opacity: 0.8, flex: 1 }}>{concept.description}</p>
                            
                            <div style={{ width: '100%', height: '8px', background: 'var(--input-bg)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                                <div style={{ 
                                    width: `${concept.percentage}%`, 
                                    height: '100%', 
                                    background: isCompleted ? '#ffd700' : 'var(--success-color)',
                                    transition: 'width 0.5s'
                                }}></div>
                            </div>
                            
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                {concept.completed_questions} / {concept.total_questions}
                            </span>

                            {!isLocked && (
                                <button className="btn btn-primary" style={{ marginTop: '20px', borderRadius: '20px', padding: '8px 25px', width: '100%' }}>
                                    {isCompleted ? 'Gyakorlás' : 'Indítás'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
