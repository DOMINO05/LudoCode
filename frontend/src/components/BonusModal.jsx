import React from 'react';
import { createPortal } from 'react-dom';

const BonusModal = ({ onClose, message, bonus, quote }) => {
  return createPortal(
    <div className="fixed inset-0 w-full h-[100dvh] bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in">
      <div className="bg-surface-light dark:bg-surface-dark p-10 rounded-2xl max-w-md w-[90%] text-center border-2 border-secondary shadow-[0_0_20px_rgba(255,215,0,0.5)] animate-pop relative overflow-y-auto max-h-[90vh]">
        <div className="text-6xl mb-5">🎁</div>
        <h2 className="text-secondary text-3xl font-bold mb-2">Napi Bónusz!</h2>
        <p className="text-xl mb-4 text-slate-700 dark:text-slate-300">
          {message || `+${bonus || 50} XP`}
        </p>

        {quote && (
          <div className="my-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 italic text-slate-600 dark:text-slate-400">
              <div className="text-2xl opacity-20 leading-none h-4">“</div>
              <p className="px-4 mb-2">{quote.text}</p>
              <div className="text-2xl opacity-20 leading-none h-4 text-right">”</div>
              <cite className="block text-sm font-bold not-italic mt-2 text-primary">— {quote.author}</cite>
          </div>
        )}

        <button 
          onClick={onClose}
          className="bg-secondary hover:bg-secondary-dark text-white px-8 py-3 rounded-full font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
        >
          Király!
        </button>
      </div>
    </div>,
    document.body
  );
};

export default BonusModal;
