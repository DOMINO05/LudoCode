import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trophy, BarChart3, Star, Flame, Gem, Heart } from 'lucide-react';
import ProgressChart from './components/ProgressChart';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 mb-4`}>
      <Icon className={color.replace('bg-', 'text-')} size={32} />
    </div>
    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</div>
    {subtext && <p className="text-slate-400 text-xs mt-1 font-medium">{subtext}</p>}
  </div>
);

export default function StatsPage() {
  const { session, profile } = useOutletContext();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-500">
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
            <BarChart3 className="text-indigo-500 w-12 h-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-700 dark:text-slate-100 mb-2 uppercase tracking-tight">Statisztika & Progresszió</h2>
        <p className="text-slate-500 font-medium">Kövesd nyomon a fejlődésedet és az elért eredményeidet!</p>
      </div>

      {/* Grid of basic stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Összes XP" 
            value={profile?.xp || 0} 
            icon={Star} 
            color="bg-yellow-500" 
            subtext="Minden eddigi pont"
          />
          <StatCard 
            title="Széria" 
            value={`${profile?.currentStreak || 0} nap`} 
            icon={Flame} 
            color="bg-orange-500" 
            subtext="Aktivitás"
          />
          <StatCard 
            title="Drágakövek" 
            value={profile?.gems || 0} 
            icon={Gem} 
            color="bg-blue-500" 
            subtext="Vagyon"
          />
          <StatCard 
            title="Mentális Erő" 
            value={`${profile?.sanityPoints || 0}%`} 
            icon={Heart} 
            color="bg-red-500" 
            subtext="Sanity"
          />
      </div>

      {/* Main Progress Chart */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 shadow-xl">
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
              <Trophy className="text-yellow-500" /> Napi XP Haladás
          </h3>
          <div className="h-[400px]">
            <ProgressChart session={session} />
          </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 font-medium italic">
            "A mérés az első lépés a javulás felé."
          </p>
      </div>
    </div>
  );
}