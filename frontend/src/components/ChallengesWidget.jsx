import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ChallengesWidget({ session, refreshProfile, showNotification }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('DAILY');

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_challenges');
      if (error) throw error;
      
      // Map snake_case to camelCase
      const mappedData = (data || []).map(ch => ({
          ...ch,
          actionType: ch.action_type,
          goalValue: ch.goal_value,
          currentValue: ch.current_value,
          rewardXp: ch.reward_xp,
          rewardGems: ch.reward_gems,
          isCompleted: ch.is_completed,
          isClaimed: ch.is_claimed
      }));

      setChallenges(mappedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (id) => {
    try {
      const { data, error } = await supabase.rpc('claim_challenge_reward', {
          p_user_challenge_id: id
      });
      
      if (error) throw error;

      if (data && data.success) {
        // Refresh challenges and profile (XP/Gems)
        await fetchChallenges();
        await refreshProfile();
        if (showNotification) showNotification('Jutalom begyűjtve!', 'success');
      } else {
          if (showNotification) showNotification('Hiba a begyűjtéskor', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="animate-pulse h-40 bg-surface-light rounded-xl"></div>;

  const filteredChallenges = challenges.filter(ch => 
      (ch.template?.period === activeTab) || (!ch.template && activeTab === 'DAILY')
  );

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          🎯 Kihívások
        </h3>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button 
                onClick={() => setActiveTab('DAILY')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'DAILY' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
                Napi
            </button>
            <button 
                onClick={() => setActiveTab('WEEKLY')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'WEEKLY' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
                Heti
            </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredChallenges.length === 0 && (
            <div className="text-center text-slate-500 py-8 italic">
                Nincs aktív {activeTab === 'DAILY' ? 'napi' : 'heti'} kihívás.
            </div>
        )}

        {filteredChallenges.map(ch => {
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
