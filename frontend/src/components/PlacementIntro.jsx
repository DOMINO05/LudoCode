import React from 'react';
import { supabase } from '../supabaseClient';

export default function PlacementIntro({ session, onStart, onSkip }) {
  const handleSkip = async () => {
    try {
      const { error } = await supabase.rpc('complete_placement', {
          p_proficiency: null
      });
      
      if (error) throw error;
      onSkip();
    } catch (err) {
      console.error('Failed to skip placement', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden relative animate-pop">
        {/* Skip button */}
        <button 
          onClick={handleSkip}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title="Kihagyás"
        >
          <span className="text-2xl font-bold">×</span>
        </button>

        <div className="p-10 text-center">
            <div className="text-6xl mb-6">🎯</div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
                Szintfelmérő Teszt
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-10">
                Ahhoz hogy a lehető legjobb felhasználói élményt kapd, töltsd ki a szintfelmérő tesztet. 
                <br/>
                <span className="text-sm font-medium mt-2 block opacity-75">
                    Ez segít nekünk abban, hogy pontosan a tudásodnak megfelelő feladatokat kapj.
                </span>
            </p>

            <button 
                onClick={onStart}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-primary/30 transition-all text-xl"
            >
                Tovább
            </button>
        </div>
      </div>
    </div>
  );
}
