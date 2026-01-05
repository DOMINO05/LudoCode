import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

export default function CoursesPage() {
    const { session } = useOutletContext();
    const [progress, setProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await fetch('http://localhost:3000/courses/progress', {
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
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-color)' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Tanuló Ösvény</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {progress.map((concept) => (
                    <div key={concept.id} className="card" style={{ 
                        opacity: concept.is_locked ? 0.6 : 1,
                        position: 'relative'
                    }}>
                        {concept.is_locked && (
                            <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '24px' }}>🔒</div>
                        )}
                        <h2>{concept.name}</h2>
                        <p>{concept.description}</p>
                        
                        <div style={{ margin: '20px 0', background: 'var(--input-bg)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ 
                                width: `${concept.percentage}%`, 
                                height: '100%', 
                                background: 'var(--success-color)',
                                transition: 'width 0.5s'
                            }}></div>
                        </div>
                        <p style={{ textAlign: 'right', fontSize: '14px' }}>{concept.completed_questions} / {concept.total_questions} ({concept.percentage}%)</p>

                        <button 
                            disabled={concept.is_locked}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '10px' }}
                            onClick={() => {
                                // Navigate to solve specific concept
                                // We need a way to tell CodingPage to load from concept.
                                // Maybe navigate to `/solve?conceptId=...`
                                // But currently CodingPage fetches `next`. 
                                // I will implement navigation later or just alert for now as this task is about Dashboard split.
                                // Or better: navigate('/solve/course/' + concept.id)
                                alert("Course solving UI coming soon! (Backend ready)");
                            }}
                        >
                            {concept.percentage === 100 ? 'Review' : 'Continue'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
