import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Trophy, 
  Store, 
  Zap, 
  BookOpen, 
  LogOut, 
  Moon, 
  Sun, 
  Settings, 
  BarChart3,
  Menu,
  X
} from 'lucide-react';
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
  const [notification, setNotification] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const showNotification = (message, type = 'info') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 4000);
  };

  const location = useLocation();
  const isPlacementPage = location.pathname === '/placement';

  const navItems = [
    { id: 'dashboard', label: 'Tanulás', icon: Home, color: 'text-blue-500', path: '/dashboard' },
    { id: 'dictionary', label: 'Szótár', icon: BookOpen, color: 'text-orange-500', path: '/dictionary' },
    { id: 'leaderboard', label: 'Ranglista', icon: Trophy, color: 'text-yellow-500', path: '/leaderboard' },
    { id: 'quests', label: 'Küldetések', icon: Zap, color: 'text-purple-500', path: '/quests' },
    { id: 'stats', label: 'Statisztika', icon: BarChart3, color: 'text-indigo-500', path: '/stats' },
    { id: 'shop', label: 'Bolt', icon: Store, color: 'text-red-500', path: '/shop' },
  ];

  const currentPath = location.pathname;

  const NavigationContent = ({ mobile = false }) => (
    <>
      <div className="mb-8 px-4 flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-blue-500 tracking-tighter cursor-pointer" onClick={() => { navigate('/dashboard'); if(mobile) setIsMobileMenuOpen(false); }}>
          LudoCode
        </h1>
        {mobile && (
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={28} />
          </button>
        )}
      </div>
      
      <div className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { navigate(item.path); if(mobile) setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-4 p-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 ${
              currentPath === item.path 
                ? `bg-blue-50/50 dark:bg-slate-800/50 text-blue-500 border-blue-200 dark:border-slate-700` 
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <item.icon size={24} className={currentPath === item.path ? item.color : ''} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700 space-y-2">
         <button 
            onClick={toggleTheme}
            className="flex items-center gap-4 w-full p-3 rounded-xl font-bold uppercase tracking-wider text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
         >
            {isDark ? <Sun size={24} /> : <Moon size={24} />}
            {isDark ? 'Világos mód' : 'Sötét mód'}
         </button>

         <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={() => { navigate('/profile'); if(mobile) setIsMobileMenuOpen(false); }}>
            <div className="w-10 h-10 rounded-lg border-2 border-slate-300 dark:border-slate-600 overflow-hidden shrink-0">
              <Avatar config={profile?.avatarConfig} size={40} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{profile?.username || 'Profil'}</span>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Profil megtekintése</span>
            </div>
         </div>

         <button 
            onClick={() => { handleLogout(); if(mobile) setIsMobileMenuOpen(false); }}
            className="flex items-center gap-4 w-full p-3 rounded-xl font-bold uppercase tracking-wider text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
         >
            <LogOut size={24} />
            Kijelentkezés
         </button>
      </div>
    </>
  );

  return (
    <DictionaryProvider session={session}>
      <div className={`flex h-screen bg-white dark:bg-[#131f24] text-slate-700 dark:text-slate-300 font-nunito transition-colors duration-300 overflow-hidden relative selection:bg-blue-500/30 ${isDark ? 'dark' : ''}`}>
        {profile && !profile.hasCompletedPlacement && !isPlacementPage && (
            <PlacementIntro 
              session={session} 
              onStart={() => navigate('/placement')} 
              onSkip={fetchProfile} 
            />
        )}

        {/* --- MOBIL MENU OVERLAY (Drawer) --- */}
        <div className={`fixed inset-0 z-[100] md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'visible' : 'invisible'}`}>
            {/* Backdrop */}
            <div 
              className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer Content */}
            <nav className={`absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#131f24] p-6 flex flex-col shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <NavigationContent mobile />
            </nav>
        </div>

        {/* --- BAL OLDALI SÁV (Desktop Nav) --- */}
        <nav className="hidden md:flex flex-col w-64 border-r-2 border-slate-200 dark:border-slate-800 px-4 py-6 bg-white dark:bg-[#131f24] shrink-0">
            <NavigationContent />
        </nav>

        {/* --- MOBIL FELSŐ SÁV (Top Bar) --- */}
        <div className="md:hidden fixed top-0 w-full bg-white dark:bg-[#131f24] border-b-2 border-slate-200 dark:border-slate-800 z-50 px-4 flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <Menu size={28} />
                </button>
                <div className="font-extrabold text-2xl text-blue-500 tracking-tighter" onClick={() => navigate('/dashboard')}>
                    LC
                </div>
            </div>
            <div className="flex gap-4 items-center">
               <button onClick={toggleTheme} className="text-slate-500">
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
               </button>
               <div className="w-8 h-8 rounded-lg border-2 border-slate-300 dark:border-slate-600 overflow-hidden" onClick={() => navigate('/profile')}>
                  <Avatar config={profile?.avatarConfig} size={32} />
               </div>
            </div>
        </div>

        {/* --- KÖZÉPSŐ TARTALOM (Main Content) --- */}
        <main className="flex-1 flex flex-col pt-16 md:pt-0 pb-20 md:pb-0 overflow-hidden relative">
          
          {/* Badge Notification Overlay (Top Center - Fixed) */}
          {badgeNotification && (
              <div className="fixed left-1/2 top-6 transform -translate-x-1/2 z-[9999] pointer-events-none w-full max-w-sm flex justify-center transition-all duration-500 animate-in fade-in slide-in-from-top-4">
                <div className="bg-yellow-100 dark:bg-yellow-900/95 border-2 border-yellow-400 text-yellow-800 dark:text-yellow-100 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-4 backdrop-blur-sm">
                    <div className="text-3xl filter drop-shadow-md">{badgeNotification.iconPath || '🏆'}</div>
                    <div>
                        <div className="font-bold text-[10px] uppercase tracking-wider text-yellow-600 dark:text-yellow-300">{badgeNotification.title || 'Új Jelvény Megszerezve!'}</div>
                        <div className="font-extrabold text-sm whitespace-nowrap">{badgeNotification.name || 'Jelvény'}</div>
                    </div>
                </div>
              </div>
          )}

          {/* Global Notification Toast */}
          {notification && (
              <div className="fixed left-1/2 bottom-24 md:bottom-10 transform -translate-x-1/2 z-[10000] pointer-events-none w-full max-w-md px-4 flex justify-center transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
                  <div className={`
                      px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md border-2
                      ${notification.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' : 
                        notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 
                        'bg-slate-800/90 border-slate-700 text-white'}
                  `}>
                      <div className="text-xl">
                          {notification.type === 'error' ? '🚫' : notification.type === 'success' ? '✅' : 'ℹ️'}
                      </div>
                      <div className="font-bold text-sm leading-tight">
                          {notification.message}
                      </div>
                  </div>
              </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <Outlet context={{ 
              session, 
              profile, 
              refreshProfile: fetchProfile, 
              handleLogout, 
              showBadgeNotification,
              showNotification,
              languages,
              currentLanguage,
              changeLanguage
            }} />
          </div>
        </main>

        {/* --- MOBIL ALSÓ SÁV (Bottom Nav) --- */}
        <div className="md:hidden fixed bottom-0 w-full bg-white dark:bg-[#131f24] border-t-2 border-slate-200 dark:border-slate-800 z-50 px-2 flex justify-around items-center h-16 pb-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                  currentPath === item.path 
                    ? `text-blue-500` 
                    : 'text-slate-400'
                }`}
              >
                <item.icon size={24} />
              </button>
            ))}
        </div>
      </div>
    </DictionaryProvider>
  );
}
