import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './supabaseClient';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [languages, setLanguages] = useState([]);
  const [currentLanguage, setCurrentLanguage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('languages')
        .select('*');
        
      if (error) throw error;

      if (data) {
        // Map snake_case to camelCase
        const mappedData = data.map(l => ({
            ...l,
            displayName: l.display_name
        }));

        setLanguages(mappedData);
        // Default to Python or first available
        if (mappedData.length > 0) {
            const stored = localStorage.getItem('selectedLanguageId');
            const found = mappedData.find(l => l.id === stored);
            setCurrentLanguage(found || mappedData.find(l => l.name === 'python') || mappedData[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch languages", err);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (languageId) => {
      const lang = languages.find(l => l.id === languageId);
      if (lang) {
          setCurrentLanguage(lang);
          localStorage.setItem('selectedLanguageId', lang.id);
      }
  };

  return (
    <LanguageContext.Provider value={{ languages, currentLanguage, changeLanguage, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
