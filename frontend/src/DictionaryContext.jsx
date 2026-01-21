import React, { createContext, useContext, useState, useEffect } from 'react';

const DictionaryContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const DictionaryProvider = ({ children, session }) => {
    const [dictionary, setDictionary] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDictionary = async () => {
            if (!session) {
                setLoading(false);
                return;
            }
            
            try {
                const res = await fetch(`${API_URL}/dictionary`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setDictionary(data);
                } else {
                    console.error('Failed to fetch dictionary');
                }
            } catch (err) {
                console.error('Error fetching dictionary:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDictionary();
    }, [session]);

    const getDefinition = (word) => {
        if (!dictionary || dictionary.length === 0) return null;
        // Simple case insensitive match
        const entry = dictionary.find(d => d.word.toLowerCase() === word.toLowerCase());
        return entry ? entry.definition : null;
    };

    return (
        <DictionaryContext.Provider value={{ dictionary, loading, getDefinition }}>
            {children}
        </DictionaryContext.Provider>
    );
};

export const useDictionary = () => {
    const context = useContext(DictionaryContext);
    if (!context) {
        throw new Error('useDictionary must be used within a DictionaryProvider');
    }
    return context;
};
