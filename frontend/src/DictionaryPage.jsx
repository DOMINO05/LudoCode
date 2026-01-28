import React, { useState } from 'react';
import { useDictionary } from './DictionaryContext';
import BackButton from './components/BackButton';

export default function DictionaryPage() {
    const { dictionary, loading } = useDictionary();
    const [searchTerm, setSearchTerm] = useState('');

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Szótár betöltése...</div>;
    }

    const filtered = dictionary.filter(entry => 
        entry.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
        entry.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by first letter
    const grouped = filtered.reduce((acc, entry) => {
        const letter = entry.word.charAt(0).toUpperCase();
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(entry);
        return acc;
    }, {});

    const sortedLetters = Object.keys(grouped).sort();

    return (
        <div className="max-w-4xl mx-auto p-6 pb-20">
            <BackButton to="/dashboard" className="mb-6" />
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 mb-2">Szakzsargon Szótár</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
                Ismerd meg a legfontosabb programozási fogalmakat.
            </p>

            <div className="relative mb-8">
                <input 
                    type="text" 
                    placeholder="Keresés..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-4 pl-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                />
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl text-slate-400">🔍</span>
            </div>

            <div className="space-y-10">
                {sortedLetters.map(letter => (
                    <div key={letter} className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                        <h2 className="text-4xl font-black text-slate-200 dark:text-slate-800 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{letter}</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {grouped[letter].map(entry => (
                                <div key={entry.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                    <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2 capitalize">{entry.word}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{entry.definition}</p>
                                    {entry.category && (
                                        <span className="inline-block mt-3 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                                            {entry.category}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {sortedLetters.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <div className="text-6xl mb-4">🤷‍♂️</div>
                        Nincs találat a(z) "{searchTerm}" kifejezésre.
                    </div>
                )}
            </div>
        </div>
    );
}
