import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import Leaderboard from './components/Leaderboard';
import BackButton from './components/BackButton';

export default function LeaderboardPage() {
  const { session, profile } = useOutletContext();

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-500">
      <BackButton to="/dashboard" />
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
            <Trophy className="text-yellow-500 w-12 h-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-700 dark:text-slate-100 mb-2 uppercase tracking-tight">Ranglista</h2>
        <p className="text-slate-500 font-medium">Versenyezz a barátaiddal és a világgal!</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xl">
        <Leaderboard session={session} currentUserId={profile?.id} />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border-2 border-blue-100 dark:border-blue-800 text-center">
          <p className="text-blue-600 dark:text-blue-400 font-bold">
              Tanulj többet minden nap, hogy feljebb juss a listán! 🚀
          </p>
      </div>
    </div>
  );
}