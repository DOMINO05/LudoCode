import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { DictionaryProvider } from './DictionaryContext';
import Avatar from './Avatar';
import PlacementIntro from './components/PlacementIntro';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Layout({ session }) {
  const [profile, setProfile] = useState(null);
  const [badgeNotification, setBadgeNotification] = useState(null);
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

  const showBadgeNotification = (badge) => {
      console.log('Showing badge notification:', badge);
      setBadgeNotification(badge);
      setTimeout(() => setBadgeNotification(null), 5000);
  };

  const location = useLocation();
  const isPlacementPage = location.pathname === '/placement';

  return (
    <DictionaryProvider session={session}>
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-100 font-nunito transition-colors duration-300">
      {profile && !profile.hasCompletedPlacement && !isPlacementPage && (
          <PlacementIntro 
            session={session} 
            onStart={() => navigate('/placement')} 
            onSkip={fetchProfile} 
          />
      )}
      <header className="bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center shrink-0 transition-colors duration-300 z-40 sticky top-0 relative">
        <div className="font-extrabold text-2xl cursor-pointer text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent tracking-tighter" onClick={() => navigate('/dashboard')}>
            LudoCode
        </div>
        
        {/* Badge Notification Overlay (Top Center - Fixed) */}
        {badgeNotification && (
            <div className="fixed left-1/2 top-6 transform -translate-x-1/2 z-[9999] pointer-events-none w-full max-w-sm flex justify-center transition-all duration-500">
               <div className="bg-yellow-100 dark:bg-yellow-900/95 border-2 border-yellow-400 text-yellow-800 dark:text-yellow-100 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-4 backdrop-blur-sm">
                   <div className="text-3xl filter drop-shadow-md">{badgeNotification.iconPath || '🏆'}</div>
                   <div>
                       <div className="font-bold text-[10px] uppercase tracking-wider text-yellow-600 dark:text-yellow-300">{badgeNotification.title || 'Új Jelvény Megszerezve!'}</div>
                       <div className="font-extrabold text-sm whitespace-nowrap">{badgeNotification.name || 'Jelvény'}</div>
                   </div>
               </div>
            </div>
        )}

        <div className="flex items-center gap-4">
            <select 
                value={currentLanguage?.id || ''} 
                onChange={(e) => changeLanguage(e.target.value)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-none outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
                {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>
                        {lang.displayName || lang.name}
                    </option>
                ))}
            </select>

            <button 
                onClick={() => navigate('/dictionary')} 
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Szótár"
            >
                📚
            </button>
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
        <Outlet context={{ session, profile, refreshProfile: fetchProfile, handleLogout, showBadgeNotification }} />
      </main>
    </div>
    </DictionaryProvider>
  );
}
