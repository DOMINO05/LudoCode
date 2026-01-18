import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import BonusModal from './components/BonusModal';
import Leaderboard from './components/Leaderboard';
import ProgressChart from './components/ProgressChart';
import MistakeRecovery from './components/MistakeRecovery';
import SanityWarningModal from './components/SanityWarningModal';
import ChallengesWidget from './components/ChallengesWidget';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Dashboard() {
  const { session, profile, refreshProfile } = useOutletContext();
  const navigate = useNavigate();
  const [showBonus, setShowBonus] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [bonusData, setBonusData] = useState({ message: '', bonus: 0, quote: null });

  useEffect(() => {
    const claimDailyBonus = async () => {
      try {
        const res = await fetch(`${API_URL}/users/daily-claim`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.claimed) {
            setBonusData({ message: data.message, bonus: data.bonus, quote: data.quote });
            setShowBonus(true);
            refreshProfile(); // Update XP in TopBar and Dashboard
          }
        }
      } catch (error) {
        console.error('Error claiming daily bonus:', error);
      }
    };

    claimDailyBonus();
  }, []);

  if (!profile) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>;

  const checkSanityAndNavigate = (path) => {
    if (profile.sanityPoints === 0) {
        setShowWarning(true);
        return;
    }
    navigate(path);
  };

  return (
    <div className="flex flex-col items-center min-h-full p-4 md:p-8 gap-8 max-w-7xl mx-auto w-full">
      <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-slate-300 mb-4 animate-fade-in">
        Welcome back, {profile.username || session.user.email}!
      </h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
          <div className="bg-surface-light dark:bg-surface-dark border-l-4 border-orange-500 p-6 rounded-xl shadow-sm flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Streak</h3>
              <div className="text-3xl font-black text-slate-800 dark:text-slate-100">🔥 {profile.currentStreak || 0}</div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border-l-4 border-primary p-6 rounded-xl shadow-sm flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Proficiency</h3>
              <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{profile.globalProficiency?.toFixed(2)}</div>
          </div>
          
          <div className="bg-surface-light dark:bg-surface-dark border-l-4 border-secondary p-6 rounded-xl shadow-sm flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">XP</h3>
              <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{profile.xp}</div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border-l-4 border-purple-500 p-6 rounded-xl shadow-sm flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Gems</h3>
              <div className="text-3xl font-black text-slate-800 dark:text-slate-100">💎 {profile.gems}</div>
          </div>

          <div 
            className={`bg-surface-light dark:bg-surface-dark border-l-4 border-blue-500 p-6 rounded-xl shadow-sm flex flex-col items-center justify-center transition-transform hover:-translate-y-1 cursor-pointer ${profile.sanityPoints === 0 ? 'animate-pulse bg-red-50 dark:bg-red-900/10' : ''}`}
            onClick={() => setShowRecovery(true)}
            title="Kattints a javításhoz!"
          >
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Sanity</h3>
              <div className="text-3xl font-black text-slate-800 dark:text-slate-100">🧠 {profile.sanityPoints}%</div>
              {profile.sanityPoints < 100 && <span className="text-[10px] text-blue-500 font-bold mt-1">JAVÍTÁS ➕</span>}
          </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Quick Play */}
          <div 
            className="group bg-surface-light dark:bg-surface-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col items-center text-center relative overflow-hidden" 
            onClick={() => checkSanityAndNavigate('/solve')}
          >
              <div className="absolute top-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">⚡</div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-primary transition-colors">Gyors Gyakorlás</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xs">Adaptív feladatok a szintednek megfelelően, azonnali visszajelzéssel.</p>
              <button className="w-full max-w-xs bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-primary/30 transition-all">
                  Indítás
              </button>
          </div>

          {/* Task Type Selector */}
          <div 
            className="group bg-surface-light dark:bg-surface-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col items-center text-center relative overflow-hidden" 
            onClick={() => checkSanityAndNavigate('/courses')}
          >
              <div className="absolute top-0 left-0 w-full h-1 bg-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">🧩</div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-secondary transition-colors">Gyakorlás Típusok</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xs">Válassz egyet a 6 feladattípus közül és gyakorolj célzottan.</p>
              <button className="w-full max-w-xs bg-secondary hover:bg-secondary-dark text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-secondary/30 transition-all">
                  Kiválasztás
              </button>
          </div>

          {/* Quiz Manager */}
          <div 
            className="group bg-surface-light dark:bg-surface-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col items-center text-center relative overflow-hidden" 
            onClick={() => navigate('/quizzes')}
          >
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">📝</div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-amber-500 transition-colors">Saját Kvízek</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xs">Készíts saját feladatsorokat és oszd meg őket barátaiddal.</p>
              <button className="w-full max-w-xs bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-amber-500/30 transition-all">
                  Kezelés
              </button>
          </div>

          {/* Community */}
          <div 
            className="group bg-surface-light dark:bg-surface-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col items-center text-center relative overflow-hidden" 
            onClick={() => navigate('/community')}
          >
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">🌍</div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-green-500 transition-colors">Közösségi Kvízek</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xs">Böngéssz a közösség által készített publikus kvízek között.</p>
              <button className="w-full max-w-xs bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-green-500/30 transition-all">
                  Böngészés
              </button>
          </div>
      </div>
      
      {/* Napi Inspiráció */}
      {profile.lastQuote && (
        <div className="w-full max-w-4xl bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-50"></div>
            <div className="text-4xl opacity-20 mb-2 group-hover:scale-125 transition-transform duration-500">“</div>
            <p className="text-xl md:text-2xl font-medium italic text-slate-700 dark:text-slate-200 mb-4 px-4">
                {profile.lastQuote.text}
            </p>
            <div className="flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-slate-300 dark:bg-slate-600"></span>
                <cite className="not-italic font-bold text-primary tracking-wide uppercase text-sm">
                    {profile.lastQuote.author}
                </cite>
                <span className="h-px w-8 bg-slate-300 dark:bg-slate-600"></span>
            </div>
        </div>
      )}

      {/* Lower Section: Charts, Challenges & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 w-full items-start">
          <div className="xl:col-span-2 space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <ProgressChart session={session} />
                 <ChallengesWidget session={session} refreshProfile={refreshProfile} />
             </div>
          </div>
          <Leaderboard session={session} currentUserId={profile.id} />
      </div>

      {showBonus && (
        <BonusModal 
          onClose={() => setShowBonus(false)} 
          message={bonusData.message} 
          bonus={bonusData.bonus} 
          quote={bonusData.quote}
        />
      )}

      {showRecovery && (
          <MistakeRecovery 
            session={session} 
            onResolved={async (newSanity) => {
                await refreshProfile();
                setShowRecovery(false);
            }} 
            onCancel={() => setShowRecovery(false)} 
          />
      )}

      {showWarning && (
          <SanityWarningModal 
            onClose={() => setShowWarning(false)}
            onRecover={() => {
                setShowWarning(false);
                setShowRecovery(true);
            }}
          />
      )}
    </div>
  );
}
