import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ChallengesWidget({ session, refreshProfile }) {
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

  const handleClaim = async (id) => {
    try {
      const res = await fetch(`${API_URL}/challenges/claim/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        // Refresh challenges and profile (XP/Gems)
        await fetchChallenges();
        await refreshProfile();
        // Maybe show confetti or toast?
        alert("Jutalom begyűjtve!");
      } else {
          alert("Hiba a begyűjtéskor");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="animate-pulse h-40 bg-surface-light rounded-xl"></div>;

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          🎯 Kihívások
        </h3>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{challenges.length} Aktív</span>
      </div>

      <div className="space-y-4">
        {challenges.length === 0 && (
            <div className="text-center text-slate-500 py-8 italic">
                Nincs aktív kihívás mára.
            </div>
        )}

        {challenges.map(ch => {
            const progress = Math.min(100, (ch.currentValue / ch.goalValue) * 100);
            const isCompleted = ch.isCompleted;
            const isClaimed = ch.isClaimed;

            return (
                <div key={ch.id} className={`p-3 rounded-lg border ${isCompleted ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800' : 'border-slate-100 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{ch.description}</div>
                            <div className="text-xs text-slate-500 mt-1">
                                Jutalom: <span className="text-amber-500 font-bold">{ch.rewardXp} XP</span> {ch.rewardGems > 0 && <span className="text-purple-500 font-bold"> + {ch.rewardGems} 💎</span>}
                            </div>
                        </div>
                        {isCompleted && !isClaimed && (
                            <button 
                                onClick={() => handleClaim(ch.id)}
                                className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-full shadow-sm animate-bounce"
                            >
                                Begyűjtés
                            </button>
                        )}
                        {isClaimed && <span className="text-green-500 text-xs font-bold">✓ Kész</span>}
                    </div>
                    
                    <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 mt-1 font-mono">
                        {ch.currentValue} / {ch.goalValue}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}
