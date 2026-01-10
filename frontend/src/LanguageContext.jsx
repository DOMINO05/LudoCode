import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const LanguageProvider = ({ children }) => {
  const [languages, setLanguages] = useState([]);
  const [currentLanguage, setCurrentLanguage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      const res = await fetch(`${API_URL}/languages`);
      if (res.ok) {
        const data = await res.json();
        setLanguages(data);
        // Default to Python or first available
        if (data.length > 0) {
            const stored = localStorage.getItem('selectedLanguageId');
            const found = data.find(l => l.id === stored);
            setCurrentLanguage(found || data.find(l => l.name === 'python') || data[0]);
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
