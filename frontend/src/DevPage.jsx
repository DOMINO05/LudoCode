import React from 'react';
import { useNavigate } from 'react-router-dom';

const types = [
    { id: 'theory', name: 'Elmélet' },
    { id: 'predict_output', name: 'Kimenet' },
    { id: 'fill_in_blank', name: 'Kiegészítés' },
    { id: 'parsons', name: 'Sorrend' },
    { id: 'debug', name: 'Hibakeresés' },
    { id: 'coding', name: 'Kódírás' }
];

export default function DevPage() {
    const navigate = useNavigate();

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ marginBottom: '30px' }}>🛠️ Fejlesztői Mód</h1>
            <p style={{ marginBottom: '30px', color: 'var(--text-color)', opacity: 0.8 }}>
                Válassz egy feladattípust a teszteléshez. (ELO ignorálva, random feladat)
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {types.map(type => (
                    <button 
                        key={type.id}
                        onClick={() => navigate(`/solve?mode=dev&type=${type.id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '20px', fontSize: '18px' }}
                    >
                        {type.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
