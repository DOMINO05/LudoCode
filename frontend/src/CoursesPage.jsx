import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CoursesPage() {
    const navigate = useNavigate();

    const taskTypes = [
        { id: 'theory', name: 'Elmélet', icon: '📚', description: 'Teszteld tudásod elméleti kérdésekkel.' },
        { id: 'predict_output', name: 'Kimenet Jóslás', icon: '🔮', description: 'Találd ki, mit fog kiírni a program.' },
        { id: 'fill_in_blank', name: 'Kódkiegészítés', icon: '🧩', description: 'Egészítsd ki a hiányos kódrészleteket.' },
        { id: 'parsons', name: 'Sorrendezés', icon: '🔢', description: 'Rendezd helyes sorrendbe a kódsorokat.' },
        { id: 'debug', name: 'Hibakeresés', icon: '🐞', description: 'Találd meg és javítsd ki a hibákat.' },
        { id: 'coding', name: 'Kódolás', icon: '💻', description: 'Írj saját kódot a feladat megoldásához.' },
    ];

    return (
        <div className="flex flex-col items-center min-h-full p-4 md:p-8 gap-8 max-w-7xl mx-auto w-full">
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary uppercase tracking-widest text-center mb-4">
                Válassz Feladattípust
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {taskTypes.map((type) => (
                    <div 
                        key={type.id} 
                        className="group relative flex flex-col items-center text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.02] hover:border-primary transition-all duration-300 cursor-pointer"
                        onClick={() => navigate(`/solve?type=${type.id}`)}
                    >
                        <div className="text-6xl mb-6 transform transition-transform group-hover:scale-110">{type.icon}</div>
                        <h2 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                            {type.name}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm flex-1 leading-relaxed">
                            {type.description}
                        </p>
                        
                        <button className="w-full py-3 px-6 rounded-full font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5">
                            Indítás
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
