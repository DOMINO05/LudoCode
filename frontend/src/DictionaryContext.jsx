import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const DictionaryContext = createContext();

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
                const { data, error } = await supabase
                    .from('dictionary')
                    .select('*');
                    
                if (error) throw error;
                if (data) {
                    setDictionary(data);
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
