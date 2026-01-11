import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import Avatar from './Avatar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Layout({ session }) {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { languages, currentLanguage, changeLanguage } = useLanguage();

  useEffect(() => {
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    try {
        const res = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        if (res.ok) {
            const data = await res.json();
            setProfile(data);
        }
    } catch (err) {
        console.error('Failed to fetch profile', err);
    }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      navigate('/');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-100 font-nunito transition-colors duration-300">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center shrink-0 transition-colors duration-300">
        <div className="font-bold text-xl cursor-pointer text-slate-800 dark:text-slate-100 tracking-tight" onClick={() => navigate('/dashboard')}>
            LudoCode
        </div>
        
        <div className="flex items-center gap-4">
            <select 
                value={currentLanguage?.id || ''} 
                onChange={(e) => changeLanguage(e.target.value)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-none outline-none"
            >
                {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>
                        {lang.displayName || lang.name}
                    </option>
                ))}
            </select>

            <button 
                onClick={() => navigate('/shop')} 
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Shop"
            >
                🛒
            </button>
            <button 
                onClick={toggleTheme} 
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {isDark ? '☀️' : '🌙'}
            </button>

            {profile ? (
                <>
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/profile')}>
                        <div className="w-10 h-10 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                            <Avatar config={profile.avatarConfig} size={40} />
                        </div>
                        <span className="font-bold hidden sm:block group-hover:text-blue-500 transition-colors">{profile.username || 'User'}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-sm font-medium">
                        <span className="text-yellow-600 dark:text-yellow-400">XP: {profile.xp}</span>
                        <span className="text-purple-500">💎 {profile.gems}</span>
                        <span className="text-blue-500" title="Sanity Points">🧠 {profile.sanityPoints}%</span>
                    </div>
                </>
            ) : (
                <span>Loading...</span>
            )}
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto">
        <Outlet context={{ session, profile, refreshProfile: fetchProfile, handleLogout }} />
      </main>
    </div>
  );
}
