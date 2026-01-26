import React from 'react';

const SanityWarningModal = ({ onClose, onRecover }) => (
  <div className="fixed top-0 left-0 w-full h-[100dvh] bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] animate-fade-in p-4">
    <div className="bg-surface-light dark:bg-surface-dark p-8 md:p-12 rounded-3xl max-w-md w-full text-center border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-pop relative overflow-y-auto max-h-[90vh]">
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>

      <div className="text-7xl mb-6 drop-shadow-lg">🧠</div>
      
      <h2 className="text-slate-800 dark:text-white text-3xl font-black mb-4 tracking-tight">
        Elfogyott a Sanity-d!
      </h2>
      
      <p className="text-lg mb-8 text-slate-600 dark:text-slate-400 leading-relaxed">
        Sajnos jelenleg nincs több mentális energiád új feladatokba kezdeni. 
        Javíts ki egy korábbi hibát a visszatöltéshez, vagy térj vissza holnap!
      </p>

      <div className="flex flex-col gap-3">
          <button 
            onClick={onRecover}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-black transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-wider"
          >
            Hiba javítása (+10% HP)
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Később próbálom meg
          </button>
      </div>
    </div>
  </div>
);

export default SanityWarningModal;
