import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Zap, Clock, Shield, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ProgressBar = ({ value, max, color = "bg-yellow-400", height = "h-4" }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`${height} w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
      <div 
        className={`h-full ${color} transition-all duration-500 ease-out`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const QuestCard = ({ challenge, onCollect }) => {
  const isCompleted = challenge.isCompleted;
  const isClaimed = challenge.isClaimed;
  const progress = Math.min(100, (challenge.currentValue / challenge.goalValue) * 100);

  return (
    <div className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-4 flex items-center gap-4 transition-all ${isCompleted && !isClaimed ? 'border-green-500 shadow-lg shadow-green-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="text-4xl">
          {challenge.actionType === 'STREAK' ? '🔥' : 
           challenge.actionType === 'SOLVE_QUESTION' ? '📚' :
           challenge.actionType === 'RESOLVE_MISTAKE' ? '🔧' :
           challenge.actionType === 'PLAY_QUIZ' ? '🎯' :
           challenge.actionType === 'EARN_GEMS' ? '💎' : '⚡'}
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-2">
          <h4 className="font-bold text-slate-700 dark:text-slate-200">{challenge.description}</h4>
          <span className="font-bold text-slate-400 text-sm">{challenge.currentValue} / {challenge.goalValue}</span>
        </div>
        <ProgressBar value={challenge.currentValue} max={challenge.goalValue} height="h-6" color={isCompleted ? "bg-green-500" : "bg-yellow-400"} />
      </div>
      
      <div className="flex flex-col items-center justify-center min-w-[100px] border-l-2 border-slate-100 dark:border-slate-800 pl-4 gap-2">
        {isCompleted && !isClaimed ? (
          <button 
            onClick={() => onCollect(challenge.id)}
            className="bg-green-500 hover:bg-green-400 text-white text-xs font-bold py-3 px-4 rounded-xl border-b-4 border-green-700 active:border-b-0 active:translate-y-[2px] transition-all uppercase tracking-wide shadow-md"
          >
            Begyűjtés
          </button>
        ) : isClaimed ? (
          <div className="text-green-500 font-bold text-xs uppercase flex items-center gap-1">
            <CheckCircle2 size={16} /> Kész
          </div>
        ) : (
          <>
            <span className="text-xs font-bold text-slate-400 uppercase mb-1">Jutalom</span>
            <div className="font-extrabold text-orange-500">
                {challenge.rewardXp} XP
                {challenge.rewardGems > 0 && <span className="text-blue-400 ml-1">+{challenge.rewardGems}💎</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function QuestsPage() {
  const { session, refreshProfile } = useOutletContext();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const res = await fetch(`${API_URL}/challenges/my-active`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = async (id) => {
    try {
      const res = await fetch(`${API_URL}/challenges/claim/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        await fetchChallenges();
        await refreshProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Küldetések betöltése...</div>;

  const dailyQuests = challenges.filter(c => c.template?.period === 'DAILY' || (!c.template && c.expiresAt)); // Approximation
  const weeklyQuests = challenges.filter(c => c.template?.period === 'WEEKLY');

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-10 animate-in slide-in-from-bottom-2 fade-in duration-500">
      
       {/* Banner */}
       <div className="bg-gradient-to-r from-purple-500 to-indigo-600 border-none rounded-2xl p-8 text-white shadow-lg flex items-center justify-between">
         <div>
            <h2 className="text-3xl font-extrabold mb-2 uppercase tracking-tight">Küldetések</h2>
            <p className="text-purple-100 max-w-md">Teljesítsd a kihívásokat, hogy extra XP-t és drágaköveket szerezz!</p>
         </div>
         <div className="hidden md:block">
            <Zap size={80} className="text-purple-300 opacity-50 rotate-12" />
         </div>
      </div>

      {/* Daily Quests */}
      <div>
        <div className="flex items-center gap-2 mb-6">
           <Clock className="text-orange-500" />
           <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Napi Küldetések</h3>
        </div>
        <div className="space-y-4">
          {dailyQuests.length > 0 ? dailyQuests.map((c) => (
            <QuestCard key={c.id} challenge={c} onCollect={handleCollect} />
          )) : <div className="text-slate-400 italic p-4 text-center">Nincs elérhető napi küldetés.</div>}
        </div>
      </div>

      {/* Weekly Quests */}
      <div>
        <div className="flex items-center gap-2 mb-6">
           <Shield className="text-blue-500" />
           <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Heti Küldetések</h3>
        </div>
        <div className="space-y-4">
          {weeklyQuests.length > 0 ? weeklyQuests.map((c) => (
            <QuestCard key={c.id} challenge={c} onCollect={handleCollect} />
          )) : <div className="text-slate-400 italic p-4 text-center">Nincs elérhető heti küldetés.</div>}
        </div>
      </div>

    </div>
  );
}