import React from 'react';

const BonusModal = ({ onClose, message, bonus }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
    <div className="bg-surface-light dark:bg-surface-dark p-10 rounded-2xl max-w-sm w-[90%] text-center border-2 border-secondary shadow-[0_0_20px_rgba(255,215,0,0.5)] animate-pop relative">
      <div className="text-6xl mb-5">🎁</div>
      <h2 className="text-secondary text-3xl font-bold mb-2">Napi Bónusz!</h2>
      <p className="text-xl mb-8 text-slate-700 dark:text-slate-300">
        {message || `+${bonus || 50} XP`}
      </p>
      <button 
        onClick={onClose}
        className="bg-secondary hover:bg-secondary-dark text-white px-8 py-3 rounded-full font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
      >
        Király!
      </button>
    </div>
  </div>
);

export default BonusModal;
